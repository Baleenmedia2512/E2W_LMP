'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Spinner, Text, VStack } from '@chakra-ui/react';

export default function LeadOutcomesRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the unified leads page with outcomes tab
    // Using hash to indicate tab, or you could use query params
    router.push('/dashboard/leads?tab=outcomes');
  }, [router]);

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minH="400px">
      <VStack spacing={4}>
        <Spinner size="lg" color="blue.500" />
        <Text color="gray.600">Redirecting to Lead Outcomes...</Text>
      </VStack>
    </Box>
  );
}
