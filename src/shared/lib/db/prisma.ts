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
const prismaClientSingleton = () => {
  // Validate environment configuration
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Check if running Accelerate (runtime) vs Direct connection (migrations)
  const isAccelerateConnection = process.env.DATABASE_URL.startsWith('prisma://');

  if (!isAccelerateConnection && process.env.NODE_ENV === 'production') {
    console.warn(
      'WARNING: DATABASE_URL does not use Prisma Accelerate (prisma://). ' +
      'This may cause connection pool issues in production.'
    );
  }

  // Initialize Prisma Client with appropriate configuration
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
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
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}




