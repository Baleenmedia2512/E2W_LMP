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

// Detect if we're in a build environment (not runtime)
const isBuildTime = () => {
  return process.env.NEXT_PHASE === 'phase-production-build' || 
         process.env.VERCEL_ENV === 'preview' && !process.env.DATABASE_URL;
};

const prismaClientSingleton = () => {
  // Skip database connection during build time
  if (isBuildTime()) {
    console.log('⏭️  Skipping Prisma Client initialization during build phase');
    // Return a mock client that throws helpful errors if accidentally used
    return new Proxy({} as PrismaClient, {
      get: (target, prop) => {
        throw new Error(`Cannot access database during build time. Route should be marked as dynamic.`);
      }
    });
  }

  // Validate environment configuration at runtime
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    throw new Error('DATABASE_URL is required at runtime');
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

export default prisma;

// Cache prisma client in development to prevent multiple instances during hot reload
if (!isProduction()) {
  global.prisma = prisma;
}




