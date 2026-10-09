import { apiRequest } from './client';

export const authApi = {
  login: (email, password) => apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password }
  }),

  register: (email, password, fullName) => apiRequest('/api/auth/register', {
    method: 'POST',
    body: { email, password, fullName }
  }),

  getMe: () => apiRequest('/api/auth/me')
};
