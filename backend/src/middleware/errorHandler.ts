import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Secure logging: only log error type, code, and message. Never dump raw request bodies, credentials, or tokens.
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error]: ${err.name || 'Error'} [${err.code || err.statusCode || 500}]: ${err.message || 'Unexpected error'}`);
  }

  // Malformed JSON Request Body SyntaxError (entity.parse.failed)
  if (
    (err instanceof SyntaxError || err.name === 'SyntaxError') &&
    (err.status === 400 || (err as any).statusCode === 400 || (err as any).type === 'entity.parse.failed')
  ) {
    return res.status(400).json({
      status: 'error',
      code: 'MALFORMED_JSON',
      message: 'Invalid JSON payload received in request body. Please verify JSON syntax and content headers.'
    });
  }

  // Mongoose Bad ObjectId CastError
  if (err.name === 'CastError') {
    return res.status(400).json({
      status: 'error',
      code: 'INVALID_ID',
      message: `Invalid format for resource identifier '${err.value}'`
    });
  }

  // Mongoose Schema Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e: any) => e.message);
    return res.status(422).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: messages.join('. ')
    });
  }

  // MongoDB Duplicate Key Error (e.g. unique email or compound index)
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue || {});
    return res.status(409).json({
      status: 'error',
      code: 'DUPLICATE_ENTRY',
      message: `A record with this ${fields.join(', ')} already exists.`
    });
  }

  // MongoDB Connection / Network Timeout Errors (e.g. Atlas IP restriction, socket secureConnect timeout)
  const errMsg = (err.message || '').toLowerCase();
  if (
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongoNetworkTimeoutError' ||
    err.name === 'MongoTimeoutError' ||
    err.name === 'MongoNetworkError' ||
    errMsg.includes('secureconnect') ||
    errMsg.includes('connecttimeoutms') ||
    errMsg.includes('serverselectiontimeoutms')
  ) {
    return res.status(503).json({
      status: 'error',
      code: 'DATABASE_UNAVAILABLE',
      message: 'FinovaX database is temporarily unavailable. Please try again shortly.'
    });
  }

  // Multer File Upload Error (file size limit exceeded, unexpected field, etc.)
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        code: 'FILE_TOO_LARGE',
        message: 'File size exceeds the 10 MB limit.'
      });
    }
    return res.status(400).json({
      status: 'error',
      code: 'UPLOAD_ERROR',
      message: err.message || 'File upload error occurred.'
    });
  }

  // Custom AppError (or any custom error with statusCode and code)
  if (err instanceof AppError || (err && typeof err.statusCode === 'number' && err.code)) {
    return res.status(err.statusCode || 500).json({
      status: 'error',
      code: err.code || 'ERROR',
      message: err.message
    });
  }

  // Default Internal Error
  return res.status(500).json({
    status: 'error',
    code: 'INTERNAL_SERVER_ERROR',
    message: err.message || 'An unexpected internal server error occurred.'
  });
}
