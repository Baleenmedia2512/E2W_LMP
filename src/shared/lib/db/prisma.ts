import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client Singleton - Direct MySQL Connection
 * 
 * Configuration:
 * - DATABASE_URL: Direct MySQL connection
 * 
 * Connection Pooling:
 * - Singleton pattern prevents multiple client instances
 * - In development, reuses client across hot reloads
 */

// Helper to safely check NODE_ENV (handles trailing spaces from env config)
const getNodeEnv = () => (process.env.NODE_ENV || '').trim();
const isProduction = () => getNodeEnv() === 'production';
const isDevelopment = () => getNodeEnv() === 'development';

const prismaClientSingleton = () => {
  // Validate environment configuration - warn during build, error at runtime
  if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
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

export default prisma;

// Cache prisma client in development to prevent multiple instances during hot reload
if (!isProduction()) {
  global.prisma = prisma;
}




