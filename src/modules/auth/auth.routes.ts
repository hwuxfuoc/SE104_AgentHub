import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { z } from 'zod';
import { validateRequest } from '../../middleware/validate.middleware.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Mật khẩu là bắt buộc'),
});

// POST /api/v1/auth/login
router.post(
  '/login',
  validateRequest({ body: loginSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      res.json({
        success: true,
        message: 'Đăng nhập thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/auth/profile
router.get(
  '/profile',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await AuthService.getProfile(req.user!.id);
      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

