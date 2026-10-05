import { api } from './axios';

export const eventsApi = {
  getEvents: async (params: { cursor?: string; limit?: number; actor?: string; action?: string; from?: string; to?: string }) => {
    const { data } = await api.get('/api/v1/events', { params });
    return data;
  },
  getEventById: async (id: string) => {
    const { data } = await api.get(`/api/v1/events/${id}`);
    return data.data;
  },
  getRelatedEvents: async (id: string) => {
    const { data } = await api.get(`/api/v1/events/${id}/related`);
    return data.data;
  },
  exportCsv: async (params: { actor?: string; action?: string; from?: string }) => {
    const response = await api.get('/api/v1/events/export', {
      params,
      responseType: 'blob',
    });
    const url = URL.createObjectURL(response.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
