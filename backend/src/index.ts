import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ENV, validateEnv } from './config/env';
import { connectDB, connectWithRetry, closeDBConnection } from './config/db';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import transactionRouter from './routes/transactions';
import budgetRouter from './routes/budgets';
import goalRouter from './routes/goals';
import recurringPaymentRouter from './routes/recurringPayments';
import dashboardRouter from './routes/dashboard';
import reportRouter from './routes/reports';
import fraudAlertRouter from './routes/fraudAlerts';
import statementRouter from './routes/statements';
import bankConnectionRouter from './routes/bankConnections';
import aiRouter from './routes/ai';

// Validate configuration
validateEnv();

const app = express();

// Configure narrowest correct trust proxy topology:
// Trust reverse proxy (Nginx in Docker container) connecting over Docker internal bridge network (uniquelocal) or loopback.
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

// Global Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Managed separately for API / client integration
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: [
    ENV.CLIENT_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000'
  ],
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check (Always accessible, reports DB status)
app.use('/api/health', healthRouter);

// Domain Routes
app.use('/api/auth', authRouter);
app.use('/api/transactions', transactionRouter);
app.use('/api/budgets', budgetRouter);
app.use('/api/goals', goalRouter);
app.use('/api/recurring-payments', recurringPaymentRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/reports', reportRouter);
app.use('/api/fraud-alerts', fraudAlertRouter);
app.use('/api/statements', statementRouter);
app.use('/api/bank-connections', bankConnectionRouter);
app.use('/api/ai', aiRouter);

// Root route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Welcome to FinovaX Backend REST API',
    version: '1.0.0',
    documentation: '/api/health'
  });
});

// 404 Not Found Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    code: 'NOT_FOUND',
    message: 'The requested API endpoint does not exist'
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Start HTTP server immediately and initiate resilient database connection with retry
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(ENV.PORT, '0.0.0.0', () => {
    console.log(`🚀 FinovaX Backend API running at http://0.0.0.0:${ENV.PORT}`);
    console.log(`🩺 Health check available at http://localhost:${ENV.PORT}/api/health`);
  });

  // Resilient connection with exponential backoff and jitter
  connectWithRetry(5, 1000, 16000).catch((err) => {
    console.error('⚠️ [Database Startup]: Initial retry sequence completed with error:', err.message);
  });

  // Graceful Process Termination Handlers
  const gracefulShutdown = async (signal: string) => {
    console.log(`Received ${signal}. Gracefully terminating FinovaX Backend...`);
    server.close(async () => {
      await closeDBConnection();
      console.log('Server and database closed cleanly. Exiting.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

export default app;
