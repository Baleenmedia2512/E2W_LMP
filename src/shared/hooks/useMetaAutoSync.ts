import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook to automatically sync Meta leads in the background
 * - Runs every 2 minutes without refreshing the page
 * - Completely silent and automatic (no user interaction needed)
 * - Duplicate leads are automatically ignored on the server side
 * - Only runs when user is authenticated and on the dashboard
 */
export function useMetaAutoSync(enabled: boolean = true) {
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncCount, setSyncCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const syncMetaLeads = async () => {
    // Skip if already syncing
    if (isSyncing) {
      return;
    }

    // Skip if component unmounted
    if (!isMountedRef.current) {
      return;
    }

    try {
      setIsSyncing(true);

      const response = await fetch('/api/cron/sync-meta-leads', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Run silently without blocking
        cache: 'no-store',
      });

      if (!isMountedRef.current) return;

      if (response.ok) {
        const data = await response.json();
        setLastSyncTime(new Date());
        setSyncCount(prev => prev + 1);
        
        // Only log if there were actual changes
        if (data.updatedPlaceholders > 0 || data.newLeads > 0) {
          console.log(`✅ Meta sync: ${data.newLeads} new, ${data.updatedPlaceholders} updated (duplicates auto-skipped)`);
        }
      }
    } catch (error) {
      // Silent failure - don't disrupt user experience
      // Errors are logged on server side
    } finally {
      if (isMountedRef.current) {
        setIsSyncing(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled) {
      // Clear interval if exists
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial sync on mount (delayed by 5 seconds to let page load)
    const initialTimer = setTimeout(() => {
      if (isMountedRef.current) {
        syncMetaLeads();
      }
    }, 5000);

    // Set up interval for every 2 minutes (120000ms)
    intervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        syncMetaLeads();
      }
    }, 120000); // 2 minutes

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      clearTimeout(initialTimer);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled]);

  return {
    lastSyncTime,
    isSyncing,
    syncCount,
    manualSync: syncMetaLeads,
  };
}
