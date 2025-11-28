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
import { useState, useEffect } from 'react';

interface ReportsData {
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  qualifiedLeads: number;
  wonDeals: number;
  lostDeals: number;
  conversionRate: number;
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const [leadsRes, followUpsRes] = await Promise.all([
          fetch('/api/leads?limit=100'),
          fetch('/api/followups?limit=100'),
        ]);
        
        const leadsData = await leadsRes.json();
        const followUpsData = await followUpsRes.json();
        
        if (leadsData.success && followUpsData.success) {
          const leads = leadsData.data;
          const stats = {
            totalLeads: leads.length,
            newLeads: leads.filter(l => l.status === 'new').length,
            contactedLeads: leads.filter(l => l.status === 'contacted').length,
            qualifiedLeads: leads.filter(l => l.status === 'qualified').length,
            wonDeals: leads.filter(l => l.status === 'won').length,
            lostDeals: leads.filter(l => l.status === 'lost').length,
            conversionRate: leads.length > 0 ? Math.round((leads.filter(l => l.status === 'won').length / leads.length) * 100) : 0,
          };
          setData(stats);
        } else {
          setError('Failed to fetch reports');
        }
      } catch (err) {
        setError('Failed to fetch reports');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (loading) {
    return (
      <Box>
        <Heading size="lg" mb={6}>Reports & Analytics</Heading>
        <Text color="gray.500">Loading reports...</Text>
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box>
        <Heading size="lg" mb={6}>Reports & Analytics</Heading>
        <Box bg="red.50" p={4} borderRadius="lg" color="red.700">
          {error || 'Failed to load reports'}
        </Box>
      </Box>
    );
  }

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
              <StatNumber>{data.totalLeads}</StatNumber>
              <StatHelpText>All time</StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Conversion Rate</StatLabel>
              <StatNumber>{data.conversionRate}%</StatNumber>
              <StatHelpText>Last 30 days</StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Revenue</StatLabel>
              <StatNumber>-</StatNumber>
              <StatHelpText>All time</StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Avg Call Duration</StatLabel>
              <StatNumber>-</StatNumber>
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
              <StatNumber fontSize="2xl">{data.newLeads}</StatNumber>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel fontSize="sm">Qualified</StatLabel>
              <StatNumber fontSize="2xl">{data.qualifiedLeads}</StatNumber>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel fontSize="sm">Won Deals</StatLabel>
              <StatNumber fontSize="2xl" color="green.500">{data.wonDeals}</StatNumber>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel fontSize="sm">Lost Deals</StatLabel>
              <StatNumber fontSize="2xl" color="red.500">{data.lostDeals}</StatNumber>
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
            <Text fontSize="sm" color="gray.500">Coming soon...</Text>
          </CardBody>
        </Card>

        {/* Leads by Agent */}
        <Card>
          <CardHeader>
            <Heading size="md">Leads by Agent</Heading>
          </CardHeader>
          <CardBody>
            <Text fontSize="sm" color="gray.500">Coming soon...</Text>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Leads by Status */}
      <Card>
        <CardHeader>
          <Heading size="md">Leads by Status</Heading>
        </CardHeader>
        <CardBody>
          <Text fontSize="sm" color="gray.500">Status breakdown coming soon...</Text>
        </CardBody>
      </Card>
    </Box>
  );
}





