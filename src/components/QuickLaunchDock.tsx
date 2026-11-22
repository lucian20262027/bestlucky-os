'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';

interface QuickSite {
  id: string;
  name: string;
  subtitle: string;
  href: string;
  bgClass: string;
  icon: React.ReactNode;
}

const QUICK_SITES: QuickSite[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    subtitle: 'Inbox & Offers',
    href: 'https://mail.google.com',
    bgClass: 'bg-red-50/70 border-red-100',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path d="M3 6.5V17.5C3 18.33 3.67 19 4.5 19H6.5V10.5L12 14.5L17.5 10.5V19H19.5C20.33 19 21 18.33 21 17.5V6.5C21 5.1 19.4 4.3 18.3 5.1L12 9.8L5.7 5.1C4.6 4.3 3 5.1 3 6.5Z" fill="#EA4335" />
        <path d="M3 6.5V17.5C3 18.33 3.67 19 4.5 19H6.5V10.5L3 7.9V6.5Z" fill="#4285F4" />
        <path d="M21 6.5V17.5C21 18.33 20.33 19 19.5 19H17.5V10.5L21 7.9V6.5Z" fill="#34A853" />
      </svg>
    ),
  },
  {
    id: 'gcal',
    name: 'Google Calendar',
    subtitle: 'Interview Loops',
    href: 'https://calendar.google.com',
    bgClass: 'bg-blue-50/70 border-blue-100',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <rect x="3" y="4" width="18" height="17" rx="3" fill="#4285F4" />
        <rect x="6" y="7" width="12" height="11" rx="1.5" fill="white" />
        <text x="12" y="15.5" textAnchor="middle" fontSize="8.5" fontWeight="bold" fill="#1A73E8">
          31
        </text>
      </svg>
    ),
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    subtitle: 'Jobs & Network',
    href: 'https://www.linkedin.com',
    bgClass: 'bg-sky-50/70 border-sky-100',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <rect x="2.5" y="2.5" width="19" height="19" rx="4" fill="#0A66C2" />
        <path
          d="M8.2 10.2V17.2M8.2 7.2V7.3M11.8 17.2V10.2M11.8 12.6C11.8 11.1 13 10.1 14.3 10.1C15.6 10.1 16.5 11 16.5 12.7V17.2"
          stroke="white"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'x',
    name: 'X',
    subtitle: 'AI & Tech Pulse',
    href: 'https://x.com',
    bgClass: 'bg-zinc-100/80 border-zinc-200',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="#111118" />
        <path
          d="M7.5 7L16.5 17M16.5 7L7.5 17"
          stroke="white"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'doubao',
    name: 'Doubao 豆包',
    subtitle: 'ByteDance AI',
    href: 'https://www.doubao.com',
    bgClass: 'bg-indigo-50/70 border-indigo-100',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <circle cx="12" cy="12" r="9.5" fill="#3B82F6" />
        <circle cx="9.2" cy="11.5" r="1.4" fill="white" />
        <circle cx="14.8" cy="11.5" r="1.4" fill="white" />
        <path
          d="M9.5 15C10.2 15.9 11 16.3 12 16.3C13 16.3 13.8 15.9 14.5 15"
          stroke="white"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    subtitle: 'Reasoning AI',
    href: 'https://chat.deepseek.com',
    bgClass: 'bg-blue-50/70 border-blue-100',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <circle cx="12" cy="12" r="9.5" fill="#4D6BFE" />
        <path
          d="M7 13.5C8.5 9.8 11.8 8.5 15 10C16.2 10.6 17 11.7 17.3 13C15.8 12.6 14.5 13 13.8 14C12.8 15.3 10.2 15.8 7 13.5Z"
          fill="white"
        />
      </svg>
    ),
  },
  {
    id: 'gemini',
    name: 'Gemini',
    subtitle: 'Google AI',
    href: 'https://gemini.google.com',
    bgClass: 'bg-[#F3ECFF] border-[#E5D7FE]',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <defs>
          <linearGradient id="gem-star" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4285F4" />
            <stop offset="50%" stopColor="#6E32F5" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>
        <path
          d="M12 2.5C12.9 7.8 16.2 11.1 21.5 12C16.2 12.9 12.9 16.2 12 21.5C11.1 16.2 7.8 12.9 2.5 12C7.8 11.1 11.1 7.8 12 2.5Z"
          fill="url(#gem-star)"
        />
      </svg>
    ),
  },
];

export function QuickLaunchDock() {
  return (
    <section className="rounded-2xl border border-[#ECECF2] bg-white p-4 shadow-2xs">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#848494]">
          Quick Launchpad · 一键直达常用工具
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
        {QUICK_SITES.map((site) => (
          <a
            key={site.id}
            href={site.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2.5 rounded-xl border border-[#EFEFF5] bg-[#FAFAFC] px-3 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#6E32F5]/40 hover:bg-white hover:shadow-sm"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${site.bgClass}`}
            >
              {site.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 truncate text-xs font-semibold text-[#111118] group-hover:text-[#6E32F5]">
                <span className="truncate">{site.name}</span>
                <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="truncate text-[10px] text-[#848494]">{site.subtitle}</div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
