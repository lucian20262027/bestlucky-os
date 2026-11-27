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
    <div className="inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-[#CFD4E0] bg-[#F3F4F8] px-2.5 py-1 text-[11px]">
      <span className="inline-flex items-center gap-1 font-semibold text-[#475467]">
        <Type className="h-3 w-3 text-[#6E32F5]" />
        {label || 'Style'}:
      </span>

      <select
        value={value.fontFamily}
        onChange={(e) =>
          onChange({ ...value, fontFamily: e.target.value as FontFamilyChoice })
        }
        className="rounded border border-[#CBD0DC] bg-white px-2 py-0.5 text-[11px] font-medium text-[#111118] focus:border-[#6E32F5] focus:outline-none"
        aria-label="Font family"
      >
        {FONT_FAMILY_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-0.5 rounded border border-[#CBD0DC] bg-white p-0.5">
        {FONT_SIZE_OPTIONS.map((sz) => {
          const active = value.fontSize === sz.id;
          return (
            <button
              key={sz.id}
              type="button"
              onClick={() => onChange({ ...value, fontSize: sz.id as FontSizeChoice })}
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition ${
                active
                  ? 'bg-[#6E32F5] text-white shadow-2xs'
                  : 'text-[#475467] hover:bg-[#ECEEF5] hover:text-[#111118]'
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
