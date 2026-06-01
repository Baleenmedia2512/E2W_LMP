import { PrismaClient } from '@prisma/client';

// Helper to safely check NODE_ENV (handles trailing spaces from env config)
const getNodeEnv = () => (process.env.NODE_ENV || '').trim();
const isProduction = () => getNodeEnv() === 'production';
const isDevelopment = () => getNodeEnv() === 'development';

/**
 * Builds the DATABASE_URL with pgbouncer=true and connection_limit=2 enforced.
 * - pgbouncer=true: tells Prisma not to use prepared statements (required for PgBouncer)
 * - connection_limit=2: allows 2 concurrent DB connections per function instance,
 *   enabling true Promise.all() parallelism while keeping pool pressure low.
 */
const getPooledConnectionUrl = (): string | undefined => {
  const url = process.env.DATABASE_URL;
  if (!url) return url;

  const separator = url.includes('?') ? '&' : '?';
  let pooledUrl = url;

  if (!url.includes('pgbouncer=')) {
    pooledUrl += `${separator}pgbouncer=true`;
  }
  if (!url.includes('connection_limit=')) {
    pooledUrl += `&connection_limit=5`;
  }

  return pooledUrl;
};

const prismaClientSingleton = () => {
  const skipDbCheck = process.env.SKIP_DB_CONNECTION_CHECK === 'true';

  if (!process.env.DATABASE_URL) {
    if (skipDbCheck) {
      console.warn('⚠️  DATABASE_URL not set during build (skipped) - will be required at runtime');
      return new PrismaClient({ log: [] });
    } else if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
      console.warn('⚠️  DATABASE_URL not set during build - will be required at runtime');
    } else {
      console.error('❌ DATABASE_URL environment variable is not set');
    }
  }

  return new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: getPooledConnectionUrl(),
      },
    },
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

// Singleton cached in both development AND production.
// In production (Vercel), warm container reuse will share the same client,
// preventing a new connection pool from being created on every invocation.
const prisma = global.prisma ?? prismaClientSingleton();

if (!global.prisma) {
  global.prisma = prisma;
}

export default prisma;




