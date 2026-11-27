'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit3,
  Layers,
  Mic,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { BankHubTabs } from '@/components/BankHubTabs';
import { LarkImportPanel } from '@/components/LarkImportPanel';
import { LibraryPanel } from '@/components/LibraryPanel';
import { RoleMultiSelect } from '@/components/RoleMultiSelect';
import { getAllQuestions, roleBadgeClasses } from '@/lib/helpers';
import { BEHAVIORAL_THEMES, ROLE_LIST, ROLES_BY_ID } from '@/lib/roles';
import { InterviewQuestion, RoleTrack, StarStory } from '@/lib/types';

function createEmptyStory(): StarStory {
  return {
    id: `story-${Date.now()}`,
    title: '',
    competencies: ['0→1 Execution'],
    targetRoles: ['fde', 'fdpm'],
    situation: '',
    task: '',
    action: '',
    result: '',
    learning: '',
    roleFramings: {},
    metrics: [],
    isTemplate: false,
    updatedAt: new Date().toISOString(),
  };
}

function estimateStoryDuration(story: StarStory): { label: string; sweetSpot: boolean } {
  const combined = `${story.situation} ${story.task} ${story.action} ${story.result} ${story.learning}`;
  const words = combined.trim().split(/\s+/).filter(Boolean).length;
  const cjk = (combined.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const units = words + cjk * 0.5;
  if (units === 0) return { label: '0s', sweetSpot: false };
  const secs = Math.round((units / 135) * 60);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return {
    label: m > 0 ? `~${m}m ${s}s` : `~${s}s`,
    sweetSpot: secs >= 90 && secs <= 210,
  };
}

function StoriesHubContent() {
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get('tab');
  const resolvedInitialTab: 'stories' | 'videos' | 'import' =
    initialTabParam === 'videos'
      ? 'videos'
      : initialTabParam === 'import'
        ? 'import'
        : 'stories';

  const { state, upsertStory, deleteStory, updateQuestionNotes } = useApp();
  const [activeTab, setActiveTab] = useState<'stories' | 'videos' | 'import'>(resolvedInitialTab);
  const [roleFilters, setRoleFilters] = useState<RoleTrack[]>([]);
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStoryIds, setExpandedStoryIds] = useState<Record<string, boolean>>({});
  const [editingStory, setEditingStory] = useState<StarStory | null>(null);
  const [metricsInput, setMetricsInput] = useState('');

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'videos') setActiveTab('videos');
    else if (t === 'import') setActiveTab('import');
    else setActiveTab('stories');
  }, [searchParams]);

  // Escape closes Story Editor modal cleanly
  useEffect(() => {
    if (!editingStory) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditingStory(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingStory]);

  const allQuestions = useMemo(() => getAllQuestions(state), [state]);

  const themeCoverage = useMemo(() => {
    return BEHAVIORAL_THEMES.map((theme) => {
      const count = state.stories.filter((s) => s.competencies.includes(theme)).length;
      return { theme, count };
    });
  }, [state.stories]);

  const storyToQuestions = useMemo(() => {
    const map: Record<string, InterviewQuestion[]> = {};
    allQuestions.forEach((q) => {
      const linked = state.questionNotes[q.id]?.linkedStoryIds ?? [];
      linked.forEach((sid) => {
        if (!map[sid]) map[sid] = [];
        map[sid].push(q);
      });
    });
    return map;
  }, [allQuestions, state.questionNotes]);

  const filteredStories = useMemo(() => {
    const qLower = searchQuery.trim().toLowerCase();
    return state.stories.filter((s) => {
      if (roleFilters.length > 0 && !roleFilters.some((rf) => s.targetRoles.includes(rf))) {
        return false;
      }
      if (themeFilter !== 'all' && !s.competencies.includes(themeFilter)) return false;
      if (qLower) {
        const hay = `${s.title} ${s.metrics.join(' ')} ${s.competencies.join(' ')} ${
          s.situation
        } ${s.task} ${s.action} ${s.result} ${s.learning}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      return true;
    });
  }, [state.stories, roleFilters, themeFilter, searchQuery]);

  // Expand the first visible story by default when user hasn't toggled yet
  const isStoryExpanded = (storyId: string, index: number) => {
    if (storyId in expandedStoryIds) return expandedStoryIds[storyId];
    return index === 0;
  };

  const toggleExpandStory = (storyId: string, current: boolean) => {
    setExpandedStoryIds((prev) => ({ ...prev, [storyId]: !current }));
  };

  const handleExpandAll = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    filteredStories.forEach((s) => {
      next[s.id] = expand;
    });
    setExpandedStoryIds(next);
  };

  const openEditor = (story?: StarStory) => {
    const target = story
      ? { ...story, roleFramings: { ...story.roleFramings } }
      : createEmptyStory();
    setEditingStory(target);
    setMetricsInput(target.metrics.join(', '));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStory || !editingStory.title.trim()) return;
    const metrics = metricsInput
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    upsertStory({
      ...editingStory,
      title: editingStory.title.trim(),
      metrics,
      isTemplate: false,
      updatedAt: new Date().toISOString(),
    });
    setExpandedStoryIds((prev) => ({ ...prev, [editingStory.id]: true }));
    setEditingStory(null);
  };

  const handleDeleteStory = (story: StarStory) => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Delete STAR+L story "${story.title}"? This cannot be undone.`)
    ) {
      return;
    }
    deleteStory(story.id);
  };

  const handleLinkQuestion = (storyId: string, questionId: string) => {
    if (!questionId) return;
    const existing = state.questionNotes[questionId]?.linkedStoryIds ?? [];
    if (existing.includes(storyId)) return;
    updateQuestionNotes(questionId, {
      linkedStoryIds: [...existing, storyId],
    });
  };

  const handleUnlinkQuestion = (storyId: string, questionId: string) => {
    const existing = state.questionNotes[questionId]?.linkedStoryIds ?? [];
    updateQuestionNotes(questionId, {
      linkedStoryIds: existing.filter((x) => x !== storyId),
    });
  };

  const toggleItem = <T extends string>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter((i) => i !== val) : [...arr, val];

  const toggleFilterRole = (r: RoleTrack) => {
    setRoleFilters((prev) =>
      prev.includes(r) ? prev.filter((item) => item !== r) : [...prev, r]
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#6E32F5]">
            <Layers className="h-3.5 w-3.5" />
            <span>Story Bank &amp; Personal Library</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111118]">
            STAR+L Story Cue Cards
          </h1>
          <p className="mt-1 text-sm text-[#525260]">
            Structure quantified behavioral stories, track speaking pacing, and map stories directly to interview prompts.
          </p>
        </div>

        {activeTab === 'stories' && (
          <button
            type="button"
            onClick={() => openEditor()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5B24D6]"
          >
            <Plus className="h-3.5 w-3.5" />
            New STAR+L Story
          </button>
        )}
      </div>

      {/* Shared Hub Switcher */}
      <BankHubTabs
        active={activeTab}
        questionCount={allQuestions.length}
        storyCount={state.stories.length}
        libraryCount={state.libraryItems.length}
        onSelectStoriesTab={setActiveTab}
      />

      {/* TAB 1: STAR+L Stories */}
      {activeTab === 'stories' && (
        <div className="space-y-5">
          {/* Compact Competency Coverage Bar */}
          <section className="rounded-2xl border border-[#ECECF2] bg-white p-4 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#525260]">
                Competency Coverage (Click to filter)
              </span>
              {themeFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setThemeFilter('all')}
                  className="text-xs font-medium text-[#6E32F5] hover:underline"
                >
                  Clear Theme
                </button>
              )}
            </div>

            <div className="mt-2.5 flex flex-wrap gap-2">
              {themeCoverage.map(({ theme, count }) => {
                const active = themeFilter === theme;
                const covered = count > 0;
                return (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => setThemeFilter((prev) => (prev === theme ? 'all' : theme))}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition ${
                      active
                        ? 'border-[#6E32F5] bg-[#F4EFFF] font-semibold text-[#5D26D9]'
                        : covered
                          ? 'border-[#ECECF2] bg-[#FAFAFC] text-[#111118] hover:border-[#D4C5FD]'
                          : 'border-amber-200 bg-amber-50/50 text-amber-900 hover:bg-amber-50'
                    }`}
                  >
                    {covered ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                    )}
                    <span>{theme}</span>
                    <span className="font-mono text-[11px] text-[#6C6C7D]">
                      {covered ? count : '0'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Search + Role Filter + Expand/Collapse Controls */}
          <div className="flex flex-col gap-3 rounded-2xl border border-[#ECECF2] bg-white p-3.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRoleFilters([])}
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  roleFilters.length === 0
                    ? 'border-[#111118] bg-[#111118] text-white'
                    : 'border-[#ECECF2] bg-white text-[#525260] hover:text-[#111118]'
                }`}
              >
                All ({state.stories.length})
              </button>
              {ROLE_LIST.map((r) => {
                const active = roleFilters.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleFilterRole(r.id)}
                    className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${
                      active
                        ? 'border-[#111118] bg-[#111118] text-white'
                        : 'border-[#ECECF2] bg-white text-[#525260] hover:border-[#D4C5FD]'
                    }`}
                  >
                    {r.shortLabel}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1 lg:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#848494]" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search stories, metrics, STAR..."
                  className="w-full rounded-lg border border-[#ECECF2] bg-[#FAFAFC] py-1.5 pl-8 pr-3 text-xs focus:border-[#6E32F5] focus:bg-white focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => handleExpandAll(true)}
                className="rounded-lg border border-[#ECECF2] px-2.5 py-1.5 text-xs font-medium text-[#525260] hover:text-[#111118]"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={() => handleExpandAll(false)}
                className="rounded-lg border border-[#ECECF2] px-2.5 py-1.5 text-xs font-medium text-[#525260] hover:text-[#111118]"
              >
                Collapse All
              </button>
            </div>
          </div>

          {/* Expandable Cue Card Stories */}
          {filteredStories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#DCDCE6] bg-white p-10 text-center text-sm text-[#848494]">
              No stories match your search or filters. Clear filters or create a new STAR+L story.
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredStories.map((story, idx) => {
                const expanded = isStoryExpanded(story.id, idx);
                const duration = estimateStoryDuration(story);
                const linkedQuestions = storyToQuestions[story.id] ?? [];
                const linkedQIds = new Set(linkedQuestions.map((q) => q.id));

                return (
                  <article
                    key={story.id}
                    className="rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-2xs transition hover:border-[#D4C5FD]"
                  >
                    {/* Always-Visible Cue Card Header */}
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {story.targetRoles.map((r) => (
                            <span
                              key={r}
                              className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${roleBadgeClasses(
                                r
                              )}`}
                            >
                              {ROLES_BY_ID[r].shortLabel}
                            </span>
                          ))}
                          {story.competencies.map((c) => (
                            <span
                              key={c}
                              className="rounded-md bg-[#F4F4F8] px-2 py-0.5 text-[10px] font-medium text-[#525260]"
                            >
                              {c}
                            </span>
                          ))}
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
                              duration.sweetSpot
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-[#F4F4F8] text-[#525260]'
                            }`}
                            title="Estimated spoken pacing (sweet spot: 1m30s–3m30s)"
                          >
                            <Clock className="h-2.5 w-2.5" />
                            {duration.label}
                          </span>
                          {story.isTemplate && (
                            <span className="rounded bg-[#F4EFFF] px-2 py-0.5 text-[10px] font-medium text-[#5D26D9]">
                              Starter Template
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleExpandStory(story.id, expanded)}
                          className="block text-left text-base font-semibold text-[#111118] hover:text-[#6E32F5]"
                        >
                          {story.title}
                        </button>

                        {story.metrics.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {story.metrics.map((m, i) => (
                              <span
                                key={i}
                                className="rounded-md bg-emerald-50 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-800"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        )}

                        {!expanded && (story.result || story.action) && (
                          <p className="line-clamp-1 text-xs text-[#525260]">
                            <span className="font-semibold text-[#111118]">Result:</span>{' '}
                            {story.result || story.action}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleExpandStory(story.id, expanded)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs font-medium text-[#525260] hover:text-[#111118]"
                        >
                          {expanded ? (
                            <>
                              Collapse <ChevronUp className="h-3.5 w-3.5" />
                            </>
                          ) : (
                            <>
                              Read Cue Card <ChevronDown className="h-3.5 w-3.5" />
                            </>
                          )}
                        </button>
                        <Link
                          href="/practice?mode=coach"
                          className="inline-flex items-center gap-1 rounded-lg border border-[#D4C5FD] bg-[#F9F6FF] px-2.5 py-1.5 text-xs font-semibold text-[#5D26D9] hover:bg-[#F3ECFF]"
                        >
                          <Mic className="h-3.5 w-3.5" />
                          Practice
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEditor(story)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#ECECF2] px-2.5 py-1.5 text-xs font-medium text-[#111118] hover:bg-[#FAFAFC]"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStory(story)}
                          className="rounded-lg border border-[#ECECF2] p-1.5 text-[#848494] hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                          title="Delete story"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Hierarchical Reading Layout */}
                    {expanded && (
                      <div className="mt-4 space-y-3 border-t border-[#F0F0F5] pt-4">
                        {/* Row 1: Situation + Task */}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-3.5">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6C6C7D]">
                              S · Situation
                            </div>
                            <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-[#2E2E3A]">
                              {story.situation || '—'}
                            </p>
                          </div>
                          <div className="rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-3.5">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6C6C7D]">
                              T · Task (Your Ownership)
                            </div>
                            <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-[#2E2E3A]">
                              {story.task || '—'}
                            </p>
                          </div>
                        </div>

                        {/* Row 2: Full-width Action */}
                        <div className="rounded-xl border border-[#E2D4FF] bg-[#FAF8FF] p-4">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#5D26D9]">
                            A · Action (Decisions, Trade-offs &amp; Execution)
                          </div>
                          <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-[#111118]">
                            {story.action || '—'}
                          </p>
                        </div>

                        {/* Row 3: Result + Learning */}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
                              R · Result (Quantified Impact)
                            </div>
                            <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-[#111118]">
                              {story.result || '—'}
                            </p>
                          </div>
                          <div className="rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-3.5">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6C6C7D]">
                              L · Learning
                            </div>
                            <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-[#2E2E3A]">
                              {story.learning || '—'}
                            </p>
                          </div>
                        </div>

                        {/* Role-Specific Pitch Angles */}
                        {Object.keys(story.roleFramings).length > 0 && (
                          <div className="rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-3.5">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#525260]">
                              Role-Specific Framing Hooks
                            </div>
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                              {Object.entries(story.roleFramings).map(([roleKey, hook]) => {
                                if (!hook) return null;
                                const r = roleKey as RoleTrack;
                                return (
                                  <div
                                    key={r}
                                    className="rounded-lg bg-white p-2.5 text-xs ring-1 ring-[#ECECF2]"
                                  >
                                    <span
                                      className={`mr-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${roleBadgeClasses(
                                        r
                                      )}`}
                                    >
                                      {ROLES_BY_ID[r].shortLabel}
                                    </span>
                                    <span className="text-[#525260]">{hook}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Bidirectional Prompt Linker */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F0F0F5] pt-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-[#6C6C7D]">
                              Mapped Prompts ({linkedQuestions.length}):
                            </span>
                            {linkedQuestions.map((q) => (
                              <span
                                key={q.id}
                                className="inline-flex items-center gap-1 rounded-lg border border-[#D4C5FD] bg-[#F9F6FF] px-2 py-0.5 text-[11px] font-medium text-[#5D26D9]"
                              >
                                <Link
                                  href={`/questions/${q.id}`}
                                  className="inline-flex items-center gap-1 hover:underline"
                                >
                                  <BookOpen className="h-3 w-3" />
                                  <span className="max-w-[200px] truncate">{q.title}</span>
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleUnlinkQuestion(story.id, q.id)}
                                  className="ml-0.5 text-[#848494] hover:text-rose-600"
                                  title="Unlink prompt"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>

                          <select
                            value=""
                            onChange={(e) => handleLinkQuestion(story.id, e.target.value)}
                            aria-label={`Map prompt to ${story.title}`}
                            className="max-w-[240px] rounded-lg border border-[#ECECF2] bg-[#FAFAFC] px-2.5 py-1 text-[11px] text-[#111118] focus:border-[#6E32F5] focus:bg-white focus:outline-none"
                          >
                            <option value="">+ Map to a question...</option>
                            {allQuestions
                              .filter((q) => !linkedQIds.has(q.id))
                              .map((q) => (
                                <option key={q.id} value={q.id}>
                                  {ROLES_BY_ID[q.role].shortLabel}: {q.title}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Content & Videos */}
      {activeTab === 'videos' && (
        <LibraryPanel onSwitchToImport={() => setActiveTab('import')} />
      )}

      {/* TAB 3: Lark Import */}
      {activeTab === 'import' && (
        <LarkImportPanel onSwitchToVideos={() => setActiveTab('videos')} />
      )}

      {/* Story Editor Modal */}
      {editingStory && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingStory(null);
          }}
        >
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-[#ECECF2] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#ECECF2] px-6 py-4">
              <h2 className="text-base font-semibold text-[#111118]">STAR+L Story Editor</h2>
              <button
                type="button"
                onClick={() => setEditingStory(null)}
                className="rounded-lg p-1 text-[#848494] hover:bg-[#FAFAFC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="flex-1 space-y-4 overflow-y-auto px-6 py-5"
            >
              <div>
                <label className="block text-xs font-medium text-[#525260]">Story Title *</label>
                <input
                  required
                  value={editingStory.title}
                  onChange={(e) => setEditingStory({ ...editingStory, title: e.target.value })}
                  placeholder="e.g., Shipping Enterprise AI Triage Under Dirty SAP Exports"
                  className="mt-1 w-full rounded-lg border border-[#ECECF2] px-3 py-2 text-xs focus:border-[#6E32F5] focus:outline-none"
                />
              </div>

              <div className="rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-3">
                <RoleMultiSelect
                  label="Target Roles"
                  selected={editingStory.targetRoles}
                  onChange={(nextRoles) =>
                    setEditingStory({ ...editingStory, targetRoles: nextRoles })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#525260]">
                  Behavioral Competencies
                </label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {BEHAVIORAL_THEMES.map((theme) => {
                    const active = editingStory.competencies.includes(theme);
                    return (
                      <button
                        key={theme}
                        type="button"
                        onClick={() =>
                          setEditingStory({
                            ...editingStory,
                            competencies: toggleItem(editingStory.competencies, theme),
                          })
                        }
                        className={`rounded-md border px-2.5 py-1 text-[11px] font-medium ${
                          active
                            ? 'border-[#111118] bg-[#111118] text-white'
                            : 'border-[#ECECF2] bg-white text-[#525260]'
                        }`}
                      >
                        {theme}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#525260]">
                  Headline Metrics (Comma-separated)
                </label>
                <input
                  value={metricsInput}
                  onChange={(e) => setMetricsInput(e.target.value)}
                  placeholder="e.g., 74% -> 94% accuracy, $480K ARR, -55% cycle time"
                  className="mt-1 w-full rounded-lg border border-[#ECECF2] px-3 py-2 font-mono text-xs focus:border-[#6E32F5] focus:outline-none"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-[#525260]">Situation</label>
                  <textarea
                    rows={3}
                    value={editingStory.situation}
                    onChange={(e) =>
                      setEditingStory({ ...editingStory, situation: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-[#ECECF2] p-2.5 text-xs focus:border-[#6E32F5] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#525260]">
                    Task (Your exact ownership)
                  </label>
                  <textarea
                    rows={3}
                    value={editingStory.task}
                    onChange={(e) => setEditingStory({ ...editingStory, task: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-[#ECECF2] p-2.5 text-xs focus:border-[#6E32F5] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#525260]">
                  Action (Use &ldquo;I&rdquo;, highlight specific decisions &amp; trade-offs)
                </label>
                <textarea
                  rows={4}
                  value={editingStory.action}
                  onChange={(e) => setEditingStory({ ...editingStory, action: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#ECECF2] p-2.5 text-xs focus:border-[#6E32F5] focus:outline-none"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-[#525260]">
                    Result (Quantified impact)
                  </label>
                  <textarea
                    rows={3}
                    value={editingStory.result}
                    onChange={(e) => setEditingStory({ ...editingStory, result: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-[#ECECF2] p-2.5 text-xs focus:border-[#6E32F5] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#525260]">
                    Learning / What You&apos;d Change Today
                  </label>
                  <textarea
                    rows={3}
                    value={editingStory.learning}
                    onChange={(e) =>
                      setEditingStory({ ...editingStory, learning: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-[#ECECF2] p-2.5 text-xs focus:border-[#6E32F5] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#525260]">
                  Role-Specific Framing Hooks (Optional 1-liners)
                </label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {editingStory.targetRoles.map((r) => (
                    <div key={r}>
                      <label className="block text-[11px] font-medium text-[#848494]">
                        {ROLES_BY_ID[r].shortLabel} Angle
                      </label>
                      <input
                        value={editingStory.roleFramings[r] ?? ''}
                        onChange={(e) =>
                          setEditingStory({
                            ...editingStory,
                            roleFramings: { ...editingStory.roleFramings, [r]: e.target.value },
                          })
                        }
                        placeholder={`What to emphasize for ${ROLES_BY_ID[r].shortLabel}...`}
                        className="mt-1 w-full rounded-lg border border-[#ECECF2] px-2.5 py-1.5 text-xs focus:border-[#6E32F5] focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#ECECF2] pt-3">
                <button
                  type="button"
                  onClick={() => setEditingStory(null)}
                  className="rounded-lg border border-[#ECECF2] px-4 py-2 text-xs font-medium text-[#525260]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white"
                >
                  Save Story
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StoriesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[60vh] items-center justify-center text-sm text-[#848494]">
          Loading Story Bank...
        </div>
      }
    >
      <StoriesHubContent />
    </Suspense>
  );
}
