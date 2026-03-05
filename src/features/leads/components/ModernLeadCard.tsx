'use client';

import { memo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Badge,
  IconButton,
  HStack,
  VStack,
  Text,
  Tooltip,
  Flex,
  Icon,
  Divider,
} from '@chakra-ui/react';
import {
  HiPhone,
  HiMail,
  HiPencil,
  HiRefresh,
  HiEye,
  HiClock,
  HiUser,
  HiExclamation,
} from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import { MdCampaign, MdSource } from 'react-icons/md';
import type { CallLog, Lead } from '@/shared/types';
import { formatPhoneForDisplay } from '@/shared/utils/phone';
import { isValidWhatsAppPhone } from '@/shared/utils/whatsapp';
import { formatDateTime } from '@/shared/lib/date-utils';

interface ModernLeadCardProps {
  lead: Lead;
  followUp?: any;
  lastCall?: CallLog | null;
  onCallClick: () => void;
  onWhatsAppClick: (e: React.MouseEvent) => void;
  onChangeStatusClick: (e: React.MouseEvent) => void;
  onAssignClick: (e: React.MouseEvent) => void;
  onViewClick?: () => void;
  getStatusBadgeColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
  LeadAgeComponent: React.ComponentType<{ createdAt: string | Date }>;
  CallRemarksComponent: React.ComponentType<{ callLogs: CallLog[] }>;
}

const ModernLeadCard = memo(({
  lead,
  followUp,
  lastCall,
  onCallClick,
  onWhatsAppClick,
  onChangeStatusClick,
  onAssignClick,
  onViewClick,
  getStatusBadgeColor,
  getStatusLabel,
  LeadAgeComponent,
  CallRemarksComponent,
}: ModernLeadCardProps) => {
  const router = useRouter();

  // Determine if follow-up is overdue
  const isOverdue = followUp && new Date(followUp.scheduledAt) < new Date();
  const isDueToday = followUp && !isOverdue;

  return (
    <Box
      bg="white"
      borderRadius="md"
      boxShadow="sm"
      overflow="hidden"
      border="1px solid"
      borderColor="gray.200"
      _hover={{ boxShadow: 'md', transform: 'translateY(-1px)' }}
      transition="all 0.2s"
      position="relative"
    >
      {/* Colored left border indicator */}
      <Box
        position="absolute"
        left={0}
        top={0}
        bottom={0}
        width="3px"
        bg={
          lead.status === 'won'
            ? 'green.500'
            : lead.status === 'lost'
            ? 'red.500'
            : isOverdue
            ? 'red.500'
            : lead.status === 'followup'
            ? 'orange.500'
            : 'blue.500'
        }
      />

      <Box p={{ base: 2, md: 2.5 }} pl={{ base: 3, md: 3.5 }}>
        {/* HEADER SECTION */}
        <Flex justify="space-between" align="flex-start" mb={2} gap={1.5}>
          <HStack spacing={1.5} flex="1" minW={0}>
            <Text
              fontWeight="bold"
              fontSize={{ base: 'sm', md: 'md' }}
              color={lead.is_existing ? 'green.600' : 'blue.700'}
              cursor="pointer"
              onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
              _hover={{ textDecoration: 'underline', color: 'blue.600' }}
              noOfLines={1}
            >
              {lead.name}
            </Text>
            <Badge
              colorScheme={getStatusBadgeColor(lead.status)}
              fontSize="2xs"
              px={1.5}
              py={0.5}
              borderRadius="sm"
            >
              {getStatusLabel(lead.status)}
            </Badge>
            {lead.callAttempts > 0 && (
              <Tooltip label={`${lead.callAttempts} call attempt${lead.callAttempts !== 1 ? 's' : ''}`}>
                <Badge
                  colorScheme={lead.callAttempts > 6 ? 'red' : lead.callAttempts > 3 ? 'orange' : 'blue'}
                  fontSize="2xs"
                  px={1.5}
                  py={0.5}
                  borderRadius="sm"
                  display={{ base: 'none', sm: 'inline-flex' }}
                >
                  📞 {lead.callAttempts}
                </Badge>
              </Tooltip>
            )}
          </HStack>

          {/* Action Buttons */}
          <HStack spacing={0.5} flexShrink={0}>
            <Tooltip label="Call" placement="top">
              <IconButton
                aria-label="Call"
                icon={<HiPhone />}
                size="xs"
                colorScheme="green"
                variant="ghost"
                onClick={onCallClick}
              />
            </Tooltip>
            <Tooltip
              label={isValidWhatsAppPhone(lead.phone) ? 'Send WhatsApp' : 'Invalid phone number'}
              placement="top"
            >
              <IconButton
                aria-label="WhatsApp"
                icon={<FaWhatsapp />}
                size="xs"
                colorScheme="whatsapp"
                variant="ghost"
                isDisabled={!isValidWhatsAppPhone(lead.phone)}
                onClick={onWhatsAppClick}
              />
            </Tooltip>
            <Tooltip label="Change Status" placement="top">
              <IconButton
                aria-label="Change Status"
                icon={<HiRefresh />}
                size="xs"
                colorScheme="purple"
                variant="ghost"
                onClick={onChangeStatusClick}
              />
            </Tooltip>
            {onViewClick && (
              <Tooltip label="View Details" placement="top">
                <IconButton
                  aria-label="View"
                  icon={<HiEye />}
                  size="xs"
                  colorScheme="blue"
                  variant="ghost"
                  onClick={onViewClick}
                />
              </Tooltip>
            )}
          </HStack>
        </Flex>

        {/* CONTACT INFO SECTION - Compact Icon-based Rows */}
        <VStack align="stretch" spacing={1} mb={2}>
          {lead.phone && (
            <HStack spacing={1.5} fontSize="xs">
              <Icon as={HiPhone} color="gray.500" boxSize={3} />
              <Text color="gray.700" fontWeight="medium">
                {formatPhoneForDisplay(lead.phone)}
              </Text>
            </HStack>
          )}
          {lead.email && (
            <HStack spacing={1.5} fontSize="xs">
              <Icon as={HiMail} color="gray.500" boxSize={3} />
              <Text color="gray.700" isTruncated>
                {lead.email}
              </Text>
            </HStack>
          )}
          {lead.campaign && (
            <HStack spacing={1.5} fontSize="xs">
              <Icon as={MdCampaign} color="gray.500" boxSize={3} />
              <Text color="gray.700" isTruncated>
                Campaign: {lead.campaign}
              </Text>
            </HStack>
          )}
          {lead.source && (
            <HStack spacing={1.5} fontSize="xs">
              <Icon as={MdSource} color="gray.500" boxSize={3} />
              <Text color="gray.700" isTruncated>
                Source: {lead.source}
              </Text>
            </HStack>
          )}
        </VStack>

        <Divider my={2} />

        {/* INFO SECTION - Single Row Layout */}
        <Flex justify="space-between" flexWrap="wrap" gap={2} mb={2} fontSize="2xs">
          {/* Lead Age */}
          <Box flex="1" minW="80px">
            <Text color="gray.600" mb={0.5}>Lead Age</Text>
            <LeadAgeComponent createdAt={lead.createdAt} />
          </Box>

          {/* Assigned To */}
          <Box flex="1" minW="100px">
            <Text color="gray.600" mb={0.5}>Assigned To</Text>
            <HStack spacing={0.5}>
              <Icon as={HiUser} color="gray.500" boxSize={2.5} />
              <Text color="gray.700" fontWeight="medium" isTruncated maxW="80px">
                {lead.assignedTo?.name || 'Unassigned'}
              </Text>
              <IconButton
                aria-label="Change assignment"
                icon={<HiPencil />}
                size="xs"
                variant="ghost"
                colorScheme="blue"
                onClick={onAssignClick}
                minW="auto"
                h="auto"
                p={0.5}
              />
            </HStack>
          </Box>

          {/* Calls Count */}
          <Box flex="0.8" minW="70px">
            <Text color="gray.600" mb={0.5}>Calls</Text>
            {lead.callAttempts > 0 ? (
              <Badge colorScheme={lead.callAttempts > 6 ? 'red' : lead.callAttempts > 3 ? 'orange' : 'blue'} fontSize="2xs">
                {lead.callAttempts} CALLS
              </Badge>
            ) : (
              <Text color="gray.500">-</Text>
            )}
          </Box>

          {/* Last Call */}
          <Box flex="1.2" minW="110px">
            <Text color="gray.600" mb={0.5}>Last Call</Text>
            {lastCall ? (
              <VStack align="flex-start" spacing={0.5}>
                <Text color="gray.600" fontSize="2xs">
                  {formatDateTime(lastCall.createdAt)}
                </Text>
                <Badge
                  colorScheme={
                    lastCall.callStatus === 'completed'
                      ? 'green'
                      : lastCall.callStatus === 'busy'
                      ? 'red'
                      : 'orange'
                  }
                  fontSize="2xs"
                >
                  {lastCall.callStatus === 'ring_not_response'
                    ? 'NO ANSWER'
                    : (lastCall.callStatus || '').toUpperCase()}
                </Badge>
              </VStack>
            ) : (
              <Text color="gray.500">-</Text>
            )}
          </Box>
        </Flex>

        {/* FOLLOW-UP SECTION - Highlighted if exists */}
        {followUp && (
          <Box
            bg={isOverdue ? 'red.50' : 'orange.50'}
            borderRadius="sm"
            p={2}
            mb={2}
            border="1px solid"
            borderColor={isOverdue ? 'red.200' : 'orange.200'}
          >
            <HStack spacing={1.5} mb={1}>
              <Icon as={HiExclamation} color={isOverdue ? 'red.600' : 'orange.600'} boxSize={3} />
              <Text fontSize="xs" fontWeight="bold" color={isOverdue ? 'red.700' : 'orange.700'}>
                {isOverdue ? 'Overdue Follow-up' : 'Follow-up Scheduled'}
              </Text>
            </HStack>
            <VStack align="stretch" spacing={0.5}>
              <HStack spacing={1.5} flexWrap="wrap">
                <Badge colorScheme={isOverdue ? 'red' : 'orange'} fontSize="2xs">
                  {formatDateTime(followUp.scheduledAt)}
                </Badge>
                {isDueToday && (
                  <Badge colorScheme="blue" fontSize="2xs">
                    Due Today
                  </Badge>
                )}
              </HStack>
              {followUp.notes && (
                <Text fontSize="2xs" color="gray.700" mt={0.5}>
                  {followUp.notes}
                </Text>
              )}
            </VStack>
          </Box>
        )}

        {/* FOOTER SECTION - Origin & Last Edit */}
        <Flex
          justify="space-between"
          align="center"
          fontSize="2xs"
          color="gray.500"
          mb={2}
          flexWrap="wrap"
          gap={1.5}
        >
          <HStack spacing={0.5}>
            <Icon as={HiClock} boxSize={2.5} />
            <Text>Origin: {formatDateTime(lead.createdAt)}</Text>
          </HStack>
          {lead.status !== 'new' &&
            new Date(lead.updatedAt).getTime() !== new Date(lead.createdAt).getTime() && (
              <Text>Last Edit: {formatDateTime(lead.updatedAt)}</Text>
            )}
        </Flex>

        {/* CALL REMARKS SECTION */}
        <CallRemarksComponent callLogs={lead.CallLog || []} />

        {/* PRIMARY ACTION BUTTON - More prominent */}
        <Button
          leftIcon={<HiPhone />}
          colorScheme="green"
          size="sm"
          width="full"
          mt={2}
          onClick={onCallClick}
          fontSize="xs"
          h={8}
        >
          Call Now
        </Button>
      </Box>
    </Box>
  );
});

ModernLeadCard.displayName = 'ModernLeadCard';

export default ModernLeadCard;
