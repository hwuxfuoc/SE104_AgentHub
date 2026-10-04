import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { ENV } from './config/env.js';
import { errorHandler } from './middleware/error.middleware.js';

// Route imports
import authRoutes from './modules/auth/auth.routes.js';
import paymentRoutes from './modules/finance/payment/payment.routes.js';
import invoiceRoutes from './modules/finance/invoice/invoice.routes.js';
import debtRoutes from './modules/finance/debt/debt.routes.js';
import reportRoutes from './modules/finance/reports/report.routes.js';
import creditRoutes from './modules/finance/credit/credit.routes.js';
import businessRulesRoutes from './modules/rules/business-rules.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';

export const createApp = () => {
  const app = express();

  // Standard Middlewares
  app.use(helmet());
  app.use(cors({ origin: ENV.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  if (ENV.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Health check
  const healthHandler = (_req: express.Request, res: express.Response) => {
    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'SE104 Dealer Management System - Finance & Integration Backend',
      version: '1.0.0',
    });
  };

  app.get('/health', healthHandler);
  app.get('/api/v1/health', healthHandler);

  // API Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/payments', paymentRoutes);
  app.use('/api/v1/invoices', invoiceRoutes);
  app.use('/api/v1/dealers', debtRoutes);
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1/finance', creditRoutes);
  app.use('/api/v1/business-rules', businessRulesRoutes);
  app.use('/api/v1/audit-logs', auditRoutes);

  // 404 Handler
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested API endpoint was not found.',
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};

export default createApp;

