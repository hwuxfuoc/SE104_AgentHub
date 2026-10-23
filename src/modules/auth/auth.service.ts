import prisma from '../../config/prisma.js';
import bcrypt from 'bcryptjs';
import { generateToken, AuthUser } from '../../middleware/auth.middleware.js';
import { AppError, NotFoundError, UnauthorizedError, ValidationError } from '../../middleware/error.middleware.js';

export class AuthService {
  public static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        dealer: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Email hoặc mật khẩu không chính xác');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Email hoặc mật khẩu không chính xác');
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      dealerId: user.dealerId,
    };

    const token = generateToken(authUser);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        dealerId: user.dealerId,
        dealer: user.dealer ? {
          id: user.dealer.id,
          code: user.dealer.code,
          name: user.dealer.name,
        } : null,
      },
    };
  }

  public static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        dealer: {
          include: {
            district: true,
            tier: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      dealerId: user.dealerId,
      dealer: user.dealer,
    };
  }
}

