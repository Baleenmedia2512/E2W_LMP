'use client';

import { useEffect } from 'react';

/**
 * Legacy hook kept for API compatibility.
 * Supabase realtime was removed — rely on SWR refreshInterval polling instead.
 */
export function useLeadsSync(
  _setLeads: (updater: (prev: any[]) => any[]) => void,
  _setFollowUps: (updater: (prev: any[]) => any[]) => void
) {
  useEffect(() => {
    // no-op: realtime replaced by SWR polling
  }, []);
}

/**
 * SWR-native sync hook.
 * Previously wired Supabase postgres_changes; now a no-op so callers keep working.
 * Leads/FollowUps refresh via useLeadsAndFollowUps refreshInterval.
 */
export function useLeadsSWRSync(
  _mutateLeads: (updater?: any, opts?: any) => void,
  _mutateFollowUps: () => void
) {
  useEffect(() => {
    // no-op: realtime replaced by SWR polling
  }, []);
}
