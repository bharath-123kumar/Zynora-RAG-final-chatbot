import { apiRequest } from './client';

export const conversationApi = {
  list: () => apiRequest('/api/conversations'),

  get: (id) => apiRequest(`/api/conversations/${id}`),

  create: (title = 'New Conversation') => apiRequest('/api/conversations', {
    method: 'POST',
    body: { title }
  }),

  rename: (id, title) => apiRequest(`/api/conversations/${id}`, {
    method: 'PUT',
    body: { title }
  }),

  delete: (id) => apiRequest(`/api/conversations/${id}`, {
    method: 'DELETE'
  }),

  clear: (id) => apiRequest(`/api/conversations/${id}/clear`, {
    method: 'POST'
  })
};
