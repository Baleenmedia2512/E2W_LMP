'use client';

import { Box, Skeleton, Stack, HStack } from '@chakra-ui/react';

export default function QuotationsLoading() {
  return (
    <Box>
      {/* Page heading */}
      <HStack justify="space-between" mb={6}>
        <Skeleton height="36px" width="180px" />
        <Skeleton height="36px" width="150px" />
      </HStack>

      {/* Tab bar */}
      <HStack spacing={2} mb={4}>
        <Skeleton height="40px" width="120px" borderRadius="md" />
        <Skeleton height="40px" width="120px" borderRadius="md" />
      </HStack>

      {/* Table rows */}
      <Stack spacing={3}>
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} height="64px" borderRadius="md" />
        ))}
      </Stack>
    </Box>
  );
}
