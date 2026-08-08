/**
 * The single HTTP entry point for the app.
 *
 * Paths, parameters, request bodies and response shapes all come from
 * src/api/schema.d.ts, which is generated from LensBridgeBackend/openapi.yaml.
 * Regenerate with `npm run api:generate` -- never edit the schema by hand.
 *
 * Everything routes through `authFetch` below, which owns access-token refresh.
 * Previously only AuthService.makeRequest did this; BoardService, DirectUploadService
 * and a handful of pages used bare fetch and so simply failed once the access token
 * expired, instead of refreshing and retrying.
 */
import createClient from "openapi-fetch";
import type { paths } from "./schema";
import {
  clearAuth,
  getAccessToken,
  getRefreshToken,
  storeTokensFromResponse,
} from "./tokenStore";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

/** Sent on every request; the ngrok tunnel used for demos returns an interstitial without it. */
const STATIC_HEADERS: Record<string, string> = {
  "ngrok-skip-browser-warning": "true",
};

const REFRESH_PATH = "/api/auth/refresh-token";

/* ------------------------------------------------------------------ *
 * Token refresh, single-flight.
 *
 * When several requests get a 401 at once, only the first performs the
 * refresh; the rest park on `pending` and resume with the new token. Firing
 * one refresh per in-flight request would rotate the refresh token N times
 * concurrently and log the user out.
 * ------------------------------------------------------------------ */

type Waiter = { resolve: (token: string) => void; reject: (error: unknown) => void };

let isRefreshing = false;
let pending: Waiter[] = [];

function drainQueue(error: unknown, token: string | null): void {
  const waiters = pending;
  pending = [];
  for (const { resolve, reject } of waiters) {
    if (error || !token) reject(error ?? new Error("Token refresh failed"));
    else resolve(token);
  }
}

function waitForRefresh(): Promise<string> {
  return new Promise((resolve, reject) => pending.push({ resolve, reject }));
}

/** Performs the refresh itself. Deliberately uses bare fetch: routing this
 *  through authFetch would recurse on its own 401. */
async function performRefresh(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token available");

  const response = await fetch(`${BASE_URL}${REFRESH_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...STATIC_HEADERS },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}) as { message?: string });
    throw new Error(`Token refresh failed: ${response.status} ${detail.message ?? "Unknown error"}`);
  }

  const accessToken = storeTokensFromResponse(await response.json());
  if (!accessToken) throw new Error("Token refresh response contained no access token");
  return accessToken;
}

/**
 * Called when a request comes back 401. Resolves to a fresh access token, or
 * throws after clearing the session.
 */
async function refreshAccessToken(): Promise<string> {
  if (isRefreshing) return waitForRefresh();

  isRefreshing = true;
  try {
    const accessToken = await performRefresh();
    drainQueue(null, accessToken);
    return accessToken;
  } catch (error) {
    drainQueue(error, null);
    clearAuth();
    // Full navigation rather than a router push: the client has no router access,
    // and a hard load guarantees no stale authenticated state survives.
    window.location.href = "/login";
    throw error;
  } finally {
    isRefreshing = false;
  }
}

function withAuth(request: Request, token: string | null): Request {
  const next = new Request(request);
  for (const [key, value] of Object.entries(STATIC_HEADERS)) {
    next.headers.set(key, value);
  }
  if (token) next.headers.set("Authorization", `Bearer ${token}`);
  return next;
}

/**
 * Attaches credentials, and on 401 refreshes once and replays the request.
 *
 * The original Request is cloned up front because a request body is a
 * single-use stream: without the clone the retry would send an empty body.
 */
async function authFetch(request: Request): Promise<Response> {
  const retryable = request.clone();
  const response = await fetch(withAuth(request, getAccessToken()));

  if (response.status !== 401 || !getRefreshToken()) return response;
  // Nothing to refresh into if the refresh call itself was rejected.
  if (new URL(retryable.url).pathname === REFRESH_PATH) return response;

  const token = await refreshAccessToken();
  return fetch(withAuth(retryable, token));
}

/**
 * Bodyless requests must not carry `Content-Type: application/json` -- Spring's
 * HttpMessageConverter then tries to parse a body that is not there and rejects
 * the request. openapi-fetch handles this itself: it only sets the header when
 * the serialized body is defined and is not FormData.
 *
 * Do not reintroduce a middleware that infers "has a body" from `request.body`.
 * That getter is not Baseline -- Firefox does not implement it, so it reads
 * `undefined` for every request, and the header gets stripped from requests that
 * do have a body. Signup then reaches the server with no Content-Type, which
 * Spring reads as application/octet-stream and fails before the controller.
 */
export const api = createClient<paths>({
  baseUrl: BASE_URL,
  fetch: authFetch,
});

export { BASE_URL };

/**
 * Authenticated fetch for call sites not yet moved onto the typed client.
 *
 * Shares `authFetch`, so these get the same credentials and the same
 * single-flight refresh -- they are simply not type-checked against the schema.
 * Prefer `api` for anything new; this exists so the remaining pages behave
 * correctly during the migration rather than after it.
 */
export function authenticatedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  // Preserve the multipart boundary by leaving FormData bodies alone.
  if (!(init.body instanceof FormData) && init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return authFetch(new Request(url, { ...init, headers }));
}

/**
 * Escape hatch for the few transfers OpenAPI does not describe: presigned R2
 * uploads to a third-party origin, and blob downloads of already-signed URLs.
 * Deliberately does not attach LensBridge credentials.
 */
export function rawFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, init);
}
