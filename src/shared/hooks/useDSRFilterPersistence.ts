import { useEffect } from 'react';

const STORAGE_KEY = 'dsrFilters';

export type DSRPersistedFilters = {
  viewMode: 'single' | 'range';
  selectedDate: string;
  startDate: string;
  endDate: string;
  selectedAgentId: string;
  activeCard: string | null;
  searchQuery: string;
  currentPage: number;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  leadSortColumn: string | null;
  leadSortDirection: 'asc' | 'desc';
};

const VALID_ACTIVE_CARDS = new Set([
  'newLeads',
  'followUps',
  'overdue',
  'totalCalls',
  'overduePending',
  'won',
  'lost',
  'unqualified',
  'unreachable',
]);

const VALID_LEAD_SORT_COLUMNS = new Set([
  'name',
  'phone',
  'email',
  'status',
  'source',
  'assignedTo',
  'createdAt',
  'campaign',
  'callStatus',
  'callAttempts',
  'duration',
  'time',
]);

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidSortDirection(value: unknown): value is 'asc' | 'desc' {
  return value === 'asc' || value === 'desc';
}

export function getDSRFilterDefaults(
  todayString: string,
  defaultAgentId: string
): DSRPersistedFilters {
  return {
    viewMode: 'single',
    selectedDate: todayString,
    startDate: todayString,
    endDate: todayString,
    selectedAgentId: defaultAgentId,
    activeCard: null,
    searchQuery: '',
    currentPage: 1,
    sortColumn: null,
    sortDirection: 'asc',
    leadSortColumn: null,
    leadSortDirection: 'asc',
  };
}

export function loadDSRPersistedFilters(
  todayString: string,
  defaultAgentId: string,
  lockedAgentId?: string
): DSRPersistedFilters {
  const defaults = getDSRFilterDefaults(todayString, lockedAgentId ?? defaultAgentId);

  if (typeof window === 'undefined') {
    return defaults;
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaults;
    }

    const parsed = JSON.parse(raw) as Partial<DSRPersistedFilters>;

    return {
      viewMode: parsed.viewMode === 'range' ? 'range' : 'single',
      selectedDate: isValidDateString(parsed.selectedDate)
        ? parsed.selectedDate
        : defaults.selectedDate,
      startDate: isValidDateString(parsed.startDate) ? parsed.startDate : defaults.startDate,
      endDate: isValidDateString(parsed.endDate) ? parsed.endDate : defaults.endDate,
      selectedAgentId: lockedAgentId
        ?? (typeof parsed.selectedAgentId === 'string' && parsed.selectedAgentId
          ? parsed.selectedAgentId
          : defaults.selectedAgentId),
      activeCard:
        typeof parsed.activeCard === 'string' && VALID_ACTIVE_CARDS.has(parsed.activeCard)
          ? parsed.activeCard
          : defaults.activeCard,
      searchQuery: typeof parsed.searchQuery === 'string' ? parsed.searchQuery : defaults.searchQuery,
      currentPage:
        typeof parsed.currentPage === 'number' && parsed.currentPage >= 1
          ? Math.floor(parsed.currentPage)
          : defaults.currentPage,
      sortColumn: typeof parsed.sortColumn === 'string' ? parsed.sortColumn : defaults.sortColumn,
      sortDirection: isValidSortDirection(parsed.sortDirection)
        ? parsed.sortDirection
        : defaults.sortDirection,
      leadSortColumn:
        typeof parsed.leadSortColumn === 'string' &&
        VALID_LEAD_SORT_COLUMNS.has(parsed.leadSortColumn)
          ? parsed.leadSortColumn
          : defaults.leadSortColumn,
      leadSortDirection: isValidSortDirection(parsed.leadSortDirection)
        ? parsed.leadSortDirection
        : defaults.leadSortDirection,
    };
  } catch {
    return defaults;
  }
}

export function usePersistDSRFilters(filters: DSRPersistedFilters): void {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // Ignore quota / private-mode errors — filters still work in memory.
    }
  }, [
    filters.viewMode,
    filters.selectedDate,
    filters.startDate,
    filters.endDate,
    filters.selectedAgentId,
    filters.activeCard,
    filters.searchQuery,
    filters.currentPage,
    filters.sortColumn,
    filters.sortDirection,
    filters.leadSortColumn,
    filters.leadSortDirection,
  ]);
}
