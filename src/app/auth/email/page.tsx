'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  FormControl,
  FormErrorMessage,
  Input,
  InputGroup,
  InputLeftElement,
  Icon,
  IconButton,
  useToast,
  Spinner,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { MdEmail, MdArrowBack } from 'react-icons/md';
import { AuthLayout } from '@/shared/components/auth/AuthLayout';
import { useAuth } from '@/shared/lib/auth/auth-context';

const MotionVStack = motion(VStack);
const MotionBox = motion(Box);

export default function EmailPage() {
  const router = useRouter();
  const toast = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleSendOtp = async () => {
    // Validate email
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      toast({
        title: 'Code Sent!',
        description: 'Check your email for the verification code',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Navigate to verification page
      router.push(`/auth/verify?email=${encodeURIComponent(email)}&otpRequestId=${data.otpRequestId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send verification code';
      
      setError(errorMessage);
      
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSendOtp();
    }
  };

  if (authLoading) {
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
              onClick={() => router.push('/auth/welcome')}
              size="md"
              _hover={{ bg: 'gray.100' }}
            />
          </Box>

          {/* Header */}
          <VStack spacing={2} align="start">
            <Heading size="xl" color="gray.800">
              Enter your email
            </Heading>
            <Text fontSize="md" color="gray.600">
              We'll send you a code to verify your identity
            </Text>
          </VStack>

          {/* Email Input */}
          <FormControl isInvalid={!!error}>
            <InputGroup size="lg">
              <InputLeftElement pointerEvents="none">
                <Icon as={MdEmail} color="gray.400" />
              </InputLeftElement>
              <Input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={handleEmailChange}
                onKeyPress={handleKeyPress}
                autoFocus
                fontSize="md"
                borderRadius="lg"
                borderWidth="2px"
                _hover={{
                  borderColor: 'purple.300',
                }}
                _focus={{
                  borderColor: 'purple.500',
                  boxShadow: '0 0 0 1px var(--chakra-colors-purple-500)',
                }}
              />
            </InputGroup>
            {error && <FormErrorMessage>{error}</FormErrorMessage>}
          </FormControl>

          {/* Send OTP Button */}
          <MotionBox
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button
              size="lg"
              w="full"
              bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              color="white"
              onClick={handleSendOtp}
              isLoading={isLoading}
              loadingText="Sending..."
              isDisabled={!email || isLoading}
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow: 'xl',
              }}
              _active={{
                transform: 'translateY(0)',
              }}
              _disabled={{
                opacity: 0.6,
                cursor: 'not-allowed',
                transform: 'none',
              }}
              transition="all 0.2s"
              fontSize="md"
              fontWeight="semibold"
              py={7}
              borderRadius="xl"
            >
              {isLoading ? <Spinner size="sm" /> : 'Send Verification Code'}
            </Button>
          </MotionBox>

          {/* Info Text */}
          <Text fontSize="sm" color="gray.500" textAlign="center">
            Make sure to check your spam folder if you don't see the email
          </Text>
        </MotionVStack>
      </Box>
    </AuthLayout>
  );
}
