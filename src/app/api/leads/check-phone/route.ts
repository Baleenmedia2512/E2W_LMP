import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { normalizePhoneForStorage } from '@/shared/utils/phone';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    // Normalize phone to match database format
    const normalizedPhone = normalizePhoneForStorage(phone);

    // Find existing leads with this phone number
    const existingLeads = await prisma.lead.findMany({
      where: {
        phone: normalizedPhone
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 1, // Get most recent lead
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        alternatePhone: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        source: true,
        campaign: true,
        customerRequirement: true,
        lead_category: true,
        createdAt: true
      }
    });

    if (existingLeads.length > 0) {
      return NextResponse.json({
        exists: true,
        lead: existingLeads[0]
      });
    }

    return NextResponse.json({ exists: false });

  } catch (error) {
    console.error('Phone lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to check phone number' },
      { status: 500 }
    );
  }
}
