import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// OTP Configuration
const OTP_LENGTH = 4;
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5');
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '5');

export interface OtpData {
  otp: string;
  hashedOtp: string;
  expiresAt: Date;
}

/**
 * Generate a cryptographically secure 4-digit OTP
 */
export function generateOTP(): string {
  const buffer = crypto.randomBytes(4);
  const num = buffer.readUInt32BE(0);
  const otp = (num % 10000).toString().padStart(OTP_LENGTH, '0');
  return otp;
}

/**
 * Hash OTP before storing in database
 */
export async function hashOTP(otp: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(otp, saltRounds);
}

/**
 * Verify OTP against hashed value
 */
export async function verifyOTP(otp: string, hashedOtp: string): Promise<boolean> {
  return bcrypt.compare(otp, hashedOtp);
}

/**
 * Generate OTP data with hash and expiration
 */
export async function generateOtpData(): Promise<OtpData> {
  const otp = generateOTP();
  const hashedOtp = await hashOTP(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  return {
    otp,
    hashedOtp,
    expiresAt,
  };
}

/**
 * Check if OTP is expired
 */
export function isOtpExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Check if max attempts exceeded
 */
export function isMaxAttemptsExceeded(attempts: number): boolean {
  return attempts >= OTP_MAX_ATTEMPTS;
}

/**
 * Validate OTP format (4 digits)
 */
export function isValidOtpFormat(otp: string): boolean {
  return /^\d{4}$/.test(otp);
}

/**
 * Mask email for display (e.g., ra****@gmail.com)
 */
export function maskEmail(email: string): string {
  const [username, domain] = email.split('@');
  if (!username || !domain) return email;

  if (username.length <= 2) {
    return `${username}****@${domain}`;
  }

  const visibleChars = 2;
  const maskedUsername = username.slice(0, visibleChars) + '****';
  return `${maskedUsername}@${domain}`;
}

/**
 * Get OTP expiry time in minutes
 */
export function getOtpExpiryMinutes(): number {
  return OTP_EXPIRY_MINUTES;
}

/**
 * Get max OTP attempts
 */
export function getMaxOtpAttempts(): number {
  return OTP_MAX_ATTEMPTS;
}
