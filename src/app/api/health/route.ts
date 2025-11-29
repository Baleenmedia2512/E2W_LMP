import { NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';

export async function GET() {
  try {
    // Check database connection
    const leadsCount = await prisma.lead.count();

    return NextResponse.json({
      isHealthy: true,
      hasDatabase: true,
      hasLeads: leadsCount > 0,
      message: `API healthy. ${leadsCount} leads in database.`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json(
      {
        isHealthy: false,
        hasDatabase: false,
        hasLeads: false,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}





