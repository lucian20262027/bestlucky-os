'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BookMarked,
  FileUp,
  MessageSquare,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { AffirmationVideoStrip } from '@/components/AffirmationVideoStrip';
import { useApp } from '@/components/AppProvider';
import { QuestionModal } from '@/components/QuestionModal';
import { RareFolderCard } from '@/components/RareFolderCard';
import {
  type CalendarEventItem,
  ScheduleCalendarPanel,
} from '@/components/ScheduleCalendarPanel';
import { TodoWorkspacePanel } from '@/components/TodoWorkspacePanel';
import { getDailyQuote } from '@/lib/daily-quotes';
import { getAllQuestions } from '@/lib/helpers';

export default function DashboardPage() {
  const {
    state,
    mounted,
    todayISO,
    addUpcomingLoop,
    removeUpcomingLoop,
    addCustomQuestion,
    updateQuestionNotes,
    addTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    updateAffirmationVideos,
    updateGoogleCalendarUrl,
  } = useApp();

  const [quoteOffset, setQuoteOffset] = useState(0);
  const [addQuestionOpen, setAddQuestionOpen] = useState(false);

  // Google Calendar ICS sync state
  const [gcalEvents, setGcalEvents] = useState<CalendarEventItem[]>([]);
  const [gcalLoading, setGcalLoading] = useState(false);
  const [gcalError, setGcalError] = useState<string | null>(null);

  const fetchGcalEvents = useCallback(async (icsUrl: string) => {
    if (!icsUrl.trim()) return;
    setGcalLoading(true);
    setGcalError(null);
    try {
      const res = await fetch('/api/calendar/ics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icsUrl: icsUrl.trim() }),
      });
      const json = (await res.json()) as {
        events?: CalendarEventItem[];
        error?: string;
      };
      if (!res.ok) {
        setGcalError(json.error ?? '日历拉取失败');
      } else {
        setGcalEvents(json.events ?? []);
      }
    } catch {
      setGcalError('无法连接日历服务');
    } finally {
      setGcalLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted && state.googleCalendarIcsUrl) {
      void fetchGcalEvents(state.googleCalendarIcsUrl);
    }
  }, [mounted, state.googleCalendarIcsUrl, fetchGcalEvents]);

  const greetingText = useMemo(() => {
    const displayName =
      state.profile.name && state.profile.name !== 'Yi' ? state.profile.name : 'Lucian';
    if (!mounted) return `Welcome back, ${displayName}`;
    const hr = new Date().getHours();
    if (hr < 12) return `Good morning, ${displayName}`;
    if (hr < 18) return `Good afternoon, ${displayName}`;
    return `Good evening, ${displayName}`;
  }, [mounted, state.profile.name]);

  const allQuestions = useMemo(() => getAllQuestions(state), [state]);
  const dailyQuote = useMemo(
    () => getDailyQuote(todayISO, quoteOffset),
    [todayISO, quoteOffset]
  );

  const handleSaveGcalUrl = (url: string) => {
    updateGoogleCalendarUrl(url);
    if (url) {
      void fetchGcalEvents(url);
    } else {
      setGcalEvents([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Row 1: Greeting + Readiness KPI Strip */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#111118]" suppressHydrationWarning>
            {greetingText}
          </h1>
          <div className="mt-1.5 flex items-center gap-2 text-sm text-[#5E5E6E]">
            <p className="italic" suppressHydrationWarning>
              &ldquo;{dailyQuote.text}&rdquo; —{' '}
              <span className="font-medium not-italic text-[#6E32F5]">{dailyQuote.author}</span>
              <span className="ml-2 text-xs not-italic text-[#848494]">({dailyQuote.zh})</span>
            </p>
            <button
              type="button"
              onClick={() => setQuoteOffset((v) => v + 1)}
              className="shrink-0 rounded-md p-1 text-[#848494] transition hover:bg-[#F3ECFF] hover:text-[#6E32F5]"
              title="换一条每日名言"
              aria-label="Next daily quote"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/questions"
            className="rounded-xl border border-[#ECECF2] bg-white px-3 py-1.5 text-xs font-semibold text-[#111118] shadow-2xs transition hover:border-[#6E32F5]/50"
          >
            <span className="text-[#6E32F5]" suppressHydrationWarning>
              {mounted ? allQuestions.length : 0}
            </span>{' '}
            Questions
          </Link>
          <Link
            href="/stories"
            className="rounded-xl border border-[#ECECF2] bg-white px-3 py-1.5 text-xs font-semibold text-[#111118] shadow-2xs transition hover:border-[#6E32F5]/50"
          >
            <span className="text-[#6E32F5]" suppressHydrationWarning>
              {mounted ? state.stories.length : 0}
            </span>{' '}
            Stories
          </Link>
          <Link
            href="/knowledge"
            className="rounded-xl border border-[#ECECF2] bg-white px-3 py-1.5 text-xs font-semibold text-[#111118] shadow-2xs transition hover:border-[#6E32F5]/50"
          >
            <span className="text-[#6E32F5]" suppressHydrationWarning>
              {mounted ? state.knowledgeSnippets.length : 0}
            </span>{' '}
            Soundbites ·{' '}
            <span className="text-[#6E32F5]" suppressHydrationWarning>
              {mounted ? state.vocabItems.length : 0}
            </span>{' '}
            Vocab
          </Link>
        </div>
      </div>

      {/* Row 2: 3-Video Daily Affirmation & Mindset Strip */}
      <AffirmationVideoStrip
        videos={state.affirmationVideos}
        onSaveVideos={updateAffirmationVideos}
      />

      {/* Row 3: Full-Width Native Google Calendar & Schedule */}
      <ScheduleCalendarPanel
        mounted={mounted}
        todayISO={todayISO}
        upcomingLoops={state.upcomingLoops}
        googleCalendarIcsUrl={state.googleCalendarIcsUrl}
        gcalEvents={gcalEvents}
        gcalLoading={gcalLoading}
        gcalError={gcalError}
        onRefreshGcal={() => void fetchGcalEvents(state.googleCalendarIcsUrl ?? '')}
        onSaveGcalUrl={handleSaveGcalUrl}
        onAddLoop={addUpcomingLoop}
        onRemoveLoop={removeUpcomingLoop}
      />

      {/* Row 4: Full-Width Benchmarked Prep Todo Workspace */}
      <TodoWorkspacePanel
        mounted={mounted}
        todayISO={todayISO}
        todos={state.todos}
        onAddTodo={addTodo}
        onUpdateTodo={updateTodo}
        onToggleTodo={toggleTodo}
        onDeleteTodo={deleteTodo}
      />

      {/* Row 5: RareUI 3D Frosted Folder Launchpad (4 Cards) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#848494]">
            Quick Workspace Modules
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <RareFolderCard
            title="Add Question & Video"
            subtitle="Multi-role & round tagging"
            badge="Studio"
            accent="obsidian"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setAddQuestionOpen(true)}
          />
          <RareFolderCard
            title="Lark One-Click Import"
            subtitle="Sync Wiki, Docs & Bitable"
            badge="Feishu"
            accent="indigo"
            icon={<FileUp className="h-4 w-4" />}
            href="/import"
          />
          <RareFolderCard
            title="Knowledge Hub"
            subtitle="Vocab book & AI soundbites"
            badge="Hub"
            accent="violet"
            icon={<BookMarked className="h-4 w-4" />}
            href="/knowledge"
          />
          <RareFolderCard
            title="AI Mock Room"
            subtitle="Whiteboard & rubric scorecard"
            badge="Live"
            accent="emerald"
            icon={<MessageSquare className="h-4 w-4" />}
            href="/practice"
          />
        </div>
      </section>

      <QuestionModal
        open={addQuestionOpen}
        onClose={() => setAddQuestionOpen(false)}
        onSave={(q, notes) => {
          addCustomQuestion(q);
          if (notes) updateQuestionNotes(q.id, notes);
        }}
      />
    </div>
  );
}
