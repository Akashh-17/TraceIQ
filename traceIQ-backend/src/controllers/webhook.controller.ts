import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { webhookService } from '../services/webhook.service';

const WebhookUpsertSchema = z.object({
  url: z.string().url('Must be a valid URL (e.g. https://hooks.slack.com/...)'),
});

export class WebhookController {
  // GET /api/v1/webhooks
  getConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const config = await webhookService.getConfig(tenantId);
      res.status(200).json({ success: true, data: config });
    } catch (err) {
      next(err);
    }
  };

  // PUT /api/v1/webhooks
  upsert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const result = WebhookUpsertSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ success: false, message: result.error.issues[0]?.message });
        return;
      }

      const config = await webhookService.upsert(tenantId, result.data.url);
      res.status(200).json({ success: true, data: config });
    } catch (err) {
      next(err);
    }
  };

  // DELETE /api/v1/webhooks
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      await webhookService.delete(tenantId);
      res.status(200).json({ success: true, message: 'Webhook removed' });
    } catch (err) {
      next(err);
    }
  };

  // POST /api/v1/webhooks/test
  sendTest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const result = await webhookService.sendTest(tenantId);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Test delivery failed' });
    }
  };
}

export const webhookController = new WebhookController();
