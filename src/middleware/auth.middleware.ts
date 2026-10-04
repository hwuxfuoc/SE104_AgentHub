import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from './error.middleware.js';
import { UserRole } from '../config/constants.js';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  fullName: string;
  dealerId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  // Allow test / dev mock header if provided
  const devUserId = req.headers['x-user-id'] as string;
  const devUserRole = req.headers['x-user-role'] as string;
  if (devUserId && devUserRole) {
    req.user = {
      id: devUserId,
      email: `${devUserRole.toLowerCase()}@system.local`,
      role: devUserRole,
      fullName: `User ${devUserRole}`,
      dealerId: req.headers['x-dealer-id'] as string || null,
    };
    return next();
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid Authorization header');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    throw new UnauthorizedError('Invalid or expired token');
  }
};

export const requireRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (req.user.role === UserRole.ADMIN) {
      return next(); // Admin has universal access
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
    }

    next();
  };
};

export const generateToken = (user: AuthUser): string => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      dealerId: user.dealerId,
    },
    ENV.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

