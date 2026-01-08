import { NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';

// Force dynamic rendering - prevent build-time execution
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Set a timeout for the database query
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database query timeout')), 5000)
    );

    // Check database connection with timeout
    const queryPromise = prisma.lead.count();
    const leadsCount = await Promise.race([queryPromise, timeoutPromise]) as number;

    return NextResponse.json({
      isHealthy: true,
      hasDatabase: true,
      hasLeads: leadsCount > 0,
      message: `API healthy. ${leadsCount} leads in database.`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check failed:', error);

    // More detailed error logging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      env: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasDirectUrl: !!process.env.DIRECT_DATABASE_URL,
        nodeEnv: process.env.NODE_ENV,
      }
    });

    return NextResponse.json(
      {
        isHealthy: false,
        hasDatabase: false,
        hasLeads: false,
        message: 'Database connection failed',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}





