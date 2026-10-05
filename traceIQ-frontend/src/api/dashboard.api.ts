import { api } from './axios';

export const dashboardApi = {
  getStats: async () => {
    const { data } = await api.get('/api/v1/dashboard/stats');
    return data.data;
  },
  getTrends: async () => {
    const { data } = await api.get('/api/v1/dashboard/trends');
    return data.data;
  },
  getDetectionTrend: async () => {
    const { data } = await api.get('/api/v1/dashboard/detection-trend');
    return data.data;
  }
};
