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
    if (err.response?.status === 401) {
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
