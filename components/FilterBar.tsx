'use client';

import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  VStack,
  Text,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { HiSearch, HiX, HiFilter, HiViewGrid, HiViewList } from 'react-icons/hi';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  sourceFilter: string;
  onSourceChange: (value: string) => void;
  dateFilter: string;
  onDateChange: (value: string) => void;
  viewMode: 'table' | 'tiles';
  onViewModeChange: (mode: 'table' | 'tiles') => void;
  activeFiltersCount: number;
  onClearFilters: () => void;
}

export default function FilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sourceFilter,
  onSourceChange,
  dateFilter,
  onDateChange,
  viewMode,
  onViewModeChange,
  activeFiltersCount,
  onClearFilters,
}: FilterBarProps) {
  return (
    <Box bg="white" p={{ base: 3, md: 4 }} borderRadius="lg" boxShadow="sm" mb={4}>
      <VStack spacing={3} align="stretch">
        {/* Search and View Mode */}
        <Flex gap={2} flexWrap="wrap" align="center">
          <InputGroup flex="1" minW={{ base: 'full', md: '300px' }}>
            <InputLeftElement>
              <HiSearch />
            </InputLeftElement>
            <Input
              placeholder="Search by name, email, phone..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </InputGroup>

          {/* Active Filters Badge */}
          {activeFiltersCount > 0 && (
            <HStack spacing={2}>
              <Badge colorScheme="blue" fontSize="sm" px={2} py={1}>
                {activeFiltersCount} {activeFiltersCount === 1 ? 'filter' : 'filters'} active
              </Badge>
              <Tooltip label="Clear all filters">
                <IconButton
                  icon={<HiX />}
                  size="sm"
                  variant="ghost"
                  colorScheme="red"
                  aria-label="Clear filters"
                  onClick={onClearFilters}
                />
              </Tooltip>
            </HStack>
          )}

          {/* View Mode Toggle */}
          <HStack spacing={0} ml="auto">
            <Tooltip label="Table view">
              <IconButton
                icon={<HiViewList />}
                size="sm"
                variant={viewMode === 'table' ? 'solid' : 'ghost'}
                colorScheme={viewMode === 'table' ? 'blue' : 'gray'}
                aria-label="Table view"
                onClick={() => onViewModeChange('table')}
                borderRightRadius={0}
              />
            </Tooltip>
            <Tooltip label="Tiles view">
              <IconButton
                icon={<HiViewGrid />}
                size="sm"
                variant={viewMode === 'tiles' ? 'solid' : 'ghost'}
                colorScheme={viewMode === 'tiles' ? 'blue' : 'gray'}
                aria-label="Tiles view"
                onClick={() => onViewModeChange('tiles')}
                borderLeftRadius={0}
              />
            </Tooltip>
          </HStack>
        </Flex>

        {/* Filter Dropdowns */}
        <HStack spacing={{ base: 2, md: 3 }} flexWrap="wrap">
          <Select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            maxW="200px"
            size="sm"
            bg={statusFilter ? 'blue.50' : 'white'}
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="followup">Follow-up</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="unreach">Unreachable</option>
            <option value="unqualified">Unqualified</option>
          </Select>

          <Select
            value={sourceFilter}
            onChange={(e) => onSourceChange(e.target.value)}
            maxW="200px"
            size="sm"
            bg={sourceFilter ? 'blue.50' : 'white'}
          >
            <option value="">All Sources</option>
            <option value="Meta">Meta</option>
            <option value="Website">Website</option>
            <option value="Manual">Manual</option>
            <option value="Referral">Referral</option>
          </Select>

          <Select
            value={dateFilter}
            onChange={(e) => onDateChange(e.target.value)}
            maxW="200px"
            size="sm"
            bg={dateFilter !== 'all' ? 'blue.50' : 'white'}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </Select>
        </HStack>
      </VStack>
    </Box>
  );
}
