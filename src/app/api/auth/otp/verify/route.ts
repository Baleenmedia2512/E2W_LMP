import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { z } from 'zod';
import { verifyOTP, isOtpExpired, isMaxAttemptsExceeded, isValidOtpFormat, getMaxOtpAttempts } from '@/shared/lib/auth/otp-utils';
import { createSession } from '@/shared/lib/auth/session-manager';

const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(4, 'OTP must be 4 digits'),
  otpRequestId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = verifyOtpSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { email, otp, otpRequestId } = validationResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Get IP address and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Validate OTP format
    if (!isValidOtpFormat(otp)) {
      return NextResponse.json(
        { error: 'Invalid verification code format' },
        { status: 400 }
      );
    }

    // Find the OTP request
    const otpRequest = await prisma.otpRequest.findFirst({
      where: {
        email: normalizedEmail,
        used: false,
        ...(otpRequestId && { id: otpRequestId }),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('🔍 OTP VERIFY DEBUG:', {
      email: normalizedEmail,
      otpRequestId,
      found: !!otpRequest,
      attempts: otpRequest?.attempts,
      used: otpRequest?.used,
      expired: otpRequest ? isOtpExpired(otpRequest.expiresAt) : null,
      maxAttemptsExceeded: otpRequest ? isMaxAttemptsExceeded(otpRequest.attempts) : null,
      maxAllowed: parseInt(process.env.OTP_MAX_ATTEMPTS || '5'),
    });

    if (!otpRequest) {
      await prisma.loginActivity.create({
        data: {
          email: normalizedEmail,
          action: 'otp_verify_failed',
          status: 'failed',
          success: false,
          failureReason: 'otp_not_found',
          ipAddress,
          userAgent,
        },
      });

      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    // Check if OTP is expired
    if (isOtpExpired(otpRequest.expiresAt)) {
      await prisma.otpRequest.update({
        where: { id: otpRequest.id },
        data: { used: true },
      });

      await prisma.loginActivity.create({
        data: {
          email: normalizedEmail,
          action: 'otp_verify_failed',
          status: 'failed',
          success: false,
          failureReason: 'otp_expired',
          ipAddress,
          userAgent,
        },
      });

      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if max attempts already exceeded
    if (isMaxAttemptsExceeded(otpRequest.attempts)) {
      await prisma.otpRequest.update({
        where: { id: otpRequest.id },
        data: { used: true },
      });

      await prisma.loginActivity.create({
        data: {
          email: normalizedEmail,
          action: 'otp_verify_failed',
          status: 'failed',
          success: false,
          failureReason: 'max_attempts_exceeded',
          ipAddress,
          userAgent,
        },
      });

      return NextResponse.json(
        { 
          error: 'Maximum verification attempts reached. This code has been disabled.',
          blocked: true,
          message: 'Click "Resend Code" below to receive a new verification code.'
        },
        { status: 400 }
      );
    }

    // Verify OTP
    const isValid = await verifyOTP(otp, otpRequest.hashedOtp);

    if (!isValid) {
      // Increment attempts
      const updatedOtpRequest = await prisma.otpRequest.update({
        where: { id: otpRequest.id },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      console.log('❌ WRONG OTP - INCREMENTED:', {
        otpRequestId: otpRequest.id,
        oldAttempts: otpRequest.attempts,
        newAttempts: updatedOtpRequest.attempts,
        remaining: parseInt(process.env.OTP_MAX_ATTEMPTS || '5') - updatedOtpRequest.attempts,
      });

      await prisma.loginActivity.create({
        data: {
          email: normalizedEmail,
          action: 'otp_verify_failed',
          status: 'failed',
          success: false,
          failureReason: 'invalid_otp',
          ipAddress,
          userAgent,
          metadata: JSON.stringify({ attempts: otpRequest.attempts + 1 }),
        },
      });

      return NextResponse.json(
        {
          error: 'Invalid verification code',
          attemptsRemaining: Math.max(0, getMaxOtpAttempts() - (otpRequest.attempts + 1)),
        },
        { status: 400 }
      );
    }

    // Mark OTP as used
    await prisma.otpRequest.update({
      where: { id: otpRequest.id },
      data: { used: true },
    });

    // Get user details
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { Role: true },
    });

    if (!user || !user.isActive) {
      await prisma.loginActivity.create({
        data: {
          email: normalizedEmail,
          action: 'login_failed',
          status: 'failed',
          success: false,
          failureReason: 'user_not_found_or_inactive',
          ipAddress,
          userAgent,
        },
      });

      return NextResponse.json(
        { error: 'User account not found or inactive' },
        { status: 403 }
      );
    }

    // Create session
    const sessionData = await createSession(
      user.id,
      user.email,
      user.roleId,
      user.Role.name,
      ipAddress,
      userAgent,
      undefined // deviceInfo can be added later
    );

    // Log successful login
    await prisma.loginActivity.create({
      data: {
        userId: user.id,
        email: normalizedEmail,
        action: 'login_success',
        status: 'success',
        success: true,
        ipAddress,
        userAgent,
        metadata: JSON.stringify({ method: 'otp' }),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Login successful',
        token: sessionData.token,
        refreshToken: sessionData.refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.Role.name,
          image: user.image,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
