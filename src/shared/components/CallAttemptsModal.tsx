'use client';

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  VStack,
  Text,
  Spinner,
  Box,
  HStack,
} from '@chakra-ui/react';
import { useEffect } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/shared/lib/swr';
import { formatDate, formatTime, formatDateTime } from '@/shared/lib/date-utils';

interface CallAttempt {
  id: string;
  attemptNumber: number;
  startedAt: Date;
  endedAt: Date | null;
  duration: number | null;
  callStatus: string | null;
  remarks: string | null;
  caller: {
    name: string;
    email: string;
    role: {
      name: string;
    };
  };
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  status: string;
}

interface AttemptsResponse {
  success: boolean;
  data: {
    lead: Lead;
    attempts: CallAttempt[];
    totalAttempts: number;
  };
}

interface CallAttemptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
}

export default function CallAttemptsModal({
  isOpen,
  onClose,
  leadId,
  leadName,
}: CallAttemptsModalProps) {
  const { data: response, isLoading, error } = useSWR<AttemptsResponse>(
    isOpen && leadId ? `/api/calls/lead/${leadId}` : null,
    fetcher
  );

  const attempts = response?.data?.attempts || [];
  const lead = response?.data?.lead;

  const getStatusColor = (status: string | null) => {
    const colors: Record<string, string> = {
      answered: 'green',
      not_answered: 'red',
      busy: 'orange',
      invalid: 'gray',
    };
    return colors[status || ''] || 'gray';
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          Call Attempts - {leadName}
          {lead && (
            <Text fontSize="sm" fontWeight="normal" color="gray.600" mt={1}>
              Phone: {lead.phone}
            </Text>
          )}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {isLoading ? (
            <VStack py={8}>
              <Spinner size="lg" color="blue.500" />
              <Text color="gray.600">Loading call attempts...</Text>
            </VStack>
          ) : error ? (
            <VStack py={8}>
              <Text color="red.500" fontWeight="bold">
                Error loading attempts
              </Text>
              <Text color="gray.600" fontSize="sm">
                {error?.message || 'Failed to fetch data'}
              </Text>
            </VStack>
          ) : attempts.length === 0 ? (
            <VStack py={8}>
              <Text color="gray.500" fontSize="lg">
                No call attempts found
              </Text>
            </VStack>
          ) : (
            <Box>
              {/* Summary */}
              <HStack
                bg="blue.50"
                p={3}
                borderRadius="md"
                mb={4}
                justify="space-between"
              >
                <Text fontSize="sm" fontWeight="medium" color="blue.800">
                  Total Attempts: <strong>{attempts.length}</strong>
                </Text>
                <Badge colorScheme="blue">
                  Latest: {attempts.length > 0 && attempts[attempts.length - 1] ? formatDateTime(attempts[attempts.length - 1]!.startedAt) : 'N/A'}
                </Badge>
              </HStack>

              {/* Attempts Table */}
              <Box overflowX="auto">
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Attempt #</Th>
                      <Th>Status</Th>
                      <Th>Date & Time</Th>
                      <Th>Duration</Th>
                      <Th>Called By</Th>
                      <Th>Remarks</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {attempts.map((attempt) => (
                      <Tr key={attempt.id}>
                        <Td fontWeight="bold">#{attempt.attemptNumber}</Td>
                        <Td>
                          {attempt.callStatus ? (
                            <Badge colorScheme={getStatusColor(attempt.callStatus)}>
                              {attempt.callStatus.replace('_', ' ').toUpperCase()}
                            </Badge>
                          ) : (
                            <Text color="gray.400">-</Text>
                          )}
                        </Td>
                        <Td fontSize="sm">
                          {formatDate(attempt.startedAt)}
                          <br />
                          <Text as="span" color="gray.600" fontSize="xs">
                            {formatTime(attempt.startedAt)}
                          </Text>
                        </Td>
                        <Td>{formatDuration(attempt.duration)}</Td>
                        <Td>
                          <Text fontSize="sm" fontWeight="medium">
                            {attempt.caller.name}
                          </Text>
                          <Text fontSize="xs" color="gray.600">
                            {attempt.caller.role.name}
                          </Text>
                        </Td>
                        <Td maxW="250px" fontSize="sm">
                          {attempt.remarks ? (
                            <Text noOfLines={2}>{attempt.remarks}</Text>
                          ) : (
                            <Text color="gray.400">No remarks</Text>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </Box>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}





