import { useEffect } from 'react';

const STORAGE_KEY = 'reportsFilters';

export type ReportsPersistedFilters = {
  startDate: string;
  endDate: string;
  dateFilterType: 'created' | 'updated';
  selectedAgentId: string;
  sourceSortOrder: string;
  statusSortOrder: string;
};

const VALID_SORT_ORDERS = new Set([
  'percentage-desc',
  'percentage-asc',
  'alphabetical-asc',
  'alphabetical-desc',
]);

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function getReportsFilterDefaults(): ReportsPersistedFilters {
  const date = new Date();
  const endDate = date.toISOString().split('T')[0] || '';
  date.setDate(date.getDate() - 7);
  const startDate = date.toISOString().split('T')[0] || '';

  return {
    startDate,
    endDate,
    dateFilterType: 'created',
    selectedAgentId: 'all',
    sourceSortOrder: 'percentage-desc',
    statusSortOrder: 'percentage-desc',
  };
}

export function loadReportsPersistedFilters(lockedAgentId?: string): ReportsPersistedFilters {
  const defaults = getReportsFilterDefaults();

  if (typeof window === 'undefined') {
    return defaults;
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...defaults, selectedAgentId: lockedAgentId ?? defaults.selectedAgentId };
    }

    const parsed = JSON.parse(raw) as Partial<ReportsPersistedFilters>;

    return {
      startDate: isValidDateString(parsed.startDate) ? parsed.startDate : defaults.startDate,
      endDate: isValidDateString(parsed.endDate) ? parsed.endDate : defaults.endDate,
      dateFilterType: parsed.dateFilterType === 'updated' ? 'updated' : 'created',
      selectedAgentId: lockedAgentId
        ?? (typeof parsed.selectedAgentId === 'string' && parsed.selectedAgentId
          ? parsed.selectedAgentId
          : defaults.selectedAgentId),
      sourceSortOrder:
        typeof parsed.sourceSortOrder === 'string' && VALID_SORT_ORDERS.has(parsed.sourceSortOrder)
          ? parsed.sourceSortOrder
          : defaults.sourceSortOrder,
      statusSortOrder:
        typeof parsed.statusSortOrder === 'string' && VALID_SORT_ORDERS.has(parsed.statusSortOrder)
          ? parsed.statusSortOrder
          : defaults.statusSortOrder,
    };
  } catch {
    return { ...defaults, selectedAgentId: lockedAgentId ?? defaults.selectedAgentId };
  }
}

export function usePersistReportsFilters(filters: ReportsPersistedFilters): void {
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
    filters.dateFilterType,
    filters.selectedAgentId,
    filters.sourceSortOrder,
    filters.statusSortOrder,
  ]);
}
