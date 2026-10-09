import { apiRequest } from './client';

export const knowledgeApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/knowledge/documents${query ? `?${query}` : ''}`);
  },

  create: (doc) => apiRequest('/api/knowledge/documents', {
    method: 'POST',
    body: doc
  }),

  updateStatus: (id, status) => apiRequest(`/api/knowledge/documents/${id}/status`, {
    method: 'PUT',
    body: { status }
  }),

  reindex: () => apiRequest('/api/knowledge/reindex', {
    method: 'POST'
  }),

  delete: (id) => apiRequest(`/api/knowledge/documents/${id}`, {
    method: 'DELETE'
  })
};
