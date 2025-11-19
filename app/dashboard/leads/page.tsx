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
  Select,
  Input,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';
import { Lead } from '@/types';
import { HiDotsVertical, HiEye, HiPencil, HiPhone, HiClock, HiSearch, HiViewGrid, HiViewList } from 'react-icons/hi';
import { startOfDay, endOfDay } from 'date-fns';

interface LeadsResponse {
  data: Lead[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export default function LeadsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'tiles'>('table');
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  
  // Handle filter from query params (from dashboard clicks)
  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter) {
      switch (filter) {
        case 'newToday':
          setStatusFilter('new');
          break;
        case 'followupsToday':
          // This would need special handling - for now show all with status
          setStatusFilter('');
          break;
        case 'conversionsToday':
          setStatusFilter('converted');
          break;
        case 'assigned':
          // Filter for assigned leads - handled by API
          break;
        case 'unassigned':
          // Filter for unassigned leads - handled by API
          break;
        case 'callsToday':
          // Show leads with calls today
          break;
        default:
          break;
      }
    }
  }, [searchParams]);
  
  // Build query params
  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (statusFilter) params.append('status', statusFilter);
    if (sourceFilter) params.append('source', sourceFilter);
    if (searchQuery) params.append('search', searchQuery);
    
    // Handle special dashboard filters
    const dashboardFilter = searchParams.get('filter');
    if (dashboardFilter === 'unassigned') {
      params.append('assignedToId', 'null');
    }
    
    return params.toString() ? `?${params.toString()}` : '';
  };
  
  const { data: response, isLoading, error, mutate } = useSWR<LeadsResponse>(
    `/api/leads${buildQueryString()}`,
    fetcher
  );
  
  const leads = response?.data || [];

  const handleAutoAssign = async () => {
    setIsAutoAssigning(true);
    try {
      const res = await fetch('/api/assign', { method: 'GET' });
      const data = await res.json();
      
      if (data.success) {
        toast({
          title: 'Auto-assign successful',
          description: `Assigned ${data.data.assigned} leads`,
          status: 'success',
          duration: 3000,
        });
        mutate();
      } else {
        toast({
          title: 'Auto-assign failed',
          description: data.error,
          status: 'error',
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        title: 'Auto-assign error',
        description: 'Failed to auto-assign leads',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsAutoAssigning(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'blue',
      contacted: 'purple',
      qualified: 'cyan',
      converted: 'green',
      lost: 'red',
      follow_up: 'orange',
    };
    return colors[status] || 'gray';
  };

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
        <Text color="red.500">Error loading leads: {error.message}</Text>
      </Box>
    );
  }

  return (
    <Box>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">Leads</Heading>
        <HStack>
          {session?.user?.role === 'SuperAgent' && (
            <Button
              colorScheme="purple"
              onClick={handleAutoAssign}
              isLoading={isAutoAssigning}
            >
              Auto-Assign
            </Button>
          )}
          <Button colorScheme="blue" onClick={() => router.push('/dashboard/leads/new')}>
            + Add Lead
          </Button>
        </HStack>
      </HStack>

      {/* Filters and View Toggle */}
      <Box bg="white" p={4} borderRadius="lg" boxShadow="sm" mb={4}>
        <HStack spacing={4} justify="space-between">
          <HStack spacing={4} flex={1}>
            <InputGroup maxW="300px">
              <InputLeftElement>
                <HiSearch />
              </InputLeftElement>
              <Input
                placeholder="Search by name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>
            <Select
              placeholder="All Statuses"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              maxW="200px"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="converted">Converted</option>
              <option value="lost">Lost</option>
            </Select>
            <Select
              placeholder="All Sources"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              maxW="200px"
            >
              <option value="Meta">Meta</option>
              <option value="Website">Website</option>
              <option value="Referral">Referral</option>
              <option value="Direct">Direct</option>
            </Select>
            {(statusFilter || sourceFilter || searchQuery) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setStatusFilter('');
                  setSourceFilter('');
                  setSearchQuery('');
                }}
              >
                Clear Filters
              </Button>
            )}
          </HStack>
          
          {/* View Toggle */}
          <HStack spacing={2}>
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
      </Box>

      {viewMode === 'table' ? (
        /* Table View */
        <Box bg="white" borderRadius="lg" boxShadow="sm" overflow="hidden">
          <Table variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th>Status</Th>
                <Th>Priority</Th>
                <Th>Assigned To</Th>
                <Th>Created</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
          <Tbody>
            {leads && leads.length > 0 ? (
              leads.map((lead) => (
                <Tr key={lead.id} _hover={{ bg: 'gray.50' }}>
                  <Td 
                    fontWeight="medium" 
                    cursor="pointer" 
                    color="blue.600"
                    onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                  >
                    {lead.name}
                  </Td>
                  <Td>{lead.email || '-'}</Td>
                  <Td>{lead.phone}</Td>
                  <Td>
                    <Badge colorScheme={getStatusColor(lead.status)}>
                      {lead.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge
                      colorScheme={
                        lead.priority === 'high'
                          ? 'red'
                          : lead.priority === 'medium'
                          ? 'orange'
                          : 'gray'
                      }
                    >
                      {lead.priority?.toUpperCase()}
                    </Badge>
                  </Td>
                  <Td>{lead.assignedTo?.name || 'Unassigned'}</Td>
                  <Td>{new Date(lead.createdAt).toLocaleDateString()}</Td>
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
                        <MenuItem 
                          icon={<HiPhone />}
                          onClick={() => router.push(`/dashboard/leads/${lead.id}/call`)}
                        >
                          Log Call
                        </MenuItem>
                        <MenuItem 
                          icon={<HiClock />}
                          onClick={() => router.push(`/dashboard/leads/${lead.id}/followup`)}
                        >
                          Schedule Follow-up
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </Td>
                </Tr>
              ))
            ) : (
              <Tr>
                <Td colSpan={8} textAlign="center" py={8}>
                  <Text color="gray.500">
                    {searchQuery || statusFilter || sourceFilter
                      ? 'No leads match your filters'
                      : 'No leads found'}
                  </Text>
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
        
        {/* Pagination info */}
        {response && response.total > 0 && (
          <Box p={4} borderTopWidth="1px">
            <Text fontSize="sm" color="gray.600">
              Showing {leads.length} of {response.total} leads
            </Text>
          </Box>
        )}
      </Box>
      ) : (
        /* Tiles View */
        <Box>
          {leads && leads.length > 0 ? (
            <Box
              display="grid"
              gridTemplateColumns={{ base: '1fr', md: '1fr 1fr', lg: 'repeat(3, 1fr)' }}
              gap={4}
            >
              {leads.map((lead) => (
                <Box
                  key={lead.id}
                  bg="white"
                  borderRadius="lg"
                  boxShadow="sm"
                  p={6}
                  _hover={{ boxShadow: 'md', transform: 'translateY(-2px)' }}
                  transition="all 0.2s"
                  cursor="pointer"
                  onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                >
                  <HStack justify="space-between" mb={3}>
                    <Heading size="md" color="blue.600">
                      {lead.name}
                    </Heading>
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<HiDotsVertical />}
                        variant="ghost"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <MenuList>
                        <MenuItem 
                          icon={<HiEye />}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/leads/${lead.id}`);
                          }}
                        >
                          View Details
                        </MenuItem>
                        <MenuItem 
                          icon={<HiPencil />}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/leads/${lead.id}/edit`);
                          }}
                        >
                          Edit Lead
                        </MenuItem>
                        <MenuItem 
                          icon={<HiPhone />}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/leads/${lead.id}/call`);
                          }}
                        >
                          Log Call
                        </MenuItem>
                        <MenuItem 
                          icon={<HiClock />}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/leads/${lead.id}/followup`);
                          }}
                        >
                          Schedule Follow-up
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </HStack>
                  
                  <Box mb={4}>
                    <HStack mb={2}>
                      <Badge colorScheme={getStatusColor(lead.status)}>
                        {lead.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge
                        colorScheme={
                          lead.priority === 'high'
                            ? 'red'
                            : lead.priority === 'medium'
                            ? 'orange'
                            : 'gray'
                        }
                      >
                        {lead.priority?.toUpperCase()}
                      </Badge>
                    </HStack>
                    
                    <Text fontSize="sm" color="gray.600" mb={1}>
                      <strong>Email:</strong> {lead.email || '-'}
                    </Text>
                    <Text fontSize="sm" color="gray.600" mb={1}>
                      <strong>Phone:</strong> {lead.phone}
                    </Text>
                    <Text fontSize="sm" color="gray.600" mb={1}>
                      <strong>Source:</strong> {lead.source || '-'}
                    </Text>
                    <Text fontSize="sm" color="gray.600" mb={1}>
                      <strong>Assigned To:</strong> {lead.assignedTo?.name || 'Unassigned'}
                    </Text>
                    <Text fontSize="sm" color="gray.500" mt={2}>
                      <strong>Created:</strong> {new Date(lead.createdAt).toLocaleDateString()}
                    </Text>
                  </Box>
                  
                  <HStack spacing={2} mt={4} pt={4} borderTopWidth="1px">
                    <Button
                      size="sm"
                      leftIcon={<HiPhone />}
                      colorScheme="green"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/leads/${lead.id}/call`);
                      }}
                    >
                      Call
                    </Button>
                    <Button
                      size="sm"
                      leftIcon={<HiClock />}
                      colorScheme="orange"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/leads/${lead.id}/followup`);
                      }}
                    >
                      Follow-up
                    </Button>
                  </HStack>
                </Box>
              ))}
            </Box>
          ) : (
            <Box bg="white" borderRadius="lg" boxShadow="sm" p={8} textAlign="center">
              <Text color="gray.500">
                {searchQuery || statusFilter || sourceFilter
                  ? 'No leads match your filters'
                  : 'No leads found'}
              </Text>
            </Box>
          )}
          
          {/* Pagination info */}
          {response && response.total > 0 && (
            <Box bg="white" borderRadius="lg" boxShadow="sm" p={4} mt={4}>
              <Text fontSize="sm" color="gray.600">
                Showing {leads.length} of {response.total} leads
              </Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
