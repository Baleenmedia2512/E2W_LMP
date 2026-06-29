import { useEffect } from 'react';

const STORAGE_KEY = 'leadsFilters';

export type LeadsPagePersistedFilters = {
  globalSearchQuery: string;
  globalLeadCategoryFilter: string;
  globalClientTypeFilter: string;
  globalSourceFilter: string;
  globalAttemptsFilter: string;
  globalOwnerFilter: string;
  activeTabIndex: number;
};

export type LeadsTabPersistedFilters = {
  statusFilter: string;
  assignedToMe: boolean;
  showOnlyToday: boolean;
  isOverdueCollapsed: boolean;
  isScheduledCollapsed: boolean;
  isNewLeadsCollapsed: boolean;
  isStatusFilteredCollapsed: boolean;
};

export type OutcomesTabPersistedFilters = {
  outcomeStatusFilter: string;
  wonViewMode: 'current' | 'historical';
  sortConfig: {
    [key: string]: { field: string; direction: 'asc' | 'desc' };
  };
};

const VALID_LEAD_CATEGORIES = new Set(['all', 'inbound', 'outbound']);
const VALID_CLIENT_TYPES = new Set(['all', 'new', 'existing']);
const VALID_ATTEMPTS = new Set(['all', '0', '1-3', '4-6', '7+']);
const VALID_STATUS_FILTERS = new Set([
  'all',
  'new',
  'won',
  'qualified',
  'unqualified',
  'unreachable',
  'lost',
  'overdue',
  'scheduled',
  'today',
]);
const VALID_OUTCOME_STATUS = new Set(['all', 'unqualified', 'unreach', 'won', 'lost']);
const VALID_SORT_FIELDS = new Set(['name', 'phone', 'updatedAt', 'assignedTo']);
const VALID_SORT_DIRECTIONS = new Set(['asc', 'desc']);

type LeadsStorage = {
  page?: Partial<LeadsPagePersistedFilters>;
  leadsTab?: Partial<LeadsTabPersistedFilters>;
  outcomesTab?: Partial<OutcomesTabPersistedFilters>;
};

function readLeadsStorage(): LeadsStorage {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LeadsStorage) : {};
  } catch {
    return {};
  }
}

function writeLeadsStorageSection<K extends keyof LeadsStorage>(
  section: K,
  value: LeadsStorage[K]
): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const current = readLeadsStorage();
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, [section]: value }));
  } catch {
    // Ignore storage errors — in-memory filters still work.
  }
}

export function getLeadsPageFilterDefaults(lockedOwnerId?: string): LeadsPagePersistedFilters {
  return {
    globalSearchQuery: '',
    globalLeadCategoryFilter: 'all',
    globalClientTypeFilter: 'all',
    globalSourceFilter: 'all',
    globalAttemptsFilter: 'all',
    globalOwnerFilter: lockedOwnerId ?? 'all',
    activeTabIndex: 0,
  };
}

export function loadLeadsPagePersistedFilters(
  lockedOwnerId?: string,
  urlTabIndex?: number
): LeadsPagePersistedFilters {
  const defaults = getLeadsPageFilterDefaults(lockedOwnerId);
  const parsed = readLeadsStorage().page;

  if (!parsed) {
    return {
      ...defaults,
      activeTabIndex: urlTabIndex ?? defaults.activeTabIndex,
    };
  }

  return {
    globalSearchQuery:
      typeof parsed.globalSearchQuery === 'string' ? parsed.globalSearchQuery : defaults.globalSearchQuery,
    globalLeadCategoryFilter:
      typeof parsed.globalLeadCategoryFilter === 'string' &&
      VALID_LEAD_CATEGORIES.has(parsed.globalLeadCategoryFilter)
        ? parsed.globalLeadCategoryFilter
        : defaults.globalLeadCategoryFilter,
    globalClientTypeFilter:
      typeof parsed.globalClientTypeFilter === 'string' &&
      VALID_CLIENT_TYPES.has(parsed.globalClientTypeFilter)
        ? parsed.globalClientTypeFilter
        : defaults.globalClientTypeFilter,
    globalSourceFilter:
      typeof parsed.globalSourceFilter === 'string' ? parsed.globalSourceFilter : defaults.globalSourceFilter,
    globalAttemptsFilter:
      typeof parsed.globalAttemptsFilter === 'string' &&
      VALID_ATTEMPTS.has(parsed.globalAttemptsFilter)
        ? parsed.globalAttemptsFilter
        : defaults.globalAttemptsFilter,
    globalOwnerFilter: lockedOwnerId
      ?? (typeof parsed.globalOwnerFilter === 'string' ? parsed.globalOwnerFilter : defaults.globalOwnerFilter),
    activeTabIndex:
      urlTabIndex ??
      (parsed.activeTabIndex === 1 ? 1 : defaults.activeTabIndex),
  };
}

export function getLeadsTabFilterDefaults(): LeadsTabPersistedFilters {
  return {
    statusFilter: 'all',
    assignedToMe: false,
    showOnlyToday: true,
    isOverdueCollapsed: true,
    isScheduledCollapsed: true,
    isNewLeadsCollapsed: true,
    isStatusFilteredCollapsed: true,
  };
}

export function loadLeadsTabPersistedFilters(urlStatusFilter?: string | null): LeadsTabPersistedFilters {
  const defaults = getLeadsTabFilterDefaults();
  const parsed = readLeadsStorage().leadsTab;

  const statusFromUrl =
    urlStatusFilter && VALID_STATUS_FILTERS.has(urlStatusFilter) ? urlStatusFilter : null;

  if (!parsed) {
    return {
      ...defaults,
      statusFilter: statusFromUrl ?? defaults.statusFilter,
    };
  }

  return {
    statusFilter:
      statusFromUrl ??
      (typeof parsed.statusFilter === 'string' && VALID_STATUS_FILTERS.has(parsed.statusFilter)
        ? parsed.statusFilter
        : defaults.statusFilter),
    assignedToMe: typeof parsed.assignedToMe === 'boolean' ? parsed.assignedToMe : defaults.assignedToMe,
    showOnlyToday:
      typeof parsed.showOnlyToday === 'boolean' ? parsed.showOnlyToday : defaults.showOnlyToday,
    isOverdueCollapsed:
      typeof parsed.isOverdueCollapsed === 'boolean'
        ? parsed.isOverdueCollapsed
        : defaults.isOverdueCollapsed,
    isScheduledCollapsed:
      typeof parsed.isScheduledCollapsed === 'boolean'
        ? parsed.isScheduledCollapsed
        : defaults.isScheduledCollapsed,
    isNewLeadsCollapsed:
      typeof parsed.isNewLeadsCollapsed === 'boolean'
        ? parsed.isNewLeadsCollapsed
        : defaults.isNewLeadsCollapsed,
    isStatusFilteredCollapsed:
      typeof parsed.isStatusFilteredCollapsed === 'boolean'
        ? parsed.isStatusFilteredCollapsed
        : defaults.isStatusFilteredCollapsed,
  };
}

const DEFAULT_SORT_CONFIG: OutcomesTabPersistedFilters['sortConfig'] = {
  unqualified: { field: 'updatedAt', direction: 'desc' },
  unreach: { field: 'updatedAt', direction: 'desc' },
  won: { field: 'updatedAt', direction: 'desc' },
  lost: { field: 'updatedAt', direction: 'desc' },
};

function sanitizeSortConfig(
  value: unknown
): OutcomesTabPersistedFilters['sortConfig'] {
  if (!value || typeof value !== 'object') {
    return DEFAULT_SORT_CONFIG;
  }

  const result = { ...DEFAULT_SORT_CONFIG };
  for (const key of Object.keys(DEFAULT_SORT_CONFIG)) {
    const entry = (value as Record<string, unknown>)[key];
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const field = (entry as { field?: unknown }).field;
    const direction = (entry as { direction?: unknown }).direction;
    if (
      typeof field === 'string' &&
      VALID_SORT_FIELDS.has(field) &&
      typeof direction === 'string' &&
      VALID_SORT_DIRECTIONS.has(direction)
    ) {
      result[key] = { field, direction: direction as 'asc' | 'desc' };
    }
  }
  return result;
}

export function getOutcomesTabFilterDefaults(): OutcomesTabPersistedFilters {
  return {
    outcomeStatusFilter: 'all',
    wonViewMode: 'current',
    sortConfig: DEFAULT_SORT_CONFIG,
  };
}

export function loadOutcomesTabPersistedFilters(): OutcomesTabPersistedFilters {
  const defaults = getOutcomesTabFilterDefaults();
  const parsed = readLeadsStorage().outcomesTab;

  if (!parsed) {
    return defaults;
  }

  return {
    outcomeStatusFilter:
      typeof parsed.outcomeStatusFilter === 'string' &&
      VALID_OUTCOME_STATUS.has(parsed.outcomeStatusFilter)
        ? parsed.outcomeStatusFilter
        : defaults.outcomeStatusFilter,
    wonViewMode: parsed.wonViewMode === 'historical' ? 'historical' : 'current',
    sortConfig: sanitizeSortConfig(parsed.sortConfig),
  };
}

export function usePersistLeadsPageFilters(filters: LeadsPagePersistedFilters): void {
  useEffect(() => {
    writeLeadsStorageSection('page', filters);
  }, [
    filters.globalSearchQuery,
    filters.globalLeadCategoryFilter,
    filters.globalClientTypeFilter,
    filters.globalSourceFilter,
    filters.globalAttemptsFilter,
    filters.globalOwnerFilter,
    filters.activeTabIndex,
  ]);
}

export function usePersistLeadsTabFilters(filters: LeadsTabPersistedFilters): void {
  useEffect(() => {
    writeLeadsStorageSection('leadsTab', filters);
  }, [
    filters.statusFilter,
    filters.assignedToMe,
    filters.showOnlyToday,
    filters.isOverdueCollapsed,
    filters.isScheduledCollapsed,
    filters.isNewLeadsCollapsed,
    filters.isStatusFilteredCollapsed,
  ]);
}

export function usePersistOutcomesTabFilters(filters: OutcomesTabPersistedFilters): void {
  useEffect(() => {
    writeLeadsStorageSection('outcomesTab', filters);
  }, [filters.outcomeStatusFilter, filters.wonViewMode, filters.sortConfig]);
}
