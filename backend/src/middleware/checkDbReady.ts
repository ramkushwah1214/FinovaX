import { Request, Response, NextFunction } from 'express';
import { isDbConnected, connectDB } from '../config/db';

export async function checkDbReady(req: Request, res: Response, next: NextFunction) {
  // Allow health check to pass through even if DB is down
  if (req.path === '/api/health' || req.path === '/health') {
    return next();
  }

  if (!isDbConnected()) {
    // Attempt automatic reconnection if no active connection promise is pending
    try {
      const reconnected = await connectDB();
      if (reconnected && isDbConnected()) {
        return next();
      }
    } catch {
      // Reconnection attempt failed; proceed to return structured 503
    }

    return res.status(503).json({
      status: 'error',
      code: 'DATABASE_UNAVAILABLE',
      message: 'FinovaX database is temporarily unavailable. Please try again shortly.'
    });
  }

  next();
}
