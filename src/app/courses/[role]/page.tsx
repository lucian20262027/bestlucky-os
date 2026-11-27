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
  Loader2,
  Play,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Type,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { RichAnswerEditor } from '@/components/RichAnswerEditor';
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

  // Read-mode inline editing states
  const [editingModuleNotes, setEditingModuleNotes] = useState(false);
  const [moduleNotesDraft, setModuleNotesDraft] = useState('');
  const [editingStandaloneLesson, setEditingStandaloneLesson] = useState(false);
  const [standaloneTitleDraft, setStandaloneTitleDraft] = useState('');
  const [standaloneContentDraft, setStandaloneContentDraft] = useState('');
  const [standaloneHtmlDraft, setStandaloneHtmlDraft] = useState<string | undefined>(undefined);
  const [standaloneVideoUrlDraft, setStandaloneVideoUrlDraft] = useState('');
  const [standaloneUploadingVideo, setStandaloneUploadingVideo] = useState(false);

  // HTML article inline editing states
  const [editingInlineArticle, setEditingInlineArticle] = useState(false);
  const [inlineNotice, setInlineNotice] = useState('');
  const [inlineVideoTitle, setInlineVideoTitle] = useState('');
  const [inlineVideoNote, setInlineVideoNote] = useState('');
  const [inlineVideoUrl, setInlineVideoUrl] = useState('');
  const [inlineUploading, setInlineUploading] = useState(false);
  const inlineIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Quick Add Lesson Modal (usable right from Split Reader!)
  const [quickAddModalOpen, setQuickAddModalOpen] = useState(false);
  const [qaModuleId, setQaModuleId] = useState<string>('');
  const [qaSubId, setQaSubId] = useState<string>('');
  const [qaKind, setQaKind] = useState<'lesson' | 'question' | 'video'>('lesson');
  const [qaTitle, setQaTitle] = useState('');
  const [qaContent, setQaContent] = useState('');
  const [qaVideoUrl, setQaVideoUrl] = useState('');
  const [qaLocalMediaId, setQaLocalMediaId] = useState<string | undefined>(undefined);
  const [qaLocalMediaName, setQaLocalMediaName] = useState<string | undefined>(undefined);
  const [qaUploading, setQaUploading] = useState(false);

  // Edit Mode UI toggles (keep typography clutter hidden until requested)
  const [showHeroTypography, setShowHeroTypography] = useState(false);
  const [typographyModuleIds, setTypographyModuleIds] = useState<Record<string, boolean>>({});
  const [typographySubIds, setTypographySubIds] = useState<Record<string, boolean>>({});
  const [editingRowLessonId, setEditingRowLessonId] = useState<string | null>(null);

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

  // Inline Lesson/Q&A Creator state inside Edit Mode
  const [newLessonKind, setNewLessonKind] = useState<'question' | 'video' | 'lesson'>('lesson');
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
      moduleDescription: string;
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
            moduleDescription: m.description,
            subSectionId: s.id,
            subSectionTitle: s.title,
          })
        )
      )
    );
    return list;
  }, [course]);

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

  // Reset per-track selection when switching track
  useEffect(() => {
    setSelectedLessonId(null);
    setEditingInlineArticle(false);
    setEditingStandaloneLesson(false);
    setEditingModuleNotes(false);
    setInlineNotice('');
  }, [role]);

  // Close Quick Add modal on Escape
  useEffect(() => {
    if (!quickAddModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setQuickAddModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [quickAddModalOpen]);

  const activeLesson = activeEntry?.lesson ?? null;
  const activeHtmlPage = activeLesson?.htmlPageId
    ? htmlPagesById.get(activeLesson.htmlPageId) ?? null
    : null;

  // Reset inline lesson editing states when switching lesson
  useEffect(() => {
    setEditingInlineArticle(false);
    setEditingStandaloneLesson(false);
    setEditingModuleNotes(false);
    setInlineNotice('');
  }, [activeLesson?.id]);

  // Load persisted HTML snapshot for active HTML lesson
  useEffect(() => {
    const pageId = activeLesson?.htmlPageId;
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

  const updateLessonFields = (
    modId: string,
    subId: string,
    lessonId: string,
    patch: Partial<CourseLessonItem>
  ) => {
    saveCourse({
      ...course,
      modules: course.modules.map((m) =>
        m.id !== modId
          ? m
          : {
              ...m,
              subSections: m.subSections.map((s) =>
                s.id !== subId
                  ? s
                  : {
                      ...s,
                      lessons: s.lessons.map((l) =>
                        l.id === lessonId ? { ...l, ...patch } : l
                      ),
                    }
              ),
            }
      ),
    });
  };

  const handleToggleEditMode = () => {
    if (editMode) {
      saveCourse({ ...course, published: true });
      setEditMode(false);
      setEditingRowLessonId(null);
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
    setEditingStandaloneLesson(false);
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

  const openQuickAddModal = (modId: string, preferredSubId?: string) => {
    const mod = course.modules.find((m) => m.id === modId) ?? course.modules[0];
    if (!mod) return;
    setQaModuleId(mod.id);
    setQaSubId(preferredSubId || mod.subSections[0]?.id || '');
    setQaKind('lesson');
    setQaTitle('');
    setQaContent('');
    setQaVideoUrl('');
    setQaLocalMediaId(undefined);
    setQaLocalMediaName(undefined);
    setQuickAddModalOpen(true);
  };

  const handleQuickAddFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setQaUploading(true);
    try {
      const saved = await saveLocalMedia(file);
      setQaLocalMediaId(saved.id);
      setQaLocalMediaName(saved.name);
      if (saved.cloudUrl) setQaVideoUrl(saved.cloudUrl);
      if (!qaTitle.trim()) setQaTitle(file.name.replace(/\.[^.]+$/, ''));
    } finally {
      setQaUploading(false);
    }
  };

  const handleSubmitQuickAddModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaTitle.trim()) return;
    const mod = course.modules.find((m) => m.id === qaModuleId) ?? course.modules[0];
    if (!mod) return;
    const targetSub =
      mod.subSections.find((s) => s.id === qaSubId) ?? mod.subSections[0];
    if (!targetSub) return;

    const cleanContent = qaContent.trim();
    const summaryExcerpt = cleanContent.replace(/\s+/g, ' ').slice(0, 140);
    let questionId: string | undefined = undefined;

    if (qaKind === 'question') {
      const qId = `course-q-${Date.now()}`;
      const createdQ: InterviewQuestion = {
        id: qId,
        role: questionDefaultRole,
        secondaryRoles: [],
        round: 'decomposition',
        difficulty: 'senior',
        timeLimitMin: 30,
        companyStyle: `${roleCfg.shortLabel} Course`,
        title: qaTitle.trim(),
        prompt: cleanContent || qaTitle.trim(),
        promptZhHint: `${roleCfg.shortLabel} custom course prompt`,
        frameworkSteps: roleCfg.defaultScratchpadSections,
        strongHireSignals: ['Clear structure, quantified trade-offs, and ownership.'],
        redFlags: ['Generic unstructured answers.'],
        followUpProbes: ['What breaks first under production scale?'],
        videoUrl: qaVideoUrl.trim() || undefined,
        localMediaId: qaLocalMediaId,
        isCustom: true,
        createdAt: new Date().toISOString(),
      };
      addCustomQuestion(createdQ);
      updateQuestionNotes(qId, {
        myAnswer: '',
        modelAnswer: '',
        pitch60s: '',
        personalNotes: '',
        videoUrl: qaVideoUrl.trim(),
        localMediaId: qaLocalMediaId,
        localMediaName: qaLocalMediaName,
        published: true,
      });
      questionId = qId;
    }

    const newLesson: CourseLessonItem = {
      id: `les-${Date.now()}`,
      title: qaTitle.trim(),
      kind: qaKind,
      questionId,
      videoUrl: qaVideoUrl.trim() || undefined,
      localMediaId: qaLocalMediaId,
      localMediaName: qaLocalMediaName,
      content: cleanContent || undefined,
      summary: summaryExcerpt || undefined,
      completed: false,
      published: true,
    };

    saveCourse({
      ...course,
      modules: course.modules.map((m) =>
        m.id !== mod.id
          ? m
          : {
              ...m,
              subSections: m.subSections.map((s) =>
                s.id !== targetSub.id
                  ? s
                  : { ...s, lessons: [...s.lessons, newLesson] }
              ),
            }
      ),
    });

    setCollapsedSubs((prev) => ({ ...prev, [targetSub.id]: false }));
    setSelectedLessonId(newLesson.id);
    setQuickAddModalOpen(false);
  };

  const openModuleNotesEditor = () => {
    if (!activeEntry) return;
    setModuleNotesDraft(activeEntry.moduleDescription || '');
    setEditingModuleNotes(true);
  };

  const handleSaveModuleNotes = () => {
    if (!activeEntry) return;
    saveCourse({
      ...course,
      modules: course.modules.map((m) =>
        m.id === activeEntry.moduleId ? { ...m, description: moduleNotesDraft } : m
      ),
    });
    setEditingModuleNotes(false);
  };

  const openStandaloneEditor = () => {
    if (!activeLesson) return;
    setStandaloneTitleDraft(activeLesson.title.replace(/&amp;/g, '&'));
    setStandaloneContentDraft(activeLesson.content || activeLesson.summary || '');
    setStandaloneHtmlDraft(activeLesson.contentHtml);
    setStandaloneVideoUrlDraft(activeLesson.videoUrl || '');
    setEditingStandaloneLesson(true);
  };

  const handleUploadStandaloneVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeEntry || !activeLesson) return;
    setStandaloneUploadingVideo(true);
    try {
      const saved = await saveLocalMedia(file);
      updateLessonFields(activeEntry.moduleId, activeEntry.subSectionId, activeLesson.id, {
        localMediaId: saved.id,
        localMediaName: saved.name,
        ...(saved.cloudUrl ? { videoUrl: saved.cloudUrl } : {}),
      });
      if (saved.cloudUrl) setStandaloneVideoUrlDraft(saved.cloudUrl);
    } finally {
      setStandaloneUploadingVideo(false);
    }
  };

  const handleSaveStandaloneLesson = () => {
    if (!activeEntry || !activeLesson) return;
    const trimmedTitle = standaloneTitleDraft.trim() || activeLesson.title;
    const trimmedContent = standaloneContentDraft.trim();
    const excerpt = trimmedContent.replace(/\s+/g, ' ').slice(0, 140);
    updateLessonFields(activeEntry.moduleId, activeEntry.subSectionId, activeLesson.id, {
      title: trimmedTitle,
      content: trimmedContent,
      contentHtml: standaloneHtmlDraft,
      summary: excerpt || undefined,
      videoUrl: standaloneVideoUrlDraft.trim() || undefined,
    });
    setEditingStandaloneLesson(false);
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

  const moveLessonStep = (modId: string, subId: string, idx: number, dir: -1 | 1) => {
    saveCourse({
      ...course,
      modules: course.modules.map((m) => {
        if (m.id !== modId) return m;
        return {
          ...m,
          subSections: m.subSections.map((s) => {
            if (s.id !== subId) return s;
            const nextIdx = idx + dir;
            if (nextIdx < 0 || nextIdx >= s.lessons.length) return s;
            const copy = [...s.lessons];
            const [picked] = copy.splice(idx, 1);
            copy.splice(nextIdx, 0, picked);
            return { ...s, lessons: copy };
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

    setCollapsedSubs((prev) => ({ ...prev, [targetSubId]: false }));
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
      title: `Module ${course.modules.length + 1}`,
      description: '',
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
    const combinedBody = (newLessonAnswer.trim() || newLessonPrompt.trim()).trim();
    const excerpt = combinedBody.replace(/\s+/g, ' ').slice(0, 140);
    let questionId: string | undefined = undefined;

    if (newLessonKind === 'question') {
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
      questionId = qId;
    }

    const newLesson: CourseLessonItem = {
      id: `les-${Date.now()}`,
      title: newLessonTitle.trim(),
      kind: newLessonKind,
      questionId,
      videoUrl: newLessonVideoUrl.trim() || undefined,
      localMediaId: newLessonLocalMediaId,
      localMediaName: newLessonLocalMediaName,
      content: combinedBody || undefined,
      summary: excerpt || undefined,
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

    setCollapsedSubs((prev) => ({ ...prev, [addingTarget.subSectionId]: false }));
    setSelectedLessonId(newLesson.id);
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

  const modalModule =
    course.modules.find((m) => m.id === qaModuleId) ?? course.modules[0];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb + Edit Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-[#6C7385]">
          <Link href="/courses" className="inline-flex items-center gap-1 hover:text-[#111118]">
            <ArrowLeft className="h-3.5 w-3.5" />
            Courses
          </Link>
          <span>/</span>
          <span className="font-medium text-[#111118]">{course.heroTitle}</span>
        </div>

        <button
          type="button"
          onClick={handleToggleEditMode}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
            editMode
              ? 'bg-[#6E32F5] text-white shadow-sm hover:bg-[#5B24D6]'
              : 'border border-[#D4D8E4] bg-white text-[#111118] hover:border-[#6E32F5] hover:text-[#6E32F5]'
          }`}
        >
          {editMode ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Done &amp; View Course
            </>
          ) : (
            <>
              <Edit3 className="h-3.5 w-3.5" />
              Edit Syllabus
            </>
          )}
        </button>
      </div>

      {/* Compact Sticky Edit Banner when Edit Syllabus Mode is active */}
      {editMode && (
        <div className="sticky top-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#111118] px-5 py-3 text-white shadow-lg">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="font-semibold">Syllabus Edit Mode</span>
            <span className="hidden text-white/65 sm:inline">
              · All edits save automatically. Click Done to return to the course reader.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddBigModule}
              className="inline-flex items-center gap-1 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Module
            </button>
            <button
              type="button"
              onClick={handleToggleEditMode}
              className="inline-flex items-center gap-1 rounded-xl bg-[#6E32F5] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#5B24D6]"
            >
              <Check className="h-3.5 w-3.5" />
              Done &amp; View Course
            </button>
          </div>
        </div>
      )}

      {/* Course Hero Card */}
      <section
        className={`rounded-2xl bg-white p-6 ${
          editMode
            ? 'border-2 border-[#D2D6E2] shadow-sm'
            : 'border border-[#E6E8F0] shadow-[0_1px_2px_rgba(16,16,24,0.03)]'
        }`}
      >
        <div
          className={`grid grid-cols-1 gap-6 ${
            hasIntroVideo || editMode ? 'lg:grid-cols-12 lg:items-start' : ''
          }`}
        >
          <div className={hasIntroVideo || editMode ? 'space-y-3.5 lg:col-span-7' : 'space-y-3.5'}>
            {editMode ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#475467]">
                    Track Title &amp; Overview
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowHeroTypography((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#CBD0DC] bg-[#F3F4F8] px-2.5 py-1 text-[11px] font-semibold text-[#344054] hover:bg-[#E7E9F2]"
                  >
                    <Type className="h-3 w-3 text-[#6E32F5]" />
                    {showHeroTypography ? 'Hide Style' : 'Typography'}
                  </button>
                </div>

                {showHeroTypography && (
                  <TypographyPicker
                    value={course.heroTitleStyle}
                    onChange={(st) => saveCourse({ ...course, heroTitleStyle: st })}
                  />
                )}

                <div className="flex flex-wrap gap-2.5">
                  <input
                    value={course.heroTitle}
                    onChange={(e) => saveCourse({ ...course, heroTitle: e.target.value })}
                    placeholder="Course title"
                    className="min-w-[220px] flex-1 rounded-xl border border-[#C5CBD9] bg-white px-3.5 py-2 text-sm font-bold text-[#111118] focus:border-[#6E32F5] focus:ring-2 focus:ring-[#6E32F5]/15 focus:outline-none"
                  />
                  <input
                    value={course.editionBadge}
                    onChange={(e) => saveCourse({ ...course, editionBadge: e.target.value })}
                    placeholder="Edition badge"
                    className="w-40 rounded-xl border border-[#C5CBD9] bg-white px-3 py-2 text-xs font-semibold text-[#111118] focus:border-[#6E32F5] focus:ring-2 focus:ring-[#6E32F5]/15 focus:outline-none"
                  />
                </div>
                <textarea
                  rows={2}
                  value={course.heroSubtitle}
                  onChange={(e) => saveCourse({ ...course, heroSubtitle: e.target.value })}
                  placeholder="Course overview description..."
                  className="w-full rounded-xl border border-[#C5CBD9] bg-white p-3 text-xs leading-relaxed text-[#111118] focus:border-[#6E32F5] focus:ring-2 focus:ring-[#6E32F5]/15 focus:outline-none"
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
                <p className="max-w-3xl text-sm leading-relaxed text-[#475467]">
                  {course.heroSubtitle}
                </p>
              </>
            )}

            {course.highlights.length > 0 && !editMode && (
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 pt-0.5">
                {course.highlights.map((hl, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs text-[#344054]">
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

              <div className="flex min-w-[200px] max-w-xs flex-1 items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#EBEDF3]">
                  <div
                    className="h-full rounded-full bg-[#6E32F5] transition-all"
                    style={{ width: `${stats.pct}%` }}
                  />
                </div>
                <span className="shrink-0 font-mono text-xs font-semibold text-[#475467]">
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
                <div className="space-y-2 rounded-xl border border-[#CBD0DC] bg-[#F3F4F8] p-3.5">
                  <div className="text-[11px] font-semibold text-[#344054]">
                    Course Intro Video (Optional)
                  </div>
                  <input
                    value={course.introVideoUrl ?? ''}
                    onChange={(e) => saveCourse({ ...course, introVideoUrl: e.target.value })}
                    placeholder="Paste YouTube / Bilibili / Loom / Lark URL..."
                    className="w-full rounded-lg border border-[#C5CBD9] bg-white px-2.5 py-1.5 text-xs text-[#111118] placeholder:text-[#848B9C] focus:border-[#6E32F5] focus:outline-none"
                  />
                  <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#A6B0C3] bg-white px-3 py-1.5 text-xs font-semibold text-[#5D26D9] hover:border-[#6E32F5]">
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

      {/* Main Content Area: Split Reader OR High-Contrast Syllabus Editor */}
      {!editMode ? (
        <div
          id="course-reader-stage"
          className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start"
        >
          {/* Left 4 Cols: Sticky Syllabus Outline with direct "+ Add" per module */}
          <aside className="space-y-3 lg:sticky lg:top-6 lg:col-span-4 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto lg:pr-1">
            {course.modules.map((mod, mIdx) => {
              const modLessons = mod.subSections.flatMap((s) => s.lessons);
              const modDone = modLessons.filter((l) => l.completed).length;

              return (
                <div
                  key={mod.id}
                  data-testid={`course-module-card-${mod.id}`}
                  className="overflow-hidden rounded-2xl border border-[#E2E5EE] bg-white shadow-2xs"
                >
                  <div className="border-b border-[#ECEEF4] bg-[#F6F7FB] px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#667085]">
                        Module {mIdx + 1} · {modDone}/{modLessons.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => openQuickAddModal(mod.id, mod.subSections[0]?.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-[#CFD4E0] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#5D26D9] transition hover:border-[#6E32F5] hover:bg-[#F4EFFF]"
                      >
                        <Plus className="h-3 w-3" />
                        Add
                      </button>
                    </div>
                    <h2 className="mt-0.5 text-sm font-semibold text-[#111118]">
                      {mod.title}
                    </h2>
                  </div>

                  <div className="divide-y divide-[#F1F2F7]">
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
                              className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-xs font-semibold text-[#475467] hover:bg-[#F9FAFC]"
                            >
                              <span className="truncate">{sub.title}</span>
                              {isCollapsed ? (
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#667085]" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#667085]" />
                              )}
                            </button>
                          )}

                          {!isCollapsed && (
                            <div className="space-y-0.5 p-1.5">
                              {sub.lessons.length === 0 ? (
                                <button
                                  type="button"
                                  onClick={() => openQuickAddModal(mod.id, sub.id)}
                                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#D8DCE8] py-2.5 text-xs font-medium text-[#667085] hover:border-[#6E32F5] hover:text-[#6E32F5]"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Add item to {sub.title}
                                </button>
                              ) : (
                                sub.lessons.map((les) => {
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
                                          : 'text-[#1F2430] hover:bg-[#F5F6FA]'
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
                                            : 'border border-[#C9CEDB] bg-white text-transparent hover:border-[#6E32F5]'
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
                                        <span className="shrink-0 text-[#667085]">
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
                                })
                              )}
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
                className="overflow-hidden rounded-2xl border border-[#E2E5EE] bg-white shadow-2xs"
                data-testid="course-inline-reader"
              >
                {/* Reader Top Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ECEEF4] bg-[#F8F9FC] px-6 py-4">
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-[#667085]">
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
                          : 'border border-[#D4D8E4] bg-white text-[#344054] hover:border-[#6E32F5]'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {activeLesson.completed ? 'Completed' : 'Mark Complete'}
                    </button>

                    {!activeHtmlPage && !activeQuestion && (
                      <button
                        type="button"
                        onClick={() =>
                          editingStandaloneLesson
                            ? handleSaveStandaloneLesson()
                            : openStandaloneEditor()
                        }
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                          editingStandaloneLesson
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'border border-[#D4D8E4] bg-white text-[#111118] hover:border-[#6E32F5] hover:text-[#6E32F5]'
                        }`}
                      >
                        {editingStandaloneLesson ? (
                          <>
                            <Save className="h-3.5 w-3.5" />
                            Save &amp; Done
                          </>
                        ) : (
                          <>
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit Content
                          </>
                        )}
                      </button>
                    )}

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
                            className="inline-flex items-center gap-1 rounded-xl border border-[#D4D8E4] bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] hover:border-[#6E32F5] hover:text-[#111118]"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit Article
                          </button>
                        )}
                        <Link
                          href={`/pages/${activeHtmlPage.id}`}
                          className="inline-flex items-center gap-1 rounded-xl border border-[#D4D8E4] bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] hover:text-[#111118]"
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
                  {/* Module Overview / Script Block (ALWAYS visible when non-empty, and inline editable!) */}
                  {(activeEntry.moduleDescription?.trim() || editingModuleNotes) && (
                    <div className="rounded-xl border border-[#D8DCE8] bg-[#F6F7FB] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#475467]">
                          Module Notes &amp; Overview
                        </span>
                        {editingModuleNotes ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingModuleNotes(false)}
                              className="rounded-lg border border-[#CFD4E0] bg-white px-2.5 py-1 text-[11px] font-medium text-[#475467]"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveModuleNotes}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#111118] px-3 py-1 text-[11px] font-semibold text-white"
                            >
                              <Save className="h-3 w-3" />
                              Save Module Notes
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={openModuleNotesEditor}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#CFD4E0] bg-white px-2.5 py-1 text-[11px] font-medium text-[#344054] hover:border-[#6E32F5] hover:text-[#6E32F5]"
                          >
                            <Edit3 className="h-3 w-3" />
                            Edit Module Notes
                          </button>
                        )}
                      </div>

                      {editingModuleNotes ? (
                        <textarea
                          rows={5}
                          value={moduleNotesDraft}
                          onChange={(e) => setModuleNotesDraft(e.target.value)}
                          placeholder="Module opening script, takeaways, or context..."
                          className="mt-2.5 w-full rounded-xl border border-[#C5CBD9] bg-white p-3 text-xs leading-relaxed text-[#111118] focus:border-[#6E32F5] focus:ring-2 focus:ring-[#6E32F5]/15 focus:outline-none"
                        />
                      ) : (
                        <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[#1F2430]">
                          {activeEntry.moduleDescription}
                        </p>
                      )}
                    </div>
                  )}

                  {!activeEntry.moduleDescription?.trim() && !editingModuleNotes && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={openModuleNotesEditor}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#667085] hover:text-[#6E32F5]"
                      >
                        <Plus className="h-3 w-3" />
                        Add Module Notes
                      </button>
                    </div>
                  )}

                  {editingInlineArticle && activeHtmlPage && (
                    <div
                      className="space-y-2.5 rounded-xl border border-[#C5B3FB] bg-[#F7F4FF] p-3.5"
                      data-testid="course-inline-video-inserter"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-[#5D26D9]">
                          Article is inline-editable. Optional: append a video block below.
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
                          className="rounded-lg border border-[#C5CBD9] bg-white px-2.5 py-1.5 text-xs text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                        />
                        <input
                          type="text"
                          value={inlineVideoNote}
                          onChange={(e) => setInlineVideoNote(e.target.value)}
                          placeholder="Short walkthrough caption (optional)"
                          className="rounded-lg border border-[#C5CBD9] bg-white px-2.5 py-1.5 text-xs text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="url"
                          value={inlineVideoUrl}
                          onChange={(e) => setInlineVideoUrl(e.target.value)}
                          placeholder="Paste YouTube URL or upload MP4..."
                          className="min-w-[200px] flex-1 rounded-lg border border-[#C5CBD9] bg-white px-2.5 py-1.5 text-xs text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                        />
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#C5B3FB] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#5D26D9] hover:bg-[#F3ECFF]">
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

                  {/* Attached Lesson Video (shown when attached) */}
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
                    <div className="overflow-hidden rounded-xl border border-[#DCE0EA] bg-white">
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
                        <span className="rounded-md bg-[#F3F4F8] px-2 py-0.5 text-[11px] text-[#475467]">
                          {ROUND_LABELS[activeQuestion.round].en}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-[#667085]">
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

                      <div className="rounded-xl border border-[#DCE0EA] bg-[#F8F9FC] p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5D26D9]">
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
                        <div className="rounded-xl border border-[#DCE0EA] bg-white p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#475467]">
                            {activeQuestionNotes?.myAnswer?.trim()
                              ? 'Your Saved Draft'
                              : 'Reference Approach'}
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[#1F2430] line-clamp-[12]">
                            {activeQuestionNotes?.myAnswer?.trim() ||
                              activeQuestionNotes?.modelAnswer?.trim() ||
                              activeQuestion.modelAnswer?.trim()}
                          </p>
                        </div>
                      )}

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-[#DCE0EA] bg-white p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#475467]">
                            Framework Steps
                          </div>
                          <ol className="mt-2.5 space-y-1.5 text-xs text-[#344054]">
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

                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/35 p-4">
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
                  ) : editingStandaloneLesson ? (
                    /* Case 3A: Standalone Note/Script In-Place Rich Editor */
                    <div className="space-y-4 rounded-xl border-2 border-[#C5B3FB] bg-[#FAF9FF] p-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#344054]">
                          Lesson Title
                        </label>
                        <input
                          value={standaloneTitleDraft}
                          onChange={(e) => setStandaloneTitleDraft(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-[#C5CBD9] bg-white px-3 py-2 text-sm font-semibold text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-[#344054]">
                          Lesson Content / Script
                        </label>
                        <RichAnswerEditor
                          key={activeLesson.id}
                          htmlValue={standaloneHtmlDraft}
                          textValue={standaloneContentDraft}
                          minHeightClass="min-h-[260px]"
                          placeholder="Write your script, outline, talking points, or examples..."
                          onChange={({ html, text }) => {
                            setStandaloneHtmlDraft(html);
                            setStandaloneContentDraft(text);
                          }}
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="url"
                          value={standaloneVideoUrlDraft}
                          onChange={(e) => setStandaloneVideoUrlDraft(e.target.value)}
                          placeholder="Optional Video URL (YouTube / Bilibili / Loom / MP4)..."
                          className="min-w-[220px] flex-1 rounded-xl border border-[#C5CBD9] bg-white px-3 py-2 text-xs text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                        />
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#C5B3FB] bg-white px-3 py-2 text-xs font-semibold text-[#5D26D9] hover:bg-[#F3ECFF]">
                          {standaloneUploadingVideo ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5" />
                          )}
                          Upload MP4
                          <input
                            type="file"
                            accept="video/*,.mp4,.webm,.mov"
                            onChange={handleUploadStandaloneVideo}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingStandaloneLesson(false)}
                          className="rounded-xl border border-[#CFD4E0] bg-white px-4 py-2 text-xs font-medium text-[#475467]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveStandaloneLesson}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Save Lesson
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Case 3B: Standalone Note/Script Reader */
                    <div className="rounded-xl border border-[#DCE0EA] bg-white p-5">
                      {activeLesson.contentHtml?.trim() ? (
                        <div
                          className="text-[14.5px] leading-[1.7] text-[#1F2430] [&>p]:mb-2.5"
                          dangerouslySetInnerHTML={{ __html: activeLesson.contentHtml }}
                        />
                      ) : activeLesson.content?.trim() || activeLesson.summary?.trim() ? (
                        <div className="whitespace-pre-wrap text-[14.5px] leading-[1.7] text-[#1F2430]">
                          {activeLesson.content || activeLesson.summary}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs text-[#667085]">
                          <span>No written notes in this lesson yet.</span>
                          <button
                            type="button"
                            onClick={openStandaloneEditor}
                            className="font-semibold text-[#6E32F5] hover:underline"
                          >
                            + Write Lesson Content
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Reader Footer Prev / Next */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#ECEEF4] bg-[#F8F9FC] px-6 py-3.5">
                  <button
                    type="button"
                    disabled={!prevEntry}
                    onClick={() =>
                      prevEntry && selectLesson(prevEntry.lesson.id, prevEntry.subSectionId)
                    }
                    data-testid="course-prev-lesson"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4D8E4] bg-white px-3.5 py-2 text-xs font-semibold text-[#111118] transition hover:border-[#6E32F5] disabled:cursor-not-allowed disabled:opacity-40"
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
              <div className="rounded-2xl border border-dashed border-[#C5CBD9] bg-white p-12 text-center">
                <p className="text-sm text-[#475467]">
                  No lessons in this syllabus yet.
                </p>
                {course.modules[0] && (
                  <button
                    type="button"
                    onClick={() => openQuickAddModal(course.modules[0].id)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Add First Lesson
                  </button>
                )}
              </div>
            )}
          </main>
        </div>
      ) : (
        /* High-Contrast Edit Syllabus Mode */
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
            const showModTypo = Boolean(typographyModuleIds[mod.id]);

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
                className={`overflow-hidden rounded-2xl border-2 bg-white shadow-sm transition ${
                  dragOverModuleId === mod.id
                    ? 'border-[#6E32F5] ring-2 ring-[#6E32F5]/20'
                    : 'border-[#D2D6E2]'
                }`}
              >
                {/* Tinted Module Header Bar */}
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
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D2D6E2] bg-[#EEF0F6] px-5 py-3.5"
                >
                  <div className="flex items-center gap-2.5">
                    <GripVertical className="h-4 w-4 cursor-grab text-[#667085]" />
                    <span className="rounded-md bg-[#111118] px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-white uppercase">
                      Module {mIdx + 1}
                    </span>
                    <span className="text-xs font-medium text-[#475467]">
                      {mod.subSections.length}{' '}
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
                      className="inline-flex items-center gap-1 rounded-lg border border-[#C5B3FB] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#5D26D9] hover:bg-[#F3ECFF]"
                    >
                      <Video className="h-3 w-3" />
                      Add Video Lesson
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setTypographyModuleIds((prev) => ({
                          ...prev,
                          [mod.id]: !prev[mod.id],
                        }))
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-[#CBD0DC] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#344054] hover:text-[#111118]"
                    >
                      <Type className="h-3 w-3 text-[#6E32F5]" />
                      {showModTypo ? 'Hide Style' : 'Typography'}
                    </button>
                    <button
                      type="button"
                      onClick={() => moveModule(mIdx, -1)}
                      className="rounded-lg border border-[#CBD0DC] bg-white p-1.5 text-[#344054] hover:text-[#111118]"
                      title="Move module up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveModule(mIdx, 1)}
                      className="rounded-lg border border-[#CBD0DC] bg-white p-1.5 text-[#344054] hover:text-[#111118]"
                      title="Move module down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          typeof window !== 'undefined' &&
                          !window.confirm(`Delete module "${mod.title}" and its lessons?`)
                        ) {
                          return;
                        }
                        saveCourse({
                          ...course,
                          modules: course.modules.filter((m) => m.id !== mod.id),
                        });
                      }}
                      className="rounded-lg border border-rose-300 bg-rose-50 p-1.5 text-rose-700 hover:bg-rose-100"
                      title="Delete module"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Module Title + Description + Sub-sections */}
                <div className="space-y-4 p-5">
                  {showModTypo && (
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
                  )}

                  <div className="grid gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#475467]">
                        Module Title
                      </label>
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
                        className="w-full rounded-xl border border-[#C5CBD9] bg-white px-3.5 py-2 text-sm font-bold text-[#111118] focus:border-[#6E32F5] focus:ring-2 focus:ring-[#6E32F5]/15 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#475467]">
                        Module Overview &amp; Script (shown in course reader)
                      </label>
                      <textarea
                        rows={3}
                        value={mod.description}
                        onChange={(e) =>
                          saveCourse({
                            ...course,
                            modules: course.modules.map((m) =>
                              m.id === mod.id ? { ...m, description: e.target.value } : m
                            ),
                          })
                        }
                        placeholder="Add module overview, framing notes, or opening script..."
                        className="w-full rounded-xl border border-[#C5CBD9] bg-white p-3 text-xs leading-relaxed text-[#111118] placeholder:text-[#848B9C] focus:border-[#6E32F5] focus:ring-2 focus:ring-[#6E32F5]/15 focus:outline-none"
                      />
                    </div>
                  </div>

                  {quickVideoModId === mod.id && (
                    <form
                      onSubmit={(e) => handleSaveQuickVideoLesson(e, mod.id)}
                      className="space-y-2.5 rounded-xl border-2 border-[#C5B3FB] bg-[#F7F4FF] p-4"
                      data-testid="course-quick-video-form"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#5D26D9]">
                          Add Standalone Video Lesson to &ldquo;{mod.title}&rdquo;
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuickVideoModId(null)}
                          className="text-xs font-medium text-[#475467] hover:text-[#111118]"
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
                        className="w-full rounded-xl border border-[#C5CBD9] bg-white px-3 py-2 text-xs font-semibold text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                      />
                      <textarea
                        rows={2}
                        value={qvNote}
                        onChange={(e) => setQvNote(e.target.value)}
                        placeholder="Key takeaways or walkthrough notes (optional)"
                        className="w-full rounded-xl border border-[#C5CBD9] bg-white p-2.5 text-xs text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="url"
                          value={qvVideoUrl}
                          onChange={(e) => setQvVideoUrl(e.target.value)}
                          placeholder="Paste YouTube URL or upload MP4..."
                          className="min-w-[220px] flex-1 rounded-xl border border-[#C5CBD9] bg-white px-3 py-2 text-xs text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                        />
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#C5B3FB] bg-white px-3 py-2 text-xs font-semibold text-[#5D26D9] hover:bg-[#F3ECFF]">
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

                  {/* Sub-Sections inside Module */}
                  <div className="space-y-3">
                    {mod.subSections.map((sub) => {
                      const showSubTypo = Boolean(typographySubIds[sub.id]);
                      return (
                        <div
                          key={sub.id}
                          className="overflow-hidden rounded-xl border border-[#D4D8E4] bg-white"
                        >
                          <div className="space-y-2 border-b border-[#D8DCE8] bg-[#F3F4F8] px-4 py-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
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
                                className="min-w-[200px] flex-1 rounded-lg border border-[#C5CBD9] bg-white px-3 py-1.5 text-xs font-semibold text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setTypographySubIds((prev) => ({
                                    ...prev,
                                    [sub.id]: !prev[sub.id],
                                  }))
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-[#CBD0DC] bg-white px-2.5 py-1 text-[11px] font-medium text-[#344054]"
                              >
                                <Type className="h-3 w-3 text-[#6E32F5]" />
                                {showSubTypo ? 'Hide Style' : 'Style'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    typeof window !== 'undefined' &&
                                    !window.confirm(`Delete sub-section "${sub.title}"?`)
                                  ) {
                                    return;
                                  }
                                  saveCourse({
                                    ...course,
                                    modules: course.modules.map((m) =>
                                      m.id !== mod.id
                                        ? m
                                        : {
                                            ...m,
                                            subSections: m.subSections.filter(
                                              (s) => s.id !== sub.id
                                            ),
                                          }
                                    ),
                                  });
                                }}
                                className="rounded-lg border border-rose-300 bg-rose-50 p-1.5 text-rose-700 hover:bg-rose-100"
                                title="Delete sub-section"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            {showSubTypo && (
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
                            )}
                          </div>

                          {/* Editable Lesson Rows */}
                          <div className="divide-y divide-[#E8EBF2]">
                            {sub.lessons.map((les, lesIdx) => {
                              const isEditingThisRow = editingRowLessonId === les.id;
                              const typeLabel = les.htmlPageId
                                ? 'Article'
                                : les.questionId
                                  ? 'Question'
                                  : les.kind === 'video'
                                    ? 'Video'
                                    : 'Note';

                              return (
                                <div
                                  key={les.id}
                                  draggable={!isEditingThisRow}
                                  onDragStart={(e) => {
                                    if (isEditingThisRow) return;
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
                                  className={`px-4 py-2.5 ${
                                    dragOverLessonId === les.id ? 'bg-[#F4EFFF]' : 'bg-white'
                                  }`}
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                      <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-[#667085]" />
                                      <span className="shrink-0 rounded bg-[#EEF0F6] px-1.5 py-0.5 text-[10px] font-semibold text-[#475467]">
                                        {typeLabel}
                                      </span>
                                      <span className="truncate text-xs font-semibold text-[#111118]">
                                        {les.title.replace(/&amp;/g, '&')}
                                      </span>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedLessonId(les.id);
                                          setEditingRowLessonId(
                                            isEditingThisRow ? null : les.id
                                          );
                                        }}
                                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                                          isEditingThisRow
                                            ? 'border-[#6E32F5] bg-[#6E32F5] text-white'
                                            : 'border-[#CBD0DC] bg-white text-[#111118] hover:border-[#6E32F5]'
                                        }`}
                                      >
                                        {isEditingThisRow ? (
                                          <>
                                            <Check className="h-3 w-3" />
                                            Done
                                          </>
                                        ) : (
                                          <>
                                            <Edit3 className="h-3 w-3" />
                                            Edit
                                          </>
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={lesIdx === 0}
                                        onClick={() => moveLessonStep(mod.id, sub.id, lesIdx, -1)}
                                        className="rounded-lg border border-[#CBD0DC] bg-white p-1 text-[#475467] disabled:opacity-30"
                                        title="Move up"
                                      >
                                        <ArrowUp className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={lesIdx === sub.lessons.length - 1}
                                        onClick={() => moveLessonStep(mod.id, sub.id, lesIdx, 1)}
                                        className="rounded-lg border border-[#CBD0DC] bg-white p-1 text-[#475467] disabled:opacity-30"
                                        title="Move down"
                                      >
                                        <ArrowDown className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (
                                            typeof window !== 'undefined' &&
                                            !window.confirm(
                                              `Remove lesson "${les.title.replace(/&amp;/g, '&')}"?`
                                            )
                                          ) {
                                            return;
                                          }
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
                                          });
                                        }}
                                        className="rounded-lg border border-rose-200 bg-rose-50 p-1 text-rose-700 hover:bg-rose-100"
                                        title="Remove lesson"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>

                                  {isEditingThisRow && (
                                    <div className="mt-3 space-y-2.5 rounded-xl border border-[#C5CBD9] bg-[#F8F9FC] p-3.5">
                                      <div>
                                        <label className="mb-1 block text-[11px] font-semibold text-[#475467]">
                                          Title
                                        </label>
                                        <input
                                          value={les.title}
                                          onChange={(e) => {
                                            setSelectedLessonId(les.id);
                                            updateLessonFields(mod.id, sub.id, les.id, {
                                              title: e.target.value,
                                            });
                                          }}
                                          className="w-full rounded-lg border border-[#C5CBD9] bg-white px-3 py-1.5 text-xs font-semibold text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                                        />
                                      </div>

                                      <div>
                                        <label className="mb-1 block text-[11px] font-semibold text-[#475467]">
                                          Content / Summary Notes
                                        </label>
                                        <textarea
                                          rows={4}
                                          value={les.content ?? les.summary ?? ''}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setSelectedLessonId(les.id);
                                            updateLessonFields(mod.id, sub.id, les.id, {
                                              content: val,
                                              contentHtml: undefined,
                                              summary: val.replace(/\s+/g, ' ').slice(0, 140),
                                            });
                                          }}
                                          placeholder="Write detailed notes, script, or talking points..."
                                          className="w-full rounded-lg border border-[#C5CBD9] bg-white p-2.5 text-xs leading-relaxed text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                                        />
                                      </div>

                                      <div>
                                        <label className="mb-1 block text-[11px] font-semibold text-[#475467]">
                                          Video URL (Optional)
                                        </label>
                                        <input
                                          type="url"
                                          value={les.videoUrl ?? ''}
                                          onChange={(e) => {
                                            setSelectedLessonId(les.id);
                                            updateLessonFields(mod.id, sub.id, les.id, {
                                              videoUrl: e.target.value || undefined,
                                            });
                                          }}
                                          placeholder="https://youtube.com/... or MP4 URL"
                                          className="w-full rounded-lg border border-[#C5CBD9] bg-white px-3 py-1.5 text-xs text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            <div className="bg-[#F6F7FB] px-4 py-3">
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
                                      className="rounded-lg border border-[#C5CBD9] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#111118]"
                                    >
                                      <option value="lesson">Note / Script</option>
                                      <option value="question">Question + Answer</option>
                                      <option value="video">Video Lesson</option>
                                    </select>
                                    <input
                                      required
                                      value={newLessonTitle}
                                      onChange={(e) => setNewLessonTitle(e.target.value)}
                                      placeholder="Lesson or question title..."
                                      className="min-w-[220px] flex-1 rounded-lg border border-[#C5CBD9] bg-white px-3 py-1.5 text-xs font-medium text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                                    />
                                  </div>
                                  {newLessonKind === 'question' && (
                                    <textarea
                                      rows={2}
                                      value={newLessonPrompt}
                                      onChange={(e) => setNewLessonPrompt(e.target.value)}
                                      placeholder="Question prompt or context..."
                                      className="w-full rounded-lg border border-[#C5CBD9] bg-white p-2.5 text-xs text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                                    />
                                  )}
                                  <textarea
                                    rows={3}
                                    value={newLessonAnswer}
                                    onChange={(e) => setNewLessonAnswer(e.target.value)}
                                    placeholder={
                                      newLessonKind === 'question'
                                        ? 'Reference answer or key notes (optional)...'
                                        : 'Lesson script, notes, or key talking points...'
                                    }
                                    className="w-full rounded-lg border border-[#C5CBD9] bg-white p-2.5 text-xs text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                                  />
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    <input
                                      value={newLessonVideoUrl}
                                      onChange={(e) => setNewLessonVideoUrl(e.target.value)}
                                      placeholder="Video URL (YouTube / Bilibili / Loom / Lark)..."
                                      className="rounded-lg border border-[#C5CBD9] bg-white px-2.5 py-1.5 text-xs text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                                    />
                                    <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#A6B0C3] bg-white px-3 py-1.5 text-xs font-semibold text-[#5D26D9]">
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
                                      className="rounded-lg border border-[#C5CBD9] bg-white px-3 py-1.5 text-xs font-medium text-[#475467]"
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
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5D26D9] hover:underline"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Add Note / Question / Video Lesson
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => handleAddSubSection(mod.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#A6B0C3] bg-[#F8F9FC] px-3.5 py-2 text-xs font-semibold text-[#344054] hover:border-[#6E32F5] hover:text-[#5D26D9]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Sub-Section
                    </button>
                  </div>
                </div>
              </section>
            );
          })}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-[#C5CBD9] bg-[#F6F7FB] p-5">
            <button
              type="button"
              onClick={handleAddBigModule}
              className="inline-flex items-center gap-2 rounded-xl border border-[#C5CBD9] bg-white px-4 py-2 text-xs font-semibold text-[#111118] hover:border-[#6E32F5] hover:text-[#5D26D9]"
            >
              <Plus className="h-4 w-4" />
              Add Module
            </button>

            <button
              type="button"
              onClick={handleToggleEditMode}
              className="inline-flex items-center gap-2 rounded-xl bg-[#6E32F5] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#5B24D6]"
            >
              <Check className="h-4 w-4" />
              Done &amp; View Course
            </button>
          </div>
        </div>
      )}

      {/* Unlinked Custom & Lark-Imported Questions for This Track */}
      {unlinkedCustomQuestions.length > 0 && (
        <section className="rounded-2xl border border-[#E2E5EE] bg-white p-5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[#111118]">
                Custom &amp; Imported {roleCfg.shortLabel} Questions ({unlinkedCustomQuestions.length})
              </h2>
              <p className="text-xs text-[#667085]">
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
                    className="rounded-lg border border-[#DCE0EA] px-2.5 py-1 text-xs font-medium text-[#475467] hover:border-[#6E32F5] hover:text-[#111118]"
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

      {/* Quick Add Lesson Modal (Triggered from "+ Add" inside Split Reader) */}
      {quickAddModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setQuickAddModalOpen(false);
          }}
        >
          <form
            onSubmit={handleSubmitQuickAddModal}
            className="w-full max-w-lg rounded-2xl border border-[#D2D6E2] bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#ECEEF4] pb-3">
              <div>
                <h2 className="text-base font-semibold text-[#111118]">
                  Add Lesson Item
                </h2>
                <p className="text-xs text-[#667085]">
                  Immediately appears in your module list and opens in the reader.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickAddModalOpen(false)}
                className="rounded-lg p-1 text-[#667085] hover:bg-[#F3F4F8]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-semibold text-[#344054]">
                    Module
                  </label>
                  <select
                    value={qaModuleId}
                    onChange={(e) => {
                      const nextMod = course.modules.find((m) => m.id === e.target.value);
                      setQaModuleId(e.target.value);
                      setQaSubId(nextMod?.subSections[0]?.id ?? '');
                    }}
                    className="w-full rounded-xl border border-[#C5CBD9] bg-white px-3 py-2 text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                  >
                    {course.modules.map((m, i) => (
                      <option key={m.id} value={m.id}>
                        Module {i + 1}: {m.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-[#344054]">
                    Sub-Section
                  </label>
                  <select
                    value={qaSubId}
                    onChange={(e) => setQaSubId(e.target.value)}
                    className="w-full rounded-xl border border-[#C5CBD9] bg-white px-3 py-2 text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                  >
                    {(modalModule?.subSections ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-[#344054]">
                  Item Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'lesson', label: 'Note / Script' },
                      { id: 'question', label: 'Question + Answer' },
                      { id: 'video', label: 'Video Lesson' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setQaKind(opt.id)}
                      className={`rounded-xl border py-2 text-xs font-semibold transition ${
                        qaKind === opt.id
                          ? 'border-[#111118] bg-[#111118] text-white'
                          : 'border-[#C5CBD9] bg-white text-[#475467] hover:text-[#111118]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-[#344054]">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={qaTitle}
                  onChange={(e) => setQaTitle(e.target.value)}
                  placeholder="e.g., Anthropic Why Us 45-second hook"
                  className="w-full rounded-xl border border-[#C5CBD9] bg-white px-3 py-2 text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-[#344054]">
                  {qaKind === 'question' ? 'Interview Prompt' : 'Content / Script'}
                </label>
                <textarea
                  rows={5}
                  value={qaContent}
                  onChange={(e) => setQaContent(e.target.value)}
                  placeholder={
                    qaKind === 'question'
                      ? 'Write the interview question prompt...'
                      : 'Write talking points, verbatim script, or checklist...'
                  }
                  className="w-full rounded-xl border border-[#C5CBD9] bg-white p-3 leading-relaxed text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="url"
                  value={qaVideoUrl}
                  onChange={(e) => setQaVideoUrl(e.target.value)}
                  placeholder="Optional Video URL (YouTube / Loom / MP4)..."
                  className="min-w-[200px] flex-1 rounded-xl border border-[#C5CBD9] bg-white px-3 py-2 text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                />
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#C5B3FB] bg-[#F7F4FF] px-3 py-2 font-semibold text-[#5D26D9] hover:bg-[#EFE8FF]">
                  {qaUploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  <span>{qaLocalMediaName || 'Upload MP4'}</span>
                  <input
                    type="file"
                    accept="video/*,.mp4,.webm,.mov"
                    onChange={handleQuickAddFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-[#ECEEF4] pt-4">
              <button
                type="button"
                onClick={() => setQuickAddModalOpen(false)}
                className="rounded-xl border border-[#C5CBD9] bg-white px-4 py-2 text-xs font-medium text-[#475467]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5B24D6]"
              >
                Add &amp; Open Lesson
              </button>
            </div>
          </form>
        </div>
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
