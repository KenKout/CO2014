import axios from 'axios';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/v1` : 'http://localhost:8000/v1';

export const createApiClient = (token: string | null, logout?: () => void) => {
  const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });

  apiClient.interceptors.response.use(
    response => response,
    error => {
      if (error.response && error.response.status === 401 && logout) {
        logout();
        throw new Error('Unauthorized: Please log in again.');
      }
      return Promise.reject(error);
    }
  );

  return {
    get: (endpoint: string, options: any = {}) => apiClient.get(endpoint, options),
    post: (endpoint: string, body: any, options: any = {}) => apiClient.post(endpoint, body, options),
    put: (endpoint: string, body: any, options: any = {}) => apiClient.put(endpoint, body, options),
    delete: (endpoint: string, options: any = {}) => apiClient.delete(endpoint, options),
  };
};