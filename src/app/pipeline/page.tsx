'use client';

import React, { useState } from 'react';
import {
  Briefcase,
  Calendar,
  ClipboardCheck,
  Edit3,
  ExternalLink,
  FileText,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { roleBadgeClasses } from '@/lib/helpers';
import { ROLE_LIST, ROLES_BY_ID } from '@/lib/roles';
import { JobApplication, PipelineStage, PostInterviewDebrief, RoleTrack } from '@/lib/types';

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
  const [editingApp, setEditingApp] = useState<JobApplication | null>(null);
  const [debriefTarget, setDebriefTarget] = useState<JobApplication | null>(null);
  const [newDebrief, setNewDebrief] = useState<PostInterviewDebrief>({
    roundName: '',
    dateISO: new Date().toISOString().slice(0, 10),
    wentWell: '',
    stumbledOn: '',
    followUpProbes: '',
    nextAction: '',
  });

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

        <button
          type="button"
          onClick={() => openNewApp('applied')}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#6E32F5] px-4 py-2.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#5B24D6]"
        >
          <Plus className="h-4 w-4" />
          Add Application
        </button>
      </div>

      {/* Stage Columns */}
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
    </div>
  );
}
