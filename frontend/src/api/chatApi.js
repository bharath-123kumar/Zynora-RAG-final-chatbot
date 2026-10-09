import { apiRequest } from './client';

export const chatApi = {
  sendMessage: (message, conversationId = null) => apiRequest('/api/zynora/chat', {
    method: 'POST',
    body: { message, conversationId }
  })
};
