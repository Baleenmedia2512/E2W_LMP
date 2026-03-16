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
