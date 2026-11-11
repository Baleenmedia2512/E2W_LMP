/**
 * Upload files to MilesWeb via Cost Manager PHP bridge:
 * https://wellnessvalley.in/costmanager/upload.php
 * Same shared folder tree as Cost Manager / Quote Buddy.
 */

function getUploadsBase(): string {
  return (
    process.env.NEXT_PUBLIC_UPLOADS_BASE_URL ||
    process.env.PUBLIC_UPLOADS_BASE_URL ||
    'https://wellnessvalley.in/costmanager'
  ).replace(/\/$/, '');
}

export function isMileswebUploadConfigured(): boolean {
  return Boolean(
    process.env.MILESWEB_UPLOAD_URL?.trim() &&
      process.env.MILESWEB_UPLOAD_SECRET?.trim(),
  );
}

export function toMileswebPublicUrl(relativePath: string): string {
  let rel = relativePath.replace(/^\/+/, '').replace(/\\/g, '/');
  if (rel.startsWith('uploads/')) rel = rel.slice('uploads/'.length);
  if (!rel.startsWith('proposal-images/')) rel = `proposal-images/${rel}`;
  return `${getUploadsBase()}/${rel
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/')}`;
}

export async function saveMileswebUpload(
  relativePath: string,
  data: Buffer,
  contentType = 'application/octet-stream',
): Promise<{ url: string; path: string; bucket: string }> {
  const uploadUrl = process.env.MILESWEB_UPLOAD_URL?.trim();
  const secret = process.env.MILESWEB_UPLOAD_SECRET?.trim();
  if (!uploadUrl || !secret) {
    throw new Error(
      'MilesWeb upload is not configured (MILESWEB_UPLOAD_URL / SECRET).',
    );
  }

  let rel = relativePath.replace(/^\/+/, '').replace(/\\/g, '/');
  if (rel.startsWith('uploads/')) rel = rel.slice('uploads/'.length);
  if (!rel.startsWith('proposal-images/')) rel = `proposal-images/${rel}`;

  const form = new FormData();
  form.set('path', rel);
  const blob = new Blob([new Uint8Array(data)], { type: contentType });
  const fileName = rel.split('/').pop() || 'upload.bin';
  form.set('file', blob, fileName);

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'X-Upload-Secret': secret },
    body: form,
  });

  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
    data?: { url?: string; path?: string; bucket?: string };
  };

  if (!res.ok) {
    throw new Error(payload.error || `MilesWeb upload failed (${res.status})`);
  }

  const savedPath = payload.data?.path || rel;
  const url = payload.data?.url || toMileswebPublicUrl(savedPath);
  return {
    url,
    path: savedPath.replace(/^proposal-images\//, ''),
    bucket: payload.data?.bucket || 'uploads',
  };
}
