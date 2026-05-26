'use client';

import { Box, Skeleton, Stack, HStack, SimpleGrid } from '@chakra-ui/react';
import { DashboardStatSkeleton, FilterBarSkeleton } from '@/shared/components/SkeletonLoaders';

export default function DSRLoading() {
  return (
    <Box>
      {/* Page heading */}
      <HStack justify="space-between" mb={6}>
        <Skeleton height="36px" width="200px" />
        <Skeleton height="36px" width="120px" />
      </HStack>

      {/* Summary stats */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
        {[...Array(4)].map((_, i) => (
          <DashboardStatSkeleton key={i} />
        ))}
      </SimpleGrid>

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
