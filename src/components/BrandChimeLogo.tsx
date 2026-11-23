'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type ChimePhase =
  | 'idle'
  | 'nudge'
  | 'time-in'
  | 'break-icons'
  | 'time-bounce'
  | 'flipping-back';

function formatHHMM(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function SteamingCoffeeIcon() {
  return (
    <span className="inline-flex items-center gap-0.5 animate-bl-pop-spring" title="喝口热咖啡">
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
        {/* Animated rising steam */}
        <path
          d="M8.5 6.5C8.5 5 9.8 4.5 9.8 3"
          stroke="#F59E0B"
          strokeWidth="1.7"
          strokeLinecap="round"
          className="animate-bl-steam"
        />
        <path
          d="M12.5 6C12.5 4.4 13.8 3.9 13.8 2.2"
          stroke="#6E32F5"
          strokeWidth="1.7"
          strokeLinecap="round"
          className="animate-bl-steam"
          style={{ animationDelay: '220ms' }}
        />
        {/* Cup body */}
        <path
          d="M5 9.5H16V14.5C16 17.2614 13.7614 19.5 11 19.5H10C7.23858 19.5 5 17.2614 5 14.5V9.5Z"
          fill="#6E32F5"
        />
        {/* Coffee crema top */}
        <ellipse cx="10.5" cy="9.5" rx="5.5" ry="1.3" fill="#FDE68A" />
        {/* Cup handle */}
        <path
          d="M16 11H17.5C18.8807 11 20 12.1193 20 13.5C20 14.8807 18.8807 16 17.5 16H16"
          stroke="#6E32F5"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* Saucer */}
        <path d="M4 21H17" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function StretchingPersonIcon() {
  return (
    <span
      className="inline-flex items-center animate-bl-pop-spring"
      style={{ animationDelay: '140ms' }}
      title="伸个懒腰放松一下"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-5 w-5 animate-bl-stretch"
        aria-hidden="true"
      >
        {/* Head */}
        <circle cx="12" cy="6.5" r="2.3" fill="#F59E0B" />
        {/* Raised stretching arms */}
        <path
          d="M6.5 4.2C8.2 7.5 10.2 9.4 12 9.4C13.8 9.4 15.8 7.5 17.5 4.2"
          stroke="#6E32F5"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Torso */}
        <path
          d="M12 9.4V15.5"
          stroke="#6E32F5"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Legs */}
        <path
          d="M12 15.5L9.2 20.5M12 15.5L14.8 20.5"
          stroke="#6E32F5"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function BrandChimeLogo() {
  const [phase, setPhase] = useState<ChimePhase>('idle');
  const [timeText, setTimeText] = useState<string>('');
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
      setTimeText(formatHHMM(now));
      setPhase('nudge');

      const t1 = window.setTimeout(() => setPhase('time-in'), 380);
      const t2 = window.setTimeout(() => setPhase('break-icons'), 1550);
      const t3 = window.setTimeout(() => setPhase('time-bounce'), 3550);
      const t4 = window.setTimeout(() => setPhase('flipping-back'), 4550);
      const t5 = window.setTimeout(() => setPhase('idle'), 4880);
      timersRef.current = [t1, t2, t3, t4, t5];
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

  const isPillVisible =
    phase === 'time-in' ||
    phase === 'break-icons' ||
    phase === 'time-bounce' ||
    phase === 'flipping-back';

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

      {isPillVisible ? (
        <div
          className={`flex min-w-[78px] items-center justify-center rounded-xl border border-[#D4C5FD] bg-gradient-to-r from-[#F5F0FF] to-[#FFFBEB] px-3 py-1 shadow-xs ${
            phase === 'flipping-back' ? 'animate-bl-flip-out' : 'animate-bl-flip-in'
          }`}
          data-testid="brand-chime-clock"
        >
          {phase === 'break-icons' ? (
            <div className="flex items-center gap-2" data-testid="brand-chime-icons">
              <SteamingCoffeeIcon />
              <StretchingPersonIcon />
            </div>
          ) : (
            <span
              className={`font-mono text-[15px] font-bold tracking-tight tabular-nums text-[#111118] ${
                phase === 'time-bounce' ? 'animate-bl-single-bounce' : ''
              }`}
              data-testid="brand-chime-time"
            >
              {timeText}
            </span>
          )}
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
