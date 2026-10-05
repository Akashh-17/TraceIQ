import { api } from './axios';

export interface WebhookConfig {
  id: string;
  tenantId: string;
  url: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const webhookApi = {
  getConfig: (): Promise<WebhookConfig | null> =>
    api.get('/api/v1/webhooks').then(r => r.data.data),

  upsert: (url: string): Promise<WebhookConfig> =>
    api.put('/api/v1/webhooks', { url }).then(r => r.data.data),

  delete: (): Promise<void> =>
    api.delete('/api/v1/webhooks').then(r => r.data),

  sendTest: (): Promise<{ delivered: boolean; status: number }> =>
    api.post('/api/v1/webhooks/test').then(r => r.data.data),
};
