'use client';

import { useState, useEffect, useCallback, useTransition, useRef } from 'react';
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
import { HiSearch, HiX, HiPlus } from 'react-icons/hi';
import LeadsTabContent from '@/features/leads/components/LeadsTabContent';
import LeadOutcomesTabContent from '@/features/leads/components/LeadOutcomesTabContent';
import DebouncedSearchInput from '@/shared/components/DebouncedSearchInput';
import { useAuth } from '@/shared/lib/auth/auth-context';
import useSWR from 'swr';
import { fetcher } from '@/shared/lib/swr';
import { loadLeadsPagePersistedFilters, usePersistLeadsPageFilters } from '@/shared/hooks/useLeadsFilterPersistence';
import { getLeadSourcesForCategory } from '@/shared/constants/lead-sources';

export default function UnifiedLeadsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const lockedOwnerId = user?.role === 'Sales Agent' && user?.id ? user.id : undefined;
  const urlTabIndex = searchParams.get('tab') === 'outcomes' ? 1 : undefined;
  const initialLeadsFiltersRef = useRef(
    loadLeadsPagePersistedFilters(lockedOwnerId, urlTabIndex)
  );
  const leadsInit = initialLeadsFiltersRef.current;

  const [globalSearchQuery, setGlobalSearchQuery] = useState(leadsInit.globalSearchQuery);
  const [leadsCount, setLeadsCount] = useState(0);
  const [leadOutcomesCount, setLeadOutcomesCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  
  // Global filter states - shared across both tabs
  const [globalLeadCategoryFilter, setGlobalLeadCategoryFilter] = useState<string>(leadsInit.globalLeadCategoryFilter);
  const [globalClientTypeFilter, setGlobalClientTypeFilter] = useState<string>(leadsInit.globalClientTypeFilter);
  const [globalSourceFilter, setGlobalSourceFilter] = useState<string>(leadsInit.globalSourceFilter);
  const [globalAttemptsFilter, setGlobalAttemptsFilter] = useState<string>(leadsInit.globalAttemptsFilter);
  const [globalOwnerFilter, setGlobalOwnerFilter] = useState<string>(leadsInit.globalOwnerFilter);
  const [addLeadHandler, setAddLeadHandler] = useState<(() => void) | null>(null);
  
  // Available sources based on lead category filter (7 canonical sources only)
  const availableSources = getLeadSourcesForCategory(globalLeadCategoryFilter);
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
  
  // Initialize tab based on query parameter or persisted state
  const getInitialTab = () => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'outcomes') return 1;
    return leadsInit.activeTabIndex;
  };
  
  const [activeTabIndex, setActiveTabIndex] = useState(getInitialTab());

  usePersistLeadsPageFilters({
    globalSearchQuery,
    globalLeadCategoryFilter,
    globalClientTypeFilter,
    globalSourceFilter,
    globalAttemptsFilter,
    globalOwnerFilter,
    activeTabIndex,
  });
  // Component pre-mounted for instant tab switching

  const handleTabChange = (index: number) => {
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
    } else {
      setActiveTabIndex(0);
    }
  }, [searchParams]);

  // Default owner filter to logged-in Sales Agent's own ID
  useEffect(() => {
    if (user?.id && user?.role === 'Sales Agent') {
      setGlobalOwnerFilter(user.id);
    }
  }, [user?.id, user?.role]);

  const handleLeadsCountChange = (count: number) => {
    setLeadsCount(count);
  };

  const handleLeadOutcomesCountChange = (count: number) => {
    setLeadOutcomesCount(count);
  };
  
  // Reset source filter when lead category changes
  useEffect(() => {
    setGlobalSourceFilter('all');
  }, [globalLeadCategoryFilter]);
  
  // Reset all global filters
  const handleResetGlobalFilters = () => {
    setGlobalSearchQuery('');
    setGlobalLeadCategoryFilter('all');
    setGlobalClientTypeFilter('all');
    setGlobalSourceFilter('all');
    setGlobalAttemptsFilter('all');
    setGlobalOwnerFilter('all');
  };
  
  // Check if any global filter is active
  const hasActiveGlobalFilters = 
    globalSearchQuery.trim() !== '' ||
    globalLeadCategoryFilter !== 'all' ||
    globalClientTypeFilter !== 'all' ||
    globalSourceFilter !== 'all' ||
    globalAttemptsFilter !== 'all' ||
    globalOwnerFilter !== 'all';

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
        <Flex justify="space-between" align="center" mb={4}>
          <Heading size={{ base: 'md', md: 'lg' }}>Lead Management</Heading>
          {/* Add Lead Button - Mobile Only (Top Right) */}
          <Button
            size="sm"
            colorScheme="red"
            leftIcon={<HiPlus />}
            onClick={() => addLeadHandler && addLeadHandler()}
            display={{ base: 'flex', md: 'none' }}
            isDisabled={!addLeadHandler}
          >
            Add Lead
          </Button>
        </Flex>
        
        {/* Global Filters */}
        <VStack spacing={3} align="stretch">
          {/* Search */}
          <DebouncedSearchInput
            placeholder="🔍 Search across all leads (name, phone, email)..."
            onSearch={handleGlobalSearch}
            defaultValue={globalSearchQuery}
            debounceMs={400}
            size="md"
            maxW={{ base: 'full', md: '500px' }}
          />
          
          {/* Filter Row */}
          <Flex gap={2} flexWrap="wrap" align="center">
            <Select
              value={globalLeadCategoryFilter}
              onChange={(e) => setGlobalLeadCategoryFilter(e.target.value)}
              size="sm"
              flex={{ base: '1 1 calc(50% - 4px)', sm: '1 1 auto' }}
              maxW={{ sm: '160px' }}
              minW={{ base: '0', sm: '120px' }}
            >
              <option value="all">All Categories</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </Select>
            
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
              {availableSources.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
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
              onAddLeadReady={(callback) => setAddLeadHandler(() => callback)}
              globalSearchQuery={globalSearchQuery}
              globalLeadCategoryFilter={globalLeadCategoryFilter}
              globalClientTypeFilter={globalClientTypeFilter}
              globalSourceFilter={globalSourceFilter}
              globalAttemptsFilter={globalAttemptsFilter}
              globalOwnerFilter={globalOwnerFilter}
            />
          </TabPanel>

          {/* Lead Outcomes Tab Panel - Pre-mounted for instant switching */}
          <TabPanel p={0} pt={4}>
            <LeadOutcomesTabContent 
              onCountChange={handleLeadOutcomesCountChange}
              globalSearchQuery={globalSearchQuery}
              globalLeadCategoryFilter={globalLeadCategoryFilter}
              globalClientTypeFilter={globalClientTypeFilter}
              globalSourceFilter={globalSourceFilter}
              globalOwnerFilter={globalOwnerFilter}
              onOwnersLoad={(owners) => {
                setAvailableOwners(owners);
              }}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}





