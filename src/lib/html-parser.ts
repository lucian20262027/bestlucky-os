import type { HtmlDesignTokens } from '@/lib/types';

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
      .querySelectorAll('script, style, noscript, svg, template, iframe')
      .forEach((el) => el.remove());

    const h1Text = doc.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
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

    if (doc.body) {
      walk(doc.body);
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
