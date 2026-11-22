import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

function extractLegacyDocText(buffer: Buffer): string {
  // Best-effort readable ASCII/UTF-8 text extraction for legacy binary .doc files
  const raw = buffer.toString('latin1');
  const chunks = raw.match(/[A-Za-z0-9 ,.;:!?'"()\-/%$+#&\n\r]{6,}/g) ?? [];
  return chunks
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20000);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    let text = '';

    if (name.endsWith('.txt') || name.endsWith('.md') || file.type.startsWith('text/')) {
      text = buffer.toString('utf-8').trim();
    } else if (name.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      text = (result.value ?? '').trim();
    } else if (name.endsWith('.doc')) {
      text = extractLegacyDocText(buffer);
    } else if (name.endsWith('.pdf') || file.type === 'application/pdf') {
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        text = (result.text ?? '').trim();
      } finally {
        await parser.destroy();
      }
    } else {
      return NextResponse.json(
        { error: 'Unsupported document format. Please upload PDF, DOC, DOCX, TXT, or MD.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      fileName: file.name,
      text,
      charCount: text.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Document parsing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
