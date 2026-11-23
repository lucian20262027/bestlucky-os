'use client';

import React, { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { AffirmationVideoStrip } from '@/components/AffirmationVideoStrip';
import { useApp } from '@/components/AppProvider';
import { QuickLaunchDock } from '@/components/QuickLaunchDock';
import { TodoWorkspacePanel } from '@/components/TodoWorkspacePanel';
import { getDailyQuote } from '@/lib/daily-quotes';

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
    </div>
  );
}
