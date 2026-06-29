/**
 * Canonical lead sources for UI dropdowns and new lead creation.
 * Only "Outbound" is outbound; all others are inbound.
 */

export const OUTBOUND_LEAD_SOURCE = 'Outbound' as const;

export const INBOUND_LEAD_SOURCES = [
  'Consultant',
  'Google',
  'Indiamart',
  'Just Dial',
  'Meta',
  'Sulekha',
] as const;

export const ALL_LEAD_SOURCES = [...INBOUND_LEAD_SOURCES, OUTBOUND_LEAD_SOURCE] as const;

export type InboundLeadSource = (typeof INBOUND_LEAD_SOURCES)[number];
export type LeadSource = InboundLeadSource | typeof OUTBOUND_LEAD_SOURCE;

/** Legacy inbound sources still stored on existing leads (not shown in UI). */
const LEGACY_INBOUND_SOURCES_LOWER = new Set([
  'website',
  'whatsapp',
  'online',
  'referral',
  'direct',
  'manual',
]);

/** DB values that match each UI source filter (includes legacy aliases). */
const SOURCE_FILTER_DB_VARIANTS: Record<string, readonly string[]> = {
  Consultant: ['Consultant'],
  Google: ['Google', 'Google Maps'],
  Indiamart: ['Indiamart'],
  'Just Dial': ['Just Dial'],
  Meta: ['Meta'],
  Sulekha: ['Sulekha'],
  Outbound: ['Outbound'],
};

const INBOUND_SOURCES_LOWER = new Set(
  INBOUND_LEAD_SOURCES.map((source) => source.toLowerCase())
);

function normalizeSourceKey(source: string): string {
  return source.trim().toLowerCase();
}

export function isInboundLeadSource(source: string | null | undefined): boolean {
  const lower = normalizeSourceKey(source ?? '');
  if (!lower || lower === OUTBOUND_LEAD_SOURCE.toLowerCase()) {
    return false;
  }
  if (INBOUND_SOURCES_LOWER.has(lower)) {
    return true;
  }
  if (lower === 'google maps' || lower === 'googlemaps') {
    return true;
  }
  if (LEGACY_INBOUND_SOURCES_LOWER.has(lower)) {
    return true;
  }
  return false;
}

export function deriveLeadCategory(
  source: string,
  explicitCategory?: string
): 'INBOUND' | 'OUTBOUND' {
  if (explicitCategory === 'INBOUND' || explicitCategory === 'OUTBOUND') {
    return explicitCategory;
  }
  return isInboundLeadSource(source) ? 'INBOUND' : 'OUTBOUND';
}

export function getLeadSourcesForCategory(
  category: 'all' | 'inbound' | 'outbound' | string
): readonly string[] {
  if (category === 'inbound') {
    return INBOUND_LEAD_SOURCES;
  }
  if (category === 'outbound') {
    return [OUTBOUND_LEAD_SOURCE];
  }
  return ALL_LEAD_SOURCES;
}

export function leadSourceMatchesFilter(
  leadSource: string | null | undefined,
  filterSource: string
): boolean {
  if (!filterSource || filterSource === 'all') {
    return true;
  }
  if (!leadSource) {
    return false;
  }

  const variants = SOURCE_FILTER_DB_VARIANTS[filterSource] ?? [filterSource];
  const leadLower = normalizeSourceKey(leadSource);

  return variants.some((variant) => normalizeSourceKey(variant) === leadLower);
}

export function resolveSourceFilterValues(
  filterSource: string | null | undefined
): string[] | null {
  if (!filterSource || filterSource === 'all') {
    return null;
  }

  return [...(SOURCE_FILTER_DB_VARIANTS[filterSource] ?? [filterSource])];
}

export function applySourceFilterToWhere(
  where: Record<string, unknown>,
  filterSource: string | null | undefined
): void {
  const values = resolveSourceFilterValues(filterSource);
  if (!values) {
    return;
  }

  where.source = values.length === 1 ? values[0] : { in: values };
}

export function isAllowedNewLeadSource(source: string): boolean {
  return ALL_LEAD_SOURCES.includes(source as LeadSource);
}
