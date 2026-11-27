'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Calendar,
  Mic,
  RefreshCw,
  Shield,
  Zap,
} from 'lucide-react';
import { AffirmationVideoStrip } from '@/components/AffirmationVideoStrip';
import { useApp } from '@/components/AppProvider';
import { QuickLaunchDock } from '@/components/QuickLaunchDock';
import { TodoWorkspacePanel } from '@/components/TodoWorkspacePanel';
import { getDailyQuote } from '@/lib/daily-quotes';
import { daysUntil, getAllQuestions, getQuestionStatus } from '@/lib/helpers';
import { ROLES_BY_ID } from '@/lib/roles';
import { CourseTrackId, PipelineStage } from '@/lib/types';

const STAGE_LABEL: Record<PipelineStage, string> = {
  wishlist: 'Wishlist',
  applied: 'Applied',
  screen: 'Recruiter Screen',
  technical: 'Technical / Case',
  onsite: 'Onsite Loop',
  offer: 'Offer',
};

const STAGE_RANK: Record<PipelineStage, number> = {
  offer: 5,
  onsite: 4,
  technical: 3,
  screen: 2,
  applied: 1,
  wishlist: 0,
};

export default function DashboardPage() {
  const {
    state,
    mounted,
    todayISO,
    addTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    updateAffirmationVideos,
  } = useApp();

  const [quoteOffset, setQuoteOffset] = useState(0);

  const greetingText = useMemo(() => {
    const displayName =
      state.profile.name && state.profile.name !== 'Yi' ? state.profile.name : 'Lucian';
    if (!mounted) return `Welcome back, ${displayName}`;
    const hr = new Date().getHours();
    if (hr < 12) return `Good morning, ${displayName}`;
    if (hr < 18) return `Good afternoon, ${displayName}`;
    return `Good evening, ${displayName}`;
  }, [mounted, state.profile.name]);

  const dailyQuote = useMemo(
    () => getDailyQuote(todayISO, quoteOffset),
    [todayISO, quoteOffset]
  );

  // Command Center Metrics
  const nextLoopApp = useMemo(() => {
    const withDates = state.applications
      .filter((a) => Boolean(a.nextInterviewDate))
      .map((a) => ({
        app: a,
        days: daysUntil(a.nextInterviewDate!, todayISO),
      }))
      .sort((a, b) => {
        const da = a.days ?? 9999;
        const db = b.days ?? 9999;
        if (da >= 0 && db < 0) return -1;
        if (db >= 0 && da < 0) return 1;
        return da - db;
      });

    if (withDates.length > 0) return withDates[0];

    const fallback = [...state.applications].sort(
      (a, b) => STAGE_RANK[b.stage] - STAGE_RANK[a.stage]
    )[0];
    return fallback ? { app: fallback, days: null } : null;
  }, [state.applications, todayISO]);

  const activeLoops = useMemo(
    () =>
      state.applications
        .filter((a) => a.stage === 'screen' || a.stage === 'technical' || a.stage === 'onsite')
        .sort((a, b) => STAGE_RANK[b.stage] - STAGE_RANK[a.stage]),
    [state.applications]
  );

  const practiceStats = useMemo(() => {
    const allQ = getAllQuestions(state);
    const drilled = allQ.filter((q) => {
      const st = getQuestionStatus(state, q.id);
      return st === 'mastered' || st === 'needs_drill';
    }).length;
    return {
      sessions: state.sessions.length,
      drilled,
      totalQuestions: allQ.length,
    };
  }, [state]);

  const curriculumStats = useMemo(() => {
    const hiddenSet = new Set(state.hiddenCourseTracks ?? []);
    let total = 0;
    let done = 0;
    (Object.keys(state.courses) as CourseTrackId[]).forEach((trackId) => {
      if (hiddenSet.has(trackId)) return;
      state.courses[trackId]?.modules.forEach((m) =>
        m.subSections.forEach((s) =>
          s.lessons.forEach((l) => {
            total += 1;
            if (l.completed) done += 1;
          })
        )
      );
    });
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, pct };
  }, [state.courses, state.hiddenCourseTracks]);

  const topTargetApps = useMemo(() => {
    return [...state.applications]
      .sort((a, b) => STAGE_RANK[b.stage] - STAGE_RANK[a.stage])
      .slice(0, 3);
  }, [state.applications]);

  return (
    <div className="space-y-6">
      {/* Row 1: Executive Greeting + Single High-Contrast Primary CTA */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#111118] sm:text-3xl" suppressHydrationWarning>
            {greetingText}
          </h1>
          <div className="mt-1.5 flex items-center gap-2 text-xs sm:text-sm text-[#5E5E6E]">
            <p className="truncate italic" suppressHydrationWarning>
              &ldquo;{dailyQuote.text}&rdquo; —{' '}
              <span className="font-medium not-italic text-[#6E32F5]">{dailyQuote.author}</span>
            </p>
            <button
              type="button"
              onClick={() => setQuoteOffset((v) => v + 1)}
              className="shrink-0 rounded-md p-1 text-[#848494] transition hover:bg-[#F5F3FF] hover:text-[#6E32F5]"
              title="Next daily quote"
              aria-label="Next daily quote"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <Link
          href="/practice"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#111118] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#6E32F5]"
        >
          <Mic className="h-3.5 w-3.5" />
          <span>Start 15m Voice Drill</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Row 2: 4-Card Interview Readiness & Countdown KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Next Interview Spotlight */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#D4C5FD] bg-gradient-to-br from-[#F9F7FF] via-white to-white p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#6E32F5]">
              <Calendar className="h-3.5 w-3.5" />
              Next Interview
            </span>
            {nextLoopApp?.days !== null && nextLoopApp?.days !== undefined && (
              <span className="rounded-full bg-[#6E32F5] px-2 py-0.5 font-mono text-[10px] font-semibold text-white">
                {nextLoopApp.days === 0
                  ? 'Today'
                  : nextLoopApp.days > 0
                    ? `In ${nextLoopApp.days}d`
                    : `${Math.abs(nextLoopApp.days)}d ago`}
              </span>
            )}
          </div>
          {nextLoopApp ? (
            <div className="mt-2.5">
              <div className="truncate text-base font-semibold text-[#111118]">
                {nextLoopApp.app.company}
              </div>
              <div className="truncate text-xs text-[#5E5E6E]">
                {nextLoopApp.app.roleTitle} · {STAGE_LABEL[nextLoopApp.app.stage]}
              </div>
              <Link
                href={`/pipeline?warroom=${nextLoopApp.app.id}`}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#6E32F5] hover:underline"
              >
                <Shield className="h-3.5 w-3.5" />
                Open War Room
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <div className="mt-2 text-xs text-[#6B7280]">
              Add an application in Job Pipeline to track interview countdowns.
            </div>
          )}
        </div>

        {/* Card 2: Active Pipeline */}
        <Link
          href="/pipeline"
          className="group flex flex-col justify-between rounded-2xl border border-[#ECECF2] bg-white p-4 shadow-2xs transition hover:border-[#D4C5FD]"
        >
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#848494]">
            <span className="inline-flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-[#6E32F5]" />
              Active Loops
            </span>
            <ArrowRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100 group-hover:text-[#6E32F5]" />
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-[#111118]">
                {mounted ? activeLoops.length : 0}
              </span>
              <span className="text-xs text-[#6B7280]">
                of {mounted ? state.applications.length : 0} tracked
              </span>
            </div>
            <div className="mt-1 truncate text-xs text-[#5E5E6E]">
              {activeLoops.length > 0
                ? activeLoops.map((a) => a.company).slice(0, 3).join(' · ')
                : 'Pipeline ready'}
            </div>
          </div>
        </Link>

        {/* Card 3: Practice Momentum */}
        <Link
          href="/practice"
          className="group flex flex-col justify-between rounded-2xl border border-[#ECECF2] bg-white p-4 shadow-2xs transition hover:border-[#D4C5FD]"
        >
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#848494]">
            <span className="inline-flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-[#6E32F5]" />
              Practice Momentum
            </span>
            <ArrowRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100 group-hover:text-[#6E32F5]" />
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-[#111118]">
                {mounted ? practiceStats.sessions : 0}
              </span>
              <span className="text-xs text-[#6B7280]">mock sessions</span>
            </div>
            <div className="mt-1 text-xs text-[#5E5E6E]">
              {mounted ? practiceStats.drilled : 0} / {practiceStats.totalQuestions} questions drilled
            </div>
          </div>
        </Link>

        {/* Card 4: Curriculum Progress */}
        <Link
          href="/courses"
          className="group flex flex-col justify-between rounded-2xl border border-[#ECECF2] bg-white p-4 shadow-2xs transition hover:border-[#D4C5FD]"
        >
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#848494]">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-[#6E32F5]" />
              Curriculum
            </span>
            <ArrowRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100 group-hover:text-[#6E32F5]" />
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-[#111118]">
                {mounted ? curriculumStats.pct : 0}%
              </span>
              <span className="text-xs text-[#6B7280]">
                {mounted ? `${curriculumStats.done}/${curriculumStats.total}` : '0/0'} lessons
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#EFEFF5]">
              <div
                className="h-full rounded-full bg-[#6E32F5] transition-all"
                style={{ width: `${Math.max(4, mounted ? curriculumStats.pct : 0)}%` }}
              />
            </div>
          </div>
        </Link>
      </div>

      {/* Row 3: 12-Column Split Command Workspace */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left 7 Columns: Prep Action Queue + Quick Launchpad */}
        <div className="space-y-6 xl:col-span-7">
          <TodoWorkspacePanel
            mounted={mounted}
            todayISO={todayISO}
            todos={state.todos}
            onAddTodo={addTodo}
            onUpdateTodo={updateTodo}
            onToggleTodo={toggleTodo}
            onDeleteTodo={deleteTodo}
          />
          <QuickLaunchDock />
        </div>

        {/* Right 5 Columns: Compact Mindset Stage + Active Target Loops */}
        <div className="space-y-6 xl:col-span-5">
          <AffirmationVideoStrip
            compact
            videos={state.affirmationVideos}
            onSaveVideos={updateAffirmationVideos}
          />

          {/* Active Target Loops Snapshot */}
          <section className="rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#F2F2F7] pb-3">
              <div>
                <h2 className="text-sm font-semibold text-[#111118]">Active Target Loops</h2>
                <p className="text-[11px] text-[#848494]">
                  Jump straight into a company War Room or tailored drill
                </p>
              </div>
              <Link
                href="/pipeline"
                className="text-xs font-semibold text-[#6E32F5] hover:underline"
              >
                All loops →
              </Link>
            </div>

            <div className="mt-3 space-y-2.5">
              {topTargetApps.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#ECECF2] p-5 text-center text-xs text-[#848494]">
                  No applications tracked yet.
                </div>
              ) : (
                topTargetApps.map((app) => {
                  const d = app.nextInterviewDate
                    ? daysUntil(app.nextInterviewDate, todayISO)
                    : null;
                  const roleCfg = ROLES_BY_ID[app.roleTrack];
                  return (
                    <div
                      key={app.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#F0F0F5] bg-[#FAFAFC] p-3 transition hover:border-[#D4C5FD] hover:bg-white"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-[#111118]">
                            {app.company}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#ECECF2] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#525260]">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: roleCfg?.accentHex ?? '#6E32F5' }}
                            />
                            {roleCfg?.shortLabel ?? app.roleTrack}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#6B7280]">
                          <span className="truncate">{app.roleTitle}</span>
                          {d !== null && (
                            <span className="shrink-0 font-mono text-[#6E32F5]">
                              · {d === 0 ? 'Today' : d > 0 ? `In ${d}d` : `${Math.abs(d)}d ago`}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <Link
                          href={`/practice?topic=${encodeURIComponent(
                            `${app.company} ${app.roleTitle} — Why this company & 30-60-90 impact?`
                          )}`}
                          className="rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1 text-[11px] font-medium text-[#111118] transition hover:border-[#6E32F5] hover:text-[#6E32F5]"
                        >
                          Drill
                        </Link>
                        <Link
                          href={`/pipeline?warroom=${app.id}`}
                          className="rounded-lg bg-[#111118] px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-[#6E32F5]"
                        >
                          War Room
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
