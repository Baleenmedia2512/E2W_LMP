import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { z } from 'zod';
import { generateOtpData } from '@/shared/lib/auth/otp-utils';
import emailQueue from '@/shared/lib/queue/email-queue';
import { checkAllRateLimits } from '@/shared/lib/auth/rate-limiter';

const sendOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = sendOtpSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid email address', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Get IP address and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Check rate limits
    const rateLimitResult = checkAllRateLimits(normalizedEmail, ipAddress);
    if (!rateLimitResult.allowed) {
      await prisma.loginActivity.create({
        data: {
          email: normalizedEmail,
          action: 'otp_send_failed',
          status: 'failed',
          success: false,
          failureReason: 'rate_limit',
          ipAddress,
          userAgent,
          metadata: JSON.stringify({ reason: rateLimitResult.reason }),
        },
      });

      return NextResponse.json(
        {
          error: rateLimitResult.reason,
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { Role: true },
    });

    if (!user) {
      // Generic error to prevent user enumeration
      await prisma.loginActivity.create({
        data: {
          email: normalizedEmail,
          action: 'otp_send_failed',
          status: 'failed',
          success: false,
          failureReason: 'user_not_found',
          ipAddress,
          userAgent,
        },
      });

      return NextResponse.json(
        { error: 'If this email is registered, you will receive a verification code.' },
        { status: 200 } // Return 200 to prevent enumeration
      );
    }

    // Check if user is active
    if (!user.isActive) {
      await prisma.loginActivity.create({
        data: {
          userId: user.id,
          email: normalizedEmail,
          action: 'otp_send_failed',
          status: 'failed',
          success: false,
          failureReason: 'user_inactive',
          ipAddress,
          userAgent,
        },
      });

      return NextResponse.json(
        { error: 'Your account is inactive. Please contact support.' },
        { status: 403 }
      );
    }

    // Invalidate any existing unused OTPs for this email
    await prisma.otpRequest.updateMany({
      where: {
        email: normalizedEmail,
        used: false,
      },
      data: {
        used: true,
      },
    });

    // Generate new OTP
    const { otp, hashedOtp, expiresAt } = await generateOtpData();

    // Store OTP request in database
    const otpRequest = await prisma.otpRequest.create({
      data: {
        email: normalizedEmail,
        hashedOtp,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    // Queue email for async sending (non-blocking)
    emailQueue.addToQueue(normalizedEmail, otp).catch(error => {
      console.error('Failed to queue email:', error);
    });

    // Log success immediately (email is queued)
    await prisma.loginActivity.create({
      data: {
        userId: user.id,
        email: normalizedEmail,
        action: 'otp_sent',
        status: 'success',
        success: true,
        ipAddress,
        userAgent,
        metadata: JSON.stringify({ otpRequestId: otpRequest.id }),
      },
    });

    // Return immediately without waiting for email
    return NextResponse.json(
      {
        success: true,
        message: 'Verification code sent to your email',
        otpRequestId: otpRequest.id,
        expiresIn: 300, // 5 minutes in seconds
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
