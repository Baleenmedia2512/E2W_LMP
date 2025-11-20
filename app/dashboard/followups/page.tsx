'use client';

import React, { useState, useMemo } from 'react';
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
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  Card,
  CardBody,
  Divider,
  Flex,
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';
import { FollowUp } from '@/types';
import { HiDotsVertical, HiCheckCircle, HiXCircle, HiViewGrid, HiViewList, HiClock, HiPhone } from 'react-icons/hi';
import { format, isToday, isTomorrow, isPast, startOfDay, parseISO, isBefore, endOfDay } from 'date-fns';

interface FollowUpWithLead extends FollowUp {
  lead: {
    id: string;
    name: string;
    phone: string;
    status: string;
    assignedTo?: {
      id: string;
      name: string;
    };
  };
}

export default function FollowUpsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [viewMode, setViewMode] = useState<'table' | 'tiles'>('table');
  
  const { data: response, isLoading, error, mutate } = useSWR<{ data: FollowUpWithLead[] }>(
    '/api/followups',
    fetcher
  );
  
  const followups = response?.data || [];

  // Sort and categorize follow-ups
  const categorizedFollowups = useMemo(() => {
    const pending = followups.filter(f => f.status === 'pending');
    
    const overdue: FollowUpWithLead[] = [];
    const today: FollowUpWithLead[] = [];
    const tomorrow: FollowUpWithLead[] = [];
    const upcoming: FollowUpWithLead[] = [];
    
    const now = new Date();
    
    pending.forEach(followup => {
      const scheduledDate = parseISO(followup.scheduledAt.toString());
      
      // Check if scheduled date/time is before current time (overdue)
      if (isBefore(scheduledDate, now)) {
        overdue.push(followup);
      } else if (isToday(scheduledDate)) {
        today.push(followup);
      } else if (isTomorrow(scheduledDate)) {
        tomorrow.push(followup);
      } else {
        upcoming.push(followup);
      }
    });
    
    // Sort each category by scheduled time
    const sortByTime = (a: FollowUpWithLead, b: FollowUpWithLead) => 
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    
    overdue.sort(sortByTime);
    today.sort(sortByTime);
    tomorrow.sort(sortByTime);
    upcoming.sort(sortByTime);
    
    return { overdue, today, tomorrow, upcoming };
  }, [followups]);

  const getDateBadgeColor = (followup: FollowUpWithLead) => {
    const scheduledDate = parseISO(followup.scheduledAt.toString());
    const now = new Date();
    
    if (isBefore(scheduledDate, now)) {
      return 'red';
    } else if (isToday(scheduledDate)) {
      return 'green';
    } else if (isTomorrow(scheduledDate)) {
      return 'blue';
    }
    return 'gray';
  };

  const getCardBorderColor = (followup: FollowUpWithLead) => {
    const scheduledDate = parseISO(followup.scheduledAt.toString());
    const now = new Date();
    
    if (isBefore(scheduledDate, now)) {
      return 'red.500';
    } else if (isToday(scheduledDate)) {
      return 'green.500';
    } else if (isTomorrow(scheduledDate)) {
      return 'blue.500';
    }
    return 'gray.200';
  };

  const handleComplete = async (id: string) => {
    try {
      const res = await fetch(`/api/followups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          completedAt: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        toast({
          title: 'Follow-up completed',
          status: 'success',
          duration: 2000,
        });
        mutate();
      }
    } catch (error) {
      toast({
        title: 'Failed to complete follow-up',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`/api/followups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'cancelled',
        }),
      });

      if (res.ok) {
        toast({
          title: 'Follow-up cancelled',
          status: 'success',
          duration: 2000,
        });
        mutate();
      }
    } catch (error) {
      toast({
        title: 'Failed to cancel follow-up',
        status: 'error',
        duration: 3000,
      });
    }
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
        <Text color="red.500">Error loading follow-ups: {error.message}</Text>
      </Box>
    );
  }

  return (
    <Box>
      <VStack spacing={{ base: 3, md: 4 }} align="stretch" mb={6}>
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
          <Heading size={{ base: 'md', md: 'lg' }}>Follow-ups</Heading>
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
        </Flex>
        <HStack spacing={2} flexWrap="wrap" justify={{ base: 'center', md: 'flex-start' }}>
          <Badge colorScheme="red" fontSize={{ base: 'xs', md: 'sm' }} px={{ base: 2, md: 3 }} py={1}>
            Overdue: {categorizedFollowups.overdue.length}
          </Badge>
          <Badge colorScheme="green" fontSize={{ base: 'xs', md: 'sm' }} px={{ base: 2, md: 3 }} py={1}>
            Today: {categorizedFollowups.today.length}
          </Badge>
          <Badge colorScheme="blue" fontSize={{ base: 'xs', md: 'sm' }} px={{ base: 2, md: 3 }} py={1}>
            Tomorrow: {categorizedFollowups.tomorrow.length}
          </Badge>
        </HStack>
      </VStack>

      {viewMode === 'table' ? (
        <VStack align="stretch" spacing={{ base: 4, md: 6 }}>
          {/* Overdue Table */}
          {categorizedFollowups.overdue.length > 0 && (
            <Box>
              <HStack mb={4} p={{ base: 2, md: 3 }} bg="red.50" borderRadius="md" borderLeft="4px solid" borderColor="red.500">
                <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="bold" color="red.700">
                  🔴 OVERDUE ({categorizedFollowups.overdue.length})
                </Text>
              </HStack>
              <Box bg="white" borderRadius="lg" boxShadow="sm" overflow="hidden" overflowX="auto">
                <Table variant="simple" size={{ base: 'sm', md: 'md' }}>
                  <Thead bg="red.50">
                    <Tr>
                      <Th>Lead Name</Th>
                      <Th display={{ base: 'none', md: 'table-cell' }}>Phone</Th>
                      <Th>Due Date & Time</Th>
                      <Th display={{ base: 'none', sm: 'table-cell' }}>Priority</Th>
                      <Th>Status</Th>
                      <Th>Notes</Th>
                      <Th>Assigned To</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {categorizedFollowups.overdue.map((followup) => (
                      <Tr key={followup.id} bg="red.50" _hover={{ bg: 'red.100' }}>
                        <Td
                          fontWeight="bold"
                          color="red.700"
                          cursor="pointer"
                          onClick={() => router.push(`/dashboard/leads/${followup.lead.id}`)}
                        >
                          {followup.lead?.name || 'N/A'}
                        </Td>
                        <Td display={{ base: 'none', md: 'table-cell' }}>{followup.lead?.phone || '-'}</Td>
                        <Td>
                          <Text fontWeight="bold" color="red.600">
                            {format(parseISO(followup.scheduledAt.toString()), 'MMM dd, yyyy HH:mm')}
                          </Text>
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={
                              followup.priority === 'high'
                                ? 'red'
                                : followup.priority === 'medium'
                                ? 'orange'
                                : 'gray'
                            }
                          >
                            {followup.priority?.toUpperCase()}
                          </Badge>
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={
                              followup.status === 'completed'
                                ? 'green'
                                : followup.status === 'cancelled'
                                ? 'red'
                                : 'orange'
                            }
                          >
                            {followup.status?.toUpperCase()}
                          </Badge>
                        </Td>
                        <Td maxW="200px" isTruncated>
                          {followup.notes || '-'}
                        </Td>
                        <Td>{followup.lead?.assignedTo?.name || 'Unassigned'}</Td>
                        <Td>
                          {followup.status === 'pending' && (
                            <Menu>
                              <MenuButton
                                as={IconButton}
                                icon={<HiDotsVertical />}
                                variant="ghost"
                                size="sm"
                              />
                              <MenuList>
                                <MenuItem
                                  icon={<HiCheckCircle />}
                                  onClick={() => handleComplete(followup.id)}
                                >
                                  Mark Complete
                                </MenuItem>
                                <MenuItem
                                  icon={<HiXCircle />}
                                  onClick={() => handleCancel(followup.id)}
                                >
                                  Cancel
                                </MenuItem>
                              </MenuList>
                            </Menu>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </Box>
          )}

          {/* Today Table */}
          {categorizedFollowups.today.length > 0 && (
            <Box>
              <HStack mb={4} p={3} bg="green.50" borderRadius="md" borderLeft="4px solid" borderColor="green.500">
                <Text fontSize="lg" fontWeight="bold" color="green.700">
                  📅 TODAY ({categorizedFollowups.today.length})
                </Text>
              </HStack>
              <Box bg="white" borderRadius="lg" boxShadow="sm" overflow="hidden">
                <Table variant="simple">
                  <Thead bg="green.50">
                    <Tr>
                      <Th>Lead Name</Th>
                      <Th>Phone</Th>
                      <Th>Time</Th>
                      <Th>Priority</Th>
                      <Th>Status</Th>
                      <Th>Notes</Th>
                      <Th>Assigned To</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {categorizedFollowups.today.map((followup) => (
                      <Tr key={followup.id} bg="green.50" _hover={{ bg: 'green.100' }}>
                        <Td
                          fontWeight="bold"
                          color="green.700"
                          cursor="pointer"
                          onClick={() => router.push(`/dashboard/leads/${followup.lead.id}`)}
                        >
                          {followup.lead?.name || 'N/A'}
                        </Td>
                        <Td>{followup.lead?.phone || '-'}</Td>
                        <Td>
                          <Text fontWeight="bold" color="green.600">
                            {format(parseISO(followup.scheduledAt.toString()), 'HH:mm')}
                          </Text>
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={
                              followup.priority === 'high'
                                ? 'red'
                                : followup.priority === 'medium'
                                ? 'orange'
                                : 'gray'
                            }
                          >
                            {followup.priority?.toUpperCase()}
                          </Badge>
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={
                              followup.status === 'completed'
                                ? 'green'
                                : followup.status === 'cancelled'
                                ? 'red'
                                : 'orange'
                            }
                          >
                            {followup.status?.toUpperCase()}
                          </Badge>
                        </Td>
                        <Td maxW="200px" isTruncated>
                          {followup.notes || '-'}
                        </Td>
                        <Td>{followup.lead?.assignedTo?.name || 'Unassigned'}</Td>
                        <Td>
                          {followup.status === 'pending' && (
                            <Menu>
                              <MenuButton
                                as={IconButton}
                                icon={<HiDotsVertical />}
                                variant="ghost"
                                size="sm"
                              />
                              <MenuList>
                                <MenuItem
                                  icon={<HiCheckCircle />}
                                  onClick={() => handleComplete(followup.id)}
                                >
                                  Mark Complete
                                </MenuItem>
                                <MenuItem
                                  icon={<HiXCircle />}
                                  onClick={() => handleCancel(followup.id)}
                                >
                                  Cancel
                                </MenuItem>
                              </MenuList>
                            </Menu>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </Box>
          )}

          {/* Tomorrow Table */}
          {categorizedFollowups.tomorrow.length > 0 && (
            <Box>
              <HStack mb={4} p={3} bg="blue.50" borderRadius="md" borderLeft="4px solid" borderColor="blue.500">
                <Text fontSize="lg" fontWeight="bold" color="blue.700">
                  📆 TOMORROW ({categorizedFollowups.tomorrow.length})
                </Text>
              </HStack>
              <Box bg="white" borderRadius="lg" boxShadow="sm" overflow="hidden">
                <Table variant="simple">
                  <Thead bg="blue.50">
                    <Tr>
                      <Th>Lead Name</Th>
                      <Th>Phone</Th>
                      <Th>Time</Th>
                      <Th>Priority</Th>
                      <Th>Status</Th>
                      <Th>Notes</Th>
                      <Th>Assigned To</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {categorizedFollowups.tomorrow.map((followup) => (
                      <Tr key={followup.id} _hover={{ bg: 'blue.50' }}>
                        <Td
                          fontWeight="bold"
                          color="blue.600"
                          cursor="pointer"
                          onClick={() => router.push(`/dashboard/leads/${followup.lead.id}`)}
                        >
                          {followup.lead?.name || 'N/A'}
                        </Td>
                        <Td>{followup.lead?.phone || '-'}</Td>
                        <Td>
                          <Text fontWeight="bold" color="blue.600">
                            {format(parseISO(followup.scheduledAt.toString()), 'HH:mm')}
                          </Text>
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={
                              followup.priority === 'high'
                                ? 'red'
                                : followup.priority === 'medium'
                                ? 'orange'
                                : 'gray'
                            }
                          >
                            {followup.priority?.toUpperCase()}
                          </Badge>
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={
                              followup.status === 'completed'
                                ? 'green'
                                : followup.status === 'cancelled'
                                ? 'red'
                                : 'orange'
                            }
                          >
                            {followup.status?.toUpperCase()}
                          </Badge>
                        </Td>
                        <Td maxW="200px" isTruncated>
                          {followup.notes || '-'}
                        </Td>
                        <Td>{followup.lead?.assignedTo?.name || 'Unassigned'}</Td>
                        <Td>
                          {followup.status === 'pending' && (
                            <HStack spacing={1}>
                              <IconButton
                                aria-label="Schedule Again"
                                icon={<HiClock />}
                                size="sm"
                                colorScheme="blue"
                                variant="ghost"
                                title="Schedule Another Follow-up"
                                onClick={() => router.push(`/dashboard/leads/${followup.lead.id}/followup`)}
                              />
                              <IconButton
                                aria-label="Make Call"
                                icon={<HiPhone />}
                                size="sm"
                                colorScheme="green"
                                variant="ghost"
                                title="Make Call Now"
                                onClick={() => router.push(`/dashboard/leads/${followup.lead.id}/call`)}
                              />
                              <Menu>
                                <MenuButton
                                  as={IconButton}
                                  icon={<HiDotsVertical />}
                                  variant="ghost"
                                  size="sm"
                                />
                                <MenuList>
                                  <MenuItem
                                    icon={<HiCheckCircle />}
                                    onClick={() => handleComplete(followup.id)}
                                  >
                                    Mark Complete
                                  </MenuItem>
                                  <MenuItem
                                    icon={<HiXCircle />}
                                    onClick={() => handleCancel(followup.id)}
                                  >
                                    Cancel
                                  </MenuItem>
                                </MenuList>
                              </Menu>
                            </HStack>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </Box>
          )}

          {/* Upcoming Table */}
          {categorizedFollowups.upcoming.length > 0 && (
            <Box>
              <HStack mb={4} p={3} bg="gray.50" borderRadius="md" borderLeft="4px solid" borderColor="gray.400">
                <Text fontSize="lg" fontWeight="bold" color="gray.700">
                  📋 UPCOMING ({categorizedFollowups.upcoming.length})
                </Text>
              </HStack>
              <Box bg="white" borderRadius="lg" boxShadow="sm" overflow="hidden">
                <Table variant="simple">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th>Lead Name</Th>
                      <Th>Phone</Th>
                      <Th>Scheduled For</Th>
                      <Th>Priority</Th>
                      <Th>Status</Th>
                      <Th>Notes</Th>
                      <Th>Assigned To</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {categorizedFollowups.upcoming.map((followup) => (
                      <Tr key={followup.id} _hover={{ bg: 'gray.50' }}>
                        <Td
                          fontWeight="medium"
                          color="blue.600"
                          cursor="pointer"
                          onClick={() => router.push(`/dashboard/leads/${followup.lead.id}`)}
                        >
                          {followup.lead?.name || 'N/A'}
                        </Td>
                        <Td>{followup.lead?.phone || '-'}</Td>
                        <Td>
                          {format(parseISO(followup.scheduledAt.toString()), 'MMM dd, yyyy HH:mm')}
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={
                              followup.priority === 'high'
                                ? 'red'
                                : followup.priority === 'medium'
                                ? 'orange'
                                : 'gray'
                            }
                          >
                            {followup.priority?.toUpperCase()}
                          </Badge>
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={
                              followup.status === 'completed'
                                ? 'green'
                                : followup.status === 'cancelled'
                                ? 'red'
                                : 'orange'
                            }
                          >
                            {followup.status?.toUpperCase()}
                          </Badge>
                        </Td>
                        <Td maxW="200px" isTruncated>
                          {followup.notes || '-'}
                        </Td>
                        <Td>{followup.lead?.assignedTo?.name || 'Unassigned'}</Td>
                        <Td>
                          {followup.status === 'pending' && (
                            <HStack spacing={1}>
                              <IconButton
                                aria-label="Schedule Again"
                                icon={<HiClock />}
                                size="sm"
                                colorScheme="blue"
                                variant="ghost"
                                title="Schedule Another Follow-up"
                                onClick={() => router.push(`/dashboard/leads/${followup.lead.id}/followup`)}
                              />
                              <IconButton
                                aria-label="Make Call"
                                icon={<HiPhone />}
                                size="sm"
                                colorScheme="green"
                                variant="ghost"
                                title="Make Call Now"
                                onClick={() => router.push(`/dashboard/leads/${followup.lead.id}/call`)}
                              />
                              <Menu>
                                <MenuButton
                                  as={IconButton}
                                  icon={<HiDotsVertical />}
                                  variant="ghost"
                                  size="sm"
                                />
                                <MenuList>
                                  <MenuItem
                                    icon={<HiCheckCircle />}
                                    onClick={() => handleComplete(followup.id)}
                                  >
                                    Mark Complete
                                  </MenuItem>
                                  <MenuItem
                                    icon={<HiXCircle />}
                                    onClick={() => handleCancel(followup.id)}
                                  >
                                    Cancel
                                  </MenuItem>
                                </MenuList>
                              </Menu>
                            </HStack>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </Box>
          )}

          {/* No Follow-ups */}
          {followups.length === 0 && (
            <Box bg="white" borderRadius="lg" boxShadow="sm" p={8} textAlign="center">
              <Text color="gray.500">No follow-ups found</Text>
            </Box>
          )}
        </VStack>
      ) : (
        <VStack align="stretch" spacing={6}>
          {/* Overdue Section */}
          {categorizedFollowups.overdue.length > 0 && (
            <Box>
              <HStack mb={4} p={3} bg="red.50" borderRadius="md" borderLeft="4px solid" borderColor="red.500">
                <Text fontSize="lg" fontWeight="bold" color="red.700">
                  🔴 OVERDUE ({categorizedFollowups.overdue.length})
                </Text>
              </HStack>
              <Box
                display="grid"
                gridTemplateColumns={{ base: '1fr', md: '1fr 1fr', lg: 'repeat(3, 1fr)' }}
                gap={4}
              >
                {categorizedFollowups.overdue.map((followup) => (
                  <Card
                    key={followup.id}
                    borderLeft="4px solid"
                    borderColor="red.500"
                    bg="red.50"
                    _hover={{ boxShadow: 'lg', transform: 'translateY(-2px)' }}
                    transition="all 0.2s"
                  >
                    <CardBody>
                      <VStack align="stretch" spacing={3}>
                        <HStack justify="space-between" align="start">
                          <Text
                            fontWeight="bold"
                            fontSize="lg"
                            color="red.700"
                            cursor="pointer"
                            onClick={() => router.push(`/dashboard/leads/${followup.lead.id}`)}
                            _hover={{ textDecoration: 'underline' }}
                            flex="1"
                          >
                            {followup.lead?.name || 'N/A'}
                          </Text>
                          {followup.status === 'pending' && (
                            <HStack spacing={1}>
                              <IconButton
                                aria-label="Schedule Again"
                                icon={<HiClock />}
                                size="sm"
                                colorScheme="blue"
                                variant="ghost"
                                title="Schedule Another Follow-up"
                                onClick={() => router.push(`/dashboard/leads/${followup.lead.id}/followup`)}
                              />
                              <IconButton
                                aria-label="Make Call"
                                icon={<HiPhone />}
                                size="sm"
                                colorScheme="green"
                                variant="ghost"
                                title="Make Call Now"
                                onClick={() => router.push(`/dashboard/leads/${followup.lead.id}/call`)}
                              />
                              <Menu>
                                <MenuButton
                                  as={IconButton}
                                  icon={<HiDotsVertical />}
                                  variant="ghost"
                                  size="sm"
                                />
                                <MenuList>
                                  <MenuItem
                                    icon={<HiCheckCircle />}
                                    onClick={() => handleComplete(followup.id)}
                                  >
                                    Mark Complete
                                  </MenuItem>
                                  <MenuItem
                                    icon={<HiXCircle />}
                                    onClick={() => handleCancel(followup.id)}
                                  >
                                    Cancel
                                  </MenuItem>
                                </MenuList>
                              </Menu>
                            </HStack>
                          )}
                        </HStack>
                        
                        <HStack spacing={2}>
                          <Badge colorScheme="red" fontSize="sm">
                            OVERDUE
                          </Badge>
                          <Badge
                            colorScheme={
                              followup.priority === 'high'
                                ? 'red'
                                : followup.priority === 'medium'
                                ? 'orange'
                                : 'gray'
                            }
                          >
                            {followup.priority?.toUpperCase()}
                          </Badge>
                        </HStack>
                        
                        <VStack align="stretch" spacing={2}>
                          <HStack>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.700" minW="100px">
                              Phone:
                            </Text>
                            <Text fontSize="sm" fontWeight="medium">{followup.lead?.phone || '-'}</Text>
                          </HStack>
                          
                          <HStack>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.700" minW="100px">
                              Due:
                            </Text>
                            <Text fontSize="sm" fontWeight="bold" color="red.600">
                              {format(parseISO(followup.scheduledAt.toString()), 'MMM dd, yyyy HH:mm')}
                            </Text>
                          </HStack>
                          
                          <HStack>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.700" minW="100px">
                              Assigned To:
                            </Text>
                            <Text fontSize="sm">{followup.lead?.assignedTo?.name || 'Unassigned'}</Text>
                          </HStack>
                          
                          {followup.notes && (
                            <Box mt={2} p={2} bg="white" borderRadius="md">
                              <Text fontSize="xs" fontWeight="semibold" color="gray.600">
                                Notes:
                              </Text>
                              <Text fontSize="sm" mt={1} noOfLines={2}>
                                {followup.notes}
                              </Text>
                            </Box>
                          )}
                        </VStack>
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </Box>
            </Box>
          )}

          {/* Today Section */}
          {categorizedFollowups.today.length > 0 && (
            <Box>
              <HStack mb={4} p={3} bg="green.50" borderRadius="md" borderLeft="4px solid" borderColor="green.500">
                <Text fontSize="lg" fontWeight="bold" color="green.700">
                  📅 TODAY ({categorizedFollowups.today.length})
                </Text>
              </HStack>
              <Box
                display="grid"
                gridTemplateColumns={{ base: '1fr', md: '1fr 1fr', lg: 'repeat(3, 1fr)' }}
                gap={4}
              >
                {categorizedFollowups.today.map((followup) => (
                  <Card
                    key={followup.id}
                    borderLeft="4px solid"
                    borderColor="green.500"
                    bg="green.50"
                    _hover={{ boxShadow: 'lg', transform: 'translateY(-2px)' }}
                    transition="all 0.2s"
                  >
                    <CardBody>
                      <VStack align="stretch" spacing={3}>
                        <HStack justify="space-between">
                          <Text
                            fontWeight="bold"
                            fontSize="lg"
                            color="green.700"
                            cursor="pointer"
                            onClick={() => router.push(`/dashboard/leads/${followup.lead.id}`)}
                            _hover={{ textDecoration: 'underline' }}
                          >
                            {followup.lead?.name || 'N/A'}
                          </Text>
                          {followup.status === 'pending' && (
                            <HStack spacing={1}>
                              <IconButton
                                aria-label="Schedule Again"
                                icon={<HiClock />}
                                size="sm"
                                colorScheme="blue"
                                variant="ghost"
                                title="Schedule Another Follow-up"
                                onClick={() => router.push(`/dashboard/leads/${followup.lead.id}/followup`)}
                              />
                              <IconButton
                                aria-label="Make Call"
                                icon={<HiPhone />}
                                size="sm"
                                colorScheme="green"
                                variant="ghost"
                                title="Make Call Now"
                                onClick={() => router.push(`/dashboard/leads/${followup.lead.id}/call`)}
                              />
                              <Menu>
                                <MenuButton
                                  as={IconButton}
                                  icon={<HiDotsVertical />}
                                  variant="ghost"
                                  size="sm"
                                />
                                <MenuList>
                                  <MenuItem
                                    icon={<HiCheckCircle />}
                                    onClick={() => handleComplete(followup.id)}
                                  >
                                    Mark Complete
                                  </MenuItem>
                                  <MenuItem
                                    icon={<HiXCircle />}
                                    onClick={() => handleCancel(followup.id)}
                                  >
                                    Cancel
                                  </MenuItem>
                                </MenuList>
                              </Menu>
                            </HStack>
                          )}
                        </HStack>
                        
                        <HStack spacing={2}>
                          <Badge colorScheme="green" fontSize="sm">
                            TODAY
                          </Badge>
                          <Badge
                            colorScheme={
                              followup.priority === 'high'
                                ? 'red'
                                : followup.priority === 'medium'
                                ? 'orange'
                                : 'gray'
                            }
                          >
                            {followup.priority?.toUpperCase()}
                          </Badge>
                        </HStack>
                        
                        <VStack align="stretch" spacing={2}>
                          <HStack>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.700" minW="100px">
                              Phone:
                            </Text>
                            <Text fontSize="sm" fontWeight="medium">{followup.lead?.phone || '-'}</Text>
                          </HStack>
                          
                          <HStack>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.700" minW="100px">
                              Time:
                            </Text>
                            <Text fontSize="sm" fontWeight="bold" color="green.600">
                              {format(parseISO(followup.scheduledAt.toString()), 'HH:mm')}
                            </Text>
                          </HStack>
                          
                          <HStack>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.700" minW="100px">
                              Assigned To:
                            </Text>
                            <Text fontSize="sm">{followup.lead?.assignedTo?.name || 'Unassigned'}</Text>
                          </HStack>
                          
                          {followup.notes && (
                            <Box mt={2} p={2} bg="white" borderRadius="md">
                              <Text fontSize="xs" fontWeight="semibold" color="gray.600">
                                Notes:
                              </Text>
                              <Text fontSize="sm" mt={1} noOfLines={2}>
                                {followup.notes}
                              </Text>
                            </Box>
                          )}
                        </VStack>
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </Box>
            </Box>
          )}

          {/* Tomorrow Section */}
          {categorizedFollowups.tomorrow.length > 0 && (
            <Box>
              <HStack mb={4} p={3} bg="blue.50" borderRadius="md" borderLeft="4px solid" borderColor="blue.500">
                <Text fontSize="lg" fontWeight="bold" color="blue.700">
                  📆 TOMORROW ({categorizedFollowups.tomorrow.length})
                </Text>
              </HStack>
              <Box
                display="grid"
                gridTemplateColumns={{ base: '1fr', md: '1fr 1fr', lg: 'repeat(3, 1fr)' }}
                gap={4}
              >
                {categorizedFollowups.tomorrow.map((followup) => (
                  <Card
                    key={followup.id}
                    borderLeft="4px solid"
                    borderColor="blue.500"
                    _hover={{ boxShadow: 'md', transform: 'translateY(-2px)' }}
                    transition="all 0.2s"
                  >
                    <CardBody>
                      <VStack align="stretch" spacing={3}>
                        <HStack justify="space-between" align="start">
                          <Text
                            fontWeight="bold"
                            fontSize="lg"
                            color="blue.600"
                            cursor="pointer"
                            onClick={() => router.push(`/dashboard/leads/${followup.lead.id}`)}
                            _hover={{ textDecoration: 'underline' }}
                            flex="1"
                          >
                            {followup.lead?.name || 'N/A'}
                          </Text>
                          {followup.status === 'pending' && (
                            <HStack spacing={1}>
                              <IconButton
                                aria-label="Schedule Again"
                                icon={<HiClock />}
                                size="sm"
                                colorScheme="blue"
                                variant="ghost"
                                title="Schedule Another Follow-up"
                                onClick={() => router.push(`/dashboard/leads/${followup.lead.id}/followup`)}
                              />
                              <IconButton
                                aria-label="Make Call"
                                icon={<HiPhone />}
                                size="sm"
                                colorScheme="green"
                                variant="ghost"
                                title="Make Call Now"
                                onClick={() => router.push(`/dashboard/leads/${followup.lead.id}/call`)}
                              />
                              <Menu>
                                <MenuButton
                                  as={IconButton}
                                  icon={<HiDotsVertical />}
                                  variant="ghost"
                                  size="sm"
                                />
                                <MenuList>
                                  <MenuItem
                                    icon={<HiCheckCircle />}
                                    onClick={() => handleComplete(followup.id)}
                                  >
                                    Mark Complete
                                  </MenuItem>
                                  <MenuItem
                                    icon={<HiXCircle />}
                                    onClick={() => handleCancel(followup.id)}
                                  >
                                    Cancel
                                  </MenuItem>
                                </MenuList>
                              </Menu>
                            </HStack>
                          )}
                        </HStack>
                        
                        <HStack spacing={2}>
                          <Badge colorScheme="blue" fontSize="sm">
                            TOMORROW
                          </Badge>
                          <Badge
                            colorScheme={
                              followup.priority === 'high'
                                ? 'red'
                                : followup.priority === 'medium'
                                ? 'orange'
                                : 'gray'
                            }
                          >
                            {followup.priority?.toUpperCase()}
                          </Badge>
                        </HStack>
                        
                        <VStack align="stretch" spacing={2}>
                          <HStack>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.600" minW="100px">
                              Phone:
                            </Text>
                            <Text fontSize="sm">{followup.lead?.phone || '-'}</Text>
                          </HStack>
                          
                          <HStack>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.600" minW="100px">
                              Time:
                            </Text>
                            <Text fontSize="sm" fontWeight="bold" color="blue.600">
                              {format(parseISO(followup.scheduledAt.toString()), 'HH:mm')}
                            </Text>
                          </HStack>
                          
                          <HStack>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.600" minW="100px">
                              Assigned To:
                            </Text>
                            <Text fontSize="sm">{followup.lead?.assignedTo?.name || 'Unassigned'}</Text>
                          </HStack>
                          
                          {followup.notes && (
                            <Box mt={2}>
                              <Text fontSize="xs" fontWeight="semibold" color="gray.600">
                                Notes:
                              </Text>
                              <Text fontSize="sm" mt={1} noOfLines={2}>
                                {followup.notes}
                              </Text>
                            </Box>
                          )}
                        </VStack>
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </Box>
            </Box>
          )}

          {/* Upcoming Section */}
          {categorizedFollowups.upcoming.length > 0 && (
            <Box>
              <HStack mb={4} p={3} bg="gray.50" borderRadius="md" borderLeft="4px solid" borderColor="gray.400">
                <Text fontSize="lg" fontWeight="bold" color="gray.700">
                  📋 UPCOMING ({categorizedFollowups.upcoming.length})
                </Text>
              </HStack>
              <Box
                display="grid"
                gridTemplateColumns={{ base: '1fr', md: '1fr 1fr', lg: 'repeat(3, 1fr)' }}
                gap={4}
              >
                {categorizedFollowups.upcoming.map((followup) => (
                  <Card
                    key={followup.id}
                    _hover={{ boxShadow: 'md', transform: 'translateY(-2px)' }}
                    transition="all 0.2s"
                  >
                    <CardBody>
                      <VStack align="stretch" spacing={3}>
                        <HStack justify="space-between" align="start">
                          <Text
                            fontWeight="bold"
                            fontSize="lg"
                            color="blue.600"
                            cursor="pointer"
                            onClick={() => router.push(`/dashboard/leads/${followup.lead.id}`)}
                            _hover={{ textDecoration: 'underline' }}
                            flex="1"
                          >
                            {followup.lead?.name || 'N/A'}
                          </Text>
                          {followup.status === 'pending' && (
                            <HStack spacing={1}>
                              <IconButton
                                aria-label="Schedule Again"
                                icon={<HiClock />}
                                size="sm"
                                colorScheme="blue"
                                variant="ghost"
                                title="Schedule Another Follow-up"
                                onClick={() => router.push(`/dashboard/leads/${followup.lead.id}/followup`)}
                              />
                              <IconButton
                                aria-label="Make Call"
                                icon={<HiPhone />}
                                size="sm"
                                colorScheme="green"
                                variant="ghost"
                                title="Make Call Now"
                                onClick={() => router.push(`/dashboard/leads/${followup.lead.id}/call`)}
                              />
                              <Menu>
                                <MenuButton
                                  as={IconButton}
                                  icon={<HiDotsVertical />}
                                  variant="ghost"
                                  size="sm"
                                />
                                <MenuList>
                                  <MenuItem
                                    icon={<HiCheckCircle />}
                                    onClick={() => handleComplete(followup.id)}
                                  >
                                    Mark Complete
                                  </MenuItem>
                                  <MenuItem
                                    icon={<HiXCircle />}
                                    onClick={() => handleCancel(followup.id)}
                                  >
                                    Cancel
                                  </MenuItem>
                                </MenuList>
                              </Menu>
                            </HStack>
                          )}
                        </HStack>
                        
                        <HStack spacing={2}>
                          <Badge
                            colorScheme={
                              followup.priority === 'high'
                                ? 'red'
                                : followup.priority === 'medium'
                                ? 'orange'
                                : 'gray'
                            }
                          >
                            {followup.priority?.toUpperCase()}
                          </Badge>
                        </HStack>
                        
                        <VStack align="stretch" spacing={2}>
                          <HStack>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.600" minW="100px">
                              Phone:
                            </Text>
                            <Text fontSize="sm">{followup.lead?.phone || '-'}</Text>
                          </HStack>
                          
                          <HStack>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.600" minW="100px">
                              Scheduled:
                            </Text>
                            <Text fontSize="sm">
                              {format(parseISO(followup.scheduledAt.toString()), 'MMM dd, yyyy HH:mm')}
                            </Text>
                          </HStack>
                          
                          <HStack>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.600" minW="100px">
                              Assigned To:
                            </Text>
                            <Text fontSize="sm">{followup.lead?.assignedTo?.name || 'Unassigned'}</Text>
                          </HStack>
                          
                          {followup.notes && (
                            <Box mt={2}>
                              <Text fontSize="xs" fontWeight="semibold" color="gray.600">
                                Notes:
                              </Text>
                              <Text fontSize="sm" mt={1} noOfLines={2}>
                                {followup.notes}
                              </Text>
                            </Box>
                          )}
                        </VStack>
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </Box>
            </Box>
          )}

          {/* No Follow-ups */}
          {followups.length === 0 && (
            <Box bg="white" borderRadius="lg" boxShadow="sm" p={8} textAlign="center">
              <Text color="gray.500">No follow-ups found</Text>
            </Box>
          )}
        </VStack>
      )}
    </Box>
  );
}
