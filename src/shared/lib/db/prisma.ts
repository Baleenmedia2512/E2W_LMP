import { PrismaClient } from '@prisma/client';

const getNodeEnv = () => (process.env.NODE_ENV || '').trim();

/**
 * MilesWeb MySQL connection. Keep connection_limit modest for serverless.
 */
const getConnectionUrl = (): string | undefined => {
  const url = process.env.DATABASE_URL;
  if (!url) return url;

  if (url.includes('connection_limit=')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}connection_limit=5`;
};

const prismaClientSingleton = () => {
  const skipDbCheck = process.env.SKIP_DB_CONNECTION_CHECK === 'true';

  if (!process.env.DATABASE_URL) {
    if (skipDbCheck) {
      console.warn('⚠️  DATABASE_URL not set during build (skipped) - will be required at runtime');
      return new PrismaClient({ log: [] });
    } else if (getNodeEnv() === 'production' && process.env.VERCEL) {
      console.warn('⚠️  DATABASE_URL not set during build - will be required at runtime');
    } else {
      console.error('❌ DATABASE_URL environment variable is not set');
    }
  }

  return new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: getConnectionUrl(),
      },
    },
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = global.prisma ?? prismaClientSingleton();

if (!global.prisma) {
  global.prisma = prisma;
}

export default prisma;
