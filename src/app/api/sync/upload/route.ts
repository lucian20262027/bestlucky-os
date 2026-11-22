import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

export async function POST(req: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { configured: false, error: 'BLOB_READ_WRITE_TOKEN is not configured' },
      { status: 501 }
    );
  }

  try {
    const body = (await req.json()) as HandleUploadBody;
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          'video/mp4',
          'video/webm',
          'video/quicktime',
          'audio/mpeg',
          'audio/mp4',
          'audio/webm',
          'audio/wav',
          'image/png',
          'image/jpeg',
          'image/webp',
        ],
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {
        // Upload URL is persisted in AppState via Neon Postgres
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Blob upload failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
