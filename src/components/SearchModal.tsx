'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Briefcase,
  Check,
  Compass,
  GraduationCap,
  Mic,
  Plus,
  Search,
  Video,
  X,
} from 'lucide-react';
import { useApp } from './AppProvider';
import { getAllQuestions } from '@/lib/helpers';
import { ROLE_LIST, ROLES_BY_ID } from '@/lib/roles';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const router = useRouter();
  const { state, addTodo, upsertVocabItem } = useApp();
  const [query, setQuery] = useState('');
  const [captureMode, setCaptureMode] = useState<'none' | 'todo' | 'vocab'>('none');
  const [captureText, setCaptureText] = useState('');
  const [captureSaved, setCaptureSaved] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setCaptureMode('none');
      setCaptureText('');
      setCaptureSaved(null);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleQuickCapture = (e: React.FormEvent) => {
    e.preventDefault();
    const val = captureText.trim();
    if (!val) return;
    if (captureMode === 'todo') {
      addTodo({
        title: val,
        priority: 'p1',
        dueLabel: 'Today',
        role: 'fde',
      });
      setCaptureSaved(`已添加 Todo: ${val}`);
    } else if (captureMode === 'vocab') {
      upsertVocabItem({
        id: `vocab-${Date.now()}`,
        word: val,
        phonetic: '',
        meaning: '待补充释义（可在 Knowledge Hub 一键 AI 解析）',
        example: '',
        roles: ['fde', 'fdpm', 'ai-pm'],
        notes: 'Quick Capture',
        updatedAt: new Date().toISOString(),
      });
      setCaptureSaved(`已收录难词: ${val}`);
    }
    setCaptureText('');
    setCaptureMode('none');
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const allQ = getAllQuestions(state);

    const courseHits = ROLE_LIST.map((r) => state.courses[r.id])
      .filter((c) => {
        if (!c) return false;
        if (!q) return true;
        return `${c.heroTitle} ${c.heroSubtitle} ${c.role}`.toLowerCase().includes(q);
      })
      .slice(0, 4);

    const questionHits = allQ
      .filter((item) => {
        if (!q) return true;
        const n = state.questionNotes[item.id];
        return `${item.title} ${item.prompt} ${item.companyStyle} ${n?.modelAnswer ?? ''} ${
          n?.myAnswer ?? ''
        }`
          .toLowerCase()
          .includes(q);
      })
      .slice(0, 6);

    const libraryHits = state.libraryItems
      .filter((item) =>
        !q
          ? true
          : `${item.title} ${item.summary} ${item.contentMarkdown}`.toLowerCase().includes(q)
      )
      .slice(0, 4);

    return { courseHits, questionHits, libraryHits };
  }, [query, state]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 px-4 pt-[10vh] backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3.5">
          <Search className="h-4 w-4 text-[var(--accent)]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses, questions, written answers, videos..."
            className="flex-1 bg-transparent text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--ink-muted)] hover:bg-[var(--canvas)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[62vh] space-y-4 overflow-y-auto p-4">
          {/* Quick Actions & Quick Capture (Raycast / Superhuman style) */}
          <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--canvas)]/70 p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setCaptureMode((m) => (m === 'todo' ? 'none' : 'todo'));
                  setCaptureText('');
                  setCaptureSaved(null);
                }}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                  captureMode === 'todo'
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                    : 'border-[var(--border)] bg-white text-[var(--ink-primary)] hover:border-[var(--accent)]'
                }`}
              >
                <Plus className="h-3 w-3" />
                快速记 Todo
              </button>
              <button
                type="button"
                onClick={() => {
                  setCaptureMode((m) => (m === 'vocab' ? 'none' : 'vocab'));
                  setCaptureText('');
                  setCaptureSaved(null);
                }}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                  captureMode === 'vocab'
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                    : 'border-[var(--border)] bg-white text-[var(--ink-primary)] hover:border-[var(--accent)]'
                }`}
              >
                <Plus className="h-3 w-3" />
                快速记难词
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push('/practice');
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--accent)] transition hover:border-[var(--accent)]"
              >
                <Mic className="h-3 w-3" />
                立即开始语音练习
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push('/pipeline');
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--ink-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <Briefcase className="h-3 w-3" />
                打开 Pipeline 备战室
              </button>
            </div>

            {captureMode !== 'none' && (
              <form onSubmit={handleQuickCapture} className="flex items-center gap-2 pt-1">
                <input
                  autoFocus
                  value={captureText}
                  onChange={(e) => setCaptureText(e.target.value)}
                  placeholder={
                    captureMode === 'todo'
                      ? '输入今天要推进的 Todo，按 Enter 保存...'
                      : '输入想收录的英文难词/术语，按 Enter 保存...'
                  }
                  className="flex-1 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white"
                >
                  保存
                </button>
              </form>
            )}

            {captureSaved && (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                <Check className="h-3.5 w-3.5" />
                {captureSaved}
              </div>
            )}
          </div>

          {results.courseHits.length > 0 && (
            <div>
              <div className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                Courses
              </div>
              <div className="mt-1 space-y-1">
                {results.courseHits.map((c) => (
                  <Link
                    key={c.role}
                    href={`/courses/${c.role}`}
                    onClick={onClose}
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-xs hover:bg-[var(--accent-soft)]/70"
                  >
                    <span className="flex items-center gap-2.5 font-medium text-[var(--ink-primary)]">
                      <GraduationCap className="h-4 w-4 text-[var(--accent)]" />
                      {c.heroTitle}
                    </span>
                    <span className="text-[11px] text-[var(--ink-muted)]">
                      {c.role === 'self-intro' ? 'Self Intro & Culture' : ROLES_BY_ID[c.role].shortLabel}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.questionHits.length > 0 && (
            <div>
              <div className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                Questions &amp; Answers
              </div>
              <div className="mt-1 space-y-1">
                {results.questionHits.map((item) => (
                  <Link
                    key={item.id}
                    href={`/questions/${item.id}`}
                    onClick={onClose}
                    className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs hover:bg-[var(--accent-soft)]/70"
                  >
                    <span className="flex min-w-0 items-center gap-2.5 font-medium text-[var(--ink-primary)]">
                      <BookOpen className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                      <span className="truncate">{item.title}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-[var(--ink-muted)]">
                      {ROLES_BY_ID[item.role].shortLabel}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.libraryHits.length > 0 && (
            <div>
              <div className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                Videos &amp; Guides
              </div>
              <div className="mt-1 space-y-1">
                {results.libraryHits.map((lib) => (
                  <Link
                    key={lib.id}
                    href="/library"
                    onClick={onClose}
                    className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs hover:bg-[var(--accent-soft)]/70"
                  >
                    <span className="flex min-w-0 items-center gap-2.5 font-medium text-[var(--ink-primary)]">
                      <Video className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                      <span className="truncate">{lib.title}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-[var(--ink-muted)]">{lib.type}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.courseHits.length === 0 &&
            results.questionHits.length === 0 &&
            results.libraryHits.length === 0 && (
              <div className="py-8 text-center text-xs text-[var(--ink-muted)]">
                <Compass className="mx-auto mb-2 h-5 w-5" />
                No matching items found.
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
