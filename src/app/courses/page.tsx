'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, CheckCircle2, Play, Sparkles, Video } from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { roleBadgeClasses } from '@/lib/helpers';
import { ROLE_LIST } from '@/lib/roles';
import { SELF_INTRO_COURSE_META } from '@/lib/seed-courses';
import { CourseTrackId } from '@/lib/types';

export default function CoursesDirectoryPage() {
  const { state } = useApp();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F3ECFF] px-3 py-1 text-[11px] font-semibold text-[#6E32F5]">
            <Sparkles className="h-3.5 w-3.5" />
            2026 PERSONAL CURRICULUM · 8 TRACKS
          </div>
          <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-[#111118] sm:text-3xl">
            Interview Courses &amp; Structured Guides
          </h1>
          <p className="mt-1 text-sm text-[#525260]">
            每个岗位及 Self Intro &amp; Culture Fit 都拆好了大标题（Modules）和小节（Sub-Sections），支持随时点 <strong>Edit Page</strong> 自定义添加题目、文字答案、视频与调整字体字号后发布。
          </p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {[
          ...ROLE_LIST.map((r) => ({
            id: r.id as CourseTrackId,
            shortLabel: r.shortLabel,
            label: r.label,
            tagline: r.tagline,
            badgeClass: roleBadgeClasses(r.id),
          })),
          {
            id: SELF_INTRO_COURSE_META.id as CourseTrackId,
            shortLabel: SELF_INTRO_COURSE_META.shortLabel,
            label: SELF_INTRO_COURSE_META.label,
            tagline: SELF_INTRO_COURSE_META.tagline,
            badgeClass: 'bg-[#F3ECFF] text-[#6E32F5] border border-[#D4C5FD]',
          },
        ].map((role) => {
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

          return (
            <div
              key={role.id}
              className="flex flex-col justify-between rounded-2xl border border-[#ECECF2] bg-white p-6 shadow-[0_1px_2px_rgba(16,16,24,0.03)] transition hover:border-[#D4C5FD]"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${role.badgeClass}`}
                  >
                    {role.shortLabel}
                  </span>
                  <span className="rounded-full bg-[#F3ECFF] px-2.5 py-0.5 text-[10px] font-bold text-[#6E32F5]">
                    {course?.editionBadge || '2026 EDITION'}
                  </span>
                </div>

                <h2 className="mt-3 text-lg font-bold text-[#111118]">
                  {course?.heroTitle || role.label}
                </h2>
                <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-[#525260]">
                  {course?.heroSubtitle || role.tagline}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[#848494]">
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    {course?.modules.length ?? 3} modules · {totalLessons} lessons
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Video className="h-3.5 w-3.5" />
                    {videoCount} videos
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-3 border-t border-[#F0F0F5] pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EFEFF5]">
                    <div
                      className="h-full rounded-full bg-[#6E32F5]"
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs font-semibold text-[#525260]">{pct}%</span>
                </div>

                <Link
                  href={`/courses/${role.id}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#6E32F5] px-4 py-2.5 text-xs font-semibold text-white transition hover:opacity-95"
                >
                  <Play className="h-3.5 w-3.5 fill-white" />
                  Continue learning
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
