'use client';

import React, { useState } from 'react';
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
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';
import { FollowUp } from '@/types';
import { HiDotsVertical, HiCheckCircle, HiXCircle, HiViewGrid, HiViewList } from 'react-icons/hi';

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
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">Follow-ups</Heading>
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

      {viewMode === 'table' ? (
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
            {followups && followups.length > 0 ? (
              followups.map((followup) => (
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
                  <Td>{new Date(followup.scheduledAt).toLocaleString()}</Td>
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
              ))
            ) : (
              <Tr>
                <Td colSpan={8} textAlign="center" py={8}>
                  <Text color="gray.500">No follow-ups found</Text>
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Box>
      ) : (
        <Box>
          {followups && followups.length > 0 ? (
            <Box
              display="grid"
              gridTemplateColumns={{ base: '1fr', md: '1fr 1fr', lg: 'repeat(3, 1fr)' }}
              gap={4}
            >
              {followups.map((followup) => (
                <Card
                  key={followup.id}
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
                          onClick={() => router.push(`/dashboard/leads/${followup.lead.id}`)}
                          _hover={{ textDecoration: 'underline' }}
                        >
                          {followup.lead?.name || 'N/A'}
                        </Text>
                        {followup.status === 'pending' && (
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
                          <Text fontSize="sm">{new Date(followup.scheduledAt).toLocaleString()}</Text>
                        </HStack>
                        
                        <HStack>
                          <Text fontSize="sm" fontWeight="semibold" color="gray.600" minW="100px">
                            Assigned To:
                          </Text>
                          <Text fontSize="sm">{followup.lead?.assignedTo?.name || 'Unassigned'}</Text>
                        </HStack>
                        
                        {followup.notes && (
                          <Box mt={2}>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.600">
                              Notes:
                            </Text>
                            <Text fontSize="sm" mt={1} noOfLines={3}>
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
          ) : (
            <Box bg="white" borderRadius="lg" boxShadow="sm" p={8} textAlign="center">
              <Text color="gray.500">No follow-ups found</Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
