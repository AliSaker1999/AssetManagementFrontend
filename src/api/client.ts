import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import type { LoginResponse } from '../types';
import { getAccessToken, setAccessToken, announceSessionExpired } from './authToken';

// Same-origin in development, where Vite proxies /api to the API. In production the SPA and
// the API are on different hosts (asset.gezairi.com and asset-api.gezairi.com), so the origin
// comes from the build-time variable and the requests are cross-origin — which is why
// withCredentials below is not optional.
const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const client = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  // The API and the SQL Server it queries can both be several VPN hops from the browser,
  // so a normal request needs more headroom than a LAN round-trip would.
  timeout: 30000,
  // Required for the refresh cookie to be sent at all. The cookie itself is scoped to
  // /api/auth, so this does not attach it to every request — it only stops the browser from
  // dropping it on the one request that needs it.
  withCredentials: true,
});

// A separate instance with no interceptors, used only to call /auth/refresh. If the refresh
// went through `client`, a 401 from it would trip the handler below and try to refresh the
// refresh — recursively, until the stack ran out.
const refreshClient = axios.create({ baseURL, timeout: 30000, withCredentials: true });

let inFlightRefresh: Promise<LoginResponse | null> | null = null;

/**
 * Exchanges the refresh cookie for a new access token, at most once at a time.
 *
 * The single-flight promise is load-bearing, not an optimisation. Refresh tokens rotate: each
 * redemption consumes the presented token, so two concurrent calls would send the same cookie
 * twice and the second would look like a replay. Sharing one in-flight promise means the
 * common cases — several requests 401-ing together, and React StrictMode double-invoking the
 * bootstrap effect in development — issue exactly one refresh between them.
 *
 * Returns null when there is no way back, i.e. the caller should treat the session as over.
 */
export function refreshSession(): Promise<LoginResponse | null> {
  inFlightRefresh ??= refreshClient
    .post<LoginResponse>('/auth/refresh')
    .then((res) => {
      setAccessToken(res.data.token);
      return res.data;
    })
    .catch(() => {
      setAccessToken(null);
      return null;
    })
    .finally(() => {
      inFlightRefresh = null;
    });

  return inFlightRefresh;
}

client.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const config = err.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const url = config?.url ?? '';
    const status = err.response?.status;

    // The auth endpoints have to be excluded from the retry logic:
    //   /auth/login    a 401 means "wrong credentials", not "session expired". Redirecting on
    //                  it reloaded the page and wiped the error the login form had just set,
    //                  so the user saw a cleared form with no explanation — and kept guessing,
    //                  which walks them into an account lockout.
    //   /auth/refresh  a 401 IS the session ending; refreshing again cannot help.
    //   /auth/logout   already on the way out.
    const isAuthCall =
      url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout');

    if (status === 401 && !isAuthCall && config) {
      // An expired access token is now the normal state of affairs every 15 minutes, so the
      // first 401 is not an error — it is the cue to refresh and replay the request. The user
      // sees nothing. _retried guards against looping when the replay 401s as well.
      if (!config._retried) {
        config._retried = true;
        const session = await refreshSession();
        if (session) {
          config.headers.Authorization = `Bearer ${session.token}`;
          return client(config);
        }
      }
      setAccessToken(null);
      announceSessionExpired();
    } else if (status === 403) {
      window.dispatchEvent(new CustomEvent('permissions-revoked'));
      toast.error('You do not have permission to perform this action.');
    }

    return Promise.reject(err);
  }
);

export default client;
