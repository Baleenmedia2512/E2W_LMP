'use client';

import { Box, SimpleGrid, Skeleton, HStack } from '@chakra-ui/react';
import { DashboardStatSkeleton } from '@/shared/components/SkeletonLoaders';

export default function DashboardLoading() {
  return (
    <Box>
      {/* Page heading */}
      <HStack justify="space-between" mb={6}>
        <Skeleton height="36px" width="220px" />
        <Skeleton height="36px" width="140px" />
      </HStack>

      {/* Stat cards */}
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={4} mb={6}>
        {[...Array(6)].map((_, i) => (
          <DashboardStatSkeleton key={i} />
        ))}
      </SimpleGrid>

      {/* Recent leads table placeholder */}
      <Skeleton height="300px" borderRadius="lg" />
    </Box>
  );
}
