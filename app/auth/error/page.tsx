'use client';

import { useSearchParams } from 'next/navigation';
import { Box, Container, Heading, Text, Button, VStack } from '@chakra-ui/react';
import Link from 'next/link';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams?.get('error');

  const errorMessages: Record<string, string> = {
    Configuration: 'There is a problem with the server configuration.',
    AccessDenied: 'Access denied. You do not have permission to sign in.',
    Verification: 'The verification token has expired or has already been used.',
    NotRegistered: 'Your email is not registered in our system. Please contact your administrator to request access.',
    AccountInactive: 'Your account has been deactivated. Please contact your administrator for assistance.',
    Default: 'An error occurred during authentication.',
  };

  const errorMessage = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default;

  return (
    <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
      <Container maxW="md">
        <Box bg="white" p={8} borderRadius="lg" boxShadow="xl">
          <VStack spacing={6} align="stretch">
            <Heading size="lg" color="red.500" textAlign="center">
              Authentication Error
            </Heading>

            <Text textAlign="center" color="gray.600">
              {errorMessage}
            </Text>

            <Link href="/auth/signin" passHref>
              <Button colorScheme="brand" w="full">
                Try Again
              </Button>
            </Link>
          </VStack>
        </Box>
      </Container>
    </Box>
  );
}
