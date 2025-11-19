'use client';

import React, { Component, ReactNode } from 'react';
import { Box, Heading, Text, Button, VStack, Container } from '@chakra-ui/react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
    
    // In production, send to error tracking service
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
          <Container maxW="md">
            <Box bg="white" p={8} borderRadius="lg" boxShadow="xl">
              <VStack spacing={6} align="stretch">
                <Heading size="lg" color="red.500" textAlign="center">
                  Oops! Something went wrong
                </Heading>

                <Text textAlign="center" color="gray.600">
                  We're sorry for the inconvenience. The error has been logged and we'll look into
                  it.
                </Text>

                {this.state.error && (
                  <Box
                    bg="gray.100"
                    p={4}
                    borderRadius="md"
                    fontSize="sm"
                    fontFamily="mono"
                    maxH="200px"
                    overflowY="auto"
                  >
                    <Text color="red.600">{this.state.error.toString()}</Text>
                  </Box>
                )}

                <VStack spacing={3}>
                  <Button colorScheme="brand" w="full" onClick={this.handleReset}>
                    Return to Dashboard
                  </Button>
                  <Button variant="ghost" w="full" onClick={() => window.location.reload()}>
                    Reload Page
                  </Button>
                </VStack>
              </VStack>
            </Box>
          </Container>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
