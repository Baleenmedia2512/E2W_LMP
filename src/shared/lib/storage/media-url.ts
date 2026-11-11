/**
 * Resolve / rewrite media URLs to shared Cost Manager MilesWeb storage.
 * Legacy supabase.co / alternate costmanager hosts → NEXT_PUBLIC_UPLOADS_BASE_URL.
 */

function getUploadsPublicBase(): string {
  return (
    process.env.NEXT_PUBLIC_UPLOADS_BASE_URL ||
    process.env.PUBLIC_UPLOADS_BASE_URL ||
    process.env.VITE_UPLOADS_BASE_URL ||
    'https://baleenmedia.in/costmanager'
  ).replace(/\/$/, '');
}

/** Rewrite legacy Supabase / old host storage URLs to current MilesWeb base. */
export function rewriteLegacyStorageUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const uploadsBase = getUploadsPublicBase();

  // Any known MilesWeb costmanager host → current base
  const hostRewritten = trimmed.replace(
    /https?:\/\/(?:www\.)?(?:wellnessvalley\.in|baleenmedia\.(?:in|com))\/costmanager/gi,
    uploadsBase,
  );
  if (hostRewritten !== trimmed && !/supabase\.co/i.test(hostRewritten)) {
    return hostRewritten;
  }

  const supabaseRewritten = hostRewritten.replace(
    /https?:\/\/[^/\s"'\\]+supabase\.co\/storage\/v1\/object\/(?:public|sign)\/proposal-images\//gi,
    `${uploadsBase}/proposal-images/`,
  );
  if (supabaseRewritten !== hostRewritten) return supabaseRewritten;

  // Any supabase storage bucket → same key under /costmanager/proposal-images/
  const anyBucket = hostRewritten.replace(
    /https?:\/\/[^/\s"'\\]+supabase\.co\/storage\/v1\/object\/(?:public|sign)\/[^/]+\//gi,
    `${uploadsBase}/proposal-images/`,
  );
  if (anyBucket !== hostRewritten) return anyBucket;

  if (trimmed.startsWith('/uploads/')) {
    return `${uploadsBase}${trimmed.slice('/uploads'.length)}`;
  }

  return hostRewritten;
}

/**
 * Resolve a stored media/file URL for display or download.
 * - NA / empty → null
 * - http(s) / data → rewrite legacy supabase / wellnessvalley hosts
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
