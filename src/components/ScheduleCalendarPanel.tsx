'use client';

import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { daysUntil } from '@/lib/helpers';
import { ROLE_LIST, ROLES_BY_ID } from '@/lib/roles';
import { RoleTrack, UpcomingLoop } from '@/lib/types';

export interface CalendarEventItem {
  id: string;
  summary: string;
  startISO: string;
  dateISO: string;
  dateLabel: string;
  timeLabel: string;
  location?: string;
}

interface ScheduleCalendarPanelProps {
  mounted: boolean;
  todayISO: string | null;
  upcomingLoops: UpcomingLoop[];
  googleCalendarIcsUrl?: string;
  gcalEvents: CalendarEventItem[];
  gcalLoading: boolean;
  gcalError: string | null;
  onRefreshGcal: () => void;
  onSaveGcalUrl: (url: string) => void;
  onAddLoop: (loop: Omit<UpcomingLoop, 'id'>) => void;
  onRemoveLoop: (id: string) => void;
}

function buildGoogleCalendarUrl(title: string, dateISO: string, details: string): string {
  const compactDate = dateISO.replace(/-/g, '');
  const start = `${compactDate}T100000`;
  const end = `${compactDate}T110000`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${start}/${end}`,
    details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function ScheduleCalendarPanel({
  mounted,
  todayISO,
  upcomingLoops,
  googleCalendarIcsUrl,
  gcalEvents,
  gcalLoading,
  gcalError,
  onRefreshGcal,
  onSaveGcalUrl,
  onAddLoop,
  onRemoveLoop,
}: ScheduleCalendarPanelProps) {
  const [showGcalSetup, setShowGcalSetup] = useState(false);
  const [gcalInput, setGcalInput] = useState(googleCalendarIcsUrl ?? '');
  const [showAddLoop, setShowAddLoop] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState<RoleTrack>('fde');
  const [newRound, setNewRound] = useState('System & Problem Decomposition');
  const [newDate, setNewDate] = useState(todayISO ?? '2026-11-28');

  // Month navigation state (defaults to Nov 2026 or current todayISO month)
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDateISO, setSelectedDateISO] = useState<string | null>(null);

  const baseMonthDate = useMemo(() => {
    const ref = todayISO ? new Date(`${todayISO}T00:00:00`) : new Date('2026-11-22T00:00:00');
    return new Date(ref.getFullYear(), ref.getMonth() + monthOffset, 1);
  }, [todayISO, monthOffset]);

  const monthLabel = useMemo(() => {
    return baseMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [baseMonthDate]);

  // Map dateISO -> events + loops for instant calendar cell rendering
  const eventsByDate = useMemo(() => {
    const map: Record<
      string,
      { loops: UpcomingLoop[]; gcal: CalendarEventItem[] }
    > = {};
    upcomingLoops.forEach((loop) => {
      if (!map[loop.dateISO]) map[loop.dateISO] = { loops: [], gcal: [] };
      map[loop.dateISO].loops.push(loop);
    });
    gcalEvents.forEach((ev) => {
      if (!map[ev.dateISO]) map[ev.dateISO] = { loops: [], gcal: [] };
      map[ev.dateISO].gcal.push(ev);
    });
    return map;
  }, [upcomingLoops, gcalEvents]);

  const calendarCells = useMemo(() => {
    const year = baseMonthDate.getFullYear();
    const month = baseMonthDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: Array<{
      dateISO: string;
      dayNum: number;
      inMonth: boolean;
    }> = [];

    // Leading empty/prev-month days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      cells.push({
        dateISO: d.toISOString().slice(0, 10),
        dayNum: prevMonthDays - i,
        inMonth: false,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      cells.push({
        dateISO: d.toISOString().slice(0, 10),
        dayNum: day,
        inMonth: true,
      });
    }

    // Trailing days to complete 35 or 42 grid
    const targetLen = cells.length <= 35 ? 35 : 42;
    let nextDay = 1;
    while (cells.length < targetLen) {
      const d = new Date(year, month + 1, nextDay);
      cells.push({
        dateISO: d.toISOString().slice(0, 10),
        dayNum: nextDay,
        inMonth: false,
      });
      nextDay++;
    }

    return cells;
  }, [baseMonthDate]);

  const selectedDayData = selectedDateISO ? eventsByDate[selectedDateISO] : null;

  const handleSaveGcal = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveGcalUrl(gcalInput.trim());
    setShowGcalSetup(false);
  };

  const handleAddLoopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.trim()) return;
    onAddLoop({
      company: newCompany.trim(),
      role: newRole,
      round: newRound.trim() || 'System & Problem Decomposition',
      dateISO: newDate,
      notes: '',
    });
    setNewCompany('');
    setShowAddLoop(false);
  };

  return (
    <section className="rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-2xs">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F2F2F7] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F3ECFF] text-[#6E32F5]">
            <CalendarIcon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#111118]">
              Schedule &amp; Google Calendar
            </h2>
            <p className="text-[11px] text-[#848494]">
              原生月历视图 · 实时同步 Google Calendar 日程与面试 Loop
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {googleCalendarIcsUrl && (
            <button
              type="button"
              onClick={onRefreshGcal}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50/60 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100/60"
            >
              <RefreshCw className={`h-3 w-3 ${gcalLoading ? 'animate-spin' : ''}`} />
              Sync Now
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setGcalInput(googleCalendarIcsUrl ?? '');
              setShowGcalSetup((v) => !v);
            }}
            className="rounded-lg border border-[#ECECF2] bg-[#FAFAFC] px-2.5 py-1.5 text-[11px] font-semibold text-[#6E32F5] transition hover:border-[#6E32F5]"
          >
            {googleCalendarIcsUrl ? 'GCal Connected' : 'Connect GCal'}
          </button>
          <button
            type="button"
            onClick={() => setShowAddLoop((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg bg-[#6E32F5] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#5B24D6]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Loop
          </button>
        </div>
      </div>

      {/* Optional GCal Setup / Add Loop Forms */}
      {showGcalSetup && (
        <form
          onSubmit={handleSaveGcal}
          className="mt-4 space-y-2 rounded-xl border border-[#6E32F5]/25 bg-[#F9F6FF] p-3.5"
        >
          <div className="text-xs font-semibold text-[#111118]">
            Google Calendar iCal (.ics) 同步设置
          </div>
          <p className="text-[11px] leading-relaxed text-[#5E5E6E]">
            在 Google Calendar 网页端 → 设置 → 你的日历 → Integrate calendar → 复制{' '}
            <span className="font-medium text-[#111118]">Secret address in iCal format</span>{' '}
            粘贴到下方：
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              type="url"
              value={gcalInput}
              onChange={(e) => setGcalInput(e.target.value)}
              placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
              className="min-w-[240px] flex-1 rounded-lg border border-[#ECECF2] bg-white px-3 py-1.5 text-xs focus:border-[#6E32F5] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowGcalSetup(false)}
              className="rounded-lg px-2.5 py-1.5 text-xs text-[#5E5E6E]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#6E32F5] px-3.5 py-1.5 text-xs font-semibold text-white"
            >
              Save &amp; Sync
            </button>
          </div>
        </form>
      )}

      {showAddLoop && (
        <form
          onSubmit={handleAddLoopSubmit}
          className="mt-4 space-y-2 rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-3.5"
        >
          <div className="grid gap-2 sm:grid-cols-4">
            <input
              type="text"
              required
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              placeholder="Company (e.g. OpenAI)"
              className="rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs focus:border-[#6E32F5] focus:outline-none"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as RoleTrack)}
              className="rounded-lg border border-[#ECECF2] bg-white px-2 py-1.5 text-xs"
            >
              {ROLE_LIST.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.shortLabel}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="rounded-lg border border-[#ECECF2] bg-white px-2 py-1.5 text-xs"
            />
            <input
              type="text"
              value={newRound}
              onChange={(e) => setNewRound(e.target.value)}
              placeholder="Round focus"
              className="rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddLoop(false)}
              className="rounded-lg px-2.5 py-1 text-xs text-[#5E5E6E]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#6E32F5] px-3.5 py-1 text-xs font-semibold text-white"
            >
              Add Loop
            </button>
          </div>
        </form>
      )}

      {gcalError && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{gcalError}</p>
      )}

      {/* Full-Width Split: Native Month Calendar (7 cols) + Agenda & Loops (5 cols) */}
      <div className="mt-4 grid gap-5 lg:grid-cols-12">
        {/* Left: Native-Style Monthly Calendar Grid */}
        <div className="rounded-xl border border-[#EFEFF5] bg-[#FAFAFC]/70 p-3.5 lg:col-span-7">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-[#111118]">{monthLabel}</div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setMonthOffset(0);
                  setSelectedDateISO(todayISO);
                }}
                className="rounded-lg border border-[#ECECF2] bg-white px-2 py-1 text-[11px] font-medium text-[#5E5E6E] hover:text-[#111118]"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setMonthOffset((v) => v - 1)}
                className="rounded-lg border border-[#ECECF2] bg-white p-1 text-[#5E5E6E] hover:text-[#111118]"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setMonthOffset((v) => v + 1)}
                className="rounded-lg border border-[#ECECF2] bg-white p-1 text-[#5E5E6E] hover:text-[#111118]"
                aria-label="Next month"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-[#848494]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {calendarCells.map((cell) => {
              const dayItems = eventsByDate[cell.dateISO];
              const loopCount = dayItems?.loops.length ?? 0;
              const gcalCount = dayItems?.gcal.length ?? 0;
              const isToday = mounted && todayISO === cell.dateISO;
              const isSelected = selectedDateISO === cell.dateISO;

              return (
                <button
                  key={cell.dateISO}
                  type="button"
                  onClick={() =>
                    setSelectedDateISO((prev) => (prev === cell.dateISO ? null : cell.dateISO))
                  }
                  className={`flex min-h-[54px] flex-col items-start justify-between rounded-lg border p-1.5 text-left transition ${
                    isSelected
                      ? 'border-[#6E32F5] bg-[#F3ECFF]/70'
                      : isToday
                        ? 'border-[#6E32F5]/50 bg-white'
                        : cell.inMonth
                          ? 'border-[#EFEFF5] bg-white hover:border-[#D4C5FD]'
                          : 'border-transparent bg-transparent text-[#B4B4C2]'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                      isToday
                        ? 'bg-[#6E32F5] text-white'
                        : cell.inMonth
                          ? 'text-[#111118]'
                          : 'text-[#B4B4C2]'
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  {(loopCount > 0 || gcalCount > 0) && (
                    <div className="w-full space-y-0.5">
                      {dayItems?.loops.slice(0, 1).map((lp) => (
                        <div
                          key={lp.id}
                          className="truncate rounded bg-[#F3ECFF] px-1 py-0.5 text-[9px] font-semibold text-[#6E32F5]"
                        >
                          {lp.company}
                        </div>
                      ))}
                      {dayItems?.gcal.slice(0, 1).map((ev) => (
                        <div
                          key={ev.id}
                          className="truncate rounded bg-emerald-50 px-1 py-0.5 text-[9px] font-medium text-emerald-700"
                        >
                          {ev.summary}
                        </div>
                      ))}
                      {loopCount + gcalCount > 2 && (
                        <div className="px-0.5 text-[9px] font-medium text-[#848494]">
                          +{loopCount + gcalCount - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Agenda Stream (Selected Day or Upcoming GCal + Loops) */}
        <div className="flex flex-col justify-between space-y-4 lg:col-span-5">
          {selectedDateISO ? (
            <div className="rounded-xl border border-[#6E32F5]/25 bg-[#F9F6FF] p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#6E32F5]">
                  {selectedDateISO} 日程详情
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDateISO(null)}
                  className="text-[11px] font-medium text-[#5E5E6E] hover:underline"
                >
                  查看全部
                </button>
              </div>
              {!selectedDayData ||
              (selectedDayData.loops.length === 0 && selectedDayData.gcal.length === 0) ? (
                <p className="mt-2 text-xs text-[#5E5E6E]">这一天暂无面试或日历日程。</p>
              ) : (
                <div className="mt-2.5 space-y-2">
                  {selectedDayData.loops.map((lp) => (
                    <div key={lp.id} className="rounded-lg bg-white p-2.5 text-xs shadow-2xs">
                      <div className="font-semibold text-[#111118]">
                        {lp.company} · {ROLES_BY_ID[lp.role]?.shortLabel}
                      </div>
                      <div className="text-[11px] text-[#5E5E6E]">{lp.round}</div>
                    </div>
                  ))}
                  {selectedDayData.gcal.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-lg border border-emerald-200 bg-white p-2.5 text-xs"
                    >
                      <div className="font-semibold text-[#111118]">{ev.summary}</div>
                      <div className="text-[11px] text-emerald-700">
                        Google Calendar · {ev.timeLabel}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Google Calendar Live Events */}
              {googleCalendarIcsUrl && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                      Google Calendar ({gcalEvents.length})
                    </span>
                  </div>
                  <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                    {gcalEvents.length === 0 && !gcalLoading ? (
                      <p className="text-xs text-[#848494]">近期暂无日历日程。</p>
                    ) : (
                      gcalEvents.slice(0, 6).map((ev) => (
                        <div
                          key={ev.id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200/70 bg-emerald-50/35 px-3 py-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-[#111118]">
                              {ev.summary}
                            </div>
                            <div className="text-[11px] text-[#5E5E6E]">
                              {ev.dateLabel} · {ev.timeLabel}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Upcoming Interview Loops */}
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#848494]">
                  Upcoming Interview Loops ({upcomingLoops.length})
                </div>
                <div className="space-y-2">
                  {upcomingLoops.map((loop) => {
                    const days = mounted ? daysUntil(loop.dateISO, todayISO) : null;
                    const gcalLink = buildGoogleCalendarUrl(
                      `${loop.company} Interview — ${ROLES_BY_ID[loop.role]?.shortLabel ?? loop.role}`,
                      loop.dateISO,
                      `${loop.round}\n${loop.notes ?? ''}`
                    );
                    return (
                      <div
                        key={loop.id}
                        className="group flex items-center justify-between gap-2 rounded-xl border border-[#EFEFF5] bg-[#FAFAFC] px-3 py-2.5 transition hover:border-[#6E32F5]/30 hover:bg-white"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <BookOpen className="h-3.5 w-3.5 shrink-0 text-[#6E32F5]" />
                          <div className="min-w-0">
                            <div className="truncate text-xs font-semibold text-[#111118]">
                              {loop.company}{' '}
                              <span className="font-normal text-[#848494]">
                                · {ROLES_BY_ID[loop.role]?.shortLabel}
                              </span>
                            </div>
                            <div className="truncate text-[11px] text-[#5E5E6E]">{loop.round}</div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className="font-mono text-[11px] font-semibold text-[#6E32F5]"
                            suppressHydrationWarning
                          >
                            {days !== null ? (days >= 0 ? `T-${days}d` : 'Done') : loop.dateISO}
                          </span>
                          <a
                            href={gcalLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[#6E32F5] hover:underline"
                            title="Add to Google Calendar"
                          >
                            GCal
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => onRemoveLoop(loop.id)}
                            className="rounded p-0.5 text-[#C2C2D0] opacity-0 transition hover:text-rose-600 group-hover:opacity-100"
                            title="Remove loop"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
