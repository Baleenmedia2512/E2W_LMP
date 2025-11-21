'use client';

import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Tooltip,
  Avatar,
  Flex,
  IconButton,
} from '@chakra-ui/react';
import { HiPhone, HiMail, HiClock } from 'react-icons/hi';
import { formatDistanceToNow } from 'date-fns';
import { Lead } from '@/types';
import QuickActionsMenu from './QuickActionsMenu';

interface LeadTileProps {
  lead: Lead;
  userRole?: string;
  onAssign?: (lead: { id: string; name: string }) => void;
  onConvertUnreachable?: (lead: { id: string; name: string }) => void;
  onConvertUnqualified?: (lead: { id: string; name: string }) => void;
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    new: 'blue',
    contacted: 'green',
    qualified: 'purple',
    followup: 'orange',
    won: 'green',
    lost: 'red',
    unreach: 'gray',
    unqualified: 'yellow',
  };
  return colors[status] || 'gray';
};

const getPriorityColor = (priority: string) => {
  const colors: Record<string, string> = {
    high: 'red',
    medium: 'yellow',
    low: 'green',
  };
  return colors[priority] || 'gray';
};

export default function LeadTile({
  lead,
  userRole,
  onAssign,
  onConvertUnreachable,
  onConvertUnqualified,
}: LeadTileProps) {
  return (
    <Box
      bg="white"
      p={4}
      borderRadius="lg"
      boxShadow="sm"
      _hover={{ boxShadow: 'md', transform: 'translateY(-2px)' }}
      transition="all 0.2s"
      border="1px solid"
      borderColor="gray.200"
    >
      <Flex justify="space-between" align="start" mb={3}>
        <HStack spacing={3}>
          <Avatar name={lead.name} size="md" />
          <VStack align="start" spacing={0}>
            <Text fontWeight="bold" fontSize="lg">
              {lead.name}
            </Text>
            <HStack spacing={2} mt={1}>
              <Badge colorScheme={getStatusColor(lead.status)} fontSize="xs">
                {lead.status.toUpperCase()}
              </Badge>
              <Badge colorScheme={getPriorityColor(lead.priority)} fontSize="xs" variant="subtle">
                {lead.priority.toUpperCase()}
              </Badge>
            </HStack>
          </VStack>
        </HStack>
        <QuickActionsMenu
          lead={lead}
          userRole={userRole}
          onAssign={onAssign}
          onConvertUnreachable={onConvertUnreachable}
          onConvertUnqualified={onConvertUnqualified}
        />
      </Flex>

      <VStack align="start" spacing={2}>
        {lead.phone && (
          <HStack spacing={2}>
            <HiPhone color="gray" />
            <Text fontSize="sm">{lead.phone}</Text>
          </HStack>
        )}
        {lead.email && (
          <HStack spacing={2}>
            <HiMail color="gray" />
            <Text fontSize="sm" isTruncated maxW="200px">
              {lead.email}
            </Text>
          </HStack>
        )}
        {lead.city && (
          <Text fontSize="sm" color="gray.600">
            📍 {lead.city}
          </Text>
        )}
      </VStack>

      <Flex justify="space-between" align="center" mt={4} pt={3} borderTop="1px solid" borderColor="gray.100">
        <HStack spacing={1}>
          <HiClock size={14} color="gray" />
          <Text fontSize="xs" color="gray.600">
            {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
          </Text>
        </HStack>
        {lead.assignedTo && (
          <Tooltip label={`Assigned to ${lead.assignedTo.name || lead.assignedTo.email}`}>
            <Avatar name={lead.assignedTo.name || lead.assignedTo.email} size="xs" />
          </Tooltip>
        )}
      </Flex>
    </Box>
  );
}
