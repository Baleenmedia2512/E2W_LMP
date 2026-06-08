import { NextResponse } from 'next/server';

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5');
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '5');

export async function GET() {
  try {
    return NextResponse.json({
      expiryMinutes: OTP_EXPIRY_MINUTES,
      maxAttempts: OTP_MAX_ATTEMPTS,
    });
  } catch (error) {
    console.error('Error fetching OTP config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OTP configuration' },
      { status: 500 }
    );
  }
}
