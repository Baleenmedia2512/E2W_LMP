'use client';

import React, { useState, useEffect } from 'react';
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
  VStack,
  Text,
  Spinner,
  IconButton,
  Card,
  CardBody,
  useDisclosure,
  Select,
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';
import { CallLog } from '@/types';
import { HiViewGrid, HiViewList, HiEye } from 'react-icons/hi';
import { format } from 'date-fns';
import CallAttemptsModal from '@/components/CallAttemptsModal';

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
    role?: {
      name: string;
    };
  };
  totalAttempts?: number;
}

export default function CallsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<'table' | 'tiles'>('table');
  const [selectedLead, setSelectedLead] = useState<{ id: string; name: string } | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  
  // Handle filter from query params (from dashboard clicks)
  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter === 'callsToday') {
      setDateFilter('today');
    }
  }, [searchParams]);
  
  // Build query string
  const buildQueryString = () => {
    const params = new URLSearchParams();
    params.append('groupByLead', 'true');
    
    if (dateFilter !== 'all') {
      params.append('dateFilter', dateFilter);
    }
    
    return params.toString() ? `?${params.toString()}` : '?groupByLead=true';
  };
  
  const { data: response, isLoading, error } = useSWR<{ data: CallLogWithDetails[] }>(
    `/api/calls${buildQueryString()}`,
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
      <HStack justify="space-between" mb={6} flexWrap="wrap">
        <Heading size="lg">
          Call Logs
          {dateFilter === 'today' && (
            <Badge ml={2} colorScheme="blue" fontSize="sm">
              Today
            </Badge>
          )}
        </Heading>
        <HStack spacing={2} flexWrap="wrap">
          <Select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month');
              if (e.target.value === 'all') {
                router.push('/dashboard/calls');
              }
            }}
            maxW="200px"
            size="sm"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </Select>
          <IconButton
            aria-label="Table view"
            icon={<HiViewList />}
            size="sm"
            colorScheme={viewMode === 'table' ? 'blue' : 'gray'}
            variant={viewMode === 'table' ? 'solid' : 'ghost'}
            onClick={() => setViewMode('table')}
          />
          <IconButton
            aria-label="Tiles view"
            icon={<HiViewGrid />}
            size="sm"
            colorScheme={viewMode === 'tiles' ? 'blue' : 'gray'}
            variant={viewMode === 'tiles' ? 'solid' : 'ghost'}
            onClick={() => setViewMode('tiles')}
          />
        </HStack>
      </HStack>

      {viewMode === 'table' ? (
        <Box bg="white" borderRadius="lg" boxShadow="sm" overflow="hidden">
          <Table variant="simple">
          <Thead bg="gray.50">
            <Tr>
              <Th>Lead Name</Th>
              <Th>Phone</Th>
              <Th>Last Called By</Th>
              <Th>Last Call Date</Th>
              <Th>Total Attempts</Th>
              <Th>Last Status</Th>
              <Th>Actions</Th>
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
                  <Td>
                    <Text fontSize="sm" fontWeight="medium">
                      {call.caller?.name || call.caller?.email || 'N/A'}
                    </Text>
                    {call.caller?.role?.name && (
                      <Text fontSize="xs" color="gray.600">
                        {call.caller.role.name}
                      </Text>
                    )}
                  </Td>
                  <Td fontSize="sm">
                    {format(new Date(call.startedAt), 'MMM dd, yyyy')}
                    <br />
                    <Text as="span" color="gray.600" fontSize="xs">
                      {format(new Date(call.startedAt), 'HH:mm')}
                    </Text>
                  </Td>
                  <Td>
                    <Badge colorScheme="purple" fontSize="md">
                      {call.totalAttempts || 1}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge colorScheme={getStatusColor(call.callStatus)}>
                      {call.callStatus?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                    </Badge>
                  </Td>
                  <Td>
                    <Button
                      size="sm"
                      leftIcon={<HiEye />}
                      colorScheme="blue"
                      variant="outline"
                      onClick={() => {
                        setSelectedLead({ id: call.lead.id, name: call.lead.name });
                        onOpen();
                      }}
                    >
                      View Attempts
                    </Button>
                  </Td>
                </Tr>
              ))
            ) : (
              <Tr>
                <Td colSpan={7} textAlign="center" py={8}>
                  <Text color="gray.500">No call logs found</Text>
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Box>
      ) : (
        <Box>
          {calls && calls.length > 0 ? (
            <Box
              display="grid"
              gridTemplateColumns={{ base: '1fr', md: '1fr 1fr', lg: 'repeat(3, 1fr)' }}
              gap={4}
            >
              {calls.map((call) => (
                <Card
                  key={call.id}
                  _hover={{ boxShadow: 'md', transform: 'translateY(-2px)' }}
                  transition="all 0.2s"
                >
                  <CardBody>
                    <VStack align="stretch" spacing={3}>
                      <HStack justify="space-between">
                        <Text
                          fontWeight="bold"
                          fontSize="lg"
                          color="blue.600"
                          cursor="pointer"
                          onClick={() => router.push(`/dashboard/leads/${call.lead.id}`)}
                        >
                          {call.lead?.name || 'N/A'}
                        </Text>
                        <Badge colorScheme="purple" fontSize="sm">
                          {call.totalAttempts || 1} {call.totalAttempts === 1 ? 'Attempt' : 'Attempts'}
                        </Badge>
                      </HStack>
                      
                      <VStack align="stretch" spacing={2}>
                        <HStack>
                          <Text fontSize="sm" fontWeight="semibold" color="gray.600" minW="100px">
                            Phone:
                          </Text>
                          <Text fontSize="sm">{call.lead?.phone || '-'}</Text>
                        </HStack>
                        
                        <HStack>
                          <Text fontSize="sm" fontWeight="semibold" color="gray.600" minW="100px">
                            Last Called By:
                          </Text>
                          <VStack align="start" spacing={0}>
                            <Text fontSize="sm">{call.caller?.name || call.caller?.email || 'N/A'}</Text>
                            {call.caller?.role?.name && (
                              <Text fontSize="xs" color="gray.600">{call.caller.role.name}</Text>
                            )}
                          </VStack>
                        </HStack>
                        
                        <HStack>
                          <Text fontSize="sm" fontWeight="semibold" color="gray.600" minW="100px">
                            Last Call:
                          </Text>
                          <Text fontSize="sm">
                            {format(new Date(call.startedAt), 'MMM dd, yyyy HH:mm')}
                          </Text>
                        </HStack>
                        
                        <HStack>
                          <Text fontSize="sm" fontWeight="semibold" color="gray.600" minW="100px">
                            Last Status:
                          </Text>
                          <Badge colorScheme={getStatusColor(call.callStatus)}>
                            {call.callStatus?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                          </Badge>
                        </HStack>
                        
                        <Button
                          size="sm"
                          leftIcon={<HiEye />}
                          colorScheme="blue"
                          width="full"
                          mt={2}
                          onClick={() => {
                            setSelectedLead({ id: call.lead.id, name: call.lead.name });
                            onOpen();
                          }}
                        >
                          View All Attempts
                        </Button>
                      </VStack>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </Box>
          ) : (
            <Box bg="white" borderRadius="lg" boxShadow="sm" p={8} textAlign="center">
              <Text color="gray.500">No call logs found</Text>
            </Box>
          )}
        </Box>
      )}

      {/* Call Attempts Modal */}
      {selectedLead && (
        <CallAttemptsModal
          isOpen={isOpen}
          onClose={onClose}
          leadId={selectedLead.id}
          leadName={selectedLead.name}
        />
      )}
    </Box>
  );
}
