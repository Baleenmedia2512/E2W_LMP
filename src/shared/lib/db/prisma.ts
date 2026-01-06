import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

/**
 * Prisma Client Singleton with Accelerate Support
 * 
 * Configuration:
 * - DATABASE_URL: Prisma Accelerate connection (prisma://) - Used at runtime
 * - DIRECT_DATABASE_URL: Direct MySQL connection - Used for migrations only
 * 
 * Connection Pooling:
 * - Accelerate handles connection pooling automatically
 * - Singleton pattern prevents multiple client instances
 * - In development, reuses client across hot reloads
 */

// Helper to safely check NODE_ENV (handles trailing spaces from env config)
const getNodeEnv = () => (process.env.NODE_ENV || '').trim();
const isProduction = () => getNodeEnv() === 'production';
const isDevelopment = () => getNodeEnv() === 'development';

const prismaClientSingleton = () => {
  // Validate environment configuration
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Trim DATABASE_URL to handle any accidental whitespace
  const databaseUrl = process.env.DATABASE_URL.trim();
  
  // Check if running Accelerate (runtime) vs Direct connection (migrations)
  const isAccelerateConnection = databaseUrl.startsWith('prisma://');

  if (!isAccelerateConnection && isProduction()) {
    console.warn(
      'WARNING: DATABASE_URL does not use Prisma Accelerate (prisma://). ' +
      'This may cause connection pool issues in production.'
    );
  }

  // Initialize Prisma Client with appropriate configuration
  const client = new PrismaClient({
    log: isDevelopment() ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  // Only extend with Accelerate if using the Accelerate URL
  if (isAccelerateConnection) {
    return client.$extends(withAccelerate());
  }

  return client;
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




