import { NextRequest, NextResponse } from 'next/server';
import { saveLocalUpload } from '@/shared/lib/storage/local-upload';
import { extractTokenFromHeader, verifyToken } from '@/shared/lib/auth/auth-utils';

/**
 * Upload a file to shared Cost Manager MilesWeb storage
 * (wellnessvalley.in/costmanager/proposal-images/...).
 *
 * multipart fields:
 * - file (required)
 * - path (optional relative key, e.g. recordings/foo.m4a or proposal-images/foo.png)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    const payload = token ? verifyToken(token) : null;
    if (!payload?.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get('file');
    const relativePathRaw = form.get('path');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'file is required' },
        { status: 400 },
      );
    }

    const fallbackName = file.name || `upload-${Date.now()}.bin`;
    const relativePath =
      typeof relativePathRaw === 'string' && relativePathRaw.trim()
        ? relativePathRaw.trim()
        : `proposal-images/${fallbackName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || 'application/octet-stream';
    const saved = await saveLocalUpload(relativePath, buffer, contentType);

    return NextResponse.json({
      success: true,
      data: {
        url: saved.url,
        path: saved.path,
        bucket: saved.bucket,
      },
    });
  } catch (error) {
    console.error('[uploads] Failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 },
    );
  }
}
