import { promises as fs } from 'fs';
import path from 'path';
import {
  isMileswebUploadConfigured,
  saveMileswebUpload,
  toMileswebPublicUrl,
} from '@/shared/lib/storage/milesweb-upload';

/**
 * Central upload helper (server-only).
 * - MilesWeb bridge when MILESWEB_UPLOAD_URL + SECRET are set
 * - Local public/uploads only as dev fallback when bridge unset
 */

export const LOCAL_UPLOAD_URL_PREFIX = '/uploads/';
export const LOCAL_UPLOAD_BUCKET = 'uploads';

function uploadsRoot(): string {
  return path.join(process.cwd(), 'public', 'uploads');
}

function normalizeRelativePath(relativePath: string): string {
  const segments = relativePath
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment && segment !== '.' && segment !== '..');
  if (segments.length === 0) {
    throw new Error('Invalid upload path.');
  }
  return segments.join('/');
}

function absolutePathFor(relativePath: string): string {
  const root = uploadsRoot();
  const absolute = path.resolve(root, relativePath);
  if (absolute !== root && !absolute.startsWith(root + path.sep)) {
    throw new Error('Invalid upload path.');
  }
  return absolute;
}

export function getLocalUploadUrl(relativePath: string): string {
  if (isMileswebUploadConfigured()) {
    return toMileswebPublicUrl(normalizeRelativePath(relativePath));
  }
  const encoded = normalizeRelativePath(relativePath)
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${LOCAL_UPLOAD_URL_PREFIX}${encoded}`;
}

/**
 * Persist a buffer. Prefer MilesWeb /costmanager; else local public/uploads.
 * Returned `url` must be persisted in DB (MilesWeb public costmanager URL).
 */
export async function saveLocalUpload(
  relativePath: string,
  data: Buffer,
  contentType = 'application/octet-stream',
): Promise<{ url: string; path: string; bucket: string }> {
  const normalized = normalizeRelativePath(relativePath);

  if (isMileswebUploadConfigured()) {
    return saveMileswebUpload(normalized, data, contentType);
  }

  const ext = path.posix.extname(normalized);
  const base = ext ? normalized.slice(0, -ext.length) : normalized;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? normalized : `${base}-${attempt}${ext}`;
    const absolute = absolutePathFor(candidate);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    try {
      await fs.writeFile(absolute, data, { flag: 'wx' });
      return {
        url: getLocalUploadUrl(candidate),
        path: candidate,
        bucket: LOCAL_UPLOAD_BUCKET,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === 'EEXIST') continue;
      throw error;
    }
  }
  throw new Error('Unable to allocate a unique upload file name.');
}
