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
  const initialRoleParam = searchParams.get('role');
  const validInitialRole: RoleTrack | 'all' =
    initialRoleParam && ROLES_BY_ID[initialRoleParam as RoleTrack]
      ? (initialRoleParam as RoleTrack)
      : 'all';

  const {
    state,
    addCustomQuestion,
    updateCustomQuestion,
    deleteCustomQuestion,
    updateQuestionNotes,
    updateAISettings,
  } = useApp();

  const [roleFilters, setRoleFilters] = useState<RoleTrack[]>(
    validInitialRole === 'all' ? [] : [validInitialRole]
  );
  const [categoryFilter, setCategoryFilter] = useState<QuestionCategory | 'all'>('all');
  const [roundFilter, setRoundFilter] = useState<RoundType | 'all'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<QuestionStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<InterviewQuestion | null>(null);

  useEffect(() => {
    const paramRole = searchParams.get('role');
    if (paramRole && ROLES_BY_ID[paramRole as RoleTrack]) {
      setRoleFilters([paramRole as RoleTrack]);
    } else if (!paramRole) {
      setRoleFilters([]);
    }
  }, [searchParams]);

  const toggleRoleFilter = (r: RoleTrack) => {
    setRoleFilters((prev) =>
      prev.includes(r) ? prev.filter((item) => item !== r) : [...prev, r]
    );
  };

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
    const counts: Record<string, number> = { all: allQuestions.length };
    QUESTION_CATEGORIES.forEach((cat) => {
      counts[cat.id] = allQuestions.filter((q) => inferQuestionCategory(q) === cat.id).length;
    });
    return counts;
  }, [allQuestions]);

  const filteredQuestions = useMemo(() => {
    const qLower = search.trim().toLowerCase();
    return allQuestions.filter((item) => {
      if (roleFilters.length > 0) {
        const itemRoles = [item.role, ...item.secondaryRoles];
        if (!roleFilters.some((rf) => itemRoles.includes(rf))) return false;
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
    roleFilters,
    categoryFilter,
    roundFilter,
    difficultyFilter,
    statusFilter,
    search,
    state,
  ]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111118]">
            7-Track Question, Answer &amp; Video Bank
          </h1>
          <p className="mt-1 text-sm text-[#525260]">
            共 {allQuestions.length} 道实战题目。点击每道题的 <strong>Study &amp; Edit Answer</strong> 即可阅读参考范文、补充子题与文字答案、上传视频并 Publish。
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
            Hints: {state.aiSettings.language === 'en' ? 'EN Only' : 'EN + 中文提示'}
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
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white hover:opacity-95"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Q&amp;A / Video
          </button>
        </div>
      </div>

      {/* Unified Questions & Story Bank Switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#ECECF2] pb-3">
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#6E32F5] px-3.5 py-1.5 text-xs font-semibold text-white">
          <BookOpen className="h-3.5 w-3.5" />
          题目库 (Questions · {allQuestions.length})
        </span>
        <Link
          href="/stories"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#ECECF2] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#525260] transition hover:border-[#6E32F5]/40 hover:text-[#6E32F5]"
        >
          STAR+L 故事库 ({state.stories.length})
        </Link>
        <Link
          href="/stories?tab=videos"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#ECECF2] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#525260] transition hover:border-[#6E32F5]/40 hover:text-[#6E32F5]"
        >
          <Video className="h-3.5 w-3.5" />
          视频 &amp; 飞书导入
        </Link>
      </div>

      {/* Multi-select Track Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setRoleFilters([])}
          className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
            roleFilters.length === 0
              ? 'border-[#111118] bg-[#111118] text-white'
              : 'border-[#ECECF2] bg-white text-[#525260] hover:text-[#111118]'
          }`}
        >
          All Tracks ({roleCounts.all})
        </button>
        {ROLE_LIST.map((r) => {
          const active = roleFilters.includes(r.id);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => toggleRoleFilter(r.id)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? 'border-[#6E32F5] bg-[#6E32F5] text-white'
                  : 'border-[#ECECF2] bg-white text-[#525260] hover:text-[#111118]'
              }`}
            >
              {r.shortLabel} ({roleCounts[r.id] ?? 0})
            </button>
          );
        })}
        {roleFilters.length > 1 && (
          <span className="text-[11px] font-medium text-[#6E32F5]">
            Multi-selected ({roleFilters.length})
          </span>
        )}
      </div>

      {/* Question Category Pills (问题大类) */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setCategoryFilter('all')}
          className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
            categoryFilter === 'all'
              ? 'border-[#6E32F5] bg-[#F3ECFF] text-[#6E32F5]'
              : 'border-[#ECECF2] bg-white text-[#5E5E6E] hover:border-[#6E32F5]/40'
          }`}
        >
          All Categories ({categoryCounts.all})
        </button>
        {QUESTION_CATEGORIES.map((cat) => {
          const active = categoryFilter === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                active
                  ? 'border-[#6E32F5] bg-[#6E32F5] text-white'
                  : 'border-[#ECECF2] bg-white text-[#5E5E6E] hover:border-[#6E32F5]/40 hover:text-[#111118]'
              }`}
            >
              {cat.label} ({categoryCounts[cat.id] ?? 0})
            </button>
          );
        })}
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
          <option value="all">Any Mastery Status</option>
          <option value="unpracticed">Unpracticed</option>
          <option value="needs_drill">Needs Drill</option>
          <option value="mastered">Mastered</option>
        </select>
      </div>

      {/* Question Cards */}
      <div className="space-y-3.5">
        {filteredQuestions.length === 0 ? (
          <div className="rounded-2xl border border-[#ECECF2] bg-white p-10 text-center text-sm text-[#848494]">
            No questions match your current filters. Clear search or add a custom question!
          </div>
        ) : (
          filteredQuestions.map((q) => {
            const expanded = Boolean(expandedIds[q.id]);
            const progress = state.questionProgress[q.id];
            const status = progress?.status ?? 'unpracticed';
            const roleCfg = ROLES_BY_ID[q.role];
            const notes = state.questionNotes[q.id];
            const hasModel = Boolean(notes?.modelAnswer?.trim() || q.modelAnswer?.trim());
            const hasMy = Boolean(notes?.myAnswer?.trim());
            const hasVideo = Boolean(notes?.videoUrl?.trim() || notes?.localMediaId || q.videoUrl);
            const hasLark = Boolean(notes?.sourceUrl || q.sourceUrl);
            const subCount = notes?.customBlocks?.length ?? 0;

            return (
              <article
                key={q.id}
                className="rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-[0_1px_2px_rgba(16,16,24,0.03)] transition hover:border-[#D4C5FD]"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${roleBadgeClasses(
                          q.role
                        )}`}
                      >
                        {roleCfg.shortLabel}
                      </span>
                      {q.secondaryRoles.map((sr) => (
                        <span
                          key={sr}
                          className="rounded-md border border-[#ECECF2] bg-[#FAFAFC] px-1.5 py-0.5 text-[10px] font-medium text-[#525260]"
                        >
                          +{ROLES_BY_ID[sr].shortLabel}
                        </span>
                      ))}
                      {(() => {
                        const catMeta = getCategoryMeta(inferQuestionCategory(q));
                        return (
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${catMeta.badgeClass}`}
                          >
                            {catMeta.shortLabel}
                          </span>
                        );
                      })()}
                      <span className="rounded-md bg-[#FAFAFC] px-2 py-0.5 text-[11px] text-[#525260]">
                        {ROUND_LABELS[q.round].en}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#848494]">
                        <Clock className="h-3 w-3" />
                        {q.timeLimitMin}m · {q.difficulty.toUpperCase()} · {q.companyStyle}
                      </span>
                      {hasModel && (
                        <span className="inline-flex items-center gap-1 rounded bg-[#F3ECFF] px-1.5 py-0.5 text-[10px] font-medium text-[#6E32F5]">
                          <BookOpen className="h-2.5 w-2.5" />
                          Model Answer
                        </span>
                      )}
                      {hasMy && (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                          <FileText className="h-2.5 w-2.5" />
                          My Answer
                        </span>
                      )}
                      {hasVideo && (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                          <Video className="h-2.5 w-2.5" />
                          Video
                        </span>
                      )}
                      {subCount > 0 && (
                        <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                          +{subCount} blocks
                        </span>
                      )}
                      {hasLark && (
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                          Lark
                        </span>
                      )}
                      {status === 'mastered' && (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Mastered {progress?.bestScore ? `(${progress.bestScore}★)` : ''}
                        </span>
                      )}
                      {status === 'needs_drill' && (
                        <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          Needs Drill {progress?.bestScore ? `(${progress.bestScore}★)` : ''}
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/questions/${q.id}`}
                      className="block text-base font-semibold text-[#111118] hover:text-[#6E32F5]"
                    >
                      {q.title}
                    </Link>
                    {(() => {
                      const showAll = Boolean(expandedAnswers[q.id]);
                      const modelText = (notes?.modelAnswer || q.modelAnswer || '').trim();
                      const isLong = q.prompt.length > 220 || modelText.length > 0;
                      return (
                        <div className="space-y-2">
                          <p
                            className={`whitespace-pre-wrap text-[13px] leading-relaxed text-[#525260] ${
                              !showAll && q.prompt.length > 220 ? 'line-clamp-3' : ''
                            }`}
                          >
                            {q.prompt}
                          </p>
                          {modelText && (
                            <div className="rounded-xl border border-[#ECECF2] bg-[#FAFAFC] px-3.5 py-2.5">
                              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#6E32F5]">
                                Model / Reference Answer
                              </div>
                              <p
                                className={`whitespace-pre-wrap text-xs leading-relaxed text-[#2E2E3A] ${
                                  !showAll ? 'line-clamp-4' : ''
                                }`}
                              >
                                {modelText}
                              </p>
                            </div>
                          )}
                          {isLong && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedAnswers((prev) => ({
                                  ...prev,
                                  [q.id]: !prev[q.id],
                                }))
                              }
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[#6E32F5] hover:underline"
                            >
                              {showAll ? (
                                <>
                                  Collapse (收起) <ChevronUp className="h-3.5 w-3.5" />
                                </>
                              ) : (
                                <>
                                  Show All (展开完整回答) <ChevronDown className="h-3.5 w-3.5" />
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })()}
                    {state.aiSettings.language !== 'en' && (
                      <p className="rounded-lg bg-amber-50/70 px-3 py-1.5 text-xs text-amber-950">
                        {q.promptZhHint}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                    <Link
                      href={`/questions/${q.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#6E32F5] px-3.5 py-2 text-xs font-semibold text-white transition hover:opacity-95"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Study &amp; Edit Answer
                    </Link>
                    <Link
                      href={`/practice/${q.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#ECECF2] bg-[#FAFAFC] px-3.5 py-1.5 text-xs font-semibold text-[#111118] transition hover:border-[#6E32F5] hover:text-[#6E32F5]"
                    >
                      <Play className="h-3 w-3" />
                      Enter Mock Room
                    </Link>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleExpand(q.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#ECECF2] px-2.5 py-1 text-[11px] font-medium text-[#525260] hover:bg-[#FAFAFC]"
                      >
                        {expanded ? (
                          <>
                            Hide <ChevronUp className="h-3 w-3" />
                          </>
                        ) : (
                          <>
                            Rubric <ChevronDown className="h-3 w-3" />
                          </>
                        )}
                      </button>
                      {q.isCustom && (
                        <button
                          type="button"
                          onClick={() => deleteCustomQuestion(q.id)}
                          className="rounded-lg border border-[#ECECF2] p-1.5 text-[#848494] hover:border-rose-200 hover:text-rose-600"
                          title="Delete custom question"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {expanded && (
                  <div className="mt-4 grid gap-4 border-t border-[#ECECF2] pt-4 md:grid-cols-3">
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
        defaultRole={roleFilters[0] ?? 'fde'}
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
