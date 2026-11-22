export type VideoProvider =
  | 'youtube'
  | 'bilibili'
  | 'loom'
  | 'vimeo'
  | 'direct'
  | 'lark'
  | 'external';

export interface ParsedVideoSource {
  provider: VideoProvider;
  embedUrl?: string;
  originalUrl: string;
  label: string;
}

export function parseVideoSource(rawUrl: string): ParsedVideoSource {
  const url = rawUrl.trim();
  if (!url) {
    return { provider: 'external', originalUrl: '', label: 'Video Link' };
  }

  // YouTube (watch, youtu.be, shorts, embed)
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,15})/
  );
  if (ytMatch?.[1]) {
    return {
      provider: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`,
      originalUrl: url,
      label: 'YouTube Video',
    };
  }

  // Bilibili BV id
  const biliMatch = url.match(/bilibili\.com\/video\/(BV[0-9A-Za-z]+)/i);
  if (biliMatch?.[1]) {
    return {
      provider: 'bilibili',
      embedUrl: `https://player.bilibili.com/player.html?bvid=${biliMatch[1]}&high_quality=1&autoplay=0`,
      originalUrl: url,
      label: 'Bilibili Video',
    };
  }

  // Loom
  const loomMatch = url.match(/loom\.com\/(?:share|embed)\/([A-Za-z0-9]+)/i);
  if (loomMatch?.[1]) {
    return {
      provider: 'loom',
      embedUrl: `https://www.loom.com/embed/${loomMatch[1]}`,
      originalUrl: url,
      label: 'Loom Recording',
    };
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch?.[1]) {
    return {
      provider: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      originalUrl: url,
      label: 'Vimeo Video',
    };
  }

  // Direct media files
  if (/\.(mp4|webm|mov|m4v|ogg|mp3|m4a)(\?.*)?$/i.test(url)) {
    return {
      provider: 'direct',
      embedUrl: url,
      originalUrl: url,
      label: 'Direct Video / Audio',
    };
  }

  // Lark / Feishu links (Minutes, Wiki, Docx, Drive)
  if (/(larksuite\.com|feishu\.cn|larkoffice\.com)/i.test(url)) {
    return {
      provider: 'lark',
      originalUrl: url,
      label: 'Lark / 飞书妙记或文档',
    };
  }

  return {
    provider: 'external',
    originalUrl: url,
    label: 'External Video Link',
  };
}

export function formatTimestamp(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function parseTimestampInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const parts = trimmed.split(':').map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n) || n < 0)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}
