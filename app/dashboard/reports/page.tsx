'use client';

import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  VStack,
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';

export default function ReportsPage() {
  const { data: session } = useSession();

  return (
    <Box>
      <Heading size="lg" mb={6}>
        Reports & Analytics
      </Heading>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6} mb={8}>
        <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
          <Stat>
            <StatLabel>Monthly Performance</StatLabel>
            <StatNumber>Coming Soon</StatNumber>
            <StatHelpText>Track monthly metrics</StatHelpText>
          </Stat>
        </Box>

        <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
          <Stat>
            <StatLabel>Team Analytics</StatLabel>
            <StatNumber>Coming Soon</StatNumber>
            <StatHelpText>Team performance overview</StatHelpText>
          </Stat>
        </Box>

        <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
          <Stat>
            <StatLabel>Conversion Funnel</StatLabel>
            <StatNumber>Coming Soon</StatNumber>
            <StatHelpText>Lead conversion analysis</StatHelpText>
          </Stat>
        </Box>
      </SimpleGrid>

      <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
        <VStack align="start" spacing={4}>
          <Heading size="md">Advanced Reports</Heading>
          <Text color="gray.600">
            This section will include advanced analytics, charts, and custom reports.
          </Text>
          <Text fontSize="sm" color="gray.500">
            Available for: SuperAgent, Finance, HR roles
          </Text>
        </VStack>
      </Box>
    </Box>
  );
}
