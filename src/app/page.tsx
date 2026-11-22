'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Calendar,
  ChevronRight,
  FileUp,
  Flame,
  GraduationCap,
  MessageSquare,
  Play,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { QuestionModal } from '@/components/QuestionModal';
import { daysUntil, getAllQuestions, roleBadgeClasses } from '@/lib/helpers';
import { ROLE_LIST, ROLES_BY_ID } from '@/lib/roles';
import { CourseSyllabus, RoleTrack } from '@/lib/types';

function computeCourseStats(course?: CourseSyllabus) {
  if (!course) return { total: 0, done: 0, pct: 0, nextTitle: 'Start learning' };
  let total = 0;
  let done = 0;
  let nextTitle = '';
  course.modules.forEach((m) =>
    m.subSections.forEach((s) =>
      s.lessons.forEach((l) => {
        total++;
        if (l.completed) done++;
        else if (!nextTitle) nextTitle = l.title;
      })
    )
  );
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, pct, nextTitle: nextTitle || course.modules[0]?.title || 'Course Intro' };
}

export default function DashboardPage() {
  const router = useRouter();
  const {
    state,
    mounted,
    todayISO,
    updateUserGoals,
    addUpcomingLoop,
    removeUpcomingLoop,
    addCustomQuestion,
    updateQuestionNotes,
  } = useApp();

  const [studyPrompt, setStudyPrompt] = useState('');
  const [editingGoals, setEditingGoals] = useState(false);
  const [goalsSummary, setGoalsSummary] = useState('');
  const [goalsCompanies, setGoalsCompanies] = useState('');
  const [showAddLoop, setShowAddLoop] = useState(false);
  const [addQuestionOpen, setAddQuestionOpen] = useState(false);

  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState<RoleTrack>('fde');
  const [newRound, setNewRound] = useState('System & Problem Decomposition');
  const [newDate, setNewDate] = useState('2026-11-28');

  useEffect(() => {
    if (todayISO) {
      const targetMs = Date.parse(`${todayISO}T00:00:00Z`) + 7 * 86400000;
      setNewDate(new Date(targetMs).toISOString().slice(0, 10));
    }
  }, [todayISO]);

  const greetingText = useMemo(() => {
    if (!mounted) return `Welcome back, ${state.profile.name}`;
    const hr = new Date().getHours();
    if (hr < 12) return `Good morning, ${state.profile.name}`;
    if (hr < 18) return `Good afternoon, ${state.profile.name}`;
    return `Good evening, ${state.profile.name}`;
  }, [mounted, state.profile.name]);

  const activeCourseRole: RoleTrack =
    state.sessions[0]?.role ?? state.upcomingLoops[0]?.role ?? 'fde';
  const activeCourse = state.courses[activeCourseRole] ?? state.courses.fde;
  const activeStats = computeCourseStats(activeCourse);

  const allQuestions = useMemo(() => getAllQuestions(state), [state]);

  const weekDays = useMemo(() => {
    const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    if (!mounted || !todayISO) {
      return labels.map((lbl, idx) => ({
        lbl,
        dayNum: String(15 + idx),
        active: false,
        isToday: false,
      }));
    }
    const base = new Date(`${todayISO}T00:00:00`);
    const dayOfWeek = base.getDay(); // 0=Sun
    const sunday = new Date(base);
    sunday.setDate(base.getDate() - dayOfWeek);

    return labels.map((lbl, idx) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + idx);
      const iso = d.toISOString().slice(0, 10);
      return {
        lbl,
        dayNum: String(d.getDate()),
        active: state.practiceDatesISO.includes(iso),
        isToday: iso === todayISO,
      };
    });
  }, [mounted, todayISO, state.practiceDatesISO]);

  const handleStudyPromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = studyPrompt.trim().toLowerCase();
    if (!trimmed) {
      router.push('/customizer');
      return;
    }
    if (trimmed.includes('fde')) router.push('/courses/fde');
    else if (trimmed.includes('fdpm')) router.push('/courses/fdpm');
    else if (trimmed.includes('ai')) router.push('/courses/ai-pm');
    else if (trimmed.includes('consult') || trimmed.includes('ebitda'))
      router.push('/courses/consulting');
    else if (trimmed.includes('ops') || trimmed.includes('oper'))
      router.push('/courses/operations');
    else if (trimmed.includes('pgm') || trimmed.includes('tpm')) router.push('/courses/pgm');
    else router.push('/customizer');
  };

  const handleOpenGoalsEditor = () => {
    setGoalsSummary(state.userGoals.summary);
    setGoalsCompanies(state.userGoals.targetCompanies.join(', '));
    setEditingGoals(true);
  };

  const handleSaveGoals = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserGoals({
      summary: goalsSummary.trim() || state.userGoals.summary,
      targetCompanies: goalsCompanies
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
    });
    setEditingGoals(false);
  };

  const handleCreateLoop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.trim()) return;
    addUpcomingLoop({
      company: newCompany.trim(),
      role: newRole,
      round: newRound.trim() || 'Full Loop',
      dateISO: newDate,
    });
    setNewCompany('');
    setShowAddLoop(false);
  };

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div>
        <h1
          suppressHydrationWarning
          className="text-2xl font-bold tracking-tight text-[#111118] sm:text-[28px]"
        >
          {greetingText}
        </h1>
        <p className="mt-1 text-sm text-[#525260]">
          Jump back into your interview prep and keep up your progress.
        </p>
      </div>

      {/* Aced.io Two-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT 8 COLS */}
        <div className="space-y-5 lg:col-span-8">
          {/* 1. AI Study Plan Prompt Box */}
          <form
            onSubmit={handleStudyPromptSubmit}
            className="rounded-2xl border border-[#ECECF2] bg-white p-4 shadow-[0_1px_2px_rgba(16,16,24,0.03)]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3ECFF] text-[#6E32F5]">
                <Sparkles className="h-4 w-4" />
              </div>
              <input
                value={studyPrompt}
                onChange={(e) => setStudyPrompt(e.target.value)}
                placeholder="Create a study plan or jump to a topic (e.g. FDE, AI PM, Consulting)..."
                className="flex-1 bg-transparent text-sm text-[#111118] placeholder:text-[#848494] focus:outline-none"
              />
              <button
                type="submit"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#6E32F5] text-white transition hover:opacity-90"
                aria-label="Go"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3.5 flex flex-wrap gap-2 pl-12">
              {[
                { label: 'FDE 30-60-90 prep', href: '/courses/fde' },
                { label: 'AI PM Evals & RAG', href: '/courses/ai-pm' },
                { label: 'Consulting EBITDA case', href: '/courses/consulting' },
                { label: 'Custom JD study plan', href: '/customizer' },
              ].map((pill) => (
                <Link
                  key={pill.label}
                  href={pill.href}
                  className="rounded-full border border-[#ECECF2] bg-[#FAFAFC] px-3 py-1 text-xs font-medium text-[#525260] transition hover:border-[#D4C5FD] hover:bg-[#F3ECFF] hover:text-[#6E32F5]"
                >
                  {pill.label}
                </Link>
              ))}
            </div>
          </form>

          {/* 2. Continue Learning Card */}
          <section className="rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-[0_1px_2px_rgba(16,16,24,0.03)]">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-[#111118]">Continue learning</h2>
              <Link
                href="/courses"
                className="text-xs font-medium text-[#6E32F5] hover:underline"
              >
                See all courses
              </Link>
            </div>

            <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                {/* Dark Preview Video Thumbnail with Purple Play Button */}
                <Link
                  href={`/courses/${activeCourseRole}`}
                  className="relative flex h-[76px] w-[124px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#1C1A29] to-[#2C2444]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6E32F5] text-white shadow-md">
                    <Play className="ml-0.5 h-4 w-4 fill-white" />
                  </div>
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#6E32F5]">
                    {ROLES_BY_ID[activeCourseRole].label} PREP
                  </div>
                  <Link
                    href={`/courses/${activeCourseRole}`}
                    className="mt-0.5 block truncate text-sm font-semibold text-[#111118] hover:text-[#6E32F5]"
                  >
                    {activeStats.nextTitle}
                  </Link>
                  <div className="mt-2.5 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EFEFF5]">
                      <div
                        className="h-full rounded-full bg-[#6E32F5] transition-all"
                        style={{ width: `${Math.max(4, activeStats.pct)}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-xs font-medium text-[#848494]">
                      {activeStats.pct}% complete
                    </span>
                  </div>
                </div>
              </div>

              <Link
                href={`/courses/${activeCourseRole}`}
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#6E32F5] px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:opacity-95"
              >
                Continue
              </Link>
            </div>
          </section>

          {/* 3. Recommended for You Card */}
          <section className="rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-[0_1px_2px_rgba(16,16,24,0.03)]">
            <h2 className="text-[15px] font-semibold text-[#111118]">Recommended for you</h2>

            <div className="mt-3 divide-y divide-[#F0F0F5]">
              <button
                type="button"
                onClick={() => setAddQuestionOpen(true)}
                className="flex w-full items-center justify-between py-3 text-left transition hover:bg-[#FAFAFC]"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3ECFF] text-[#6E32F5]">
                    <Plus className="h-4 w-4" />
                  </span>
                  <span className="text-[13.5px] font-medium text-[#111118]">
                    Add a custom question, written answer, or video recording
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-[#848494]" />
              </button>

              <Link
                href="/stories?tab=import"
                className="flex items-center justify-between py-3 transition hover:bg-[#FAFAFC]"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <FileUp className="h-4 w-4" />
                  </span>
                  <span className="text-[13.5px] font-medium text-[#111118]">
                    One-click import from Lark / 飞书 Wiki &amp; Bitable
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-[#848494]" />
              </Link>

              <Link
                href="/courses"
                className="flex items-center justify-between py-3 transition hover:bg-[#FAFAFC]"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                    <GraduationCap className="h-4 w-4" />
                  </span>
                  <span className="text-[13.5px] font-medium text-[#111118]">
                    Edit &amp; publish your 7-track course syllabi (FDE, FDPM, AI PM, Ops, PgM, Consulting)
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-[#848494]" />
              </Link>

              <Link
                href="/practice"
                className="flex items-center justify-between py-3 transition hover:bg-[#FAFAFC]"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                    <MessageSquare className="h-4 w-4" />
                  </span>
                  <span className="text-[13.5px] font-medium text-[#111118]">
                    Launch AI mock interview with architecture board &amp; rubric scorecard
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-[#848494]" />
              </Link>
            </div>
          </section>

          {/* 4. Your 7 Active Tracks (Clean Cards) */}
          <section className="rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-[0_1px_2px_rgba(16,16,24,0.03)]">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-[#111118]">
                Your 7 Role Courses ({allQuestions.length} Questions)
              </h2>
              <Link
                href="/questions"
                className="text-xs font-medium text-[#6E32F5] hover:underline"
              >
                Browse all questions →
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {ROLE_LIST.map((r) => {
                const stats = computeCourseStats(state.courses[r.id]);
                const compact = r.id === 'pgm' ? 'PgM' : r.shortLabel;
                return (
                  <Link
                    key={r.id}
                    href={`/courses/${r.id}`}
                    className="rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-3 transition hover:border-[#D4C5FD] hover:bg-white"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`max-w-[92px] truncate whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold ${roleBadgeClasses(
                          r.id
                        )}`}
                      >
                        {compact}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] font-semibold text-[#111118]">
                        {stats.pct}%
                      </span>
                    </div>
                    <div className="mt-2 truncate text-xs font-medium text-[#111118]">
                      {r.label}
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#ECECF2]">
                      <div
                        className="h-full rounded-full bg-[#6E32F5]"
                        style={{ width: `${Math.max(4, stats.pct)}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        {/* RIGHT RAIL (4 COLS) */}
        <div className="space-y-5 lg:col-span-4">
          {/* 1. Your Goals Card */}
          <section className="rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-[0_1px_2px_rgba(16,16,24,0.03)]">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-[#111118]">Your goals</h2>
              {!editingGoals ? (
                <button
                  type="button"
                  onClick={handleOpenGoalsEditor}
                  className="text-xs font-semibold text-[#6E32F5] hover:underline"
                >
                  Edit
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingGoals(false)}
                  className="text-xs text-[#848494] hover:text-[#111118]"
                >
                  Cancel
                </button>
              )}
            </div>

            {editingGoals ? (
              <form onSubmit={handleSaveGoals} className="mt-3 space-y-2.5">
                <textarea
                  rows={3}
                  value={goalsSummary}
                  onChange={(e) => setGoalsSummary(e.target.value)}
                  className="w-full rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-2.5 text-xs focus:border-[#6E32F5] focus:bg-white focus:outline-none"
                />
                <input
                  value={goalsCompanies}
                  onChange={(e) => setGoalsCompanies(e.target.value)}
                  placeholder="Anthropic, OpenAI, Palantir, Stripe..."
                  className="w-full rounded-xl border border-[#ECECF2] bg-[#FAFAFC] px-2.5 py-2 text-xs focus:border-[#6E32F5] focus:bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#6E32F5] py-2 text-xs font-semibold text-white"
                >
                  Save Goals
                </button>
              </form>
            ) : (
              <p className="mt-2.5 text-[13px] leading-relaxed text-[#525260]">
                {state.userGoals.summary}{' '}
                <span className="font-semibold text-[#6E32F5]">
                  {state.userGoals.targetCompanies.join(', ')}
                </span>
                .
              </p>
            )}
          </section>

          {/* 2. Upcoming Loops Card (Aced-style Jobs picked for you) */}
          <section className="rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-[0_1px_2px_rgba(16,16,24,0.03)]">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-[#111118]">Upcoming loops</h2>
              <button
                type="button"
                onClick={() => setShowAddLoop((v) => !v)}
                className="text-xs font-semibold text-[#6E32F5] hover:underline"
              >
                + Add
              </button>
            </div>

            {showAddLoop && (
              <form
                onSubmit={handleCreateLoop}
                className="mt-3 space-y-2 rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-3"
              >
                <input
                  required
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="Company (e.g., Anthropic, Palantir)"
                  className="w-full rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs focus:border-[#6E32F5] focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as RoleTrack)}
                    className="rounded-lg border border-[#ECECF2] bg-white px-2 py-1.5 text-xs"
                  >
                    {ROLE_LIST.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.shortLabel}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="rounded-lg border border-[#ECECF2] bg-white px-2 py-1.5 text-xs"
                  />
                </div>
                <input
                  value={newRound}
                  onChange={(e) => setNewRound(e.target.value)}
                  placeholder="Round focus..."
                  className="w-full rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs"
                />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-[#6E32F5] py-1.5 text-xs font-semibold text-white"
                >
                  Save Loop
                </button>
              </form>
            )}

            <div className="mt-4 space-y-3.5">
              {state.upcomingLoops.map((loop) => {
                const d = mounted ? daysUntil(loop.dateISO, todayISO) : null;
                const roleCfg = ROLES_BY_ID[loop.role];
                return (
                  <div key={loop.id} className="group flex items-start justify-between gap-2">
                    <Link
                      href={`/courses/${loop.role}`}
                      className="flex min-w-0 flex-1 items-start gap-3"
                    >
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#ECECF2] bg-[#FAFAFC] text-[#6E32F5]">
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-semibold text-[#111118] group-hover:text-[#6E32F5]">
                          {roleCfg.label}
                        </div>
                        <div className="truncate text-xs text-[#525260]">{loop.round}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#848494]">
                          <span>{loop.company}</span>
                          <span>·</span>
                          <span suppressHydrationWarning className="font-mono text-[#6E32F5]">
                            {!mounted || d === null
                              ? loop.dateISO
                              : d > 0
                                ? `T-${d}d`
                                : d === 0
                                  ? 'Today'
                                  : `T+${Math.abs(d)}d`}
                          </span>
                        </div>
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeUpcomingLoop(loop.id)}
                      className="rounded p-1 text-[#848494] opacity-0 hover:text-rose-600 group-hover:opacity-100"
                      title="Remove loop"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            <Link
              href="/customizer"
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#6E32F5] hover:underline"
            >
              Tailor from a new JD →
            </Link>
          </section>

          {/* 3. Practice Streak Card */}
          <section className="rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-[0_1px_2px_rgba(16,16,24,0.03)]">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-[#111118]">Practice streak</h2>
              <span className="text-xs text-[#848494]">
                Active: {mounted ? state.practiceDatesISO.length : 0}d
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3ECFF] text-[#6E32F5]">
                <Flame className="h-4 w-4" />
              </div>
              <div>
                <span suppressHydrationWarning className="text-xl font-bold text-[#111118]">
                  {mounted ? state.practiceDatesISO.length : 0}
                </span>{' '}
                <span className="text-xs text-[#525260]">days practiced</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1.5 text-center">
              {weekDays.map((wd, i) => (
                <div key={i} className="space-y-1">
                  <div className="text-[10px] font-semibold text-[#848494]">{wd.lbl}</div>
                  <div
                    suppressHydrationWarning
                    className={`mx-auto flex h-7 w-7 items-center justify-center rounded-lg font-mono text-[11px] font-medium ${
                      wd.active
                        ? 'bg-[#6E32F5] text-white'
                        : wd.isToday
                          ? 'border border-[#6E32F5] bg-[#F3ECFF] text-[#6E32F5]'
                          : 'bg-[#F5F5FA] text-[#848494]'
                    }`}
                  >
                    {wd.dayNum}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

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
