import axios from 'axios';
import toast from 'react-hot-toast';

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  // The API and the SQL Server it queries can both be several VPN hops from the browser,
  // so a normal request needs more headroom than a LAN round-trip would.
  timeout: 30000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    // A 401 from the login endpoint means "wrong credentials", not "session expired".
    // Redirecting on it reloaded the page and wiped the error message the login form had
    // just set, so the user saw a cleared form and no explanation — and kept guessing,
    // which now walks them into an account lockout.
    const isLoginRequest = (err.config?.url ?? '').includes('/auth/login');

    if (err.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } else if (err.response?.status === 403) {
      window.dispatchEvent(new CustomEvent('permissions-revoked'));
      toast.error('You do not have permission to perform this action.');
    }
    return Promise.reject(err);
  }
);

export default client;
