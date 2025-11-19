'use client';

import React from 'react';
import {
  Box,
  Button,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  HStack,
  Text,
  Spinner,
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';
import { CallLog } from '@/types';

interface CallLogWithDetails extends CallLog {
  lead: {
    id: string;
    name: string;
    phone: string;
    status: string;
  };
  caller: {
    id: string;
    name: string | null;
    email: string;
  };
}

export default function CallsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  const { data: response, isLoading, error } = useSWR<{ data: CallLogWithDetails[] }>(
    '/api/calls',
    fetcher
  );
  
  const calls = response?.data || [];

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="400px">
        <Spinner size="xl" color="brand.500" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={8}>
        <Text color="red.500">Error loading calls: {error.message}</Text>
      </Box>
    );
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'answered':
        return 'green';
      case 'not_answered':
        return 'red';
      case 'busy':
        return 'orange';
      case 'invalid':
        return 'gray';
      default:
        return 'blue';
    }
  };

  return (
    <Box>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">Call Logs</Heading>
      </HStack>

      <Box bg="white" borderRadius="lg" boxShadow="sm" overflow="hidden">
        <Table variant="simple">
          <Thead bg="gray.50">
            <Tr>
              <Th>Lead Name</Th>
              <Th>Phone</Th>
              <Th>Caller</Th>
              <Th>Started At</Th>
              <Th>Duration</Th>
              <Th>Attempt #</Th>
              <Th>Call Status</Th>
              <Th>Remarks</Th>
            </Tr>
          </Thead>
          <Tbody>
            {calls && calls.length > 0 ? (
              calls.map((call) => (
                <Tr key={call.id} _hover={{ bg: 'gray.50' }}>
                  <Td
                    fontWeight="medium"
                    color="blue.600"
                    cursor="pointer"
                    onClick={() => router.push(`/dashboard/leads/${call.lead.id}`)}
                  >
                    {call.lead?.name || 'N/A'}
                  </Td>
                  <Td>{call.lead?.phone || '-'}</Td>
                  <Td>{call.caller?.name || call.caller?.email || 'N/A'}</Td>
                  <Td>{new Date(call.startedAt).toLocaleString()}</Td>
                  <Td>
                    {call.duration
                      ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s`
                      : '-'}
                  </Td>
                  <Td>
                    <Badge colorScheme="purple">#{call.attemptNumber}</Badge>
                  </Td>
                  <Td>
                    <Badge colorScheme={getStatusColor(call.callStatus)}>
                      {call.callStatus?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                    </Badge>
                  </Td>
                  <Td maxW="200px" isTruncated>
                    {call.remarks || '-'}
                  </Td>
                </Tr>
              ))
            ) : (
              <Tr>
                <Td colSpan={8} textAlign="center" py={8}>
                  <Text color="gray.500">No call logs found</Text>
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}
