'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  useToast,
  Center,
  VStack,
  HStack,
  Icon,
  Spinner,
  Divider,
} from '@chakra-ui/react';
import { useAuth } from '@/shared/lib/auth/auth-context';
import { MdEmail, MdLock, MdLogin } from 'react-icons/md';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const { login } = useAuth();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(email, password);

      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
        status: 'success',
        duration: 3,
        isClosable: true,
      });

      // Navigate immediately after successful login
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      toast({
        title: 'Login Failed',
        description: errorMessage,
        status: 'error',
        duration: 5,
        isClosable: true,
      });
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (testEmail: string, testPassword: string) => {
    setEmail(testEmail);
    setPassword(testPassword);
    setIsLoading(true);

    try {
      const result = await login(testEmail, testPassword);
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
        status: 'success',
        duration: 3,
        isClosable: true,
      });

      // Navigate immediately after successful login
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      toast({
        title: 'Login Failed',
        description: errorMessage,
        status: 'error',
        duration: 5,
        isClosable: true,
      });
      setIsLoading(false);
    }
  };

  return (
    <Center minH="100vh" bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
      <Container maxW="md" py={12}>
        <VStack spacing={8}>
          {/* Header */}
          <VStack spacing={2} textAlign="center" color="white">
            <Heading size="2xl" fontWeight="bold">
              E2W LMS
            </Heading>
            <Text fontSize="lg" opacity={0.9}>
              Lead Management System
            </Text>
          </VStack>

          {/* Login Card */}
          <Box
            w="full"
            bg="white"
            rounded="lg"
            shadow="xl"
            p={8}
            boxShadow="0 20px 25px -5rgba(0, 0, 0, 0.1)"
          >
            <VStack spacing={6} as="form" onSubmit={handleSubmit}>
              <VStack spacing={1} w="full" textAlign="center">
                <Heading size="lg" color="gray.800">
                  Sign In
                </Heading>
                <Text color="gray.600" fontSize="sm">
                  Enter your credentials to access the system
                </Text>
              </VStack>

              {/* Email Field */}
              <FormControl isInvalid={!!errors.email} w="full">
                <FormLabel fontWeight="600" color="gray.700">
                  <HStack spacing={2}>
                    <Icon as={MdEmail} />
                    <Text>Email Address</Text>
                  </HStack>
                </FormLabel>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) {
                      setErrors({ ...errors, email: '' });
                    }
                  }}
                  size="lg"
                  borderColor="gray.300"
                  _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 1px #667eea' }}
                  isDisabled={isLoading}
                />
                <FormErrorMessage>{errors.email}</FormErrorMessage>
              </FormControl>

              {/* Password Field */}
              <FormControl isInvalid={!!errors.password} w="full">
                <FormLabel fontWeight="600" color="gray.700">
                  <HStack spacing={2}>
                    <Icon as={MdLock} />
                    <Text>Password</Text>
                  </HStack>
                </FormLabel>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) {
                      setErrors({ ...errors, password: '' });
                    }
                  }}
                  size="lg"
                  borderColor="gray.300"
                  _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 1px #667eea' }}
                  isDisabled={isLoading}
                />
                <FormErrorMessage>{errors.password}</FormErrorMessage>
              </FormControl>

              {/* Login Button */}
              <Button
                type="submit"
                w="full"
                bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                color="white"
                size="lg"
                fontWeight="bold"
                isLoading={isLoading}
                loadingText="Signing in..."
                _hover={{ opacity: 0.9 }}
                leftIcon={<MdLogin />}
              >
                Sign In
              </Button>

              {/* Divider */}
              <HStack w="full" spacing={4}>
                <Divider flex={1} />
                <Text fontSize="sm" color="gray.500" whiteSpace="nowrap">
                  Test Accounts
                </Text>
                <Divider flex={1} />
              </HStack>

              {/* Quick Login Options */}
              <VStack w="full" spacing={2}>
                <Button
                  w="full"
                  variant="outline"
                  size="sm"
                  isDisabled={isLoading}
                  onClick={() => handleQuickLogin('gomathi@baleenmedia.com', 'Admin@123')}
                >
                  Sales Agent
                </Button>
                <Button
                  w="full"
                  variant="outline"
                  size="sm"
                  isDisabled={isLoading}
                  onClick={() => handleQuickLogin('Leenahgrace@baleenmedia.com', 'Admin@123')}
                >
                  Team Lead
                </Button>
                <Button
                  w="full"
                  variant="outline"
                  size="sm"
                  isDisabled={isLoading}
                  onClick={() => handleQuickLogin('contact@baleenmdia.com', 'Admin@123')}
                >
                  Super Agent
                </Button>
              </VStack>

              {/* Info Box */}
              <Box
                w="full"
                bg="blue.50"
                border="1px"
                borderColor="blue.200"
                rounded="md"
                p={3}
              >
                <VStack align="start" spacing={1}>
                  <Text fontSize="xs" fontWeight="bold" color="blue.700">
                    Default Password
                  </Text>
                  <Text fontSize="xs" color="blue.600">
                    <code>Admin@123</code>
                  </Text>
                </VStack>
              </Box>
            </VStack>
          </Box>

          {/* Footer */}
          <VStack spacing={1} textAlign="center" color="white">
            <Text fontSize="sm" opacity={0.8}>
              © 2025 E2W Lead Management System. All rights reserved.
            </Text>
          </VStack>
        </VStack>
      </Container>
    </Center>
  );
}
