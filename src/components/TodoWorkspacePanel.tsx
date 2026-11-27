'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  Check,
  CheckSquare,
  Plus,
  Square,
  Trash2,
} from 'lucide-react';
import { ROLE_LIST, ROLES_BY_ID } from '@/lib/roles';
import { RoleTrack, TodoItem, TodoPriority } from '@/lib/types';

interface TodoWorkspacePanelProps {
  mounted: boolean;
  todayISO: string | null;
  todos: TodoItem[];
  onAddTodo: (todo: Omit<TodoItem, 'id' | 'createdAt' | 'completed'>) => void;
  onUpdateTodo: (id: string, patch: Partial<TodoItem>) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
}

type FilterTab = 'all' | 'today' | 'high' | 'deferred' | 'done';

const PRIORITY_META: Record<
  TodoPriority,
  { label: string; rank: number; dotClass: string; pillClass: string }
> = {
  urgent: {
    label: 'Urgent',
    rank: 0,
    dotClass: 'bg-rose-500',
    pillClass: 'border-rose-200 bg-rose-50/70 text-rose-700',
  },
  p0: {
    label: 'P0',
    rank: 1,
    dotClass: 'bg-amber-500',
    pillClass: 'border-amber-200 bg-amber-50/70 text-amber-800',
  },
  p1: {
    label: 'P1',
    rank: 2,
    dotClass: 'bg-[#6E32F5]',
    pillClass: 'border-[#E5DAFE] bg-[#F8F5FF] text-[#6E32F5]',
  },
  p2: {
    label: 'P2',
    rank: 3,
    dotClass: 'bg-slate-400',
    pillClass: 'border-[#E5E7EB] bg-[#FAFAFC] text-[#5E5E6E]',
  },
};

function offsetDateISO(baseISO: string | null, days: number): string {
  const baseMs = baseISO ? Date.parse(`${baseISO}T00:00:00Z`) : Date.now();
  return new Date(baseMs + days * 86400000).toISOString().slice(0, 10);
}

export function TodoWorkspacePanel({
  mounted,
  todayISO,
  todos,
  onAddTodo,
  onUpdateTodo,
  onToggleTodo,
  onDeleteTodo,
}: TodoWorkspacePanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState('');
  const [role, setRole] = useState<RoleTrack>('fde');
  const [priority, setPriority] = useState<TodoPriority>('p0');
  const [dueOption, setDueOption] = useState<'today' | 'tomorrow' | 'next-week' | 'custom'>('today');
  const [customDate, setCustomDate] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  const completedCount = useMemo(() => todos.filter((t) => t.completed).length, [todos]);

  const sortedAndFiltered = useMemo(() => {
    const filtered = todos.filter((t) => {
      const p: TodoPriority = t.priority ?? 'p1';
      const due = t.dueLabel ?? 'Today';
      if (filterTab === 'today') return !t.completed && due === 'Today';
      if (filterTab === 'high') return !t.completed && (p === 'urgent' || p === 'p0');
      if (filterTab === 'deferred') return !t.completed && due !== 'Today';
      if (filterTab === 'done') return t.completed;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const ra = PRIORITY_META[a.priority ?? 'p1'].rank;
      const rb = PRIORITY_META[b.priority ?? 'p1'].rank;
      if (ra !== rb) return ra - rb;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [todos, filterTab]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }

    let dueLabel = 'Today';
    let dueDateISO = offsetDateISO(todayISO, 0);
    if (dueOption === 'tomorrow') {
      dueLabel = 'Tomorrow';
      dueDateISO = offsetDateISO(todayISO, 1);
    } else if (dueOption === 'next-week') {
      dueLabel = 'Next Week';
      dueDateISO = offsetDateISO(todayISO, 7);
    } else if (dueOption === 'custom' && customDate) {
      dueLabel = customDate.slice(5);
      dueDateISO = customDate;
    }

    onAddTodo({
      title: trimmed,
      role,
      priority,
      dueLabel,
      dueDateISO,
    });
    setTitle('');
    inputRef.current?.focus();
  };

  const handleDefer = (todo: TodoItem, mode: string) => {
    if (mode === 'today') {
      onUpdateTodo(todo.id, {
        dueLabel: 'Today',
        dueDateISO: offsetDateISO(todayISO, 0),
      });
    } else if (mode === 'tomorrow') {
      onUpdateTodo(todo.id, {
        dueLabel: 'Tomorrow',
        dueDateISO: offsetDateISO(todayISO, 1),
      });
    } else if (mode === 'next-week') {
      onUpdateTodo(todo.id, {
        dueLabel: 'Next Week',
        dueDateISO: offsetDateISO(todayISO, 7),
      });
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(mode)) {
      onUpdateTodo(todo.id, {
        dueLabel: mode.slice(5),
        dueDateISO: mode,
      });
    }
  };

  return (
    <section className="rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-2xs">
      {/* Header + Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F2F2F7] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F5F3FF] text-[#6E32F5]">
            <CheckSquare className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#111118]">Prep Action Queue</h2>
              <span
                suppressHydrationWarning
                className="rounded-full border border-[#ECECF2] bg-[#FAFAFC] px-2 py-0.5 font-mono text-[10.5px] font-medium text-[#5E5E6E]"
              >
                {mounted ? `${completedCount}/${todos.length} done` : '0/0 done'}
              </span>
            </div>
            <p className="text-[11px] text-[#848494]">
              Auto-sorted by priority with one-click schedule deferrals
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-1">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'today', label: 'Today' },
              { id: 'high', label: 'Urgent & P0' },
              { id: 'deferred', label: 'Deferred' },
              { id: 'done', label: 'Done' },
            ] as Array<{ id: FilterTab; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                filterTab === tab.id
                  ? 'bg-white font-semibold text-[#111118] shadow-2xs'
                  : 'text-[#6B7280] hover:text-[#111118]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Add Task Composer Bar */}
      <form
        onSubmit={handleSubmit}
        className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-2 focus-within:border-[#6E32F5]/50 focus-within:bg-white"
      >
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a prep task — press Enter to save..."
          className="min-w-[180px] flex-1 bg-transparent px-2.5 py-1.5 text-sm text-[#111118] placeholder-[#9CA3AF] focus:outline-none"
        />

        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TodoPriority)}
            aria-label="Task priority"
            className="rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs font-medium text-[#111118] focus:border-[#6E32F5] focus:outline-none"
          >
            <option value="urgent">Urgent</option>
            <option value="p0">P0 · High</option>
            <option value="p1">P1 · Normal</option>
            <option value="p2">P2 · Low</option>
          </select>

          <select
            value={role}
            onChange={(e) => setRole(e.target.value as RoleTrack)}
            aria-label="Role track"
            className="rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs font-medium text-[#111118] focus:border-[#6E32F5] focus:outline-none"
          >
            {ROLE_LIST.map((r) => (
              <option key={r.id} value={r.id}>
                {r.shortLabel}
              </option>
            ))}
          </select>

          <select
            value={dueOption}
            onChange={(e) =>
              setDueOption(e.target.value as 'today' | 'tomorrow' | 'next-week' | 'custom')
            }
            aria-label="Schedule due"
            className="rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs font-medium text-[#5E5E6E] focus:border-[#6E32F5] focus:outline-none"
          >
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="next-week">Next Week</option>
            <option value="custom">Pick Date...</option>
          </select>

          {dueOption === 'custom' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="rounded-lg border border-[#ECECF2] bg-white px-2 py-1 text-xs"
            />
          )}

          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-lg bg-[#111118] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#6E32F5]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      </form>

      {/* Task Rows */}
      <div className="mt-3 divide-y divide-[#F2F2F7]">
        {sortedAndFiltered.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#848494]">
            No tasks match this filter. Type above and press Enter to add one.
          </div>
        ) : (
          sortedAndFiltered.map((todo) => {
            const p: TodoPriority = todo.priority ?? 'p1';
            const pMeta = PRIORITY_META[p];
            const dueDisplay = todo.dueLabel || 'Today';
            const isDeferred = dueDisplay !== 'Today';

            return (
              <div
                key={todo.id}
                className="group flex flex-wrap items-center justify-between gap-3 py-3 transition hover:bg-[#FAFAFC]/70"
              >
                <button
                  type="button"
                  onClick={() => onToggleTodo(todo.id)}
                  className="flex min-w-[200px] flex-1 items-center gap-3 text-left"
                >
                  {todo.completed ? (
                    <Check className="h-4 w-4 shrink-0 rounded bg-[#6E32F5] p-0.5 text-white" />
                  ) : (
                    <Square className="h-4 w-4 shrink-0 text-[#9CA3AF] transition group-hover:text-[#6E32F5]" />
                  )}
                  <span
                    className={`text-sm ${
                      todo.completed
                        ? 'text-[#9CA3AF] line-through'
                        : 'font-medium text-[#111118]'
                    }`}
                  >
                    {todo.title}
                  </span>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <div className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${pMeta.pillClass}`}>
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${pMeta.dotClass}`} />
                    <select
                      value={p}
                      onChange={(e) =>
                        onUpdateTodo(todo.id, { priority: e.target.value as TodoPriority })
                      }
                      aria-label="Change priority"
                      className="cursor-pointer bg-transparent font-semibold focus:outline-none"
                    >
                      <option value="urgent">Urgent</option>
                      <option value="p0">P0</option>
                      <option value="p1">P1</option>
                      <option value="p2">P2</option>
                    </select>
                  </div>

                  {p === 'urgent' && !todo.completed && (
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                  )}

                  {todo.role && (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-[#ECECF2] bg-[#FAFAFC] px-2 py-0.5 text-[10.5px] font-medium text-[#525260]">
                      {ROLES_BY_ID[todo.role]?.shortLabel ?? todo.role}
                    </span>
                  )}

                  {/* Clean non-overlapping Schedule / Defer Control */}
                  <div className="inline-flex items-center gap-1.5 rounded-md border border-[#ECECF2] bg-[#FAFAFC] px-2.5 py-0.5 text-[11px]">
                    <CalendarClock className="h-3 w-3 shrink-0 text-[#848494]" />
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) handleDefer(todo, e.target.value);
                      }}
                      aria-label="Defer task"
                      className={`cursor-pointer bg-transparent pl-0.5 pr-1 font-medium focus:outline-none ${
                        isDeferred ? 'text-[#6E32F5]' : 'text-[#525260]'
                      }`}
                    >
                      <option value="">{dueDisplay}</option>
                      <option value="today">Move to Today</option>
                      <option value="tomorrow">Defer → Tomorrow</option>
                      <option value="next-week">Defer → Next Week</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteTodo(todo.id)}
                    className="rounded-md p-1 text-[#B4B4C2] transition hover:bg-rose-50 hover:text-rose-600"
                    title="Delete task"
                    aria-label="Delete task"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
