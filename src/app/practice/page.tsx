'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Layers,
  Mic,
  Play,
  Search,
  Shuffle,
  Sparkles,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { VoiceCoachPanel } from '@/components/VoiceCoachPanel';
import { getAllQuestions, getQuestionStatus, roleBadgeClasses } from '@/lib/helpers';
import { ROLE_LIST, ROLES_BY_ID, ROUND_LABELS } from '@/lib/roles';
import { RoleTrack } from '@/lib/types';

type PracticeTab = 'voice' | 'mock';

export default function PracticeLauncherPage() {
  const router = useRouter();
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState<PracticeTab>('voice');
  const [selectedRole, setSelectedRole] = useState<RoleTrack | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const allQuestions = useMemo(() => getAllQuestions(state), [state]);
  const [voiceQuestionId, setVoiceQuestionId] = useState<string>(
    allQuestions[0]?.id ?? 'custom'
  );
  const [customTopic, setCustomTopic] = useState(
    'Tell me about a complex AI or cross-functional system you shipped from 0 to 1.'
  );

  const selectedVoiceQuestion = useMemo(
    () => allQuestions.find((q) => q.id === voiceQuestionId) ?? null,
    [allQuestions, voiceQuestionId]
  );

  const candidates = useMemo(() => {
    const qLower = searchQuery.trim().toLowerCase();
    return allQuestions.filter((q) => {
      const roleMatch =
        selectedRole === 'all'
          ? true
          : q.role === selectedRole || q.secondaryRoles.includes(selectedRole);
      if (!roleMatch) return false;
      if (!qLower) return true;
      return (
        q.title.toLowerCase().includes(qLower) ||
        q.prompt.toLowerCase().includes(qLower) ||
        q.companyStyle.toLowerCase().includes(qLower)
      );
    });
  }, [allQuestions, selectedRole, searchQuery]);

  const launchRandomPriority = () => {
    const rank = { needs_drill: 0, unpracticed: 1, mastered: 2 };
    const sorted = [...candidates].sort(
      (a, b) => rank[getQuestionStatus(state, a.id)] - rank[getQuestionStatus(state, b.id)]
    );
    const topPool = sorted.slice(0, Math.min(4, sorted.length));
    const pick = topPool[Math.floor(Math.random() * topPool.length)] ?? allQuestions[0];
    if (pick) {
      router.push(`/practice/${pick.id}`);
    }
  };

  const openInVoiceCoach = (questionId: string) => {
    setVoiceQuestionId(questionId);
    setActiveTab('voice');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white px-3 py-1 text-[11px] font-medium text-[var(--ink-secondary)]">
            <Mic className="h-3.5 w-3.5 text-[var(--accent)]" />
            Practice &amp; Voice Studio
          </div>
          <h1 className="mt-2.5 text-2xl font-semibold tracking-tight text-[var(--ink-primary)]">
            Interview Practice &amp; AI Voice Coach
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-secondary)]">
            支持实时英文语音开口练习、AI 结构/语速/高级词润色，以及 7 大岗位分屏计时 Mock Room。
          </p>
        </div>

        <button
          type="button"
          onClick={launchRandomPriority}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:opacity-95"
        >
          <Shuffle className="h-4 w-4" />
          Random High-Priority Drill
        </button>
      </div>

      {/* Mode Switcher */}
      <div className="inline-flex flex-wrap items-center gap-1.5 rounded-2xl border border-[#ECECF2] bg-white p-1.5 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('voice')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === 'voice'
              ? 'bg-[#6E32F5] text-white shadow-xs'
              : 'text-[#5E5E6E] hover:bg-[#F7F7FA] hover:text-[#111118]'
          }`}
        >
          <Mic className="h-3.5 w-3.5" />
          AI 语音开口教练
          <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] ${
              activeTab === 'voice'
                ? 'bg-white/20 text-white'
                : 'bg-[#F3ECFF] text-[#6E32F5]'
            }`}
          >
            Voice + 润色
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('mock')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === 'mock'
              ? 'bg-[#6E32F5] text-white shadow-xs'
              : 'text-[#5E5E6E] hover:bg-[#F7F7FA] hover:text-[#111118]'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Mock Room 题库模拟 ({allQuestions.length})
        </button>
      </div>

      {/* TAB 1: Voice Coach Studio */}
      {activeTab === 'voice' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[#111118]">
                  选择要开口作答的面试题（或自定义话题）
                </h2>
                <p className="text-xs text-[#848494]">
                  选好题目后点击下方 Start Speaking，系统会自动录音、转写英文并生成 Senior/Staff 润色版。
                </p>
              </div>

              <select
                value={voiceQuestionId}
                onChange={(e) => setVoiceQuestionId(e.target.value)}
                className="w-full max-w-md rounded-xl border border-[#ECECF2] bg-[#FAFAFC] px-3 py-2 text-xs font-medium text-[#111118] focus:border-[#6E32F5] focus:bg-white focus:outline-none"
              >
                <option value="custom">✨ 自定义英文口述话题 (Custom Prompt)</option>
                {allQuestions.map((q) => (
                  <option key={q.id} value={q.id}>
                    [{ROLES_BY_ID[q.role].shortLabel}] {q.title}
                  </option>
                ))}
              </select>
            </div>

            {voiceQuestionId === 'custom' ? (
              <div className="mt-3">
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="输入你想练习的英文面试问题或 Elevator Pitch..."
                  className="w-full rounded-xl border border-[#ECECF2] bg-[#FAFAFC] px-3.5 py-2.5 text-xs text-[#111118] focus:border-[#6E32F5] focus:bg-white focus:outline-none"
                />
              </div>
            ) : (
              selectedVoiceQuestion && (
                <div className="mt-3.5 rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${roleBadgeClasses(
                          selectedVoiceQuestion.role
                        )}`}
                      >
                        {ROLES_BY_ID[selectedVoiceQuestion.role].shortLabel}
                      </span>
                      <span className="text-[11px] text-[#848494]">
                        {ROUND_LABELS[selectedVoiceQuestion.round].en} ·{' '}
                        {selectedVoiceQuestion.companyStyle}
                      </span>
                    </div>
                    <Link
                      href={`/practice/${selectedVoiceQuestion.id}`}
                      className="text-[11px] font-semibold text-[#6E32F5] hover:underline"
                    >
                      切换到分屏 Mock Room →
                    </Link>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-[#111118]">
                    {selectedVoiceQuestion.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#5E5E6E]">
                    {selectedVoiceQuestion.prompt}
                  </p>
                </div>
              )
            )}
          </div>

          <VoiceCoachPanel
            questionTitle={
              selectedVoiceQuestion ? selectedVoiceQuestion.title : customTopic || 'Custom Speech Drill'
            }
          />
        </div>
      )}

      {/* TAB 2: Mock Room Launcher */}
      {activeTab === 'mock' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ECECF2] bg-white p-4 shadow-2xs">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedRole('all')}
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  selectedRole === 'all'
                    ? 'border-[#111118] bg-[#111118] text-white'
                    : 'border-[#ECECF2] bg-white text-[#5E5E6E] hover:border-[#6E32F5]/40'
                }`}
              >
                All 7 Tracks
              </button>
              {ROLE_LIST.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRole(r.id)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                    selectedRole === r.id
                      ? 'border-[#6E32F5] bg-[#6E32F5] text-white'
                      : 'border-[#ECECF2] bg-white text-[#5E5E6E] hover:border-[#6E32F5]/40'
                  }`}
                >
                  {r.shortLabel}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#848494]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索题目、公司或关键词..."
                className="w-full rounded-xl border border-[#ECECF2] bg-[#FAFAFC] py-1.5 pl-8 pr-3 text-xs text-[#111118] focus:border-[#6E32F5] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {candidates.map((q) => {
              const st = getQuestionStatus(state, q.id);
              return (
                <div
                  key={q.id}
                  className="flex flex-col justify-between rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-2xs transition hover:border-[#6E32F5]/40"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${roleBadgeClasses(
                            q.role
                          )}`}
                        >
                          {ROLES_BY_ID[q.role].shortLabel}
                        </span>
                        <span className="text-[11px] text-[#848494]">
                          {ROUND_LABELS[q.round].en} · {q.timeLimitMin}m
                        </span>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          st === 'mastered'
                            ? 'bg-emerald-50 text-emerald-700'
                            : st === 'needs_drill'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-[#F7F7FA] text-[#848494]'
                        }`}
                      >
                        {st === 'mastered'
                          ? '✓ Mastered'
                          : st === 'needs_drill'
                            ? '⚡ Needs Drill'
                            : 'New'}
                      </span>
                    </div>
                    <h2 className="mt-2.5 text-sm font-semibold text-[#111118]">
                      {q.title}
                    </h2>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#5E5E6E]">
                      {q.prompt}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#ECECF2] pt-3">
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#848494]">
                      <Sparkles className="h-3 w-3 text-[#6E32F5]" />
                      {q.companyStyle}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openInVoiceCoach(q.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#D4C5FD] bg-[#F9F6FF] px-2.5 py-1.5 text-xs font-semibold text-[#6E32F5] transition hover:bg-[#F3ECFF]"
                      >
                        <Mic className="h-3 w-3" />
                        语音练习
                      </button>
                      <Link
                        href={`/practice/${q.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#111118] px-3.5 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                      >
                        <Play className="h-3 w-3" />
                        Launch Room
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
