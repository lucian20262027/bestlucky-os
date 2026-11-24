import type { HtmlDesignTokens } from '@/lib/types';

export interface HtmlHeadingItem {
  id: string;
  text: string;
  level: number;
}

export interface HtmlParseResult {
  title: string;
  text: string;
  rawHtml: string;
  designTokens: HtmlDesignTokens;
}

export function isHtmlFile(fileName: string, mimeType = ''): boolean {
  const lower = fileName.toLowerCase();
  return (
    lower.endsWith('.html') ||
    lower.endsWith('.htm') ||
    mimeType.toLowerCase().includes('text/html')
  );
}

function cleanFontValue(raw: string): string | undefined {
  const cleaned = raw.replace(/!important/gi, '').trim();
  if (!cleaned || cleaned === 'inherit' || cleaned === 'initial') return undefined;
  return cleaned;
}

function extractFirstHex(text: string): string | undefined {
  const matches = text.match(/#[0-9a-fA-F]{6}\b/g);
  if (!matches) return undefined;
  for (const hex of matches) {
    const upper = hex.toUpperCase();
    // Skip pure white/black/near-neutral grays when looking for an accent color
    if (
      upper === '#FFFFFF' ||
      upper === '#000000' ||
      upper === '#FAFAFC' ||
      upper === '#F8FAFC' ||
      upper === '#111118'
    ) {
      continue;
    }
    return upper;
  }
  return undefined;
}

export function extractDesignTokensFromHtml(rawHtml: string): HtmlDesignTokens {
  const tokens: HtmlDesignTokens = {};

  // 1. Google Fonts <link>
  const fontLinkMatch = rawHtml.match(
    /<link[^>]+href=["'](https:\/\/fonts\.googleapis\.com\/css2?[^"']+)["'][^>]*>/i
  );
  if (fontLinkMatch?.[1]) {
    tokens.googleFontsHref = fontLinkMatch[1];
  }

  // Gather all <style> blocks
  const styleBlocks = Array.from(rawHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi))
    .map((m) => m[1])
    .join('\n');

  // 2. Body / Root font-family
  const bodyFontMatch =
    styleBlocks.match(/(?:body|html|:root)\s*\{[^}]*font-family\s*:\s*([^;}{]+)/i) ??
    styleBlocks.match(/font-family\s*:\s*([^;}{]+)/i);
  if (bodyFontMatch?.[1]) {
    tokens.fontFamily = cleanFontValue(bodyFontMatch[1]);
  }

  // 3. Heading font-family
  const headingFontMatch = styleBlocks.match(
    /h1[^{]*\{[^}]*font-family\s*:\s*([^;}{]+)/i
  );
  if (headingFontMatch?.[1]) {
    tokens.headingFont = cleanFontValue(headingFontMatch[1]);
  }

  // 4. Accent color (--accent, --primary, or vibrant color in CSS)
  const cssVarAccent = styleBlocks.match(
    /--(?:accent|primary|brand|theme-color)\s*:\s*(#[0-9a-fA-F]{3,8})/i
  );
  if (cssVarAccent?.[1]) {
    tokens.accentColor = cssVarAccent[1];
  } else {
    tokens.accentColor = extractFirstHex(styleBlocks);
  }

  // 5. Background color on body
  const bgMatch = styleBlocks.match(
    /body\s*\{[^}]*background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,8})/i
  );
  if (bgMatch?.[1]) {
    tokens.backgroundColor = bgMatch[1];
  }

  // 6. Text color on body
  const textMatch = styleBlocks.match(/body\s*\{[^}]*(?:^|;|\s)color\s*:\s*(#[0-9a-fA-F]{3,8})/i);
  if (textMatch?.[1]) {
    tokens.textColor = textMatch[1];
  }

  return tokens;
}

export function extractReadableTextFromHtml(rawHtml: string): {
  title: string;
  text: string;
} {
  const titleMatch = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const rawTitle = titleMatch?.[1]?.replace(/\s+/g, ' ').trim() ?? '';

  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(rawHtml, 'text/html');
    doc
      .querySelectorAll(
        'script, style, noscript, svg, template, iframe, aside, nav, header, footer, [role="navigation"], [class*="sidebar"], [class*="sidenav"]'
      )
      .forEach((el) => el.remove());

    // Remove stray Save / Skip buttons
    doc.querySelectorAll('a, button').forEach((el) => {
      const txt = (el.textContent ?? '')
        .replace(/[★☆⭐]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
      if (txt === 'save' || txt === 'saved' || txt.includes('skip to main content')) {
        el.remove();
      }
    });

    const contentRoot =
      doc.querySelector('article') ?? doc.querySelector('main') ?? doc.body;
    const h1Text =
      contentRoot?.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    const title = rawTitle || h1Text || 'Uploaded HTML Page';

    const blockTags = new Set([
      'P',
      'DIV',
      'SECTION',
      'ARTICLE',
      'HEADER',
      'FOOTER',
      'H1',
      'H2',
      'H3',
      'H4',
      'H5',
      'H6',
      'LI',
      'TR',
      'BLOCKQUOTE',
      'PRE',
    ]);

    const lines: string[] = [];
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const val = (node.textContent ?? '').replace(/\s+/g, ' ');
        if (val.trim()) lines.push(val);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as Element;
      const tag = el.tagName.toUpperCase();
      if (tag === 'BR') {
        lines.push('\n');
        return;
      }
      if (tag === 'LI') {
        lines.push('\n• ');
      } else if (blockTags.has(tag)) {
        lines.push('\n');
      }
      el.childNodes.forEach(walk);
      if (blockTags.has(tag)) {
        lines.push('\n');
      }
    };

    if (contentRoot) {
      walk(contentRoot);
    }

    const text = lines
      .join('')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return { title, text };
  }

  // Server-side fallback
  const stripped = rawHtml
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article|br)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    title: rawTitle || 'Uploaded HTML Page',
    text: stripped,
  };
}

export function parseHtmlContent(rawHtml: string, fileName = 'page.html'): HtmlParseResult {
  const { title, text } = extractReadableTextFromHtml(rawHtml);
  const designTokens = extractDesignTokensFromHtml(rawHtml);
  const cleanTitle =
    title && title !== 'Uploaded HTML Page'
      ? title
      : fileName.replace(/\.(html?|HTML?)$/, '') || 'Uploaded HTML Page';

  return {
    title: cleanTitle,
    text,
    rawHtml,
    designTokens,
  };
}

export function toYouTubeEmbedUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    let videoId = '';
    if (host === 'youtu.be') {
      videoId = parsed.pathname.slice(1).split('/')[0] ?? '';
    } else if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname.startsWith('/embed/')) {
        videoId = parsed.pathname.split('/embed/')[1]?.split('/')[0] ?? '';
      } else if (parsed.pathname.startsWith('/shorts/')) {
        videoId = parsed.pathname.split('/shorts/')[1]?.split('/')[0] ?? '';
      } else {
        videoId = parsed.searchParams.get('v') ?? '';
      }
    }
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}`;
  } catch {
    return null;
  }
}

export function cleanHtmlForReader(
  rawHtml: string,
  options?: { editable?: boolean }
): {
  cleanHtml: string;
  strippedShell: boolean;
  headings: HtmlHeadingItem[];
} {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return { cleanHtml: rawHtml, strippedShell: false, headings: [] };
  }

  const doc = new DOMParser().parseFromString(rawHtml, 'text/html');
  let strippedShell = false;

  // Remove external scripts & trackers so static snapshots stay fast and error-free
  doc.querySelectorAll('script, noscript').forEach((el) => el.remove());

  const mainContent =
    doc.querySelector('article') ??
    doc.querySelector('main') ??
    doc.querySelector('[role="main"]');

  const shellSelectors = [
    'aside',
    'nav',
    'header',
    'footer',
    '[role="navigation"]',
    '[class*="sidebar"]',
    '[id*="sidebar"]',
    '[class*="sidenav"]',
    '[class*="SideNav"]',
    '[class*="left-nav"]',
    '[class*="topbar"]',
    '[aria-label="Breadcrumb"]',
    '[class*="breadcrumb"]',
  ];

  shellSelectors.forEach((selector) => {
    doc.querySelectorAll(selector).forEach((el) => {
      if (mainContent && (el === mainContent || el.contains(mainContent))) {
        return;
      }
      el.remove();
      strippedShell = true;
    });
  });

  // Remove stray Save / Bookmark / Skip-to-content / Lesson-contents right-rail clones
  doc.querySelectorAll('a, button').forEach((el) => {
    const txt = (el.textContent ?? '')
      .replace(/[★☆⭐]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    if (
      txt === 'save' ||
      txt === 'saved' ||
      txt === 'bookmark' ||
      txt.includes('skip to main content')
    ) {
      el.remove();
      strippedShell = true;
    }
  });

  // Assign stable IDs to h2/h3 headings for right-rail Lesson contents TOC
  const headings: HtmlHeadingItem[] = [];
  const headingRoot = mainContent ?? doc.body;
  headingRoot?.querySelectorAll('h2, h3').forEach((el, idx) => {
    const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    const id = el.id || `bl-sec-${idx + 1}`;
    el.id = id;
    headings.push({
      id,
      text,
      level: el.tagName.toUpperCase() === 'H2' ? 2 : 3,
    });
  });

  // Neutralize fixed sidebar offsets & multi-column grid gaps so article fills cleanly
  const styleEl = doc.createElement('style');
  styleEl.id = 'bl-reader-clean-reset';
  styleEl.textContent = `
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      overflow-x: hidden !important;
    }
    body {
      padding: 24px 32px !important;
      max-width: 100% !important;
    }
    body > div,
    main,
    article,
    [role="main"] {
      display: block !important;
      grid-template-columns: none !important;
      margin-left: auto !important;
      margin-right: auto !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
      left: 0 !important;
      max-width: 820px !important;
      width: 100% !important;
    }
    ${
      options?.editable
        ? `[data-bl-editable="true"] {
      outline: 2px dashed rgba(110, 50, 245, 0.35);
      outline-offset: 8px;
      border-radius: 12px;
      cursor: text;
    }`
        : ''
    }
  `;
  doc.head.appendChild(styleEl);

  if (options?.editable && headingRoot) {
    headingRoot.setAttribute('contenteditable', 'true');
    headingRoot.setAttribute('data-bl-editable', 'true');
  }

  return {
    cleanHtml: `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`,
    strippedShell,
    headings,
  };
}
