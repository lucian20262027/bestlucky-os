import { NextRequest, NextResponse } from 'next/server';
import { createPresignedPutUrl, isR2Configured } from '@/lib/r2-client';

export async function GET() {
  return NextResponse.json({
    configured: isR2Configured(),
    provider: isR2Configured() ? 'cloudflare-r2' : 'none',
  });
}

export async function POST(req: NextRequest) {
  if (!isR2Configured()) {
    return NextResponse.json({ configured: false });
  }

  try {
    const body = (await req.json()) as {
      fileName?: string;
      contentType?: string;
      folder?: string;
    };

    const rawName = (body.fileName ?? 'file.bin').trim();
    const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'file.bin';
    const folder = body.folder === 'html' ? 'html' : 'videos';
    const contentType = (body.contentType ?? 'application/octet-stream').trim();

    const key = `loopos/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${safeName}`;
    const uploadUrl = await createPresignedPutUrl(key, contentType);
    const accessUrl = `/api/sync/r2-file?key=${encodeURIComponent(key)}`;

    return NextResponse.json({
      configured: true,
      uploadUrl,
      key,
      accessUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create R2 upload URL';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
