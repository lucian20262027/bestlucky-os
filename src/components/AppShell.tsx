'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Briefcase,
  ChevronRight,
  Compass,
  Cpu,
  Database,
  FileUp,
  History,
  Home,
  Layers,
  Menu,
  MessageSquare,
  Rocket,
  Search,
  Settings,
  Sparkles,
  Star,
  Target,
  Video,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from './AppProvider';
import { FloatingCopilotWidget } from './FloatingCopilotWidget';
import { SearchModal } from './SearchModal';
import { SettingsModal } from './SettingsModal';
import { ROLE_LIST } from '@/lib/roles';
import { RoleTrack } from '@/lib/types';

const ROLE_ICON_MAP: Record<RoleTrack, typeof Rocket> = {
  fde: Rocket,
  fdpm: Target,
  'ai-pm': Zap,
  pm: Layers,
  operations: Briefcase,
  pgm: Database,
  consulting: Compass,
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state, mounted, syncStatus, setSettingsOpen } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [flyout, setFlyout] = useState<'courses' | 'questions' | 'stories' | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (e.key === 'Escape') {
        setFlyout(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const openFlyout = (kind: 'courses' | 'questions' | 'stories') => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setFlyout(kind);
  };

  const scheduleCloseFlyout = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setFlyout(null);
    }, 180);
  };

  const hasLiveKey = state.aiSettings.geminiApiKey.trim().length > 0;
  const isMockRoomRoute = pathname.startsWith('/practice/') && pathname !== '/practice';

  const completedCount = useMemo(() => {
    if (!mounted) return 0;
    let total = 0;
    ROLE_LIST.forEach((r) => {
      const c = state.courses[r.id];
      c?.modules.forEach((m) =>
        m.subSections.forEach((s) =>
          s.lessons.forEach((l) => {
            if (l.completed) total++;
          })
        )
      );
    });
    return total + state.sessions.length;
  }, [mounted, state.courses, state.sessions.length]);

  const navItemClass = (active: boolean) =>
    `group flex w-full items-center justify-between rounded-xl px-3 py-2 text-[13.5px] transition ${
      active
        ? 'bg-[#F3ECFF] font-semibold text-[#6E32F5]'
        : 'font-medium text-[#474754] hover:bg-[#F6F5FA] hover:text-[#111118]'
    }`;

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white px-3.5 py-4 text-[#111118]">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Aced-style Brand Header */}
        <div className="flex items-center justify-between px-1.5 pb-4">
          <Link href="/" className="flex items-center gap-2.5">
            <svg
              viewBox="0 0 64 64"
              fill="none"
              className="h-9 w-9 shrink-0 rounded-xl shadow-sm"
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
            <div className="flex items-baseline gap-1.5">
              <span className="text-[15px] font-bold tracking-tight text-[#111118]">BestLucky OS</span>
              <span className="rounded-md bg-[#F3ECFF] px-1.5 py-0.5 text-[10px] font-semibold text-[#6E32F5]">
                pro
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1 text-[#848494] hover:bg-black/5 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search Trigger */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="mb-3.5 flex w-full items-center justify-between rounded-xl border border-[#ECECF2] bg-[#FAFAFC] px-3 py-2 text-xs text-[#848494] transition hover:border-[#D4C5FD] hover:bg-white"
        >
          <span className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5" />
            <span>Search</span>
          </span>
          <span className="rounded border border-[#E2E2EC] bg-white px-1.5 py-0.5 font-mono text-[10px] text-[#848494]">
            ⌘K
          </span>
        </button>

        {/* Primary Nav */}
        <nav className="space-y-0.5">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className={navItemClass(pathname === '/')}
          >
            <span className="flex items-center gap-2.5">
              <Home className="h-4 w-4 shrink-0" />
              <span>Dashboard</span>
            </span>
          </Link>

          {/* Courses with Flyout */}
          <div
            onMouseEnter={() => openFlyout('courses')}
            onMouseLeave={scheduleCloseFlyout}
          >
            <Link
              href="/courses"
              onClick={() => {
                setFlyout(null);
                setMobileOpen(false);
              }}
              className={navItemClass(pathname.startsWith('/courses'))}
            >
              <span className="flex items-center gap-2.5">
                <BookOpen className="h-4 w-4 shrink-0" />
                <span>Courses</span>
              </span>
              <ChevronRight className="h-3.5 w-3.5 opacity-55" />
            </Link>
          </div>

          {/* Questions with Flyout */}
          <div
            onMouseEnter={() => openFlyout('questions')}
            onMouseLeave={scheduleCloseFlyout}
          >
            <Link
              href="/questions"
              onClick={() => {
                setFlyout(null);
                setMobileOpen(false);
              }}
              className={navItemClass(pathname.startsWith('/questions'))}
            >
              <span className="flex items-center gap-2.5">
                <Database className="h-4 w-4 shrink-0" />
                <span>Questions</span>
              </span>
              <ChevronRight className="h-3.5 w-3.5 opacity-55" />
            </Link>
          </div>

          <Link
            href="/practice"
            onClick={() => setMobileOpen(false)}
            className={navItemClass(pathname.startsWith('/practice'))}
          >
            <span className="flex items-center gap-2.5">
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span>Practice</span>
            </span>
          </Link>

          <Link
            href="/customizer"
            onClick={() => setMobileOpen(false)}
            className={navItemClass(pathname.startsWith('/customizer'))}
          >
            <span className="flex items-center gap-2.5">
              <Wand2 className="h-4 w-4 shrink-0" />
              <span>JD Study Plan</span>
            </span>
          </Link>

          <Link
            href="/pipeline"
            onClick={() => setMobileOpen(false)}
            className={navItemClass(pathname.startsWith('/pipeline'))}
          >
            <span className="flex items-center gap-2.5">
              <Briefcase className="h-4 w-4 shrink-0" />
              <span>Job Pipeline</span>
            </span>
          </Link>

          {/* Story Bank with Flyout (STAR+L, Content & Videos, Lark Import) */}
          <div
            onMouseEnter={() => openFlyout('stories')}
            onMouseLeave={scheduleCloseFlyout}
          >
            <Link
              href="/stories"
              onClick={() => {
                setFlyout(null);
                setMobileOpen(false);
              }}
              className={navItemClass(
                pathname.startsWith('/stories') ||
                  pathname.startsWith('/library') ||
                  pathname.startsWith('/import')
              )}
            >
              <span className="flex items-center gap-2.5">
                <Layers className="h-4 w-4 shrink-0" />
                <span>Story Bank</span>
              </span>
              <ChevronRight className="h-3.5 w-3.5 opacity-55" />
            </Link>
          </div>

          <Link
            href="/frameworks"
            onClick={() => setMobileOpen(false)}
            className={navItemClass(pathname.startsWith('/frameworks'))}
          >
            <span className="flex items-center gap-2.5">
              <Compass className="h-4 w-4 shrink-0" />
              <span>7-Role Playbook</span>
            </span>
          </Link>

          <Link
            href="/knowledge"
            onClick={() => setMobileOpen(false)}
            className={navItemClass(pathname.startsWith('/knowledge'))}
          >
            <span className="flex items-center gap-2.5">
              <BookMarked className="h-4 w-4 shrink-0" />
              <span>Knowledge Hub</span>
            </span>
          </Link>

          <Link
            href="/history"
            onClick={() => setMobileOpen(false)}
            className={navItemClass(pathname.startsWith('/history'))}
          >
            <span className="flex items-center gap-2.5">
              <History className="h-4 w-4 shrink-0" />
              <span>History</span>
            </span>
          </Link>
        </nav>
      </div>

      {/* Bottom Profile & Settings Bar (Aced-style footer) */}
      <div className="mt-3 space-y-2 border-t border-[#ECECF2] pt-3">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left transition hover:bg-[#F6F5FA]"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3ECFF] text-xs font-bold text-[#6E32F5]">
              {state.profile.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#111118]">
                <span>{state.profile.name}</span>
                <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-800">
                  <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-500" />
                  <span suppressHydrationWarning>{mounted ? completedCount : 0}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-[#848494]">
                {hasLiveKey ? (
                  <>
                    <Sparkles className="h-2.5 w-2.5 text-[#6E32F5]" />
                    Gemini 4 Live
                  </>
                ) : (
                  <>Local Coach</>
                )}
                <span className="text-[#D4D4DF]">·</span>
                <span
                  suppressHydrationWarning
                  className={
                    syncStatus === 'synced'
                      ? 'font-medium text-emerald-600'
                      : syncStatus === 'syncing'
                        ? 'font-medium text-[#6E32F5]'
                        : syncStatus === 'error'
                          ? 'font-medium text-rose-600'
                          : 'text-[#848494]'
                  }
                >
                  {syncStatus === 'synced'
                    ? 'Cloud Synced'
                    : syncStatus === 'syncing'
                      ? 'Syncing...'
                      : syncStatus === 'error'
                        ? 'Sync Error'
                        : 'Local Only'}
                </span>
              </div>
            </div>
          </div>
          <Settings className="h-4 w-4 text-[#848494]" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[var(--canvas)] text-[var(--ink-primary)]">
      {/* Desktop Sidebar + Floating Flyouts */}
      <aside className="relative hidden w-[244px] shrink-0 border-r border-[#ECECF2] bg-white lg:block">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>

        {/* Aced-style Floating Flyout Panel for Courses / Questions / Story Bank */}
        {flyout && (
          <div
            onMouseEnter={() => openFlyout(flyout)}
            onMouseLeave={scheduleCloseFlyout}
            className="fixed left-[244px] top-3 z-40 w-[290px] rounded-2xl border border-[#ECECF2] bg-white p-3 shadow-xl"
          >
            {flyout === 'stories' ? (
              <>
                <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#848494]">
                  STORY BANK &amp; KNOWLEDGE HUB
                </div>
                <div className="mt-1 space-y-0.5">
                  <Link
                    href="/stories"
                    onClick={() => setFlyout(null)}
                    className="flex items-center justify-between rounded-xl px-2.5 py-2.5 text-[13px] font-medium text-[#2E2E3A] transition hover:bg-[#F3ECFF] hover:text-[#6E32F5]"
                  >
                    <span className="flex items-center gap-2.5">
                      <Layers className="h-4 w-4 text-[#6E32F5]" />
                      <span>STAR+L Stories</span>
                    </span>
                    <span className="text-[10px] text-[#848494]">故事库</span>
                  </Link>
                  <Link
                    href="/stories?tab=videos"
                    onClick={() => setFlyout(null)}
                    className="flex items-center justify-between rounded-xl px-2.5 py-2.5 text-[13px] font-medium text-[#2E2E3A] transition hover:bg-[#F3ECFF] hover:text-[#6E32F5]"
                  >
                    <span className="flex items-center gap-2.5">
                      <Video className="h-4 w-4 text-[#6E32F5]" />
                      <span>Content &amp; Videos</span>
                    </span>
                    <span className="text-[10px] text-[#848494]">视频与资料</span>
                  </Link>
                  <Link
                    href="/stories?tab=import"
                    onClick={() => setFlyout(null)}
                    className="flex items-center justify-between rounded-xl px-2.5 py-2.5 text-[13px] font-medium text-[#2E2E3A] transition hover:bg-[#F3ECFF] hover:text-[#6E32F5]"
                  >
                    <span className="flex items-center gap-2.5">
                      <FileUp className="h-4 w-4 text-[#6E32F5]" />
                      <span>Lark Import</span>
                    </span>
                    <span className="rounded-full bg-[#F3ECFF] px-2 py-0.5 text-[10px] font-semibold text-[#6E32F5]">
                      飞书同步
                    </span>
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#848494]">
                  {flyout === 'courses' ? 'INTERVIEW COURSES' : 'TOP QUESTIONS BY ROLE'}
                </div>
                <div className="mt-1 space-y-0.5">
                  {ROLE_LIST.map((r) => {
                    const Icon = ROLE_ICON_MAP[r.id] ?? Compass;
                    const href =
                      flyout === 'courses' ? `/courses/${r.id}` : `/questions?role=${r.id}`;
                    return (
                      <Link
                        key={r.id}
                        href={href}
                        onClick={() => setFlyout(null)}
                        className="flex items-center justify-between rounded-xl px-2.5 py-2 text-[13px] font-medium text-[#2E2E3A] transition hover:bg-[#F3ECFF] hover:text-[#6E32F5]"
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className="h-4 w-4 text-[#848494]" />
                          <span>{r.label}</span>
                        </span>
                        {(r.id === 'fde' || r.id === 'fdpm' || r.id === 'ai-pm') && (
                          <span className="rounded-full bg-[#F3ECFF] px-2 py-0.5 text-[10px] font-semibold text-[#6E32F5]">
                            2026
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
                <div className="mt-2 border-t border-[#ECECF2] pt-2">
                  <Link
                    href={flyout === 'courses' ? '/courses' : '/questions'}
                    onClick={() => setFlyout(null)}
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-[#111118] hover:bg-[#FAFAFC]"
                  >
                    <span>
                      {flyout === 'courses' ? 'View all courses' : 'Browse all questions'}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 w-[264px] border-r border-[#ECECF2] bg-white shadow-xl">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Header */}
        <header className="flex items-center justify-between border-b border-[#ECECF2] bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#ECECF2] px-2.5 py-1.5 text-xs font-medium text-[#111118]"
          >
            <Menu className="h-4 w-4" />
            BestLucky OS
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#ECECF2] px-2.5 py-1.5 text-xs font-medium text-[#525260]"
          >
            <Settings className="h-3.5 w-3.5" />
            {hasLiveKey ? 'Gemini 4' : 'Local'}
          </button>
        </header>

        <main
          className={`flex-1 ${
            isMockRoomRoute ? 'p-0' : 'mx-auto w-full max-w-[1260px] px-4 py-7 sm:px-9 sm:py-8'
          }`}
        >
          {children}
        </main>
      </div>

      <SettingsModal />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <FloatingCopilotWidget />
    </div>
  );
}
