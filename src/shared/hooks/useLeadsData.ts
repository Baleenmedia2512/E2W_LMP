'use client';

import useSWR from 'swr';
import { useAuth } from '@/shared/lib/auth/auth-context';
import type { Lead } from '@/shared/types';

/**
 * Custom fetcher for authenticated requests
 */
const authFetcher = async (url: string, token: string | null) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch');
  }

  const data = await res.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch data');
  }

  return data.data;
};

interface UseLeadsDataOptions {
  assignedToMe?: boolean;
  limit?: number;
  refreshInterval?: number; // Auto-refresh interval in ms (0 = disabled)
}

/**
 * Hook for fetching leads with SWR
 * Provides automatic caching, revalidation, and optimistic updates
 */
export function useLeadsData(options: UseLeadsDataOptions = {}) {
  const { assignedToMe = false, limit = 2000, refreshInterval = 0 } = options;
  const { token } = useAuth();

  // Build query params
  const params = new URLSearchParams({ limit: limit.toString() });
  if (assignedToMe) {
    params.append('assigned_to', 'me');
  }

  const url = `/api/leads?${params.toString()}`;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    token ? [url, token] : null,
    ([url, token]) => authFetcher(url, token),
    {
      refreshInterval,
      revalidateOnFocus: false, // Disable auto-revalidation on focus to reduce requests
      revalidateOnReconnect: true, // Revalidate when network reconnects
      dedupingInterval: 5000, // Dedupe requests within 5s
      keepPreviousData: true, // Keep previous data while fetching new data
    }
  );

  return {
    leads: (data as Lead[]) || [],
    isLoading,
    isValidating, // Background revalidation (doesn't block UI)
    error,
    mutate, // Manual revalidation or optimistic updates
    refresh: () => mutate(), // Convenience method for manual refresh
  };
}

/**
 * Hook for fetching follow-ups with SWR
 */
export function useFollowUpsData(options: { refreshInterval?: number } = {}) {
  const { refreshInterval = 0 } = options;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    '/api/followups?limit=500',
    (url) => authFetcher(url, null),
    {
      refreshInterval,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      keepPreviousData: true,
    }
  );

  return {
    followUps: data || [],
    isLoading,
    isValidating,
    error,
    mutate,
    refresh: () => mutate(),
  };
}

/**
 * Combined hook for leads and follow-ups
 * Fetches both in parallel and returns combined state
 */
export function useLeadsAndFollowUps(options: UseLeadsDataOptions = {}) {
  const leadsResult = useLeadsData(options);
  const followUpsResult = useFollowUpsData({ refreshInterval: options.refreshInterval });

  return {
    leads: leadsResult.leads,
    followUps: followUpsResult.followUps,
    isLoading: leadsResult.isLoading || followUpsResult.isLoading,
    isValidating: leadsResult.isValidating || followUpsResult.isValidating,
    error: leadsResult.error || followUpsResult.error,
    refreshLeads: leadsResult.refresh,
    refreshFollowUps: followUpsResult.refresh,
    refreshAll: () => {
      leadsResult.refresh();
      followUpsResult.refresh();
    },
    mutateLeads: leadsResult.mutate,
    mutateFollowUps: followUpsResult.mutate,
  };
}

/**
 * Hook for fetching individual lead details with related data
 * Provides automatic caching for instant navigation
 */
export function useLeadDetail(leadId: string | null) {
  const fetchLeadDetail = async (url: string) => {
    const res = await fetch(url, { cache: 'no-store' });
    
    if (!res.ok) {
      throw new Error('Lead not found');
    }
    
    const data = await res.json();
    return data.data || data;
  };

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    leadId ? `/api/leads/${leadId}` : null,
    fetchLeadDetail,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      keepPreviousData: true,
    }
  );

  return {
    lead: data || null,
    isLoading,
    isValidating,
    error,
    mutate,
    refresh: () => mutate(),
  };
}

/**
 * Hook for fetching call logs for a specific lead
 */
export function useLeadCallLogs(leadId: string | null) {
  const fetchCallLogs = async (url: string) => {
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    return Array.isArray(data) ? data : (data.data || []);
  };

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    leadId ? `/api/calls?leadId=${leadId}&limit=100` : null,
    fetchCallLogs,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      keepPreviousData: true,
    }
  );

  return {
    callLogs: data || [],
    isLoading,
    isValidating,
    error,
    mutate,
    refresh: () => mutate(),
  };
}

/**
 * Hook for fetching follow-ups for a specific lead
 */
export function useLeadFollowUps(leadId: string | null) {
  const fetchFollowUps = async (url: string) => {
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    return Array.isArray(data) ? data : (data.data || []);
  };

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    leadId ? `/api/followups?leadId=${leadId}&limit=100` : null,
    fetchFollowUps,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      keepPreviousData: true,
    }
  );

  return {
    followUps: data || [],
    isLoading,
    isValidating,
    error,
    mutate,
    refresh: () => mutate(),
  };
}

/**
 * Hook for fetching activity history for a specific lead
 */
export function useLeadActivity(leadId: string | null) {
  const fetchActivity = async (url: string) => {
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    return Array.isArray(data) ? data : (data.data || []);
  };

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    leadId ? `/api/activity?leadId=${leadId}&limit=50` : null,
    fetchActivity,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      keepPreviousData: true,
    }
  );

  return {
    activities: data || [],
    isLoading,
    isValidating,
    error,
    mutate,
    refresh: () => mutate(),
  };
}

/**
 * Combined hook for all lead detail data
 * Fetches lead, calls, follow-ups, and activity in parallel
 */
export function useLeadDetailData(leadId: string | null) {
  const leadResult = useLeadDetail(leadId);
  const callLogsResult = useLeadCallLogs(leadId);
  const followUpsResult = useLeadFollowUps(leadId);
  const activityResult = useLeadActivity(leadId);

  return {
    lead: leadResult.lead,
    callLogs: callLogsResult.callLogs,
    followUps: followUpsResult.followUps,
    activities: activityResult.activities,
    isLoading: leadResult.isLoading || callLogsResult.isLoading || followUpsResult.isLoading || activityResult.isLoading,
    isValidating: leadResult.isValidating || callLogsResult.isValidating || followUpsResult.isValidating || activityResult.isValidating,
    error: leadResult.error || callLogsResult.error || followUpsResult.error || activityResult.error,
    refreshAll: () => {
      leadResult.refresh();
      callLogsResult.refresh();
      followUpsResult.refresh();
      activityResult.refresh();
    },
    mutateLead: leadResult.mutate,
    mutateCallLogs: callLogsResult.mutate,
    mutateFollowUps: followUpsResult.mutate,
    mutateActivities: activityResult.mutate,
  };
}

/**
 * Hook for fetching all call logs
 * Provides automatic caching for instant navigation
 */
export function useCallLogs(statusFilter: string = 'all') {
  const params = new URLSearchParams({ limit: '100' });
  if (statusFilter !== 'all') {
    params.append('status', statusFilter);
  }

  const fetchCallLogs = async (url: string) => {
    const res = await fetch(url, { cache: 'no-store' });
    const result = await res.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch call logs');
    }
    
    // Sort by createdAt in descending order (most recent first)
    const sorted = [...result.data].sort((a: any, b: any) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    return sorted;
  };

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    `/api/calls?${params.toString()}`,
    fetchCallLogs,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      keepPreviousData: true,
    }
  );

  return {
    callLogs: data || [],
    isLoading,
    isValidating,
    error,
    mutate,
    refresh: () => mutate(),
  };
}

/**
 * Hook for fetching DSR (Daily Sales Report) data
 * Provides automatic caching for instant navigation
 */
export function useDSRData(selectedDate: string, selectedAgentId: string = 'all') {
  const params = new URLSearchParams();
  // Send the selected date as both start and end to get data for that specific day
  if (selectedDate) {
    params.append('startDate', selectedDate);
    params.append('endDate', selectedDate);
  }
  if (selectedAgentId !== 'all') {
    params.append('agentId', selectedAgentId);
  }

  const fetchDSRData = async (url: string) => {
    const res = await fetch(url, { cache: 'no-store' });
    
    if (!res.ok) {
      throw new Error('Failed to fetch DSR data');
    }
    
    const result = await res.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch data');
    }
    
    return result.data;
  };

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    `/api/dsr/stats?${params.toString()}`,
    fetchDSRData,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      keepPreviousData: true,
    }
  );

  return {
    stats: data?.stats || null,
    filteredLeads: data?.filteredLeads || [],
    agentPerformanceData: data?.agentPerformanceData || [],
    agents: data?.agents || [],
    isLoading,
    isValidating,
    error,
    mutate,
    refresh: () => mutate(),
  };
}

/**
 * Hook for fetching DSR call logs (conditionally)
 */
export function useDSRCallLogs(selectedDate: string, selectedAgentId: string = 'all', enabled: boolean = false) {
  const params = new URLSearchParams();
  if (selectedDate) params.append('date', selectedDate);
  params.append('limit', '1000');
  if (selectedAgentId && selectedAgentId !== 'all') {
    params.append('agentId', selectedAgentId);
  }

  const fetchCallLogs = async (url: string) => {
    const res = await fetch(url, { cache: 'no-store' });
    
    if (!res.ok) {
      throw new Error('Failed to fetch call logs');
    }
    
    const result = await res.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch call logs');
    }
    
    return result.data.callLogs || [];
  };

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    enabled ? `/api/dsr/call-logs?${params.toString()}` : null,
    fetchCallLogs,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      keepPreviousData: true,
    }
  );

  return {
    callLogs: data || [],
    isLoading,
    isValidating,
    error,
    mutate,
    refresh: () => mutate(),
  };
}
