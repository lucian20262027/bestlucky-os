'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Edit3,
  FileUp,
  Layers,
  Plus,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
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

function StoriesHubContent() {
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get('tab');
  const resolvedInitialTab: 'stories' | 'videos' | 'import' =
    initialTabParam === 'videos'
      ? 'videos'
      : initialTabParam === 'import'
        ? 'import'
        : 'stories';

  const { state, upsertStory, deleteStory } = useApp();
  const [activeTab, setActiveTab] = useState<'stories' | 'videos' | 'import'>(resolvedInitialTab);
  const [roleFilters, setRoleFilters] = useState<RoleTrack[]>([]);
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [editingStory, setEditingStory] = useState<StarStory | null>(null);
  const [metricsInput, setMetricsInput] = useState('');

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'videos') setActiveTab('videos');
    else if (t === 'import') setActiveTab('import');
    else setActiveTab('stories');
  }, [searchParams]);

  const themeCoverage = useMemo(() => {
    return BEHAVIORAL_THEMES.map((theme) => {
      const count = state.stories.filter((s) => s.competencies.includes(theme)).length;
      return { theme, count };
    });
  }, [state.stories]);

  const storyToQuestions = useMemo(() => {
    const map: Record<string, InterviewQuestion[]> = {};
    const allQ = getAllQuestions(state);
    allQ.forEach((q) => {
      const linked = state.questionNotes[q.id]?.linkedStoryIds ?? [];
      linked.forEach((sid) => {
        if (!map[sid]) map[sid] = [];
        map[sid].push(q);
      });
    });
    return map;
  }, [state]);

  const filteredStories = useMemo(() => {
    return state.stories.filter((s) => {
      if (roleFilters.length > 0 && !roleFilters.some((rf) => s.targetRoles.includes(rf))) {
        return false;
      }
      if (themeFilter !== 'all' && !s.competencies.includes(themeFilter)) return false;
      return true;
    });
  }, [state.stories, roleFilters, themeFilter]);

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
    setEditingStory(null);
  };

  const toggleItem = <T extends string>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter((i) => i !== val) : [...arr, val];

  const toggleFilterRole = (r: RoleTrack) => {
    setRoleFilters((prev) =>
      prev.includes(r) ? prev.filter((item) => item !== r) : [...prev, r]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header + 3 Sub-Tabs */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F3ECFF] px-3 py-1 text-[11px] font-semibold text-[#6E32F5]">
            <Layers className="h-3.5 w-3.5" />
            Story Bank · Videos · Lark Sync
          </div>
          <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-[#111118]">
            Story Bank &amp; Personal Knowledge Hub
          </h1>
          <p className="mt-1 text-sm text-[#525260]">
            统一管理你的 STAR+L 行为面故事、视频与课程资料（本地录像 / YouTube / B站），以及飞书一键导入内容。
          </p>
        </div>

        {activeTab === 'stories' && (
          <button
            type="button"
            onClick={() => openEditor()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white hover:opacity-95"
          >
            <Plus className="h-3.5 w-3.5" />
            New STAR+L Story
          </button>
        )}
      </div>

      {/* Sub-navigation Tabs (Unified with Questions) */}
      <div className="flex flex-wrap gap-2 border-b border-[#ECECF2] pb-3">
        <Link
          href="/questions"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#ECECF2] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#525260] transition hover:border-[#6E32F5]/40 hover:text-[#6E32F5]"
        >
          <BookOpen className="h-3.5 w-3.5" />
          题目库 (Questions)
        </Link>
        <button
          type="button"
          onClick={() => setActiveTab('stories')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === 'stories'
              ? 'bg-[#6E32F5] text-white shadow-xs'
              : 'border border-[#ECECF2] bg-white text-[#525260] hover:text-[#111118]'
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          STAR+L Stories ({state.stories.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('videos')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === 'videos'
              ? 'bg-[#6E32F5] text-white shadow-xs'
              : 'border border-[#ECECF2] bg-white text-[#525260] hover:text-[#111118]'
          }`}
        >
          <Video className="h-3.5 w-3.5" />
          Content &amp; Videos ({state.libraryItems.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('import')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === 'import'
              ? 'bg-[#6E32F5] text-white shadow-xs'
              : 'border border-[#ECECF2] bg-white text-[#525260] hover:text-[#111118]'
          }`}
        >
          <FileUp className="h-3.5 w-3.5" />
          Lark Import (飞书一键导入)
        </button>
      </div>

      {/* TAB 1: STAR+L Stories */}
      {activeTab === 'stories' && (
        <div className="space-y-6">
          {/* Competency Coverage Matrix */}
          <section className="rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#525260]">
                Behavioral Competency Coverage Matrix (Click to filter)
              </h2>
              {themeFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setThemeFilter('all')}
                  className="text-xs font-medium text-[#6E32F5] hover:underline"
                >
                  Show All Themes
                </button>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {themeCoverage.map(({ theme, count }) => {
                const active = themeFilter === theme;
                const covered = count > 0;
                return (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => setThemeFilter((prev) => (prev === theme ? 'all' : theme))}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                      active
                        ? 'border-[#6E32F5] bg-[#F3ECFF] font-semibold'
                        : covered
                          ? 'border-emerald-200 bg-emerald-50/40 text-emerald-950 hover:bg-emerald-50'
                          : 'border-amber-200 bg-amber-50/50 text-amber-950 hover:bg-amber-50'
                    }`}
                  >
                    <span className="truncate font-medium">{theme}</span>
                    <span className="ml-2 flex shrink-0 items-center gap-1 font-mono text-[11px]">
                      {covered ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          {count}
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                          Gap
                        </>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Multi-Select Role Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRoleFilters([])}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                roleFilters.length === 0
                  ? 'border-[#111118] bg-[#111118] text-white'
                  : 'border-[#ECECF2] bg-white text-[#525260]'
              }`}
            >
              All Stories ({state.stories.length})
            </button>
            {ROLE_LIST.map((r) => {
              const active = roleFilters.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggleFilterRole(r.id)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                    active
                      ? 'border-[#6E32F5] bg-[#6E32F5] text-white'
                      : 'border-[#ECECF2] bg-white text-[#525260]'
                  }`}
                >
                  {r.shortLabel}
                </button>
              );
            })}
          </div>

          {/* Stories List */}
          <div className="space-y-4">
            {filteredStories.map((story) => (
              <article
                key={story.id}
                className="rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-2xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
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
                          className="rounded-md border border-[#ECECF2] bg-[#FAFAFC] px-2 py-0.5 text-[10px] font-medium text-[#525260]"
                        >
                          {c}
                        </span>
                      ))}
                      {story.isTemplate && (
                        <span className="rounded bg-[#F3ECFF] px-2 py-0.5 text-[10px] font-medium text-[#6E32F5]">
                          Editable Starter Template
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 text-base font-semibold text-[#111118]">{story.title}</h2>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditor(story)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#ECECF2] px-3 py-1.5 text-xs font-medium text-[#111118] hover:bg-[#FAFAFC]"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteStory(story.id)}
                      className="rounded-lg border border-[#ECECF2] p-1.5 text-[#848494] hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {story.metrics.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {story.metrics.map((m, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-emerald-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-emerald-800"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    { label: 'S · Situation', val: story.situation },
                    { label: 'T · Task', val: story.task },
                    { label: 'A · Action (I did)', val: story.action },
                    { label: 'R · Result', val: story.result },
                    { label: 'L · Learning', val: story.learning },
                  ].map((blk) => (
                    <div
                      key={blk.label}
                      className="rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-3"
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#848494]">
                        {blk.label}
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-[#525260]">
                        {blk.val || '—'}
                      </p>
                    </div>
                  ))}
                </div>

                {Object.keys(story.roleFramings).length > 0 && (
                  <div className="mt-4 rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-3.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#525260]">
                      How to Pitch This Same Story by Interview Role
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

                {/* Covered Interview Questions (Bidirectional Link) */}
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#ECECF2] pt-3">
                  <span className="text-[11px] font-semibold text-[#848494]">
                    已覆盖真题 ({(storyToQuestions[story.id] ?? []).length}):
                  </span>
                  {(storyToQuestions[story.id] ?? []).length > 0 ? (
                    (storyToQuestions[story.id] ?? []).map((q) => (
                      <Link
                        key={q.id}
                        href={`/questions/${q.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#D4C5FD] bg-[#F9F6FF] px-2.5 py-1 text-[11px] font-medium text-[#6E32F5] transition hover:bg-[#F3ECFF]"
                      >
                        <BookOpen className="h-3 w-3" />
                        <span className="max-w-[240px] truncate">{q.title}</span>
                      </Link>
                    ))
                  ) : (
                    <span className="text-[11px] text-[#848494]">
                      尚未挂载真题（可在任意真题详情页右侧一键挂载此故事）
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-[#ECECF2] bg-white shadow-xl">
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
                  rows={3}
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
                    rows={2}
                    value={editingStory.result}
                    onChange={(e) => setEditingStory({ ...editingStory, result: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-[#ECECF2] p-2.5 text-xs focus:border-[#6E32F5] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#525260]">
                    Learning / What You’d Change Today
                  </label>
                  <textarea
                    rows={2}
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
