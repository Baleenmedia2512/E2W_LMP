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
  Flex,
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
  useDisclosure,
  MenuDivider,
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';
import { Lead } from '@/types';
import { HiDotsVertical, HiEye, HiPencil, HiPhone, HiClock, HiSearch, HiViewGrid, HiViewList, HiBan, HiX, HiUserAdd } from 'react-icons/hi';
import { startOfDay, endOfDay } from 'date-fns';
import ConvertToUnreachableModal from '@/components/ConvertToUnreachableModal';
import ConvertToUnqualifiedModal from '@/components/ConvertToUnqualifiedModal';
import AddLeadModal from '@/components/AddLeadModal';
import AssignLeadModal from '@/components/AssignLeadModal';

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

export default function LeadsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'tiles'>('table');
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  
  // Conversion modals state
  const [selectedLead, setSelectedLead] = useState<{ id: string; name: string } | null>(null);
  const { isOpen: isUnreachableOpen, onOpen: onUnreachableOpen, onClose: onUnreachableClose } = useDisclosure();
  const { isOpen: isUnqualifiedOpen, onOpen: onUnqualifiedOpen, onClose: onUnqualifiedClose } = useDisclosure();
  
  // Add Lead Modal
  const { isOpen: isAddLeadOpen, onOpen: onAddLeadOpen, onClose: onAddLeadClose } = useDisclosure();
  
  // Assign Lead Modal
  const { isOpen: isAssignOpen, onOpen: onAssignOpen, onClose: onAssignClose } = useDisclosure();
  const [leadToAssign, setLeadToAssign] = useState<{ id: string; name: string; currentAssignee?: string } | null>(null);
  
  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Handle filter from query params (from dashboard clicks)
  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter) {
      switch (filter) {
        case 'newToday':
          setStatusFilter('new');
          setDateFilter('today');
          break;
        case 'followupsToday':
          setStatusFilter('followup');
          setDateFilter('today');
          break;
        case 'conversionsToday':
          setStatusFilter('converted');
          setDateFilter('today');
          break;
        case 'assigned':
          // Filter for assigned leads - handled by API
          break;
        case 'unassigned':
          // Filter for unassigned leads - handled by API
          break;
        case 'callsToday':
          setDateFilter('today');
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
    if (debouncedSearchQuery) params.append('search', debouncedSearchQuery);
    
    // Add date filter
    if (dateFilter !== 'all') {
      params.append('dateFilter', dateFilter);
    }
    
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
  
  // Apply priority-based sorting: New (1), Followup (2), Unreach (3), Unqualified (4)
  const statusPriority: Record<string, number> = {
    new: 1,
    followup: 2,
    unreach: 3,
    unqualified: 4,
  };

  const rawLeads = response?.data?.data || [];
  const leads = rawLeads.sort((a, b) => {
    const priorityA = statusPriority[a.status.toLowerCase()] || 999;
    const priorityB = statusPriority[b.status.toLowerCase()] || 999;
    return priorityA - priorityB;
  });

  // Listen for undo events to refresh leads
  useEffect(() => {
    const handleUndoPerformed = () => {
      if (mutate) {
        mutate();
      }
    };

    window.addEventListener('undo-performed', handleUndoPerformed);
    return () => window.removeEventListener('undo-performed', handleUndoPerformed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      followup: 'orange',
      unreach: 'gray',
      unqualified: 'yellow',
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
        <VStack spacing={4}>
          <Text color="red.500" fontSize="lg" fontWeight="bold">
            Error loading leads
          </Text>
          <Text color="gray.600">
            {error?.info?.error || error?.message || 'An error occurred while fetching the data.'}
          </Text>
          <Button onClick={() => mutate()} colorScheme="blue">
            Retry
          </Button>
        </VStack>
      </Box>
    );
  }

  return (
    <Box>
      <Flex 
        justify="space-between" 
        align={{ base: 'stretch', md: 'center' }}
        mb={6}
        direction={{ base: 'column', md: 'row' }}
        gap={{ base: 3, md: 0 }}
      >
        <Heading size={{ base: 'md', md: 'lg' }}>
          Leads
          {dateFilter === 'today' && (
            <Badge ml={2} colorScheme="blue" fontSize="sm">
              Today
            </Badge>
          )}
        </Heading>
        <HStack spacing={2} flexWrap={{ base: 'wrap', md: 'nowrap' }}>
          {session?.user?.role === 'SuperAgent' && (
            <Button
              size={{ base: 'sm', md: 'md' }}
              colorScheme="purple"
              onClick={handleAutoAssign}
              isLoading={isAutoAssigning}
              width={{ base: 'full', sm: 'auto' }}
            >
              Auto-Assign
            </Button>
          )}
          <Button 
            size={{ base: 'sm', md: 'md' }}
            colorScheme="blue" 
            onClick={onAddLeadOpen}
            width={{ base: 'full', sm: 'auto' }}
          >
            + Add Lead
          </Button>
        </HStack>
      </Flex>

      {/* Filters and View Toggle */}
      <Box bg="white" p={{ base: 3, md: 4 }} borderRadius="lg" boxShadow="sm" mb={4}>
        <VStack spacing={3} align="stretch">
          <HStack spacing={{ base: 2, md: 4 }} flexWrap="wrap">
            <InputGroup maxW={{ base: 'full', md: '300px' }} flex={{ base: '1 1 100%', md: '0 1 auto' }}>
              <InputLeftElement>
                <HiSearch />
              </InputLeftElement>
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size={{ base: 'sm', md: 'md' }}
              />
            </InputGroup>
            <Select
              placeholder="All Statuses"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              maxW={{ base: 'full', sm: '150px', md: '200px' }}
              flex={{ base: '1 1 48%', md: '0 1 auto' }}
              size={{ base: 'sm', md: 'md' }}
            >
              <option value="new">New</option>
              <option value="followup">Followup</option>
              <option value="unreach">Unreach</option>
              <option value="unqualified">Unqualified</option>
            </Select>
            <Select
              placeholder="All Sources"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              maxW={{ base: 'full', sm: '150px', md: '200px' }}
              flex={{ base: '1 1 48%', md: '0 1 auto' }}
              size={{ base: 'sm', md: 'md' }}
            >
              <option value="Meta">Meta</option>
              <option value="Website">Website</option>
              <option value="Referral">Referral</option>
              <option value="Direct">Direct</option>
            </Select>
            <Select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month')}
              maxW={{ base: 'full', sm: '150px', md: '200px' }}
              flex={{ base: '1 1 48%', md: '0 1 auto' }}
              size={{ base: 'sm', md: 'md' }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </Select>
            {(statusFilter || sourceFilter || searchQuery || dateFilter !== 'all') && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setStatusFilter('');
                  setSourceFilter('');
                  setSearchQuery('');
                  setDateFilter('all');
                  router.push('/dashboard/leads');
                }}
              >
                Clear Filters
              </Button>
            )}
          </HStack>
          
          {/* View Toggle */}
          <HStack spacing={2} justify={{ base: 'center', md: 'flex-end' }}>
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
        </VStack>
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
                          icon={<HiUserAdd />}
                          onClick={() => {
                            setLeadToAssign({
                              id: lead.id,
                              name: lead.name,
                              currentAssignee: lead.assignedTo?.name
                            });
                            onAssignOpen();
                          }}
                        >
                          {lead.assignedTo ? 'Reassign Lead' : 'Assign Lead'}
                        </MenuItem>
                        <MenuDivider />
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
                        <MenuDivider />
                        <MenuItem 
                          icon={<HiBan />}
                          onClick={() => {
                            setSelectedLead({ id: lead.id, name: lead.name });
                            onUnreachableOpen();
                          }}
                        >
                          Mark as Unreachable
                        </MenuItem>
                        <MenuItem 
                          icon={<HiX />}
                          onClick={() => {
                            setSelectedLead({ id: lead.id, name: lead.name });
                            onUnqualifiedOpen();
                          }}
                        >
                          Mark as Unqualified
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
        {response?.data && response.data.total > 0 && (
          <Box p={4} borderTopWidth="1px">
            <Text fontSize="sm" color="gray.600">
              Showing {leads.length} of {response.data.total} leads
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
                        <MenuDivider />
                        <MenuItem 
                          icon={<HiBan />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLead({ id: lead.id, name: lead.name });
                            onUnreachableOpen();
                          }}
                        >
                          Mark as Unreachable
                        </MenuItem>
                        <MenuItem 
                          icon={<HiX />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLead({ id: lead.id, name: lead.name });
                            onUnqualifiedOpen();
                          }}
                        >
                          Mark as Unqualified
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
          {response?.data && response.data.total > 0 && (
            <Box bg="white" borderRadius="lg" boxShadow="sm" p={4} mt={4}>
              <Text fontSize="sm" color="gray.600">
                Showing {leads.length} of {response.data.total} leads
              </Text>
            </Box>
          )}
        </Box>
      )}

      {/* Conversion Modals */}
      {selectedLead && (
        <>
          <ConvertToUnreachableModal
            isOpen={isUnreachableOpen}
            onClose={onUnreachableClose}
            leadId={selectedLead.id}
            leadName={selectedLead.name}
          />
          <ConvertToUnqualifiedModal
            isOpen={isUnqualifiedOpen}
            onClose={onUnqualifiedClose}
            leadId={selectedLead.id}
            leadName={selectedLead.name}
          />
        </>
      )}

      {/* Assign Lead Modal */}
      {leadToAssign && (
        <AssignLeadModal
          isOpen={isAssignOpen}
          onClose={onAssignClose}
          leadId={leadToAssign.id}
          leadName={leadToAssign.name}
          currentAssignee={leadToAssign.currentAssignee}
          onSuccess={() => mutate()}
        />
      )}

      {/* Add Lead Modal */}
      <AddLeadModal isOpen={isAddLeadOpen} onClose={onAddLeadClose} />
    </Box>
  );
}
