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
import { Lead } from '@/shared/types';
import QuickActionsMenu from './QuickActionsMenu';

interface LeadTileProps {
  lead: Lead;
  userRole?: string;
  onAssign?: (lead: { id: string; name: string }) => void;
  onConvertUnreachable?: (lead: { id: string; name: string }) => void;
  onConvertUnqualified?: (lead: { id: string; name: string }) => void;
  onMarkAsWon?: (lead: { id: string; name: string }) => void;
  onMarkAsLost?: (lead: { id: string; name: string }) => void;
  onLogCall?: (lead: { id: string; name: string; phone: string }) => void;
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    new: 'blue',        // New = Blue
    contacted: 'purple',
    qualified: 'cyan',
    followup: 'orange', // Follow-up = Amber (orange)
    won: 'green',       // Won = Green
    lost: 'red',        // Lost = Red
    unreach: 'pink',    // Unreachable = Pink
    unqualified: 'purple', // Unqualified = Magenta (purple closest to magenta)
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
  onMarkAsWon,
  onMarkAsLost,
  onLogCall,
}: LeadTileProps) {
  return (
    <Box
      bg="white"
      p={{ base: 3, md: 4 }}
      borderRadius="lg"
      boxShadow="sm"
      _hover={{ boxShadow: 'md', transform: 'translateY(-2px)' }}
      transition="all 0.2s"
      border="1px solid"
      borderColor="gray.200"
    >
      <Flex justify="space-between" align="start" mb={3} gap={2} direction={{ base: 'column', sm: 'row' }}>
        <HStack spacing={{ base: 2, md: 3 }} align="flex-start" flex="1" minW="0">
          <Avatar name={lead.name} size={{ base: 'sm', md: 'md' }} />
          <VStack align="start" spacing={0} flex="1" minW="0">
            <Text fontWeight="bold" fontSize={{ base: 'sm', md: 'lg' }} noOfLines={1}>
              {lead.name}
            </Text>
            <HStack spacing={2} mt={1} flexWrap="wrap">
              <Badge colorScheme={getStatusColor(lead.status)} fontSize="xs">
                {lead.status.toUpperCase()}
              </Badge>
              <Badge colorScheme={getPriorityColor(lead.priority)} fontSize="xs" variant="subtle">
                {lead.priority.toUpperCase()}
              </Badge>
              {lead.callAttempts > 0 && (
                <Tooltip label={`${lead.callAttempts} call attempt${lead.callAttempts !== 1 ? 's' : ''}`}>
                  <Badge 
                    colorScheme={lead.callAttempts >= 7 ? 'red' : lead.callAttempts >= 4 ? 'orange' : 'blue'} 
                    fontSize="xs"
                    variant="solid"
                  >
                    📞 {lead.callAttempts}
                  </Badge>
                </Tooltip>
              )}
            </HStack>
          </VStack>
        </HStack>
        <QuickActionsMenu
          lead={lead}
          userRole={userRole}
          onAssign={onAssign}
          onConvertUnreachable={onConvertUnreachable}
          onConvertUnqualified={onConvertUnqualified}
          onMarkAsWon={onMarkAsWon}
          onMarkAsLost={onMarkAsLost}
          onLogCall={onLogCall}
        />
      </Flex>

      <VStack align="start" spacing={2}>
        {lead.phone && (
          <HStack spacing={2}>
            <HiPhone color="gray" size={14} />
            <Text fontSize={{ base: 'xs', md: 'sm' }} noOfLines={1}>{lead.phone}</Text>
          </HStack>
        )}
        {lead.email && (
          <HStack spacing={2}>
            <HiMail color="gray" size={14} />
            <Text fontSize={{ base: 'xs', md: 'sm' }} isTruncated maxW={{ base: '150px', md: '200px' }}>
              {lead.email}
            </Text>
          </HStack>
        )}
        {lead.city && (
          <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">
            📍 {lead.city}
          </Text>
        )}
      </VStack>

      <Flex justify="space-between" align="center" mt={4} pt={3} borderTop="1px solid" borderColor="gray.100" flexWrap="wrap" gap={2}>
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





