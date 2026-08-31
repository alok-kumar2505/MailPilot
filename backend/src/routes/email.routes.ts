import { Router } from 'express';
import { emailController } from '../controllers/email.controller';

const router = Router();

router.post('/', emailController.createEmails.bind(emailController));
router.get('/stats', emailController.getStats.bind(emailController));
router.get('/scheduled', emailController.getScheduledEmails.bind(emailController));
router.get('/sent', emailController.getSentEmails.bind(emailController));
router.get('/search', emailController.search.bind(emailController));
router.get('/:id', emailController.getEmailById.bind(emailController));
router.put('/:id/favourite', emailController.toggleFavourite.bind(emailController));
router.put('/:id/reschedule', emailController.reschedule.bind(emailController));

export default router;
