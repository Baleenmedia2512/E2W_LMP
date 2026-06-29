import { useEffect } from 'react';

const STORAGE_KEY = 'callsFilters';

export type CallsPersistedFilters = {
  statusFilter: string;
  dateFilter: string;
  searchQuery: string;
  viewMode: 'table' | 'tile';
};

const VALID_STATUS_FILTERS = new Set(['all', 'answer', 'busy', 'wrong_number', 'ring_not_response']);
const VALID_DATE_FILTERS = new Set(['all', 'today']);

export function getCallsFilterDefaults(urlDateFilter?: string | null): CallsPersistedFilters {
  return {
    statusFilter: 'all',
    dateFilter: urlDateFilter || 'all',
    searchQuery: '',
    viewMode: 'table',
  };
}

export function loadCallsPersistedFilters(urlDateFilter?: string | null): CallsPersistedFilters {
  const defaults = getCallsFilterDefaults(urlDateFilter);

  if (typeof window === 'undefined') {
    return defaults;
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaults;
    }

    const parsed = JSON.parse(raw) as Partial<CallsPersistedFilters>;

    return {
      statusFilter:
        typeof parsed.statusFilter === 'string' && VALID_STATUS_FILTERS.has(parsed.statusFilter)
          ? parsed.statusFilter
          : defaults.statusFilter,
      // URL param keeps precedence (e.g. deep-link from DSR)
      dateFilter: urlDateFilter
        || (typeof parsed.dateFilter === 'string' && VALID_DATE_FILTERS.has(parsed.dateFilter)
          ? parsed.dateFilter
          : defaults.dateFilter),
      searchQuery: typeof parsed.searchQuery === 'string' ? parsed.searchQuery : defaults.searchQuery,
      viewMode: parsed.viewMode === 'tile' ? 'tile' : 'table',
    };
  } catch {
    return defaults;
  }
}

export function usePersistCallsFilters(filters: CallsPersistedFilters): void {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // Ignore storage errors — in-memory filters still work.
    }
  }, [filters.statusFilter, filters.dateFilter, filters.searchQuery, filters.viewMode]);
}
