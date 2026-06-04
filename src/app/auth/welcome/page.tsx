'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, VStack, Heading, Text, Button, Icon } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { MdEmail } from 'react-icons/md';
import { AuthLayout } from '@/shared/components/auth/AuthLayout';
import { useAuth } from '@/shared/lib/auth/auth-context';

const MotionVStack = motion(VStack);
const MotionBox = motion(Box);

export default function WelcomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return null;
  }

  const handleContinue = () => {
    router.push('/auth/email');
  };

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
          align="center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, staggerChildren: 0.2 }}
        >
          {/* Logo/Icon */}
          <MotionBox
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Box
              bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              borderRadius="full"
              p={6}
              boxShadow="lg"
            >
              <Icon as={MdEmail} w={12} h={12} color="white" />
            </Box>
          </MotionBox>

          {/* Heading */}
          <MotionVStack
            spacing={2}
            textAlign="center"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Heading
              size="2xl"
              bgGradient="linear(to-r, #667eea, #764ba2)"
              bgClip="text"
              fontWeight="bold"
            >
              Welcome Back
            </Heading>
            <Text fontSize="lg" color="gray.600" maxW="sm">
              Manage your leads smarter and faster with E2W LMS
            </Text>
          </MotionVStack>

          {/* CTA Button */}
          <MotionBox
            w="full"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Button
              size="lg"
              w="full"
              bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              color="white"
              rightIcon={<Icon as={MdEmail} />}
              onClick={handleContinue}
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow: 'xl',
              }}
              _active={{
                transform: 'translateY(0)',
              }}
              transition="all 0.2s"
              fontSize="md"
              fontWeight="semibold"
              py={7}
              borderRadius="xl"
            >
              Continue with Email
            </Button>
          </MotionBox>

          {/* Footer Text */}
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <Text fontSize="sm" color="gray.500" textAlign="center">
              Secure authentication powered by OTP
            </Text>
          </MotionBox>
        </MotionVStack>
      </Box>
    </AuthLayout>
  );
}
