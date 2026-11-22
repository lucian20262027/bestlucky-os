'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookMarked,
  FileUp,
  Loader2,
  MessageSquare,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { QuestionModal } from '@/components/QuestionModal';
import { RareFolderCard } from '@/components/RareFolderCard';
import {
  type CalendarEventItem,
  ScheduleCalendarPanel,
} from '@/components/ScheduleCalendarPanel';
import { TodoWorkspacePanel } from '@/components/TodoWorkspacePanel';
import { getAllQuestions } from '@/lib/helpers';

interface CopilotReply {
  query: string;
  answer: string;
  links: Array<{ label: string; href: string }>;
  mode?: string;
}

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
    updateGoogleCalendarUrl,
  } = useApp();

  // Copilot state
  const [studyPrompt, setStudyPrompt] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotReply, setCopilotReply] = useState<CopilotReply | null>(null);
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

  const askCopilot = async (rawQuery: string) => {
    const q = rawQuery.trim();
    if (!q || copilotLoading) return;
    setStudyPrompt(q);
    setCopilotLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (state.aiSettings.geminiApiKey.trim()) {
        headers['x-gemini-api-key'] = state.aiSettings.geminiApiKey.trim();
      }
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'dashboard_ask',
          model: state.aiSettings.model,
          language: state.aiSettings.language,
          payload: { query: q },
        }),
      });
      const json = (await res.json()) as {
        mode?: string;
        data?: { answer?: string; links?: Array<{ label: string; href: string }> };
      };
      if (res.ok && json.data?.answer) {
        setCopilotReply({
          query: q,
          answer: json.data.answer,
          links: json.data.links ?? [],
          mode: json.mode,
        });
      }
    } finally {
      setCopilotLoading(false);
    }
  };

  const handleStudyPromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void askCopilot(studyPrompt);
  };

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
          <p className="mt-1 text-sm text-[#5E5E6E]">
            Every focused rep compounds — review your soundbites, check your schedule, and ship today&apos;s prep.
          </p>
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

      {/* Row 2: Real AI Interview Copilot Bar (Full Width in Main Workspace) */}
      <div className="rounded-2xl border border-[#ECECF2] bg-white p-4 shadow-2xs transition focus-within:border-[#6E32F5]/50 focus-within:shadow-sm">
        <form onSubmit={handleStudyPromptSubmit} className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3ECFF] text-[#6E32F5]">
            <Sparkles className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={studyPrompt}
            onChange={(e) => setStudyPrompt(e.target.value)}
            placeholder="Ask your AI Interview Copilot (e.g. OpenAI FDE prep, NVIDIA TPM reverse Q&A, soundbites)..."
            className="w-full bg-transparent text-sm text-[#111118] placeholder-[#9E9EAE] focus:outline-none"
          />
          <button
            type="submit"
            disabled={copilotLoading || !studyPrompt.trim()}
            aria-label="Ask AI Copilot"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#6E32F5] text-white transition hover:bg-[#5B24D6] disabled:opacity-50"
          >
            {copilotLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {[
            'OpenAI FDE 30-60-90 prep',
            'AI PM guardrails & evals',
            'NVIDIA TPM reverse Q&A',
            'Sync Lark interview notes',
          ].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => void askCopilot(chip)}
              className="rounded-full border border-[#ECECF2] bg-[#FAFAFC] px-3 py-1 text-xs font-medium text-[#5E5E6E] transition hover:border-[#6E32F5]/40 hover:bg-[#F3ECFF] hover:text-[#6E32F5]"
            >
              {chip}
            </button>
          ))}
        </div>

        {copilotReply && (
          <div className="mt-4 rounded-xl border border-[#6E32F5]/20 bg-[#F9F6FF] p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6E32F5]">
                AI Copilot ·{' '}
                {copilotReply.mode === 'live_gemini' ? 'Gemini Live' : 'Instant Assistant'}
              </div>
              <button
                type="button"
                onClick={() => setCopilotReply(null)}
                className="rounded-md p-0.5 text-[#848494] hover:text-[#111118]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-[#111118]">{copilotReply.answer}</p>
            {copilotReply.links.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {copilotReply.links.map((lnk) => (
                  <Link
                    key={lnk.href + lnk.label}
                    href={lnk.href}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#6E32F5]/30 bg-white px-2.5 py-1 text-xs font-semibold text-[#6E32F5] transition hover:bg-[#6E32F5] hover:text-white"
                  >
                    {lnk.label}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

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
