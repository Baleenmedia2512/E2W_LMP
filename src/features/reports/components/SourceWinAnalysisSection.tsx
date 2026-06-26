'use client';

import {
  Badge,
  Box,
  Card,
  Center,
  Collapse,
  Flex,
  Heading,
  HStack,
  IconButton,
  Select,
  SimpleGrid,
  Spinner,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  Icon,
  Tfoot,
} from '@chakra-ui/react';
import { Fragment, useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { FiChevronDown, FiChevronUp, FiTrendingUp, FiPieChart, FiAward } from 'react-icons/fi';
import { fetcher } from '@/shared/lib/swr';
import { formatDate } from '@/shared/lib/date-utils';
import { formatPhoneForDisplay } from '@/shared/utils/phone';

type SortKey = 'totalLeads' | 'winRatio' | 'conversionRate' | 'avgCallAttempts' | 'volumeShare';
type SortOrder = 'asc' | 'desc';
type LeadMetric = 'total' | 'won' | 'lost';

interface ExpandedDetail {
  source: string;
  metric: LeadMetric;
}

interface SourceWinAnalysisRow {
  source: string;
  totalLeads: number;
  won: number;
  lost: number;
  unqualified: number;
  unreach: number;
  closedDeals: number;
  winRatio: number | null;
  conversionRate: number;
  avgCallAttempts: number;
  inboundCount: number;
  outboundCount: number;
  volumeShare: number;
  confidence: 'high' | 'low';
}

interface SourceWinAnalysisData {
  sources: SourceWinAnalysisRow[];
  summary: {
    overallWinRatio: number | null;
    overallConversionRate: number;
    totalLeads: number;
    totalWon: number;
    totalLost: number;
    bestWinRatio: { source: string; winRatio: number; closedDeals: number } | null;
    highestVolume: { source: string; totalLeads: number } | null;
  };
}

interface SourceLeadDetail {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  status: string;
  source: string;
  campaign: string | null;
  createdAt: string;
  is_existing: boolean;
  assignedTo: { id: string; name: string } | null;
  remarks: string | null;
  nextFollowupAt: string | null;
}

interface SourceWinAnalysisSectionProps {
  startDate: string;
  endDate: string;
  dateFilterType: 'created' | 'updated';
  selectedAgentId: string;
}

const METRIC_LABELS: Record<LeadMetric, string> = {
  total: 'All Leads',
  won: 'Won Leads',
  lost: 'Lost Leads',
};

const STATUS_BADGE_BG: Record<string, string> = {
  new: 'blue.500',
  followup: 'orange.500',
  qualified: 'teal.500',
  won: 'green.500',
  lost: 'red.500',
  unreach: 'pink.500',
  unqualified: 'purple.500',
};

function formatPercent(value: number | null): string {
  if (value === null) return '—';
  return `${value.toFixed(1)}%`;
}

function getStatusLabel(status: string): string {
  if (status === 'unreach') return 'UNREACHABLE';
  if (status === 'followup') return 'FOLLOWUP';
  return status.toUpperCase();
}

function SourceLeadDrilldownTable({
  leads,
  isLoading,
  onLeadClick,
}: {
  leads: SourceLeadDetail[];
  isLoading: boolean;
  onLeadClick: (leadId: string) => void;
}) {
  if (isLoading) {
    return (
      <Center py={8}>
        <Spinner size="md" color="blue.500" mr={3} />
        <Text fontSize="sm" color="gray.500">Loading lead details...</Text>
      </Center>
    );
  }

  if (leads.length === 0) {
    return (
      <Text fontSize="xs" color="gray.400" fontStyle="italic" py={3}>
        No leads found for this selection.
      </Text>
    );
  }

  return (
    <Box 
      border="1px solid" 
      borderColor="gray.200" 
      borderRadius="md" 
      overflowX="auto" 
      overflowY="auto"
      maxH="300px" 
      bg="white"
      position="relative"
    >
      <Table size="sm" variant="simple" layout="fixed" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
        <Thead position="sticky" top={0} zIndex={4}>
          <Tr>
            <Th 
              color="gray.600" 
              py={2.5} 
              w="140px"
              bg="gray.100"
              position="sticky"
              left={0}
              zIndex={5}
              style={{ borderBottom: '1px solid #E2E8F0', boxShadow: '1px 0px 0px #E2E8F0' }}
            >
              Lead Name
            </Th>
            <Th color="gray.600" py={2.5} w="120px" bg="gray.100" style={{ borderBottom: '1px solid #E2E8F0' }}>Phone</Th>
            <Th color="gray.600" py={2.5} w="160px" bg="gray.100" style={{ borderBottom: '1px solid #E2E8F0' }}>Email</Th>
            <Th color="gray.600" py={2.5} w="130px" bg="gray.100" style={{ borderBottom: '1px solid #E2E8F0' }}>Status</Th>
            <Th color="gray.600" py={2.5} w="100px" bg="gray.100" style={{ borderBottom: '1px solid #E2E8F0' }}>Source</Th>
            <Th color="gray.600" py={2.5} w="130px" bg="gray.100" style={{ borderBottom: '1px solid #E2E8F0' }}>Assigned To</Th>
            <Th color="gray.600" py={2.5} w="130px" bg="gray.100" style={{ borderBottom: '1px solid #E2E8F0' }}>Created Date</Th>
            <Th color="gray.600" py={2.5} w="120px" bg="gray.100" style={{ borderBottom: '1px solid #E2E8F0' }}>Campaign</Th>
            <Th color="gray.600" py={2.5} w="250px" bg="gray.100" style={{ borderBottom: '1px solid #E2E8F0' }}>Remarks</Th>
          </Tr>
        </Thead>
        <Tbody>
          {leads.map((lead) => (
            <Tr key={lead.id} _hover={{ bg: 'gray.50' }}>
              <Td 
                py={2}
                position="sticky"
                left={0}
                bg="white"
                zIndex={2}
                style={{ borderBottom: '1px solid #E2E8F0', boxShadow: '1px 0px 0px #E2E8F0', wordBreak: 'normal', whiteSpace: 'normal' }}
              >
                <Text
                  fontSize="sm"
                  fontWeight="medium"
                  color={lead.is_existing ? 'green.600' : 'blue.600'}
                  cursor="pointer"
                  _hover={{ textDecoration: 'underline' }}
                  onClick={() => onLeadClick(lead.id)}
                >
                  {lead.name}
                </Text>
              </Td>
              <Td fontSize="sm" py={2} whiteSpace="nowrap" style={{ borderBottom: '1px solid #E2E8F0' }}>
                {formatPhoneForDisplay(lead.phone)}
              </Td>
              <Td fontSize="sm" py={2} isTruncated style={{ borderBottom: '1px solid #E2E8F0' }}>
                {lead.email || '-'}
              </Td>
              <Td py={2} style={{ borderBottom: '1px solid #E2E8F0' }}>
                <Badge bg={STATUS_BADGE_BG[lead.status] || 'gray.500'} color="white" fontSize="xs">
                  {getStatusLabel(lead.status)}
                </Badge>
                {lead.status === 'followup' && lead.nextFollowupAt && (
                  <Text fontSize="2xs" color="gray.600" mt={0.5} whiteSpace="nowrap">
                    📅 {new Date(lead.nextFollowupAt).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </Text>
                )}
              </Td>
              <Td py={2} style={{ borderBottom: '1px solid #E2E8F0' }}>
                <Badge bg="teal.500" color="white" fontSize="xs">
                  {lead.source}
                </Badge>
              </Td>
              <Td fontSize="sm" color="gray.600" py={2} whiteSpace="nowrap" style={{ borderBottom: '1px solid #E2E8F0' }}>
                {lead.assignedTo?.name || 'Unassigned'}
              </Td>
              <Td fontSize="sm" py={2} whiteSpace="nowrap" style={{ borderBottom: '1px solid #E2E8F0' }}>
                {formatDate(new Date(lead.createdAt))}
              </Td>
              <Td fontSize="sm" py={2} isTruncated style={{ borderBottom: '1px solid #E2E8F0' }}>
                {lead.campaign || '-'}
              </Td>
              <Td fontSize="sm" py={2} maxW="250px" style={{ borderBottom: '1px solid #E2E8F0' }}>
                <Text noOfLines={2} title={lead.remarks || undefined}>
                  {lead.remarks || '-'}
                </Text>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}

export default function SourceWinAnalysisSection({
  startDate,
  endDate,
  dateFilterType,
  selectedAgentId,
}: SourceWinAnalysisSectionProps) {
  const router = useRouter();
  
  const [sortKey, setSortKey] = useState<SortKey>('conversionRate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [leadCategory, setLeadCategory] = useState<'all' | 'INBOUND' | 'OUTBOUND'>('all');
  const [expandedDetail, setExpandedDetail] = useState<ExpandedDetail | null>(null);

  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [tableWidth, setTableWidth] = useState(0);

  const agentQuery = selectedAgentId !== 'all' ? `&agentId=${selectedAgentId}` : '';
  const categoryQuery = leadCategory !== 'all' ? `&leadCategory=${leadCategory}` : '';
  const analysisUrl = `/api/reports/source-win-analysis?startDate=${startDate}&endDate=${endDate}&dateFilterType=${dateFilterType}${agentQuery}${categoryQuery}`;

  const leadsUrl = expandedDetail
    ? `/api/reports/source-win-analysis/leads?source=${encodeURIComponent(expandedDetail.source)}&metric=${expandedDetail.metric}&startDate=${startDate}&endDate=${endDate}&dateFilterType=${dateFilterType}${agentQuery}${categoryQuery}`
    : null;

  const { data: rawData, isLoading, error: swrError } = useSWR(analysisUrl, fetcher, {
    keepPreviousData: true,
    dedupingInterval: 30000,
    revalidateOnFocus: false,
  });
  const { data: leadsRawData, isLoading: leadsLoading } = useSWR(leadsUrl, fetcher, {
    keepPreviousData: true,
    dedupingInterval: 30000,
    revalidateOnFocus: false,
  });
  const analysis: SourceWinAnalysisData | null = rawData?.success ? rawData.data : null;
  const error = swrError || (rawData && !rawData.success);
  const drilldownLeads: SourceLeadDetail[] = leadsRawData?.success ? leadsRawData.data.leads : [];

  const sortedSources = useMemo(() => {
    if (!analysis?.sources) return [];
    const rows = [...analysis.sources];
    rows.sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (sortKey === 'winRatio') {
        valA = a.winRatio ?? -1;
        valB = b.winRatio ?? -1;
      } else {
        valA = a[sortKey] as number;
        valB = b[sortKey] as number;
      }

      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });
    return rows;
  }, [analysis?.sources, sortKey, sortOrder]);

  const bestSourceByConversion = useMemo(() => {
    if (!analysis?.sources || analysis.sources.length === 0) return null;
    return [...analysis.sources].sort((a, b) => b.conversionRate - a.conversionRate)[0];
  }, [analysis?.sources]);

  const computedWinRatioByConversion = useMemo(() => {
    if (!analysis?.summary) return '0.0%';
    const totalLeads = analysis.summary.totalLeads || 0;
    const totalWon = analysis.summary.totalWon || 0;
    if (totalLeads === 0) return '0.0%';
    return `${((totalWon / totalLeads) * 100).toFixed(1)}%`;
  }, [analysis?.summary]);

  useEffect(() => {
    const topScroll = topScrollRef.current;
    const tableContainer = tableContainerRef.current;

    if (!topScroll || !tableContainer) return;

    let isSyncingTop = false;
    let isSyncingContainer = false;

    const handleTopScroll = () => {
      if (isSyncingContainer) {
        isSyncingContainer = false;
        return;
      }
      isSyncingTop = true;
      tableContainer.scrollLeft = topScroll.scrollLeft;
    };

    const handleContainerScroll = () => {
      if (isSyncingTop) {
        isSyncingTop = false;
        return;
      }
      isSyncingContainer = true;
      topScroll.scrollLeft = tableContainer.scrollLeft;
    };

    topScroll.addEventListener('scroll', handleTopScroll, { passive: true });
    tableContainer.addEventListener('scroll', handleContainerScroll, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      const internalTable = tableContainer.querySelector('table');
      if (internalTable) {
        setTableWidth(internalTable.scrollWidth || 0);
      }
    });
    resizeObserver.observe(tableContainer);

    return () => {
      topScroll.removeEventListener('scroll', handleTopScroll);
      tableContainer.removeEventListener('scroll', handleContainerScroll);
      resizeObserver.disconnect();
    };
  }, [sortedSources]);

  const handleMetricClick = useCallback((source: string, metric: LeadMetric) => {
    setExpandedDetail((current) => {
      if (current?.source === source && current.metric === metric) {
        return null;
      }
      
      if (tableContainerRef.current) {
        tableContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      }
      if (topScrollRef.current) {
        topScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      }

      return { source, metric };
    });
  }, []);

  const handleLeadClick = useCallback((leadId: string) => {
    router.push(`/dashboard/leads/${leadId}`);
  }, [router]);

  const toggleManualSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((current) => (current === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const metricCellProps = (source: string, metric: LeadMetric) => {
    const isActive = expandedDetail?.source === source && expandedDetail.metric === metric;
    return {
      cursor: 'pointer' as const,
      textDecoration: isActive ? 'underline' : undefined,
      _hover: { textDecoration: 'underline', bg: 'blue.50' },
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        handleMetricClick(source, metric);
      },
    };
  };

  return (
    <Card variant="outline" borderRadius="xl" bg="white" shadow="sm" border="1px solid" borderColor="gray.200" p={6} mb={6}>
      <Flex justify="space-between" align="center" flexWrap="wrap" gap={4} mb={6} pb={5} borderBottom="1px solid" borderColor="gray.100">
        <Box>
          <Heading size="md" color="gray.800" fontWeight="bold">
            Conversion Rate by Source
          </Heading>
          <Text fontSize="xs" color="gray.500" mt={1}>
            Click Conv. Rate header to toggle manual sorting order dynamically.
          </Text>
        </Box>

        <HStack spacing={3}>
          <Select
            size="sm"
            borderRadius="md"
            value={leadCategory}
            onChange={(e) => setLeadCategory(e.target.value as 'all' | 'INBOUND' | 'OUTBOUND')}
            w="140px"
            bg="gray.50"
          >
            <option value="all">All Channels</option>
            <option value="INBOUND">Inbound</option>
            <option value="OUTBOUND">Outbound</option>
          </Select>
        </HStack>
      </Flex>

      {isLoading && !analysis && (
        <Text fontSize="sm" color="gray.500" py={10} textAlign="center">
          Loading dashboard metrics...
        </Text>
      )}

      {error && (
        <Box bg="red.50" p={4} borderRadius="md" color="red.600" fontSize="sm">
          Failed to load source win analysis data.
        </Box>
      )}

      {analysis && (
        <VStack align="stretch" spacing={6}>
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={4}>
            {[
              { 
                label: 'Overall Win Ratio', 
                val: computedWinRatioByConversion, 
                help: `${analysis.summary.totalWon} won / ${analysis.summary.totalLeads} total leads`, 
                icon: FiTrendingUp, 
                color: 'blue' 
              },
              { 
                label: 'Best Performing Source', 
                val: bestSourceByConversion?.source ?? '—', 
                help: bestSourceByConversion ? `${bestSourceByConversion.conversionRate.toFixed(1)}% Conv. Rate` : 'No data', 
                icon: FiAward, 
                color: 'green' 
              },
              { label: 'Highest Volume Driver', val: analysis.summary.highestVolume?.source ?? '—', help: analysis.summary.highestVolume ? `${analysis.summary.highestVolume.totalLeads} total leads` : 'No data', icon: FiPieChart, color: 'purple' },
            ].map((card, idx) => (
              <Box key={idx} p={4} border="1px solid" borderColor="gray.100" borderRadius="lg" bg="gray.50/50">
                <Flex align="center" gap={3}>
                  <Flex p={2} bg={`${card.color}.50`} color={`${card.color}.500`} borderRadius="md">
                    <Icon as={card.icon} boxSize={4} />
                  </Flex>
                  <Stat size="sm">
                    <StatLabel fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase">{card.label}</StatLabel>
                    <StatNumber fontSize="lg" fontWeight="bold" color="gray.800" mt={0.5}>{card.val}</StatNumber>
                    <StatHelpText fontSize="2xs" color="gray.500" mb={0}>{card.help}</StatHelpText>
                  </Stat>
                </Flex>
              </Box>
            ))}
          </SimpleGrid>

          {/* DUAL TOP HORIZONTAL SCROLLBAR */}
          <Box 
            ref={topScrollRef} 
            overflowX="auto" 
            overflowY="hidden"
            h="12px" 
            w="100%"
            mb="-16px" 
            zIndex={10}
          >
            <Box h="1px" w={`${tableWidth}px`} />
          </Box>

          {/* MAIN PARENT PERFORMANCE TABLE CONTAINER */}
          <Box 
            ref={tableContainerRef} 
            overflowX="auto" 
            maxH="500px" 
            border="1px solid" 
            borderColor="gray.200" 
            borderRadius="lg"
            position="relative"
          >
            <Table variant="simple" size="md" layout="fixed" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <Thead position="sticky" top={0} zIndex={4}>
                <Tr>
                  <Th 
                    w={{ base: "40px", md: "50px" }} 
                    py={3} 
                    bg="gray.50" 
                    position="sticky" 
                    left={0} 
                    zIndex={5}
                    style={{ borderBottom: '1px solid #E2E8F0' }}
                  />
                  <Th 
                    color="gray.600" 
                    fontSize="xs" 
                    py={3} 
                    w={{ base: "110px", md: "180px" }}
                    bg="gray.50" 
                    position="sticky" 
                    left={{ base: "40px", md: "50px" }} 
                    zIndex={5}
                    style={{ borderBottom: '1px solid #E2E8F0', boxShadow: '1px 0px 0px #E2E8F0' }}
                  >
                    Source Channel
                  </Th>
                  <Th isNumeric color="gray.600" fontSize="xs" py={3} w="120px" bg="gray.50" style={{ borderBottom: '1px solid #E2E8F0' }}>Total Leads</Th>
                  <Th isNumeric color="gray.600" fontSize="xs" py={3} w="120px" bg="gray.50" style={{ borderBottom: '1px solid #E2E8F0' }}>Won</Th>
                  <Th isNumeric color="gray.600" fontSize="xs" py={3} w="120px" bg="gray.50" style={{ borderBottom: '1px solid #E2E8F0' }}>Lost</Th>
                  <Th 
                    isNumeric 
                    color="blue.600" 
                    fontSize="xs" 
                    py={3} 
                    w="120px" 
                    bg="gray.50" 
                    cursor="pointer"
                    onClick={() => toggleManualSort('conversionRate')}
                    _hover={{ bg: 'gray.100' }}
                    style={{ borderBottom: '1px solid #E2E8F0', userSelect: 'none' }}
                  >
                    Conv. Rate {sortKey === 'conversionRate' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                  </Th>
                </Tr>
              </Thead>

              <Tbody>
                {sortedSources.map((row) => {
                  const isExpanded = expandedDetail?.source === row.source;
                  const rowBg = isExpanded ? '#F7FAFC' : '#FFFFFF';

                  return (
                    <Fragment key={row.source}>
                      <Tr _hover={{ bg: 'blue.50/30' }} bg={rowBg} transition="all 0.2s">
                        <Td 
                          py={3.5} 
                          position="sticky" 
                          left={0} 
                          bg={rowBg} 
                          zIndex={2}
                          style={{ borderBottom: '1px solid #E2E8F0' }}
                        >
                          <IconButton
                            aria-label={isExpanded ? 'Collapse details' : 'Expand via metric columns'}
                            icon={isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                            size="xs"
                            variant="ghost"
                            color="gray.400"
                            onClick={() => isExpanded && setExpandedDetail(null)}
                            cursor={isExpanded ? 'pointer' : 'default'}
                          />
                        </Td>

                        <Td 
                          fontWeight="bold" 
                          color="gray.700" 
                          py={3.5}
                          position="sticky"
                          left={{ base: "40px", md: "50px" }}
                          bg={rowBg}
                          zIndex={2}
                          style={{ borderBottom: '1px solid #E2E8F0', boxShadow: '1px 0px 0px #E2E8F0', wordBreak: 'normal', whiteSpace: 'normal' }}
                        >
                          <Text fontSize="sm">{row.source}</Text>
                        </Td>

                        <Td isNumeric fontWeight="medium" py={3.5} fontSize="sm" color="gray.700" style={{ borderBottom: '1px solid #E2E8F0' }} {...metricCellProps(row.source, 'total')}>
                          {row.totalLeads}
                        </Td>
                        <Td isNumeric fontWeight="bold" color="green.600" py={3.5} fontSize="sm" style={{ borderBottom: '1px solid #E2E8F0' }} {...metricCellProps(row.source, 'won')}>
                          {row.won}
                        </Td>
                        <Td isNumeric fontWeight="medium" color="red.500" py={3.5} fontSize="sm" style={{ borderBottom: '1px solid #E2E8F0' }} {...metricCellProps(row.source, 'lost')}>
                          {row.lost}
                        </Td>
                        <Td isNumeric fontWeight="semibold" color="gray.700" py={3.5} fontSize="sm" style={{ borderBottom: '1px solid #E2E8F0' }}>
                          {row.conversionRate.toFixed(1)}%
                        </Td>
                      </Tr>

                      <Tr>
                        <Td 
                          colSpan={6} 
                          p={0} 
                          position={isExpanded ? "sticky" : "static"}
                          left={0}
                          bg="gray.50/30" 
                          style={{ borderBottom: isExpanded ? '1px solid #E2E8F0' : 'none' }}
                        >
                          <Collapse in={isExpanded} animateOpacity>
                            <Box 
                              px={{ base: 3, md: 6 }} 
                              py={4}
                              w={{ base: "calc(100vw - 42px)", md: "100%" }}
                            >
                              <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase" letterSpacing="wider" mb={2.5}>
                                {expandedDetail ? `${METRIC_LABELS[expandedDetail.metric]} — ${row.source}` : ''}
                                {isExpanded && drilldownLeads.length > 0 && !leadsLoading && (
                                  <Box as="span" color="gray.400" fontWeight="normal" ml={2}>
                                    ({drilldownLeads.length})
                                  </Box>
                                )}
                              </Text>

                              <SourceLeadDrilldownTable
                                leads={isExpanded ? drilldownLeads : []}
                                isLoading={isExpanded && (leadsLoading || leadsRawData?.data?.source !== row.source)}
                                onLeadClick={handleLeadClick}
                              />

                              <HStack mt={3} spacing={4} textTransform="uppercase" fontSize="10px" fontWeight="bold" color="gray.400" flexWrap="wrap">
                                <Text>Unqualified: <Box as="span" color="gray.600">{row.unqualified}</Box></Text>
                                <Text>|</Text>
                                <Text>Unreachable: <Box as="span" color="gray.600">{row.unreach}</Box></Text>
                                <Text>|</Text>
                                <Text>Total Closed Events: <Box as="span" color="gray.600">{row.closedDeals}</Box></Text>
                                <Text>|</Text>
                                <Text>Inbound/Outbound Mix: <Box as="span" color="gray.600" fontFamily="mono">{row.inboundCount}I / {row.outboundCount}O</Box></Text>
                              </HStack>
                            </Box>
                          </Collapse>
                        </Td>
                      </Tr>
                    </Fragment>
                  );
                })}
              </Tbody>

              <Tfoot position="sticky" bottom={0} zIndex={4} bg="gray.100">
                <Tr bg="gray.100" fontWeight="bold">
                  <Td py={3} position="sticky" left={0} bg="gray.100" zIndex={5} style={{ borderTop: '2px solid #CBD5E1', borderBottom: '1px solid #CBD5E1' }} />
                  <Td 
                    color="gray.800" 
                    fontSize="sm" 
                    py={3} 
                    position="sticky" 
                    left={{ base: "40px", md: "50px" }} 
                    bg="gray.100" 
                    zIndex={5} 
                    style={{ borderTop: '2px solid #CBD5E1', borderBottom: '1px solid #CBD5E1', boxShadow: '1px 0px 0px #E2E8F0' }}
                  >
                    Total
                  </Td>
                  <Td isNumeric color="gray.800" fontSize="sm" py={3} style={{ borderTop: '2px solid #CBD5E1', borderBottom: '1px solid #CBD5E1' }}>
                    {analysis.summary.totalLeads}
                  </Td>
                  <Td isNumeric color="green.700" fontSize="sm" py={3} style={{ borderTop: '2px solid #CBD5E1', borderBottom: '1px solid #CBD5E1' }}>
                    {analysis.summary.totalWon}
                  </Td>
                  <Td isNumeric color="red.600" fontSize="sm" py={3} style={{ borderTop: '2px solid #CBD5E1', borderBottom: '1px solid #CBD5E1' }}>
                    {analysis.summary.totalLost}
                  </Td>
                  {/* FIXED: Calculates and displays the total system-wide conversion rate row baseline count */}
                  <Td isNumeric color="gray.800" fontSize="sm" py={3} style={{ borderTop: '2px solid #CBD5E1', borderBottom: '1px solid #CBD5E1' }}>
                    {analysis.summary.totalLeads > 0 
                      ? `${((analysis.summary.totalWon / analysis.summary.totalLeads) * 100).toFixed(1)}%` 
                      : '0.0%'}
                  </Td>
                </Tr>
              </Tfoot>
            </Table>
          </Box>
        </VStack>
      )}
    </Card>
  );
}