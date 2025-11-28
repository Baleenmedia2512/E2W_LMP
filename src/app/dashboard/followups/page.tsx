'use client';

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
  Button,
  HStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  useToast,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Flex,
} from '@chakra-ui/react';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HiDotsVertical, HiEye, HiCheck, HiX, HiPlus, HiSearch } from 'react-icons/hi';
import { formatDateTime } from '@/shared/lib/date-utils';

interface FollowUp {
  id: string;
  leadId: string;
  lead: {
    id: string;
    name: string;
    phone: string;
  };
  scheduledAt: string;
  status: 'pending' | 'completed' | 'cancelled';
  notes: string | null;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

export default function FollowUpsPage() {
  const router = useRouter();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch follow-ups from API
  useEffect(() => {
    const fetchFollowUps = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/followups?limit=100');
        const result = await response.json();
        if (result.success) {
          setFollowUps(result.data);
        } else {
          setError(result.error || 'Failed to fetch follow-ups');
        }
      } catch (err) {
        setError('Failed to fetch follow-ups');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFollowUps();
  }, []);

  // Filter follow-ups based on search and date
  const filteredFollowUps = useMemo(() => {
    let filtered = [...followUps];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(followup => 
        followup.lead.name.toLowerCase().includes(query) ||
        followup.lead.phone.toLowerCase().includes(query) ||
        (followup.notes && followup.notes.toLowerCase().includes(query))
      );
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(followup => {
        const followupDate = new Date(followup.scheduledAt);
        const followupDay = new Date(followupDate.getFullYear(), followupDate.getMonth(), followupDate.getDate());
        
        if (dateFilter === 'today') {
          return followupDay.getTime() === today.getTime();
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          return followupDay >= weekAgo && followupDay <= today;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(today);
          monthAgo.setMonth(today.getMonth() - 1);
          return followupDay >= monthAgo && followupDay <= today;
        }
        return true;
      });
    }

    return filtered;
  }, [searchQuery, dateFilter, followUps]);

  const handleMarkCompleted = async (id: string, leadName: string) => {
    try {
      const response = await fetch(`/api/followups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      if (response.ok) {
        toast({
          title: 'Follow-up marked complete',
          description: `Follow-up with ${leadName} has been marked as completed`,
          status: 'success',
          duration: 3000,
        });
        setFollowUps(followUps.map(f => f.id === id ? { ...f, status: 'completed' } : f));
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update follow-up',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleMarkCancelled = async (id: string, leadName: string) => {
    try {
      const response = await fetch(`/api/followups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (response.ok) {
        toast({
          title: 'Follow-up cancelled',
          description: `Follow-up with ${leadName} has been cancelled`,
          status: 'info',
          duration: 3000,
        });
        setFollowUps(followUps.map(f => f.id === id ? { ...f, status: 'cancelled' } : f));
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update follow-up',
        status: 'error',
        duration: 3000,
      });
    }
  };

  return (
    <Box>
      <HStack justify="space-between" mb={6} flexWrap="wrap" gap={3}>
        <Heading size={{ base: 'md', md: 'lg' }}>Follow-ups</Heading>
      </HStack>

      {/* Search and Filter Bar */}
      <Flex gap={3} mb={4} flexWrap="wrap">
        <InputGroup flex="1" minW={{ base: 'full', md: '300px' }}>
          <InputLeftElement>
            <HiSearch color="gray" />
          </InputLeftElement>
          <Input
            placeholder="Search name, phone or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            bg="white"
          />
        </InputGroup>

        <Select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          maxW={{ base: 'full', md: '200px' }}
          bg="white"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
        </Select>
      </Flex>

      {error && (
        <Box bg="red.50" p={4} borderRadius="lg" mb={4} color="red.700">
          {error}
        </Box>
      )}

      {loading && (
        <Box textAlign="center" py={8}>
          <Text color="gray.500">Loading follow-ups...</Text>
        </Box>
      )}

      {!loading && (
        <Box bg="white" borderRadius="lg" boxShadow="sm" overflow="hidden">
          <Box overflowX="auto">
          <Table variant="simple" size={{ base: 'sm', md: 'md' }}>
            <Thead bg="gray.50">
              <Tr>
                <Th>Lead Name</Th>
                <Th display={{ base: 'none', sm: 'table-cell' }}>Scheduled At</Th>
                <Th display={{ base: 'none', md: 'table-cell' }}>Priority</Th>
                <Th>Status</Th>
                <Th display={{ base: 'none', lg: 'table-cell' }}>Notes</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredFollowUps.length > 0 ? (
                filteredFollowUps.map((followup) => (
                  <Tr key={followup.id} _hover={{ bg: 'gray.50' }}>
                    <Td fontWeight="medium" fontSize={{ base: 'xs', md: 'sm' }}>{followup.lead.name}</Td>
                    <Td fontSize={{ base: 'xs', md: 'sm' }} display={{ base: 'none', sm: 'table-cell' }}>{formatDateTime(followup.scheduledAt)}</Td>
                    <Td display={{ base: 'none', md: 'table-cell' }}>
                      <Badge
                        colorScheme={
                          followup.priority === 'high'
                            ? 'red'
                            : followup.priority === 'medium'
                            ? 'orange'
                            : 'gray'
                        }
                      >
                        {followup.priority}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge
                        colorScheme={
                          followup.status === 'completed'
                            ? 'green'
                            : followup.status === 'pending'
                            ? 'yellow'
                            : 'gray'
                        }
                        fontSize={{ base: 'xs', md: 'sm' }}
                      >
                        {followup.status}
                      </Badge>
                    </Td>
                    <Td display={{ base: 'none', lg: 'table-cell' }}>
                      <Text noOfLines={2} fontSize={{ base: 'xs', md: 'sm' }}>{followup.notes || '-'}</Text>
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
                            onClick={() => router.push(`/dashboard/leads/${followup.leadId}`)}
                          >
                            View Lead
                          </MenuItem>
                          {followup.status === 'pending' && (
                            <>
                              <MenuItem
                                icon={<HiCheck />}
                                onClick={() => handleMarkCompleted(followup.id, followup.lead.name)}
                              >
                                Mark Complete
                              </MenuItem>
                              <MenuItem
                                icon={<HiX />}
                                onClick={() => handleMarkCancelled(followup.id, followup.lead.name)}
                              >
                                Cancel
                              </MenuItem>
                            </>
                          )}
                        </MenuList>
                      </Menu>
                    </Td>
                  </Tr>
                ))
              ) : (
                <Tr>
                  <Td colSpan={6} textAlign="center" py={8}>
                    <Text color="gray.500">No follow-ups found</Text>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
          </Box>

          {filteredFollowUps.length > 0 && (
            <Box p={4} borderTopWidth="1px">
              <Text fontSize="sm" color="gray.600">
                Showing {filteredFollowUps.length} follow-up{filteredFollowUps.length !== 1 ? 's' : ''}
              </Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}





