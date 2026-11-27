'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit3,
  ExternalLink,
  FileText,
  Film,
  GripVertical,
  LayoutGrid,
  Loader2,
  Play,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { TypographyPicker } from '@/components/TypographyPicker';
import { VideoPlayer } from '@/components/VideoPlayer';
import { getQuestionById, getQuestionStatus, roleBadgeClasses } from '@/lib/helpers';
import {
  cleanHtmlForReader,
  extractReadableTextFromHtml,
  toYouTubeEmbedUrl,
} from '@/lib/html-parser';
import { getHtmlSnapshot, saveHtmlSnapshot } from '@/lib/html-snapshot-db';
import { saveLocalMedia } from '@/lib/media-db';
import { ROLES_BY_ID, ROUND_LABELS } from '@/lib/roles';
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
    deployHtmlPage,
    updateHtmlPage,
  } = useApp();

  const [editMode, setEditMode] = useState(false);
  const [collapsedSubs, setCollapsedSubs] = useState<Record<string, boolean>>({});
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [snapshotHtml, setSnapshotHtml] = useState<string | null>(null);
  const [editingInlineArticle, setEditingInlineArticle] = useState(false);
  const [inlineNotice, setInlineNotice] = useState('');
  const [inlineVideoTitle, setInlineVideoTitle] = useState('');
  const [inlineVideoNote, setInlineVideoNote] = useState('');
  const [inlineVideoUrl, setInlineVideoUrl] = useState('');
  const [inlineUploading, setInlineUploading] = useState(false);
  const inlineIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Module-level Quick Standalone Video Lesson Creator (Edit Mode)
  const [quickVideoModId, setQuickVideoModId] = useState<string | null>(null);
  const [qvTitle, setQvTitle] = useState('');
  const [qvNote, setQvNote] = useState('');
  const [qvVideoUrl, setQvVideoUrl] = useState('');
  const [qvLocalMediaId, setQvLocalMediaId] = useState<string | undefined>(undefined);
  const [qvLocalMediaName, setQvLocalMediaName] = useState<string | undefined>(undefined);
  const [qvUploading, setQvUploading] = useState(false);
  const [draggingModuleId, setDraggingModuleId] = useState<string | null>(null);
  const [dragOverModuleId, setDragOverModuleId] = useState<string | null>(null);
  const [draggingLesson, setDraggingLesson] = useState<{
    modId: string;
    subId: string;
    lessonId: string;
  } | null>(null);
  const [dragOverLessonId, setDragOverLessonId] = useState<string | null>(null);
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
    if (!course) return [];
    const list: Array<{
      lesson: CourseLessonItem;
      moduleId: string;
      moduleTitle: string;
      subSectionId: string;
      subSectionTitle: string;
    }> = [];
    course.modules.forEach((m) =>
      m.subSections.forEach((s) =>
        s.lessons.forEach((l) =>
          list.push({
            lesson: l,
            moduleId: m.id,
            moduleTitle: m.title,
            subSectionId: s.id,
            subSectionTitle: s.title,
          })
        )
      )
    );
    return list;
  }, [course]);

  // Determine active entry safely without synchronous setState inside render
  const defaultLessonEntry = useMemo(() => {
    if (flatLessons.length === 0) return null;
    return flatLessons.find((x) => !x.lesson.completed) ?? flatLessons[0];
  }, [flatLessons]);

  const activeEntry = useMemo(() => {
    if (flatLessons.length === 0) return null;
    if (selectedLessonId) {
      const found = flatLessons.find((x) => x.lesson.id === selectedLessonId);
      if (found) return found;
    }
    return defaultLessonEntry;
  }, [flatLessons, selectedLessonId, defaultLessonEntry]);

  // Reset selected lesson when switching track
  useEffect(() => {
    setSelectedLessonId(null);
    setEditingInlineArticle(false);
    setInlineNotice('');
  }, [role]);

  const activeLesson = activeEntry?.lesson ?? null;
  const activeHtmlPage = activeLesson?.htmlPageId
    ? htmlPagesById.get(activeLesson.htmlPageId) ?? null
    : null;

  // Load persisted HTML snapshot for active HTML lesson
  useEffect(() => {
    const pageId = activeLesson?.htmlPageId;
    setEditingInlineArticle(false);
    setInlineNotice('');
    if (!pageId) {
      setSnapshotHtml(null);
      return;
    }
    const linkedPage = htmlPagesById.get(pageId);
    let cancelled = false;
    setSnapshotHtml(null);
    void getHtmlSnapshot(pageId).then(async (snap) => {
      if (cancelled) return;
      if (snap) {
        setSnapshotHtml(snap);
        return;
      }
      if (linkedPage?.htmlCloudUrl) {
        try {
          const res = await fetch(linkedPage.htmlCloudUrl);
          if (res.ok) {
            const remoteHtml = await res.text();
            if (!cancelled && remoteHtml) {
              setSnapshotHtml(remoteHtml);
              void saveHtmlSnapshot(pageId, remoteHtml);
            }
          }
        } catch {
          // fallback to rawHtml
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeLesson?.id, activeLesson?.htmlPageId, htmlPagesById]);

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

  const handleToggleEditMode = () => {
    if (editMode) {
      saveCourse({ ...course, published: true });
      setEditMode(false);
    } else {
      setEditMode(true);
    }
  };

  const selectLesson = (lessonId: string, subSectionId?: string) => {
    if (subSectionId) {
      setCollapsedSubs((prev) => ({ ...prev, [subSectionId]: false }));
    }
    setSelectedLessonId(lessonId);
    setEditingInlineArticle(false);
  };

  const handleContinueLearning = () => {
    const target = defaultLessonEntry;
    if (!target) return;
    selectLesson(target.lesson.id, target.subSectionId);
    window.setTimeout(() => {
      document
        .getElementById('course-reader-stage')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const reorderModules = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const fromIdx = course.modules.findIndex((m) => m.id === fromId);
    const toIdx = course.modules.findIndex((m) => m.id === toId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...course.modules];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    saveCourse({ ...course, modules: next });
  };

  const reorderLessons = (
    modId: string,
    subId: string,
    fromLessonId: string,
    toLessonId: string
  ) => {
    if (fromLessonId === toLessonId) return;
    saveCourse({
      ...course,
      modules: course.modules.map((m) => {
        if (m.id !== modId) return m;
        return {
          ...m,
          subSections: m.subSections.map((s) => {
            if (s.id !== subId) return s;
            const fromIdx = s.lessons.findIndex((l) => l.id === fromLessonId);
            const toIdx = s.lessons.findIndex((l) => l.id === toLessonId);
            if (fromIdx < 0 || toIdx < 0) return s;
            const nextLessons = [...s.lessons];
            const [moved] = nextLessons.splice(fromIdx, 1);
            nextLessons.splice(toIdx, 0, moved);
            return { ...s, lessons: nextLessons };
          }),
        };
      }),
    });
  };

  const handleQuickVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setQvUploading(true);
    try {
      const saved = await saveLocalMedia(file);
      setQvLocalMediaId(saved.id);
      setQvLocalMediaName(saved.name);
      if (saved.cloudUrl) setQvVideoUrl(saved.cloudUrl);
      if (!qvTitle.trim()) setQvTitle(file.name.replace(/\.[^.]+$/, ''));
    } finally {
      setQvUploading(false);
    }
  };

  const handleSaveQuickVideoLesson = (e: React.FormEvent, modId: string) => {
    e.preventDefault();
    if (!qvTitle.trim()) return;
    const mod = course.modules.find((m) => m.id === modId);
    if (!mod || mod.subSections.length === 0) return;

    const noteHtml = qvNote.trim()
      ? `<p>${qvNote
          .trim()
          .split('\n')
          .map((line) => line.replace(/</g, '&lt;').replace(/>/g, '&gt;'))
          .join('</p><p>')}</p>`
      : '<p>Video walkthrough notes. Click Edit Article to expand.</p>';
    const rawHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${qvTitle.trim()}</title></head><body><article><h1>${qvTitle.trim()}</h1>${noteHtml}</article></body></html>`;

    const deployed = deployHtmlPage({
      title: qvTitle.trim(),
      moduleTitle: mod.title,
      fileName: `${qvTitle.trim()}.html`,
      rawHtml,
      extractedText: qvNote.trim() || qvTitle.trim(),
      designTokens: {},
      videoUrl: qvVideoUrl.trim() || undefined,
      localMediaId: qvLocalMediaId,
      localMediaName: qvLocalMediaName,
      courseTrack: role,
    });

    const newLesson: CourseLessonItem = {
      id: `lesson-vid-${Date.now()}`,
      title: qvTitle.trim(),
      kind: 'video',
      htmlPageId: deployed.id,
      videoUrl: qvVideoUrl.trim() || undefined,
      localMediaId: qvLocalMediaId,
      localMediaName: qvLocalMediaName,
      summary: qvNote.trim() || 'Video lesson walkthrough',
      published: true,
    };

    const targetSubId = mod.subSections[0].id;
    saveCourse({
      ...course,
      modules: course.modules.map((m) =>
        m.id !== modId
          ? m
          : {
              ...m,
              subSections: m.subSections.map((s) =>
                s.id !== targetSubId ? s : { ...s, lessons: [...s.lessons, newLesson] }
              ),
            }
      ),
    });

    setQuickVideoModId(null);
    setQvTitle('');
    setQvNote('');
    setQvVideoUrl('');
    setQvLocalMediaId(undefined);
    setQvLocalMediaName(undefined);
    setSelectedLessonId(newLesson.id);
  };

  const handleInlineUploadVideo = async (
    e: React.ChangeEvent<HTMLInputElement>,
    pageId: string
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setInlineUploading(true);
    setInlineNotice('');
    try {
      const saved = await saveLocalMedia(file);
      const src = saved.cloudUrl || '';
      if (src) {
        setInlineVideoUrl(src);
      } else {
        updateHtmlPage(pageId, {
          localMediaId: saved.id,
          localMediaName: saved.name,
        });
        setInlineNotice(`Attached local video "${saved.name}" to lesson header.`);
      }
    } finally {
      setInlineUploading(false);
    }
  };

  const handleInsertVideoIntoArticle = (pageId: string) => {
    const doc = inlineIframeRef.current?.contentDocument;
    if (!doc) return;
    const rawUrl = inlineVideoUrl.trim();
    if (!rawUrl) {
      setInlineNotice('Paste a YouTube URL or upload an MP4 first.');
      return;
    }

    const ytEmbed = toYouTubeEmbedUrl(rawUrl);
    const root =
      doc.querySelector('[data-bl-editable="true"]') ??
      doc.querySelector('article') ??
      doc.querySelector('main') ??
      doc.body;

    const wrapper = doc.createElement('div');
    wrapper.className = 'bl-embedded-video';
    wrapper.setAttribute(
      'style',
      'margin: 24px 0; padding: 16px; border: 1px solid #ECECF2; border-radius: 16px; background: #FAFAFC;'
    );

    if (inlineVideoTitle.trim()) {
      const h = doc.createElement('h3');
      h.textContent = inlineVideoTitle.trim();
      h.setAttribute('style', 'margin: 0 0 6px 0; font-size: 16px; font-weight: 700; color: #111118;');
      wrapper.appendChild(h);
    }
    if (inlineVideoNote.trim()) {
      const p = doc.createElement('p');
      p.textContent = inlineVideoNote.trim();
      p.setAttribute('style', 'margin: 0 0 12px 0; font-size: 13px; color: #525260;');
      wrapper.appendChild(p);
    }

    if (ytEmbed) {
      const frame = doc.createElement('iframe');
      frame.src = ytEmbed;
      frame.setAttribute(
        'style',
        'width: 100%; aspect-ratio: 16 / 9; border: 0; border-radius: 12px;'
      );
      frame.setAttribute('allowfullscreen', 'true');
      wrapper.appendChild(frame);
    } else {
      const vid = doc.createElement('video');
      vid.src = rawUrl;
      vid.controls = true;
      vid.setAttribute(
        'style',
        'width: 100%; max-height: 440px; border-radius: 12px; background: #000;'
      );
      wrapper.appendChild(vid);
    }

    root.appendChild(wrapper);
    setInlineVideoTitle('');
    setInlineVideoNote('');
    setInlineVideoUrl('');
    setInlineNotice('Video block inserted into article. Click Save Changes to persist.');
    void pageId;
  };

  const handleSaveInlineArticle = (pageId: string, fallbackRawHtml: string) => {
    const doc = inlineIframeRef.current?.contentDocument;
    if (!doc) {
      setEditingInlineArticle(false);
      return;
    }
    doc.querySelectorAll('[data-bl-editable]').forEach((el) => {
      el.removeAttribute('contenteditable');
      el.removeAttribute('data-bl-editable');
    });
    doc.getElementById('bl-reader-clean-reset')?.remove();
    const updatedHtml = `<!DOCTYPE html>\n${doc.documentElement.outerHTML}` || fallbackRawHtml;
    const extracted = extractReadableTextFromHtml(updatedHtml);
    updateHtmlPage(pageId, {
      rawHtml: updatedHtml,
      extractedText: extracted.text,
    });
    setSnapshotHtml(updatedHtml);
    setEditingInlineArticle(false);
    setInlineNotice('Article & video changes saved.');
    window.setTimeout(() => setInlineNotice(''), 2500);
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
      description: 'Describe what this section covers for interview prep.',
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
      title: 'New Sub-Section',
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
      companyStyle: `${roleCfg.shortLabel} Course`,
      title: newLessonTitle.trim(),
      prompt: newLessonPrompt.trim() || newLessonTitle.trim(),
      promptZhHint: `${roleCfg.shortLabel} custom course prompt`,
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
    setSelectedLessonId(newLesson.id);
  };

  const moveModule = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= course.modules.length) return;
    const copy = [...course.modules];
    const [picked] = copy.splice(idx, 1);
    copy.splice(nextIdx, 0, picked);
    saveCourse({ ...course, modules: copy });
  };

  const hasIntroVideo = Boolean(course.introVideoUrl || course.introLocalMediaId);
  const activeFlatIdx = activeEntry
    ? flatLessons.findIndex((x) => x.lesson.id === activeEntry.lesson.id)
    : -1;
  const prevEntry = activeFlatIdx > 0 ? flatLessons[activeFlatIdx - 1] : null;
  const nextEntry =
    activeFlatIdx >= 0 && activeFlatIdx < flatLessons.length - 1
      ? flatLessons[activeFlatIdx + 1]
      : null;

  const activeQuestion = activeLesson?.questionId
    ? getQuestionById(state, activeLesson.questionId)
    : undefined;
  const activeQuestionNotes = activeQuestion
    ? state.questionNotes[activeQuestion.id]
    : undefined;
  const activeQuestionStatus = activeQuestion
    ? getQuestionStatus(state, activeQuestion.id)
    : undefined;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb + Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-[#848494]">
          <Link href="/courses" className="inline-flex items-center gap-1 hover:text-[#111118]">
            <ArrowLeft className="h-3.5 w-3.5" />
            Courses
          </Link>
          <span>/</span>
          <span className="font-medium text-[#111118]">{course.heroTitle}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleEditMode}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
              editMode
                ? 'bg-[#111118] text-white shadow-xs hover:opacity-90'
                : 'border border-[#ECECF2] bg-white text-[#525260] hover:border-[#6E32F5] hover:text-[#111118]'
            }`}
          >
            {editMode ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Done Editing
              </>
            ) : (
              <>
                <Edit3 className="h-3.5 w-3.5" />
                Edit Syllabus
              </>
            )}
          </button>
        </div>
      </div>

      {/* Compact Course Hero */}
      <section className="rounded-2xl border border-[#ECECF2] bg-white p-6 shadow-[0_1px_2px_rgba(16,16,24,0.03)]">
        <div
          className={`grid grid-cols-1 gap-6 ${
            hasIntroVideo || editMode ? 'lg:grid-cols-12 lg:items-center' : ''
          }`}
        >
          <div className={hasIntroVideo || editMode ? 'space-y-3.5 lg:col-span-7' : 'space-y-3.5'}>
            {editMode ? (
              <div className="space-y-3 rounded-2xl border border-[#D4C5FD] bg-[#FAF9FF] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E32F5]">
                    Track Title &amp; Overview
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
                    placeholder="Edition badge"
                    className="w-36 rounded-xl border border-[#ECECF2] bg-white px-3 py-2 text-xs font-semibold focus:border-[#6E32F5] focus:outline-none"
                  />
                </div>
                <textarea
                  rows={2}
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
                  {course.editionBadge && (
                    <span className="rounded-full bg-[#F4EFFF] px-2.5 py-0.5 text-[11px] font-semibold text-[#5D26D9]">
                      {course.editionBadge}
                    </span>
                  )}
                </div>
                <p className="max-w-3xl text-sm leading-relaxed text-[#525260]">
                  {course.heroSubtitle}
                </p>
              </>
            )}

            {course.highlights.length > 0 && !editMode && (
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 pt-0.5">
                {course.highlights.map((hl, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs text-[#3E3E4C]">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#6E32F5]" />
                    <span>{hl}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 pt-1">
              {!editMode && flatLessons.length > 0 && (
                <button
                  type="button"
                  onClick={handleContinueLearning}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#5B24D6]"
                >
                  <Play className="h-3.5 w-3.5 fill-white" />
                  {stats.done > 0 && stats.done < stats.total
                    ? 'Continue Learning'
                    : 'Start Course'}
                </button>
              )}

              <div className="flex min-w-[200px] flex-1 max-w-xs items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F0F0F5]">
                  <div
                    className="h-full rounded-full bg-[#6E32F5] transition-all"
                    style={{ width: `${stats.pct}%` }}
                  />
                </div>
                <span className="shrink-0 font-mono text-xs font-medium text-[#525260]">
                  {stats.done}/{stats.total} ({stats.pct}%)
                </span>
              </div>
            </div>
          </div>

          {(hasIntroVideo || editMode) && (
            <div className="space-y-2.5 lg:col-span-5">
              {hasIntroVideo && (
                <VideoPlayer
                  videoUrl={course.introVideoUrl}
                  localMediaId={course.introLocalMediaId}
                  localMediaName={course.introLocalMediaName}
                />
              )}

              {editMode && (
                <div className="space-y-2 rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-3">
                  <div className="text-[11px] font-semibold text-[#525260]">
                    Course Intro Video (Optional)
                  </div>
                  <input
                    value={course.introVideoUrl ?? ''}
                    onChange={(e) => saveCourse({ ...course, introVideoUrl: e.target.value })}
                    placeholder="Paste YouTube / Bilibili / Loom / Lark URL..."
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
          )}
        </div>
      </section>

      {/* Main Content Area: Calm Split Reader OR Full Syllabus Editor */}
      {!editMode ? (
        <div
          id="course-reader-stage"
          className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start"
        >
          {/* Left 4 Cols: Sticky Syllabus Outline */}
          <aside className="space-y-3 lg:sticky lg:top-6 lg:col-span-4 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto lg:pr-1">
            {course.modules.map((mod, mIdx) => {
              const modLessons = mod.subSections.flatMap((s) => s.lessons);
              const modDone = modLessons.filter((l) => l.completed).length;

              return (
                <div
                  key={mod.id}
                  data-testid={`course-module-card-${mod.id}`}
                  className="overflow-hidden rounded-2xl border border-[#ECECF2] bg-white shadow-2xs"
                >
                  <div className="border-b border-[#F2F2F7] bg-[#FAFAFC] px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#848494]">
                        Module {mIdx + 1}
                      </span>
                      <span className="font-mono text-[11px] font-medium text-[#6C6C7D]">
                        {modDone}/{modLessons.length}
                      </span>
                    </div>
                    <h2 className="mt-0.5 text-sm font-semibold text-[#111118]">
                      {mod.title}
                    </h2>
                  </div>

                  <div className="divide-y divide-[#F4F4F8]">
                    {mod.subSections.map((sub) => {
                      const isCollapsed = Boolean(collapsedSubs[sub.id]);
                      const hideSubHeader =
                        mod.subSections.length === 1 &&
                        sub.title.trim().toLowerCase() === mod.title.trim().toLowerCase();

                      return (
                        <div key={sub.id}>
                          {!hideSubHeader && (
                            <button
                              type="button"
                              onClick={() =>
                                setCollapsedSubs((prev) => ({
                                  ...prev,
                                  [sub.id]: !prev[sub.id],
                                }))
                              }
                              className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-xs font-semibold text-[#525260] hover:bg-[#FAFAFC]"
                            >
                              <span className="truncate">{sub.title}</span>
                              {isCollapsed ? (
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#848494]" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#848494]" />
                              )}
                            </button>
                          )}

                          {!isCollapsed && (
                            <div className="space-y-0.5 p-1.5">
                              {sub.lessons.map((les) => {
                                const isActive = activeLesson?.id === les.id;
                                const isVideo =
                                  les.kind === 'video' ||
                                  Boolean(les.videoUrl || les.localMediaId);
                                const cleanTitle = les.title.replace(/&amp;/g, '&');

                                return (
                                  <div
                                    key={les.id}
                                    id={`course-lesson-${les.id}`}
                                    className={`flex items-center gap-2 rounded-xl px-2.5 py-2 transition ${
                                      isActive
                                        ? 'bg-[#F4EFFF] text-[#4C1EB8]'
                                        : 'text-[#2E2E3A] hover:bg-[#F7F7FB]'
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleCourseLessonComplete(role, mod.id, sub.id, les.id);
                                      }}
                                      aria-label={`Mark ${cleanTitle} complete`}
                                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition ${
                                        les.completed
                                          ? 'bg-emerald-600 text-white'
                                          : 'border border-[#D8D8E4] bg-white text-transparent hover:border-[#6E32F5]'
                                      }`}
                                    >
                                      <Check className="h-3 w-3" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => selectLesson(les.id, sub.id)}
                                      data-testid={`course-lesson-toggle-${les.id}`}
                                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                    >
                                      <span className="shrink-0 text-[#848494]">
                                        {isVideo ? (
                                          <Play className="h-3.5 w-3.5 text-[#6E32F5]" />
                                        ) : les.kind === 'question' ? (
                                          <Sparkles className="h-3.5 w-3.5 text-[#6E32F5]" />
                                        ) : (
                                          <FileText className="h-3.5 w-3.5" />
                                        )}
                                      </span>
                                      <span
                                        className={`truncate text-xs ${
                                          isActive ? 'font-semibold' : 'font-medium'
                                        }`}
                                      >
                                        {cleanTitle}
                                      </span>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </aside>

          {/* Right 8 Cols: Focused Lesson Stage */}
          <main className="lg:col-span-8">
            {activeEntry && activeLesson ? (
              <div
                className="overflow-hidden rounded-2xl border border-[#ECECF2] bg-white shadow-2xs"
                data-testid="course-inline-reader"
              >
                {/* Reader Top Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ECECF2] bg-[#FAFAFC] px-6 py-4">
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-[#848494]">
                      {activeEntry.moduleTitle}
                      {activeEntry.subSectionTitle !== activeEntry.moduleTitle
                        ? ` · ${activeEntry.subSectionTitle}`
                        : ''}
                    </div>
                    <h2 className="mt-0.5 text-lg font-semibold text-[#111118]">
                      {activeLesson.title.replace(/&amp;/g, '&')}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        toggleCourseLessonComplete(
                          role,
                          activeEntry.moduleId,
                          activeEntry.subSectionId,
                          activeLesson.id
                        )
                      }
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                        activeLesson.completed
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border border-[#E2E2EC] bg-white text-[#454554] hover:border-[#6E32F5]'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {activeLesson.completed ? 'Completed' : 'Mark Complete'}
                    </button>

                    {activeHtmlPage && (
                      <>
                        {editingInlineArticle ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleSaveInlineArticle(
                                activeHtmlPage.id,
                                snapshotHtml || activeHtmlPage.rawHtml
                              )
                            }
                            data-testid="course-inline-save-button"
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            <Save className="h-3.5 w-3.5" />
                            Save Changes
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setInlineNotice('');
                              setEditingInlineArticle(true);
                            }}
                            data-testid="course-inline-edit-button"
                            className="inline-flex items-center gap-1 rounded-xl border border-[#E2E2EC] bg-white px-3 py-1.5 text-xs font-medium text-[#454554] hover:border-[#6E32F5] hover:text-[#111118]"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit Article
                          </button>
                        )}
                        <Link
                          href={`/pages/${activeHtmlPage.id}`}
                          className="inline-flex items-center gap-1 rounded-xl border border-[#E2E2EC] bg-white px-3 py-1.5 text-xs font-medium text-[#454554] hover:text-[#111118]"
                        >
                          Full Screen
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                {/* Reader Body */}
                <div className="space-y-5 p-6">
                  {editingInlineArticle && activeHtmlPage && (
                    <div
                      className="space-y-2.5 rounded-xl border border-[#D4C5FD] bg-[#FAF9FF] p-3.5"
                      data-testid="course-inline-video-inserter"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-[#6E32F5]">
                          Article is now inline-editable. Optional: append a video block below.
                        </span>
                        {inlineNotice && (
                          <span className="font-medium text-emerald-700">{inlineNotice}</span>
                        )}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          type="text"
                          value={inlineVideoTitle}
                          onChange={(e) => setInlineVideoTitle(e.target.value)}
                          placeholder="Video block title"
                          className="rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs focus:border-[#6E32F5] focus:outline-none"
                        />
                        <input
                          type="text"
                          value={inlineVideoNote}
                          onChange={(e) => setInlineVideoNote(e.target.value)}
                          placeholder="Short walkthrough caption (optional)"
                          className="rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs focus:border-[#6E32F5] focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="url"
                          value={inlineVideoUrl}
                          onChange={(e) => setInlineVideoUrl(e.target.value)}
                          placeholder="Paste YouTube URL or upload MP4..."
                          className="min-w-[200px] flex-1 rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs focus:border-[#6E32F5] focus:outline-none"
                        />
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#D4C5FD] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#6E32F5] hover:bg-[#F3ECFF]">
                          {inlineUploading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5" />
                          )}
                          Upload MP4
                          <input
                            type="file"
                            accept="video/*,.mp4,.webm,.mov"
                            onChange={(e) => handleInlineUploadVideo(e, activeHtmlPage.id)}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleInsertVideoIntoArticle(activeHtmlPage.id)}
                          className="rounded-lg bg-[#6E32F5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#5B24D6]"
                        >
                          Insert Block
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Attached Lesson Video (only shown when a video exists) */}
                  {(activeHtmlPage?.videoUrl ||
                    activeHtmlPage?.localMediaId ||
                    activeLesson.videoUrl ||
                    activeLesson.localMediaId) && (
                    <VideoPlayer
                      videoUrl={activeHtmlPage?.videoUrl || activeLesson.videoUrl}
                      localMediaId={activeHtmlPage?.localMediaId || activeLesson.localMediaId}
                      localMediaName={
                        activeHtmlPage?.localMediaName || activeLesson.localMediaName
                      }
                    />
                  )}

                  {/* Case 1: HTML Article Lesson */}
                  {activeHtmlPage ? (
                    <div className="overflow-hidden rounded-xl border border-[#ECECF2] bg-white">
                      <iframe
                        ref={inlineIframeRef}
                        title={activeHtmlPage.title}
                        srcDoc={
                          cleanHtmlForReader(
                            snapshotHtml && snapshotHtml.length > activeHtmlPage.rawHtml.length
                              ? snapshotHtml
                              : activeHtmlPage.rawHtml,
                            { editable: editingInlineArticle }
                          ).cleanHtml
                        }
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                        className="h-[70vh] min-h-[560px] w-full border-0 bg-white"
                      />
                    </div>
                  ) : activeQuestion ? (
                    /* Case 2: Question Lesson Inline Preview */
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${roleBadgeClasses(
                            activeQuestion.role
                          )}`}
                        >
                          {ROLES_BY_ID[activeQuestion.role].shortLabel}
                        </span>
                        <span className="rounded-md bg-[#F4F4F8] px-2 py-0.5 text-[11px] text-[#454554]">
                          {ROUND_LABELS[activeQuestion.round].en}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-[#848494]">
                          <Clock className="h-3.5 w-3.5" />
                          {activeQuestion.timeLimitMin}m ·{' '}
                          {activeQuestion.difficulty.toUpperCase()} ·{' '}
                          {activeQuestion.companyStyle}
                        </span>
                        {activeQuestionStatus === 'mastered' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Mastered
                          </span>
                        )}
                      </div>

                      <div className="rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6E32F5]">
                          Interview Prompt
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-[#111118]">
                          {activeQuestionNotes?.customPrompt?.trim() || activeQuestion.prompt}
                        </p>
                        {state.aiSettings.language !== 'en' && activeQuestion.promptZhHint && (
                          <p className="mt-3 rounded-lg bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
                            {activeQuestion.promptZhHint}
                          </p>
                        )}
                      </div>

                      {(activeQuestionNotes?.myAnswer?.trim() ||
                        activeQuestionNotes?.modelAnswer?.trim() ||
                        activeQuestion.modelAnswer?.trim()) && (
                        <div className="rounded-xl border border-[#ECECF2] bg-white p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#525260]">
                            {activeQuestionNotes?.myAnswer?.trim()
                              ? 'Your Saved Draft'
                              : 'Reference Approach'}
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[#2E2E3A] line-clamp-[12]">
                            {activeQuestionNotes?.myAnswer?.trim() ||
                              activeQuestionNotes?.modelAnswer?.trim() ||
                              activeQuestion.modelAnswer?.trim()}
                          </p>
                        </div>
                      )}

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-[#ECECF2] bg-white p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#525260]">
                            Framework Steps
                          </div>
                          <ol className="mt-2.5 space-y-1.5 text-xs text-[#454554]">
                            {activeQuestion.frameworkSteps.map((st, idx) => (
                              <li key={idx} className="leading-relaxed">
                                <span className="font-mono font-semibold text-[#111118]">
                                  {idx + 1}.
                                </span>{' '}
                                {st}
                              </li>
                            ))}
                          </ol>
                        </div>

                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
                            Strong Hire Signals
                          </div>
                          <ul className="mt-2.5 space-y-1.5 text-xs text-emerald-950">
                            {activeQuestion.strongHireSignals.map((sig, idx) => (
                              <li key={idx}>✓ {sig}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 pt-1">
                        <Link
                          href={`/questions/${activeQuestion.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5B24D6]"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          Open Answer Studio
                        </Link>
                        <Link
                          href={`/practice/${activeQuestion.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#111118] px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
                        >
                          <Play className="h-3.5 w-3.5" />
                          Enter Mock Room
                        </Link>
                      </div>
                    </div>
                  ) : (
                    /* Case 3: Standalone Note / Video Lesson */
                    <div className="rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-5 text-sm leading-relaxed text-[#2E2E3A]">
                      {activeLesson.summary ||
                        'Switch to Edit Syllabus mode to add lesson notes, questions, or an attached video.'}
                    </div>
                  )}
                </div>

                {/* Reader Footer Prev / Next */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#ECECF2] bg-[#FAFAFC] px-6 py-3.5">
                  <button
                    type="button"
                    disabled={!prevEntry}
                    onClick={() =>
                      prevEntry && selectLesson(prevEntry.lesson.id, prevEntry.subSectionId)
                    }
                    data-testid="course-prev-lesson"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#ECECF2] bg-white px-3.5 py-2 text-xs font-semibold text-[#111118] transition hover:border-[#6E32F5] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={!nextEntry}
                    onClick={() =>
                      nextEntry && selectLesson(nextEntry.lesson.id, nextEntry.subSectionId)
                    }
                    data-testid="course-next-lesson"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#111118] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next Lesson
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#DCDCE6] bg-white p-12 text-center text-sm text-[#848494]">
                No lessons in this syllabus yet. Click &ldquo;Edit Syllabus&rdquo; above to add modules and lessons.
              </div>
            )}
          </main>
        </div>
      ) : (
        /* Edit Syllabus Mode (Full CMS Controls) */
        <div className="space-y-6">
          {course.modules.map((mod, mIdx) => {
            const modLessonCount = mod.subSections.reduce((s, sub) => s + sub.lessons.length, 0);
            const modVideoCount = mod.subSections.reduce(
              (s, sub) =>
                s +
                sub.lessons.filter((l) => l.kind === 'video' || l.videoUrl || l.localMediaId)
                  .length,
              0
            );

            return (
              <section
                key={mod.id}
                onDragOver={(e) => {
                  if (!draggingModuleId || draggingModuleId === mod.id) return;
                  e.preventDefault();
                  setDragOverModuleId(mod.id);
                }}
                onDragLeave={() => {
                  if (dragOverModuleId === mod.id) setDragOverModuleId(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggingModuleId && draggingModuleId !== mod.id) {
                    reorderModules(draggingModuleId, mod.id);
                  }
                  setDraggingModuleId(null);
                  setDragOverModuleId(null);
                }}
                data-testid={`course-module-card-${mod.id}`}
                className={`rounded-2xl border bg-white p-6 shadow-2xs transition ${
                  dragOverModuleId === mod.id
                    ? 'border-[#6E32F5] ring-2 ring-[#6E32F5]/25'
                    : 'border-[#ECECF2]'
                }`}
              >
                <div
                  draggable
                  onDragStart={(e) => {
                    setDraggingModuleId(mod.id);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', `mod:${mod.id}`);
                  }}
                  onDragEnd={() => {
                    setDraggingModuleId(null);
                    setDragOverModuleId(null);
                  }}
                  data-testid={`course-module-drag-handle-${mod.id}`}
                  className="space-y-3 rounded-2xl border border-[#D4C5FD] bg-[#FAF9FF] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 cursor-grab text-[#848494]" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E32F5]">
                        Module #{mIdx + 1}
                      </span>
                      <span className="text-xs text-[#848494]">
                        · {mod.subSections.length}{' '}
                        {mod.subSections.length === 1 ? 'section' : 'sections'} ·{' '}
                        {modLessonCount} {modLessonCount === 1 ? 'lesson' : 'lessons'} ·{' '}
                        {modVideoCount} {modVideoCount === 1 ? 'video' : 'videos'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setQuickVideoModId((prev) => (prev === mod.id ? null : mod.id))
                        }
                        data-testid={`course-add-video-${mod.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#D4C5FD] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#6E32F5] hover:bg-[#F3ECFF]"
                      >
                        <Video className="h-3 w-3" />
                        Add Video Lesson
                      </button>
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
                        title="Delete module"
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

                  {quickVideoModId === mod.id && (
                    <form
                      onSubmit={(e) => handleSaveQuickVideoLesson(e, mod.id)}
                      className="space-y-2.5 rounded-xl border border-[#D4C5FD] bg-white p-3.5"
                      data-testid="course-quick-video-form"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#6E32F5]">
                          Add Standalone Video Lesson to &ldquo;{mod.title}&rdquo;
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuickVideoModId(null)}
                          className="text-xs text-[#848494] hover:text-[#111118]"
                        >
                          Cancel
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={qvTitle}
                        onChange={(e) => setQvTitle(e.target.value)}
                        placeholder="Lesson title (e.g. Mock Walkthrough: Pricing Strategy)"
                        className="w-full rounded-xl border border-[#ECECF2] bg-[#FAFAFC] px-3 py-2 text-xs font-semibold text-[#111118] focus:border-[#6E32F5] focus:bg-white focus:outline-none"
                      />
                      <textarea
                        rows={2}
                        value={qvNote}
                        onChange={(e) => setQvNote(e.target.value)}
                        placeholder="Key takeaways or walkthrough notes (optional)"
                        className="w-full rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-2.5 text-xs text-[#111118] focus:border-[#6E32F5] focus:bg-white focus:outline-none"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="url"
                          value={qvVideoUrl}
                          onChange={(e) => setQvVideoUrl(e.target.value)}
                          placeholder="Paste YouTube URL or upload MP4..."
                          className="min-w-[220px] flex-1 rounded-xl border border-[#ECECF2] bg-[#FAFAFC] px-3 py-2 text-xs text-[#111118] focus:border-[#6E32F5] focus:bg-white focus:outline-none"
                        />
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#D4C5FD] bg-white px-3 py-2 text-xs font-semibold text-[#6E32F5] hover:bg-[#F3ECFF]">
                          {qvUploading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5" />
                          )}
                          {qvLocalMediaName ? qvLocalMediaName : 'Upload MP4'}
                          <input
                            type="file"
                            accept="video/*,.mp4,.webm,.mov"
                            onChange={handleQuickVideoFileUpload}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="submit"
                          className="rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5B24D6]"
                        >
                          Add Lesson
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Sub-sections inside Edit Mode */}
                <div className="mt-4 space-y-3">
                  {mod.subSections.map((sub) => (
                    <div
                      key={sub.id}
                      className="overflow-hidden rounded-xl border border-[#ECECF2] bg-white"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FAFAFC] px-4 py-2.5">
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

                      <div className="divide-y divide-[#F0F0F5]">
                        {sub.lessons.map((les) => (
                          <div
                            key={les.id}
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              setDraggingLesson({
                                modId: mod.id,
                                subId: sub.id,
                                lessonId: les.id,
                              });
                              e.dataTransfer.effectAllowed = 'move';
                              e.dataTransfer.setData('text/plain', `les:${les.id}`);
                            }}
                            onDragOver={(e) => {
                              if (
                                !draggingLesson ||
                                draggingLesson.modId !== mod.id ||
                                draggingLesson.subId !== sub.id ||
                                draggingLesson.lessonId === les.id
                              ) {
                                return;
                              }
                              e.preventDefault();
                              e.stopPropagation();
                              setDragOverLessonId(les.id);
                            }}
                            onDragLeave={() => {
                              if (dragOverLessonId === les.id) setDragOverLessonId(null);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (
                                draggingLesson &&
                                draggingLesson.modId === mod.id &&
                                draggingLesson.subId === sub.id &&
                                draggingLesson.lessonId !== les.id
                              ) {
                                reorderLessons(
                                  mod.id,
                                  sub.id,
                                  draggingLesson.lessonId,
                                  les.id
                                );
                              }
                              setDraggingLesson(null);
                              setDragOverLessonId(null);
                            }}
                            onDragEnd={() => {
                              setDraggingLesson(null);
                              setDragOverLessonId(null);
                            }}
                            className={`flex items-center justify-between gap-3 px-4 py-2.5 ${
                              dragOverLessonId === les.id ? 'bg-[#F3ECFF]/70' : ''
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-[#C8C8D4]" />
                              <span className="truncate text-xs font-medium text-[#111118]">
                                {les.title.replace(/&amp;/g, '&')}
                              </span>
                            </div>
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
                                                  lessons: s.lessons.filter((l) => l.id !== les.id),
                                                }
                                          ),
                                        }
                                  ),
                                })
                              }
                              className="rounded p-1 text-[#848494] hover:text-rose-600"
                              title="Remove lesson"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}

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
                                  <option value="video">Video Lesson</option>
                                  <option value="lesson">Text Note / Guide</option>
                                </select>
                                <input
                                  required
                                  value={newLessonTitle}
                                  onChange={(e) => setNewLessonTitle(e.target.value)}
                                  placeholder="Lesson or question title..."
                                  className="min-w-[220px] flex-1 rounded-lg border border-[#ECECF2] bg-white px-3 py-1.5 text-xs focus:border-[#6E32F5] focus:outline-none"
                                />
                              </div>
                              <textarea
                                rows={2}
                                value={newLessonPrompt}
                                onChange={(e) => setNewLessonPrompt(e.target.value)}
                                placeholder="Prompt or context (optional)..."
                                className="w-full rounded-lg border border-[#ECECF2] bg-white p-2.5 text-xs focus:border-[#6E32F5] focus:outline-none"
                              />
                              <textarea
                                rows={3}
                                value={newLessonAnswer}
                                onChange={(e) => setNewLessonAnswer(e.target.value)}
                                placeholder="Written answer or key notes (optional)..."
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
                                      : 'Upload Video (.mp4 / .webm)'}
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
                                  Add Lesson
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
                              Add Question / Note / Video Lesson
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => handleAddSubSection(mod.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#D4C5FD] bg-[#FAF9FF] px-3.5 py-2 text-xs font-semibold text-[#6E32F5] hover:bg-[#F3ECFF]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Sub-Section
                  </button>
                </div>
              </section>
            );
          })}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-[#D4C5FD] bg-[#FAF9FF] p-5">
            <button
              type="button"
              onClick={handleAddBigModule}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-[#6E32F5] ring-1 ring-[#D4C5FD] hover:bg-[#F3ECFF]"
            >
              <Plus className="h-4 w-4" />
              Add Module
            </button>

            <button
              type="button"
              onClick={handleToggleEditMode}
              className="inline-flex items-center gap-2 rounded-xl bg-[#111118] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-90"
            >
              <Check className="h-4 w-4" />
              Done Editing
            </button>
          </div>
        </div>
      )}

      {/* Unlinked Custom & Lark-Imported Questions for This Track */}
      {unlinkedCustomQuestions.length > 0 && (
        <section className="rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[#111118]">
                Custom &amp; Imported {roleCfg.shortLabel} Questions ({unlinkedCustomQuestions.length})
              </h2>
              <p className="text-xs text-[#848494]">
                Role-matched prompts imported from Lark or added directly to your bank.
              </p>
            </div>
            <Link
              href={`/questions?role=${role}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#6E32F5] hover:underline"
            >
              View in Question Bank
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-3 divide-y divide-[#F0F0F5]">
            {unlinkedCustomQuestions.map((q) => (
              <div
                key={q.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2.5"
              >
                <Link
                  href={`/questions/${q.id}`}
                  className="min-w-0 flex-1 truncate text-xs font-medium text-[#111118] hover:text-[#6E32F5]"
                >
                  {q.title}
                </Link>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/questions/${q.id}`}
                    className="rounded-lg border border-[#ECECF2] px-2.5 py-1 text-xs font-medium text-[#525260] hover:border-[#6E32F5] hover:text-[#111118]"
                  >
                    Study
                  </Link>
                  <Link
                    href={`/practice/${q.id}`}
                    className="rounded-lg bg-[#111118] px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90"
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
