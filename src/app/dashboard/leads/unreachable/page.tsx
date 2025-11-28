'use client';

import { useState, useMemo } from 'react';
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
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { HiDotsVertical, HiEye, HiPhone, HiSearch } from 'react-icons/hi';
import { mockLeads } from '@/shared/lib/mock-data';
import { formatDate } from '@/shared/lib/date-utils';

export default function UnreachableLeadsPage() {
  const router = useRouter();
  
  // State for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filter unreachable leads
  const unreachableLeads = useMemo(() => {
    let filtered = mockLeads.filter(lead => lead.status === 'unreach');

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
  }, [searchQuery, dateFilter, startDate, endDate]);

  return (
    <Box>
      <Heading size="lg" mb={6}>
        Unreachable Leads ({unreachableLeads.length})
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
        {unreachableLeads.length > 0 ? (
          <Table variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th>Email</Th>
                <Th>Call Attempts</Th>
                <Th>Assigned To</Th>
                <Th>Last Updated</Th>
                <Th>Notes</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {unreachableLeads.map((lead) => (
                <Tr key={lead.id} _hover={{ bg: 'gray.50' }}>
                  <Td fontWeight="medium">{lead.name}</Td>
                  <Td>{lead.phone}</Td>
                  <Td>{lead.email || '-'}</Td>
                  <Td>
                    <Badge colorScheme="orange">{lead.callAttempts || 0}</Badge>
                  </Td>
                  <Td>{lead.assignedTo?.name || 'Unassigned'}</Td>
                  <Td>{formatDate(lead.updatedAt)}</Td>
                  <Td>
                    <Text noOfLines={2} fontSize="sm">
                      {lead.notes || '-'}
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
                        <MenuItem
                          icon={<HiPhone />}
                          onClick={() => router.push(`/dashboard/leads/${lead.id}/call`)}
                        >
                          Retry Call
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
                ? 'No unreachable leads match your filters'
                : 'No unreachable leads'}
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}





