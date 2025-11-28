'use client';

import {
  Box,
  Heading,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Progress,
  VStack,
  HStack,
  Text,
  Badge,
} from '@chakra-ui/react';
import { mockReportsData } from '@/shared/lib/mock-data';

export default function ReportsPage() {
  return (
    <Box>
      <Heading size="lg" mb={6}>
        Reports & Analytics
      </Heading>

      {/* Key Metrics */}
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={4} mb={6}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Leads</StatLabel>
              <StatNumber>{mockReportsData.totalLeads}</StatNumber>
              <StatHelpText>All time</StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Conversion Rate</StatLabel>
              <StatNumber>{mockReportsData.conversionRate}%</StatNumber>
              <StatHelpText>Last 30 days</StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Revenue</StatLabel>
              <StatNumber>${mockReportsData.totalRevenue.toLocaleString()}</StatNumber>
              <StatHelpText>All time</StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Avg Call Duration</StatLabel>
              <StatNumber>{mockReportsData.avgCallDuration}min</StatNumber>
              <StatHelpText>This month</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Secondary Metrics */}
      <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={4} mb={6}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel fontSize="sm">New Leads</StatLabel>
              <StatNumber fontSize="2xl">{mockReportsData.newLeads}</StatNumber>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel fontSize="sm">Qualified</StatLabel>
              <StatNumber fontSize="2xl">{mockReportsData.qualifiedLeads}</StatNumber>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel fontSize="sm">Won Deals</StatLabel>
              <StatNumber fontSize="2xl" color="green.500">{mockReportsData.wonDeals}</StatNumber>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel fontSize="sm">Lost Deals</StatLabel>
              <StatNumber fontSize="2xl" color="red.500">{mockReportsData.lostDeals}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mb={6}>
        {/* Leads by Source */}
        <Card>
          <CardHeader>
            <Heading size="md">Leads by Source</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              {mockReportsData.leadsBySource.map((item) => (
                <Box key={item.source}>
                  <HStack justify="space-between" mb={1}>
                    <Text fontWeight="medium">{item.source}</Text>
                    <Badge>{item.count}</Badge>
                  </HStack>
                  <Progress
                    value={(item.count / mockReportsData.totalLeads) * 100}
                    colorScheme="blue"
                    size="sm"
                    borderRadius="full"
                  />
                </Box>
              ))}
            </VStack>
          </CardBody>
        </Card>

        {/* Leads by Agent */}
        <Card>
          <CardHeader>
            <Heading size="md">Leads by Agent</Heading>
          </CardHeader>
          <CardBody>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Agent</Th>
                  <Th isNumeric>Leads</Th>
                  <Th isNumeric>Share</Th>
                </Tr>
              </Thead>
              <Tbody>
                {mockReportsData.leadsPerAgent.map((item) => (
                  <Tr key={item.agent}>
                    <Td fontWeight="medium">{item.agent}</Td>
                    <Td isNumeric>{item.count}</Td>
                    <Td isNumeric>
                      {((item.count / mockReportsData.totalLeads) * 100).toFixed(1)}%
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Leads by Status */}
      <Card>
        <CardHeader>
          <Heading size="md">Leads by Status</Heading>
        </CardHeader>
        <CardBody>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Status</Th>
                <Th isNumeric>Count</Th>
                <Th>Distribution</Th>
              </Tr>
            </Thead>
            <Tbody>
              {mockReportsData.leadsByStatus.map((item) => (
                <Tr key={item.status}>
                  <Td fontWeight="medium">{item.status}</Td>
                  <Td isNumeric>
                    <Badge>{item.count}</Badge>
                  </Td>
                  <Td>
                    <HStack spacing={2}>
                      <Progress
                        value={(item.count / mockReportsData.totalLeads) * 100}
                        colorScheme="green"
                        size="sm"
                        borderRadius="full"
                        flex="1"
                      />
                      <Text fontSize="sm" minW="45px">
                        {((item.count / mockReportsData.totalLeads) * 100).toFixed(1)}%
                      </Text>
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </CardBody>
      </Card>
    </Box>
  );
}





