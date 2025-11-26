// Example: How to add custom KPI cards to the DSR page
// This file demonstrates adding new metrics to the DSR dashboard

import { DSRCard } from '@/components/DSRCard';
import { HiTrendingUp, HiCheckCircle, HiClock } from 'react-icons/hi';

/**
 * Example 1: Conversion Rate Card
 * Shows the percentage of leads that converted to customers
 */
export function ConversionRateCard({ stats, activeCard, handleCardClick }) {
  const conversionRate = stats.totalNewLeads > 0 
    ? ((stats.convertedLeads / stats.totalNewLeads) * 100).toFixed(1)
    : 0;

  return (
    <DSRCard
      label="Conversion Rate"
      value={`${conversionRate}%`}
      helpText={`${stats.convertedLeads} of ${stats.totalNewLeads} leads`}
      icon={HiTrendingUp}
      colorScheme="primary"
      type="conversionRate"
      onClick={handleCardClick}
      isActive={activeCard === 'conversionRate'}
    />
  );
}

/**
 * Example 2: Average Response Time Card
 * Shows average time to respond to new leads
 */
export function AvgResponseTimeCard({ stats, activeCard, handleCardClick }) {
  return (
    <DSRCard
      label="Avg Response Time"
      value={stats.avgResponseTime}
      helpText="Hours to first contact"
      icon={HiClock}
      colorScheme="medium"
      type="avgResponseTime"
      onClick={handleCardClick}
      isActive={activeCard === 'avgResponseTime'}
    />
  );
}

/**
 * Example 3: Qualified Leads Card
 * Shows leads that have been qualified
 */
export function QualifiedLeadsCard({ stats, activeCard, handleCardClick }) {
  return (
    <DSRCard
      label="Qualified Leads"
      value={stats.qualifiedLeadsToday}
      total={stats.totalQualifiedLeads}
      helpText="Meeting qualification criteria"
      icon={HiCheckCircle}
      colorScheme="accent"
      type="qualifiedLeads"
      onClick={handleCardClick}
      isActive={activeCard === 'qualifiedLeads'}
    />
  );
}

/**
 * Stats Calculation Examples
 * Add these to your stats useMemo hook
 */
export const customStatsCalculations = {
  // Conversion Rate Calculation
  convertedLeads: (filteredLeads, start, end) => {
    return filteredLeads.filter(lead => {
      const leadDate = new Date(lead.createdAt);
      return leadDate >= start && 
             leadDate <= end && 
             (lead.status === 'won' || lead.status === 'qualified');
    }).length;
  },

  // Average Response Time Calculation
  avgResponseTime: (filteredLeads, mockCallLogs, start, end) => {
    const leadsWithCalls = filteredLeads.filter(lead => {
      const leadDate = new Date(lead.createdAt);
      const firstCall = mockCallLogs
        .filter(call => call.leadId === lead.id)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
      
      if (!firstCall) return false;
      
      const callDate = new Date(firstCall.createdAt);
      return leadDate >= start && leadDate <= end;
    });

    if (leadsWithCalls.length === 0) return '0h';

    const totalResponseTime = leadsWithCalls.reduce((total, lead) => {
      const leadDate = new Date(lead.createdAt);
      const firstCall = mockCallLogs
        .filter(call => call.leadId === lead.id)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
      
      if (!firstCall) return total;
      
      const callDate = new Date(firstCall.createdAt);
      const diff = callDate.getTime() - leadDate.getTime();
      return total + (diff / (1000 * 60 * 60)); // Convert to hours
    }, 0);

    const avgHours = (totalResponseTime / leadsWithCalls.length).toFixed(1);
    return `${avgHours}h`;
  },

  // Qualified Leads Calculation
  qualifiedLeadsToday: (filteredLeads, start, end) => {
    return filteredLeads.filter(lead => {
      const leadDate = new Date(lead.createdAt);
      return leadDate >= start && 
             leadDate <= end && 
             lead.status === 'qualified';
    }).length;
  },

  totalQualifiedLeads: (filteredLeads) => {
    return filteredLeads.filter(lead => lead.status === 'qualified').length;
  },
};

/**
 * Table Filtering Examples
 * Add these to your filteredLeads useMemo hook
 */
export const customTableFilters = {
  // Filter for Conversion Rate card
  conversionRate: (filtered, start, end) => {
    return filtered.filter(lead => {
      const leadDate = new Date(lead.createdAt);
      return leadDate >= start && 
             leadDate <= end && 
             (lead.status === 'won' || lead.status === 'qualified');
    });
  },

  // Filter for Avg Response Time card
  avgResponseTime: (filtered, mockCallLogs, start, end) => {
    return filtered.filter(lead => {
      const leadDate = new Date(lead.createdAt);
      const hasCall = mockCallLogs.some(call => call.leadId === lead.id);
      return leadDate >= start && leadDate <= end && hasCall;
    });
  },

  // Filter for Qualified Leads card
  qualifiedLeads: (filtered, start, end) => {
    return filtered.filter(lead => {
      const leadDate = new Date(lead.createdAt);
      return leadDate >= start && 
             leadDate <= end && 
             lead.status === 'qualified';
    });
  },
};

/**
 * Complete Integration Example
 * How to add the custom cards to your DSR page
 */
export const integrationExample = `
// In your DSR page component:

// 1. Update stats calculation
const stats = useMemo(() => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const filteredLeads = // ... your filtering logic

  return {
    // ... existing stats
    convertedLeads: customStatsCalculations.convertedLeads(filteredLeads, start, end),
    avgResponseTime: customStatsCalculations.avgResponseTime(filteredLeads, mockCallLogs, start, end),
    qualifiedLeadsToday: customStatsCalculations.qualifiedLeadsToday(filteredLeads, start, end),
    totalQualifiedLeads: customStatsCalculations.totalQualifiedLeads(filteredLeads),
  };
}, [startDate, endDate, selectedOption]);

// 2. Add cards to your grid
<SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={6}>
  {/* Existing cards */}
  <DSRCard ... />
  
  {/* New custom cards */}
  <ConversionRateCard 
    stats={stats}
    activeCard={activeCard}
    handleCardClick={handleCardClick}
  />
  
  <AvgResponseTimeCard 
    stats={stats}
    activeCard={activeCard}
    handleCardClick={handleCardClick}
  />
  
  <QualifiedLeadsCard 
    stats={stats}
    activeCard={activeCard}
    handleCardClick={handleCardClick}
  />
</SimpleGrid>

// 3. Update filtered leads logic
const filteredLeads = useMemo(() => {
  // ... existing filtering
  
  // Add custom filters
  if (activeCard === 'conversionRate') {
    filtered = customTableFilters.conversionRate(filtered, start, end);
  } else if (activeCard === 'avgResponseTime') {
    filtered = customTableFilters.avgResponseTime(filtered, mockCallLogs, start, end);
  } else if (activeCard === 'qualifiedLeads') {
    filtered = customTableFilters.qualifiedLeads(filtered, start, end);
  }
  
  return filtered;
}, [startDate, endDate, selectedOption, activeCard]);

// 4. Update cardLabels in handleCardClick
const cardLabels: Record<string, string> = {
  // ... existing labels
  conversionRate: 'Conversion Rate',
  avgResponseTime: 'Average Response Time',
  qualifiedLeads: 'Qualified Leads',
};
`;

/**
 * Color Scheme Rotation
 * Use different color schemes for visual variety
 */
export const colorSchemeRotation = [
  'primary',  // #9c5342
  'dark',     // #0b1316
  'light',    // #b4a097
  'medium',   // #7a5f58
  'accent',   // #8c9b96
];

// Assign colors to cards in order:
// Card 1: primary, Card 2: dark, Card 3: light, etc.
