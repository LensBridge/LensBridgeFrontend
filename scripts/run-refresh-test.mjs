/**
 * Runs src/api/client.refresh.test.mjs against the real client.ts.
 *
 * client.ts is TypeScript and reads import.meta.env, so it is bundled with
 * esbuild (already present as a Vite dependency) before running under Node.
 * This keeps the test exercising the shipped module rather than a copy of its
 * logic -- the refresh queue is the one piece where a reimplementation would
 * defeat the point of testing it.
 */
import { build } from 'esbuild';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const BASE = 'http://api.test.local';

function installBrowserGlobals() {
  const harness = {
    store: {},
    counts: { refresh: 0, protected: 0 },
    redirectedTo: null,
    handler: null,
    setHandler(fn) { harness.handler = fn; },
    reset(initial = {}) {
      harness.store = { ...initial };
      harness.counts = { refresh: 0, protected: 0 };
      harness.redirectedTo = null;
    },
    delayed(ms, result) {
      return new Promise((resolve) => setTimeout(() => resolve(result), ms));
    },
  };

  globalThis.localStorage = {
    getItem: (k) => (k in harness.store ? harness.store[k] : null),
    setItem: (k, v) => { harness.store[k] = String(v); },
    removeItem: (k) => { delete harness.store[k]; },
  };

  globalThis.window = {
    dispatchEvent: () => true,
    location: {
      set href(value) { harness.redirectedTo = value; },
      get href() { return harness.redirectedTo; },
    },
  };
  globalThis.Event = class Event { constructor(type) { this.type = type; } };

  globalThis.fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const result = await harness.handler(request.url, request);
    return new Response(JSON.stringify(result.body ?? {}), {
      status: result.status,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  return harness;
}

const dir = await mkdtemp(join(tmpdir(), 'lensbridge-refresh-'));
try {
  const outfile = join(dir, 'client.bundle.mjs');
  await build({
    entryPoints: ['src/api/client.ts'],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    mainFields: ['module', 'main'],
    conditions: ['import', 'default'],
    outfile,
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(BASE),
    },
    logLevel: 'silent',
  });

  const harness = installBrowserGlobals();
  const clientModule = await import(pathToFileURL(outfile).href);
  const { run } = await import(pathToFileURL('src/api/client.refresh.test.mjs').href);

  console.log('token refresh (src/api/client.ts)');
  const passed = await run(clientModule, harness);
  console.log(`\n${passed} passed`);
} catch (error) {
  console.error('\nFAILED:', error.message);
  process.exitCode = 1;
} finally {
  await rm(dir, { recursive: true, force: true });
}
