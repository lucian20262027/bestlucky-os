'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { ROLE_LIST } from '@/lib/roles';
import { RoleTrack } from '@/lib/types';

interface RoleMultiSelectProps {
  selected: RoleTrack[];
  onChange: (next: RoleTrack[]) => void;
  compact?: boolean;
  label?: string;
}

export function RoleMultiSelect({
  selected,
  onChange,
  compact = false,
  label,
}: RoleMultiSelectProps) {
  const toggle = (id: RoleTrack) => {
    const exists = selected.includes(id);
    if (exists) {
      if (selected.length <= 1) return; // keep at least 1 selected
      onChange(selected.filter((r) => r !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div>
      {label && (
        <div className="mb-1.5 text-xs font-medium text-[#525260]">
          {label} <span className="text-[11px] text-[#848494]">(可多选，例如 FDE + PM)</span>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {ROLE_LIST.map((r) => {
          const active = selected.includes(r.id);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => toggle(r.id)}
              className={`inline-flex items-center gap-1 rounded-lg border font-semibold transition ${
                compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
              } ${
                active
                  ? 'border-[#6E32F5] bg-[#6E32F5] text-white shadow-2xs'
                  : 'border-[#ECECF2] bg-white text-[#525260] hover:border-[#D4C5FD] hover:text-[#111118]'
              }`}
            >
              {active && <Check className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />}
              <span>{r.id === 'pgm' && compact ? 'PgM' : r.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
