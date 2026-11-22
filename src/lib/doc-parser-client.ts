export async function extractDocumentText(file: File): Promise<{
  fileName: string;
  text: string;
  error?: string;
}> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.txt') || lower.endsWith('.md') || file.type.startsWith('text/')) {
    const text = await file.text();
    return { fileName: file.name, text: text.trim() };
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/parse-doc', {
      method: 'POST',
      body: formData,
    });
    const json = (await res.json()) as {
      fileName?: string;
      text?: string;
      error?: string;
    };
    if (!res.ok) {
      return {
        fileName: file.name,
        text: '',
        error: json.error ?? 'Failed to parse document',
      };
    }
    return {
      fileName: json.fileName ?? file.name,
      text: json.text ?? '',
    };
  } catch {
    return {
      fileName: file.name,
      text: '',
      error: 'Network error while parsing document',
    };
  }
}
