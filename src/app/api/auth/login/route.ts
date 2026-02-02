import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { comparePassword, generateToken } from '@/shared/lib/auth/auth-utils';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { Role: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'User account is inactive' },
        { status: 401 }
      );
    }

    // Compare passwords
    if (!user.password || !(await comparePassword(password, user.password))) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.Role.name,
    });

    return NextResponse.json(
      {
        success: true,
        token,
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
    console.error('Login error:', error);
    
    // Handle Prisma-specific errors for better debugging
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error code:', error.code, 'Message:', error.message);
      return NextResponse.json(
        { error: 'Database error', code: error.code },
        { status: 500 }
      );
    }
    
    if (error instanceof Prisma.PrismaClientInitializationError) {
      console.error('Prisma init error:', error.message);
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
