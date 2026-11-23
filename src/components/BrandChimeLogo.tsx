'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type ChimePhase = 'idle' | 'nudge' | 'showing-time' | 'flipping-back';

function formatHHMM(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function BrandChimeLogo() {
  const [phase, setPhase] = useState<ChimePhase>('idle');
  const [timeText, setTimeText] = useState<string>('');
  const [chimeTag, setChimeTag] = useState<string>('整点');
  const lastChimeKeyRef = useRef<string>('');
  const hasChimedOnceRef = useRef<boolean>(false);
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const triggerChime = useCallback(
    (now = new Date()) => {
      clearTimers();
      hasChimedOnceRef.current = true;
      const mins = now.getMinutes();
      setTimeText(formatHHMM(now));
      setChimeTag(mins === 0 ? '整点' : mins === 30 ? '半点' : 'TIME');
      setPhase('nudge');

      const t1 = window.setTimeout(() => setPhase('showing-time'), 420);
      const t2 = window.setTimeout(() => setPhase('flipping-back'), 3450);
      const t3 = window.setTimeout(() => setPhase('idle'), 3780);
      timersRef.current = [t1, t2, t3];
    },
    [clearTimers]
  );

  useEffect(() => {
    const checkClock = () => {
      const now = new Date();
      const mins = now.getMinutes();
      const secs = now.getSeconds();
      if ((mins === 0 || mins === 30) && secs <= 2) {
        const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}:${mins}`;
        if (lastChimeKeyRef.current !== key) {
          lastChimeKeyRef.current = key;
          triggerChime(now);
        }
      }
    };

    const intervalId = window.setInterval(checkClock, 1000);
    return () => {
      window.clearInterval(intervalId);
      clearTimers();
    };
  }, [clearTimers, triggerChime]);

  const isTimeVisible = phase === 'showing-time' || phase === 'flipping-back';

  return (
    <Link
      href="/"
      className={`group flex items-center gap-2.5 ${
        phase === 'nudge' ? 'animate-bl-nudge' : ''
      }`}
      title="BestLucky OS · 每逢 :00 / :30 自动报时（点击 pro 标签可试播）"
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        className={`h-9 w-9 shrink-0 rounded-xl shadow-sm transition-shadow duration-300 ${
          phase !== 'idle' ? 'ring-2 ring-[#6E32F5]/35 shadow-md' : ''
        }`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="bl-nav-royal-gold" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2E1065" />
            <stop offset="52%" stopColor="#6E32F5" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <linearGradient id="bl-nav-gold-rim" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.75" />
            <stop offset="50%" stopColor="#DDD6FE" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FBBF24" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="bl-nav-star-gold" x1="42" y1="9" x2="54" y2="23" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FEF3C7" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#bl-nav-royal-gold)" />
        <rect x="3" y="3" width="58" height="58" rx="15" stroke="url(#bl-nav-gold-rim)" strokeWidth="1.6" />
        <path
          d="M48 9.5C48.7 13.7 51.3 16.3 55.5 17C51.3 17.7 48.7 20.3 48 24.5C47.3 20.3 44.7 17.7 40.5 17C44.7 16.3 47.3 13.7 48 9.5Z"
          fill="url(#bl-nav-star-gold)"
        />
        <text
          x="31"
          y="42.5"
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif"
          fontSize="21"
          fontWeight="800"
          letterSpacing="-0.8"
        >
          Best
        </text>
        <rect x="14" y="48" width="36" height="2.4" rx="1.2" fill="url(#bl-nav-star-gold)" opacity="0.92" />
      </svg>

      {isTimeVisible ? (
        <div
          className={`flex items-center gap-1.5 rounded-xl border border-[#D4C5FD] bg-gradient-to-r from-[#F5F0FF] to-[#FFFBEB] px-2.5 py-1 shadow-xs ${
            phase === 'showing-time'
              ? 'animate-bl-flip-in'
              : 'animate-bl-flip-out'
          }`}
          data-testid="brand-chime-clock"
        >
          <div
            className={`flex items-center gap-1.5 ${
              phase === 'showing-time' ? 'animate-bl-double-bounce' : ''
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-gradient-to-tr from-[#6E32F5] to-[#F59E0B] shadow-2xs" />
            <span className="font-mono text-[14px] font-bold tracking-tight tabular-nums text-[#111118]">
              {timeText}
            </span>
            <span className="rounded bg-[#6E32F5]/12 px-1 py-0.5 text-[9px] font-bold text-[#6E32F5]">
              {chimeTag}
            </span>
          </div>
        </div>
      ) : (
        <div
          className={`flex items-baseline gap-1.5 ${
            phase === 'idle' && hasChimedOnceRef.current ? 'animate-bl-flip-in' : ''
          }`}
        >
          <span className="text-[15px] font-bold tracking-tight text-[#111118]">
            BestLucky OS
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              triggerChime(new Date());
            }}
            className="rounded-md bg-[#F3ECFF] px-1.5 py-0.5 text-[10px] font-semibold text-[#6E32F5] transition hover:bg-[#6E32F5] hover:text-white"
            title="点击试播半点/整点报时动效"
          >
            pro
          </button>
        </div>
      )}
    </Link>
  );
}
