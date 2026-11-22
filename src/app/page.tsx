'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BookMarked,
  FileUp,
  MessageSquare,
  Plus,
  RefreshCw,
  Sparkles,
  Volume2,
  Zap,
} from 'lucide-react';
import { AffirmationVideoStrip } from '@/components/AffirmationVideoStrip';
import { useApp } from '@/components/AppProvider';
import { QuestionModal } from '@/components/QuestionModal';
import { QuickLaunchDock } from '@/components/QuickLaunchDock';
import { RareFolderCard } from '@/components/RareFolderCard';
import { TodoWorkspacePanel } from '@/components/TodoWorkspacePanel';
import { WarmupModal } from '@/components/WarmupModal';
import { getDailyQuote } from '@/lib/daily-quotes';
import { getAllQuestions } from '@/lib/helpers';

export default function DashboardPage() {
  const {
    state,
    mounted,
    todayISO,
    addCustomQuestion,
    updateQuestionNotes,
    addTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    updateAffirmationVideos,
  } = useApp();

  const [quoteOffset, setQuoteOffset] = useState(0);
  const [addQuestionOpen, setAddQuestionOpen] = useState(false);
  const [warmupOpen, setWarmupOpen] = useState(false);

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

  const dailyReview = useMemo(() => {
    const dayIdx = todayISO ? Math.floor(Date.parse(`${todayISO}T00:00:00Z`) / 86400000) : 0;
    const snippets = state.knowledgeSnippets;
    const vocabs = state.vocabItems;
    const snippet = snippets.length > 0 ? snippets[dayIdx % snippets.length] : null;
    const vocab1 = vocabs.length > 0 ? vocabs[dayIdx % vocabs.length] : null;
    const vocab2 = vocabs.length > 1 ? vocabs[(dayIdx + 1) % vocabs.length] : null;
    return { snippet, vocabs: [vocab1, vocab2].filter(Boolean) };
  }, [todayISO, state.knowledgeSnippets, state.vocabItems]);

  const speakWord = (word: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = 'en-US';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
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
          <button
            type="button"
            onClick={() => setWarmupOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#6E32F5] to-[#8B5CF6] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:opacity-95"
          >
            <Zap className="h-3.5 w-3.5" />
            15-Min Warmup
          </button>
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

      {/* Row 3: Quick Launchpad (Gmail, GCal, LinkedIn, X, Doubao, DeepSeek, Gemini) */}
      <QuickLaunchDock />

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

      {/* Row 4.5: Daily Auto-Review Push (Spaced Repetition) */}
      {(dailyReview.snippet || dailyReview.vocabs.length > 0) && (
        <section className="rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#6E32F5]" />
              <h2 className="text-sm font-semibold text-[#111118]">
                Daily Auto-Review Push · 今日自动复习推送
              </h2>
            </div>
            <Link
              href="/knowledge"
              className="text-xs font-semibold text-[#6E32F5] hover:underline"
            >
              进入闪卡抽查 →
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-12">
            {dailyReview.snippet && (
              <div className="rounded-xl border border-[#6E32F5]/20 bg-[#F9F6FF] p-3.5 lg:col-span-7">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6E32F5]">
                  Today&apos;s Soundbite Recall
                </div>
                <div className="mt-1 text-xs font-semibold text-[#111118]">
                  {dailyReview.snippet.title}
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#5E5E6E]">
                  {dailyReview.snippet.soundbite}
                </p>
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-2 lg:col-span-5">
              {dailyReview.vocabs.map((v) =>
                v ? (
                  <div
                    key={v.id}
                    className="flex flex-col justify-between rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#111118]">{v.word}</span>
                      <button
                        type="button"
                        onClick={() => speakWord(v.word)}
                        className="rounded-full bg-white p-1 text-[#6E32F5] shadow-2xs hover:bg-[#6E32F5] hover:text-white"
                        title="发音"
                      >
                        <Volume2 className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="mt-0.5 truncate font-mono text-[10px] text-[#6E32F5]">
                      {v.phonetic}
                    </div>
                    <div className="mt-1 line-clamp-1 text-[11px] text-[#5E5E6E]">
                      {v.meaning}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          </div>
        </section>
      )}

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

      <WarmupModal open={warmupOpen} onClose={() => setWarmupOpen(false)} />
    </div>
  );
}
