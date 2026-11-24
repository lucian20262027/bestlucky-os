import { NextRequest, NextResponse } from 'next/server';
import { createPresignedGetUrl, isR2Configured } from '@/lib/r2-client';

export async function GET(req: NextRequest) {
  if (!isR2Configured()) {
    return NextResponse.json({ error: 'R2 storage is not configured' }, { status: 503 });
  }

  const key = req.nextUrl.searchParams.get('key')?.trim();
  if (!key || !key.startsWith('loopos/')) {
    return NextResponse.json({ error: 'Invalid object key' }, { status: 400 });
  }

  try {
    const signedUrl = await createPresignedGetUrl(key);
    return NextResponse.redirect(signedUrl, 307);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to sign R2 read URL';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
