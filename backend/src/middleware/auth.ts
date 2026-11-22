import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

/**
 * Generate a cryptographically signed JWT token with expiry.
 */
export function generateToken(user: { id: string; email: string; name: string }): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name
    },
    ENV.JWT_SECRET,
    {
      expiresIn: ENV.JWT_EXPIRES_IN as any
    }
  );
}

/**
 * Authenticate incoming request via HttpOnly Cookie (preferred) or Authorization Bearer header.
 * Derives user identity strictly from verified server-side credentials.
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // 1. Check HttpOnly cookie first
  let token: string | undefined = req.cookies?.finovax_token;

  // 2. Fall back to Authorization Bearer header
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      status: 'error',
      code: 'UNAUTHORIZED',
      message: 'Access denied. No authentication token provided in cookie or header. Please sign in.'
    });
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthUser;

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        status: 'error',
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication credentials.'
      });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        code: 'TOKEN_EXPIRED',
        message: 'Your authentication session has expired. Please sign in again.'
      });
    }

    return res.status(401).json({
      status: 'error',
      code: 'INVALID_TOKEN',
      message: 'Authentication token verification failed. Please sign in again.'
    });
  }
}

export const requireAuth = authenticate;

