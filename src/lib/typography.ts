import type React from 'react';
import { FontFamilyChoice, FontSizeChoice, TextStyleConfig } from './types';

export const FONT_FAMILY_OPTIONS: { id: FontFamilyChoice; label: string; sample: string }[] = [
  { id: 'sans', label: 'Sans (现代无衬线)', sample: 'Aa' },
  { id: 'serif', label: 'Serif (杂志衬线)', sample: 'Aa' },
  { id: 'mono', label: 'Mono (代码等宽)', sample: 'Aa' },
];

export const FONT_SIZE_OPTIONS: { id: FontSizeChoice; label: string }[] = [
  { id: 'sm', label: 'SM' },
  { id: 'base', label: 'Base' },
  { id: 'lg', label: 'LG' },
  { id: 'xl', label: 'XL' },
  { id: '2xl', label: '2XL' },
];

export const DEFAULT_HERO_STYLE: TextStyleConfig = {
  fontFamily: 'sans',
  fontSize: '2xl',
};

export const DEFAULT_MODULE_STYLE: TextStyleConfig = {
  fontFamily: 'sans',
  fontSize: 'xl',
};

export const DEFAULT_SUBSECTION_STYLE: TextStyleConfig = {
  fontFamily: 'sans',
  fontSize: 'base',
};

export const DEFAULT_BODY_STYLE: TextStyleConfig = {
  fontFamily: 'sans',
  fontSize: 'sm',
};

export function getTypographyStyle(cfg?: TextStyleConfig): React.CSSProperties {
  const family = cfg?.fontFamily ?? 'sans';
  if (family === 'serif') return { fontFamily: 'var(--font-serif-stack)' };
  if (family === 'mono') return { fontFamily: 'var(--font-mono-stack)' };
  return { fontFamily: 'var(--font-sans-stack)' };
}

export function getTypographyClasses(
  cfg?: TextStyleConfig,
  kind: 'heading' | 'body' = 'body'
): string {
  const size = cfg?.fontSize ?? (kind === 'heading' ? 'lg' : 'sm');
  const sizeMap: Record<FontSizeChoice, string> =
    kind === 'heading'
      ? {
          sm: 'text-sm font-semibold leading-snug',
          base: 'text-base font-semibold leading-snug',
          lg: 'text-lg font-semibold leading-snug',
          xl: 'text-xl font-bold leading-tight tracking-tight',
          '2xl': 'text-2xl sm:text-3xl font-bold leading-tight tracking-tight',
        }
      : {
          sm: 'text-[13px] leading-relaxed',
          base: 'text-sm leading-relaxed',
          lg: 'text-base leading-relaxed',
          xl: 'text-lg leading-relaxed',
          '2xl': 'text-xl leading-relaxed',
        };
  return sizeMap[size];
}
