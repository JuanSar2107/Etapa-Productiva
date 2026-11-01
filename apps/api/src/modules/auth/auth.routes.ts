import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from './auth.controller';

export const authRoutes = Router();

authRoutes.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false }));

authRoutes.get('/google', authController.iniciarLogin);
authRoutes.get('/google/callback', authController.callback);
authRoutes.post('/logout', authController.logout);
