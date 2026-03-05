'use client';

import { useState, useEffect, useCallback } from 'react';
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
} from '@chakra-ui/react';
import LeadsTabContent from '@/features/leads/components/LeadsTabContent';
import LeadOutcomesTabContent from '@/features/leads/components/LeadOutcomesTabContent';
import DebouncedSearchInput from '@/shared/components/DebouncedSearchInput';

export default function UnifiedLeadsPage() {
  const searchParams = useSearchParams();
  const [globalSearchQuery, setGlobalSearchQuery] = useState(''); // Search query passed to children
  const [leadOutcomesCount, setLeadOutcomesCount] = useState(0);
  
  // Initialize tab based on query parameter
  const initialTab = searchParams.get('tab') === 'outcomes' ? 1 : 0;
  const [activeTabIndex, setActiveTabIndex] = useState(initialTab);

  // Callback for when search input is debounced
  const handleSearch = useCallback((query: string) => {
    setGlobalSearchQuery(query);
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

  const handleLeadOutcomesCountChange = (count: number) => {
    setLeadOutcomesCount(count);
  };

  return (
    <Box>
      {/* Global Search Bar */}
      <Box bg="white" p={{ base: 3, md: 4 }} borderRadius="lg" boxShadow="sm" mb={4}>
        <Flex direction={{ base: 'column', md: 'row' }} gap={3} align={{ base: 'stretch', md: 'center' }} justify="space-between">
          <Heading size={{ base: 'md', md: 'lg' }}>Lead Management</Heading>
          <DebouncedSearchInput
            placeholder="Search leads across all sections..."
            onSearch={handleSearch}
            debounceMs={300}
            size="md"
            maxW={{ base: 'full', md: '400px' }}
          />
        </Flex>
      </Box>

      {/* Tabs for Leads and Lead Outcomes */}
      <Tabs 
        index={activeTabIndex} 
        onChange={setActiveTabIndex}
        variant="enclosed"
        colorScheme="blue"
      >
        <TabList>
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
          {/* Leads Tab Panel */}
          <TabPanel p={0} pt={4}>
            <LeadsTabContent globalSearchQuery={globalSearchQuery} />
          </TabPanel>

          {/* Lead Outcomes Tab Panel */}
          <TabPanel p={0} pt={4}>
            <LeadOutcomesTabContent 
              globalSearchQuery={globalSearchQuery}
              onCountChange={handleLeadOutcomesCountChange}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}





