import { useAuth } from '@/context/AuthContext';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export const createApiClient = () => {
  const { token } = useAuth();

  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token might be expired or invalid
      const { logout } = useAuth();
      logout();
      throw new Error('Unauthorized: Please log in again.');
    }

    return response;
  };

  return {
    get: (endpoint: string, options: RequestInit = {}) => fetchWithAuth(endpoint, { method: 'GET', ...options }),
    post: (endpoint: string, body: any, options: RequestInit = {}) => fetchWithAuth(endpoint, { method: 'POST', body: JSON.stringify(body), ...options }),
    put: (endpoint: string, body: any, options: RequestInit = {}) => fetchWithAuth(endpoint, { method: 'PUT', body: JSON.stringify(body), ...options }),
    delete: (endpoint: string, options: RequestInit = {}) => fetchWithAuth(endpoint, { method: 'DELETE', ...options }),
  };
};