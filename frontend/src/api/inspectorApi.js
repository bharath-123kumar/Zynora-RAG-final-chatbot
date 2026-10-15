import { apiRequest } from './client';

export const inspectorApi = {
  inspect: (question) =>
    apiRequest('/api/admin/inspect', {
      method: 'POST',
      body: JSON.stringify({ question })
    })
};
