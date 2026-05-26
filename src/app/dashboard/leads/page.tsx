'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
  Flex,
  Heading,
  Icon,
  Select,
  VStack,
  Button,
  Text,
  Progress,
} from '@chakra-ui/react';
import { HiSearch, HiX } from 'react-icons/hi';
import LeadsTabContent from '@/features/leads/components/LeadsTabContent';
import LeadOutcomesTabContent from '@/features/leads/components/LeadOutcomesTabContent';
import DebouncedSearchInput from '@/shared/components/DebouncedSearchInput';
import { useAuth } from '@/shared/lib/auth/auth-context';
import useSWR from 'swr';
import { fetcher } from '@/shared/lib/swr';

export default function UnifiedLeadsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [leadsCount, setLeadsCount] = useState(0);
  const [leadOutcomesCount, setLeadOutcomesCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  
  // Global filter states - shared across both tabs
  const [globalClientTypeFilter, setGlobalClientTypeFilter] = useState<string>('all');
  const [globalSourceFilter, setGlobalSourceFilter] = useState<string>('all');
  const [globalAttemptsFilter, setGlobalAttemptsFilter] = useState<string>('all');
  const [globalOwnerFilter, setGlobalOwnerFilter] = useState<string>('all');
  const [globalDateRangeFilter, setGlobalDateRangeFilter] = useState<string>('all');
  
  // Fetch users directly so the Owner filter is populated immediately on mount
  const { data: usersData } = useSWR('/api/users', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  // State for available owners
  const [availableOwners, setAvailableOwners] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (usersData?.data) setAvailableOwners(usersData.data);
  }, [usersData?.data]);
  
  // Initialize tab based on query parameter or search state
  const getInitialTab = () => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'outcomes') return 1;
    return 0;
  };
  
  const [activeTabIndex, setActiveTabIndex] = useState(getInitialTab());
  // Lazy mount: only render LeadOutcomesTabContent when first visited
  const [hasVisitedOutcomes, setHasVisitedOutcomes] = useState(() => getInitialTab() === 1);

  const handleTabChange = (index: number) => {
    if (index === 1) setHasVisitedOutcomes(true);
    setActiveTabIndex(index);
  };

  // Callback for global search - use transition to keep UI responsive
  const handleGlobalSearch = useCallback((query: string) => {
    startTransition(() => {
      setGlobalSearchQuery(query);
    });
  }, []);

  // Update tab when query param changes
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'outcomes') {
      setActiveTabIndex(1);
      setHasVisitedOutcomes(true);
    } else {
      setActiveTabIndex(0);
    }
  }, [searchParams]);

  // Default owner filter to logged-in Sales Agent's own ID
  useEffect(() => {
    if (user?.id && user?.role === 'Sales Agent') {
      setGlobalOwnerFilter(user.id);
      setGlobalDateRangeFilter('all');
    }
  }, [user?.id, user?.role]);

  const handleLeadsCountChange = (count: number) => {
    setLeadsCount(count);
  };

  const handleLeadOutcomesCountChange = (count: number) => {
    setLeadOutcomesCount(count);
  };
  
  // Reset all global filters
  const handleResetGlobalFilters = () => {
    setGlobalSearchQuery('');
    setGlobalClientTypeFilter('all');
    setGlobalSourceFilter('all');
    setGlobalAttemptsFilter('all');
    setGlobalOwnerFilter('all');
    setGlobalDateRangeFilter('all');
  };
  
  // Check if any global filter is active
  const hasActiveGlobalFilters = 
    globalSearchQuery.trim() !== '' ||
    globalClientTypeFilter !== 'all' ||
    globalSourceFilter !== 'all' ||
    globalAttemptsFilter !== 'all' ||
    globalOwnerFilter !== 'all' ||
    globalDateRangeFilter !== 'all';

  return (
    <Box>
      {/* Subtle loading indicator for transitions */}
      {isPending && (
        <Progress 
          size="xs" 
          isIndeterminate 
          colorScheme="blue" 
          position="fixed"
          top={0}
          left={0}
          right={0}
          zIndex={1000}
        />
      )}
      
      {/* Page Header */}
      <Box bg="white" p={{ base: 3, md: 4 }} borderRadius="lg" boxShadow="sm" mb={4}>
        <Heading size={{ base: 'md', md: 'lg' }} mb={4}>Lead Management</Heading>
        
        {/* Global Filters */}
        <VStack spacing={3} align="stretch">
          {/* Search */}
          <DebouncedSearchInput
            placeholder="🔍 Search across all leads (name, phone, email)..."
            onSearch={handleGlobalSearch}
            debounceMs={400}
            size="md"
            maxW={{ base: 'full', md: '500px' }}
          />
          
          {/* Filter Row */}
          <Flex gap={2} flexWrap="wrap" align="center">
            <Select
              value={globalClientTypeFilter}
              onChange={(e) => setGlobalClientTypeFilter(e.target.value)}
              size="sm"
              flex={{ base: '1 1 calc(50% - 4px)', sm: '1 1 auto' }}
              maxW={{ sm: '200px' }}
              minW={{ base: '0', sm: '130px' }}
            >
              <option value="all">Clients & Leads</option>
              <option value="existing">Clients Only</option>
              <option value="non-existing">Leads Only</option>
            </Select>

            <Select
              value={globalSourceFilter}
              onChange={(e) => setGlobalSourceFilter(e.target.value)}
              size="sm"
              flex={{ base: '1 1 calc(50% - 4px)', sm: '1 1 auto' }}
              maxW={{ sm: '160px' }}
              minW={{ base: '0', sm: '120px' }}
            >
              <option value="all">All Sources</option>
              <option value="Website">Website</option>
              <option value="Meta">Meta</option>
              <option value="Referral">Referral</option>
              <option value="Direct">Direct</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Cold Call">Cold Call</option>
              <option value="Just Dial">Just Dial</option>
              <option value="Indiamart">Indiamart</option>
              <option value="Sulekha">Sulekha</option>
              <option value="LG">LG</option>
              <option value="Consultant">Consultant</option>
              <option value="Own">Own</option>
              <option value="Web App DB">Web App DB</option>
              <option value="Online">Online</option>
            </Select>

            <Select
              value={globalAttemptsFilter}
              onChange={(e) => setGlobalAttemptsFilter(e.target.value)}
              size="sm"
              flex={{ base: '1 1 calc(50% - 4px)', sm: '1 1 auto' }}
              maxW={{ sm: '160px' }}
              minW={{ base: '0', sm: '120px' }}
            >
              <option value="all">All Attempts</option>
              <option value="0">0 Attempts</option>
              <option value="1-3">1-3 Attempts</option>
              <option value="4-6">4-6 Attempts</option>
              <option value="7+">7+ Attempts</option>
            </Select>

            <Select
              value={globalOwnerFilter}
              onChange={(e) => setGlobalOwnerFilter(e.target.value)}
              size="sm"
              flex={{ base: '1 1 calc(50% - 4px)', sm: '1 1 auto' }}
              maxW={{ sm: '160px' }}
              minW={{ base: '0', sm: '120px' }}
            >
              <option value="all">All Owners</option>
              {availableOwners.map(owner => (
                <option key={owner.id} value={owner.id}>{owner.name}</option>
              ))}
            </Select>

            <Select
              value={globalDateRangeFilter}
              onChange={(e) => setGlobalDateRangeFilter(e.target.value)}
              size="sm"
              flex={{ base: '1 1 calc(50% - 4px)', sm: '1 1 auto' }}
              maxW={{ sm: '150px' }}
              minW={{ base: '0', sm: '110px' }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </Select>

            {/* Reset Filters Button */}
            {hasActiveGlobalFilters && (
              <Button
                leftIcon={<HiX />}
                onClick={handleResetGlobalFilters}
                size="sm"
                variant="outline"
                colorScheme="red"
                flex={{ base: '1 1 100%', sm: '0 0 auto' }}
              >
                Reset
              </Button>
            )}
          </Flex>
          
          {/* Info text about filter scope */}
          {hasActiveGlobalFilters && (
            <Text fontSize="xs" color="gray.600">
              ℹ️ Filters apply to both Leads and Lead Outcome tabs
            </Text>
          )}
        </VStack>
      </Box>

      {/* Tabs */}
      <Tabs 
        index={activeTabIndex} 
        onChange={handleTabChange}
        variant="enclosed"
        colorScheme="blue"
      >
        <TabList>
          {/* Leads Tab */}
          <Tab
            _selected={{ 
              color: 'blue.600', 
              bg: 'white', 
              borderColor: 'gray.300',
              borderBottomColor: 'white',
            }}
            fontSize={{ base: 'sm', md: 'md' }}
            fontWeight="semibold"
          >
            Leads
            {leadsCount > 0 && (
              <Badge 
                ml={2} 
                colorScheme="blue" 
                fontSize={{ base: 'xs', md: 'sm' }}
                borderRadius="full"
                px={2}
              >
                {leadsCount}
              </Badge>
            )}
          </Tab>
          <Tab
            _selected={{ 
              color: 'blue.600', 
              bg: 'white', 
              borderColor: 'gray.300',
              borderBottomColor: 'white',
            }}
            fontSize={{ base: 'sm', md: 'md' }}
            fontWeight="semibold"
          >
            Lead Outcome
            {leadOutcomesCount > 0 && (
              <Badge 
                ml={2} 
                colorScheme="blue" 
                fontSize={{ base: 'xs', md: 'sm' }}
                borderRadius="full"
                px={2}
              >
                {leadOutcomesCount}
              </Badge>
            )}
          </Tab>
        </TabList>

        <TabPanels>
          {/* Leads Tab Panel - With global filters and search */}
          <TabPanel p={0} pt={4}>
            <LeadsTabContent 
              onCountChange={handleLeadsCountChange}
              globalSearchQuery={globalSearchQuery}
              globalClientTypeFilter={globalClientTypeFilter}
              globalSourceFilter={globalSourceFilter}
              globalAttemptsFilter={globalAttemptsFilter}
              globalOwnerFilter={globalOwnerFilter}
              globalDateRangeFilter={globalDateRangeFilter}
            />
          </TabPanel>

          {/* Lead Outcomes Tab Panel - Only mounted when first visited */}
          <TabPanel p={0} pt={4}>
            {hasVisitedOutcomes && (
              <LeadOutcomesTabContent 
                onCountChange={handleLeadOutcomesCountChange}
                globalSearchQuery={globalSearchQuery}
                globalClientTypeFilter={globalClientTypeFilter}
                globalSourceFilter={globalSourceFilter}
                globalOwnerFilter={globalOwnerFilter}
                globalDateRangeFilter={globalDateRangeFilter}
                onOwnersLoad={(owners) => {
                  setAvailableOwners(owners);
                }}
              />
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}





