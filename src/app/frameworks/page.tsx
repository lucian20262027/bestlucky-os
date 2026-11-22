'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Compass, Layers, ShieldAlert } from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { roleBadgeClasses } from '@/lib/helpers';
import { ROLE_LIST, ROLES_BY_ID } from '@/lib/roles';
import { ROLE_PLAYBOOKS, SAME_PROMPT_SCENARIO } from '@/lib/seed-frameworks';
import { RoleTrack } from '@/lib/types';

export default function FrameworksPage() {
  const { state } = useApp();
  const [activeRole, setActiveRole] = useState<RoleTrack>('fde');
  const [compareRoles, setCompareRoles] = useState<RoleTrack[]>(['fde', 'fdpm', 'consulting']);

  const roleCfg = ROLES_BY_ID[activeRole];
  const playbook = ROLE_PLAYBOOKS[activeRole];

  const toggleCompareRole = (role: RoleTrack) => {
    setCompareRoles((prev) => {
      if (prev.includes(role)) {
        return prev.length > 1 ? prev.filter((r) => r !== role) : prev;
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), role];
      }
      return [...prev, role];
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white px-3 py-1 text-[11px] font-medium text-[var(--ink-secondary)]">
          <Compass className="h-3.5 w-3.5 text-[var(--accent)]" />
          Mental Model Switcher · 7 Target Tracks
        </div>
        <h1 className="mt-2.5 text-2xl font-semibold tracking-tight text-[var(--ink-primary)]">
          7-Role Battle-Tested Playbook
        </h1>
        <p className="mt-1 text-sm text-[var(--ink-secondary)]">
          同一周可能上午面 FDE、下午面 FDPM、明天面 Operations 或 Consulting——用这份速查卡快速切换“面试官真正想听到的思维模式与30秒开场白”。
        </p>
      </div>

      {/* Interactive 7-Role Tabs */}
      <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-2xs">
        <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-4">
          {ROLE_LIST.map((r) => {
            const active = activeRole === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveRole(r.id)}
                className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                  active
                    ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-white'
                    : 'border-[var(--border)] bg-[var(--canvas)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                }`}
              >
                {r.shortLabel}
              </button>
            );
          })}
        </div>

        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${roleBadgeClasses(
                    activeRole
                  )}`}
                >
                  {roleCfg.label}
                </span>
                <span className="text-xs text-[var(--ink-muted)]">
                  Target: {roleCfg.sampleCompanies.join(' · ')}
                </span>
              </div>
              <p className="mt-2.5 text-base font-medium leading-relaxed text-[var(--ink-primary)]">
                {playbook.coreMentalModel}
              </p>
              {state.aiSettings.language !== 'en' && (
                <p className="mt-1.5 rounded-lg bg-amber-50/70 px-3 py-1.5 text-xs text-amber-950">
                  {playbook.coreMentalModelZh}
                </p>
              )}
            </div>

            <Link
              href="/questions"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3.5 py-2 text-xs font-semibold text-[var(--ink-primary)] hover:border-[var(--accent)]"
            >
              Drill {roleCfg.shortLabel} Questions
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--canvas)]/60 p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">
                <Layers className="h-3.5 w-3.5 text-[var(--accent)]" />
                Winning 4-Step Formula
              </div>
              <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-[var(--ink-primary)]">
                {playbook.goldenFormula.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Metrics & Vocabulary That Signal Seniority
              </div>
              <ul className="mt-2.5 space-y-1.5 text-xs text-emerald-950">
                {playbook.keyMetrics.map((m, i) => (
                  <li key={i}>• {m}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-rose-800">
                <ShieldAlert className="h-3.5 w-3.5" />
                Common Traps That Fail Candidates
              </div>
              <ul className="mt-2.5 space-y-1.5 text-xs text-rose-950">
                {playbook.commonTraps.map((t, i) => (
                  <li key={i}>✕ {t}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              30-Second Opening Script Template
            </div>
            <p className="mt-1.5 text-sm font-medium italic leading-relaxed text-[var(--ink-primary)]">
              {playbook.thirtySecOpener}
            </p>
          </div>
        </div>
      </section>

      {/* Same Prompt, 7 Lenses Interactive Comparator */}
      <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-2xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--ink-primary)]">
              &ldquo;Same Prompt, 7 Lenses&rdquo; Cross-Role Comparator
            </h2>
            <p className="mt-1 text-xs text-[var(--ink-secondary)]">
              {SAME_PROMPT_SCENARIO.title}
            </p>
            {state.aiSettings.language !== 'en' && (
              <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                {SAME_PROMPT_SCENARIO.titleZh}
              </p>
            )}
          </div>
        </div>

        {/* Pick up to 3 roles to compare */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[var(--ink-muted)]">
            Compare up to 3 roles side-by-side:
          </span>
          {ROLE_LIST.map((r) => {
            const selected = compareRoles.includes(r.id);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => toggleCompareRole(r.id)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                  selected
                    ? 'border-[var(--accent)] bg-blue-50 text-[var(--accent)]'
                    : 'border-[var(--border)] bg-white text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                }`}
              >
                {r.shortLabel}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {compareRoles.map((roleId) => {
            const row = SAME_PROMPT_SCENARIO.rows.find((item) => item.role === roleId);
            if (!row) return null;
            const cfg = ROLES_BY_ID[roleId];
            return (
              <div
                key={roleId}
                className="flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--canvas)]/60 p-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${roleBadgeClasses(
                        roleId
                      )}`}
                    >
                      {cfg.label}
                    </span>
                  </div>

                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                      First 90 Seconds Focus
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--ink-primary)]">
                      {row.first90Seconds}
                    </p>
                  </div>

                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                      Key Artifact Produced
                    </div>
                    <p className="mt-1 text-xs font-medium text-[var(--ink-secondary)]">
                      {row.keyArtifact}
                    </p>
                  </div>

                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                      Primary North Star KPI
                    </div>
                    <p className="mt-1 text-xs text-emerald-950">{row.primaryKpi}</p>
                  </div>

                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-700">
                      Biggest Risk Flagged
                    </div>
                    <p className="mt-1 text-xs text-rose-900">{row.biggestRiskFlagged}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
