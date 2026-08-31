import { Request, Response, NextFunction } from 'express';
import { emailService } from '../services/email.service';
import { createEmailBatchSchema } from '../schemas/email.schema';

export class EmailController {
  async createEmails(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Validate request body
      const validatedData = createEmailBatchSchema.parse(req.body);

      // 2. Call service layer
      const result = await emailService.scheduleEmails(validatedData);

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

  async getScheduledEmails(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await emailService.getScheduledEmails(page, limit);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getSentEmails(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await emailService.getSentEmails(page, limit);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getEmailById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const job = await emailService.getEmailJobById(id);

      if (!job) {
        return res.status(404).json({ message: 'Email job not found' });
      }

      res.json(job);
    } catch (error) {
      next(error);
    }
  }
}

export const emailController = new EmailController();
