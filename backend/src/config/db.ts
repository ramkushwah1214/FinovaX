import mongoose from 'mongoose';
import dns from 'dns';
import { ENV } from './env';

// Configure DNS resolvers for MongoDB Atlas SRV query resolution on Windows/container environments
try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {
  // Ignore in environments where setting DNS servers is restricted
}

export type DbDiagnosticCategory =
  | 'CONNECTED'
  | 'CONNECTING'
  | 'DNS_RESOLUTION_FAILURE'
  | 'TCP_CONNECTION_FAILURE'
  | 'TLS_HANDSHAKE_FAILURE'
  | 'AUTHENTICATION_FAILURE'
  | 'ATLAS_ACCESS_TIMEOUT'
  | 'DISCONNECTED'
  | 'UNKNOWN_ERROR';

let connectionPromise: Promise<boolean> | null = null;
let lastDbError: string | null = null;
let lastDiagnosticCategory: DbDiagnosticCategory = 'DISCONNECTED';
let isIpRestrictionSuspected = false;

/**
 * Sanitizes MongoDB connection URI to automatically encode special characters (like '@' in password)
 * that would otherwise break the standard MongoDB URI connection parser.
 * Always masks passwords before logging or reporting.
 */
export function sanitizeMongoUri(uri: string): string {
  if (!uri || typeof uri !== 'string') return uri;

  const match = uri.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):(.*)@([^@/]+)(\/.*)?$/);
  if (match) {
    const [, protocol, username, password, host, query = ''] = match;
    if (password.includes('@')) {
      const safePassword = password.replace(/@/g, '%40');
      return `${protocol}${username}:${safePassword}@${host}${query}`;
    }
  }
  return uri;
}

/**
 * Categorizes connection errors accurately without misclassifying all timeouts as IP whitelist rejections.
 */
function categorizeError(error: any): { category: DbDiagnosticCategory; isAtlasWhitelistSuspected: boolean } {
  const errMsg = (error?.message || String(error)).toLowerCase();
  const isAtlas = ENV.MONGODB_URI.includes('mongodb+srv') || ENV.MONGODB_URI.includes('mongodb.net');

  if (errMsg.includes('querysrv') || errMsg.includes('enotfound') || errMsg.includes('eai_again') || errMsg.includes('querytxt')) {
    return { category: 'DNS_RESOLUTION_FAILURE', isAtlasWhitelistSuspected: false };
  }

  if (errMsg.includes('econnrefused') || errMsg.includes('ehostunreach') || errMsg.includes('enetunreach')) {
    return { category: 'TCP_CONNECTION_FAILURE', isAtlasWhitelistSuspected: false };
  }

  if (errMsg.includes('ssl alert') || errMsg.includes('tlsv1 alert') || errMsg.includes('cert_has_expired') || errMsg.includes('unable to verify')) {
    return { category: 'TLS_HANDSHAKE_FAILURE', isAtlasWhitelistSuspected: false };
  }

  if (errMsg.includes('auth') || errMsg.includes('authentication failed')) {
    return { category: 'AUTHENTICATION_FAILURE', isAtlasWhitelistSuspected: false };
  }

  // Atlas Network Access (IP Access List) blocks incoming packets, producing a secureConnect timeout on port 27017
  if (isAtlas && (errMsg.includes('secureconnect') || errMsg.includes('timed out') || errMsg.includes('mongonetworktimeouterror') || errMsg.includes('could not connect to any servers'))) {
    return { category: 'ATLAS_ACCESS_TIMEOUT', isAtlasWhitelistSuspected: true };
  }

  return { category: 'UNKNOWN_ERROR', isAtlasWhitelistSuspected: false };
}

/**
 * Reusable Mongoose connection initiator.
 * Enforces a single promise lock to prevent overlapping connection attempts.
 */
export async function connectDB(): Promise<boolean> {
  if (mongoose.connection.readyState === 1) {
    lastDbError = null;
    lastDiagnosticCategory = 'CONNECTED';
    isIpRestrictionSuspected = false;
    return true;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      lastDiagnosticCategory = 'CONNECTING';
      const connectionUri = sanitizeMongoUri(ENV.MONGODB_URI);
      const maskedUri = connectionUri.replace(/:\/\/.*@/, '://***:***@');

      console.log(`[Database]: Attempting connection to MongoDB at ${maskedUri}...`);

      mongoose.set('strictQuery', true);

      await mongoose.connect(connectionUri, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
        maxPoolSize: 20,
        minPoolSize: 2,
        socketTimeoutMS: 45000
      });

      lastDbError = null;
      lastDiagnosticCategory = 'CONNECTED';
      isIpRestrictionSuspected = false;
      console.log('✅ [Database]: Successfully connected to MongoDB database');
      return true;
    } catch (error: any) {
      const errMsg = error.message || String(error);
      lastDbError = errMsg;

      const { category, isAtlasWhitelistSuspected } = categorizeError(error);
      lastDiagnosticCategory = category;
      isIpRestrictionSuspected = isAtlasWhitelistSuspected;

      console.error(`❌ [Database Error] Category: ${category} | Reason: ${errMsg}`);

      if (category === 'ATLAS_ACCESS_TIMEOUT') {
        console.warn('⚠️ [Database Diagnostic]: Atlas connection timed out during secureConnect.');
        console.warn('👉 Possible cause: Outbound public IP is not in MongoDB Atlas Network Access list (dynamic ISP IP change or unlisted IP).');
        console.warn('👉 For production, route egress through a static IP. For development, add the current outbound IP to Atlas Network Access.');
      } else if (category === 'DNS_RESOLUTION_FAILURE') {
        console.warn('⚠️ [Database Diagnostic]: SRV/DNS resolution failed. Upstream DNS servers could not resolve the Atlas cluster hostname.');
      } else if (category === 'AUTHENTICATION_FAILURE') {
        console.warn('⚠️ [Database Diagnostic]: MongoDB authentication rejected credentials.');
      }

      return false;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
}

/**
 * Controlled retry mechanism with exponential backoff and jitter.
 * Prevents retry storms and provides resilient startup.
 */
export async function connectWithRetry(
  maxAttempts: number = 5,
  initialDelayMs: number = 1000,
  maxDelayMs: number = 16000
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const success = await connectDB();
    if (success && isDbConnected()) {
      return true;
    }

    if (attempt < maxAttempts) {
      const expDelay = Math.min(maxDelayMs, initialDelayMs * Math.pow(2, attempt - 1));
      const jitter = expDelay * (0.8 + Math.random() * 0.4);
      console.warn(`⏳ [Database]: Connection attempt ${attempt}/${maxAttempts} failed. Retrying in ${Math.round(jitter)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, jitter));
    }
  }
  return false;
}

/**
 * Graceful connection teardown for process shutdown (SIGINT / SIGTERM).
 */
export async function closeDBConnection(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
      lastDiagnosticCategory = 'DISCONNECTED';
      console.log('🛑 [Database]: Closed MongoDB connection cleanly on shutdown');
    } catch (err: any) {
      console.error('⚠️ [Database]: Error while closing connection:', err.message);
    }
  }
}

// Mongoose Connection Lifecycle Event Listeners
mongoose.connection.on('disconnected', () => {
  lastDiagnosticCategory = 'DISCONNECTED';
  console.warn('⚠️ [Database]: MongoDB connection disconnected');
});

mongoose.connection.on('reconnected', () => {
  lastDbError = null;
  lastDiagnosticCategory = 'CONNECTED';
  isIpRestrictionSuspected = false;
  console.log('🔄 [Database]: MongoDB connection re-established');
});

mongoose.connection.on('error', (err) => {
  lastDbError = err.message;
  console.error('❌ [Database Runtime Error]:', err.message);
});

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export function getDbStatus(): {
  status: string;
  readyState: number;
  lastError: string | null;
  diagnosticCategory: DbDiagnosticCategory;
  isIpRestrictionSuspected: boolean;
} {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const state = states[mongoose.connection.readyState] || 'unknown';
  return {
    status: state,
    readyState: mongoose.connection.readyState,
    lastError: lastDbError,
    diagnosticCategory: lastDiagnosticCategory,
    isIpRestrictionSuspected
  };
}
