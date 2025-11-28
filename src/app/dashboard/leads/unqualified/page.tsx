'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Text,
  HStack,
  VStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  InputGroup,
  InputLeftElement,
  Input,
  Select,
  Button,
  Spinner,
  useToast,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { HiDotsVertical, HiEye, HiSearch } from 'react-icons/hi';
import { formatDate } from '@/shared/lib/date-utils';

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source?: string;
  assignedTo?: { id: string; name: string };
  updatedAt: string;
  notes?: string;
  status: string;
}

export default function UnqualifiedLeadsPage() {
  const router = useRouter();
  const toast = useToast();
  
  // State for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await fetch('/api/leads?limit=100');
        if (!res.ok) throw new Error('Failed to fetch leads');
        const data = await res.json();
        
        const leadsList = Array.isArray(data) ? data : data.data || [];
        setLeads(leadsList);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load leads',
          status: 'error',
          duration: 3000,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [toast]);

  // Filter unqualified leads
  const unqualifiedLeads = useMemo(() => {
    let filtered = leads.filter(lead => lead.status === 'unqualified');

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (lead) =>
          lead.name.toLowerCase().includes(query) ||
          lead.phone.toLowerCase().includes(query) ||
          lead.email?.toLowerCase().includes(query)
      );
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter((lead) => {
        const leadDate = new Date(lead.updatedAt);
        const leadDay = new Date(leadDate.getFullYear(), leadDate.getMonth(), leadDate.getDate());
        
        if (dateFilter === 'today') {
          return leadDay.getTime() === today.getTime();
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return leadDay >= weekAgo;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(today);
          monthAgo.setDate(monthAgo.getDate() - 30);
          return leadDay >= monthAgo;
        } else if (dateFilter === 'custom' && startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          return leadDate >= start && leadDate <= end;
        }
        return true;
      });
    }

    return filtered;
  }, [leads, searchQuery, dateFilter, startDate, endDate]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="400px">
        <VStack spacing={4}>
          <Spinner size="lg" color="blue.500" />
          <Text color="gray.600">Loading unqualified leads...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box>
      <Heading size="lg" mb={6}>
        Unqualified Leads ({unqualifiedLeads.length})
      </Heading>

      {/* Filter Section */}
      <Box bg="white" p={{ base: 3, md: 4 }} borderRadius="lg" boxShadow="sm" mb={4}>
        <VStack spacing={3} align="stretch">
          <HStack spacing={{ base: 2, md: 4 }} flexWrap="wrap">
            <InputGroup maxW={{ base: 'full', md: '300px' }} flex={{ base: '1 1 100%', md: '0 1 auto' }}>
              <InputLeftElement>
                <HiSearch />
              </InputLeftElement>
              <Input
                placeholder="Search name, phone or email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size={{ base: 'sm', md: 'md' }}
              />
            </InputGroup>

            <Select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month' | 'custom')}
              maxW={{ base: 'full', sm: '150px', md: '200px' }}
              flex={{ base: '1 1 48%', md: '0 1 auto' }}
              size={{ base: 'sm', md: 'md' }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="custom">Custom</option>
            </Select>

            {(searchQuery || dateFilter !== 'all') && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSearchQuery('');
                  setDateFilter('all');
                  setStartDate('');
                  setEndDate('');
                }}
              >
                Clear Filters
              </Button>
            )}
          </HStack>

          {/* Custom Date Range */}
          {dateFilter === 'custom' && (
            <HStack spacing={3} flexWrap="wrap">
              <Box flex={{ base: '1 1 100%', sm: '1 1 48%', md: '0 1 auto' }}>
                <Text fontSize="sm" mb={1} fontWeight="medium">
                  Start Date
                </Text>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  size={{ base: 'sm', md: 'md' }}
                />
              </Box>
              <Box flex={{ base: '1 1 100%', sm: '1 1 48%', md: '0 1 auto' }}>
                <Text fontSize="sm" mb={1} fontWeight="medium">
                  End Date
                </Text>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  size={{ base: 'sm', md: 'md' }}
                />
              </Box>
            </HStack>
          )}
        </VStack>
      </Box>

      <Box bg="white" borderRadius="lg" boxShadow="sm" overflow="hidden">
        {unqualifiedLeads.length > 0 ? (
          <Table variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th>Email</Th>
                <Th>Source</Th>
                <Th>Assigned To</Th>
                <Th>Last Updated</Th>
                <Th>Reason</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {unqualifiedLeads.map((lead) => (
                <Tr key={lead.id} _hover={{ bg: 'gray.50' }}>
                  <Td fontWeight="medium">{lead.name}</Td>
                  <Td>{lead.phone}</Td>
                  <Td>{lead.email || '-'}</Td>
                  <Td>
                    <Badge colorScheme="purple">{lead.source}</Badge>
                  </Td>
                  <Td>{lead.assignedTo?.name || 'Unassigned'}</Td>
                  <Td>{formatDate(lead.updatedAt)}</Td>
                  <Td>
                    <Text noOfLines={2} fontSize="sm">
                      {lead.notes || 'Not specified'}
                    </Text>
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
                      </MenuList>
                    </Menu>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        ) : (
          <Box p={8} textAlign="center">
            <Text color="gray.500">
              {searchQuery || dateFilter !== 'all'
                ? 'No unqualified leads match your filters'
                : 'No unqualified leads'}
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

