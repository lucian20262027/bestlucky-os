'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit3,
  FileText,
  FileUp,
  Play,
  Plus,
  Search,
  Trash2,
  Video,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { BankHubTabs } from '@/components/BankHubTabs';
import { QuestionModal } from '@/components/QuestionModal';
import {
  getAllQuestions,
  getCategoryMeta,
  getQuestionStatus,
  inferQuestionCategory,
  QUESTION_CATEGORIES,
  roleBadgeClasses,
} from '@/lib/helpers';
import { ROLE_LIST, ROLES_BY_ID, ROUND_LABELS } from '@/lib/roles';
import {
  Difficulty,
  InterviewQuestion,
  QuestionCategory,
  QuestionStatus,
  RoleTrack,
  RoundType,
} from '@/lib/types';

function QuestionBankInner() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');
  const validParamRole: RoleTrack | 'all' =
    roleParam && ROLES_BY_ID[roleParam as RoleTrack] ? (roleParam as RoleTrack) : 'all';

  const {
    state,
    addCustomQuestion,
    updateCustomQuestion,
    deleteCustomQuestion,
    updateQuestionNotes,
    updateAISettings,
    updateCustomCategories,
  } = useApp();

  const [roleFilter, setRoleFilter] = useState<RoleTrack | 'all'>(validParamRole);
  const [categoryFilter, setCategoryFilter] = useState<QuestionCategory | 'all'>('all');
  const [managingCategories, setManagingCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [roundFilter, setRoundFilter] = useState<RoundType | 'all'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<QuestionStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [expandedRubrics, setExpandedRubrics] = useState<Record<string, boolean>>({});
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<InterviewQuestion | null>(null);

  useEffect(() => {
    setRoleFilter(validParamRole);
  }, [validParamRole]);

  const categoriesList = useMemo(
    () =>
      state.customCategories && state.customCategories.length > 0
        ? state.customCategories
        : QUESTION_CATEGORIES,
    [state.customCategories]
  );

  const allQuestions = useMemo(() => getAllQuestions(state), [state]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allQuestions.length };
    ROLE_LIST.forEach((r) => {
      counts[r.id] = allQuestions.filter(
        (q) => q.role === r.id || q.secondaryRoles.includes(r.id)
      ).length;
    });
    return counts;
  }, [allQuestions]);

  const categoryCounts = useMemo(() => {
    const base =
      roleFilter === 'all'
        ? allQuestions
        : allQuestions.filter(
            (q) => q.role === roleFilter || q.secondaryRoles.includes(roleFilter)
          );
    const counts: Record<string, number> = { all: base.length };
    categoriesList.forEach((cat) => {
      counts[cat.id] = base.filter((q) => inferQuestionCategory(q) === cat.id).length;
    });
    return counts;
  }, [allQuestions, categoriesList, roleFilter]);

  const filteredQuestions = useMemo(() => {
    const qLower = search.trim().toLowerCase();
    return allQuestions.filter((item) => {
      if (
        roleFilter !== 'all' &&
        item.role !== roleFilter &&
        !item.secondaryRoles.includes(roleFilter)
      ) {
        return false;
      }
      if (categoryFilter !== 'all' && inferQuestionCategory(item) !== categoryFilter) {
        return false;
      }
      if (roundFilter !== 'all') {
        const itemRounds = [item.round, ...(item.secondaryRounds ?? [])];
        if (!itemRounds.includes(roundFilter)) return false;
      }
      if (difficultyFilter !== 'all' && item.difficulty !== difficultyFilter) return false;
      const st = getQuestionStatus(state, item.id);
      if (statusFilter !== 'all' && st !== statusFilter) return false;
      if (qLower) {
        const notes = state.questionNotes[item.id];
        const hay = `${item.title} ${item.prompt} ${item.companyStyle} ${item.promptZhHint} ${
          notes?.modelAnswer ?? ''
        } ${notes?.myAnswer ?? ''}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      return true;
    });
  }, [
    allQuestions,
    roleFilter,
    categoryFilter,
    roundFilter,
    difficultyFilter,
    statusFilter,
    search,
    state,
  ]);

  const toggleRubric = (id: string) => {
    setExpandedRubrics((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAnswerPreview = (id: string) => {
    setExpandedAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDeleteCustom = (q: InterviewQuestion) => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Delete custom question "${q.title}"?`)
    ) {
      return;
    }
    deleteCustomQuestion(q.id);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111118]">
            Question &amp; Answer Bank
          </h1>
          <p className="mt-1 text-sm text-[#525260]">
            {allQuestions.length} interview prompts across 7 tracks. Filter by role, preview rubrics inline, or open Answer Studio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              updateAISettings({
                language: state.aiSettings.language === 'en' ? 'bilingual' : 'en',
              })
            }
            className="rounded-xl border border-[#ECECF2] bg-white px-3 py-2 text-xs font-medium text-[#525260] hover:text-[#111118]"
          >
            {state.aiSettings.language === 'en' ? 'Hints: EN Only' : 'Bilingual Hints: On'}
          </button>

          <Link
            href="/stories?tab=import"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#ECECF2] bg-white px-3.5 py-2 text-xs font-semibold text-[#111118] hover:border-[#6E32F5]"
          >
            <FileUp className="h-3.5 w-3.5 text-[#6E32F5]" />
            Import from Lark
          </Link>

          <button
            type="button"
            onClick={() => {
              setEditingQuestion(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5B24D6]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Question
          </button>
        </div>
      </div>

      {/* Shared Hub Switcher */}
      <BankHubTabs
        active="questions"
        questionCount={allQuestions.length}
        storyCount={state.stories.length}
        libraryCount={state.libraryItems.length}
      />

      {/* Role Track Filter Bar */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setRoleFilter('all')}
          className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
            roleFilter === 'all'
              ? 'border-[#111118] bg-[#111118] text-white'
              : 'border-[#ECECF2] bg-white text-[#525260] hover:text-[#111118]'
          }`}
        >
          All Tracks ({roleCounts.all})
        </button>
        {ROLE_LIST.map((r) => {
          const active = roleFilter === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setRoleFilter((prev) => (prev === r.id ? 'all' : r.id))}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? 'border-[#111118] bg-[#111118] text-white'
                  : 'border-[#ECECF2] bg-white text-[#525260] hover:border-[#D4C5FD] hover:text-[#111118]'
              }`}
            >
              {r.shortLabel} ({roleCounts[r.id] ?? 0})
            </button>
          );
        })}
      </div>

      {/* Category Pills + Manager */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
              categoryFilter === 'all'
                ? 'border-[#6E32F5] bg-[#F4EFFF] text-[#5D26D9]'
                : 'border-[#ECECF2] bg-white text-[#5E5E6E] hover:border-[#D4C5FD]'
            }`}
          >
            All Categories ({categoryCounts.all})
          </button>
          {categoriesList.map((cat) => {
            const active = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                  active
                    ? 'border-[#6E32F5] bg-[#F4EFFF] text-[#5D26D9]'
                    : 'border-[#ECECF2] bg-white text-[#5E5E6E] hover:border-[#D4C5FD] hover:text-[#111118]'
                }`}
              >
                {cat.label} ({categoryCounts[cat.id] ?? 0})
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setManagingCategories((v) => !v)}
            data-testid="manage-categories-button"
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
              managingCategories
                ? 'border-[#6E32F5] bg-[#F4EFFF] text-[#5D26D9]'
                : 'border-dashed border-[#D4C5FD] bg-white text-[#6E32F5] hover:bg-[#F9F6FF]'
            }`}
          >
            <Edit3 className="h-3 w-3" />
            {managingCategories ? 'Done' : 'Manage Categories'}
          </button>
        </div>

        {managingCategories && (
          <div
            className="space-y-2.5 rounded-2xl border border-[#D4C5FD] bg-[#FAF8FF] p-3.5"
            data-testid="category-manager-panel"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#5D26D9]">
                Custom Question Categories
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category (e.g. AI Agents)"
                  data-testid="new-category-input"
                  className="rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1 text-xs focus:border-[#6E32F5] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const label = newCategoryName.trim();
                    if (!label) return;
                    const id =
                      label
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, '') || `cat-${Date.now()}`;
                    updateCustomCategories([
                      ...categoriesList,
                      {
                        id,
                        label,
                        shortLabel: label,
                        badgeClass: 'bg-[#F3ECFF] text-[#6E32F5]',
                      },
                    ]);
                    setNewCategoryName('');
                  }}
                  data-testid="add-category-button"
                  className="inline-flex items-center gap-1 rounded-lg bg-[#6E32F5] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#5B24D6]"
                >
                  <Plus className="h-3 w-3" />
                  Add Category
                </button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {categoriesList.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-1.5 rounded-xl border border-[#ECECF2] bg-white px-2.5 py-1.5"
                >
                  <input
                    type="text"
                    value={cat.label}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateCustomCategories(
                        categoriesList.map((c) =>
                          c.id === cat.id ? { ...c, label: val, shortLabel: val } : c
                        )
                      );
                    }}
                    className="min-w-0 flex-1 bg-transparent text-xs font-medium text-[#111118] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (categoriesList.length <= 1) return;
                      updateCustomCategories(categoriesList.filter((c) => c.id !== cat.id));
                      if (categoryFilter === cat.id) setCategoryFilter('all');
                    }}
                    className="rounded p-1 text-[#848494] hover:bg-rose-50 hover:text-rose-600"
                    title="Delete category"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search & Secondary Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#ECECF2] bg-white p-3.5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#848494]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts, answers, ERP, RAG, Evals, EBITDA..."
            className="w-full rounded-lg border border-[#ECECF2] bg-[#FAFAFC] py-2 pl-8 pr-3 text-xs focus:border-[#6E32F5] focus:bg-white focus:outline-none"
          />
        </div>

        <select
          value={roundFilter}
          onChange={(e) => setRoundFilter(e.target.value as RoundType | 'all')}
          className="rounded-lg border border-[#ECECF2] bg-white px-2.5 py-2 text-xs focus:outline-none"
        >
          <option value="all">All Rounds</option>
          {Object.entries(ROUND_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.en}
            </option>
          ))}
        </select>

        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value as Difficulty | 'all')}
          className="rounded-lg border border-[#ECECF2] bg-white px-2.5 py-2 text-xs focus:outline-none"
        >
          <option value="all">All Levels</option>
          <option value="core">Core</option>
          <option value="senior">Senior</option>
          <option value="staff">Staff / Principal</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as QuestionStatus | 'all')}
          className="rounded-lg border border-[#ECECF2] bg-white px-2.5 py-2 text-xs focus:outline-none"
        >
          <option value="all">Any Mastery</option>
          <option value="unpracticed">Unpracticed</option>
          <option value="needs_drill">Needs Drill</option>
          <option value="mastered">Mastered</option>
        </select>
      </div>

      {/* Slim Linear-Style Question Cards */}
      <div className="space-y-3">
        {filteredQuestions.length === 0 ? (
          <div className="rounded-2xl border border-[#ECECF2] bg-white p-10 text-center text-sm text-[#848494]">
            No questions match your current filters. Clear filters or add a custom question.
          </div>
        ) : (
          filteredQuestions.map((q) => {
            const rubricOpen = Boolean(expandedRubrics[q.id]);
            const answerOpen = Boolean(expandedAnswers[q.id]);
            const progress = state.questionProgress[q.id];
            const status = progress?.status ?? 'unpracticed';
            const roleCfg = ROLES_BY_ID[q.role];
            const notes = state.questionNotes[q.id];
            const modelText = (notes?.modelAnswer || q.modelAnswer || '').trim();
            const modelHtml = notes?.modelAnswerHtml?.trim();
            const hasModel = Boolean(modelText || modelHtml);
            const hasMy = Boolean(notes?.myAnswer?.trim());
            const hasVideo = Boolean(notes?.videoUrl?.trim() || notes?.localMediaId || q.videoUrl);
            const catMeta = getCategoryMeta(inferQuestionCategory(q), categoriesList);

            return (
              <article
                key={q.id}
                className="rounded-2xl border border-[#ECECF2] bg-white p-4.5 shadow-2xs transition hover:border-[#D4C5FD]"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {/* Compact Metadata Row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${roleBadgeClasses(
                          q.role
                        )}`}
                      >
                        {roleCfg.shortLabel}
                      </span>
                      <span className="text-[11px] font-medium text-[#6C6C7D]">
                        {catMeta.shortLabel} · {ROUND_LABELS[q.round].en}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#848494]">
                        <Clock className="h-3 w-3" />
                        {q.timeLimitMin}m · {q.difficulty.toUpperCase()} · {q.companyStyle}
                      </span>
                      {status === 'mastered' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Mastered {progress?.bestScore ? `(${progress.bestScore}★)` : ''}
                        </span>
                      )}
                      {status === 'needs_drill' && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          Needs Drill {progress?.bestScore ? `(${progress.bestScore}★)` : ''}
                        </span>
                      )}

                      {(hasModel || hasMy || hasVideo) && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#848494]">
                          {hasModel && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-[#F5F5FA] px-1.5 py-0.5 text-[#525260]">
                              <BookOpen className="h-2.5 w-2.5" />
                              Model
                            </span>
                          )}
                          {hasMy && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-[#F5F5FA] px-1.5 py-0.5 text-[#525260]">
                              <FileText className="h-2.5 w-2.5" />
                              My Note
                            </span>
                          )}
                          {hasVideo && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-[#F5F5FA] px-1.5 py-0.5 text-[#525260]">
                              <Video className="h-2.5 w-2.5" />
                              Video
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/questions/${q.id}`}
                      className="block text-[15px] font-semibold leading-snug text-[#111118] hover:text-[#6E32F5]"
                    >
                      {q.title}
                    </Link>

                    <p
                      className={`whitespace-pre-wrap text-xs leading-relaxed text-[#525260] ${
                        answerOpen ? '' : 'line-clamp-2'
                      }`}
                    >
                      {q.prompt}
                    </p>

                    {state.aiSettings.language !== 'en' && q.promptZhHint && (
                      <p className="rounded-lg bg-amber-50/70 px-2.5 py-1 text-[11px] text-amber-950">
                        {q.promptZhHint}
                      </p>
                    )}
                  </div>

                  {/* Restrained Action Group */}
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {hasModel && (
                      <button
                        type="button"
                        onClick={() => toggleAnswerPreview(q.id)}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                          answerOpen
                            ? 'border-[#6E32F5] bg-[#F4EFFF] text-[#5D26D9]'
                            : 'border-[#ECECF2] bg-white text-[#525260] hover:text-[#111118]'
                        }`}
                      >
                        {answerOpen ? 'Hide Answer' : 'Preview'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleRubric(q.id)}
                      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                        rubricOpen
                          ? 'border-[#111118] bg-[#111118] text-white'
                          : 'border-[#ECECF2] bg-white text-[#525260] hover:text-[#111118]'
                      }`}
                    >
                      Rubric
                      {rubricOpen ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>
                    <Link
                      href={`/questions/${q.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#D4C5FD] bg-[#F9F6FF] px-3 py-1.5 text-xs font-semibold text-[#5D26D9] transition hover:bg-[#F3ECFF]"
                    >
                      Study
                    </Link>
                    <Link
                      href={`/practice/${q.id}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#111118] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                    >
                      <Play className="h-3 w-3" />
                      Mock
                    </Link>
                    {q.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCustom(q)}
                        className="rounded-lg border border-[#ECECF2] p-1.5 text-[#848494] hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                        title="Delete custom question"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* On-Demand Model Answer Preview */}
                {answerOpen && hasModel && (
                  <div className="mt-3 rounded-xl border border-[#ECECF2] bg-[#FAFAFC] px-4 py-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6E32F5]">
                        Reference Answer Preview
                      </span>
                      <Link
                        href={`/questions/${q.id}`}
                        className="text-[11px] font-semibold text-[#6E32F5] hover:underline"
                      >
                        Open Full Answer Studio →
                      </Link>
                    </div>
                    {modelHtml ? (
                      <div
                        className="text-xs leading-relaxed text-[#2E2E3A] [&>p]:mb-1.5"
                        dangerouslySetInnerHTML={{ __html: modelHtml }}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-xs leading-relaxed text-[#2E2E3A]">
                        {modelText}
                      </p>
                    )}
                  </div>
                )}

                {/* On-Demand Rubric Breakdown */}
                {rubricOpen && (
                  <div className="mt-3.5 grid gap-4 border-t border-[#ECECF2] pt-3.5 md:grid-cols-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#848494]">
                        Step-by-Step Framework
                      </div>
                      <ol className="mt-2 space-y-1.5 text-xs text-[#525260]">
                        {q.frameworkSteps.map((st, idx) => (
                          <li key={idx} className="leading-snug">
                            <span className="font-mono font-semibold text-[#111118]">
                              {idx + 1}.
                            </span>{' '}
                            {st}
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                        Strong Hire Signals
                      </div>
                      <ul className="mt-2 space-y-1.5 text-xs text-emerald-950">
                        {q.strongHireSignals.map((sig, idx) => (
                          <li key={idx}>✓ {sig}</li>
                        ))}
                      </ul>
                      <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-rose-700">
                        Red Flags
                      </div>
                      <ul className="mt-1 space-y-1 text-xs text-rose-900">
                        {q.redFlags.map((rf, idx) => (
                          <li key={idx}>✕ {rf}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6E32F5]">
                        Escalating Follow-Up Probes
                      </div>
                      <ul className="mt-2 space-y-2 text-xs text-[#525260]">
                        {q.followUpProbes.map((pr, idx) => (
                          <li
                            key={idx}
                            className="rounded-lg border border-[#ECECF2] bg-[#FAFAFC] p-2 leading-snug"
                          >
                            &ldquo;{pr}&rdquo;
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      <QuestionModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingQuestion(null);
        }}
        initialQuestion={editingQuestion}
        initialNotes={editingQuestion ? state.questionNotes[editingQuestion.id] : undefined}
        defaultRole={roleFilter === 'all' ? 'fde' : roleFilter}
        onSave={(savedQ, initialNotes) => {
          if (editingQuestion) {
            updateCustomQuestion(savedQ);
          } else {
            addCustomQuestion(savedQ);
          }
          if (initialNotes) {
            updateQuestionNotes(savedQ.id, initialNotes);
          }
        }}
      />
    </div>
  );
}

export default function QuestionBankPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[60vh] items-center justify-center text-sm text-[#848494]">
          Loading Question Bank...
        </div>
      }
    >
      <QuestionBankInner />
    </Suspense>
  );
}
