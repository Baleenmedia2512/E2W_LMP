import { useEffect } from 'react';

const STORAGE_KEY = 'dashboardFilters';

export type DashboardPersistedFilters = {
  startDate: string;
  endDate: string;
  dateRangeLabel: string;
  hasDateFilter: boolean;
  autoRefresh: boolean;
  selectedUserId: string | null;
};

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function getDashboardFilterDefaults(): DashboardPersistedFilters {
  const today = new Date().toISOString().split('T')[0] || '';

  return {
    startDate: today,
    endDate: today,
    dateRangeLabel: 'Today',
    hasDateFilter: true,
    autoRefresh: false,
    selectedUserId: null,
  };
}

export function loadDashboardPersistedFilters(lockedUserId?: string): DashboardPersistedFilters {
  const defaults = getDashboardFilterDefaults();

  if (typeof window === 'undefined') {
    return {
      ...defaults,
      selectedUserId: lockedUserId ?? defaults.selectedUserId,
    };
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        ...defaults,
        selectedUserId: lockedUserId ?? defaults.selectedUserId,
      };
    }

    const parsed = JSON.parse(raw) as Partial<DashboardPersistedFilters>;

    return {
      startDate: isValidDateString(parsed.startDate) ? parsed.startDate : defaults.startDate,
      endDate: isValidDateString(parsed.endDate) ? parsed.endDate : defaults.endDate,
      dateRangeLabel:
        typeof parsed.dateRangeLabel === 'string' ? parsed.dateRangeLabel : defaults.dateRangeLabel,
      hasDateFilter: typeof parsed.hasDateFilter === 'boolean' ? parsed.hasDateFilter : defaults.hasDateFilter,
      autoRefresh: typeof parsed.autoRefresh === 'boolean' ? parsed.autoRefresh : defaults.autoRefresh,
      selectedUserId: lockedUserId
        ?? (typeof parsed.selectedUserId === 'string' ? parsed.selectedUserId : defaults.selectedUserId),
    };
  } catch {
    return {
      ...defaults,
      selectedUserId: lockedUserId ?? defaults.selectedUserId,
    };
  }
}

export function usePersistDashboardFilters(filters: DashboardPersistedFilters): void {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // Ignore storage errors — in-memory filters still work.
    }
  }, [
    filters.startDate,
    filters.endDate,
    filters.dateRangeLabel,
    filters.hasDateFilter,
    filters.autoRefresh,
    filters.selectedUserId,
  ]);
}
