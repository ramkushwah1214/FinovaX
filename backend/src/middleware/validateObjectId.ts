import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

/**
 * Validates that specified request parameter is a valid 24-character hexadecimal MongoDB ObjectId.
 * Prevents Mongoose CastError exceptions and protects query execution.
 */
export function validateObjectId(paramName = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    if (id && !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_ID_FORMAT',
        message: `The provided resource parameter '${paramName}' (${id}) is not a valid MongoDB identifier.`
      });
    }
    next();
  };
}
