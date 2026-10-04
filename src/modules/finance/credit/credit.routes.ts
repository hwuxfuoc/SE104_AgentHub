import { Router, Request, Response, NextFunction } from 'express';
import { CreditService } from './credit.service.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { z } from 'zod';
import { validateRequest } from '../../../middleware/validate.middleware.js';

const router = Router();

const checkCreditSchema = z.object({
  dealerId: z.string().min(1, 'dealerId is required'),
  orderAmount: z.number().int().min(0, 'orderAmount must be >= 0'),
});

// POST /api/v1/finance/check-credit-limit - Integration point for P4 (Order approval check)
router.post(
  '/check-credit-limit',
  authenticate,
  validateRequest({ body: checkCreditSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { dealerId, orderAmount } = req.body;
      const result = await CreditService.checkCreditLimit(dealerId, orderAmount);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

