import { Router } from 'express';
import { AuditController } from './audit.controller.js';
import { authenticate, requireRoles } from '../../middleware/auth.middleware.js';
import { UserRole } from '../../config/constants.js';

const router = Router();

// Only ADMIN and ACCOUNTANT can query audit logs
router.get(
  '/',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.ACCOUNTANT),
  AuditController.getLogs
);

export default router;

