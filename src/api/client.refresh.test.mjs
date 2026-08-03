/**
 * Verifies the single-flight refresh in client.ts.
 *
 * The behaviour under test is the reason the old AuthService kept a queue: when
 * several requests get a 401 at the same moment, exactly one refresh may be sent.
 * One refresh per in-flight request would rotate the refresh token concurrently,
 * and every rotation after the first would be rejected -- signing the user out.
 *
 * Run: node src/api/client.refresh.test.mjs
 * (bundled first by scripts/run-refresh-test.mjs, since client.ts is TypeScript)
 */
import assert from 'node:assert/strict';

export async function run(clientModule, harness) {
  const { api } = clientModule;
  let passed = 0;

  // ---- concurrent 401s trigger exactly one refresh -------------------------
  harness.reset({ accessToken: 'stale', refreshToken: 'refresh-1' });
  harness.setHandler((url, init) => {
    if (url.endsWith('/api/auth/refresh-token')) {
      harness.counts.refresh++;
      // Slow enough that all four callers are queued before it resolves.
      return harness.delayed(200, {
        status: 200,
        body: { accessToken: 'fresh', refreshToken: 'refresh-2' },
      });
    }
    harness.counts.protected++;
    const token = init.headers.get('Authorization');
    return token === 'Bearer fresh'
      ? { status: 200, body: { valid: true } }
      : { status: 401, body: { message: 'expired' } };
  });

  const results = await Promise.all([
    api.GET('/api/auth/validate-token'),
    api.GET('/api/auth/validate-token'),
    api.GET('/api/auth/validate-token'),
    api.GET('/api/auth/validate-token'),
  ]);

  assert.equal(harness.counts.refresh, 1,
    `expected exactly 1 refresh for 4 concurrent 401s, got ${harness.counts.refresh}`);
  assert.equal(harness.store.accessToken, 'fresh', 'new access token must be stored');
  assert.equal(harness.store.refreshToken, 'refresh-2', 'rotated refresh token must be stored');
  for (const [i, r] of results.entries()) {
    assert.ok(r.data?.valid, `request ${i} should have succeeded after retry`);
  }
  console.log('  PASS  4 concurrent 401s -> 1 refresh, all 4 retried and succeeded');
  passed++;

  // ---- the retry must resend the body -------------------------------------
  harness.reset({ accessToken: 'stale', refreshToken: 'refresh-1' });
  let retriedBody = null;
  harness.setHandler(async (url, init) => {
    if (url.endsWith('/api/auth/refresh-token')) {
      harness.counts.refresh++;
      return { status: 200, body: { accessToken: 'fresh', refreshToken: 'refresh-2' } };
    }
    harness.counts.protected++;
    if (init.headers.get('Authorization') !== 'Bearer fresh') {
      return { status: 401, body: { message: 'expired' } };
    }
    retriedBody = await init.text();
    return { status: 200, body: { message: 'ok' } };
  });

  await api.POST('/api/auth/logout', { body: { refreshToken: 'refresh-1' } });
  assert.notEqual(retriedBody, null, 'retry must have reached the server');
  assert.deepEqual(JSON.parse(retriedBody), { refreshToken: 'refresh-1' },
    'retried request must resend the original body, not an empty stream');
  console.log('  PASS  retry after refresh resends the original request body');
  passed++;

  // ---- a failing refresh clears the session, and does not loop -------------
  harness.reset({ accessToken: 'stale', refreshToken: 'bad' });
  harness.setHandler((url) => {
    if (url.endsWith('/api/auth/refresh-token')) {
      harness.counts.refresh++;
      return { status: 401, body: { message: 'refresh rejected' } };
    }
    harness.counts.protected++;
    return { status: 401, body: { message: 'expired' } };
  });

  await assert.rejects(() => api.GET('/api/auth/validate-token'));
  assert.equal(harness.counts.refresh, 1, 'a rejected refresh must not be retried');
  assert.equal(harness.store.accessToken, undefined, 'session must be cleared');
  assert.equal(harness.redirectedTo, '/login', 'user must be sent to login');
  console.log('  PASS  rejected refresh clears the session and redirects once');
  passed++;

  // ---- a 401 from the refresh endpoint itself must not recurse ------------
  harness.reset({ accessToken: 'stale', refreshToken: 'refresh-1' });
  harness.setHandler((url) => {
    if (url.endsWith('/api/auth/refresh-token')) {
      harness.counts.refresh++;
      return { status: 401, body: { message: 'nope' } };
    }
    harness.counts.protected++;
    return { status: 200, body: {} };
  });

  const direct = await api.POST('/api/auth/refresh-token', { body: { refreshToken: 'refresh-1' } });
  assert.equal(direct.response.status, 401, 'refresh 401 should surface to the caller');
  assert.equal(harness.counts.refresh, 1, 'refresh endpoint must not refresh itself');
  console.log('  PASS  a 401 on the refresh endpoint does not recurse');
  passed++;

  // ---- no refresh token means no refresh attempt --------------------------
  harness.reset({ accessToken: 'stale' });
  harness.setHandler((url) => {
    if (url.endsWith('/api/auth/refresh-token')) {
      harness.counts.refresh++;
      return { status: 200, body: { accessToken: 'fresh', refreshToken: 'r' } };
    }
    harness.counts.protected++;
    return { status: 401, body: { message: 'expired' } };
  });

  const noRefresh = await api.GET('/api/auth/validate-token');
  assert.equal(harness.counts.refresh, 0, 'must not attempt refresh without a refresh token');
  assert.equal(noRefresh.response.status, 401, '401 should surface unchanged');
  console.log('  PASS  no refresh token -> 401 surfaces without a refresh attempt');
  passed++;

  return passed;
}
