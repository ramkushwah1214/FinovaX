import dotenv from 'dotenv';

dotenv.config();

const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/finovax',
  JWT_SECRET: process.env.JWT_SECRET || 'finovax_dev_secret_key_change_in_production_123456789',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  FRONTEND_URL: frontendUrl,
  CLIENT_URL: frontendUrl,
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000'
};

/**
 * Validates critical environment variables at startup without leaking secrets.
 */
export function validateEnv() {
  const missingVariables: string[] = [];
  const warnings: string[] = [];

  // Required keys to inspect
  if (!process.env.PORT) {
    warnings.push('PORT not set in environment. Defaulting to 5000.');
  }

  if (!process.env.MONGODB_URI) {
    if (ENV.NODE_ENV === 'production') {
      missingVariables.push('MONGODB_URI');
    } else {
      warnings.push('MONGODB_URI not explicitly set. Defaulting to local: mongodb://localhost:27017/finovax');
    }
  }

  if (!process.env.JWT_SECRET) {
    if (ENV.NODE_ENV === 'production') {
      missingVariables.push('JWT_SECRET');
    } else {
      warnings.push('JWT_SECRET not set. Using local development fallback secret.');
    }
  } else if (ENV.NODE_ENV === 'production' && (process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.includes('dev_secret'))) {
    throw new Error('FATAL: A cryptographically strong JWT_SECRET (minimum 32 characters) must be configured in production!');
  }

  if (!process.env.FRONTEND_URL && !process.env.CLIENT_URL) {
    warnings.push('FRONTEND_URL / CLIENT_URL not set. Defaulting to http://localhost:5173');
  }

  if (!process.env.AI_SERVICE_URL) {
    warnings.push('AI_SERVICE_URL not set. Defaulting to http://localhost:8000');
  }

  if (missingVariables.length > 0) {
    throw new Error(`FATAL: Missing required environment variable(s): ${missingVariables.join(', ')}. Please configure them in your .env file.`);
  }

  warnings.forEach(w => console.warn(`[Config Notice]: ${w}`));
}
