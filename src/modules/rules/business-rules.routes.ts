import { Router, Request, Response, NextFunction } from 'express';
import { BusinessRulesService } from './business-rules.service.js';
import { authenticate, requireRoles } from '../../middleware/auth.middleware.js';
import { UserRole } from '../../config/constants.js';
import { z } from 'zod';
import { validateRequest } from '../../middleware/validate.middleware.js';

const router = Router();

const updateRuleSchema = z.object({
  value: z.record(z.any()),
  changeReason: z.string().optional(),
});

// GET /api/v1/business-rules - View all rules (Admin, Accountant, Sales, Warehouse)
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rules = await BusinessRulesService.getAllRules();
    res.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/business-rules/:code - Get single rule configuration
router.get('/:code', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await BusinessRulesService.getRuleConfig(req.params.code);
    res.json({
      success: true,
      data: {
        code: req.params.code,
        config,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/business-rules/:code - Update rule (QĐ7: Only Admin can update)
router.patch(
  '/:code',
  authenticate,
  requireRoles(UserRole.ADMIN),
  validateRequest({ body: updateRuleSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;
      const { value, changeReason } = req.body;
      const userId = req.user!.id;

      const updated = await BusinessRulesService.updateRuleConfig(code, value, userId, changeReason);

      res.json({
        success: true,
        message: `Business rule ${code} updated successfully`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

