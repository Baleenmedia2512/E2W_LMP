'use client';

import { Box, VStack, Heading, Text, Button, Icon } from '@chakra-ui/react';
import { ReactElement } from 'react';

interface EmptyStateProps {
  icon: ReactElement;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Box
      py={16}
      px={6}
      textAlign="center"
      bg="gray.50"
      borderRadius="lg"
      border="2px dashed"
      borderColor="gray.200"
    >
      <VStack spacing={4}>
        <Box fontSize="4xl" color="gray.400">
          {icon}
        </Box>
        <Heading size="md" color="gray.700">
          {title}
        </Heading>
        <Text color="gray.500" maxW="md">
          {description}
        </Text>
        {actionLabel && onAction && (
          <Button colorScheme="brand" onClick={onAction} mt={4}>
            {actionLabel}
          </Button>
        )}
      </VStack>
    </Box>
  );
}
