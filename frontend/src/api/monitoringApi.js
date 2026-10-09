import { apiRequest } from './client';

export const monitoringApi = {
  getMetrics: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/monitoring/metrics${query ? `?${query}` : ''}`);
  }
};
