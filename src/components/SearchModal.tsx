'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Compass, GraduationCap, Search, Video, X } from 'lucide-react';
import { useApp } from './AppProvider';
import { getAllQuestions } from '@/lib/helpers';
import { ROLE_LIST, ROLES_BY_ID } from '@/lib/roles';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const { state } = useApp();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

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
