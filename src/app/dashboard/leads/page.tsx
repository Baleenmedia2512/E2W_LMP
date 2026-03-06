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
} from '@chakra-ui/react';
import { HiSearch } from 'react-icons/hi';
import LeadsTabContent from '@/features/leads/components/LeadsTabContent';
import LeadOutcomesTabContent from '@/features/leads/components/LeadOutcomesTabContent';
import GlobalSearchResults from '@/features/leads/components/GlobalSearchResults';
import DebouncedSearchInput from '@/shared/components/DebouncedSearchInput';

export default function UnifiedLeadsPage() {
  const searchParams = useSearchParams();
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [leadOutcomesCount, setLeadOutcomesCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  
  // Initialize tab based on query parameter or search state
  const getInitialTab = () => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'outcomes') return 1;
    return 0;
  };
  
  const [activeTabIndex, setActiveTabIndex] = useState(getInitialTab());

  // Callback for global search - use transition to keep UI responsive
  const handleGlobalSearch = useCallback((query: string) => {
    startTransition(() => {
      setGlobalSearchQuery(query);
      // Auto-switch to Search tab when user starts searching
      if (query.trim()) {
        setActiveTabIndex(0); // Search tab will be first when active
      }
    });
  }, []);

  // Update tab when query param changes (but not when search is active)
  useEffect(() => {
    if (!globalSearchQuery.trim()) {
      const tabParam = searchParams.get('tab');
      if (tabParam === 'outcomes') {
        setActiveTabIndex(1);
      } else {
        setActiveTabIndex(0);
      }
    }
  }, [searchParams, globalSearchQuery]);

  const handleLeadOutcomesCountChange = (count: number) => {
    setLeadOutcomesCount(count);
  };
  
  // Determine if search is active
  const isSearchActive = globalSearchQuery.trim().length > 0;

  return (
    <Box>
      {/* Page Header with Global Search */}
      <Box bg="white" p={{ base: 3, md: 4 }} borderRadius="lg" boxShadow="sm" mb={4}>
        <Flex direction={{ base: 'column', md: 'row' }} gap={3} align={{ base: 'stretch', md: 'center' }} justify="space-between">
          <Heading size={{ base: 'md', md: 'lg' }}>Lead Management</Heading>
          <DebouncedSearchInput
            placeholder="🔍 Global search across all leads..."
            onSearch={handleGlobalSearch}
            debounceMs={400}
            size="md"
            maxW={{ base: 'full', md: '400px' }}
          />
        </Flex>
      </Box>

      {/* Tabs - Show Search tab when searching, otherwise show Leads/Outcomes */}
      <Tabs 
        index={activeTabIndex} 
        onChange={setActiveTabIndex}
        variant="enclosed"
        colorScheme="blue"
      >
        <TabList>
          {/* Show Search tab when search is active */}
          {isSearchActive && (
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
              <Flex align="center" gap={2}>
                <Icon as={HiSearch} />
                <span>Search Results</span>
              </Flex>
            </Tab>
          )}
          
          {/* Regular tabs - always visible */}
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
          {/* Search Results Tab Panel - Only shown when searching */}
          {isSearchActive && (
            <TabPanel p={0} pt={4}>
              <GlobalSearchResults searchQuery={globalSearchQuery} />
            </TabPanel>
          )}
          
          {/* Leads Tab Panel - No global search passed */}
          <TabPanel p={0} pt={4}>
            <LeadsTabContent />
          </TabPanel>

          {/* Lead Outcomes Tab Panel - No global search passed */}
          <TabPanel p={0} pt={4}>
            <LeadOutcomesTabContent 
              onCountChange={handleLeadOutcomesCountChange}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}





