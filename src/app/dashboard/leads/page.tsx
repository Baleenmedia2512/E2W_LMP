'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Button,
  Flex,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  IconButton,
  HStack,
  VStack,
  InputGroup,
  InputLeftElement,
  Input,
  Select,
  Text,
  useDisclosure,
  Divider,
  Stack,
  Icon,
} from '@chakra-ui/react';
import {
  HiPlus,
  HiDotsVertical,
  HiEye,
  HiPencil,
  HiPhone,
  HiClock,
  HiBan,
  HiX,
  HiUserAdd,
  HiSearch,
  HiViewList,
  HiViewGrid,
  HiViewBoards,
  HiExclamation,
} from 'react-icons/hi';
import AddLeadModal from '@/features/leads/components/AddLeadModal';
import AssignLeadModal from '@/features/leads/components/AssignLeadModal';
import ConvertToUnreachableModal from '@/features/leads/components/ConvertToUnreachableModal';
import ConvertToUnqualifiedModal from '@/features/leads/components/ConvertToUnqualifiedModal';
import CallDialerModal from '@/features/leads/components/CallDialerModal';
import { formatDate } from '@/shared/lib/date-utils';
import { categorizeAndSortLeads, formatTimeDifference } from '@/shared/lib/utils/lead-categorization';

type ViewMode = 'table' | 'tiles' | 'list' | 'categorized';

// Component to show elapsed time since lead creation
const LeadAge = ({ createdAt }: { createdAt: string | Date }) => {
  const [age, setAge] = useState('');

  useEffect(() => {
    const updateAge = () => {
      const now = new Date();
      const created = new Date(createdAt);
      const diffMs = now.getTime() - created.getTime();
      
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) {
        const hours = diffHours % 24;
        setAge(`${diffDays}d ${hours}h`);
      } else if (diffHours > 0) {
        const minutes = diffMinutes % 60;
        setAge(`${diffHours}h ${minutes}m`);
      } else {
        setAge(`${diffMinutes}m`);
      }
    };

    updateAge();
    const timer = setInterval(updateAge, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [createdAt]);

  return (
    <HStack spacing={1} fontSize="xs" color="gray.600">
      <Icon as={HiClock} />
      <Text>{age} old</Text>
    </HStack>
  );
};

// Lead management page with multiple view modes and categorization
export default function LeadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('categorized');
  const [selectedLead, setSelectedLead] = useState<{ id: string; name: string } | null>(null);
  const [leadToAssign, setLeadToAssign] = useState<{
    id: string;
    name: string;
    currentAssignee?: string;
  } | null>(null);
  const [leadToCall, setLeadToCall] = useState<{
    id: string;
    name: string;
    phone: string;
  } | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-refresh every minute to update overdue status
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Fetch leads and follow-ups from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [leadsRes, followUpsRes] = await Promise.all([
          fetch('/api/leads?limit=100'),
          fetch('/api/followups?limit=100'),
        ]);
        
        const leadsData = await leadsRes.json();
        const followUpsData = await followUpsRes.json();
        
        if (leadsData.success) {
          setLeads(leadsData.data);
        } else {
          setError(leadsData.error || 'Failed to fetch leads');
        }
        
        if (followUpsData.success) {
          setFollowUps(followUpsData.data);
        }
      } catch (err) {
        setError('Failed to fetch data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Modals
  const { isOpen: isAddLeadOpen, onOpen: onAddLeadOpen, onClose: onAddLeadClose } = useDisclosure();
  const { isOpen: isUnreachableOpen, onOpen: onUnreachableOpen, onClose: onUnreachableClose } = useDisclosure();
  const { isOpen: isUnqualifiedOpen, onOpen: onUnqualifiedOpen, onClose: onUnqualifiedClose } = useDisclosure();
  const { isOpen: isAssignOpen, onOpen: onAssignOpen, onClose: onAssignClose } = useDisclosure();
  const { isOpen: isCallDialerOpen, onOpen: onCallDialerOpen, onClose: onCallDialerClose } = useDisclosure();

  // Filter leads based on search
  const filteredLeads = useMemo(() => {
    let filtered = [...leads];

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

    return filtered;
  }, [searchQuery, leads]);

  // Categorize and sort leads for categorized view
  const categorizedLeads = useMemo(() => {
    return categorizeAndSortLeads(filteredLeads, followUps);
  }, [filteredLeads, followUps, currentTime]); // Re-calculate when time updates

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'blue';
      case 'followup':
        return 'orange';
      case 'contacted':
        return 'purple';
      case 'qualified':
        return 'cyan';
      case 'unreach':
        return 'pink';
      case 'unqualified':
        return 'purple';
      case 'won':
        return 'green';
      case 'lost':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <Box>
      <Flex
        justify="space-between"
        align={{ base: 'stretch', md: 'center' }}
        mb={6}
        direction={{ base: 'column', md: 'row' }}
        gap={{ base: 3, md: 0 }}
      >
        <Heading size={{ base: 'md', md: 'lg' }}>Leads</Heading>
        <Button
          size={{ base: 'sm', md: 'md' }}
          colorScheme="blue"
          leftIcon={<HiPlus />}
          onClick={onAddLeadOpen}
          width={{ base: 'full', sm: 'auto' }}
        >
          Add Lead
        </Button>
      </Flex>

      {error && (
        <Box bg="red.50" p={4} borderRadius="lg" mb={4} color="red.700">
          {error}
        </Box>
      )}

      {loading && (
        <Box textAlign="center" py={8}>
          <Text color="gray.500">Loading leads...</Text>
        </Box>
      )}

      {!loading && (
        <>
      {/* Search and View Toggle */}
      <Box bg="white" p={{ base: 3, md: 4 }} borderRadius="lg" boxShadow="sm" mb={4}>
        <VStack spacing={3} align="stretch">
          <Flex gap={3} direction={{ base: 'column', sm: 'row' }} align="stretch">
            <InputGroup flex="1">
              <InputLeftElement pointerEvents="none">
                <HiSearch />
              </InputLeftElement>
              <Input
                placeholder="Search name or phone number"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size={{ base: 'sm', md: 'md' }}
              />
            </InputGroup>
          </Flex>

          {/* View Toggle */}
          <HStack spacing={2} justify={{ base: 'center', md: 'flex-end' }} flexWrap="wrap">
            <IconButton
              aria-label="Categorized view"
              icon={<HiViewBoards />}
              size={{ base: 'sm', md: 'md' }}
              colorScheme={viewMode === 'categorized' ? 'blue' : 'gray'}
              variant={viewMode === 'categorized' ? 'solid' : 'ghost'}
              onClick={() => setViewMode('categorized')}
            />
            <IconButton
              aria-label="Table view"
              icon={<HiViewList />}
              size={{ base: 'sm', md: 'md' }}
              colorScheme={viewMode === 'table' ? 'blue' : 'gray'}
              variant={viewMode === 'table' ? 'solid' : 'ghost'}
              onClick={() => setViewMode('table')}
            />
            <IconButton
              aria-label="Tiles view"
              icon={<HiViewGrid />}
              size={{ base: 'sm', md: 'md' }}
              colorScheme={viewMode === 'tiles' ? 'blue' : 'gray'}
              variant={viewMode === 'tiles' ? 'solid' : 'ghost'}
              onClick={() => setViewMode('tiles')}
            />
          </HStack>
        </VStack>
      </Box>

      {viewMode === 'categorized' ? (
        /* Categorized View - Follow-up List with 3 Categories */
        <VStack spacing={6} align="stretch">
          {/* Overdue Follow-ups */}
          <Box>
            <Flex
              align="center"
              mb={4}
              p={{ base: 2, md: 3 }}
              bg="red.50"
              borderRadius="md"
              borderLeft="4px"
              borderColor="red.500"
              flexWrap="wrap"
              gap={2}
            >
              <HiExclamation size={24} color="red" />
              <Heading size={{ base: 'sm', md: 'md' }} ml={2} color="red.700">
                Overdue Follow-ups
              </Heading>
              <Badge ml={3} colorScheme="red" fontSize={{ base: 'sm', md: 'md' }}>
                {categorizedLeads.overdue.length}
              </Badge>
            </Flex>
            
            {categorizedLeads.overdue.length > 0 ? (
              <VStack spacing={3} align="stretch">
                {categorizedLeads.overdue.map(({ lead, followUp }) => {
                  const dueDate = followUp?.dueDate || followUp?.scheduledFor;
                  const timeDiff = dueDate ? formatTimeDifference(dueDate) : '';
                  
                  return (
                    <Box
                      key={lead.id}
                      bg="white"
                      borderRadius="lg"
                      boxShadow="sm"
                      p={{ base: 3, md: 4 }}
                      borderLeft="4px"
                      borderColor="red.500"
                      _hover={{ boxShadow: 'md' }}
                      transition="all 0.2s"
                    >
                      <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} flexWrap="wrap" gap={3} direction={{ base: 'column', sm: 'row' }}>
                        <Box flex="1" minW={{ base: 'full', sm: '200px' }}>
                          <Text
                            fontWeight="bold"
                            fontSize="lg"
                            color="blue.600"
                            cursor="pointer"
                            onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                            _hover={{ textDecoration: 'underline' }}
                          >
                            {lead.name}
                          </Text>
                          <Text fontSize="sm" color="gray.600">
                            {lead.phone} â€¢ {lead.email || 'No email'}
                          </Text>
                          <LeadAge createdAt={lead.createdAt} />
                          {followUp && (
                            <HStack mt={2} spacing={2} flexWrap="wrap">
                              <Badge colorScheme="red" fontSize={{ base: 'xs', md: 'sm' }}>
                                Overdue by {timeDiff}
                              </Badge>
                              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.500">
                                Due: {dueDate ? formatDate(dueDate) : 'N/A'}
                              </Text>
                            </HStack>
                          )}
                          {followUp?.notes && (
                            <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mt={2} noOfLines={2}>
                              ðŸ“ {followUp.notes}
                            </Text>
                          )}
                        </Box>

                        <HStack spacing={2} flexWrap="wrap" width={{ base: 'full', sm: 'auto' }} justify={{ base: 'flex-end', sm: 'flex-start' }}>
                          <Button
                            size={{ base: 'xs', sm: 'sm' }}
                            leftIcon={<HiPhone />}
                            colorScheme="green"
                            onClick={() => {
                              setLeadToCall({ id: lead.id, name: lead.name, phone: lead.phone });
                              onCallDialerOpen();
                            }}
                          >
                            <Text display={{ base: 'none', md: 'inline' }}>Call Now</Text>
                            <Text display={{ base: 'inline', md: 'none' }}>Call</Text>
                          </Button>
                          <IconButton
                            aria-label="Assign lead"
                            icon={<HiUserAdd />}
                            size="sm"
                            colorScheme="blue"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLeadToAssign({
                                id: lead.id,
                                name: lead.name,
                                currentAssignee: lead.assignedTo?.name
                              });
                              onAssignOpen();
                            }}
                          />
                          <IconButton
                            aria-label="View details"
                            icon={<HiEye />}
                            size="sm"
                            onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                          />
                        </HStack>
                      </Flex>
                    </Box>
                  );
                })}
              </VStack>
            ) : (
              <Box bg="white" p={6} borderRadius="lg" textAlign="center">
                <Text color="gray.500">No overdue follow-ups ðŸŽ‰</Text>
              </Box>
            )}
          </Box>

          <Divider />

          {/* New Leads */}
          <Box>
            <Flex
              align="center"
              mb={4}
              p={{ base: 2, md: 3 }}
              bg="blue.50"
              borderRadius="md"
              borderLeft="4px"
              borderColor="blue.500"
              flexWrap="wrap"
              gap={2}
            >
              <HiUserAdd size={24} color="blue" />
              <Heading size={{ base: 'sm', md: 'md' }} ml={2} color="blue.700">
                New Leads
              </Heading>
              <Badge ml={3} colorScheme="blue" fontSize={{ base: 'sm', md: 'md' }}>
                {categorizedLeads.new.length}
              </Badge>
            </Flex>
            
            {categorizedLeads.new.length > 0 ? (
              <VStack spacing={3} align="stretch">
                {categorizedLeads.new.map(({ lead }) => (
                  <Box
                    key={lead.id}
                    bg="white"
                    borderRadius="lg"
                    boxShadow="sm"
                    p={{ base: 3, md: 4 }}
                    borderLeft="4px"
                    borderColor="blue.500"
                    _hover={{ boxShadow: 'md' }}
                    transition="all 0.2s"
                  >
                    <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} flexWrap="wrap" gap={3} direction={{ base: 'column', sm: 'row' }}>
                      <Box flex="1" minW={{ base: 'full', sm: '200px' }}>
                        <Text
                          fontWeight="bold"
                          fontSize={{ base: 'md', md: 'lg' }}
                          color="blue.600"
                          cursor="pointer"
                          onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                          _hover={{ textDecoration: 'underline' }}
                          noOfLines={1}
                        >
                          {lead.name}
                        </Text>
                        <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" noOfLines={1}>
                          {lead.phone} â€¢ {lead.email || 'No email'}
                        </Text>
                        <LeadAge createdAt={lead.createdAt} />
                        <HStack mt={2} spacing={2} flexWrap="wrap">
                          <Badge colorScheme="blue" fontSize={{ base: 'xs', md: 'sm' }}>New</Badge>
                          <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.500">
                            Created: {formatDate(lead.createdAt)}
                          </Text>
                          <Badge colorScheme="purple" fontSize={{ base: 'xs', md: 'sm' }}>{lead.source}</Badge>
                        </HStack>
                      </Box>

                      <HStack spacing={2} flexWrap="wrap" width={{ base: 'full', sm: 'auto' }} justify={{ base: 'flex-end', sm: 'flex-start' }}>
                        <Button
                          size={{ base: 'xs', sm: 'sm' }}
                          leftIcon={<HiPhone />}
                          colorScheme="green"
                          onClick={() => {
                            setLeadToCall({ id: lead.id, name: lead.name, phone: lead.phone });
                            onCallDialerOpen();
                          }}
                        >
                          Call
                        </Button>
                        <IconButton
                          aria-label="Assign lead"
                          icon={<HiUserAdd />}
                          size="sm"
                          colorScheme="blue"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLeadToAssign({
                              id: lead.id,
                              name: lead.name,
                              currentAssignee: lead.assignedTo?.name
                            });
                            onAssignOpen();
                          }}
                        />
                        <IconButton
                          aria-label="View details"
                          icon={<HiEye />}
                          size="sm"
                          onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                        />
                      </HStack>
                    </Flex>
                  </Box>
                ))}
              </VStack>
            ) : (
              <Box bg="white" p={6} borderRadius="lg" textAlign="center">
                <Text color="gray.500">No new leads at the moment</Text>
              </Box>
            )}
          </Box>

          <Divider />

          {/* Future Follow-ups */}
          <Box>
            <Flex
              align="center"
              mb={4}
              p={{ base: 2, md: 3 }}
              bg="green.50"
              borderRadius="md"
              borderLeft="4px"
              borderColor="green.500"
              flexWrap="wrap"
              gap={2}
            >
              <HiClock size={24} color="green" />
              <Heading size={{ base: 'sm', md: 'md' }} ml={2} color="green.700">
                Scheduled Follow-ups
              </Heading>
              <Badge ml={3} colorScheme="green" fontSize={{ base: 'sm', md: 'md' }}>
                {categorizedLeads.future.length}
              </Badge>
            </Flex>
            
            {categorizedLeads.future.length > 0 ? (
              <VStack spacing={3} align="stretch">
                {categorizedLeads.future.map(({ lead, followUp }) => {
                  const dueDate = followUp?.dueDate || followUp?.scheduledFor;
                  const timeDiff = dueDate ? formatTimeDifference(dueDate) : '';
                  
                  return (
                    <Box
                      key={lead.id}
                      bg="white"
                      borderRadius="lg"
                      boxShadow="sm"
                      p={{ base: 3, md: 4 }}
                      borderLeft="4px"
                      borderColor="green.500"
                      _hover={{ boxShadow: 'md' }}
                      transition="all 0.2s"
                    >
                      <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} flexWrap="wrap" gap={3} direction={{ base: 'column', sm: 'row' }}>
                        <Box flex="1" minW={{ base: 'full', sm: '200px' }}>
                          <Text
                            fontWeight="bold"
                            fontSize={{ base: 'md', md: 'lg' }}
                            color="blue.600"
                            cursor="pointer"
                            onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                            _hover={{ textDecoration: 'underline' }}
                            noOfLines={1}
                          >
                            {lead.name}
                          </Text>
                          <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" noOfLines={1}>
                            {lead.phone} â€¢ {lead.email || 'No email'}
                          </Text>
                          <LeadAge createdAt={lead.createdAt} />
                          {followUp && (
                            <HStack mt={2} spacing={2} flexWrap="wrap">
                              <Badge colorScheme="green" fontSize={{ base: 'xs', md: 'sm' }}>
                                In {timeDiff}
                              </Badge>
                              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.500">
                                Scheduled: {dueDate ? formatDate(dueDate) : 'N/A'}
                              </Text>
                            </HStack>
                          )}
                          {followUp?.notes && (
                            <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mt={2} noOfLines={2}>
                              ðŸ“ {followUp.notes}
                            </Text>
                          )}
                        </Box>

                        <HStack spacing={2} flexWrap="wrap" width={{ base: 'full', sm: 'auto' }} justify={{ base: 'flex-end', sm: 'flex-start' }}>
                          <Button
                            size={{ base: 'xs', sm: 'sm' }}
                            leftIcon={<HiPhone />}
                            colorScheme="green"
                            variant="outline"
                            onClick={() => {
                              setLeadToCall({ id: lead.id, name: lead.name, phone: lead.phone });
                              onCallDialerOpen();
                            }}
                          >
                            Call
                          </Button>
                          <IconButton
                            aria-label="Assign lead"
                            icon={<HiUserAdd />}
                            size="sm"
                            colorScheme="blue"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLeadToAssign({
                                id: lead.id,
                                name: lead.name,
                                currentAssignee: lead.assignedTo?.name
                              });
                              onAssignOpen();
                            }}
                          />
                          <IconButton
                            aria-label="View details"
                            icon={<HiEye />}
                            size="sm"
                            onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                          />
                        </HStack>
                      </Flex>
                    </Box>
                  );
                })}
              </VStack>
            ) : (
              <Box bg="white" p={6} borderRadius="lg" textAlign="center">
                <Text color="gray.500">No scheduled follow-ups</Text>
              </Box>
            )}
          </Box>
        </VStack>
      ) : viewMode === 'table' ? (
        /* Table View */
        <Box bg="white" borderRadius="lg" boxShadow="sm" overflow="hidden">
          <Box overflowX="auto">
          <Table variant="simple" size={{ base: 'sm', md: 'md' }}>
            <Thead bg="gray.50">
              <Tr>
                <Th>Name</Th>
                <Th display={{ base: 'none', md: 'table-cell' }}>Email</Th>
                <Th>Phone</Th>
                <Th display={{ base: 'none', lg: 'table-cell' }}>Campaign</Th>
                <Th>Status</Th>
                <Th display={{ base: 'none', sm: 'table-cell' }}>Lead Age</Th>
                <Th display={{ base: 'none', lg: 'table-cell' }}>Assigned To</Th>
                <Th display={{ base: 'none', md: 'table-cell' }}>Call</Th>
                <Th display={{ base: 'none', lg: 'table-cell' }}>Next Followup</Th>
                <Th display={{ base: 'none', sm: 'table-cell' }}>Origin</Th>
                <Th display={{ base: 'none', lg: 'table-cell' }}>Last Edit</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {leads && leads.length > 0 ? (
                leads.map((lead) => {
                  const lastCall = getLastCallForLead(lead.id);
                  const nextFollowUp = getNextFollowUpForLead(lead.id);
                  
                  return (
                  <Tr key={lead.id} _hover={{ bg: 'gray.50' }}>
                    <Td
                      fontWeight="medium"
                      cursor="pointer"
                      color="blue.600"
                      onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                      whiteSpace="nowrap"
                      fontSize={{ base: 'xs', md: 'sm' }}
                    >
                      {lead.name}
                    </Td>
                    <Td whiteSpace="nowrap" display={{ base: 'none', md: 'table-cell' }} fontSize={{ base: 'xs', md: 'sm' }}>{lead.email || '-'}</Td>
                    <Td whiteSpace="nowrap" fontSize={{ base: 'xs', md: 'sm' }}>{lead.phone}</Td>
                    <Td whiteSpace="nowrap" display={{ base: 'none', lg: 'table-cell' }} fontSize={{ base: 'xs', md: 'sm' }}>{lead.campaign || '-'}</Td>
                    <Td>
                      <VStack spacing={1} align="flex-start">
                        <Badge colorScheme={getStatusColor(lead.status)} fontSize={{ base: 'xs', md: 'sm' }}>
                          {lead.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        {lead.callAttempts > 0 && (
                          <Badge colorScheme={lead.callAttempts > 6 ? 'red' : lead.callAttempts > 3 ? 'orange' : 'blue'} fontSize={{ base: 'xs', md: 'xs' }}>
                            📞 {lead.callAttempts}
                          </Badge>
                        )}
                      </VStack>
                    </Td>
                    <Td whiteSpace="nowrap" display={{ base: 'none', sm: 'table-cell' }}>
                      <LeadAge createdAt={lead.createdAt} />
                    </Td>
                    <Td whiteSpace="nowrap" display={{ base: 'none', lg: 'table-cell' }} fontSize={{ base: 'xs', md: 'sm' }}>{lead.assignedTo?.name || 'Unassigned'}</Td>
                    <Td whiteSpace="nowrap" display={{ base: 'none', md: 'table-cell' }}>
                      {lastCall ? (
                        <Text fontSize={{ base: 'xs', md: 'sm' }}>
                          {formatDate(lastCall.createdAt)}
                          <br />
                          <Badge colorScheme={lastCall.status === 'completed' ? 'green' : lastCall.status === 'busy' ? 'red' : 'orange'} fontSize="xs">
                            {lastCall.status === 'ring_not_response' ? 'Ring Not Response' : lastCall.status.charAt(0).toUpperCase() + lastCall.status.slice(1)}
                          </Badge>
                        </Text>
                      ) : (
                        '-'
                      )}
                    </Td>
                    <Td whiteSpace="nowrap" display={{ base: 'none', lg: 'table-cell' }}>
                      {nextFollowUp ? (
                        <Text fontSize={{ base: 'xs', md: 'sm' }}>
                          {formatDate(nextFollowUp.scheduledFor)}
                        </Text>
                      ) : (
                        '-'
                      )}
                    </Td>
                    <Td whiteSpace="nowrap" display={{ base: 'none', sm: 'table-cell' }} fontSize={{ base: 'xs', md: 'sm' }}>{formatDate(lead.createdAt)}</Td>
                    <Td whiteSpace="nowrap" display={{ base: 'none', lg: 'table-cell' }} fontSize={{ base: 'xs', md: 'sm' }}>{formatDate(lead.updatedAt)}</Td>
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
                            icon={<HiPencil />}
                            onClick={() => router.push(`/dashboard/leads/${lead.id}/edit`)}
                          >
                            Edit Lead
                          </MenuItem>
                        </MenuList>
                      </Menu>
                    </Td>
                  </Tr>
                  );
                })
              ) : (
                <Tr>
                  <Td colSpan={11} textAlign="center" py={8}>
                    <Text color="gray.500">
                      {searchQuery ? 'No leads match your search' : 'No leads found'}
                    </Text>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
          </Box>

          {/* Pagination info */}
          {leads.length > 0 && (
            <Box p={4} borderTopWidth="1px">
              <Text fontSize="sm" color="gray.600">
                Showing {leads.length} lead{leads.length !== 1 ? 's' : ''}
              </Text>
            </Box>
          )}
        </Box>
      ) : viewMode === 'list' ? (
        /* List View */
        <Box>
          {leads && leads.length > 0 ? (
            <VStack spacing={3} align="stretch">
              {leads.map((lead) => {
                const lastCall = getLastCallForLead(lead.id);
                const nextFollowUp = getNextFollowUpForLead(lead.id);
                
                return (
                  <Box
                    key={lead.id}
                    bg="white"
                    borderRadius="lg"
                    boxShadow="sm"
                    p={4}
                    _hover={{ boxShadow: 'md', borderColor: 'blue.200' }}
                    transition="all 0.2s"
                    borderWidth="1px"
                    borderColor="gray.200"
                  >
                    <Flex
                      direction={{ base: 'column', md: 'row' }}
                      justify="space-between"
                      align={{ base: 'stretch', md: 'center' }}
                      gap={3}
                    >
                      {/* Left Section - Main Info */}
                      <Flex
                        flex="1"
                        direction={{ base: 'column', sm: 'row' }}
                        gap={{ base: 2, sm: 4 }}
                        align={{ base: 'stretch', sm: 'center' }}
                      >
                        <Box flex="1" minW="150px">
                          <Text
                            fontWeight="bold"
                            fontSize="lg"
                            color="blue.600"
                            cursor="pointer"
                            onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                            _hover={{ textDecoration: 'underline' }}
                          >
                            {lead.name}
                          </Text>
                          <Text fontSize="sm" color="gray.600">
                            {lead.phone}
                          </Text>
                          <Text fontSize="sm" color="gray.500">
                            {lead.email || '-'}
                          </Text>
                          <LeadAge createdAt={lead.createdAt} />
                        </Box>

                        <Flex
                          direction={{ base: 'column', sm: 'row' }}
                          gap={{ base: 2, sm: 6 }}
                          flex="2"
                          flexWrap="wrap"
                        >
                          <Box>
                            <Text fontSize="xs" color="gray.500" fontWeight="semibold">
                              Status
                            </Text>
                            <Badge colorScheme={getStatusColor(lead.status)} mt={1}>
                              {lead.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </Box>

                          <Box>
                            <Text fontSize="xs" color="gray.500" fontWeight="semibold">
                              Campaign
                            </Text>
                            <Text fontSize="sm" mt={1}>
                              {lead.campaign || '-'}
                            </Text>
                          </Box>

                          <Box>
                            <Text fontSize="xs" color="gray.500" fontWeight="semibold">
                              Assigned To
                            </Text>
                            <HStack spacing={1} mt={1}>
                              <Text fontSize="sm">
                                {lead.assignedTo?.name || 'Unassigned'}
                              </Text>
                              <IconButton
                                aria-label="Edit assignment"
                                icon={<HiPencil />}
                                size="xs"
                                variant="ghost"
                                colorScheme="blue"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLeadToAssign({
                                    id: lead.id,
                                    name: lead.name,
                                    currentAssignee: lead.assignedTo?.name
                                  });
                                  onAssignOpen();
                                }}
                              />
                            </HStack>
                          </Box>

                          {lastCall && (
                            <Box>
                              <Text fontSize="xs" color="gray.500" fontWeight="semibold">
                                Last Call
                              </Text>
                              <Text fontSize="sm" mt={1}>
                                {formatDate(lastCall.createdAt)}
                              </Text>
                              <Badge
                                colorScheme={lastCall.status === 'completed' ? 'green' : lastCall.status === 'busy' ? 'red' : 'orange'}
                                fontSize="xs"
                              >
                                {lastCall.status === 'ring_not_response' ? 'Ring Not Response' : lastCall.status.charAt(0).toUpperCase() + lastCall.status.slice(1)}
                              </Badge>
                            </Box>
                          )}

                          {nextFollowUp && (
                            <Box>
                              <Text fontSize="xs" color="gray.500" fontWeight="semibold">
                                Next Follow-up
                              </Text>
                              <Text fontSize="sm" mt={1}>
                                {formatDate(nextFollowUp.scheduledFor)}
                              </Text>
                            </Box>
                          )}
                        </Flex>
                      </Flex>

                      {/* Right Section - Actions */}
                      <HStack spacing={2} justify={{ base: 'flex-start', md: 'flex-end' }}>
                        <Button
                          size="sm"
                          leftIcon={<HiPhone />}
                          colorScheme="green"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLeadToCall({ id: lead.id, name: lead.name, phone: lead.phone });
                            onCallDialerOpen();
                          }}
                        >
                          Call
                        </Button>
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
                              icon={<HiPencil />}
                              onClick={() => router.push(`/dashboard/leads/${lead.id}/edit`)}
                            >
                              Edit Lead
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </HStack>
                    </Flex>
                  </Box>
                );
              })}
            </VStack>
          ) : (
            <Box bg="white" borderRadius="lg" boxShadow="sm" p={8} textAlign="center">
              <Text color="gray.500">
                {searchQuery ? 'No leads match your search' : 'No leads found'}
              </Text>
            </Box>
          )}

          {/* Pagination info */}
          {leads.length > 0 && (
            <Box bg="white" borderRadius="lg" boxShadow="sm" p={4} mt={4}>
              <Text fontSize="sm" color="gray.600">
                Showing {leads.length} lead{leads.length !== 1 ? 's' : ''}
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
              {leads.map((lead) => {
                const lastCall = getLastCallForLead(lead.id);
                const nextFollowUp = getNextFollowUpForLead(lead.id);
                
                return (
                <Box
                  key={lead.id}
                  bg="white"
                  borderRadius="lg"
                  boxShadow="sm"
                  p={{ base: 4, md: 6 }}
                  _hover={{ boxShadow: 'md', transform: 'translateY(-2px)' }}
                  transition="all 0.2s"
                  cursor="pointer"
                  onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                >
                  <HStack justify="space-between" mb={3} align="flex-start">
                    <Heading size={{ base: 'sm', md: 'md' }} color="blue.600" noOfLines={1} flex="1">
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
                      </MenuList>
                    </Menu>
                  </HStack>

                  <Box mb={4}>
                    <HStack mb={2} flexWrap="wrap">
                      <Badge colorScheme={getStatusColor(lead.status)} fontSize={{ base: 'xs', md: 'sm' }}>
                        {lead.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <LeadAge createdAt={lead.createdAt} />
                    </HStack>

                    <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mb={1} noOfLines={1}>
                      <strong>Email:</strong> {lead.email || '-'}
                    </Text>
                    <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mb={1} noOfLines={1}>
                      <strong>Phone:</strong> {lead.phone}
                    </Text>
                    <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mb={1} noOfLines={1}>
                      <strong>Campaign:</strong> {lead.campaign || '-'}
                    </Text>
                    <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mb={1} noOfLines={1}>
                      <strong>Source:</strong> {lead.source || '-'}
                    </Text>
                    <HStack spacing={2} mb={1}>
                      <Text fontSize="sm" color="gray.600">
                        <strong>Assigned To:</strong> {lead.assignedTo?.name || 'Unassigned'}
                      </Text>
                      <IconButton
                        aria-label="Edit assignment"
                        icon={<HiPencil />}
                        size="xs"
                        variant="ghost"
                        colorScheme="blue"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLeadToAssign({
                            id: lead.id,
                            name: lead.name,
                            currentAssignee: lead.assignedTo?.name
                          });
                          onAssignOpen();
                        }}
                      />
                    </HStack>
                    <Text fontSize="sm" color="gray.500" mt={2}>
                      <strong>Created:</strong> {formatDate(lead.createdAt)}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      <strong>Last Edit:</strong> {formatDate(lead.updatedAt)}
                    </Text>
                    {lastCall && (
                      <Text fontSize="sm" color="gray.500">
                        <strong>Last Call:</strong> {formatDate(lastCall.createdAt)} -{' '}
                        <Badge colorScheme={lastCall.status === 'completed' ? 'green' : lastCall.status === 'busy' ? 'red' : 'orange'} fontSize="xs">
                          {lastCall.status === 'ring_not_response' ? 'Ring Not Response' : lastCall.status.charAt(0).toUpperCase() + lastCall.status.slice(1)}
                        </Badge>
                      </Text>
                    )}
                    {nextFollowUp && (
                      <Text fontSize="sm" color="gray.500">
                        <strong>Next Follow-up:</strong> {formatDate(nextFollowUp.scheduledFor)}
                      </Text>
                    )}
                  </Box>

                  <HStack spacing={2} mt={4} pt={4} borderTopWidth="1px">
                    <Button
                      size="sm"
                      leftIcon={<HiPhone />}
                      colorScheme="green"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLeadToCall({ id: lead.id, name: lead.name, phone: lead.phone });
                        onCallDialerOpen();
                      }}
                    >
                      Call
                    </Button>
                  </HStack>
                </Box>
                );
              })}
            </Box>
          ) : (
            <Box bg="white" borderRadius="lg" boxShadow="sm" p={8} textAlign="center">
              <Text color="gray.500">
                {searchQuery ? 'No leads match your search' : 'No leads found'}
              </Text>
            </Box>
          )}

          {/* Pagination info */}
          {leads.length > 0 && (
            <Box bg="white" borderRadius="lg" boxShadow="sm" p={4} mt={4}>
              <Text fontSize="sm" color="gray.600">
                Showing {leads.length} lead{leads.length !== 1 ? 's' : ''}
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
          onSuccess={() => {}}
        />
      )}

      {/* Add Lead Modal */}
      <AddLeadModal isOpen={isAddLeadOpen} onClose={onAddLeadClose} />

      {/* Call Dialer Modal */}
      {leadToCall && (
        <CallDialerModal
          isOpen={isCallDialerOpen}
          onClose={onCallDialerClose}
          leadId={leadToCall.id}
          leadName={leadToCall.name}
          leadPhone={leadToCall.phone}
        />
      )}
        </>
      )}
    </Box>
  );
}





