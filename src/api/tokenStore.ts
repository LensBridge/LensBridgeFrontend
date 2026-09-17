/**
 * Token and session persistence.
 *
 * Split out of AuthService so that client.ts can read and rotate tokens without
 * importing AuthService, which would be circular: AuthService issues its calls
 * through the generated client.
 *
 * Nothing here is described by OpenAPI -- localStorage layout and the
 * `auth-change` event are purely client-side concerns.
 */
import type { components } from "./schema";

type JwtResponse = components["schemas"]["JwtResponse"];
type TokenRefreshResponse = components["schemas"]["TokenRefreshResponse"];

/**
 * The two endpoints that mint tokens disagree on the field name: POST
 * /api/auth/signin returns the access token as `token` (JwtResponse) while POST
 * /api/auth/refresh-token returns it as `accessToken` (TokenRefreshResponse).
 * Both are live, so both are accepted here rather than at every call site.
 */
export type TokenBearingResponse = JwtResponse | TokenRefreshResponse;

const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";
const TYPE_KEY = "tokenType";
const USER_KEY = "user";
/** Pre-existing key some sessions may still hold; read on the way out only. */
const LEGACY_ACCESS_KEY = "token";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY) ?? localStorage.getItem(LEGACY_ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function isLoggedIn(): boolean {
  return !!getAccessToken();
}

export function storeTokens(accessToken: string, refreshToken: string, tokenType = "Bearer"): void {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(TYPE_KEY, tokenType);
}

/**
 * Persist whichever token shape the server sent. Returns the new access token,
 * or null if the payload carried no usable pair.
 */
export function storeTokensFromResponse(data: TokenBearingResponse | null | undefined): string | null {
  if (!data) return null;
  const accessToken =
    ("accessToken" in data ? data.accessToken : undefined) ??
    ("token" in data ? data.token : undefined);
  const refreshToken = data.refreshToken;
  if (!accessToken || !refreshToken) return null;

  const tokenType =
    ("tokenType" in data ? data.tokenType : undefined) ??
    ("type" in data ? data.type : undefined) ??
    "Bearer";
  storeTokens(accessToken, refreshToken, tokenType);
  return accessToken;
}

export function clearAuth(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(LEGACY_ACCESS_KEY);
  localStorage.removeItem(TYPE_KEY);
  localStorage.removeItem(USER_KEY);
  notifyAuthChange();
}

export function getCurrentUser(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Error parsing user info:", error);
    return null;
  }
}

export function setCurrentUser(user: unknown): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    notifyAuthChange();
  } catch (error) {
    console.error("Error updating stored user:", error);
  }
}

/** Components listen for this to re-read auth state. */
export function notifyAuthChange(): void {
  window.dispatchEvent(new Event("auth-change"));
}
