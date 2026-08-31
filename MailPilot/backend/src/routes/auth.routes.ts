import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);

router.post('/register', authController.register);
router.post('/login', authController.login);

router.get('/me', authMiddleware, authController.me);
router.post('/logout', authController.logout);

export default router;
