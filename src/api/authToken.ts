/**
 * The access token, held in a module variable and nowhere else.
 *
 * It used to live in localStorage, which meant any injected script could read it with one
 * line and keep using it for the rest of its eight-hour lifetime. A module variable is not
 * a security boundary — script running in this page can reach it too — but it dies with the
 * tab, is never written to disk, and cannot be read by a different tab or by anything that
 * merely gets to run once. Combined with a 15-minute token and an HttpOnly refresh cookie,
 * the durable half of the session is no longer reachable from JavaScript at all.
 *
 * Deliberately a plain module rather than React state: the axios interceptor and the SignalR
 * connection factory both need the current token from outside the component tree, and
 * threading it through context would mean a stale closure holding a token that has since
 * been rotated.
 */
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/**
 * Raised when the refresh token is gone too, so there is no way back without signing in.
 * AuthContext listens and clears its state; routing then takes the user to /login.
 *
 * An event rather than `window.location.href = '/login'`: a hard navigation throws away
 * whatever the user had on screen, and after a genuine expiry there is nothing to reload
 * that would help.
 */
export const SESSION_EXPIRED_EVENT = 'session-expired';

export function announceSessionExpired(): void {
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}
