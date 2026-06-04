'use client';

import React from 'react';
import { Box, Container, Flex } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { keyframes } from '@emotion/react';

const gradientAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <Flex
      minH="100vh"
      align="center"
      justify="center"
      bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      bgSize="200% 200%"
      animation={`${gradientAnimation} 15s ease infinite`}
      px={{ base: 4, sm: 6, md: 8 }}
      py={{ base: 8, md: 12 }}
    >
      <Container
        maxW="md"
        w="full"
        p={0}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {children}
        </motion.div>
      </Container>
    </Flex>
  );
}
