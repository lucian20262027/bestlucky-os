'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Calendar,
  ClipboardCheck,
  DollarSign,
  Edit3,
  ExternalLink,
  FileText,
  Mic,
  Plus,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { roleBadgeClasses } from '@/lib/helpers';
import { ROLE_LIST, ROLES_BY_ID } from '@/lib/roles';
import {
  JobApplication,
  OfferCompDetails,
  PipelineStage,
  PostInterviewDebrief,
  RoleTrack,
} from '@/lib/types';

const STAGES: Array<{ id: PipelineStage; label: string; accent: string }> = [
  { id: 'wishlist', label: 'Wishlist', accent: 'bg-slate-100 text-slate-700' },
  { id: 'applied', label: 'Applied', accent: 'bg-blue-50 text-blue-700' },
  { id: 'screen', label: 'Recruiter Screen', accent: 'bg-amber-50 text-amber-800' },
  { id: 'technical', label: 'Technical / Case', accent: 'bg-[#F3ECFF] text-[#6E32F5]' },
  { id: 'onsite', label: 'Onsite Loop', accent: 'bg-indigo-50 text-indigo-700' },
  { id: 'offer', label: 'Offer 🎉', accent: 'bg-emerald-50 text-emerald-700' },
];

export default function JobPipelinePage() {
  const { state, upsertApplication, deleteApplication } = useApp();
  const [pipelineTab, setPipelineTab] = useState<'board' | 'offers'>('board');
  const [editingApp, setEditingApp] = useState<JobApplication | null>(null);
  const [debriefTarget, setDebriefTarget] = useState<JobApplication | null>(null);
  const [warRoomTarget, setWarRoomTarget] = useState<JobApplication | null>(null);
  const [reverseQDraft, setReverseQDraft] = useState('');
  const [newDebrief, setNewDebrief] = useState<PostInterviewDebrief>({
    roundName: '',
    dateISO: new Date().toISOString().slice(0, 10),
    wentWell: '',
    stumbledOn: '',
    followUpProbes: '',
    nextAction: '',
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingApp(null);
        setDebriefTarget(null);
        setWarRoomTarget(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const offerCandidates = useMemo(() => {
    const offers = state.applications.filter(
      (a) => a.stage === 'offer' || Boolean(a.offerComp)
    );
    return offers.length > 0 ? offers : state.applications.slice(0, 3);
  }, [state.applications]);

  const updateOfferField = (
    app: JobApplication,
    field: keyof OfferCompDetails,
    value: number | string
  ) => {
    const cur: OfferCompDetails = app.offerComp ?? {
      base: 220000,
      annualEquity: 120000,
      signOn: 30000,
      bonusPct: 15,
    };
    upsertApplication({
      ...app,
      offerComp: {
        ...cur,
        [field]: value,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const addReverseQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!warRoomTarget || !reverseQDraft.trim()) return;
    const updated: JobApplication = {
      ...warRoomTarget,
      reverseQuestions: [...(warRoomTarget.reverseQuestions ?? []), reverseQDraft.trim()],
      updatedAt: new Date().toISOString(),
    };
    upsertApplication(updated);
    setWarRoomTarget(updated);
    setReverseQDraft('');
  };

  const openNewApp = (stage: PipelineStage = 'applied') => {
    setEditingApp({
      id: `app-${Date.now()}`,
      company: '',
      roleTitle: '',
      roleTrack: 'fde',
      stage,
      jdUrl: '',
      resumeVersion: 'Lucian_Resume_v1.pdf',
      nextInterviewDate: '',
      notes: '',
      debriefs: [],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp || !editingApp.company.trim() || !editingApp.roleTitle.trim()) return;
    upsertApplication({
      ...editingApp,
      company: editingApp.company.trim(),
      roleTitle: editingApp.roleTitle.trim(),
      updatedAt: new Date().toISOString(),
    });
    setEditingApp(null);
  };

  const handleAddDebrief = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debriefTarget || !newDebrief.roundName.trim()) return;
    const updated: JobApplication = {
      ...debriefTarget,
      debriefs: [newDebrief, ...(debriefTarget.debriefs ?? [])],
      updatedAt: new Date().toISOString(),
    };
    upsertApplication(updated);
    setDebriefTarget(updated);
    setNewDebrief({
      roundName: '',
      dateISO: new Date().toISOString().slice(0, 10),
      wentWell: '',
      stumbledOn: '',
      followUpProbes: '',
      nextAction: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#ECECF2] bg-white px-3 py-1 text-[11px] font-medium text-[#5E5E6E]">
            <Briefcase className="h-3.5 w-3.5 text-[#6E32F5]" />
            Job Search CRM · 投递漏斗 &amp; 面后复盘
          </div>
          <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-[#111118]">
            Application Pipeline &amp; Debriefs
          </h1>
          <p className="mt-1 text-sm text-[#5E5E6E]">
            集中管理每家目标公司的投递阶段、JD 链接、简历版本，并在每轮面试结束 10 分钟内记录挂点、追问与下轮补救方案。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-[#ECECF2] bg-white p-1">
            <button
              type="button"
              onClick={() => setPipelineTab('board')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                pipelineTab === 'board'
                  ? 'bg-[#6E32F5] text-white'
                  : 'text-[#5E5E6E] hover:text-[#111118]'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              投递漏斗 &amp; 备战室
            </button>
            <button
              type="button"
              onClick={() => setPipelineTab('offers')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                pipelineTab === 'offers'
                  ? 'bg-[#6E32F5] text-white'
                  : 'text-[#5E5E6E] hover:text-[#111118]'
              }`}
            >
              <DollarSign className="h-3.5 w-3.5" />
              Offer 薪资对比 (4-Year TC)
            </button>
          </div>
          <button
            type="button"
            onClick={() => openNewApp('applied')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#5B24D6]"
          >
            <Plus className="h-4 w-4" />
            Add Application
          </button>
        </div>
      </div>

      {/* Stage Columns */}
      {pipelineTab === 'board' && (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {STAGES.map((stage) => {
          const items = state.applications.filter((a) => a.stage === stage.id);
          return (
            <section
              key={stage.id}
              className="flex flex-col rounded-2xl border border-[#ECECF2] bg-white p-4 shadow-2xs"
            >
              <div className="flex items-center justify-between border-b border-[#F2F2F7] pb-3">
                <div className="flex items-center gap-2">
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${stage.accent}`}>
                    {stage.label}
                  </span>
                  <span className="font-mono text-xs font-semibold text-[#848494]">
                    {items.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openNewApp(stage.id)}
                  className="rounded-lg p-1 text-[#848494] hover:bg-[#FAFAFC] hover:text-[#6E32F5]"
                  title={`Add to ${stage.label}`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 space-y-3">
                {items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#ECECF2] bg-[#FAFAFC] p-4 text-center text-xs text-[#9E9EAE]">
                    暂无公司卡片
                  </div>
                ) : (
                  items.map((app) => (
                    <article
                      key={app.id}
                      className="rounded-xl border border-[#EFEFF5] bg-[#FAFAFC] p-3.5 transition hover:border-[#6E32F5]/35 hover:bg-white"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="text-sm font-semibold text-[#111118]">
                              {app.company}
                            </h3>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${roleBadgeClasses(
                                app.roleTrack
                              )}`}
                            >
                              {ROLES_BY_ID[app.roleTrack]?.shortLabel}
                            </span>
                          </div>
                          <div className="mt-0.5 text-xs text-[#5E5E6E]">{app.roleTitle}</div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingApp(app)}
                            className="rounded p-1 text-[#848494] hover:text-[#6E32F5]"
                            title="Edit application"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteApplication(app.id)}
                            className="rounded p-1 text-[#B4B4C2] hover:text-rose-600"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="mt-2.5 space-y-1 text-[11px] text-[#5E5E6E]">
                        {app.resumeVersion && (
                          <div className="flex items-center gap-1.5">
                            <FileText className="h-3 w-3 text-[#6E32F5]" />
                            <span className="truncate">{app.resumeVersion}</span>
                          </div>
                        )}
                        {app.nextInterviewDate && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-[#6E32F5]" />
                            <span>Next: {app.nextInterviewDate}</span>
                          </div>
                        )}
                      </div>

                      {app.notes && (
                        <p className="mt-2 line-clamp-2 text-[11px] text-[#5E5E6E]">{app.notes}</p>
                      )}

                      {/* Footer Controls: Move Stage + Debrief Button + JD Link */}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#ECECF2] pt-2.5">
                        <select
                          value={app.stage}
                          onChange={(e) =>
                            upsertApplication({
                              ...app,
                              stage: e.target.value as PipelineStage,
                              updatedAt: new Date().toISOString(),
                            })
                          }
                          aria-label="Move stage"
                          className="rounded-lg border border-[#ECECF2] bg-white px-2 py-1 text-[11px] font-medium text-[#111118]"
                        >
                          {STAGES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-1.5">
                          {app.jdUrl && (
                            <a
                              href={app.jdUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-[#ECECF2] bg-white px-2 py-1 text-[11px] font-medium text-[#5E5E6E] hover:text-[#6E32F5]"
                            >
                              JD
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setWarRoomTarget(app)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#D4C5FD] bg-[#F9F6FF] px-2.5 py-1 text-[11px] font-semibold text-[#6E32F5] hover:bg-[#F3ECFF]"
                          >
                            <Shield className="h-3 w-3" />
                            备战室
                          </button>
                          <button
                            type="button"
                            onClick={() => setDebriefTarget(app)}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#F3ECFF] px-2.5 py-1 text-[11px] font-semibold text-[#6E32F5] hover:bg-[#6E32F5] hover:text-white"
                          >
                            <ClipboardCheck className="h-3 w-3" />
                            Debrief ({app.debriefs?.length ?? 0})
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
      )}

      {/* TAB 2: 4-Year Total Comp Offer Comparator */}
      {pipelineTab === 'offers' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-2xs">
            <h2 className="text-sm font-semibold text-[#111118]">
              4-Year Total Compensation (TC) 对比计算器
            </h2>
            <p className="mt-1 text-xs text-[#848494]">
              自动包含所有 Offer 阶段公司（若暂无 Offer，默认展示前 3 家目标公司供预演），实时计算 Year 1 与 4-Year 总包。
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {offerCandidates.map((app) => {
                const comp = app.offerComp ?? {
                  base: 220000,
                  annualEquity: 120000,
                  signOn: 30000,
                  bonusPct: 15,
                };
                const annualBonus = Math.round((comp.base * comp.bonusPct) / 100);
                const recurringAnnual = comp.base + annualBonus + comp.annualEquity;
                const year1Tc = recurringAnnual + comp.signOn;
                const total4Yr = recurringAnnual * 4 + comp.signOn;

                return (
                  <div
                    key={app.id}
                    className="rounded-2xl border border-[#ECECF2] bg-[#FAFAFC] p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-[#111118]">{app.company}</h3>
                        <p className="text-[11px] text-[#5E5E6E]">{app.roleTitle}</p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-700">
                        Y1 \${Math.round(year1Tc / 1000)}k
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <label className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase text-[#848494]">
                          Base (\$/yr)
                        </span>
                        <input
                          type="number"
                          value={comp.base}
                          onChange={(e) =>
                            updateOfferField(app, 'base', Number(e.target.value) || 0)
                          }
                          className="w-full rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 font-mono text-xs"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase text-[#848494]">
                          Equity (\$/yr)
                        </span>
                        <input
                          type="number"
                          value={comp.annualEquity}
                          onChange={(e) =>
                            updateOfferField(app, 'annualEquity', Number(e.target.value) || 0)
                          }
                          className="w-full rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 font-mono text-xs"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase text-[#848494]">
                          Sign-on (\$)
                        </span>
                        <input
                          type="number"
                          value={comp.signOn}
                          onChange={(e) =>
                            updateOfferField(app, 'signOn', Number(e.target.value) || 0)
                          }
                          className="w-full rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 font-mono text-xs"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase text-[#848494]">
                          Bonus (%)
                        </span>
                        <input
                          type="number"
                          value={comp.bonusPct}
                          onChange={(e) =>
                            updateOfferField(app, 'bonusPct', Number(e.target.value) || 0)
                          }
                          className="w-full rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 font-mono text-xs"
                        />
                      </label>
                    </div>

                    <div className="space-y-1 rounded-xl border border-[#ECECF2] bg-white p-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#848494]">Year 1 Total Comp:</span>
                        <span className="font-mono font-semibold text-[#111118]">
                          \${year1Tc.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#848494]">Yr 2–4 Recurring/yr:</span>
                        <span className="font-mono font-semibold text-[#111118]">
                          \${recurringAnnual.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-[#ECECF2] pt-1.5">
                        <span className="font-semibold text-[#6E32F5]">4-Year Total Package:</span>
                        <span className="font-mono font-bold text-[#6E32F5]">
                          \${total4Yr.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Application Modal */}
      {editingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#ECECF2] pb-3">
              <h3 className="text-base font-semibold text-[#111118]">
                添加 / 编辑投递记录
              </h3>
              <button
                type="button"
                onClick={() => setEditingApp(null)}
                className="rounded-lg p-1 text-[#848494] hover:bg-[#FAFAFC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveApp} className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-[#5E5E6E]">Company *</label>
                  <input
                    type="text"
                    required
                    value={editingApp.company}
                    onChange={(e) =>
                      setEditingApp({ ...editingApp, company: e.target.value })
                    }
                    placeholder="e.g. OpenAI"
                    className="mt-1 w-full rounded-xl border border-[#ECECF2] px-3 py-2 text-xs focus:border-[#6E32F5] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#5E5E6E]">Role Title *</label>
                  <input
                    type="text"
                    required
                    value={editingApp.roleTitle}
                    onChange={(e) =>
                      setEditingApp({ ...editingApp, roleTitle: e.target.value })
                    }
                    placeholder="e.g. Forward Deployed Engineer"
                    className="mt-1 w-full rounded-xl border border-[#ECECF2] px-3 py-2 text-xs focus:border-[#6E32F5] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-[#5E5E6E]">Role Track</label>
                  <select
                    value={editingApp.roleTrack}
                    onChange={(e) =>
                      setEditingApp({
                        ...editingApp,
                        roleTrack: e.target.value as RoleTrack,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-[#ECECF2] px-3 py-2 text-xs"
                  >
                    {ROLE_LIST.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.shortLabel}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#5E5E6E]">Pipeline Stage</label>
                  <select
                    value={editingApp.stage}
                    onChange={(e) =>
                      setEditingApp({
                        ...editingApp,
                        stage: e.target.value as PipelineStage,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-[#ECECF2] px-3 py-2 text-xs"
                  >
                    {STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-[#5E5E6E]">Resume Version</label>
                  <input
                    type="text"
                    value={editingApp.resumeVersion ?? ''}
                    onChange={(e) =>
                      setEditingApp({ ...editingApp, resumeVersion: e.target.value })
                    }
                    placeholder="Lucian_Resume_FDE_v4.pdf"
                    className="mt-1 w-full rounded-xl border border-[#ECECF2] px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#5E5E6E]">Next Interview Date</label>
                  <input
                    type="date"
                    value={editingApp.nextInterviewDate ?? ''}
                    onChange={(e) =>
                      setEditingApp({ ...editingApp, nextInterviewDate: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-[#ECECF2] px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#5E5E6E]">JD URL</label>
                <input
                  type="url"
                  value={editingApp.jdUrl ?? ''}
                  onChange={(e) => setEditingApp({ ...editingApp, jdUrl: e.target.value })}
                  placeholder="https://..."
                  className="mt-1 w-full rounded-xl border border-[#ECECF2] px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#5E5E6E]">Prep Notes / Recruiter</label>
                <textarea
                  rows={2}
                  value={editingApp.notes ?? ''}
                  onChange={(e) => setEditingApp({ ...editingApp, notes: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#ECECF2] px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-[#ECECF2] pt-3">
                <button
                  type="button"
                  onClick={() => setEditingApp(null)}
                  className="rounded-xl border border-[#ECECF2] px-4 py-2 text-xs font-semibold text-[#5E5E6E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white"
                >
                  Save Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post-Interview Debrief Modal */}
      {debriefTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#ECECF2] pb-3">
              <div>
                <h3 className="text-base font-semibold text-[#111118]">
                  {debriefTarget.company} · Post-Interview Debrief (面后复盘)
                </h3>
                <p className="text-xs text-[#848494]">
                  {debriefTarget.roleTitle} — 趁记忆最鲜活，10 分钟内记录亮点、挂点与追问
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDebriefTarget(null)}
                className="rounded-lg p-1 text-[#848494] hover:bg-[#FAFAFC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleAddDebrief}
              className="mt-4 space-y-3 rounded-xl border border-[#6E32F5]/25 bg-[#F9F6FF] p-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  required
                  value={newDebrief.roundName}
                  onChange={(e) =>
                    setNewDebrief({ ...newDebrief, roundName: e.target.value })
                  }
                  placeholder="轮次名称 (e.g. Hiring Manager / Technical Round 1) *"
                  className="rounded-lg border border-[#ECECF2] bg-white px-3 py-2 text-xs"
                />
                <input
                  type="date"
                  value={newDebrief.dateISO}
                  onChange={(e) =>
                    setNewDebrief({ ...newDebrief, dateISO: e.target.value })
                  }
                  className="rounded-lg border border-[#ECECF2] bg-white px-3 py-2 text-xs"
                />
              </div>
              <textarea
                rows={2}
                value={newDebrief.wentWell}
                onChange={(e) =>
                  setNewDebrief({ ...newDebrief, wentWell: e.target.value })
                }
                placeholder="1. 这轮表现好的地方 / 面试官明显点头的地方..."
                className="w-full rounded-lg border border-[#ECECF2] bg-white px-3 py-2 text-xs"
              />
              <textarea
                rows={2}
                value={newDebrief.stumbledOn}
                onChange={(e) =>
                  setNewDebrief({ ...newDebrief, stumbledOn: e.target.value })
                }
                placeholder="2. 卡壳点 / 挂点 / 没答到位的深挖问题..."
                className="w-full rounded-lg border border-[#ECECF2] bg-white px-3 py-2 text-xs"
              />
              <textarea
                rows={2}
                value={newDebrief.followUpProbes}
                onChange={(e) =>
                  setNewDebrief({ ...newDebrief, followUpProbes: e.target.value })
                }
                placeholder="3. 面试官追问的原题（可直接同步到题库练习）..."
                className="w-full rounded-lg border border-[#ECECF2] bg-white px-3 py-2 text-xs"
              />
              <textarea
                rows={2}
                value={newDebrief.nextAction}
                onChange={(e) =>
                  setNewDebrief({ ...newDebrief, nextAction: e.target.value })
                }
                placeholder="4. 下一轮前必须补齐的动作 (Next Round Action Plan)..."
                className="w-full rounded-lg border border-[#ECECF2] bg-white px-3 py-2 text-xs"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white"
                >
                  Save Debrief
                </button>
              </div>
            </form>

            {/* Past Debriefs */}
            <div className="mt-4 space-y-3">
              {(debriefTarget.debriefs ?? []).length === 0 ? (
                <p className="py-4 text-center text-xs text-[#848494]">
                  暂无复盘记录，在上方填写第一轮面后复盘即可。
                </p>
              ) : (
                debriefTarget.debriefs.map((d, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-3.5 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-semibold text-[#111118]">
                      <span>{d.roundName}</span>
                      <span className="font-mono text-[11px] text-[#848494]">{d.dateISO}</span>
                    </div>
                    {d.wentWell && (
                      <p className="text-emerald-800">✅ 亮点: {d.wentWell}</p>
                    )}
                    {d.stumbledOn && (
                      <p className="text-rose-700">⚠️ 卡壳点: {d.stumbledOn}</p>
                    )}
                    {d.followUpProbes && (
                      <p className="text-[#5E5E6E]">🔍 追问: {d.followUpProbes}</p>
                    )}
                    {d.nextAction && (
                      <p className="font-medium text-[#6E32F5]">🎯 下轮补救: {d.nextAction}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Company War Room Modal */}
      {warRoomTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#ECECF2] pb-3">
              <div>
                <h3 className="text-base font-semibold text-[#111118]">
                  ⚔️ 公司备战室 (War Room) · {warRoomTarget.company}
                </h3>
                <p className="text-xs text-[#848494]">
                  {warRoomTarget.roleTitle} · 一屏关联 JD、匹配简历版本与专属反问问题 (Reverse Q&amp;A)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWarRoomTarget(null)}
                className="rounded-lg p-1 text-[#848494]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Linked JD & Resume */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-3">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#848494]">
                  关联目标 JD (来自 JD Study Plan)
                </label>
                <select
                  value={warRoomTarget.linkedJdId ?? ''}
                  onChange={(e) => {
                    const updated: JobApplication = {
                      ...warRoomTarget,
                      linkedJdId: e.target.value || undefined,
                      updatedAt: new Date().toISOString(),
                    };
                    upsertApplication(updated);
                    setWarRoomTarget(updated);
                  }}
                  className="mt-1.5 w-full rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs"
                >
                  <option value="">选择关联 JD...</option>
                  {state.savedJDs.map((jd) => (
                    <option key={jd.id} value={jd.id}>
                      {jd.company} — {jd.roleTitle}
                    </option>
                  ))}
                </select>
                {(() => {
                  const linkedJd = state.savedJDs.find((j) => j.id === warRoomTarget.linkedJdId);
                  if (!linkedJd) return null;
                  return (
                    <div className="mt-2 space-y-1 text-[11px] text-[#5E5E6E]">
                      <p className="line-clamp-2">{linkedJd.summary}</p>
                      <div className="flex flex-wrap gap-1">
                        {linkedJd.extractedSkills.slice(0, 4).map((sk) => (
                          <span
                            key={sk}
                            className="rounded bg-[#F3ECFF] px-1.5 py-0.5 text-[10px] font-medium text-[#6E32F5]"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-3">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#848494]">
                  关联简历版本 (来自简历库)
                </label>
                <select
                  value={warRoomTarget.linkedResumeId ?? ''}
                  onChange={(e) => {
                    const found = state.resumeProfiles.find((r) => r.id === e.target.value);
                    const updated: JobApplication = {
                      ...warRoomTarget,
                      linkedResumeId: e.target.value || undefined,
                      resumeVersion: found ? found.fileName || found.label : warRoomTarget.resumeVersion,
                      updatedAt: new Date().toISOString(),
                    };
                    upsertApplication(updated);
                    setWarRoomTarget(updated);
                  }}
                  className="mt-1.5 w-full rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs"
                >
                  <option value="">选择简历版本...</option>
                  {state.resumeProfiles.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.track}] {r.label}
                    </option>
                  ))}
                </select>
                {(() => {
                  const linkedRes = state.resumeProfiles.find(
                    (r) => r.id === warRoomTarget.linkedResumeId
                  );
                  if (!linkedRes) return null;
                  return (
                    <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-[#5E5E6E]">
                      {linkedRes.content}
                    </p>
                  );
                })()}
              </div>
            </div>

            {/* Reverse Q&A */}
            <div className="rounded-xl border border-[#ECECF2] bg-white p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#111118]">
                  公司专属反问问题 (Reverse Q&amp;A)
                </span>
                <Link
                  href={`/practice?topic=${encodeURIComponent(
                    `Why ${warRoomTarget.company} & ${warRoomTarget.roleTitle}?`
                  )}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#6E32F5] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#5B24D6]"
                >
                  <Mic className="h-3 w-3" />
                  针对这家练 1 题
                </Link>
              </div>

              <form onSubmit={addReverseQuestion} className="flex gap-2">
                <input
                  value={reverseQDraft}
                  onChange={(e) => setReverseQDraft(e.target.value)}
                  placeholder="添加要反问 HM / 面试官的问题..."
                  className="flex-1 rounded-lg border border-[#ECECF2] px-3 py-1.5 text-xs focus:border-[#6E32F5] focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-[#111118] px-3 py-1.5 text-xs font-semibold text-white"
                >
                  添加
                </button>
              </form>

              <ul className="space-y-1.5">
                {(warRoomTarget.reverseQuestions ?? []).length === 0 ? (
                  <li className="text-[11px] text-[#848494]">
                    还没有添加反问问题 — 建议准备 3 个分别针对技术债/路线图、成功指标和团队节奏的问题。
                  </li>
                ) : (
                  (warRoomTarget.reverseQuestions ?? []).map((rq, idx) => (
                    <li
                      key={idx}
                      className="flex items-start justify-between gap-2 rounded-lg bg-[#FAFAFC] px-3 py-2 text-xs text-[#111118]"
                    >
                      <span>• {rq}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated: JobApplication = {
                            ...warRoomTarget,
                            reverseQuestions: (warRoomTarget.reverseQuestions ?? []).filter(
                              (_, i) => i !== idx
                            ),
                            updatedAt: new Date().toISOString(),
                          };
                          upsertApplication(updated);
                          setWarRoomTarget(updated);
                        }}
                        className="text-[11px] text-[#848494] hover:text-rose-600"
                      >
                        移除
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
