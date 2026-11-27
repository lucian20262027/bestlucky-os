'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  DollarSign,
  ExternalLink,
  FileText,
  Kanban,
  LayoutList,
  Layers,
  MessageSquare,
  Mic,
  Pencil,
  Plus,
  Sparkles,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import {
  daysUntil,
  getAllQuestions,
  getQuestionStatus,
  roleBadgeClasses,
} from '@/lib/helpers';
import { ROLE_LIST, ROLES_BY_ID } from '@/lib/roles';
import type {
  JobApplication,
  OfferCompDetails,
  PipelineStage,
  PostInterviewDebrief,
  RoleTrack,
} from '@/lib/types';

const STAGES: Array<{
  id: PipelineStage;
  label: string;
  shortLabel: string;
  pillClass: string;
  dotClass: string;
}> = [
  {
    id: 'wishlist',
    label: 'Wishlist',
    shortLabel: 'Wishlist',
    pillClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-400',
  },
  {
    id: 'applied',
    label: 'Applied',
    shortLabel: 'Applied',
    pillClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  {
    id: 'screen',
    label: 'Recruiter Screen',
    shortLabel: 'Screen',
    pillClass: 'bg-amber-50 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  {
    id: 'technical',
    label: 'Technical / Case',
    shortLabel: 'Tech / Case',
    pillClass: 'bg-[#f4efff] text-[#5d26d9] border-[#e2d4ff]',
    dotClass: 'bg-[#6e32f5]',
  },
  {
    id: 'onsite',
    label: 'Onsite Loop',
    shortLabel: 'Onsite',
    pillClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dotClass: 'bg-indigo-500',
  },
  {
    id: 'offer',
    label: 'Offer',
    shortLabel: 'Offer',
    pillClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
];

const STAGE_ORDER = STAGES.map((s) => s.id);

function getStageMeta(stage: PipelineStage) {
  return STAGES.find((s) => s.id === stage) ?? STAGES[0];
}

function formatCountdown(
  nextInterviewDate: string | undefined,
  todayISO: string | null
): { label: string; urgent: boolean } | null {
  if (!nextInterviewDate || !todayISO) return null;
  const d = daysUntil(nextInterviewDate, todayISO);
  if (d === null || Number.isNaN(d)) return null;
  if (d === 0) return { label: 'Today', urgent: true };
  if (d === 1) return { label: 'Tomorrow', urgent: true };
  if (d > 1) return { label: `In ${d}d`, urgent: d <= 5 };
  return { label: `${Math.abs(d)}d ago`, urgent: false };
}

function formatCurrency(val: number): string {
  return `$${Math.round(val).toLocaleString('en-US')}`;
}

function calcYearlyAndFourYrTC(comp?: OfferCompDetails) {
  if (!comp) return { yr1: 0, recurring: 0, bonusDollar: 0, fourYrTotal: 0 };
  const base = Number(comp.base) || 0;
  const bonusPct = Number(comp.bonusPct) || 0;
  const bonusDollar = base * (bonusPct / 100);
  const annualEquity = Number(comp.annualEquity) || 0;
  const signOn = Number(comp.signOn) || 0;
  const recurring = base + bonusDollar + annualEquity;
  const yr1 = recurring + signOn;
  const fourYrTotal = recurring * 4 + signOn;
  return { yr1, recurring, bonusDollar, fourYrTotal };
}

function emptyOfferComp(): OfferCompDetails {
  return {
    base: 0,
    annualEquity: 0,
    signOn: 0,
    bonusPct: 0,
    notes: '',
  };
}

function PipelineInner() {
  const { state, todayISO, upsertApplication, deleteApplication } = useApp();
  const searchParams = useSearchParams();
  const warroomQueryId = searchParams.get('warroom');

  const [pipelineTab, setPipelineTab] = useState<'board' | 'offers'>('board');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [stageFilter, setStageFilter] = useState<PipelineStage | 'all'>('all');

  const [editingApp, setEditingApp] = useState<JobApplication | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [debriefTarget, setDebriefTarget] = useState<JobApplication | null>(null);
  const [warRoomTarget, setWarRoomTarget] = useState<JobApplication | null>(null);
  const handledWarroomParamRef = useRef<string | null>(null);

  useEffect(() => {
    if (!warroomQueryId) return;
    if (handledWarroomParamRef.current === warroomQueryId) return;
    const match = state.applications.find((a) => a.id === warroomQueryId);
    if (match) {
      setWarRoomTarget(match);
      handledWarroomParamRef.current = warroomQueryId;
    }
  }, [warroomQueryId, state.applications]);

  const liveWarRoomApp = useMemo(() => {
    if (!warRoomTarget) return null;
    return state.applications.find((a) => a.id === warRoomTarget.id) ?? warRoomTarget;
  }, [warRoomTarget, state.applications]);

  const liveDebriefApp = useMemo(() => {
    if (!debriefTarget) return null;
    return state.applications.find((a) => a.id === debriefTarget.id) ?? debriefTarget;
  }, [debriefTarget, state.applications]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (liveDebriefApp) {
        setDebriefTarget(null);
      } else if (liveWarRoomApp) {
        setWarRoomTarget(null);
      } else if (editingApp || isNewModalOpen) {
        setEditingApp(null);
        setIsNewModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [liveDebriefApp, liveWarRoomApp, editingApp, isNewModalOpen]);

  const stageCounts = useMemo(() => {
    const counts: Record<PipelineStage, number> = {
      wishlist: 0,
      applied: 0,
      screen: 0,
      technical: 0,
      onsite: 0,
      offer: 0,
    };
    for (const app of state.applications) {
      counts[app.stage] = (counts[app.stage] || 0) + 1;
    }
    return counts;
  }, [state.applications]);

  const sortedApplications = useMemo(() => {
    return [...state.applications].sort((a, b) => {
      if (a.nextInterviewDate && b.nextInterviewDate) {
        return a.nextInterviewDate.localeCompare(b.nextInterviewDate);
      }
      if (a.nextInterviewDate) return -1;
      if (b.nextInterviewDate) return 1;
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });
  }, [state.applications]);

  const visibleApplications = useMemo(() => {
    if (stageFilter === 'all') return sortedApplications;
    return sortedApplications.filter((a) => a.stage === stageFilter);
  }, [sortedApplications, stageFilter]);

  const visibleColumns = useMemo(() => {
    if (stageFilter === 'all') return STAGES;
    return STAGES.filter((s) => s.id === stageFilter);
  }, [stageFilter]);

  const offerApps = useMemo(() => {
    return sortedApplications.filter(
      (a) =>
        a.stage === 'offer' ||
        (a.offerComp &&
          (a.offerComp.base > 0 ||
            a.offerComp.annualEquity > 0 ||
            a.offerComp.signOn > 0))
    );
  }, [sortedApplications]);

  const handleStageShift = (app: JobApplication, direction: -1 | 1) => {
    const idx = STAGE_ORDER.indexOf(app.stage);
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= STAGE_ORDER.length) return;
    upsertApplication({
      ...app,
      stage: STAGE_ORDER[nextIdx],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDirectStageChange = (app: JobApplication, stage: PipelineStage) => {
    upsertApplication({
      ...app,
      stage,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDelete = (app: JobApplication) => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Remove ${app.company} (${app.roleTitle}) from your pipeline?`)
    ) {
      return;
    }
    deleteApplication(app.id);
    if (warRoomTarget?.id === app.id) setWarRoomTarget(null);
    if (editingApp?.id === app.id) setEditingApp(null);
    if (debriefTarget?.id === app.id) setDebriefTarget(null);
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header Bar */}
      <header className="flex flex-col gap-4 border-b border-[#ececef] pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-[#6e32f5] uppercase">
            <Briefcase className="h-3.5 w-3.5" />
            <span>Target Loop Tracker</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#111118]">
            Job Pipeline &amp; Company War Room
          </h1>
          <p className="mt-1 text-sm text-[#5b5b6b]">
            Track applications from wishlist to offer, inspect company prep dossiers, and compare 4-year total comp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-xl border border-[#e5e5ec] bg-[#f6f6fa] p-1">
            <button
              type="button"
              onClick={() => setPipelineTab('board')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                pipelineTab === 'board'
                  ? 'bg-[#111118] text-white shadow-xs'
                  : 'text-[#5b5b6b] hover:text-[#111118]'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              Pipeline ({state.applications.length})
            </button>
            <button
              type="button"
              onClick={() => setPipelineTab('offers')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                pipelineTab === 'offers'
                  ? 'bg-[#111118] text-white shadow-xs'
                  : 'text-[#5b5b6b] hover:text-[#111118]'
              }`}
            >
              <DollarSign className="h-3.5 w-3.5" />
              4-Year TC Comparator ({offerApps.length})
            </button>
          </div>

          {pipelineTab === 'board' && (
            <div className="inline-flex rounded-xl border border-[#e5e5ec] bg-white p-1">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  viewMode === 'kanban'
                    ? 'bg-[#f4efff] text-[#5d26d9]'
                    : 'text-[#5b5b6b] hover:text-[#111118]'
                }`}
              >
                <Kanban className="h-3.5 w-3.5" />
                Kanban
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  viewMode === 'list'
                    ? 'bg-[#f4efff] text-[#5d26d9]'
                    : 'text-[#5b5b6b] hover:text-[#111118]'
                }`}
              >
                <LayoutList className="h-3.5 w-3.5" />
                List
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setEditingApp(null);
              setIsNewModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#6e32f5] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#5c25db]"
          >
            <Plus className="h-4 w-4" />
            Add Application
          </button>
        </div>
      </header>

      {pipelineTab === 'board' ? (
        <>
          {/* Clickable Stage Funnel Summary Bar */}
          <section
            aria-label="Pipeline stage summary"
            className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7"
          >
            <button
              type="button"
              onClick={() => setStageFilter('all')}
              className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition ${
                stageFilter === 'all'
                  ? 'border-[#111118] bg-[#111118] text-white'
                  : 'border-[#e8e8ef] bg-white text-[#111118] hover:border-[#d3d3df]'
              }`}
            >
              <div>
                <div
                  className={`text-[11px] font-medium ${
                    stageFilter === 'all' ? 'text-white/75' : 'text-[#6c6c7d]'
                  }`}
                >
                  All Stages
                </div>
                <div className="mt-0.5 text-lg font-semibold leading-none">
                  {state.applications.length}
                </div>
              </div>
              <Layers
                className={`h-4 w-4 ${
                  stageFilter === 'all' ? 'text-white/80' : 'text-[#8e8e9f]'
                }`}
              />
            </button>

            {STAGES.map((stage) => {
              const active = stageFilter === stage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() =>
                    setStageFilter((prev) => (prev === stage.id ? 'all' : stage.id))
                  }
                  className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition ${
                    active
                      ? 'border-[#6e32f5] bg-[#f7f4ff] ring-1 ring-[#6e32f5]/20'
                      : 'border-[#e8e8ef] bg-white hover:border-[#d3d3df]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${stage.dotClass}`}
                      />
                      <span className="truncate text-[11px] font-medium text-[#5b5b6b]">
                        {stage.shortLabel}
                      </span>
                    </div>
                    <div className="mt-1 text-lg font-semibold leading-none text-[#111118]">
                      {stageCounts[stage.id]}
                    </div>
                  </div>
                </button>
              );
            })}
          </section>

          {state.applications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#dcdce6] bg-white p-12 text-center">
              <Building2 className="mx-auto h-9 w-9 text-[#9c9cae]" />
              <h2 className="mt-3 text-base font-semibold text-[#111118]">
                No target loops yet
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-[#5b5b6b]">
                Add your first target company to unlock its Company War Room, stage progression, interview countdowns, and post-interview debriefs.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingApp(null);
                  setIsNewModalOpen(true);
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#6e32f5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5c25db]"
              >
                <Plus className="h-4 w-4" />
                Add First Application
              </button>
            </div>
          ) : viewMode === 'kanban' ? (
            /* Horizontal 6-Column Kanban Board */
            <div className="flex gap-3.5 overflow-x-auto pb-4">
              {visibleColumns.map((col) => {
                const apps = visibleApplications.filter((a) => a.stage === col.id);
                const fullStageIndex = STAGE_ORDER.indexOf(col.id);
                return (
                  <div
                    key={col.id}
                    className={`flex flex-col rounded-2xl border border-[#ececef] bg-[#f8f8fb] p-3 ${
                      stageFilter === 'all'
                        ? 'w-[288px] shrink-0'
                        : 'min-w-[320px] flex-1'
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${col.dotClass}`} />
                        <h2 className="text-xs font-semibold tracking-wide text-[#111118] uppercase">
                          {col.label}
                        </h2>
                      </div>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[#5b5b6b] ring-1 ring-[#e8e8ef]">
                        {apps.length}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col gap-2.5">
                      {apps.length === 0 ? (
                        <div className="flex min-h-[112px] items-center justify-center rounded-xl border border-dashed border-[#e2e2eb] bg-white/50 px-3 text-center text-xs text-[#8d8d9e]">
                          No companies in {col.shortLabel}
                        </div>
                      ) : (
                        apps.map((app) => {
                          const countdown = formatCountdown(
                            app.nextInterviewDate,
                            todayISO
                          );
                          const roleMeta = ROLES_BY_ID[app.roleTrack];
                          return (
                            <article
                              key={app.id}
                              className="group rounded-xl border border-[#e6e6ee] bg-white p-3.5 shadow-2xs transition hover:border-[#d0d0de] hover:shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h3 className="truncate text-sm font-semibold text-[#111118]">
                                    {app.company}
                                  </h3>
                                  <p className="mt-0.5 line-clamp-2 text-xs text-[#5b5b6b]">
                                    {app.roleTitle}
                                  </p>
                                </div>
                                <span
                                  className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${roleBadgeClasses(
                                    app.roleTrack
                                  )}`}
                                >
                                  {roleMeta?.shortLabel ?? app.roleTrack.toUpperCase()}
                                </span>
                              </div>

                              {(countdown || app.debriefs.length > 0) && (
                                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                  {countdown && (
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${
                                        countdown.urgent
                                          ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                                          : 'bg-[#f4f4f8] text-[#454554]'
                                      }`}
                                    >
                                      <Calendar className="h-3 w-3" />
                                      {countdown.label}
                                    </span>
                                  )}
                                  {app.debriefs.length > 0 && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                      <CheckCircle2 className="h-3 w-3" />
                                      {app.debriefs.length}{' '}
                                      {app.debriefs.length === 1 ? 'debrief' : 'debriefs'}
                                    </span>
                                  )}
                                </div>
                              )}

                              <div className="mt-3 flex items-center justify-between gap-1.5 border-t border-[#f2f2f6] pt-2.5">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setWarRoomTarget(app)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-[#f4efff] px-2.5 py-1 text-[11px] font-semibold text-[#5d26d9] transition hover:bg-[#e9dfff]"
                                  >
                                    <Target className="h-3 w-3" />
                                    War Room
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDebriefTarget(app)}
                                    title="Log Post-Interview Debrief"
                                    className="inline-flex items-center gap-1 rounded-lg border border-[#e6e6ee] bg-white px-2 py-1 text-[11px] font-medium text-[#454554] transition hover:bg-[#f6f6fa]"
                                  >
                                    <ClipboardCheck className="h-3 w-3" />
                                    Debrief
                                  </button>
                                </div>

                                <div className="flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    disabled={fullStageIndex === 0}
                                    onClick={() => handleStageShift(app, -1)}
                                    title="Move to previous stage"
                                    className="rounded-md p-1 text-[#747486] hover:bg-[#f2f2f7] hover:text-[#111118] disabled:opacity-30"
                                  >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={fullStageIndex === STAGE_ORDER.length - 1}
                                    onClick={() => handleStageShift(app, 1)}
                                    title="Advance to next stage"
                                    className="rounded-md p-1 text-[#747486] hover:bg-[#f2f2f7] hover:text-[#111118] disabled:opacity-30"
                                  >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsNewModalOpen(false);
                                      setEditingApp(app);
                                    }}
                                    title="Edit application"
                                    className="rounded-md p-1 text-[#747486] hover:bg-[#f2f2f7] hover:text-[#111118]"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(app)}
                                    title="Delete application"
                                    className="rounded-md p-1 text-[#747486] hover:bg-rose-50 hover:text-rose-600"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </article>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Clean List View */
            <div className="overflow-hidden rounded-2xl border border-[#e6e6ee] bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <thead className="border-b border-[#ececef] bg-[#fafafc] text-[11px] font-semibold tracking-wide text-[#6c6c7d] uppercase">
                    <tr>
                      <th className="px-4 py-3">Company &amp; Role</th>
                      <th className="px-4 py-3">Track</th>
                      <th className="px-4 py-3">Stage</th>
                      <th className="px-4 py-3">Next Interview</th>
                      <th className="px-4 py-3">Debriefs</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f5]">
                    {visibleApplications.map((app) => {
                      const countdown = formatCountdown(app.nextInterviewDate, todayISO);
                      const roleMeta = ROLES_BY_ID[app.roleTrack];
                      return (
                        <tr key={app.id} className="hover:bg-[#fafafe]">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-[#111118]">{app.company}</div>
                            <div className="text-xs text-[#5b5b6b]">{app.roleTitle}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${roleBadgeClasses(
                                app.roleTrack
                              )}`}
                            >
                              {roleMeta?.shortLabel ?? app.roleTrack}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              aria-label={`Stage for ${app.company}`}
                              value={app.stage}
                              onChange={(e) =>
                                handleDirectStageChange(app, e.target.value as PipelineStage)
                              }
                              className="rounded-lg border border-[#e2e2ec] bg-white px-2.5 py-1 text-xs font-medium text-[#111118] focus:border-[#6e32f5] focus:outline-none"
                            >
                              {STAGES.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            {countdown ? (
                              <span
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                                  countdown.urgent
                                    ? 'bg-rose-50 text-rose-700'
                                    : 'bg-[#f4f4f8] text-[#454554]'
                                }`}
                              >
                                <Calendar className="h-3 w-3" />
                                {countdown.label} ({app.nextInterviewDate})
                              </span>
                            ) : (
                              <span className="text-xs text-[#9c9cae]">Not scheduled</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-[#5b5b6b]">
                            {app.debriefs.length}{' '}
                            {app.debriefs.length === 1 ? 'debrief' : 'debriefs'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setWarRoomTarget(app)}
                                className="inline-flex items-center gap-1 rounded-lg bg-[#f4efff] px-2.5 py-1 text-xs font-semibold text-[#5d26d9] hover:bg-[#e9dfff]"
                              >
                                <Target className="h-3.5 w-3.5" />
                                War Room
                              </button>
                              <button
                                type="button"
                                onClick={() => setDebriefTarget(app)}
                                className="rounded-lg border border-[#e5e5ec] px-2.5 py-1 text-xs font-medium text-[#454554] hover:bg-[#f6f6fa]"
                              >
                                Debrief
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsNewModalOpen(false);
                                  setEditingApp(app);
                                }}
                                className="rounded-lg p-1.5 text-[#747486] hover:bg-[#f2f2f7] hover:text-[#111118]"
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(app)}
                                className="rounded-lg p-1.5 text-[#747486] hover:bg-rose-50 hover:text-rose-600"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* 4-Year Total Comp Comparator */
        <section className="space-y-4">
          {offerApps.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#dcdce6] bg-white p-10 text-center">
              <DollarSign className="mx-auto h-8 w-8 text-[#9c9cae]" />
              <h2 className="mt-2.5 text-base font-semibold text-[#111118]">
                No offers or compensation packages logged yet
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-[#5b5b6b]">
                Move an application to Offer or enter compensation details inside Edit Application to compare Year 1, Recurring, and 4-Year Total Compensation side-by-side.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {offerApps.map((app) => {
                const { yr1, recurring, bonusDollar, fourYrTotal } =
                  calcYearlyAndFourYrTC(app.offerComp);
                const comp = app.offerComp ?? emptyOfferComp();
                return (
                  <div
                    key={app.id}
                    className="rounded-2xl border border-[#e6e6ee] bg-white p-5 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                          {getStageMeta(app.stage).label}
                        </span>
                        <h3 className="mt-2 text-lg font-semibold text-[#111118]">
                          {app.company}
                        </h3>
                        <p className="text-xs text-[#5b5b6b]">{app.roleTitle}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewModalOpen(false);
                          setEditingApp(app);
                        }}
                        className="rounded-lg border border-[#e6e6ee] px-2.5 py-1 text-xs font-medium text-[#454554] hover:bg-[#f6f6fa]"
                      >
                        Edit Comp
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-xl bg-[#f8f8fb] p-3.5">
                      <div>
                        <div className="text-[11px] text-[#6c6c7d]">Year 1 TC</div>
                        <div className="text-base font-semibold text-[#111118]">
                          {formatCurrency(yr1)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-[#6c6c7d]">Recurring / yr</div>
                        <div className="text-base font-semibold text-[#111118]">
                          {formatCurrency(recurring)}
                        </div>
                      </div>
                      <div className="col-span-2 border-t border-[#e8e8ef] pt-2">
                        <div className="text-[11px] text-[#6c6c7d]">4-Year Total Comp</div>
                        <div className="text-xl font-bold text-[#6e32f5]">
                          {formatCurrency(fourYrTotal)}
                        </div>
                      </div>
                    </div>

                    <dl className="mt-4 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <dt className="text-[#6c6c7d]">Base Salary</dt>
                        <dd className="font-medium text-[#111118]">
                          {formatCurrency(comp.base)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#6c6c7d]">
                          Target Bonus ({comp.bonusPct}%)
                        </dt>
                        <dd className="font-medium text-[#111118]">
                          {formatCurrency(bonusDollar)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#6c6c7d]">Annual Equity</dt>
                        <dd className="font-medium text-[#111118]">
                          {formatCurrency(comp.annualEquity)} / yr
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#6c6c7d]">Sign-on Bonus</dt>
                        <dd className="font-medium text-[#111118]">
                          {formatCurrency(comp.signOn)}
                        </dd>
                      </div>
                    </dl>
                    {comp.notes && (
                      <p className="mt-3 rounded-lg bg-[#fafafc] p-2.5 text-xs text-[#5b5b6b]">
                        {comp.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Deep Company War Room Modal */}
      {liveWarRoomApp && (
        <WarRoomModal
          app={liveWarRoomApp}
          onClose={() => setWarRoomTarget(null)}
          onUpdateApp={(updated) => upsertApplication(updated)}
          onOpenDebrief={() => {
            setDebriefTarget(liveWarRoomApp);
          }}
        />
      )}

      {/* Log Post-Interview Debrief Modal */}
      {liveDebriefApp && (
        <DebriefModal
          app={liveDebriefApp}
          todayISO={todayISO ?? new Date().toISOString().slice(0, 10)}
          onClose={() => setDebriefTarget(null)}
          onSave={(debrief) => {
            upsertApplication({
              ...liveDebriefApp,
              debriefs: [debrief, ...liveDebriefApp.debriefs],
              updatedAt: new Date().toISOString(),
            });
            setDebriefTarget(null);
          }}
        />
      )}

      {/* Add / Edit Application Modal */}
      {(isNewModalOpen || editingApp) && (
        <ApplicationEditorModal
          initialApp={editingApp}
          onClose={() => {
            setEditingApp(null);
            setIsNewModalOpen(false);
          }}
          onSave={(saved) => {
            upsertApplication(saved);
            setEditingApp(null);
            setIsNewModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Deep Company War Room Modal                                                */
/* -------------------------------------------------------------------------- */

function WarRoomModal({
  app,
  onClose,
  onUpdateApp,
  onOpenDebrief,
}: {
  app: JobApplication;
  onClose: () => void;
  onUpdateApp: (updated: JobApplication) => void;
  onOpenDebrief: () => void;
}) {
  const { state, todayISO } = useApp();
  const [reverseQuestionsDraft, setReverseQuestionsDraft] = useState(
    (app.reverseQuestions ?? []).join('\n')
  );
  const [notesDraft, setNotesDraft] = useState(app.notes ?? '');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    setReverseQuestionsDraft((app.reverseQuestions ?? []).join('\n'));
    setNotesDraft(app.notes ?? '');
  }, [app.id, app.reverseQuestions, app.notes]);

  const roleMeta = ROLES_BY_ID[app.roleTrack];
  const stageMeta = getStageMeta(app.stage);
  const countdown = formatCountdown(app.nextInterviewDate, todayISO);

  const matchedJD = useMemo(() => {
    if (app.linkedJdId) {
      const explicit = state.savedJDs.find((j) => j.id === app.linkedJdId);
      if (explicit) return explicit;
    }
    const targetCompany = app.company.trim().toLowerCase();
    if (!targetCompany) return null;
    return (
      state.savedJDs.find((j) => {
        const jc = j.company.trim().toLowerCase();
        return jc && (jc.includes(targetCompany) || targetCompany.includes(jc));
      }) ?? null
    );
  }, [app.linkedJdId, app.company, state.savedJDs]);

  const matchedQuestions = useMemo(() => {
    const all = getAllQuestions(state);
    const byRole = all.filter(
      (q) => q.role === app.roleTrack || q.secondaryRoles.includes(app.roleTrack)
    );
    const pool = byRole.length > 0 ? byRole : all;
    const priorityScore = (id: string) => {
      const s = getQuestionStatus(state, id);
      if (s === 'needs_drill') return 0;
      if (s === 'unpracticed') return 1;
      return 2;
    };
    return [...pool]
      .sort((a, b) => priorityScore(a.id) - priorityScore(b.id))
      .slice(0, 3);
  }, [state, app.roleTrack]);

  const matchedStories = useMemo(() => {
    const matching = state.stories.filter((s) =>
      s.targetRoles.includes(app.roleTrack)
    );
    return (matching.length > 0 ? matching : state.stories).slice(0, 3);
  }, [state.stories, app.roleTrack]);

  const latestDebrief = app.debriefs[0] ?? null;

  const handleSavePrepNotes = () => {
    const parsedReverse = reverseQuestionsDraft
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    onUpdateApp({
      ...app,
      reverseQuestions: parsedReverse,
      notes: notesDraft.trim() || undefined,
      updatedAt: new Date().toISOString(),
    });
    setSavedNotice('War Room notes saved');
    setTimeout(() => setSavedNotice(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 backdrop-blur-[2px] sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#e5e5ec] bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ececef] bg-[#fafafc] px-6 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f4efff] px-2.5 py-0.5 text-[11px] font-semibold text-[#5d26d9]">
                <Target className="h-3 w-3" />
                Company War Room
              </span>
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${roleBadgeClasses(
                  app.roleTrack
                )}`}
              >
                {roleMeta?.shortLabel ?? app.roleTrack}
              </span>
              <span
                className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${stageMeta.pillClass}`}
              >
                {stageMeta.label}
              </span>
              {countdown && (
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${
                    countdown.urgent
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-white text-[#454554] ring-1 ring-[#e5e5ec]'
                  }`}
                >
                  <Calendar className="h-3 w-3" />
                  {countdown.label} ({app.nextInterviewDate})
                </span>
              )}
            </div>
            <h2 className="mt-2 text-xl font-semibold text-[#111118]">
              {app.company} — {app.roleTitle}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {app.jdUrl && (
              <a
                href={app.jdUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-[#e2e2ec] bg-white px-2.5 py-1.5 text-xs font-medium text-[#454554] hover:bg-[#f6f6fa]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                JD Link
              </a>
            )}
            <button
              type="button"
              onClick={onOpenDebrief}
              className="inline-flex items-center gap-1 rounded-lg border border-[#e2e2ec] bg-white px-2.5 py-1.5 text-xs font-medium text-[#111118] hover:bg-[#f6f6fa]"
            >
              <ClipboardCheck className="h-3.5 w-3.5 text-[#6e32f5]" />
              Log Debrief
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close War Room"
              className="rounded-lg p-1.5 text-[#6c6c7d] hover:bg-[#ececef] hover:text-[#111118]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="grid flex-1 gap-5 overflow-y-auto p-6 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
            {/* JD Intelligence Card */}
            <section className="rounded-xl border border-[#e8e8ef] bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#6e32f5]" />
                  <h3 className="text-sm font-semibold text-[#111118]">
                    Job Description Intelligence
                  </h3>
                </div>
                {state.savedJDs.length > 0 && (
                  <select
                    aria-label="Link saved JD"
                    value={matchedJD?.id ?? ''}
                    onChange={(e) =>
                      onUpdateApp({
                        ...app,
                        linkedJdId: e.target.value || undefined,
                        updatedAt: new Date().toISOString(),
                      })
                    }
                    className="max-w-[220px] rounded-lg border border-[#e2e2ec] bg-[#fafafc] px-2 py-1 text-xs text-[#111118]"
                  >
                    <option value="">Auto-match JD...</option>
                    {state.savedJDs.map((jd) => (
                      <option key={jd.id} value={jd.id}>
                        {jd.company} — {jd.roleTitle}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {matchedJD ? (
                <div className="mt-3 space-y-2.5">
                  <p className="text-xs leading-relaxed text-[#454554]">
                    {matchedJD.summary}
                  </p>
                  {matchedJD.extractedSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {matchedJD.extractedSkills.slice(0, 10).map((skill) => (
                        <span
                          key={skill}
                          className="rounded-md bg-[#f4f4f8] px-2 py-0.5 text-[11px] font-medium text-[#343442]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3 flex items-center justify-between rounded-lg bg-[#fafafc] px-3 py-2.5 text-xs text-[#6c6c7d]">
                  <span>No saved JD matched for {app.company} yet.</span>
                  <Link
                    href="/materials"
                    className="font-semibold text-[#6e32f5] hover:underline"
                  >
                    Add in Materials →
                  </Link>
                </div>
              )}
            </section>

            {/* Role-Matched Practice Questions */}
            <section className="rounded-xl border border-[#e8e8ef] bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-[#6e32f5]" />
                  <h3 className="text-sm font-semibold text-[#111118]">
                    High-Priority Practice Questions ({roleMeta?.shortLabel ?? app.roleTrack})
                  </h3>
                </div>
                <Link
                  href={`/practice?role=${app.roleTrack}`}
                  className="text-xs font-medium text-[#6e32f5] hover:underline"
                >
                  Open Studio →
                </Link>
              </div>

              {matchedQuestions.length === 0 ? (
                <p className="mt-3 text-xs text-[#6c6c7d]">
                  No questions found in bank yet.
                </p>
              ) : (
                <div className="mt-3 space-y-2.5">
                  {matchedQuestions.map((q) => {
                    const status = getQuestionStatus(state, q.id);
                    return (
                      <div
                        key={q.id}
                        className="rounded-xl border border-[#ececef] bg-[#fafafc] p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium leading-relaxed text-[#111118]">
                            {q.prompt}
                          </p>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              status === 'mastered'
                                ? 'bg-emerald-50 text-emerald-700'
                                : status === 'needs_drill'
                                ? 'bg-amber-50 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {status === 'mastered'
                              ? 'Mastered'
                              : status === 'needs_drill'
                              ? 'Needs Drill'
                              : 'Unpracticed'}
                          </span>
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          <Link
                            href={`/practice?mode=mock&questionId=${encodeURIComponent(
                              q.id
                            )}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#111118] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#2a2a38]"
                          >
                            Mock Room →
                          </Link>
                          <Link
                            href={`/practice?mode=coach&role=${app.roleTrack}&questionId=${encodeURIComponent(
                              q.id
                            )}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#e0d6ff] bg-[#f7f4ff] px-2.5 py-1 text-[11px] font-medium text-[#5d26d9] hover:bg-[#ede7ff]"
                          >
                            <Sparkles className="h-3 w-3" />
                            Voice Drill
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Role-Matched STAR+L Stories */}
            <section className="rounded-xl border border-[#e8e8ef] bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-[#6e32f5]" />
                  <h3 className="text-sm font-semibold text-[#111118]">
                    Matched STAR+L Story Arsenal
                  </h3>
                </div>
                <Link
                  href="/stories"
                  className="text-xs font-medium text-[#6e32f5] hover:underline"
                >
                  All Stories →
                </Link>
              </div>

              {matchedStories.length === 0 ? (
                <p className="mt-3 text-xs text-[#6c6c7d]">
                  No stories in your bank yet. Add stories in the Story Bank to pair them with loops.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {matchedStories.map((story) => (
                    <div
                      key={story.id}
                      className="rounded-xl border border-[#ececef] bg-[#fafafc] p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold text-[#111118]">
                          {story.title}
                        </h4>
                        {story.metrics.length > 0 && (
                          <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            {story.metrics[0]}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-[#5b5b6b]">
                        {story.result || story.action || story.situation}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-5 lg:col-span-5">
            {/* Latest Debrief Snapshot */}
            <section className="rounded-xl border border-[#e8e8ef] bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-[#6e32f5]" />
                  <h3 className="text-sm font-semibold text-[#111118]">
                    Latest Debrief Snapshot
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onOpenDebrief}
                  className="text-xs font-semibold text-[#6e32f5] hover:underline"
                >
                  + Add Debrief
                </button>
              </div>

              {latestDebrief ? (
                <div className="mt-3 space-y-2 rounded-xl bg-[#fafafc] p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#111118]">
                      {latestDebrief.roundName}
                    </span>
                    <span className="text-[#6c6c7d]">{latestDebrief.dateISO}</span>
                  </div>
                  {latestDebrief.wentWell && (
                    <p className="text-[#454554]">
                      <strong className="text-emerald-700">Signal:</strong>{' '}
                      {latestDebrief.wentWell}
                    </p>
                  )}
                  {latestDebrief.stumbledOn && (
                    <p className="text-[#454554]">
                      <strong className="text-amber-700">Gap:</strong>{' '}
                      {latestDebrief.stumbledOn}
                    </p>
                  )}
                  {latestDebrief.followUpProbes && (
                    <p className="text-[#454554]">
                      <strong className="text-[#5b5b6b]">Probes:</strong>{' '}
                      {latestDebrief.followUpProbes}
                    </p>
                  )}
                  {latestDebrief.nextAction && (
                    <div className="rounded-lg border border-[#e2d4ff] bg-[#f7f4ff] p-2 text-[#4c1eb8]">
                      <strong>Next Action:</strong> {latestDebrief.nextAction}
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-xs text-[#6c6c7d]">
                  No post-interview debriefs logged yet. Capture signals right after each round while details are fresh.
                </p>
              )}
            </section>

            {/* Reverse Q&A Builder & Company Notes */}
            <section className="rounded-xl border border-[#e8e8ef] bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#111118]">
                  Reverse Q&amp;A &amp; Loop Notes
                </h3>
                {savedNotice && (
                  <span className="text-[11px] font-medium text-emerald-600">
                    {savedNotice}
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#5b5b6b]">
                    Questions to Ask Interviewers (one per line)
                  </label>
                  <textarea
                    rows={4}
                    value={reverseQuestionsDraft}
                    onChange={(e) => setReverseQuestionsDraft(e.target.value)}
                    placeholder="How does the FDE team balance bespoke prototypes with reusable platform primitives?"
                    className="mt-1 w-full rounded-xl border border-[#e2e2ec] bg-[#fafafc] p-2.5 text-xs text-[#111118] focus:border-[#6e32f5] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#5b5b6b]">
                    Interviewer &amp; Strategy Notes
                  </label>
                  <textarea
                    rows={4}
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="Recruiter insights, team topology, domain terminology..."
                    className="mt-1 w-full rounded-xl border border-[#e2e2ec] bg-[#fafafc] p-2.5 text-xs text-[#111118] focus:border-[#6e32f5] focus:bg-white focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSavePrepNotes}
                  className="w-full rounded-xl bg-[#111118] py-2 text-xs font-semibold text-white transition hover:bg-[#272734]"
                >
                  Save War Room Notes
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Debrief Modal                                                              */
/* -------------------------------------------------------------------------- */

function DebriefModal({
  app,
  todayISO,
  onClose,
  onSave,
}: {
  app: JobApplication;
  todayISO: string;
  onClose: () => void;
  onSave: (debrief: PostInterviewDebrief) => void;
}) {
  const [roundName, setRoundName] = useState('Technical / Case Round');
  const [dateISO, setDateISO] = useState(todayISO);
  const [wentWell, setWentWell] = useState('');
  const [stumbledOn, setStumbledOn] = useState('');
  const [followUpProbes, setFollowUpProbes] = useState('');
  const [nextAction, setNextAction] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      roundName: roundName.trim() || 'Interview Round',
      dateISO,
      wentWell: wentWell.trim(),
      stumbledOn: stumbledOn.trim(),
      followUpProbes: followUpProbes.trim(),
      nextAction: nextAction.trim(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl border border-[#e5e5ec] bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#111118]">
              Log Post-Interview Debrief
            </h2>
            <p className="text-xs text-[#5b5b6b]">
              {app.company} — {app.roleTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#6c6c7d] hover:bg-[#f2f2f7]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#454554]">Round</label>
              <input
                type="text"
                required
                value={roundName}
                onChange={(e) => setRoundName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#e2e2ec] px-3 py-2 text-[#111118] focus:border-[#6e32f5] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-[#454554]">Date</label>
              <input
                type="date"
                value={dateISO}
                onChange={(e) => setDateISO(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#e2e2ec] px-3 py-2 text-[#111118] focus:border-[#6e32f5] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#454554]">
              What Went Well (Strong Signals)
            </label>
            <textarea
              rows={2}
              value={wentWell}
              onChange={(e) => setWentWell(e.target.value)}
              placeholder="Clear architecture scoping, strong executive presence..."
              className="mt-1 w-full rounded-xl border border-[#e2e2ec] p-2.5 text-[#111118] focus:border-[#6e32f5] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-[#454554]">
              Where You Stumbled / Gaps
            </label>
            <textarea
              rows={2}
              value={stumbledOn}
              onChange={(e) => setStumbledOn(e.target.value)}
              placeholder="Needed sharper unit economics math or latency trade-offs..."
              className="mt-1 w-full rounded-xl border border-[#e2e2ec] p-2.5 text-[#111118] focus:border-[#6e32f5] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-[#454554]">
              Follow-Up Probes Asked
            </label>
            <input
              type="text"
              value={followUpProbes}
              onChange={(e) => setFollowUpProbes(e.target.value)}
              placeholder="How would you handle cold-start evals with 0 ground truth?"
              className="mt-1 w-full rounded-xl border border-[#e2e2ec] px-3 py-2 text-[#111118] focus:border-[#6e32f5] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-[#454554]">
              Immediate Next Action
            </label>
            <input
              type="text"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="Send thank-you note + drill AI eval latency question"
              className="mt-1 w-full rounded-xl border border-[#e2e2ec] px-3 py-2 text-[#111118] focus:border-[#6e32f5] focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#e2e2ec] px-4 py-2 text-xs font-medium text-[#454554] hover:bg-[#f6f6fa]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-xl bg-[#6e32f5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5c25db]"
          >
            Save Debrief
          </button>
        </div>
      </form>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Add / Edit Application Modal                                               */
/* -------------------------------------------------------------------------- */

function ApplicationEditorModal({
  initialApp,
  onClose,
  onSave,
}: {
  initialApp: JobApplication | null;
  onClose: () => void;
  onSave: (app: JobApplication) => void;
}) {
  const [company, setCompany] = useState(initialApp?.company ?? '');
  const [roleTitle, setRoleTitle] = useState(initialApp?.roleTitle ?? '');
  const [roleTrack, setRoleTrack] = useState<RoleTrack>(
    initialApp?.roleTrack ?? 'fde'
  );
  const [stage, setStage] = useState<PipelineStage>(
    initialApp?.stage ?? 'wishlist'
  );
  const [nextInterviewDate, setNextInterviewDate] = useState(
    initialApp?.nextInterviewDate ?? ''
  );
  const [jdUrl, setJdUrl] = useState(initialApp?.jdUrl ?? '');
  const [notes, setNotes] = useState(initialApp?.notes ?? '');

  const [base, setBase] = useState(String(initialApp?.offerComp?.base ?? ''));
  const [bonusPct, setBonusPct] = useState(
    String(initialApp?.offerComp?.bonusPct ?? '')
  );
  const [annualEquity, setAnnualEquity] = useState(
    String(initialApp?.offerComp?.annualEquity ?? '')
  );
  const [signOn, setSignOn] = useState(
    String(initialApp?.offerComp?.signOn ?? '')
  );
  const [compNotes, setCompNotes] = useState(
    initialApp?.offerComp?.notes ?? ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !roleTitle.trim()) return;

    const hasComp =
      Number(base) > 0 ||
      Number(bonusPct) > 0 ||
      Number(annualEquity) > 0 ||
      Number(signOn) > 0 ||
      compNotes.trim().length > 0;

    onSave({
      id: initialApp?.id ?? `app_${Date.now()}`,
      company: company.trim(),
      roleTitle: roleTitle.trim(),
      roleTrack,
      stage,
      nextInterviewDate: nextInterviewDate.trim() || undefined,
      jdUrl: jdUrl.trim() || undefined,
      linkedJdId: initialApp?.linkedJdId,
      linkedResumeId: initialApp?.linkedResumeId,
      resumeVersion: initialApp?.resumeVersion,
      reverseQuestions: initialApp?.reverseQuestions,
      recruiterName: initialApp?.recruiterName,
      notes: notes.trim() || undefined,
      debriefs: initialApp?.debriefs ?? [],
      offerComp: hasComp
        ? {
            base: Number(base) || 0,
            bonusPct: Number(bonusPct) || 0,
            annualEquity: Number(annualEquity) || 0,
            signOn: Number(signOn) || 0,
            notes: compNotes.trim() || undefined,
          }
        : undefined,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#e5e5ec] bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#111118]">
            {initialApp ? `Edit ${initialApp.company}` : 'Add Target Application'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#6c6c7d] hover:bg-[#f2f2f7]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3.5 text-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-medium text-[#454554]">Company *</label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Palantir, OpenAI, Scale AI"
                className="mt-1 w-full rounded-xl border border-[#e2e2ec] px-3 py-2 text-[#111118] focus:border-[#6e32f5] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-[#454554]">Role Title *</label>
              <input
                type="text"
                required
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="e.g. Forward Deployed Engineer"
                className="mt-1 w-full rounded-xl border border-[#e2e2ec] px-3 py-2 text-[#111118] focus:border-[#6e32f5] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block font-medium text-[#454554]">Track</label>
              <select
                value={roleTrack}
                onChange={(e) => setRoleTrack(e.target.value as RoleTrack)}
                className="mt-1 w-full rounded-xl border border-[#e2e2ec] bg-white px-3 py-2 text-[#111118] focus:border-[#6e32f5] focus:outline-none"
              >
                {ROLE_LIST.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.shortLabel} — {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-[#454554]">Stage</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as PipelineStage)}
                className="mt-1 w-full rounded-xl border border-[#e2e2ec] bg-white px-3 py-2 text-[#111118] focus:border-[#6e32f5] focus:outline-none"
              >
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-[#454554]">
                Next Interview
              </label>
              <input
                type="date"
                value={nextInterviewDate}
                onChange={(e) => setNextInterviewDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#e2e2ec] px-3 py-2 text-[#111118] focus:border-[#6e32f5] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#454554]">JD URL</label>
            <input
              type="url"
              value={jdUrl}
              onChange={(e) => setJdUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 w-full rounded-xl border border-[#e2e2ec] px-3 py-2 text-[#111118] focus:border-[#6e32f5] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-[#454554]">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Referral, recruiter contact, interview format..."
              className="mt-1 w-full rounded-xl border border-[#e2e2ec] p-2.5 text-[#111118] focus:border-[#6e32f5] focus:outline-none"
            />
          </div>

          <div className="rounded-xl border border-[#ececef] bg-[#fafafc] p-3.5">
            <div className="mb-2 font-semibold text-[#111118]">
              Offer / Comp Breakdown (Optional)
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-[#5b5b6b]">Base ($)</label>
                <input
                  type="number"
                  min={0}
                  value={base}
                  onChange={(e) => setBase(e.target.value)}
                  placeholder="200000"
                  className="mt-1 w-full rounded-lg border border-[#e2e2ec] bg-white px-2.5 py-1.5 text-[#111118]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#5b5b6b]">
                  Target Bonus (%)
                </label>
                <input
                  type="number"
                  min={0}
                  value={bonusPct}
                  onChange={(e) => setBonusPct(e.target.value)}
                  placeholder="15"
                  className="mt-1 w-full rounded-lg border border-[#e2e2ec] bg-white px-2.5 py-1.5 text-[#111118]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#5b5b6b]">
                  Annual Equity ($)
                </label>
                <input
                  type="number"
                  min={0}
                  value={annualEquity}
                  onChange={(e) => setAnnualEquity(e.target.value)}
                  placeholder="100000"
                  className="mt-1 w-full rounded-lg border border-[#e2e2ec] bg-white px-2.5 py-1.5 text-[#111118]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#5b5b6b]">
                  Sign-on ($)
                </label>
                <input
                  type="number"
                  min={0}
                  value={signOn}
                  onChange={(e) => setSignOn(e.target.value)}
                  placeholder="25000"
                  className="mt-1 w-full rounded-lg border border-[#e2e2ec] bg-white px-2.5 py-1.5 text-[#111118]"
                />
              </div>
            </div>
            <input
              type="text"
              value={compNotes}
              onChange={(e) => setCompNotes(e.target.value)}
              placeholder="Vesting schedule, relocation, negotiation leverage..."
              className="mt-2.5 w-full rounded-lg border border-[#e2e2ec] bg-white px-2.5 py-1.5 text-[#111118]"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#e2e2ec] px-4 py-2 text-xs font-medium text-[#454554] hover:bg-[#f6f6fa]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-xl bg-[#6e32f5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5c25db]"
          >
            {initialApp ? 'Save Changes' : 'Add Application'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function JobPipelinePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1440px] px-6 py-10 text-sm text-[#6c6c7d]">
          Loading job pipeline...
        </div>
      }
    >
      <PipelineInner />
    </Suspense>
  );
}
