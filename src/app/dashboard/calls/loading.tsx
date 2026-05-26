'use client';

import { Box, Skeleton, Stack, HStack } from '@chakra-ui/react';
import { FilterBarSkeleton } from '@/shared/components/SkeletonLoaders';

export default function CallsLoading() {
  return (
    <Box>
      {/* Page heading */}
      <HStack justify="space-between" mb={6}>
        <Skeleton height="36px" width="160px" />
        <Skeleton height="36px" width="120px" />
      </HStack>

      {/* Filters */}
      <FilterBarSkeleton />

      {/* Table rows */}
      <Stack spacing={3} mt={4}>
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} height="64px" borderRadius="md" />
        ))}
      </Stack>
    </Box>
  );
}
