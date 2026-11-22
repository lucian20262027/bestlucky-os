'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mic, Play, Shuffle, Sparkles } from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { getAllQuestions, getQuestionStatus, roleBadgeClasses } from '@/lib/helpers';
import { ROLE_LIST, ROLES_BY_ID, ROUND_LABELS } from '@/lib/roles';
import { RoleTrack } from '@/lib/types';

export default function PracticeLauncherPage() {
  const router = useRouter();
  const { state } = useApp();
  const [selectedRole, setSelectedRole] = useState<RoleTrack | 'all'>('all');

  const allQuestions = useMemo(() => getAllQuestions(state), [state]);

  const candidates = useMemo(() => {
    return allQuestions.filter((q) =>
      selectedRole === 'all'
        ? true
        : q.role === selectedRole || q.secondaryRoles.includes(selectedRole)
    );
  }, [allQuestions, selectedRole]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white px-3 py-1 text-[11px] font-medium text-[var(--ink-secondary)]">
            <Mic className="h-3.5 w-3.5 text-[var(--accent)]" />
            Interactive Split-Pane Interview Studio
          </div>
          <h1 className="mt-2.5 text-2xl font-semibold tracking-tight text-[var(--ink-primary)]">
            Mock Room Launcher
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-secondary)]">
            选择任意题目立即开始计时模拟（支持语音输入、7大岗位结构化草稿纸、可视化系统架构板、Bar-Raiser追问与逐句改写评分）。
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

      {/* Role Track Picker */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedRole('all')}
          className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
            selectedRole === 'all'
              ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-white'
              : 'border-[var(--border)] bg-white text-[var(--ink-secondary)]'
          }`}
        >
          All 7 Tracks
        </button>
        {ROLE_LIST.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSelectedRole(r.id)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
              selectedRole === r.id
                ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                : 'border-[var(--border)] bg-white text-[var(--ink-secondary)]'
            }`}
          >
            {r.shortLabel}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {candidates.map((q) => {
          const st = getQuestionStatus(state, q.id);
          return (
            <div
              key={q.id}
              className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-white p-5 shadow-2xs transition hover:border-black/20"
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
                    <span className="text-[11px] text-[var(--ink-muted)]">
                      {ROUND_LABELS[q.round].en} · {q.timeLimitMin}m
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-[var(--ink-muted)]">
                    {st === 'mastered'
                      ? '✓ Mastered'
                      : st === 'needs_drill'
                        ? '⚡ Needs Drill'
                        : 'New'}
                  </span>
                </div>
                <h2 className="mt-2.5 text-sm font-semibold text-[var(--ink-primary)]">
                  {q.title}
                </h2>
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--ink-secondary)]">
                  {q.prompt}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3">
                <span className="inline-flex items-center gap-1 text-[11px] text-[var(--ink-muted)]">
                  <Sparkles className="h-3 w-3 text-[var(--accent)]" />
                  {q.companyStyle}
                </span>
                <Link
                  href={`/practice/${q.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--ink-primary)] px-3.5 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  <Play className="h-3 w-3" />
                  Launch Room
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
