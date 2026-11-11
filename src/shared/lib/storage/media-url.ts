/**
 * Resolve / rewrite media URLs to shared Cost Manager MilesWeb storage.
 * Legacy supabase.co storage URLs → wellnessvalley.in/costmanager/proposal-images/...
 */

function getUploadsPublicBase(): string {
  return (
    process.env.NEXT_PUBLIC_UPLOADS_BASE_URL ||
    process.env.PUBLIC_UPLOADS_BASE_URL ||
    process.env.VITE_UPLOADS_BASE_URL ||
    'https://wellnessvalley.in/costmanager'
  ).replace(/\/$/, '');
}

/** Rewrite legacy Supabase storage URLs to MilesWeb /costmanager public files. */
export function rewriteLegacyStorageUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const uploadsBase = getUploadsPublicBase();
  const supabaseRewritten = trimmed.replace(
    /https?:\/\/[^/\s"'\\]+supabase\.co\/storage\/v1\/object\/(?:public|sign)\/proposal-images\//gi,
    `${uploadsBase}/proposal-images/`,
  );
  if (supabaseRewritten !== trimmed) return supabaseRewritten;

  // Any supabase storage bucket → same key under /costmanager/proposal-images/
  const anyBucket = trimmed.replace(
    /https?:\/\/[^/\s"'\\]+supabase\.co\/storage\/v1\/object\/(?:public|sign)\/[^/]+\//gi,
    `${uploadsBase}/proposal-images/`,
  );
  if (anyBucket !== trimmed) return anyBucket;

  if (trimmed.startsWith('/uploads/')) {
    return `${uploadsBase}${trimmed.slice('/uploads'.length)}`;
  }

  return trimmed;
}

/**
 * Resolve a stored media/file URL for display or download.
 * - NA / empty → null
 * - wellnessvalley / http(s) / data → rewrite legacy supabase hosts
 * - bare object key → {base}/proposal-images/{key}
 */
export function resolveMediaUrl(value: string | null | undefined): string | null {
  const trimmed = String(value ?? '').trim();
  if (!trimmed || trimmed.toUpperCase() === 'NA') return null;

  if (trimmed.startsWith('/uploads/')) return rewriteLegacyStorageUrl(trimmed);

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:')
  ) {
    return rewriteLegacyStorageUrl(trimmed);
  }

  const uploadsBase = getUploadsPublicBase();
  const withoutLeadingSlash = trimmed.replace(/^\/+/, '');
  if (withoutLeadingSlash.startsWith('storage/v1/object/')) {
    const afterBucket = withoutLeadingSlash.replace(
      /^storage\/v1\/object\/(?:public|sign)\/[^/]+\//i,
      '',
    );
    return `${uploadsBase}/proposal-images/${afterBucket}`;
  }

  return `${uploadsBase}/proposal-images/${withoutLeadingSlash}`;
}

export function resolveMediaUrlRequired(
  value: string | null | undefined,
  fallback = '',
): string {
  return resolveMediaUrl(value) ?? fallback;
}
