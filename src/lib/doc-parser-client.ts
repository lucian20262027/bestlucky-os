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
    const raw = await res.text();
    let json: { fileName?: string; text?: string; error?: string } = {};
    try {
      json = raw ? (JSON.parse(raw) as typeof json) : {};
    } catch {
      json = {};
    }
    if (!res.ok) {
      if (res.status === 413) {
        return {
          fileName: file.name,
          text: '',
          error: '文件超过 4.5MB 限制，请压缩 PDF 或直接复制正文粘贴',
        };
      }
      return {
        fileName: file.name,
        text: '',
        error: json.error ?? `文档解析失败 (HTTP ${res.status})`,
      };
    }
    return {
      fileName: json.fileName ?? file.name,
      text: json.text ?? '',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return {
      fileName: file.name,
      text: '',
      error: `文档解析请求失败: ${msg}`,
    };
  }
}
