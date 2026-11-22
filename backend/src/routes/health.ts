import { Router, Request, Response } from 'express';
import { getDbStatus, isDbConnected } from '../config/db';
import { checkAiServiceHealth } from '../services/aiService';
import { ENV } from '../config/env';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    API health check, MongoDB readiness status, and verified FastAPI AI service status
 * @access  Public
 */
router.get('/', async (_req: Request, res: Response) => {
  const dbStatus = getDbStatus();
  const dbConnected = isDbConnected();
  const aiStatus = await checkAiServiceHealth();

  const isHealthy = dbConnected;

  const responsePayload = {
    status: isHealthy ? (aiStatus.connected ? 'ok' : 'degraded') : 'unhealthy',
    service: 'finovax-backend',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    backend: {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      version: '1.0.0'
    },
    database: {
      status: dbStatus.status,
      connected: dbConnected,
      readyState: dbStatus.readyState,
      diagnostic: dbConnected
        ? 'CONNECTED'
        : (dbStatus.isIpRestrictionSuspected ? 'MONGODB_ATLAS_IP_NOT_WHITELISTED' : 'DATABASE_OFFLINE_OR_UNREACHABLE'),
      advice: dbConnected
        ? undefined
        : (dbStatus.isIpRestrictionSuspected
            ? 'Your current IP address is not whitelisted on MongoDB Atlas. Go to Atlas Dashboard -> Security -> Network Access -> Add IP Address.'
            : (ENV.MONGODB_URI.includes('mongodb+srv') || ENV.MONGODB_URI.includes('mongodb.net')
                ? 'Verify MongoDB Atlas cluster is online and your IP is in Atlas Network Access.'
                : 'Verify local MongoDB service is running or configure a valid MONGODB_URI in backend/.env.'))
    },
    aiService: {
      status: aiStatus.status,
      connected: aiStatus.connected,
      url: aiStatus.url,
      latencyMs: aiStatus.latencyMs
    },
    message: dbConnected
      ? (aiStatus.connected
        ? 'FinovaX Backend REST API, MongoDB connection, and FastAPI AI service are operating normally.'
        : 'FinovaX Backend is online with MongoDB connected. FastAPI AI service is currently unreachable.')
      : (dbStatus.isIpRestrictionSuspected
        ? 'MongoDB Atlas connection was rejected due to IP restrictions. CRUD endpoints return 503 until current IP is added to Atlas Network Access.'
        : 'MongoDB connection is currently unavailable. CRUD endpoints will return 503 until connection is restored.')
  };

  return res.status(200).json(responsePayload);
});

export default router;

