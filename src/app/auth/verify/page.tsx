'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  IconButton,
  useToast,
  HStack,
  Spinner,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { MdArrowBack } from 'react-icons/md';
import { AuthLayout } from '@/shared/components/auth/AuthLayout';
import { OtpInput } from '@/shared/components/auth/OtpInput';
import { OtpTimer } from '@/shared/components/auth/OtpTimer';
import { useAuth } from '@/shared/lib/auth/auth-context';
import { maskEmail } from '@/shared/lib/auth/otp-utils';

const MotionVStack = motion.div;
const MotionBox = motion.div;

function VerifyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { login, isAuthenticated, isLoading: authLoading, setUser, setToken } = useAuth();

  const email = searchParams.get('email') || '';
  const otpRequestId = searchParams.get('otpRequestId') || '';

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [helperMessage, setHelperMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);

  useEffect(() => {
    if (!email) {
      router.push('/auth/email');
    }
  }, [email, router]);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleOtpComplete = useCallback(async (otpValue: string) => {
    // Prevent multiple submissions
    if (isVerifying || isAuthenticated) {
      return;
    }

    setError('');
    setIsVerifying(true);

    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          otp: otpValue,
          otpRequestId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Update attempts remaining if provided in error response
        if (data.attemptsRemaining !== undefined) {
          setAttemptsRemaining(data.attemptsRemaining);
        }
        
        // Check if blocked and show helper message
        if (data.blocked && data.message) {
          setHelperMessage(data.message);
          setCanResend(true); // Enable resend immediately when blocked
        }
        
        throw new Error(data.error || 'Invalid verification code');
      }

      // Clear OTP immediately after success
      setOtp('');

      // Store authentication data
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authUser', JSON.stringify(data.user));

      // Update auth context state
      setToken(data.token);
      setUser(data.user);

      toast({
        title: 'Login Successful!',
        description: 'Welcome back to E2W LMS',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Verification failed';
      
      setError(errorMessage);
      setOtp('');
      
      toast({
        title: 'Verification Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      
      setIsVerifying(false);
    }
  }, [isVerifying, isAuthenticated, email, otpRequestId, setToken, setUser, toast, router]);

  const handleResendOtp = async () => {
    setIsResending(true);
    setError('');
    setHelperMessage('');

    try {
      const response = await fetch('/api/auth/otp/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code');
      }

      toast({
        title: 'Code Resent!',
        description: 'A new verification code has been sent to your email',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      setCanResend(false);
      setAttemptsRemaining(5);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resend code';
      
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsResending(false);
    }
  };

  if (authLoading) {
    return null;
  }

  if (!email) {
    return null;
  }

  return (
    <AuthLayout>
      <Box
        bg="white"
        borderRadius="2xl"
        boxShadow="2xl"
        p={{ base: 8, md: 12 }}
        w="full"
      >
        <MotionVStack
          spacing={6}
          align="stretch"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Back Button */}
          <Box>
            <IconButton
              aria-label="Go back"
              icon={<MdArrowBack />}
              variant="ghost"
              onClick={() => router.push('/auth/email')}
              size="md"
              _hover={{ bg: 'gray.100' }}
              isDisabled={isVerifying}
            />
          </Box>

          {/* Header */}
          <VStack spacing={2} align="center" textAlign="center">
            <Heading size="xl" color="gray.800">
              Enter verification code
            </Heading>
            <Text fontSize="md" color="gray.600">
              We sent a code to{' '}
              <Text as="span" fontWeight="semibold" color="purple.600">
                {maskEmail(email)}
              </Text>
            </Text>
          </VStack>

          {/* Error Alert */}
          {error && (
            <VStack spacing={2} width="100%">
              <Alert status="error" borderRadius="lg">
                <AlertIcon />
                <Text fontSize="sm">{error}</Text>
              </Alert>
              
              {helperMessage && (
                <Alert status="info" borderRadius="lg">
                  <AlertIcon />
                  <Text fontSize="sm">{helperMessage}</Text>
                </Alert>
              )}
            </VStack>
          )}

          {/* OTP Input */}
          <VStack spacing={4} py={4}>
            <OtpInput
              length={4}
              value={otp}
              onChange={setOtp}
              onComplete={handleOtpComplete}
              onClear={() => {
                setError('');
                setHelperMessage('');
              }}
              isDisabled={isVerifying}
              hasError={!!error}
            />
            
            {isVerifying && (
              <HStack spacing={2}>
                <Spinner size="sm" color="purple.500" />
                <Text fontSize="sm" color="gray.600">
                  Verifying...
                </Text>
              </HStack>
            )}
          </VStack>

          {/* Resend Section */}
          <VStack spacing={3}>
            <HStack spacing={2} fontSize="sm" color="gray.600">
              <Text>Didn't receive the code?</Text>
              {!canResend && <OtpTimer initialSeconds={60} onComplete={() => setCanResend(true)} />}
            </HStack>

            <Button
              variant="link"
              colorScheme="purple"
              onClick={handleResendOtp}
              isLoading={isResending}
              isDisabled={!canResend || isResending || isVerifying}
              fontSize="sm"
              fontWeight="semibold"
            >
              {isResending ? 'Resending...' : 'Resend Code'}
            </Button>
          </VStack>

          {/* Info Text */}
          <Text fontSize="xs" color="gray.500" textAlign="center">
            The code expires in 5 minutes. You have {attemptsRemaining} attempts remaining.
          </Text>
        </MotionVStack>
      </Box>
    </AuthLayout>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <AuthLayout>
        <Box bg="white" borderRadius="2xl" boxShadow="2xl" p={12} textAlign="center">
          <Spinner size="xl" color="purple.500" />
        </Box>
      </AuthLayout>
    }>
      <VerifyPageContent />
    </Suspense>
  );
}
