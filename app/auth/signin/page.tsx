'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  Icon,
  useColorModeValue,
  FormControl,
  FormLabel,
  Input,
  Divider,
  useToast,
  Alert,
  AlertIcon,
  AlertDescription,
} from '@chakra-ui/react';
import { FaGoogle, FaEnvelope } from 'react-icons/fa';

export default function SignInPage() {
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const toast = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/dashboard' });
  };

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast({
          title: 'Sign in failed',
          description: 'Invalid email or password. Try demo123',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } else if (result?.ok) {
        window.location.href = '/dashboard';
      }
    } catch (error) {
      toast({
        title: 'Sign in failed',
        description: 'An error occurred. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg={bgColor} display="flex" alignItems="center" justifyContent="center">
      <Container maxW="md">
        <Box bg={cardBg} p={8} borderRadius="lg" boxShadow="xl">
          <VStack spacing={6} align="stretch">
            <VStack spacing={2}>
              <Heading size="xl" color="brand.500" textAlign="center">
                E2W LMS
              </Heading>
              <Heading size="md" fontWeight="normal" textAlign="center">
                Lead Management System
              </Heading>
            </VStack>

            {/* Development Login Alert */}
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <AlertDescription fontSize="sm">
                <strong>Dev Mode:</strong> Use any seeded email with password: <strong>demo123</strong>
              </AlertDescription>
            </Alert>

            {/* Email/Password Login Form */}
            <form onSubmit={handleCredentialsSignIn}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    size="lg"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Password</FormLabel>
                  <Input
                    type="password"
                    placeholder="demo123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    size="lg"
                  />
                </FormControl>

                <Button
                  leftIcon={<Icon as={FaEnvelope} />}
                  colorScheme="brand"
                  size="lg"
                  type="submit"
                  w="full"
                  isLoading={isLoading}
                >
                  Sign in with Email
                </Button>
              </VStack>
            </form>

            <Box position="relative">
              <Divider />
              <Text
                position="absolute"
                top="50%"
                left="50%"
                transform="translate(-50%, -50%)"
                bg={cardBg}
                px={3}
                fontSize="sm"
                color="gray.500"
              >
                OR
              </Text>
            </Box>

            {/* Google Sign In */}
            <Button
              leftIcon={<Icon as={FaGoogle} />}
              variant="outline"
              size="lg"
              onClick={handleGoogleSignIn}
              w="full"
            >
              Sign in with Google
            </Button>

            {/* Available Test Accounts */}
            <Box bg="gray.50" p={4} borderRadius="md" fontSize="sm">
              <Text fontWeight="bold" mb={2}>Test Accounts (Password: demo123):</Text>
              <VStack align="start" spacing={1} fontSize="xs">
                <Text>• admin@example.com (SuperAgent)</Text>
                <Text>• agent1@example.com (Agent)</Text>
                <Text>• agent2@example.com (Agent)</Text>
                <Text>• agent3@example.com (Agent)</Text>
              </VStack>
            </Box>
          </VStack>
        </Box>
      </Container>
    </Box>
  );
}
