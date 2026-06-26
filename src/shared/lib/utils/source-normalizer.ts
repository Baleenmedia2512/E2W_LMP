/**
 * Read-side source normalization for analytics grouping only.
 * Does not mutate stored lead data.
 */

const CANONICAL_SOURCES = [
  'ChatGPT',
  'Cold Call',
  'Consultant',
  'Direct',
  'Google Maps',
  'Indiamart',
  'Just Dial',
  'LG',
  'Meta',
  'Newspaper',
  'Online',
  'Own',
  'Referral',
  'Sulekha',
  'Web App DB',
  'Website',
  'WhatsApp',
] as const;

const ALIAS_TO_CANONICAL: Record<string, string> = {
  meta: 'Meta',
  facebook: 'Meta',
  fb: 'Meta',
  whatsapp: 'WhatsApp',
  'whats app': 'WhatsApp',
  wa: 'WhatsApp',
  website: 'Website',
  web: 'Website',
  'web app': 'Website',
  webapp: 'Website',
  'web app db': 'Web App DB',
  online: 'Online',
  referral: 'Referral',
  direct: 'Direct',
  consultant: 'Consultant',
  indiamart: 'Indiamart',
  'india mart': 'Indiamart',
  sulekha: 'Sulekha',
  'just dial': 'Just Dial',
  justdial: 'Just Dial',
  'just-dial': 'Just Dial',
  'cold call': 'Cold Call',
  coldcall: 'Cold Call',
  'google maps': 'Google Maps',
  googlemaps: 'Google Maps',
  lg: 'LG',
  '4.lg': 'LG',
  chatgpt: 'ChatGPT',
  newspaper: 'Newspaper',
  own: 'Own',
};

const canonicalByLower = new Map(
  CANONICAL_SOURCES.map((source) => [source.toLowerCase(), source])
);

function stripLeadingNoise(value: string): string {
  return value.replace(/^[\d.\s]+/, '').trim();
}

/**
 * Normalize a raw source string for analytics grouping.
 * Falls back to trimmed original when no alias matches.
 */
export function normalizeSourceForAnalytics(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return 'Unknown';

  const stripped = stripLeadingNoise(raw.trim());
  const collapsed = stripped.replace(/\s+/g, ' ');
  const lower = collapsed.toLowerCase();

  if (ALIAS_TO_CANONICAL[lower]) {
    return ALIAS_TO_CANONICAL[lower];
  }

  const canonical = canonicalByLower.get(lower);
  if (canonical) {
    return canonical;
  }

  return collapsed;
}
