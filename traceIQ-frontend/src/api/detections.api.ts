import { api } from './axios';

export const detectionsApi = {
  getDetections: async (params: {
    cursor?: string;
    limit?: number;
    severity?: string;
    status?: string;
    actor?: string;
    from?: string;
    to?: string;
  }) => {
    const { data } = await api.get('/api/v1/detections', { params });
    return data;
  },
  updateStatus: async (id: string, status: string) => {
    const { data } = await api.patch(`/api/v1/detections/${id}/status`, { status });
    return data.data;
  },
};

export const investigationApi = {
  investigate: async (actor: string | null, query: string) => {
    const { data } = await api.post('/api/v1/ai/investigate', {
      query,
      ...(actor && { actor }),
    });
    return data.data;
  },
  listHistory: async (params?: { cursor?: string; limit?: number }) => {
    const { data } = await api.get('/api/v1/ai/investigate/history', { params });
    return data;
  },
};
