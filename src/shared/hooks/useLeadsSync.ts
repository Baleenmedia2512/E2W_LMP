'use client';

import { useEffect, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase-client';

interface LeadPayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: any;
  old?: any;
}

interface FollowUpPayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: any;
  old?: any;
}

/**
 * Custom hook for real-time synchronization of leads and follow-ups using Supabase
 * Subscribes to database changes and updates state incrementally instead of full page reload
 */
export function useLeadsSync(
  setLeads: (updater: (prev: any[]) => any[]) => void,
  setFollowUps: (updater: (prev: any[]) => any[]) => void
) {
  // Handle lead changes from Supabase
  const handleLeadChange = useCallback((payload: LeadPayload) => {
    if (payload.eventType === 'INSERT') {
      // Add new lead to the top of the list
      setLeads((prev) => [payload.new, ...prev]);
      console.log('🆕 New lead added via Realtime:', payload.new.id);
    } else if (payload.eventType === 'UPDATE') {
      // For UPDATE events, merge with existing data to preserve relationships
      // This prevents "Unassigned" flashing when assigned person's name isn't in the payload
      setLeads((prev) =>
        prev.map((lead) => {
          if (lead.id === payload.new.id) {
            // If assignedToId changed, fetch updated lead from API to get full relationship data
            if (lead.assignedToId !== payload.new.assignedToId) {
              console.log('👤 Assignment changed, fetching updated lead from API...');
              fetch(`/api/leads/${payload.new.id}`, { cache: 'no-store' })
                .then(res => res.json())
                .then(data => {
                  const updated = data.data || data;
                  if (updated && updated.id) {
                    setLeads(prev =>
                      prev.map(l => (l.id === updated.id ? { ...l, ...updated } : l))
                    );
                  }
                })
                .catch(err => console.error('Failed to fetch updated lead after assignment:', err));
            }
            // Merge: keep existing related objects, update with new values
            return {
              ...lead,
              ...payload.new,
              // Preserve User relationship if it exists in the old lead
              User_Lead_assignedToIdToUser: payload.new.User_Lead_assignedToIdToUser || lead.User_Lead_assignedToIdToUser,
            };
          }
          return lead;
        })
      );
      console.log('✏️ Lead updated via Realtime:', payload.new.id);
    } else if (payload.eventType === 'DELETE') {
      // Remove deleted lead
      setLeads((prev) => prev.filter((lead) => lead.id !== payload.old.id));
      console.log('🗑️ Lead deleted via Realtime:', payload.old.id);
    }
  }, [setLeads]);

  // Handle follow-up changes from Supabase
  const handleFollowUpChange = useCallback((payload: FollowUpPayload) => {
    if (payload.eventType === 'INSERT') {
      // Add new follow-up
      setFollowUps((prev) => {
        // Check if it already exists (avoid duplicates)
        if (prev.some((fu) => fu.id === payload.new.id)) {
          return prev;
        }
        return [payload.new, ...prev];
      });
      console.log('📋 New follow-up added via Realtime:', payload.new.id);
    } else if (payload.eventType === 'UPDATE') {
      // Update existing follow-up
      setFollowUps((prev) =>
        prev.map((fu) =>
          fu.id === payload.new.id ? payload.new : fu
        )
      );
      console.log('✏️ Follow-up updated via Realtime:', payload.new.id);
    } else if (payload.eventType === 'DELETE') {
      // Remove deleted follow-up
      setFollowUps((prev) =>
        prev.filter((fu) => fu.id !== payload.old.id)
      );
      console.log('🗑️ Follow-up deleted via Realtime:', payload.old.id);
    }
  }, [setFollowUps]);

  useEffect(() => {
    // Check if Supabase client is available
    if (!supabase) {
      console.warn('⚠️ Supabase not configured. Realtime sync disabled.');
      return;
    }

    // Subscribe to Lead table changes
    const leadsSubscription = supabase
      .channel('public:Lead')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Lead',
        },
        (payload: any) => handleLeadChange(payload)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Connected to Lead Realtime');
        } else if (status === 'CLOSED') {
          console.log('❌ Disconnected from Lead Realtime');
        }
      });

    // Subscribe to FollowUp table changes
    const followUpsSubscription = supabase
      .channel('public:FollowUp')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'FollowUp',
        },
        (payload: any) => handleFollowUpChange(payload)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Connected to FollowUp Realtime');
        } else if (status === 'CLOSED') {
          console.log('❌ Disconnected from FollowUp Realtime');
        }
      });

    // Cleanup subscriptions on unmount
    return () => {
      leadsSubscription.unsubscribe();
      followUpsSubscription.unsubscribe();
    };
  }, [handleLeadChange, handleFollowUpChange]);
}
