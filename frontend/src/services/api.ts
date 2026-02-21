import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Server origin without /api path — used for socket connections and static asset URLs
export const SERVER_BASE_URL = API_BASE_URL.replace('/api', '') || 'http://localhost:5000';

// In-memory access token — never touches localStorage (XSS mitigation)
let _accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  _accessToken = token;
};

export const getAccessToken = (): string | null => _accessToken;

// Create an axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add a request interceptor to attach in-memory access token
api.interceptors.request.use(
  (config) => {
    if (_accessToken) {
      config.headers.Authorization = `Bearer ${_accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Track whether we're already refreshing to avoid infinite loops
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

// Add a response interceptor to silently refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying and not a refresh/login/register/reset request
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/users/refresh') &&
      !originalRequest.url?.includes('/users/login') &&
      !originalRequest.url?.includes('/users/register') &&
      !originalRequest.url?.includes('/users/forgot-password') &&
      !originalRequest.url?.includes('/users/reset-password')
    ) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve) => {
          addRefreshSubscriber((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${API_BASE_URL}/users/refresh`,
          {},
          { withCredentials: true }
        );

        const newToken = data.token;
        setAccessToken(newToken);

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        // Notify queued requests
        onRefreshed(newToken);

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed — clear token and redirect to login
        setAccessToken(null);
        localStorage.removeItem('user');
        window.location.href = '/auth';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
