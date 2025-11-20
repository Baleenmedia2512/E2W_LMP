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
  useToast,
  Spinner,
  Text,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Input,
  InputGroup,
  InputLeftElement,
  Card,
  CardBody,
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';
import { Lead } from '@/types';
import { HiDotsVertical, HiEye, HiPencil, HiSearch } from 'react-icons/hi';
import { format } from 'date-fns';

interface LeadsData {
  data: Lead[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

interface LeadsResponse {
  success: boolean;
  data: LeadsData;
}

export default function UnreachableLeadsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Build query params - always filter by unreach status
  const buildQueryString = () => {
    const params = new URLSearchParams();
    params.append('status', 'unreach');
    if (debouncedSearchQuery) params.append('search', debouncedSearchQuery);
    return `?${params.toString()}`;
  };

  const { data: response, isLoading, error, mutate } = useSWR<LeadsResponse>(
    `/api/leads${buildQueryString()}`,
    fetcher
  );

  const leads = response?.data?.data || [];

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
        <VStack spacing={4}>
          <Text color="red.500" fontSize="lg" fontWeight="bold">
            Error loading unreachable leads
          </Text>
          <Text color="gray.600">{error?.message || 'Failed to fetch data'}</Text>
          <Button onClick={() => mutate()} colorScheme="blue">
            Retry
          </Button>
        </VStack>
      </Box>
    );
  }

  return (
    <Box>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">Unreachable Leads</Heading>
        <Button colorScheme="blue" onClick={() => router.push('/dashboard/leads')}>
          Back to All Leads
        </Button>
      </HStack>

      {/* Search */}
      <Box bg="white" p={4} borderRadius="lg" boxShadow="sm" mb={4}>
        <HStack spacing={4}>
          <InputGroup maxW="400px">
            <InputLeftElement>
              <HiSearch />
            </InputLeftElement>
            <Input
              placeholder="Search unreachable leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
          {searchQuery && (
            <Button size="sm" variant="ghost" onClick={() => setSearchQuery('')}>
              Clear
            </Button>
          )}
        </HStack>
      </Box>

      {/* Stats */}
      <Box bg="gray.50" p={4} borderRadius="lg" mb={4} borderLeft="4px solid" borderColor="gray.500">
        <Text fontSize="sm" color="gray.800" fontWeight="medium">
          Total Unreachable Leads: <strong>{response?.data?.total || 0}</strong>
        </Text>
      </Box>

      {/* Table */}
      <Card>
        <CardBody>
          {leads.length === 0 ? (
            <VStack py={8}>
              <Text color="gray.500" fontSize="lg">
                No unreachable leads found
              </Text>
              <Text color="gray.400" fontSize="sm">
                {searchQuery ? 'Try adjusting your search' : 'All leads are reachable'}
              </Text>
            </VStack>
          ) : (
            <Box overflowX="auto">
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Phone</Th>
                    <Th>Email</Th>
                    <Th>Source</Th>
                    <Th>Assigned To</Th>
                    <Th>Created</Th>
                    <Th>Notes</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {leads.map((lead) => (
                    <Tr key={lead.id}>
                      <Td fontWeight="medium">{lead.name}</Td>
                      <Td>{lead.phone}</Td>
                      <Td>{lead.email || '-'}</Td>
                      <Td>
                        <Badge colorScheme="purple">{lead.source}</Badge>
                      </Td>
                      <Td>{lead.assignedTo?.name || 'Unassigned'}</Td>
                      <Td fontSize="sm" color="gray.600">
                        {format(new Date(lead.createdAt), 'MMM dd, yyyy')}
                      </Td>
                      <Td maxW="300px" fontSize="sm" color="gray.600" noOfLines={2}>
                        {lead.notes || '-'}
                      </Td>
                      <Td>
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            icon={<HiDotsVertical />}
                            variant="ghost"
                            size="sm"
                          />
                          <MenuList>
                            <MenuItem
                              icon={<HiEye />}
                              onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                            >
                              View Details
                            </MenuItem>
                            <MenuItem
                              icon={<HiPencil />}
                              onClick={() => router.push(`/dashboard/leads/${lead.id}/edit`)}
                            >
                              Edit Lead
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </CardBody>
      </Card>
    </Box>
  );
}
