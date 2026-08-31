import { Request, Response, NextFunction } from 'express';
import { emailService } from '../services/email.service';
import { createEmailBatchSchema } from '../schemas/email.schema';

export class EmailController {
  async createEmails(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      // 1. Validate request body
      const validatedData = createEmailBatchSchema.parse(req.body);

      // 2. Call service layer
      const result = await emailService.scheduleEmails(req.user.id, validatedData);

      // 3. Return response
      res.status(201).json({
        message: 'Emails scheduled successfully',
        batchId: result.batch.id,
        jobsCreated: result.jobs.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const stats = await emailService.getStats(req.user.id);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }

  async getScheduledEmails(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const isFavourited = req.query.favourite === 'true';

      const result = await emailService.getScheduledEmails(req.user.id, page, limit, isFavourited);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getSentEmails(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const isFavourited = req.query.favourite === 'true';

      const result = await emailService.getSentEmails(req.user.id, page, limit, isFavourited);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getEmailById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const { id } = req.params;
      const job = await emailService.getEmailJobById(req.user.id, id);

      if (!job) {
        return res.status(404).json({ message: 'Email job not found' });
      }

      res.json(job);
    } catch (error) {
      next(error);
    }
  }
  
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const q = req.query.q as string;
      if (!q) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
      }
      const results = await emailService.searchEmails(req.user.id, q);
      res.json({ results });
    } catch (error) {
      next(error);
    }
  }

  async toggleFavourite(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const { id } = req.params;
      const { is_favourited } = req.body;
      const updated = await emailService.toggleFavourite(req.user.id, id, is_favourited);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }

  async reschedule(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const { id } = req.params;
      const { scheduled_at } = req.body;
      const updated = await emailService.rescheduleEmail(req.user.id, id, scheduled_at);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
}

export const emailController = new EmailController();
