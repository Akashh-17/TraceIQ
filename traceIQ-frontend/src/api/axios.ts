import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Refresh tokens are single-use (rotated on every refresh). Two refreshes at once would
// send the same token twice, and the second gets 401, so everyone shares one request.
let refreshPromise: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/api/v1/auth/refresh`, {}, { withCredentials: true })
      .then(({ data }) => data.data.accessToken as string)
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Prevent retry loop for login and refresh endpoints
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        const accessToken = await refreshAccessToken();
        // Keep the user info same, just update token
        const state = useAuthStore.getState();
        if (state.user) {
          state.setAuth(accessToken, state.user);
        }
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
