'use client';

import { Box, SimpleGrid, Skeleton, HStack, Stack } from '@chakra-ui/react';
import {
  LeadCardGridSkeleton,
  FilterBarSkeleton,
  SectionHeaderSkeleton,
} from '@/shared/components/SkeletonLoaders';

export default function LeadsLoading() {
  return (
    <Box>
      <SectionHeaderSkeleton />

      {/* Tab bar */}
      <HStack spacing={2} mb={4}>
        <Skeleton height="40px" width="130px" borderRadius="md" />
        <Skeleton height="40px" width="160px" borderRadius="md" />
      </HStack>

      {/* Filters */}
      <FilterBarSkeleton />

      {/* Lead cards */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4} mt={4}>
        <LeadCardGridSkeleton count={6} />
      </SimpleGrid>
    </Box>
  );
}
