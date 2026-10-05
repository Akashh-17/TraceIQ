import { api } from './axios';

export const usersApi = {
  listUsers: async () => {
    const { data } = await api.get('/api/v1/users');
    return data.data;
  },
  createUser: async (payload: { email: string; password: string; role: string }) => {
    const { data } = await api.post('/api/v1/users', payload);
    return data.data;
  },
  updateRole: async (id: string, role: string) => {
    const { data } = await api.patch(`/api/v1/users/${id}/role`, { role });
    return data.data;
  },
};

export const apiKeysApi = {
  listApiKeys: async () => {
    const { data } = await api.get('/api/v1/api-keys');
    return data.data;
  },
  rollApiKey: async () => {
    const { data } = await api.post('/api/v1/api-keys/roll');
    return data.data;
  },
};

export const actorsApi = {
  getActorProfile: async (actor: string) => {
    const { data } = await api.get(`/api/v1/actors/${encodeURIComponent(actor)}`);
    return data.data;
  },
};
