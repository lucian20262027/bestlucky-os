import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/blob';

export async function GET(req: NextRequest) {
  const urlOrPath = req.nextUrl.searchParams.get('url')?.trim();
  if (!urlOrPath) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Blob storage not configured' }, { status: 501 });
  }

  try {
    const result = await get(urlOrPath, { access: 'private' });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json({ error: 'Blob not found' }, { status: 404 });
    }
    return new NextResponse(result.stream, {
      status: 200,
      headers: {
        'Content-Type': result.blob.contentType || 'video/mp4',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to read blob';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
