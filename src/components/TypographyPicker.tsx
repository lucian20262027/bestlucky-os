'use client';

import React from 'react';
import { Type } from 'lucide-react';
import { FONT_FAMILY_OPTIONS, FONT_SIZE_OPTIONS } from '@/lib/typography';
import { FontFamilyChoice, FontSizeChoice, TextStyleConfig } from '@/lib/types';

interface TypographyPickerProps {
  value: TextStyleConfig;
  onChange: (next: TextStyleConfig) => void;
  label?: string;
}

export function TypographyPicker({ value, onChange, label }: TypographyPickerProps) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[#FAF9FF] px-2 py-1 text-[11px]">
      <span className="inline-flex items-center gap-1 font-medium text-[var(--ink-muted)]">
        <Type className="h-3 w-3 text-[var(--accent)]" />
        {label || 'Style'}:
      </span>

      <select
        value={value.fontFamily}
        onChange={(e) =>
          onChange({ ...value, fontFamily: e.target.value as FontFamilyChoice })
        }
        className="rounded border border-[var(--border)] bg-white px-1.5 py-0.5 text-[11px] font-medium text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
        aria-label="Font family"
      >
        {FONT_FAMILY_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>

      <div className="flex items-center rounded border border-[var(--border)] bg-white p-0.5">
        {FONT_SIZE_OPTIONS.map((sz) => {
          const active = value.fontSize === sz.id;
          return (
            <button
              key={sz.id}
              type="button"
              onClick={() => onChange({ ...value, fontSize: sz.id as FontSizeChoice })}
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition ${
                active
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
              }`}
            >
              {sz.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
