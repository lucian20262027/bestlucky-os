'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Award,
  ChevronDown,
  ChevronUp,
  Clock,
  History as HistoryIcon,
  Play,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { formatDuration, roleBadgeClasses } from '@/lib/helpers';
import { PERSONA_CONFIGS, ROLE_LIST, ROLES_BY_ID, ROUND_LABELS } from '@/lib/roles';
import { RoleTrack } from '@/lib/types';

export default function HistoryPage() {
  const { state } = useApp();
  const [roleFilter, setRoleFilter] = useState<RoleTrack | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredSessions = useMemo(() => {
    return state.sessions.filter((s) =>
      roleFilter === 'all' ? true : s.role === roleFilter
    );
  }, [state.sessions, roleFilter]);

  const evaluatedSessions = filteredSessions.filter((s) => s.evaluation);
  const avgScore =
    evaluatedSessions.length > 0
      ? (
          evaluatedSessions.reduce(
            (sum, s) => sum + (s.evaluation?.overallScore ?? 0),
            0
          ) / evaluatedSessions.length
        ).toFixed(1)
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white px-3 py-1 text-[11px] font-medium text-[var(--ink-secondary)]">
            <HistoryIcon className="h-3.5 w-3.5 text-[var(--accent)]" />
            Transcripts · Scratchpads · Scorecards
          </div>
          <h1 className="mt-2.5 text-2xl font-semibold tracking-tight text-[var(--ink-primary)]">
            Session History & Progress Log
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-secondary)]">
            每一次模拟对话、草稿结构、评分维度与「Strong Hire 改写建议」都会自动沉淀在这里。
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white px-4 py-2.5">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
              Sessions
            </div>
            <div className="font-mono text-base font-bold text-[var(--ink-primary)]">
              {filteredSessions.length}
            </div>
          </div>
          <div className="h-7 w-px bg-[var(--border)]" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
              Avg Score
            </div>
            <div className="font-mono text-base font-bold text-[var(--accent)]">
              {avgScore ? `${avgScore} / 5.0` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Role Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRoleFilter('all')}
          className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
            roleFilter === 'all'
              ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-white'
              : 'border-[var(--border)] bg-white text-[var(--ink-secondary)]'
          }`}
        >
          All Tracks ({state.sessions.length})
        </button>
        {ROLE_LIST.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRoleFilter(r.id)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
              roleFilter === r.id
                ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                : 'border-[var(--border)] bg-white text-[var(--ink-secondary)]'
            }`}
          >
            {r.shortLabel}
          </button>
        ))}
      </div>

      {/* Session List */}
      {filteredSessions.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white p-12 text-center">
          <Award className="mx-auto h-8 w-8 text-[var(--ink-muted)]" />
          <h2 className="mt-3 text-base font-semibold text-[var(--ink-primary)]">
            No Mock Sessions Saved Yet
          </h2>
          <p className="mt-1 text-xs text-[var(--ink-secondary)]">
            Open any question in the Mock Room, run a couple of turns, and click Evaluate & Score to record your progress.
          </p>
          <Link
            href="/practice"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[var(--ink-primary)] px-4 py-2 text-xs font-semibold text-white"
          >
            <Play className="h-3.5 w-3.5" />
            Launch Your First Mock
          </Link>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredSessions.map((sess) => {
            const expanded = expandedId === sess.id;
            const roleCfg = ROLES_BY_ID[sess.role];
            const candidateTurnCount = sess.messages.filter((m) => m.sender === 'candidate').length;
            return (
              <article
                key={sess.id}
                className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-2xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${roleBadgeClasses(
                          sess.role
                        )}`}
                      >
                        {roleCfg.shortLabel}
                      </span>
                      <span className="text-[11px] text-[var(--ink-muted)]">
                        {ROUND_LABELS[sess.round]?.en ?? sess.round} ·{' '}
                        {PERSONA_CONFIGS[sess.persona]?.label ?? sess.persona}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--ink-muted)]">
                        <Clock className="h-3 w-3" />
                        {formatDuration(sess.durationSec)} · {candidateTurnCount} turns
                      </span>
                    </div>
                    <h2 className="text-sm font-semibold text-[var(--ink-primary)]">
                      {sess.questionTitle}
                    </h2>
                    <div className="text-[11px] text-[var(--ink-muted)]">
                      {new Date(sess.startedAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {sess.evaluation && (
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3 py-1.5 text-right">
                        <div className="font-mono text-sm font-bold text-[var(--ink-primary)]">
                          {sess.evaluation.overallScore.toFixed(1)} / 5.0
                        </div>
                        <div className="text-[10px] font-semibold text-[var(--accent)]">
                          {sess.evaluation.verdict}
                        </div>
                      </div>
                    )}

                    <Link
                      href={`/practice/${sess.questionId}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-[var(--ink-primary)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                    >
                      <Play className="h-3 w-3" />
                      Re-Practice
                    </Link>

                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : sess.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--ink-secondary)] hover:bg-[var(--canvas)]"
                    >
                      {expanded ? (
                        <>
                          Collapse <ChevronUp className="h-3.5 w-3.5" />
                        </>
                      ) : (
                        <>
                          Review <ChevronDown className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="mt-4 grid gap-4 border-t border-[var(--border)] pt-4 lg:grid-cols-2">
                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                        Conversation Transcript
                      </div>
                      <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--canvas)]/60 p-3 text-xs">
                        {sess.messages.map((m) => (
                          <div key={m.id}>
                            <span className="font-semibold text-[var(--ink-primary)]">
                              {m.sender === 'candidate' ? 'You: ' : 'Interviewer: '}
                            </span>
                            <span className="whitespace-pre-wrap text-[var(--ink-secondary)]">
                              {m.text}
                            </span>
                          </div>
                        ))}
                      </div>
                      {sess.scratchpad && (
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                            Scratchpad Notes
                          </div>
                          <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-3 font-mono text-[11px] text-[var(--ink-secondary)]">
                            {sess.scratchpad}
                          </pre>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                        Rubric Evaluation & Rewrites
                      </div>
                      {sess.evaluation ? (
                        <div className="space-y-2.5 text-xs">
                          <p className="rounded-xl border border-[var(--border)] bg-[var(--canvas)]/60 p-3 text-[var(--ink-primary)]">
                            {sess.evaluation.summary}
                          </p>
                          {sess.evaluation.dimensions.map((d) => (
                            <div
                              key={d.key}
                              className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2"
                            >
                              <span className="font-medium text-[var(--ink-secondary)]">
                                {d.label}
                              </span>
                              <span className="font-mono font-semibold text-[var(--ink-primary)]">
                                {d.score.toFixed(1)}
                              </span>
                            </div>
                          ))}
                          {sess.evaluation.rewrites[0] && (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                              <div className="font-semibold text-emerald-800">
                                Strong Hire Upgrade Sample
                              </div>
                              <p className="mt-1 text-[var(--ink-primary)]">
                                {sess.evaluation.rewrites[0].strongHireRewrite}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--ink-muted)]">
                          This session was saved before running Evaluate & Score.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
