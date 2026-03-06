'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  VStack,
  Text,
  Spinner,
  Center,
  Badge,
  Heading,
  Flex,
  Icon,
  Divider,
  useToast,
} from '@chakra-ui/react';
import { HiUsers, HiCheckCircle } from 'react-icons/hi';
import ModernLeadCard from './ModernLeadCard';
import type { Lead, CallLog } from '@/shared/types';
import { useAuth } from '@/shared/lib/auth/auth-context';

interface GlobalSearchResultsProps {
  searchQuery: string;
}

// Lead Age Component
const LeadAge = ({ createdAt }: { createdAt: string | Date }) => {
  const now = new Date();
  const created = new Date(createdAt);
  const diff = now.getTime() - created.getTime();
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  return <Text fontSize="sm">{days}d {hours}h old</Text>;
};

// Call Remarks Component
const CallRemarksDisplay = ({ callLogs }: { callLogs: CallLog[] }) => {
  if (!callLogs || callLogs.length === 0) {
    return <Text fontSize="xs" color="gray.500">No call remarks yet</Text>;
  }
  
  const sortedLogs = [...callLogs].sort((a, b) => 
    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  ).slice(0, 3); // Show last 3 calls
  
  return (
    <VStack align="stretch" spacing={1}>
      {sortedLogs.map((log) => (
        <Text key={log.id} fontSize="xs" color="gray.700">
          {log.remarks || 'No remarks'}
        </Text>
      ))}
    </VStack>
  );
};

interface GlobalSearchResultsProps {
  searchQuery: string;
}

export default function GlobalSearchResults({ searchQuery }: GlobalSearchResultsProps) {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all leads (both active and outcomes)
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        
        // Use server-side search with query parameter for faster results
        const searchParam = encodeURIComponent(searchQuery.trim());
        
        // Fetch leads and outcomes with search parameter - limit to 100 results
        const [leadsRes, outcomesRes] = await Promise.all([
          fetch(`/api/leads?search=${searchParam}&limit=100`),
          fetch(`/api/leads/outcomes?search=${searchParam}&limit=100`),
        ]);

        const leadsData = await leadsRes.json();
        const outcomesData = await outcomesRes.json();

        // Combine leads from both sources
        const activeLeads = leadsData.success ? leadsData.data || [] : [];
        const outcomeLeads = outcomesData.success ? outcomesData.data || [] : [];
        
        console.log('[Global Search] Active leads:', activeLeads.length);
        console.log('[Global Search] Outcome leads:', outcomeLeads.length);
        
        // Merge and remove duplicates (prefer outcome status if exists in both)
        const leadsMap = new Map<string, Lead>();
        
        activeLeads.forEach((lead: Lead) => {
          leadsMap.set(lead.id, lead);
        });
        
        outcomeLeads.forEach((lead: Lead) => {
          leadsMap.set(lead.id, lead);
        });
        
        setAllLeads(Array.from(leadsMap.values()));
        
        // Extract call logs and followups from the lead data (already included)
        const allCallLogs: CallLog[] = [];
        const allFollowUps: any[] = [];
        
        Array.from(leadsMap.values()).forEach((lead: any) => {
          if (lead.CallLog) {
            allCallLogs.push(...lead.CallLog);
          }
          if (lead.FollowUp) {
            allFollowUps.push(...lead.FollowUp);
          }
        });
        
        setCallLogs(allCallLogs);
        setFollowUps(allFollowUps);
        
      } catch (error) {
        console.error('[Global Search] Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load search results',
          status: 'error',
          duration: 3000,
        });
      } finally {
        setLoading(false);
      }
    };

    if (searchQuery.trim()) {
      fetchAllData();
    }
  }, [searchQuery, toast]);

  // Separate leads into active and outcome categories (server already filtered by search)
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return { activeLeads: [], outcomeLeads: [] };

    const outcomeStatuses = ['won', 'lost', 'unqualified', 'unreach', 'unreachable'];
    
    const active = allLeads.filter(lead => !outcomeStatuses.includes(lead.status));
    const outcomes = allLeads.filter(lead => outcomeStatuses.includes(lead.status));
    
    console.log('[Global Search Filter] Active leads:', active.length, 'Outcome leads:', outcomes.length);

    return {
      activeLeads: active,
      outcomeLeads: outcomes,
    };
  }, [allLeads, searchQuery]);

  const getCallLogsForLead = (leadId: string) => {
    return callLogs.filter(log => log.leadId === leadId);
  };

  const getLastCallForLead = (leadId: string) => {
    const logs = getCallLogsForLead(leadId);
    if (logs.length === 0) return null;
    return logs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
  };

  const getFollowUpForLead = (leadId: string) => {
    const leadFollowUps = followUps.filter(fu => fu.leadId === leadId);
    if (leadFollowUps.length === 0) return null;
    
    const now = new Date();
    const futureFollowUps = leadFollowUps.filter(fu => new Date(fu.scheduledAt) >= now);
    
    if (futureFollowUps.length > 0) {
      return futureFollowUps.sort((a, b) => 
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      )[0];
    }
    
    return leadFollowUps.sort((a, b) => 
      new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    )[0];
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'new': return 'blue';
      case 'contacted': return 'cyan';
      case 'qualified': return 'purple';
      case 'unqualified': return 'gray';
      case 'won': return 'green';
      case 'lost': return 'red';
      case 'followup': return 'orange';
      case 'unreach':
      case 'unreachable': return 'pink';
      default: return 'gray';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'followup': return 'Follow-up';
      case 'unreach': return 'Unreachable';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const handleLeadAction = (action: string, leadId: string) => {
    // Navigate to lead detail page for all actions
    router.push(`/dashboard/leads/${leadId}`);
  };

  const totalResults = filteredResults.activeLeads.length + filteredResults.outcomeLeads.length;

  if (!searchQuery.trim()) {
    return (
      <Center minH="400px">
        <VStack spacing={3}>
          <Icon as={HiUsers} boxSize={12} color="gray.400" />
          <Text fontSize="lg" color="gray.600" fontWeight="medium">
            Enter a search query above
          </Text>
          <Text fontSize="sm" color="gray.500">
            Search across all leads and outcomes
          </Text>
        </VStack>
      </Center>
    );
  }

  if (loading) {
    return (
      <Center minH="400px">
        <VStack spacing={3}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text color="gray.600">Searching...</Text>
        </VStack>
      </Center>
    );
  }

  if (totalResults === 0) {
    return (
      <Center minH="400px">
        <VStack spacing={3}>
          <Icon as={HiUsers} boxSize={12} color="gray.400" />
          <Text fontSize="lg" color="gray.600" fontWeight="medium">
            No results found for "{searchQuery}"
          </Text>
          <Text fontSize="sm" color="gray.500">
            Try searching with a different name or phone number
          </Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box>
      {/* Results Summary */}
      <Box bg="blue.50" p={4} borderRadius="lg" mb={4}>
        <Flex align="center" gap={2}>
          <Icon as={HiCheckCircle} color="blue.600" boxSize={5} />
          <Text fontWeight="semibold" color="blue.800">
            Found {totalResults} result{totalResults !== 1 ? 's' : ''} for "{searchQuery}"
          </Text>
        </Flex>
        <Text fontSize="sm" color="blue.700" mt={1}>
          {filteredResults.activeLeads.length} active lead{filteredResults.activeLeads.length !== 1 ? 's' : ''} • {' '}
          {filteredResults.outcomeLeads.length} outcome{filteredResults.outcomeLeads.length !== 1 ? 's' : ''}
        </Text>
      </Box>

      {/* Active Leads Section */}
      {filteredResults.activeLeads.length > 0 && (
        <Box mb={6}>
          <Flex align="center" gap={2} mb={3}>
            <Heading size="md">Active Leads</Heading>
            <Badge colorScheme="blue" fontSize="sm">
              {filteredResults.activeLeads.length}
            </Badge>
          </Flex>
          <VStack spacing={3} align="stretch">
            {filteredResults.activeLeads.map(lead => (
              <ModernLeadCard
                key={lead.id}
                lead={lead}
                followUp={getFollowUpForLead(lead.id)}
                lastCall={getLastCallForLead(lead.id)}
                onCallClick={() => handleLeadAction('call', lead.id)}
                onWhatsAppClick={() => handleLeadAction('whatsapp', lead.id)}
                onChangeStatusClick={() => handleLeadAction('status', lead.id)}
                onAssignClick={() => handleLeadAction('assign', lead.id)}
                onViewClick={() => handleLeadAction('view', lead.id)}
                getStatusBadgeColor={getStatusBadgeColor}
                getStatusLabel={getStatusLabel}
                LeadAgeComponent={LeadAge}
                CallRemarksComponent={CallRemarksDisplay}
              />
            ))}
          </VStack>
        </Box>
      )}

      {/* Divider between sections */}
      {filteredResults.activeLeads.length > 0 && filteredResults.outcomeLeads.length > 0 && (
        <Divider my={6} />
      )}

      {/* Outcome Leads Section */}
      {filteredResults.outcomeLeads.length > 0 && (
        <Box>
          <Flex align="center" gap={2} mb={3}>
            <Heading size="md">Lead Outcomes</Heading>
            <Badge colorScheme="purple" fontSize="sm">
              {filteredResults.outcomeLeads.length}
            </Badge>
          </Flex>
          <VStack spacing={3} align="stretch">
            {filteredResults.outcomeLeads.map(lead => (
              <ModernLeadCard
                key={lead.id}
                lead={lead}
                followUp={getFollowUpForLead(lead.id)}
                lastCall={getLastCallForLead(lead.id)}
                onCallClick={() => handleLeadAction('call', lead.id)}
                onWhatsAppClick={() => handleLeadAction('whatsapp', lead.id)}
                onChangeStatusClick={() => handleLeadAction('status', lead.id)}
                onAssignClick={() => handleLeadAction('assign', lead.id)}
                onViewClick={() => handleLeadAction('view', lead.id)}
                getStatusBadgeColor={getStatusBadgeColor}
                getStatusLabel={getStatusLabel}
                LeadAgeComponent={LeadAge}
                CallRemarksComponent={CallRemarksDisplay}
              />
            ))}
          </VStack>
        </Box>
      )}
    </Box>
  );
}
