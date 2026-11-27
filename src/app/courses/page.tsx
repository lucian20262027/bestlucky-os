'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Sparkles, Video } from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { ROLE_LIST } from '@/lib/roles';
import { SELF_INTRO_COURSE_META } from '@/lib/seed-courses';
import { CourseTrackId } from '@/lib/types';

function plural(n: number, singular: string, pluralForm?: string): string {
  return `${n} ${n === 1 ? singular : (pluralForm ?? `${singular}s`)}`;
}

export default function CoursesDirectoryPage() {
  const { state } = useApp();

  const orderedRoles = useMemo(() => {
    const all = [
      ...ROLE_LIST.map((r) => ({
        id: r.id as CourseTrackId,
        shortLabel: r.shortLabel,
        label: r.label,
        tagline: r.tagline,
        accentHex: r.accentHex,
      })),
      {
        id: SELF_INTRO_COURSE_META.id as CourseTrackId,
        shortLabel: SELF_INTRO_COURSE_META.shortLabel,
        label: SELF_INTRO_COURSE_META.label,
        tagline: SELF_INTRO_COURSE_META.tagline,
        accentHex: '#6E32F5',
      },
    ];

    const savedOrder = state.courseNavOrder ?? [];
    const hiddenSet = new Set(state.hiddenCourseTracks ?? []);

    return [...all]
      .filter((entry) => !hiddenSet.has(entry.id))
      .sort((a, b) => {
        const ia = savedOrder.indexOf(a.id);
        const ib = savedOrder.indexOf(b.id);
        if (ia === -1 && ib === -1) return 0;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });
  }, [state.courseNavOrder, state.hiddenCourseTracks]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E4F0] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#6E32F5]">
            <Sparkles className="h-3.5 w-3.5" />
            Personal Curriculum
          </div>
          <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-[#111118] sm:text-3xl">
            Interview Courses &amp; Structured Guides
          </h1>
          <p className="mt-1 text-sm text-[#525260]">
            Structured modules and sub-sections across all 7 role tracks plus Self Intro. Customize
            lessons, model answers, and videos via <strong>Edit Page</strong> inside any track.
          </p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {orderedRoles.map((role, idx) => {
          const course = state.courses[role.id];
          let totalLessons = 0;
          let videoCount = 0;
          let doneCount = 0;
          course?.modules.forEach((m) =>
            m.subSections.forEach((s) =>
              s.lessons.forEach((l) => {
                totalLessons++;
                if (l.kind === 'video' || l.videoUrl || l.localMediaId) videoCount++;
                if (l.completed) doneCount++;
              })
            )
          );
          const pct = totalLessons > 0 ? Math.round((doneCount / totalLessons) * 100) : 0;
          const isLead = idx === 0;

          return (
            <div
              key={role.id}
              className="flex flex-col justify-between rounded-2xl border border-[#ECECF2] bg-white p-6 shadow-2xs transition hover:border-[#D4C5FD]"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-[#ECECF2] bg-[#FAFAFC] px-2.5 py-0.5 text-[11px] font-semibold text-[#111118]">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: role.accentHex }}
                    />
                    {role.shortLabel}
                  </span>
                  <span className="font-mono text-xs font-semibold text-[#6B7280]">{pct}%</span>
                </div>

                <h2 className="mt-3 text-lg font-semibold tracking-tight text-[#111118]">
                  {course?.heroTitle || role.label}
                </h2>
                <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-[#525260]">
                  {course?.heroSubtitle || role.tagline}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[#848494]">
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    {plural(course?.modules.length ?? 3, 'module')} ·{' '}
                    {plural(totalLessons, 'lesson')}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Video className="h-3.5 w-3.5" />
                    {plural(videoCount, 'video')}
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-3 border-t border-[#F0F0F5] pt-4">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EFEFF5]">
                  <div
                    className="h-full rounded-full bg-[#6E32F5] transition-all"
                    style={{ width: `${Math.max(4, pct)}%` }}
                  />
                </div>

                <Link
                  href={`/courses/${role.id}`}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                    isLead
                      ? 'bg-[#111118] text-white hover:bg-[#6E32F5]'
                      : 'border border-[#E5E7EB] bg-[#FAFAFC] text-[#111118] hover:border-[#6E32F5] hover:bg-[#6E32F5] hover:text-white'
                  }`}
                >
                  <span>{pct > 0 ? 'Continue learning' : 'Start course'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
