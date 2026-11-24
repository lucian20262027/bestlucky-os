'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Edit3,
  ExternalLink,
  FileText,
  Film,
  LayoutGrid,
  Loader2,
  Play,
  Plus,
  Rocket,
  Sparkles,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { TypographyPicker } from '@/components/TypographyPicker';
import { VideoPlayer } from '@/components/VideoPlayer';
import { roleBadgeClasses } from '@/lib/helpers';
import { cleanHtmlForReader, extractReadableTextFromHtml } from '@/lib/html-parser';
import { saveLocalMedia } from '@/lib/media-db';
import { ROLES_BY_ID } from '@/lib/roles';
import { SELF_INTRO_COURSE_META } from '@/lib/seed-courses';
import {
  DEFAULT_MODULE_STYLE,
  DEFAULT_SUBSECTION_STYLE,
  getTypographyClasses,
  getTypographyStyle,
} from '@/lib/typography';
import {
  CourseLessonItem,
  CourseModuleSection,
  CourseSubSection,
  CourseSyllabus,
  CourseTrackId,
  InterviewQuestion,
  RoleTrack,
} from '@/lib/types';

function CourseSyllabusContent() {
  const params = useParams<{ role: string }>();
  const rawRole = typeof params?.role === 'string' ? params.role : 'fde';
  const role: CourseTrackId =
    rawRole === 'self-intro'
      ? 'self-intro'
      : ROLES_BY_ID[rawRole as RoleTrack]
        ? (rawRole as RoleTrack)
        : 'fde';
  const questionDefaultRole: RoleTrack = role === 'self-intro' ? 'fde' : role;

  const {
    state,
    mounted,
    updateCourseSyllabus,
    toggleCourseLessonComplete,
    addCustomQuestion,
    updateQuestionNotes,
  } = useApp();

  const [editMode, setEditMode] = useState(false);
  const [collapsedSubs, setCollapsedSubs] = useState<Record<string, boolean>>({});
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const [addingTarget, setAddingTarget] = useState<{
    moduleId: string;
    subSectionId: string;
  } | null>(null);

  // Inline Lesson/Q&A Creator state
  const [newLessonKind, setNewLessonKind] = useState<'question' | 'video' | 'lesson'>('question');
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonPrompt, setNewLessonPrompt] = useState('');
  const [newLessonAnswer, setNewLessonAnswer] = useState('');
  const [newLessonVideoUrl, setNewLessonVideoUrl] = useState('');
  const [newLessonLocalMediaId, setNewLessonLocalMediaId] = useState<string | undefined>(undefined);
  const [newLessonLocalMediaName, setNewLessonLocalMediaName] = useState<string | undefined>(undefined);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingIntro, setUploadingIntro] = useState(false);

  const course = state.courses[role];

  const htmlPagesById = useMemo(() => {
    const map = new Map<string, NonNullable<typeof state.deployedHtmlPages>[number]>();
    (state.deployedHtmlPages ?? []).forEach((p) => map.set(p.id, p));
    return map;
  }, [state.deployedHtmlPages]);

  const flatLessons = useMemo(() => {
    const list: Array<{
      lesson: CourseLessonItem;
      moduleId: string;
      subSectionId: string;
    }> = [];
    course.modules.forEach((m) =>
      m.subSections.forEach((s) =>
        s.lessons.forEach((l) =>
          list.push({ lesson: l, moduleId: m.id, subSectionId: s.id })
        )
      )
    );
    return list;
  }, [course.modules]);

  const jumpToLesson = (item: {
    lesson: CourseLessonItem;
    moduleId: string;
    subSectionId: string;
  }) => {
    setCollapsedSubs((prev) => ({ ...prev, [item.subSectionId]: false }));
    setExpandedLessonId(item.lesson.id);
    window.setTimeout(() => {
      document
        .getElementById(`course-lesson-${item.lesson.id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };
  const roleCfg =
    role === 'self-intro'
      ? {
          id: 'self-intro' as const,
          shortLabel: SELF_INTRO_COURSE_META.shortLabel,
          label: SELF_INTRO_COURSE_META.label,
          defaultScratchpadSections: [
            'Present: Current Builder Identity (15s)',
            'Past: 2 Quantified Proof Points (45s)',
            'Future: Why This Company & Team (30s)',
          ],
        }
      : ROLES_BY_ID[role];

  const stats = useMemo(() => {
    if (!course) return { total: 0, done: 0, pct: 0, videos: 0 };
    let total = 0;
    let done = 0;
    let videos = 0;
    course.modules.forEach((m) =>
      m.subSections.forEach((s) =>
        s.lessons.forEach((l) => {
          total++;
          if (l.completed) done++;
          if (l.kind === 'video' || l.videoUrl || l.localMediaId) videos++;
        })
      )
    );
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, pct, videos };
  }, [course]);

  // Custom or Lark-imported questions for this role not yet manually placed inside a module
  const unlinkedCustomQuestions = useMemo(() => {
    const linkedIds = new Set<string>();
    course?.modules.forEach((m) =>
      m.subSections.forEach((s) =>
        s.lessons.forEach((l) => {
          if (l.questionId) linkedIds.add(l.questionId);
        })
      )
    );
    return state.customQuestions.filter((q) => q.role === role && !linkedIds.has(q.id));
  }, [course, state.customQuestions, role]);

  if (!mounted || !course) {
    return (
      <div className="flex h-[65vh] items-center justify-center text-sm text-[#848494]">
        Loading Course Syllabus...
      </div>
    );
  }

  const saveCourse = (next: CourseSyllabus) => {
    updateCourseSyllabus(role, next);
  };

  const handleTogglePublish = () => {
    if (editMode) {
      saveCourse({ ...course, published: true });
      setEditMode(false);
    } else {
      setEditMode(true);
    }
  };

  const handleIntroVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingIntro(true);
    try {
      const saved = await saveLocalMedia(file);
      saveCourse({
        ...course,
        introLocalMediaId: saved.id,
        introLocalMediaName: saved.name,
        ...(saved.cloudUrl ? { introVideoUrl: saved.cloudUrl } : {}),
      });
    } finally {
      setUploadingIntro(false);
      e.target.value = '';
    }
  };

  const handleLessonVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    try {
      const saved = await saveLocalMedia(file);
      setNewLessonLocalMediaId(saved.id);
      setNewLessonLocalMediaName(saved.name);
      if (saved.cloudUrl) {
        setNewLessonVideoUrl(saved.cloudUrl);
      }
    } finally {
      setUploadingVideo(false);
      e.target.value = '';
    }
  };

  const handleAddBigModule = () => {
    const newMod: CourseModuleSection = {
      id: `${role}-mod-${Date.now()}`,
      title: `New Section (${course.modules.length + 1})`,
      description: 'Describe what this big module covers for your interview prep.',
      titleStyle: DEFAULT_MODULE_STYLE,
      subSections: [
        {
          id: `${role}-sub-${Date.now()}`,
          title: 'Overview & Key Prompts',
          titleStyle: DEFAULT_SUBSECTION_STYLE,
          lessons: [],
        },
      ],
    };
    saveCourse({
      ...course,
      modules: [...course.modules, newMod],
    });
  };

  const handleAddSubSection = (moduleId: string) => {
    const newSub: CourseSubSection = {
      id: `${role}-sub-${Date.now()}`,
      title: 'New Sub-Section (小节标题)',
      titleStyle: DEFAULT_SUBSECTION_STYLE,
      lessons: [],
    };
    saveCourse({
      ...course,
      modules: course.modules.map((m) =>
        m.id === moduleId ? { ...m, subSections: [...m.subSections, newSub] } : m
      ),
    });
  };

  const handleSaveNewLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingTarget || !newLessonTitle.trim()) return;
    const nowISO = new Date().toISOString();
    const qId = `course-q-${Date.now()}`;

    const createdQ: InterviewQuestion = {
      id: qId,
      role: questionDefaultRole,
      secondaryRoles: [],
      round: 'decomposition',
      difficulty: 'senior',
      timeLimitMin: 30,
      companyStyle: `${roleCfg.shortLabel} Course Custom`,
      title: newLessonTitle.trim(),
      prompt: newLessonPrompt.trim() || newLessonTitle.trim(),
      promptZhHint: `【课程内自定义题目】${roleCfg.shortLabel} 专属精研题目`,
      frameworkSteps: roleCfg.defaultScratchpadSections,
      strongHireSignals: ['Clear structure, quantified trade-offs, and ownership.'],
      redFlags: ['Generic unstructured answers.'],
      followUpProbes: ['What breaks first under production scale?'],
      modelAnswer: newLessonAnswer.trim() || undefined,
      videoUrl: newLessonVideoUrl.trim() || undefined,
      localMediaId: newLessonLocalMediaId,
      isCustom: true,
      createdAt: nowISO,
    };
    addCustomQuestion(createdQ);
    updateQuestionNotes(qId, {
      myAnswer: '',
      modelAnswer: newLessonAnswer.trim(),
      pitch60s: '',
      personalNotes: '',
      videoUrl: newLessonVideoUrl.trim(),
      localMediaId: newLessonLocalMediaId,
      localMediaName: newLessonLocalMediaName,
      published: true,
    });

    const newLesson: CourseLessonItem = {
      id: `les-${Date.now()}`,
      title: newLessonTitle.trim(),
      kind: newLessonKind,
      questionId: qId,
      videoUrl: newLessonVideoUrl.trim() || undefined,
      localMediaId: newLessonLocalMediaId,
      localMediaName: newLessonLocalMediaName,
      summary: (newLessonPrompt.trim() || newLessonAnswer.trim()).slice(0, 140),
      completed: false,
      published: true,
    };

    saveCourse({
      ...course,
      modules: course.modules.map((m) =>
        m.id !== addingTarget.moduleId
          ? m
          : {
              ...m,
              subSections: m.subSections.map((s) =>
                s.id !== addingTarget.subSectionId
                  ? s
                  : { ...s, lessons: [...s.lessons, newLesson] }
              ),
            }
      ),
    });

    setAddingTarget(null);
    setNewLessonTitle('');
    setNewLessonPrompt('');
    setNewLessonAnswer('');
    setNewLessonVideoUrl('');
    setNewLessonLocalMediaId(undefined);
    setNewLessonLocalMediaName(undefined);
  };

  const moveModule = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= course.modules.length) return;
    const copy = [...course.modules];
    const [picked] = copy.splice(idx, 1);
    copy.splice(nextIdx, 0, picked);
    saveCourse({ ...course, modules: copy });
  };

  const firstQuestionLesson = course.modules
    .flatMap((m) => m.subSections.flatMap((s) => s.lessons))
    .find((l) => l.questionId);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb + Edit / Publish Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-[#848494]">
          <Link href="/courses" className="hover:text-[#111118]">
            Courses
          </Link>
          <span>›</span>
          <span className="font-medium text-[#111118]">{course.heroTitle}</span>
        </div>

        <div className="flex items-center gap-2.5">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              editMode
                ? 'bg-amber-50 text-amber-800'
                : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {editMode ? 'Editing Draft' : 'Published View'}
          </span>

          <button
            type="button"
            onClick={handleTogglePublish}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              editMode
                ? 'bg-[#6E32F5] text-white shadow-xs hover:opacity-95'
                : 'border border-[#ECECF2] bg-white text-[#111118] hover:border-[#6E32F5] hover:text-[#6E32F5]'
            }`}
          >
            {editMode ? (
              <>
                <Rocket className="h-3.5 w-3.5" />
                Publish Changes (发布)
              </>
            ) : (
              <>
                <Edit3 className="h-3.5 w-3.5" />
                Edit Page (编辑排版与内容)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Aced.io Course Hero Card (Screenshot 3) */}
      <section className="rounded-3xl border border-[#ECECF2] bg-white p-6 shadow-[0_1px_2px_rgba(16,16,24,0.03)] sm:p-8">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          {/* Left Hero Details */}
          <div className="space-y-4 lg:col-span-7">
            {editMode ? (
              <div className="space-y-3 rounded-2xl border border-[#D4C5FD] bg-[#FAF9FF] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E32F5]">
                    Hero Big Title (大标题)
                  </span>
                  <TypographyPicker
                    value={course.heroTitleStyle}
                    onChange={(st) => saveCourse({ ...course, heroTitleStyle: st })}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={course.heroTitle}
                    onChange={(e) => saveCourse({ ...course, heroTitle: e.target.value })}
                    className="min-w-[220px] flex-1 rounded-xl border border-[#ECECF2] bg-white px-3 py-2 text-sm font-bold focus:border-[#6E32F5] focus:outline-none"
                  />
                  <input
                    value={course.editionBadge}
                    onChange={(e) => saveCourse({ ...course, editionBadge: e.target.value })}
                    className="w-32 rounded-xl border border-[#ECECF2] bg-white px-3 py-2 text-xs font-semibold focus:border-[#6E32F5] focus:outline-none"
                  />
                </div>
                <textarea
                  rows={3}
                  value={course.heroSubtitle}
                  onChange={(e) => saveCourse({ ...course, heroSubtitle: e.target.value })}
                  className="w-full rounded-xl border border-[#ECECF2] bg-white p-3 text-xs leading-relaxed focus:border-[#6E32F5] focus:outline-none"
                />
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1
                    style={getTypographyStyle(course.heroTitleStyle)}
                    className={`text-[#111118] ${getTypographyClasses(
                      course.heroTitleStyle,
                      'heading'
                    )}`}
                  >
                    {course.heroTitle}
                  </h1>
                  <span className="rounded-full bg-[#F3ECFF] px-3 py-0.5 text-[11px] font-bold tracking-wide text-[#6E32F5]">
                    {course.editionBadge}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-[#525260]">{course.heroSubtitle}</p>
              </>
            )}

            <ul className="space-y-2 pt-1">
              {course.highlights.map((hl, idx) => (
                <li key={idx} className="flex items-center gap-2.5 text-[13px] text-[#2E2E3A]">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#6E32F5]" />
                  <span>{hl}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href={
                  firstQuestionLesson?.questionId
                    ? `/questions/${firstQuestionLesson.questionId}`
                    : '/questions'
                }
                className="inline-flex items-center gap-2 rounded-xl bg-[#6E32F5] px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:opacity-95"
              >
                Continue learning
              </Link>
              <div className="flex items-center gap-2 text-xs font-medium text-[#525260]">
                <BookOpen className="h-4 w-4 text-[#848494]" />
                <span>
                  {stats.done}/{stats.total} lessons completed ({stats.pct}%)
                </span>
              </div>
            </div>
          </div>

          {/* Right Hero Video Preview */}
          <div className="lg:col-span-5">
            {course.introVideoUrl || course.introLocalMediaId ? (
              <VideoPlayer
                videoUrl={course.introVideoUrl}
                localMediaId={course.introLocalMediaId}
                localMediaName={course.introLocalMediaName}
              />
            ) : (
              <div className="relative flex aspect-video flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#1C1A29] via-[#27213F] to-[#171622] p-6 text-center text-white shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6E32F5] shadow-lg">
                  <Play className="ml-0.5 h-5 w-5 fill-white" />
                </div>
                <div className="mt-3 text-xs font-semibold text-white/90">
                  {roleCfg.shortLabel} Course Intro Video
                </div>
                <div className="mt-1 text-[11px] text-white/60">
                  Click &ldquo;Edit Page&rdquo; to attach YouTube/Bilibili or upload your intro video
                </div>
              </div>
            )}

            {editMode && (
              <div className="mt-3 space-y-2 rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-3">
                <input
                  value={course.introVideoUrl ?? ''}
                  onChange={(e) => saveCourse({ ...course, introVideoUrl: e.target.value })}
                  placeholder="Paste Intro Video URL (YouTube / Bilibili / Loom / Lark)..."
                  className="w-full rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs focus:border-[#6E32F5] focus:outline-none"
                />
                <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#D4C5FD] bg-white px-3 py-1.5 text-xs font-medium text-[#6E32F5]">
                  {uploadingIntro ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {course.introLocalMediaName
                    ? `Uploaded: ${course.introLocalMediaName}`
                    : 'Upload Local Intro Video (.mp4 / .webm)'}
                  <input
                    type="file"
                    accept="video/*,audio/*"
                    onChange={handleIntroVideoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stacked Module Cards (Aced.io Screenshots 4-6) */}
      <div className="space-y-6">
        {course.modules.map((mod, mIdx) => {
          const modLessonCount = mod.subSections.reduce((s, sub) => s + sub.lessons.length, 0);
          const modVideoCount = mod.subSections.reduce(
            (s, sub) =>
              s +
              sub.lessons.filter((l) => l.kind === 'video' || l.videoUrl || l.localMediaId).length,
            0
          );

          return (
            <section
              key={mod.id}
              className="rounded-3xl border border-[#ECECF2] bg-white p-6 shadow-[0_1px_2px_rgba(16,16,24,0.03)] sm:p-7"
            >
              {/* Module Big Title Header */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {editMode ? (
                    <div className="space-y-2.5 rounded-2xl border border-[#D4C5FD] bg-[#FAF9FF] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E32F5]">
                          Big Section #{mIdx + 1} (大标题)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <TypographyPicker
                            value={mod.titleStyle}
                            onChange={(st) =>
                              saveCourse({
                                ...course,
                                modules: course.modules.map((m) =>
                                  m.id === mod.id ? { ...m, titleStyle: st } : m
                                ),
                              })
                            }
                          />
                          <button
                            type="button"
                            onClick={() => moveModule(mIdx, -1)}
                            className="rounded border border-[#ECECF2] bg-white p-1 text-[#525260] hover:text-[#111118]"
                            title="Move up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveModule(mIdx, 1)}
                            className="rounded border border-[#ECECF2] bg-white p-1 text-[#525260] hover:text-[#111118]"
                            title="Move down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              saveCourse({
                                ...course,
                                modules: course.modules.filter((m) => m.id !== mod.id),
                              })
                            }
                            className="rounded border border-rose-200 bg-rose-50 p-1 text-rose-600"
                            title="Delete big section"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <input
                        value={mod.title}
                        onChange={(e) =>
                          saveCourse({
                            ...course,
                            modules: course.modules.map((m) =>
                              m.id === mod.id ? { ...m, title: e.target.value } : m
                            ),
                          })
                        }
                        className="w-full rounded-xl border border-[#ECECF2] bg-white px-3 py-2 text-sm font-bold focus:border-[#6E32F5] focus:outline-none"
                      />
                      <textarea
                        rows={2}
                        value={mod.description}
                        onChange={(e) =>
                          saveCourse({
                            ...course,
                            modules: course.modules.map((m) =>
                              m.id === mod.id ? { ...m, description: e.target.value } : m
                            ),
                          })
                        }
                        className="w-full rounded-xl border border-[#ECECF2] bg-white p-2.5 text-xs focus:border-[#6E32F5] focus:outline-none"
                      />
                    </div>
                  ) : (
                    <>
                      <h2
                        style={getTypographyStyle(mod.titleStyle)}
                        className={`text-[#111118] ${getTypographyClasses(
                          mod.titleStyle,
                          'heading'
                        )}`}
                      >
                        {mod.title}
                      </h2>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-[#848494]">
                        <span className="inline-flex items-center gap-1">
                          <LayoutGrid className="h-3.5 w-3.5" />
                          {mod.subSections.length} sections
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" />
                          {modLessonCount} lessons
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Video className="h-3.5 w-3.5" />
                          {modVideoCount} videos
                        </span>
                      </div>
                      {mod.description && (
                        <p className="mt-2.5 text-sm leading-relaxed text-[#525260]">
                          {mod.description}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Sub-Sections (小 Section 折叠区) */}
              <div className="mt-5 space-y-3">
                {mod.subSections.map((sub) => {
                  const isCollapsed = Boolean(collapsedSubs[sub.id]) && !editMode;
                  const subVideos = sub.lessons.filter(
                    (l) => l.kind === 'video' || l.videoUrl || l.localMediaId
                  ).length;

                  return (
                    <div
                      key={sub.id}
                      className="overflow-hidden rounded-2xl border border-[#ECECF2] bg-white"
                    >
                      {/* Sub-section Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FAFAFC] px-4 py-3">
                        {editMode ? (
                          <div className="flex w-full flex-wrap items-center justify-between gap-2">
                            <input
                              value={sub.title}
                              onChange={(e) =>
                                saveCourse({
                                  ...course,
                                  modules: course.modules.map((m) =>
                                    m.id !== mod.id
                                      ? m
                                      : {
                                          ...m,
                                          subSections: m.subSections.map((s) =>
                                            s.id === sub.id ? { ...s, title: e.target.value } : s
                                          ),
                                        }
                                  ),
                                })
                              }
                              className="min-w-[200px] flex-1 rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs font-semibold focus:border-[#6E32F5] focus:outline-none"
                            />
                            <TypographyPicker
                              label="Sub"
                              value={sub.titleStyle}
                              onChange={(st) =>
                                saveCourse({
                                  ...course,
                                  modules: course.modules.map((m) =>
                                    m.id !== mod.id
                                      ? m
                                      : {
                                          ...m,
                                          subSections: m.subSections.map((s) =>
                                            s.id === sub.id ? { ...s, titleStyle: st } : s
                                          ),
                                        }
                                  ),
                                })
                              }
                            />
                            <button
                              type="button"
                              onClick={() =>
                                saveCourse({
                                  ...course,
                                  modules: course.modules.map((m) =>
                                    m.id !== mod.id
                                      ? m
                                      : {
                                          ...m,
                                          subSections: m.subSections.filter((s) => s.id !== sub.id),
                                        }
                                  ),
                                })
                              }
                              className="rounded border border-rose-200 bg-rose-50 p-1.5 text-rose-600"
                              title="Delete sub-section"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setCollapsedSubs((prev) => ({
                                  ...prev,
                                  [sub.id]: !prev[sub.id],
                                }))
                              }
                              className="flex items-center gap-2 text-left"
                            >
                              {isCollapsed ? (
                                <ChevronRight className="h-4 w-4 text-[#848494]" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-[#848494]" />
                              )}
                              <span
                                style={getTypographyStyle(sub.titleStyle)}
                                className={`text-[#111118] ${getTypographyClasses(
                                  sub.titleStyle,
                                  'heading'
                                )}`}
                              >
                                {sub.title}
                              </span>
                            </button>
                            <span className="text-xs text-[#848494]">
                              {sub.lessons.length} lessons
                              {subVideos > 0 ? ` · ${subVideos} videos` : ''}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Lessons List */}
                      {!isCollapsed && (
                        <div className="divide-y divide-[#F0F0F5]">
                          {sub.lessons.map((les) => {
                            const htmlPage = les.htmlPageId
                              ? htmlPagesById.get(les.htmlPageId) ?? null
                              : null;
                            const isVideo =
                              les.kind === 'video' ||
                              Boolean(
                                htmlPage?.videoUrl ||
                                  htmlPage?.localMediaId ||
                                  les.videoUrl ||
                                  les.localMediaId
                              );
                            const isInlineExpandable = Boolean(htmlPage);
                            const isExpanded = expandedLessonId === les.id;
                            const targetHref = les.questionId
                              ? `/questions/${les.questionId}`
                              : `/questions`;

                            const displaySummary = htmlPage
                              ? extractReadableTextFromHtml(htmlPage.rawHtml).text.slice(0, 180)
                              : les.summary;

                            const flatIdx = flatLessons.findIndex(
                              (item) => item.lesson.id === les.id
                            );
                            const prevEntry = flatIdx > 0 ? flatLessons[flatIdx - 1] : null;
                            const nextEntry =
                              flatIdx >= 0 && flatIdx < flatLessons.length - 1
                                ? flatLessons[flatIdx + 1]
                                : null;

                            const rowContent = (
                              <>
                                {isVideo ? (
                                  <div className="relative flex h-11 w-[74px] shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1C1A29] to-[#2F284D]">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6E32F5] text-white">
                                      <Play className="ml-0.5 h-3 w-3 fill-white" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F5F5FA] text-[#525260]">
                                    {les.kind === 'question' ? (
                                      <Sparkles className="h-3.5 w-3.5 text-[#6E32F5]" />
                                    ) : (
                                      <FileText className="h-3.5 w-3.5" />
                                    )}
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-[13.5px] font-medium text-[#111118] hover:text-[#6E32F5]">
                                    {les.title}
                                  </div>
                                  {displaySummary && (
                                    <div className="truncate text-xs text-[#848494]">
                                      {displaySummary}
                                    </div>
                                  )}
                                </div>
                              </>
                            );

                            return (
                              <div key={les.id} id={`course-lesson-${les.id}`}>
                                <div className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-[#FAFAFC]">
                                  {isInlineExpandable ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedLessonId((prev) =>
                                          prev === les.id ? null : les.id
                                        )
                                      }
                                      data-testid={`course-lesson-toggle-${les.id}`}
                                      className="flex min-w-0 flex-1 items-center gap-3.5 text-left"
                                    >
                                      {rowContent}
                                    </button>
                                  ) : (
                                    <Link
                                      href={targetHref}
                                      className="flex min-w-0 flex-1 items-center gap-3.5"
                                    >
                                      {rowContent}
                                    </Link>
                                  )}

                                  <div className="flex shrink-0 items-center gap-2">
                                    {isInlineExpandable && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedLessonId((prev) =>
                                            prev === les.id ? null : les.id
                                          )
                                        }
                                        className="rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#6E32F5] transition hover:border-[#6E32F5]"
                                      >
                                        {isExpanded ? '收起' : '展开阅读'}
                                      </button>
                                    )}
                                    {editMode && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          saveCourse({
                                            ...course,
                                            modules: course.modules.map((m) =>
                                              m.id !== mod.id
                                                ? m
                                                : {
                                                    ...m,
                                                    subSections: m.subSections.map((s) =>
                                                      s.id !== sub.id
                                                        ? s
                                                        : {
                                                            ...s,
                                                            lessons: s.lessons.filter(
                                                              (l) => l.id !== les.id
                                                            ),
                                                          }
                                                    ),
                                                  }
                                            ),
                                          })
                                        }
                                        className="rounded p-1 text-[#848494] hover:text-rose-600"
                                        title="Remove item"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleCourseLessonComplete(role, mod.id, sub.id, les.id)
                                      }
                                      className={`flex h-6 w-6 items-center justify-center rounded-full transition ${
                                        les.completed
                                          ? 'bg-[#F3ECFF] text-[#6E32F5]'
                                          : 'border border-[#E2E2EC] text-transparent hover:border-[#6E32F5]'
                                      }`}
                                      title="Toggle complete"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Inline Expanded Article + Video + Prev/Next */}
                                {isExpanded && htmlPage && (
                                  <div
                                    className="border-t border-[#ECECF2] bg-[#FAFAFC] px-4 py-4 space-y-4"
                                    data-testid="course-inline-reader"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="rounded-md bg-[#F3ECFF] px-2 py-0.5 text-[10px] font-bold text-[#6E32F5]">
                                          本页阅读
                                        </span>
                                        <span className="text-xs font-semibold text-[#111118]">
                                          {htmlPage.title}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Link
                                          href={`/pages/${htmlPage.id}`}
                                          className="inline-flex items-center gap-1 rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#525260] hover:border-[#6E32F5] hover:text-[#6E32F5]"
                                        >
                                          在 Studio 编辑 / 挂载视频
                                          <ExternalLink className="h-3 w-3" />
                                        </Link>
                                        <button
                                          type="button"
                                          onClick={() => setExpandedLessonId(null)}
                                          className="rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#525260] hover:text-[#111118]"
                                        >
                                          收起全文
                                        </button>
                                      </div>
                                    </div>

                                    {(htmlPage.videoUrl ||
                                      htmlPage.localMediaId ||
                                      les.videoUrl ||
                                      les.localMediaId) && (
                                      <VideoPlayer
                                        videoUrl={htmlPage.videoUrl || les.videoUrl}
                                        localMediaId={htmlPage.localMediaId || les.localMediaId}
                                      />
                                    )}

                                    <div className="overflow-hidden rounded-2xl border border-[#ECECF2] bg-white shadow-2xs">
                                      <iframe
                                        title={htmlPage.title}
                                        srcDoc={cleanHtmlForReader(htmlPage.rawHtml).cleanHtml}
                                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                                        className="min-h-[68vh] w-full border-0 bg-white"
                                      />
                                    </div>

                                    {/* Bottom Prev / Next Navigation */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                      <button
                                        type="button"
                                        disabled={!prevEntry}
                                        onClick={() => prevEntry && jumpToLesson(prevEntry)}
                                        data-testid="course-prev-lesson"
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#ECECF2] bg-white px-3.5 py-2 text-xs font-semibold text-[#111118] shadow-2xs transition hover:border-[#6E32F5] hover:text-[#6E32F5] disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        <ArrowLeft className="h-3.5 w-3.5" />
                                        前一篇
                                        {prevEntry && (
                                          <span className="max-w-[160px] truncate text-[11px] font-normal text-[#848494]">
                                            · {prevEntry.lesson.title}
                                          </span>
                                        )}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          toggleCourseLessonComplete(role, mod.id, sub.id, les.id)
                                        }
                                        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                                          les.completed
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : 'border border-[#ECECF2] bg-white text-[#525260] hover:border-[#6E32F5]'
                                        }`}
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                        {les.completed ? '已完成本节' : '标记已完成'}
                                      </button>

                                      <button
                                        type="button"
                                        disabled={!nextEntry}
                                        onClick={() => nextEntry && jumpToLesson(nextEntry)}
                                        data-testid="course-next-lesson"
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#6E32F5] px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#5B24D6] disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        下一篇
                                        {nextEntry && (
                                          <span className="max-w-[160px] truncate text-[11px] font-normal text-white/80">
                                            · {nextEntry.lesson.title}
                                          </span>
                                        )}
                                        <ArrowRight className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Edit Mode: Inline "+ Add Question / Answer / Video" inside this Sub-Section */}
                          {editMode && (
                            <div className="bg-[#FAF9FF] px-4 py-3">
                              {addingTarget?.moduleId === mod.id &&
                              addingTarget?.subSectionId === sub.id ? (
                                <form onSubmit={handleSaveNewLesson} className="space-y-2.5">
                                  <div className="flex flex-wrap gap-2">
                                    <select
                                      value={newLessonKind}
                                      onChange={(e) =>
                                        setNewLessonKind(
                                          e.target.value as 'question' | 'video' | 'lesson'
                                        )
                                      }
                                      className="rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs font-medium"
                                    >
                                      <option value="question">Question + Answer</option>
                                      <option value="video">Video Lesson / Recording</option>
                                      <option value="lesson">Text Note / Guide</option>
                                    </select>
                                    <input
                                      required
                                      value={newLessonTitle}
                                      onChange={(e) => setNewLessonTitle(e.target.value)}
                                      placeholder="Title (题目或章节标题)..."
                                      className="min-w-[220px] flex-1 rounded-lg border border-[#ECECF2] bg-white px-3 py-1.5 text-xs focus:border-[#6E32F5] focus:outline-none"
                                    />
                                  </div>
                                  <textarea
                                    rows={2}
                                    value={newLessonPrompt}
                                    onChange={(e) => setNewLessonPrompt(e.target.value)}
                                    placeholder="Prompt / Context (题目背景，可选)..."
                                    className="w-full rounded-lg border border-[#ECECF2] bg-white p-2.5 text-xs focus:border-[#6E32F5] focus:outline-none"
                                  />
                                  <textarea
                                    rows={3}
                                    value={newLessonAnswer}
                                    onChange={(e) => setNewLessonAnswer(e.target.value)}
                                    placeholder="Written Answer / Key Notes (文字答案或要点)..."
                                    className="w-full rounded-lg border border-[#ECECF2] bg-white p-2.5 text-xs focus:border-[#6E32F5] focus:outline-none"
                                  />
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    <input
                                      value={newLessonVideoUrl}
                                      onChange={(e) => setNewLessonVideoUrl(e.target.value)}
                                      placeholder="Video URL (YouTube / Bilibili / Loom / Lark)..."
                                      className="rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs focus:border-[#6E32F5] focus:outline-none"
                                    />
                                    <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#D4C5FD] bg-white px-3 py-1.5 text-xs font-medium text-[#6E32F5]">
                                      {uploadingVideo ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Film className="h-3.5 w-3.5" />
                                      )}
                                      <span className="truncate">
                                        {newLessonLocalMediaName
                                          ? `Uploaded: ${newLessonLocalMediaName}`
                                          : 'Upload Video Answer (.mp4 / .webm)'}
                                      </span>
                                      <input
                                        type="file"
                                        accept="video/*,audio/*"
                                        onChange={handleLessonVideoUpload}
                                        className="hidden"
                                      />
                                    </label>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setAddingTarget(null)}
                                      className="rounded-lg border border-[#ECECF2] bg-white px-3 py-1.5 text-xs text-[#525260]"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      className="rounded-lg bg-[#6E32F5] px-3.5 py-1.5 text-xs font-semibold text-white"
                                    >
                                      Add to Sub-Section
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAddingTarget({ moduleId: mod.id, subSectionId: sub.id })
                                  }
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6E32F5] hover:underline"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Add Question / Text Answer / Video Lesson (添加题目或答案)
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {editMode && (
                  <button
                    type="button"
                    onClick={() => handleAddSubSection(mod.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#D4C5FD] bg-[#FAF9FF] px-3.5 py-2 text-xs font-semibold text-[#6E32F5] hover:bg-[#F3ECFF]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Sub-Section (添加小节标题)
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Add Big Module Button in Edit Mode */}
      {editMode && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-[#D4C5FD] bg-[#FAF9FF] p-5">
          <button
            type="button"
            onClick={handleAddBigModule}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-[#6E32F5] ring-1 ring-[#D4C5FD] hover:bg-[#F3ECFF]"
          >
            <Plus className="h-4 w-4" />
            Add Big Section Module (添加大标题模块)
          </button>

          <button
            type="button"
            onClick={handleTogglePublish}
            className="inline-flex items-center gap-2 rounded-xl bg-[#6E32F5] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:opacity-95"
          >
            <Rocket className="h-4 w-4" />
            Publish Course Page (发布更新)
          </button>
        </div>
      )}

      {/* Auto-linked Custom & Lark-Imported Questions for This Role */}
      {unlinkedCustomQuestions.length > 0 && (
        <section className="rounded-3xl border border-[#ECECF2] bg-white p-6 shadow-[0_1px_2px_rgba(16,16,24,0.03)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#111118]">
                Custom &amp; Lark-Imported {roleCfg.shortLabel} Questions ({unlinkedCustomQuestions.length})
              </h2>
              <p className="text-xs text-[#848494]">
                自动关联你从飞书导入或手动添加的同岗位题目，点击即可编辑答案、上传视频或进入模拟。
              </p>
            </div>
            <Link
              href={`/questions?role=${role}`}
              className="text-xs font-semibold text-[#6E32F5] hover:underline"
            >
              View in Question Bank →
            </Link>
          </div>

          <div className="mt-4 divide-y divide-[#F0F0F5]">
            {unlinkedCustomQuestions.map((q) => (
              <div
                key={q.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <Link
                  href={`/questions/${q.id}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium text-[#111118] hover:text-[#6E32F5]"
                >
                  {q.title}
                </Link>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/questions/${q.id}`}
                    className="rounded-lg border border-[#ECECF2] px-3 py-1 text-xs font-medium text-[#525260] hover:border-[#6E32F5] hover:text-[#6E32F5]"
                  >
                    Study &amp; Edit
                  </Link>
                  <Link
                    href={`/practice/${q.id}`}
                    className="rounded-lg bg-[#6E32F5] px-3 py-1 text-xs font-semibold text-white"
                  >
                    Mock
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function CourseDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[70vh] items-center justify-center text-sm text-[#848494]">
          Loading Course Syllabus...
        </div>
      }
    >
      <CourseSyllabusContent />
    </Suspense>
  );
}
