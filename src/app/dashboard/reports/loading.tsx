'use client';

import { Box, Skeleton, SimpleGrid, Stack, HStack } from '@chakra-ui/react';
import { DashboardStatSkeleton } from '@/shared/components/SkeletonLoaders';

export default function ReportsLoading() {
  return (
    <Box>
      {/* Page heading */}
      <HStack justify="space-between" mb={6}>
        <Skeleton height="36px" width="240px" />
        <Skeleton height="36px" width="140px" />
      </HStack>

      {/* Date filter card */}
      <Skeleton height="120px" borderRadius="lg" mb={6} />

      {/* Key metrics */}
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={4} mb={6}>
        {[...Array(4)].map((_, i) => (
          <DashboardStatSkeleton key={i} />
        ))}
      </SimpleGrid>

      {/* Charts / tables */}
      <Stack spacing={4}>
        <Skeleton height="220px" borderRadius="lg" />
        <Skeleton height="220px" borderRadius="lg" />
      </Stack>
    </Box>
  );
}
