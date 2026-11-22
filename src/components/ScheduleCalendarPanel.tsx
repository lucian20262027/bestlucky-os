'use client';

import React, { useMemo, useState } from 'react';
import {
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
  endISO: string;
  dateISO: string;
  dateLabel: string;
  timeLabel: string;
  timeRangeLabel: string;
  startMinutes: number;
  durationMinutes: number;
  isAllDay: boolean;
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

function getEventColorClasses(summary: string): string {
  const s = summary.toLowerCase();
  if (s.includes('interview') || s.includes('prep')) {
    return 'bg-[#5C6BC0] text-white border-[#3F51B5]';
  }
  if (s.includes('agent') || s.includes('study')) {
    return 'bg-[#F4511E] text-white border-[#D84315]';
  }
  if (s.includes('shadow') || s.includes('speak') || s.includes('lenny')) {
    return 'bg-[#8E24AA] text-white border-[#6A1B9A]';
  }
  if (s.includes('meditation')) {
    return 'bg-[#C0CA33] text-[#1B1B1F] border-[#9E9D24]';
  }
  if (s.includes('black friday') || s.includes('thanksgiving')) {
    return 'bg-[#0B8043] text-white border-[#096937]';
  }
  return 'bg-[#1A73E8] text-white border-[#1557B0]';
}

function formatHourLabel(hour24: number): string {
  const h = ((hour24 % 24) + 24) % 24;
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

const WEEK_START_HOUR = 12; // 12 PM SFO (4 AM Beijing)
const WEEK_END_HOUR = 23; // 11 PM SFO (3 PM Beijing)
const HOUR_HEIGHT = 44;

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
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [showGcalSetup, setShowGcalSetup] = useState(false);
  const [gcalInput, setGcalInput] = useState(googleCalendarIcsUrl ?? '');
  const [showAddLoop, setShowAddLoop] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState<RoleTrack>('fde');
  const [newRound, setNewRound] = useState('System & Problem Decomposition');
  const [newDate, setNewDate] = useState(todayISO ?? '2026-11-28');

  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  // Compute current week Sun-Sat
  const weekDays = useMemo(() => {
    const ref = todayISO ? new Date(`${todayISO}T00:00:00`) : new Date('2026-11-22T00:00:00');
    const sunday = new Date(ref);
    sunday.setDate(ref.getDate() - ref.getDay() + weekOffset * 7);

    return Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + idx);
      return {
        dateISO: d.toISOString().slice(0, 10),
        dayShort: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        dayNum: d.getDate(),
      };
    });
  }, [todayISO, weekOffset]);

  const weekHeaderLabel = useMemo(() => {
    const first = new Date(`${weekDays[0].dateISO}T00:00:00`);
    return first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [weekDays]);

  const baseMonthDate = useMemo(() => {
    const ref = todayISO ? new Date(`${todayISO}T00:00:00`) : new Date('2026-11-22T00:00:00');
    return new Date(ref.getFullYear(), ref.getMonth() + monthOffset, 1);
  }, [todayISO, monthOffset]);

  const monthLabel = useMemo(
    () => baseMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    [baseMonthDate]
  );

  // Map dateISO -> events + loops
  const eventsByDate = useMemo(() => {
    const map: Record<string, { loops: UpcomingLoop[]; gcal: CalendarEventItem[] }> = {};
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
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ dateISO: string; dayNum: number; inMonth: boolean }> = [];

    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      cells.push({
        dateISO: d.toISOString().slice(0, 10),
        dayNum: prevMonthDays - i,
        inMonth: false,
      });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      cells.push({
        dateISO: d.toISOString().slice(0, 10),
        dayNum: day,
        inMonth: true,
      });
    }
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

  const hours = useMemo(
    () => Array.from({ length: WEEK_END_HOUR - WEEK_START_HOUR + 1 }, (_, i) => WEEK_START_HOUR + i),
    []
  );

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
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F2F2F7] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F3ECFF] text-[#6E32F5]">
            <CalendarIcon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#111118]">
              Schedule &amp; Google Calendar
            </h2>
            <p className="text-[11px] text-[#848494]">
              原生态双时区日程视图 (Beijing + SFO) · 完整同步重复日程与面试 Loop
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Week / Month Toggle */}
          <div className="inline-flex rounded-lg border border-[#ECECF2] bg-[#FAFAFC] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                viewMode === 'week'
                  ? 'bg-white text-[#6E32F5] shadow-2xs'
                  : 'text-[#5E5E6E] hover:text-[#111118]'
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                viewMode === 'month'
                  ? 'bg-white text-[#6E32F5] shadow-2xs'
                  : 'text-[#5E5E6E] hover:text-[#111118]'
              }`}
            >
              Month
            </button>
          </div>

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

      {/* GCal Setup Form (Supports multiple .ics URLs!) */}
      {showGcalSetup && (
        <form
          onSubmit={handleSaveGcal}
          className="mt-4 space-y-2 rounded-xl border border-[#6E32F5]/25 bg-[#F9F6FF] p-3.5"
        >
          <div className="text-xs font-semibold text-[#111118]">
            Google Calendar iCal (.ics) 多日历同步设置
          </div>
          <p className="text-[11px] leading-relaxed text-[#5E5E6E]">
            如果你在 Google Calendar 有多个日历（例如 <code>Lucian Wang</code> +{' '}
            <code>chenniwan365@gmail.com</code>），可以每行粘贴一个{' '}
            <span className="font-medium text-[#111118]">Secret address in iCal format</span>{' '}
            链接，系统会自动合并所有重复日程：
          </p>
          <textarea
            rows={2}
            value={gcalInput}
            onChange={(e) => setGcalInput(e.target.value)}
            placeholder="https://calendar.google.com/calendar/ical/.../basic.ics (多个日历可换行输入)"
            className="w-full rounded-lg border border-[#ECECF2] bg-white px-3 py-2 text-xs focus:border-[#6E32F5] focus:outline-none"
          />
          <div className="flex justify-end gap-2">
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

      {/* VIEW 1: Native Google Calendar Weekly Time-Grid */}
      {viewMode === 'week' && (
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[740px]">
            {/* Week Nav */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWeekOffset(0)}
                  className="rounded-full border border-[#ECECF2] bg-white px-3 py-1 text-xs font-medium text-[#111118] hover:bg-[#FAFAFC]"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setWeekOffset((v) => v - 1)}
                  className="rounded-full border border-[#ECECF2] bg-white p-1.5 text-[#5E5E6E] hover:text-[#111118]"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setWeekOffset((v) => v + 1)}
                  className="rounded-full border border-[#ECECF2] bg-white p-1.5 text-[#5E5E6E] hover:text-[#111118]"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <span className="ml-1 text-base font-semibold text-[#111118]">
                  {weekHeaderLabel}
                </span>
              </div>
              <span className="text-[11px] text-[#848494]">
                {gcalEvents.length > 0
                  ? `已同步 ${gcalEvents.length} 条 Google 日历日程`
                  : '点击 Connect GCal 接入你的 Google 日历'}
              </span>
            </div>

            {/* Day Headers + All-Day Row */}
            <div className="grid grid-cols-[76px_repeat(7,minmax(0,1fr))] border-b border-[#ECECF2] pb-2">
              <div className="flex items-end justify-between pr-2 text-[10px] font-semibold uppercase text-[#848494]">
                <span>BJ</span>
                <span>SFO</span>
              </div>
              {weekDays.map((wd) => {
                const isToday = mounted && todayISO === wd.dateISO;
                const dayData = eventsByDate[wd.dateISO];
                const allDayEvents = dayData?.gcal.filter((e) => e.isAllDay) ?? [];
                const dayLoops = dayData?.loops ?? [];

                return (
                  <div key={wd.dateISO} className="px-1 text-center">
                    <div
                      className={`text-[10px] font-semibold ${
                        isToday ? 'text-[#6E32F5]' : 'text-[#848494]'
                      }`}
                    >
                      {wd.dayShort}
                    </div>
                    <div
                      className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                        isToday ? 'bg-[#6E32F5] text-white' : 'text-[#111118]'
                      }`}
                    >
                      {wd.dayNum}
                    </div>
                    {/* All-day + Loop badges */}
                    <div className="mt-1 space-y-0.5 text-left">
                      {dayLoops.map((lp) => (
                        <div
                          key={lp.id}
                          className="truncate rounded bg-[#F3ECFF] px-1.5 py-0.5 text-[10px] font-semibold text-[#6E32F5]"
                          title={`${lp.company} · ${lp.round}`}
                        >
                          {lp.company}
                        </div>
                      ))}
                      {allDayEvents.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium ${getEventColorClasses(
                            ev.summary
                          )}`}
                          title={ev.summary}
                        >
                          {ev.summary}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hourly Time Grid (12 PM – 11 PM SFO / 4 AM – 3 PM Beijing) */}
            <div className="relative mt-1 grid grid-cols-[76px_repeat(7,minmax(0,1fr))]">
              {/* Dual Timezone Gutter */}
              <div>
                {hours.map((h) => (
                  <div
                    key={h}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    className="flex items-start justify-between pr-2 text-[10px] text-[#848494]"
                  >
                    <span className="-mt-1.5">{formatHourLabel(h + 16)}</span>
                    <span className="-mt-1.5 font-medium text-[#5E5E6E]">
                      {formatHourLabel(h)}
                    </span>
                  </div>
                ))}
              </div>

              {/* 7 Day Columns */}
              {weekDays.map((wd) => {
                const timedEvents =
                  eventsByDate[wd.dateISO]?.gcal.filter(
                    (e) =>
                      !e.isAllDay &&
                      e.startMinutes >= WEEK_START_HOUR * 60 &&
                      e.startMinutes <= (WEEK_END_HOUR + 1) * 60
                  ) ?? [];

                return (
                  <div
                    key={wd.dateISO}
                    className="relative border-l border-[#F0F0F5]"
                    style={{ height: `${hours.length * HOUR_HEIGHT}px` }}
                  >
                    {/* Hour horizontal lines */}
                    {hours.map((h) => (
                      <div
                        key={h}
                        style={{ height: `${HOUR_HEIGHT}px` }}
                        className="border-b border-[#F5F5F9]"
                      />
                    ))}

                    {/* Timed Event Blocks */}
                    {timedEvents.map((ev) => {
                      const topPx = ((ev.startMinutes - WEEK_START_HOUR * 60) / 60) * HOUR_HEIGHT;
                      const heightPx = Math.max(
                        24,
                        (ev.durationMinutes / 60) * HOUR_HEIGHT - 2
                      );
                      return (
                        <div
                          key={ev.id}
                          style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                          className={`absolute inset-x-0.5 overflow-hidden rounded-md border-l-2 px-1.5 py-0.5 text-[10px] leading-tight shadow-2xs ${getEventColorClasses(
                            ev.summary
                          )}`}
                          title={`${ev.summary} (${ev.timeRangeLabel})`}
                        >
                          <div className="truncate font-semibold">{ev.summary}</div>
                          <div className="truncate opacity-90">{ev.timeRangeLabel}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Monthly Calendar Grid */}
      {viewMode === 'month' && (
        <div className="mt-4 rounded-xl border border-[#EFEFF5] bg-[#FAFAFC]/70 p-3.5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-[#111118]">{monthLabel}</div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMonthOffset(0)}
                className="rounded-lg border border-[#ECECF2] bg-white px-2 py-1 text-[11px] font-medium text-[#5E5E6E] hover:text-[#111118]"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setMonthOffset((v) => v - 1)}
                className="rounded-lg border border-[#ECECF2] bg-white p-1 text-[#5E5E6E] hover:text-[#111118]"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setMonthOffset((v) => v + 1)}
                className="rounded-lg border border-[#ECECF2] bg-white p-1 text-[#5E5E6E] hover:text-[#111118]"
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

              return (
                <div
                  key={cell.dateISO}
                  className={`flex min-h-[68px] flex-col justify-between rounded-lg border p-1.5 ${
                    isToday
                      ? 'border-[#6E32F5] bg-[#F3ECFF]/40'
                      : cell.inMonth
                        ? 'border-[#EFEFF5] bg-white'
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
                    <div className="mt-1 space-y-0.5">
                      {dayItems?.loops.slice(0, 1).map((lp) => (
                        <div
                          key={lp.id}
                          className="truncate rounded bg-[#F3ECFF] px-1 py-0.5 text-[9px] font-semibold text-[#6E32F5]"
                        >
                          {lp.company}
                        </div>
                      ))}
                      {dayItems?.gcal.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          className={`truncate rounded px-1 py-0.5 text-[9px] font-medium ${getEventColorClasses(
                            ev.summary
                          )}`}
                        >
                          {ev.summary}
                        </div>
                      ))}
                      {loopCount + gcalCount > 3 && (
                        <div className="px-0.5 text-[9px] font-medium text-[#848494]">
                          +{loopCount + gcalCount - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Compact Upcoming Interview Loops Strip */}
      <div className="mt-4 grid gap-2.5 border-t border-[#F2F2F7] pt-3.5 sm:grid-cols-3">
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
              className="group flex items-center justify-between gap-2 rounded-xl border border-[#EFEFF5] bg-[#FAFAFC] px-3 py-2 text-xs transition hover:border-[#6E32F5]/30 hover:bg-white"
            >
              <div className="min-w-0">
                <div className="truncate font-semibold text-[#111118]">
                  {loop.company}{' '}
                  <span className="font-normal text-[#848494]">
                    · {ROLES_BY_ID[loop.role]?.shortLabel}
                  </span>
                </div>
                <div className="truncate text-[11px] text-[#5E5E6E]">{loop.round}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="font-mono text-[11px] font-semibold text-[#6E32F5]" suppressHydrationWarning>
                  {days !== null ? (days >= 0 ? `T-${days}d` : 'Done') : loop.dateISO}
                </span>
                <a
                  href={gcalLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#6E32F5] hover:opacity-80"
                  title="Add to Google Calendar"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
                <button
                  type="button"
                  onClick={() => onRemoveLoop(loop.id)}
                  className="text-[#C2C2D0] opacity-0 transition hover:text-rose-600 group-hover:opacity-100"
                  title="Remove loop"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
