'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  BookmarkPlus,
  Check,
  CheckCircle2,
  Cpu,
  FileText,
  Layers,
  Loader2,
  Play,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { JdResumeStudio } from '@/components/JdResumeStudio';
import { requestCustomLoop } from '@/lib/ai-client';
import { roleBadgeClasses } from '@/lib/helpers';
import { ROLE_LIST, ROLES_BY_ID, ROUND_LABELS } from '@/lib/roles';
import { SAMPLE_JDS } from '@/lib/seed-stories';
import { InterviewQuestion, RoleTrack, RoundType } from '@/lib/types';

export default function CustomizerPage() {
  const router = useRouter();
  const {
    state,
    updateResumeSummary,
    saveCustomLoopPlan,
    addCustomQuestion,
    addUpcomingLoop,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'jd-library' | 'resumes' | 'generator'>('jd-library');
  const [company, setCompany] = useState('Anthropic / OpenAI Applied AI');
  const [role, setRole] = useState<RoleTrack>('fde');
  const [round, setRound] = useState<RoundType>('decomposition');
  const [jdText, setJdText] = useState(SAMPLE_JDS[0].jdText);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [loopAdded, setLoopAdded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const plan = state.lastCustomLoop;

  const handleLoadSample = (sampleId: string) => {
    const sample = SAMPLE_JDS.find((s) => s.id === sampleId);
    if (!sample) return;
    setCompany(sample.company);
    setRole(sample.role);
    setRound(sample.round);
    setJdText(sample.jdText);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jdText.trim() || isGenerating) return;
    setIsGenerating(true);
    setNotice(null);
    setLoopAdded(false);

    try {
      const res = await requestCustomLoop(
        {
          resumeText: state.profile.resumeSummary,
          jdText,
          role,
          company: company.trim() || ROLES_BY_ID[role].sampleCompanies[0],
          round,
        },
        state.aiSettings
      );
      saveCustomLoopPlan(res.data);
      if (res.warning) {
        setNotice(res.warning);
      }
    } catch {
      setNotice('Could not generate custom loop. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToBank = (q: InterviewQuestion) => {
    addCustomQuestion(q);
    setSavedIds((prev) => ({ ...prev, [q.id]: true }));
  };

  const handlePracticeNow = (q: InterviewQuestion) => {
    addCustomQuestion(q);
    router.push(`/practice/${q.id}`);
  };

  const handleAddToUpcoming = () => {
    if (!plan) return;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    addUpcomingLoop({
      company: plan.company,
      role: plan.role,
      round: ROUND_LABELS[plan.round].en,
      dateISO: targetDate.toISOString().slice(0, 10),
      notes: `Match ${plan.matchScore}% · Focus: ${plan.capabilityGaps[0] ?? ''}`,
    });
    setLoopAdded(true);
  };

  return (
    <div className="space-y-6">
      {/* Header + Segmented Tabs */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white px-3 py-1 text-[11px] font-medium text-[var(--ink-secondary)]">
            <Wand2 className="h-3.5 w-3.5 text-[var(--accent)]" />
            JD &amp; Resume Intelligence Studio
          </div>
          <h1 className="mt-2.5 text-2xl font-semibold tracking-tight text-[var(--ink-primary)]">
            JD Study Plan &amp; Resume Match Studio
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-secondary)]">
            上传多公司 JD 截图或文本一键提取共同技能、管理 FDPM / AI PM / Ops / Safety 简历库，并做简历精准匹配分析。
          </p>
        </div>

        <div className="inline-flex flex-wrap rounded-xl border border-[var(--border)] bg-white p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('jd-library')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              activeTab === 'jd-library'
                ? 'bg-[#6E32F5] text-white shadow-2xs'
                : 'text-[#5E5E6E] hover:text-[#111118]'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            1. JD 截图库 &amp; 共同技能 ({state.savedJDs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('resumes')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              activeTab === 'resumes'
                ? 'bg-[#6E32F5] text-white shadow-2xs'
                : 'text-[#5E5E6E] hover:text-[#111118]'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            2. 多方向简历库 ({state.resumeProfiles.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('generator')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              activeTab === 'generator'
                ? 'bg-[#6E32F5] text-white shadow-2xs'
                : 'text-[#5E5E6E] hover:text-[#111118]'
            }`}
          >
            <Wand2 className="h-3.5 w-3.5" />
            3. 定制 Loop 生成器
          </button>
        </div>
      </div>

      {activeTab !== 'generator' && (
        <JdResumeStudio
          activeSection={activeTab}
          onUseInGenerator={(opts) => {
            if (opts.company) setCompany(opts.company);
            if (opts.role) setRole(opts.role);
            if (opts.jdText) setJdText(opts.jdText);
            if (opts.resumeText) updateResumeSummary(opts.resumeText);
            setActiveTab('generator');
          }}
        />
      )}

      {/* Form Grid (Tab 3: Generator) */}
      {activeTab === 'generator' && (
      <>
      <form
        onSubmit={handleGenerate}
        className="grid grid-cols-1 gap-5 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-2xs lg:grid-cols-12"
      >
        <div className="space-y-4 lg:col-span-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">
              Your Resume / Core Highlights (Auto-saved)
            </label>
            <textarea
              rows={9}
              value={state.profile.resumeSummary}
              onChange={(e) => updateResumeSummary(e.target.value)}
              placeholder="Paste your resume bullets, core projects, metrics, and tech/business background..."
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)]/60 p-3 text-xs leading-relaxed text-[var(--ink-primary)] focus:border-[var(--accent)] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[var(--ink-secondary)]">
                Target Company
              </label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g., Palantir, OpenAI, McKinsey"
                className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-xs focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--ink-secondary)]">
                Role Track (7 Tracks)
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as RoleTrack)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-2.5 py-2 text-xs focus:border-[var(--accent)] focus:outline-none"
              >
                {ROLE_LIST.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.shortLabel} — {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--ink-secondary)]">
              Primary Round Emphasis
            </label>
            <select
              value={round}
              onChange={(e) => setRound(e.target.value as RoundType)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-2.5 py-2 text-xs focus:border-[var(--accent)] focus:outline-none"
            >
              {Object.entries(ROUND_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.en} ({v.zh})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col justify-between space-y-4 lg:col-span-7">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">
                Target Job Description (JD)
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-[var(--ink-muted)]">Load Sample JD:</span>
                {SAMPLE_JDS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleLoadSample(s.id)}
                    className="rounded-md border border-[var(--border)] bg-[var(--canvas)] px-2 py-1 text-[11px] font-medium text-[var(--ink-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    {s.role.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              required
              rows={11}
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste the full target Job Description here..."
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)]/60 p-3 text-xs leading-relaxed text-[var(--ink-primary)] focus:border-[var(--accent)] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
            <span className="text-xs text-[var(--ink-muted)]">
              {state.aiSettings.geminiApiKey.trim()
                ? `Using Live Gemini (${state.aiSettings.model})`
                : 'Using Local Loop Synthesizer (Add Gemini key in Settings for deep LLM tailoring)'}
            </span>

            <button
              type="submit"
              disabled={isGenerating || !jdText.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:opacity-95 disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isGenerating ? 'Generating Custom Loop...' : 'Generate Tailored Loop & 5 Questions'}
            </button>
          </div>
        </div>
      </form>

      {notice && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          {notice}
        </div>
      )}

      {/* Output Plan */}
      {plan && (
        <div className="space-y-6">
          {/* Diagnosis + Prep Plan */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-2xs lg:col-span-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${roleBadgeClasses(
                        plan.role
                      )}`}
                    >
                      {ROLES_BY_ID[plan.role].shortLabel}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-[var(--canvas)] px-2 py-0.5 text-[11px] text-[var(--ink-muted)]">
                      {plan.engineMode === 'live_gemini' ? (
                        <Sparkles className="h-3 w-3 text-[var(--accent)]" />
                      ) : (
                        <Cpu className="h-3 w-3 text-emerald-700" />
                      )}
                      {plan.engineMode === 'live_gemini' ? 'Gemini 4' : 'Local Engine'}
                    </span>
                  </div>
                  <h2 className="mt-2 text-base font-semibold text-[var(--ink-primary)]">
                    {plan.company} · Fit & Gap Diagnosis
                  </h2>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl font-bold text-[var(--accent)]">
                    {plan.matchScore}%
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                    Resume Fit
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Matched Strengths to Emphasize
                  </div>
                  <ul className="mt-1.5 space-y-1 text-xs text-emerald-950">
                    {plan.matchedStrengths.map((s, i) => (
                      <li key={i}>• {s}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Gaps to Cover Before Loop
                  </div>
                  <ul className="mt-1.5 space-y-1 text-xs text-amber-950">
                    {plan.capabilityGaps.map((g, i) => (
                      <li key={i}>• {g}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddToUpcoming}
                disabled={loopAdded}
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-2 text-xs font-semibold text-[var(--ink-primary)] hover:bg-white disabled:text-emerald-700"
              >
                {loopAdded ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Added to Upcoming Loops on Dashboard
                  </>
                ) : (
                  '+ Pin This Target to Upcoming Loops'
                )}
              </button>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-2xs lg:col-span-7">
              <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
                Focused Sprint Plan ({plan.company})
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {plan.prepPlan.map((step, i) => (
                  <div
                    key={i}
                    className="flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--canvas)]/60 p-3.5"
                  >
                    <div>
                      <div className="font-mono text-[11px] font-semibold text-[var(--accent)]">
                        {step.phase}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-[var(--ink-primary)]">
                        {step.focus}
                      </div>
                      <ul className="mt-2.5 space-y-1.5 text-[11px] text-[var(--ink-secondary)]">
                        {step.deliverables.map((d, j) => (
                          <li key={j}>✓ {d}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 5 Tailored Questions */}
          <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
                  5 Tailored Mock Questions for {plan.company}
                </h3>
                <p className="text-xs text-[var(--ink-muted)]">
                  Save any prompt to your Question Bank or jump directly into the Mock Room.
                </p>
              </div>
            </div>

            <div className="mt-4 divide-y divide-[var(--border)]">
              {plan.questions.map((q) => {
                const isSaved =
                  savedIds[q.id] || state.customQuestions.some((cq) => cq.id === q.id);
                return (
                  <div key={q.id} className="py-4 first:pt-1 last:pb-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${roleBadgeClasses(
                              q.role
                            )}`}
                          >
                            {ROLES_BY_ID[q.role].shortLabel}
                          </span>
                          <span className="rounded bg-[var(--canvas)] px-2 py-0.5 text-[10px] font-medium text-[var(--ink-secondary)]">
                            {ROUND_LABELS[q.round]?.en ?? q.round} · {q.timeLimitMin}m
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-[var(--ink-primary)]">
                          {q.title}
                        </h4>
                        <p className="text-xs leading-relaxed text-[var(--ink-secondary)]">
                          {q.prompt}
                        </p>
                        {state.aiSettings.language !== 'en' && q.promptZhHint && (
                          <p className="text-[11px] text-amber-800">{q.promptZhHint}</p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveToBank(q)}
                          disabled={isSaved}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--ink-secondary)] hover:bg-[var(--canvas)] disabled:border-emerald-200 disabled:bg-emerald-50 disabled:text-emerald-700"
                        >
                          {isSaved ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Saved
                            </>
                          ) : (
                            <>
                              <BookmarkPlus className="h-3.5 w-3.5" />
                              Save to Bank
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePracticeNow(q)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[var(--ink-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                        >
                          <Play className="h-3 w-3" />
                          Practice Now
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
