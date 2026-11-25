'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandChimeLogo } from '@/components/BrandChimeLogo';
import { HeroMantraModal } from '@/components/HeroMantraModal';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
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
  RefreshCw,
  Rocket,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Target,
  Trash2,
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
  const { state, mounted, syncStatus, lastSyncError, retryCloudSync, updateCourseNav, setSettingsOpen } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [heroMantraOpen, setHeroMantraOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [flyout, setFlyout] = useState<'courses' | 'questions' | 'stories' | null>(null);
  const [coursesEditMode, setCoursesEditMode] = useState(false);
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
          <BrandChimeLogo />
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

        {/* Primary Nav (Streamlined 7-item grouped IA) */}
        <nav className="space-y-4">
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

          {/* Group 1: CURRICULUM & STORIES */}
          <div className="space-y-0.5">
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#9A9AA8]">
              Curriculum &amp; Stories
            </div>
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

            {/* Questions & Stories Unified Entry with Flyout */}
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
                className={navItemClass(
                  pathname.startsWith('/questions') ||
                    pathname.startsWith('/stories') ||
                    pathname.startsWith('/library') ||
                    pathname.startsWith('/import')
                )}
              >
                <span className="flex items-center gap-2.5">
                  <Database className="h-4 w-4 shrink-0" />
                  <span>Questions &amp; Stories</span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 opacity-55" />
              </Link>
            </div>
          </div>

          {/* Group 2: PRACTICE & PIPELINE */}
          <div className="space-y-0.5">
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#9A9AA8]">
              Practice &amp; Pipeline
            </div>
            <Link
              href="/practice"
              onClick={() => setMobileOpen(false)}
              className={navItemClass(
                pathname.startsWith('/practice') || pathname.startsWith('/history')
              )}
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
          </div>

          {/* Group 3: KNOWLEDGE */}
          <div className="space-y-0.5">
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#9A9AA8]">
              Knowledge
            </div>
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
              href="/pages"
              onClick={() => setMobileOpen(false)}
              className={navItemClass(pathname.startsWith('/pages'))}
            >
              <span className="flex items-center gap-2.5">
                <Layers className="h-4 w-4 shrink-0" />
                <span>HTML Pages</span>
              </span>
              {mounted && (state.deployedHtmlPages?.length ?? 0) > 0 && (
                <span className="rounded-full bg-[#F3ECFF] px-1.5 py-0.5 text-[10px] font-semibold text-[#6E32F5]">
                  {state.deployedHtmlPages?.length}
                </span>
              )}
            </Link>
          </div>
        </nav>
      </div>

      {/* Bottom Profile & Settings Bar */}
      <div className="mt-3 border-t border-[#ECECF2] pt-3">
        <div className="flex items-center justify-between gap-1 rounded-xl px-1 py-1">
          <button
            type="button"
            onClick={() => setHeroMantraOpen(true)}
            data-testid="sidebar-hero-trigger"
            title="点击查看每日自我宣言"
            className="flex flex-1 items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left transition hover:bg-[#F3ECFF]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3ECFF] text-xs font-bold text-[#6E32F5]">
              {state.profile.name.slice(0, 2).toUpperCase()}
            </div>
            <span className="truncate text-xs font-semibold text-[#111118]">
              {state.profile.name}
            </span>
          </button>
          <div className="flex items-center gap-1 pr-1">
            <button
              type="button"
              onClick={retryCloudSync}
              suppressHydrationWarning
              data-testid="sidebar-sync-button"
              title={
                syncStatus === 'synced'
                  ? 'Cloud Synced (点击立即同步)'
                  : syncStatus === 'error'
                    ? `Sync Attention Needed${lastSyncError ? ` (${lastSyncError})` : ''} · 点击重试同步`
                    : 'Not Synced / Local Only · 点击同步'
              }
              className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-[#F6F5FA] ${
                syncStatus === 'synced'
                  ? 'text-emerald-600'
                  : syncStatus === 'error'
                    ? 'text-rose-600'
                    : syncStatus === 'syncing'
                      ? 'animate-spin text-amber-500'
                      : 'text-amber-500'
              }`}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              data-testid="sidebar-settings-trigger"
              title="Workspace & AI Engine Settings"
              aria-label="Open Workspace Settings"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#848494] transition hover:bg-[#F6F5FA] hover:text-[#111118]"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
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
                <div className="flex items-center justify-between px-2.5 py-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#848494]">
                    {flyout === 'courses' ? 'INTERVIEW COURSES' : 'TOP QUESTIONS BY ROLE'}
                  </span>
                  {flyout === 'courses' && (
                    <button
                      type="button"
                      onClick={() => setCoursesEditMode((v) => !v)}
                      data-testid="courses-flyout-edit-toggle"
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition ${
                        coursesEditMode
                          ? 'bg-[#6E32F5] text-white'
                          : 'bg-[#F3ECFF] text-[#6E32F5] hover:bg-[#E7DAFF]'
                      }`}
                    >
                      {coursesEditMode ? '完成' : '排序/删减'}
                    </button>
                  )}
                </div>
                <div className="mt-1 space-y-0.5">
                  {(() => {
                    const defaultEntries = [
                      ...ROLE_LIST.map((r) => ({
                        id: r.id,
                        defaultLabel: r.label,
                        Icon: ROLE_ICON_MAP[r.id] ?? Compass,
                      })),
                      {
                        id: 'self-intro',
                        defaultLabel: 'Self Intro & Company Culture Fit',
                        Icon: Sparkles,
                      },
                    ];

                    if (flyout !== 'courses') {
                      return ROLE_LIST.map((r) => {
                        const Icon = ROLE_ICON_MAP[r.id] ?? Compass;
                        return (
                          <Link
                            key={r.id}
                            href={`/questions?role=${r.id}`}
                            onClick={() => setFlyout(null)}
                            className="flex items-center justify-between rounded-xl px-2.5 py-2 text-[13px] font-medium text-[#2E2E3A] transition hover:bg-[#F3ECFF] hover:text-[#6E32F5]"
                          >
                            <span className="flex items-center gap-2.5">
                              <Icon className="h-4 w-4 text-[#848494]" />
                              <span>{r.label}</span>
                            </span>
                          </Link>
                        );
                      });
                    }

                    const savedOrder = state.courseNavOrder ?? [];
                    const hiddenSet = new Set(state.hiddenCourseTracks ?? []);
                    const orderedEntries = [...defaultEntries].sort((a, b) => {
                      const ia = savedOrder.indexOf(a.id);
                      const ib = savedOrder.indexOf(b.id);
                      if (ia === -1 && ib === -1) return 0;
                      if (ia === -1) return 1;
                      if (ib === -1) return -1;
                      return ia - ib;
                    });
                    const visibleEntries = orderedEntries.filter((e) => !hiddenSet.has(e.id));

                    const moveCourse = (idx: number, dir: -1 | 1) => {
                      const nextIds = visibleEntries.map((e) => e.id);
                      const targetIdx = idx + dir;
                      if (targetIdx < 0 || targetIdx >= nextIds.length) return;
                      [nextIds[idx], nextIds[targetIdx]] = [nextIds[targetIdx], nextIds[idx]];
                      const hiddenIds = orderedEntries
                        .filter((e) => hiddenSet.has(e.id))
                        .map((e) => e.id);
                      updateCourseNav([...nextIds, ...hiddenIds], Array.from(hiddenSet));
                    };

                    const hideCourse = (id: string) => {
                      const nextHidden = Array.from(new Set([...hiddenSet, id]));
                      const nextOrder = orderedEntries.map((e) => e.id);
                      updateCourseNav(nextOrder, nextHidden);
                    };

                    return (
                      <>
                        {visibleEntries.map((entry, idx) => {
                          const Icon = entry.Icon;
                          const courseObj = state.courses[entry.id as keyof typeof state.courses];
                          const liveTitle =
                            courseObj?.heroTitle?.replace(/\s*Interview Prep$/i, '').trim() ||
                            entry.defaultLabel;
                          return (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between gap-1 rounded-xl px-2.5 py-1.5 transition hover:bg-[#F3ECFF]"
                            >
                              <Link
                                href={`/courses/${entry.id}`}
                                onClick={() => setFlyout(null)}
                                className="flex min-w-0 flex-1 items-center gap-2.5 py-0.5 text-[13px] font-medium text-[#2E2E3A] hover:text-[#6E32F5]"
                              >
                                <Icon className="h-4 w-4 shrink-0 text-[#848494]" />
                                <span className="truncate">{liveTitle}</span>
                              </Link>
                              {coursesEditMode && (
                                <div className="flex shrink-0 items-center gap-0.5">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => moveCourse(idx, -1)}
                                    className="rounded p-1 text-[#848494] hover:bg-white hover:text-[#6E32F5] disabled:opacity-30"
                                    title="上移"
                                  >
                                    <ArrowUp className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === visibleEntries.length - 1}
                                    onClick={() => moveCourse(idx, 1)}
                                    className="rounded p-1 text-[#848494] hover:bg-white hover:text-[#6E32F5] disabled:opacity-30"
                                    title="下移"
                                  >
                                    <ArrowDown className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => hideCourse(entry.id)}
                                    className="rounded p-1 text-[#848494] hover:bg-white hover:text-rose-600"
                                    title="隐藏/移除课程"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {coursesEditMode && hiddenSet.size > 0 && (
                          <button
                            type="button"
                            onClick={() => updateCourseNav(orderedEntries.map((e) => e.id), [])}
                            className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[#D4C5FD] py-1 text-[11px] font-semibold text-[#6E32F5] hover:bg-[#F3ECFF]"
                          >
                            <RotateCcw className="h-3 w-3" />
                            恢复已隐藏课程 ({hiddenSet.size})
                          </button>
                        )}
                      </>
                    );
                  })()}
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

      <HeroMantraModal open={heroMantraOpen} onClose={() => setHeroMantraOpen(false)} />
      <SettingsModal />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <FloatingCopilotWidget />
    </div>
  );
}
