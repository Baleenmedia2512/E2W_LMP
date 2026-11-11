/**
 * Download CallLog recordings still referenced (or formerly referenced) from
 * Supabase public storage and upload them into shared Cost Manager MilesWeb
 * under proposal-images/... so rewritten wellnessvalley URLs actually resolve.
 *
 * Uses public Supabase object URLs + MilesWeb upload bridge.
 */
import { PrismaClient } from '@prisma/client';
import { saveMileswebUpload } from '../src/shared/lib/storage/milesweb-upload';
import { resolveMediaUrl } from '../src/shared/lib/storage/media-url';

const prisma = new PrismaClient();
const SUPABASE_HOST = 'wkwrrdcjknvupwsfdjtd.supabase.co';
const CONCURRENCY = 4;

function milesPathFromLegacyUrl(url: string): string | null {
  const m = url.match(
    /supabase\.co\/storage\/v1\/object\/(?:public|sign)\/[^/]+\/(.+)$/i,
  );
  if (!m?.[1]) return null;
  // Keep nested keys (e.g. call-recordings/foo.m4a)
  const key = decodeURIComponent(m[1].split('?')[0]);
  return `proposal-images/${key}`;
}

async function headOk(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (res.ok) return true;
    // some hosts reject HEAD — try ranged GET
    const get = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
    });
    return get.ok || get.status === 206;
  } catch {
    return false;
  }
}

async function syncOne(legacyUrl: string): Promise<'ok' | 'exists' | 'fail'> {
  const milesPath = milesPathFromLegacyUrl(legacyUrl);
  if (!milesPath) return 'fail';

  const publicUrl =
    resolveMediaUrl(legacyUrl) ||
    `https://wellnessvalley.in/costmanager/${milesPath}`;

  if (await headOk(publicUrl)) {
    return 'exists';
  }

  const src = legacyUrl.includes(SUPABASE_HOST)
    ? legacyUrl
    : `https://${SUPABASE_HOST}/storage/v1/object/public/recordings/${milesPath.replace(/^proposal-images\//, '')}`;

  const res = await fetch(src);
  if (!res.ok) {
    console.error(`download fail ${res.status}: ${src}`);
    return 'fail';
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'audio/mp4';
  await saveMileswebUpload(milesPath, buf, contentType);
  return 'ok';
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

async function main() {
  // Prefer rows that still have supabase URLs; also scan wellnessvalley
  // recordings that may 404 (from a prior URL-only rewrite).
  const rows = await prisma.callLog.findMany({
    where: {
      recordingUrl: { not: null },
      OR: [
        { recordingUrl: { contains: 'supabase.co' } },
        { recordingUrl: { contains: 'wellnessvalley.in/costmanager' } },
        { recordingUrl: { contains: 'recording_' } },
        { recordingUrl: { contains: 'call-recordings/' } },
      ],
    },
    select: { id: true, recordingUrl: true },
  });

  // Build unique legacy supabase download URLs
  const legacyByMiles = new Map<string, string>();
  for (const row of rows) {
    const url = String(row.recordingUrl || '');
    if (!url) continue;

    let legacy = url;
    if (!url.includes('supabase.co')) {
      // Reconstruct likely public supabase URL from MilesWeb key
      const key = url
        .replace(/^https?:\/\/wellnessvalley\.in\/costmanager\/proposal-images\//i, '')
        .replace(/^https?:\/\/wellnessvalley\.in\/costmanager\//i, '');
      legacy = `https://${SUPABASE_HOST}/storage/v1/object/public/recordings/${key}`;
    }

    const milesPath = milesPathFromLegacyUrl(legacy);
    if (!milesPath) continue;
    if (!legacyByMiles.has(milesPath)) legacyByMiles.set(milesPath, legacy);
  }

  const entries = [...legacyByMiles.entries()];
  console.log(`Unique recording objects to check/sync: ${entries.length}`);

  let ok = 0;
  let exists = 0;
  let fail = 0;

  await mapPool(entries, CONCURRENCY, async ([milesPath, legacy]) => {
    try {
      const status = await syncOne(legacy);
      if (status === 'ok') {
        ok += 1;
        console.log(`uploaded ${milesPath}`);
      } else if (status === 'exists') {
        exists += 1;
      } else {
        fail += 1;
        console.error(`fail ${milesPath}`);
      }
    } catch (e) {
      fail += 1;
      console.error(`error ${milesPath}`, e);
    }
    return null;
  });

  console.log(`\nDone. uploaded=${ok} already_on_milesweb=${exists} failed=${fail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
