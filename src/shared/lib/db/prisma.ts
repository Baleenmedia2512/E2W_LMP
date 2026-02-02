import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client Singleton - Supabase PostgreSQL Connection
 * 
 * Configuration:
 * - DATABASE_URL: Supabase PostgreSQL pooler connection (port 6543)
 * - DIRECT_DATABASE_URL: Direct connection for migrations (port 5432)
 * 
 * Connection Pooling:
 * - Singleton pattern prevents multiple client instances
 * - In development, reuses client across hot reloads
 * - Uses pgbouncer for serverless compatibility
 */

// Helper to safely check NODE_ENV (handles trailing spaces from env config)
const getNodeEnv = () => (process.env.NODE_ENV || '').trim();
const isProduction = () => getNodeEnv() === 'production';
const isDevelopment = () => getNodeEnv() === 'development';

const prismaClientSingleton = () => {
  // Skip database validation during build if flag is set
  const skipDbCheck = process.env.SKIP_DB_CONNECTION_CHECK === 'true';
  
  // Validate environment configuration - warn during build, error at runtime
  if (!process.env.DATABASE_URL) {
    if (skipDbCheck) {
      console.warn('⚠️  DATABASE_URL not set during build (skipped) - will be required at runtime');
      // Return a minimal client that won't fail during build
      return new PrismaClient({
        log: [],
      });
    } else if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
      console.warn('⚠️  DATABASE_URL not set during build - will be required at runtime');
    } else {
      console.error('❌ DATABASE_URL environment variable is not set');
    }
  }

  // Initialize Prisma Client with PostgreSQL connection pooling
  return new PrismaClient({
    log: isDevelopment() ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

// Create singleton instance
const prisma = global.prisma ?? prismaClientSingleton();

// Warm up connection on first import in production (for serverless)
if (isProduction() && !global.prisma) {
  prisma.$connect().catch(err => {
    console.warn('⚠️  Prisma connection warmup failed (will retry on first query):', err.message);
  });
}

export default prisma;

// Cache prisma client in development to prevent multiple instances during hot reload
if (!isProduction()) {
  global.prisma = prisma;
}




