  // @/utils/api.ts
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
      // Add generic type T for response data
      get: <T = any>(endpoint: string, options: any = {}) => apiClient.get<T>(endpoint, options),
      post: <T = any>(endpoint: string, body: any, options: any = {}) => apiClient.post<T>(endpoint, body, options),
      put: <T = any>(endpoint: string, body: any, options: any = {}) => apiClient.put<T>(endpoint, body, options),
      delete: <T = any>(endpoint: string, options: any = {}) => apiClient.delete<T>(endpoint, options),
    };
  };