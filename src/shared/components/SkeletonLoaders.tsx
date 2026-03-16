'use client';

import { Box, Skeleton, Stack, HStack, VStack, Flex } from '@chakra-ui/react';

/**
 * Skeleton loader for lead cards
 * Shows a placeholder while lead data is loading
 */
export const LeadCardSkeleton = () => {
  return (
    <Box
      bg="white"
      p={4}
      borderRadius="lg"
      boxShadow="sm"
      border="1px solid"
      borderColor="gray.200"
    >
      <VStack align="stretch" spacing={3}>
        {/* Header: Name and Status */}
        <HStack justify="space-between">
          <Skeleton height="20px" width="150px" />
          <Skeleton height="24px" width="80px" borderRadius="full" />
        </HStack>

        {/* Phone and WhatsApp */}
        <HStack spacing={3}>
          <Skeleton height="16px" width="120px" />
          <Skeleton height="16px" width="30px" />
        </HStack>

        {/* Location/Source */}
        <Skeleton height="14px" width="200px" />

        {/* Campaign/Source badges */}
        <HStack spacing={2}>
          <Skeleton height="20px" width="70px" borderRadius="full" />
          <Skeleton height="20px" width="90px" borderRadius="full" />
        </HStack>

        {/* Action buttons */}
        <HStack spacing={2} pt={2}>
          <Skeleton height="32px" width="80px" borderRadius="md" />
          <Skeleton height="32px" width="80px" borderRadius="md" />
          <Skeleton height="32px" width="80px" borderRadius="md" />
        </HStack>
      </VStack>
    </Box>
  );
};

/**
 * Skeleton loader for table rows
 * Shows placeholder rows while table data is loading
 */
export const TableRowSkeleton = () => {
  return (
    <tr>
      <td colSpan={100}>
        <Stack spacing={3} py={2}>
          {[...Array(5)].map((_, i) => (
            <HStack key={i} spacing={4} px={4}>
              <Skeleton height="16px" width="40px" />
              <Skeleton height="16px" width="150px" />
              <Skeleton height="16px" width="120px" />
              <Skeleton height="16px" width="100px" />
              <Skeleton height="16px" width="80px" />
              <Skeleton height="16px" flex="1" />
              <Skeleton height="32px" width="200px" />
            </HStack>
          ))}
        </Stack>
      </td>
    </tr>
  );
};

/**
 * Grid of lead card skeletons
 * Used for card view loading state
 */
export const LeadCardGridSkeleton = ({ count = 6 }: { count?: number }) => {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <LeadCardSkeleton key={i} />
      ))}
    </>
  );
};

/**
 * Minimal skeleton for inline loading
 * Used when updating specific sections without hiding content
 */
export const InlineLoadingSkeleton = () => {
  return (
    <Flex justify="center" align="center" py={8}>
      <VStack spacing={3}>
        <Skeleton height="40px" width="40px" borderRadius="full" />
        <Skeleton height="16px" width="120px" />
      </VStack>
    </Flex>
  );
};

/**
 * Section header skeleton
 * Used for loading section headers with counts
 */
export const SectionHeaderSkeleton = () => {
  return (
    <HStack justify="space-between" mb={4}>
      <HStack spacing={3}>
        <Skeleton height="24px" width="180px" />
        <Skeleton height="24px" width="40px" borderRadius="full" />
      </HStack>
      <Skeleton height="32px" width="32px" borderRadius="md" />
    </HStack>
  );
};

/**
 * Dashboard stats skeleton
 * Used for loading dashboard statistics cards
 */
export const DashboardStatSkeleton = () => {
  return (
    <Box
      bg="white"
      p={6}
      borderRadius="lg"
      boxShadow="sm"
      border="1px solid"
      borderColor="gray.200"
    >
      <VStack align="stretch" spacing={3}>
        <Skeleton height="14px" width="100px" />
        <Skeleton height="32px" width="60px" />
        <Skeleton height="12px" width="140px" />
      </VStack>
    </Box>
  );
};

/**
 * Filter bar skeleton
 * Used for loading filter controls
 */
export const FilterBarSkeleton = () => {
  return (
    <HStack spacing={3} flexWrap="wrap">
      <Skeleton height="40px" width="200px" borderRadius="md" />
      <Skeleton height="40px" width="150px" borderRadius="md" />
      <Skeleton height="40px" width="150px" borderRadius="md" />
      <Skeleton height="40px" width="120px" borderRadius="md" />
    </HStack>
  );
};
