'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

interface RareFolderCardProps {
  title: string;
  subtitle: string;
  badge: string;
  href?: string;
  onClick?: () => void;
  accent?: 'obsidian' | 'violet' | 'indigo' | 'emerald';
  icon: React.ReactNode;
}

const POCKET_STYLES = {
  obsidian:
    'from-[#18181F]/85 via-[#22222C]/75 to-[#111118]/90 border-white/20',
  violet:
    'from-[#4C1D95]/85 via-[#6E32F5]/75 to-[#3B0764]/90 border-white/25',
  indigo:
    'from-[#1E1B4B]/85 via-[#4338CA]/75 to-[#1E1B4B]/90 border-white/20',
  emerald:
    'from-[#064E3B]/85 via-[#059669]/75 to-[#022C22]/90 border-white/20',
};

export function RareFolderCard({
  title,
  subtitle,
  badge,
  href,
  onClick,
  accent = 'obsidian',
  icon,
}: RareFolderCardProps) {
  const pocketGradient = POCKET_STYLES[accent];

  const inner = (
    <div className="group flex h-full flex-col justify-between rounded-2xl border border-[#E5E5EE] bg-white p-2.5 shadow-2xs transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#6E32F5]/40 hover:shadow-lg">
      {/* Stage with RareUI 3D Frosted Folder */}
      <div className="relative flex h-36 items-center justify-center overflow-hidden rounded-xl border border-[#EFEFF5] bg-gradient-to-b from-[#FAFAFC] to-[#F2F2F7]">
        {/* Subtle radial spotlight */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(110,50,245,0.08),transparent_65%)] opacity-70 transition-opacity duration-300 group-hover:opacity-100" />

        {/* 3D Folder Stack */}
        <div className="relative mt-2 h-24 w-32">
          {/* Folder Back Tab */}
          <div className="absolute -top-2.5 left-0 h-5 w-14 rounded-t-lg bg-[#1C1C24] shadow-xs" />
          <div className="absolute inset-0 rounded-xl bg-[#14141A] shadow-md" />

          {/* 3 Peeking Document Sheets that fan out on hover */}
          <div className="absolute inset-x-2.5 top-1.5 h-16 rounded-lg border border-[#E6E6EF] bg-white p-1.5 shadow-xs transition-all duration-300 ease-out group-hover:-translate-x-2 group-hover:-translate-y-3 group-hover:-rotate-6">
            <div className="h-1.5 w-10 rounded-full bg-[#E5E5EF]" />
            <div className="mt-1.5 h-1 w-14 rounded-full bg-[#F0F0F6]" />
            <div className="mt-1 h-1 w-8 rounded-full bg-[#F0F0F6]" />
          </div>

          <div className="absolute inset-x-2.5 top-1 h-16 rounded-lg border border-[#E6E6EF] bg-white p-1.5 shadow-xs transition-all duration-300 ease-out group-hover:-translate-y-4">
            <div className="flex items-center justify-between">
              <div className="h-1.5 w-8 rounded-full bg-[#6E32F5]/40" />
              <div className="h-1.5 w-3 rounded-full bg-[#E5E5EF]" />
            </div>
            <div className="mt-1.5 h-1 w-16 rounded-full bg-[#EFEFF6]" />
            <div className="mt-1 h-1 w-11 rounded-full bg-[#EFEFF6]" />
          </div>

          <div className="absolute inset-x-2.5 top-1.5 h-16 rounded-lg border border-[#E6E6EF] bg-white p-1.5 shadow-xs transition-all duration-300 ease-out group-hover:translate-x-2 group-hover:-translate-y-3 group-hover:rotate-6">
            <div className="h-1.5 w-9 rounded-full bg-[#D8C8FE]" />
            <div className="mt-1.5 h-1 w-14 rounded-full bg-[#F0F0F6]" />
            <div className="mt-1 h-1 w-10 rounded-full bg-[#F0F0F6]" />
          </div>

          {/* Front Frosted Glass Pocket */}
          <div
            className={`absolute inset-x-0 bottom-0 flex h-[62px] items-end justify-between rounded-xl border-t bg-gradient-to-br ${pocketGradient} p-2.5 shadow-lg backdrop-blur-md transition-transform duration-300 ease-out group-hover:translate-y-0.5`}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white ring-1 ring-white/20">
              {icon}
            </div>
            <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-xs">
              {badge}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Label + RareUI Diagonal Arrow */}
      <div className="flex items-center justify-between px-1.5 pt-2.5 pb-1">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-[#111118] transition-colors group-hover:text-[#6E32F5]">
            {title}
          </div>
          <div className="truncate text-[11px] text-[#848494]">{subtitle}</div>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-[#9E9EAE] transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#6E32F5]" />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className="block h-full w-full text-left">
      {inner}
    </button>
  );
}
