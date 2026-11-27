'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { cleanHtmlForReader, isAccessibleAccentHex } from '@/lib/html-parser';
import {
  deleteHtmlSnapshot,
  saveHtmlSnapshot,
} from '@/lib/html-snapshot-db';
import { uploadHtmlSnapshotToR2 } from '@/lib/media-db';
import {
  createDefaultState,
  exportStateAsJson,
  loadAppState,
  parseImportedState,
  saveAppState,
} from '@/lib/storage';
import {
  AffirmationVideo,
  AISettings,
  AppState,
  CourseSyllabus,
  CourseTrackId,
  CustomLoopPlan,
  DeployedHtmlPage,
  HtmlDesignTokens,
  InterviewQuestion,
  JobApplication,
  KnowledgeArticle,
  KnowledgeSnippet,
  LarkSettings,
  LibraryItem,
  PracticeSession,
  QuestionCategoryDef,
  QuestionProgress,
  QuestionUserNotes,
  ResumeProfile,
  RoleTrack,
  SavedJDItem,
  StarStory,
  TodoItem,
  UpcomingLoop,
  UserGoals,
  VocabItem,
} from '@/lib/types';

export type CloudSyncStatus = 'local-only' | 'syncing' | 'synced' | 'error';

interface AppContextValue {
  state: AppState;
  mounted: boolean;
  todayISO: string | null;
  syncStatus: CloudSyncStatus;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  retryCloudSync: () => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  updateAISettings: (patch: Partial<AISettings>) => void;
  updateLarkSettings: (patch: Partial<LarkSettings>) => void;
  updateUserGoals: (goals: UserGoals) => void;
  updateResumeSummary: (resumeSummary: string) => void;
  toggleActiveTrack: (track: RoleTrack) => void;
  addUpcomingLoop: (loop: Omit<UpcomingLoop, 'id'>) => void;
  removeUpcomingLoop: (id: string) => void;
  addCustomQuestion: (question: InterviewQuestion) => void;
  updateCustomQuestion: (question: InterviewQuestion) => void;
  deleteCustomQuestion: (id: string) => void;
  updateQuestionNotes: (questionId: string, patch: Partial<QuestionUserNotes>) => void;
  updateCourseSyllabus: (role: CourseTrackId, syllabus: CourseSyllabus) => void;
  toggleCourseLessonComplete: (
    role: CourseTrackId,
    moduleId: string,
    subSectionId: string,
    lessonId: string
  ) => void;
  upsertLibraryItem: (item: LibraryItem) => void;
  deleteLibraryItem: (id: string) => void;
  toggleLibraryFavorite: (id: string) => void;
  bulkImportItems: (payload: {
    questions: InterviewQuestion[];
    questionNotes: Record<string, QuestionUserNotes>;
    libraryItems: LibraryItem[];
    stories: StarStory[];
  }) => void;
  saveCustomLoopPlan: (plan: CustomLoopPlan) => void;
  savePracticeSession: (session: PracticeSession) => void;
  setQuestionProgress: (questionId: string, progress: Partial<QuestionProgress>) => void;
  upsertStory: (story: StarStory) => void;
  deleteStory: (id: string) => void;
  upsertVocabItem: (item: VocabItem) => void;
  deleteVocabItem: (id: string) => void;
  upsertKnowledgeSnippet: (snippet: KnowledgeSnippet) => void;
  deleteKnowledgeSnippet: (id: string) => void;
  upsertKnowledgeArticle: (article: KnowledgeArticle) => void;
  deleteKnowledgeArticle: (id: string) => void;
  addTodo: (todo: Omit<TodoItem, 'id' | 'createdAt' | 'completed'>) => void;
  updateTodo: (id: string, patch: Partial<TodoItem>) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  updateAffirmationVideos: (videos: AffirmationVideo[]) => void;
  upsertApplication: (app: JobApplication) => void;
  deleteApplication: (id: string) => void;
  upsertSavedJD: (jd: SavedJDItem) => void;
  deleteSavedJD: (id: string) => void;
  upsertResumeProfile: (resume: ResumeProfile) => void;
  deleteResumeProfile: (id: string) => void;
  deployHtmlPage: (
    page: Omit<DeployedHtmlPage, 'id' | 'createdAt' | 'updatedAt'>
  ) => DeployedHtmlPage;
  updateHtmlPage: (id: string, patch: Partial<DeployedHtmlPage>) => void;
  deleteHtmlPage: (id: string) => void;
  importHtmlPageToCourse: (pageId: string, track: CourseTrackId) => void;
  syncAllHtmlPagesToCourse: (track: CourseTrackId) => void;
  syncThemeFromHtml: (tokens: HtmlDesignTokens | null) => void;
  updateCustomCategories: (categories: QuestionCategoryDef[]) => void;
  updateCourseNav: (order: string[], hidden: string[]) => void;
  updateGoogleCalendarUrl: (url: string) => void;
  exportBackup: () => string;
  importBackup: (jsonText: string) => boolean;
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function appendTodayDate(dates: string[]): string[] {
  const today = new Date().toISOString().slice(0, 10);
  return dates.includes(today) ? dates : [...dates, today];
}

function compactStateForCloudSync(nextState: AppState): AppState {
  const rawPayload = JSON.stringify({ workspaceId: 'lucian-main', state: nextState });
  if (rawPayload.length <= 3_200_000 || !nextState.deployedHtmlPages?.length) {
    return nextState;
  }

  // First pass: strip external scripts/shells from large HTML pages while preserving embedded images
  let compacted: AppState = {
    ...nextState,
    deployedHtmlPages: nextState.deployedHtmlPages.map((p) => {
      if (p.rawHtml.length <= 120_000) return p;
      const cleaned = cleanHtmlForReader(p.rawHtml).cleanHtml;
      return {
        ...p,
        rawHtml: cleaned,
      };
    }),
  };

  if (JSON.stringify({ workspaceId: 'lucian-main', state: compacted }).length <= 3_800_000) {
    return compacted;
  }

  // Second pass: trim only huge >120KB inline data URIs if payload still exceeds Vercel 4.5MB limit
  compacted = {
    ...compacted,
    deployedHtmlPages: compacted.deployedHtmlPages?.map((p) => ({
      ...p,
      rawHtml: p.rawHtml.replace(/data:image\/[^"')\s]{120000,}/gi, ''),
    })),
  };

  if (JSON.stringify({ workspaceId: 'lucian-main', state: compacted }).length <= 3_800_000) {
    return compacted;
  }

  // Final pass: cap oversized rawHtml snapshots in cloud backup while keeping extractedText intact
  compacted = {
    ...compacted,
    deployedHtmlPages: compacted.deployedHtmlPages?.map((p) => ({
      ...p,
      rawHtml:
        p.rawHtml.length > 220_000
          ? `<article><h1>${p.title}</h1><p>${p.extractedText.replace(/\n/g, '</p><p>')}</p></article>`
          : p.rawHtml,
    })),
  };
  return compacted;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => createDefaultState());
  const [mounted, setMounted] = useState(false);
  const [todayISO, setTodayISO] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('local-only');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const cloudConfiguredRef = useRef(false);
  const syncTimerRef = useRef<number | null>(null);

  const pushStateToCloud = useCallback(async (nextState: AppState) => {
    if (!cloudConfiguredRef.current) return;
    setSyncStatus('syncing');
    setLastSyncError(null);
    try {
      const payloadState = compactStateForCloudSync(nextState);
      const res = await fetch('/api/sync/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: 'lucian-main', state: payloadState }),
      });
      const raw = await res.text();
      let json: {
        configured?: boolean;
        saved?: boolean;
        updatedAt?: string;
        error?: string;
      } = {};
      try {
        json = raw ? (JSON.parse(raw) as typeof json) : {};
      } catch {
        json = {};
      }
      if (json.configured === false) {
        cloudConfiguredRef.current = false;
        setSyncStatus('local-only');
        setLastSyncError(null);
        return;
      }
      if (res.ok && json.saved) {
        setSyncStatus('synced');
        setLastSyncedAt(json.updatedAt ?? new Date().toISOString());
        setLastSyncError(null);
      } else {
        setSyncStatus('error');
        setLastSyncError(json.error ?? `HTTP ${res.status}`);
      }
    } catch (err) {
      setSyncStatus('error');
      setLastSyncError(err instanceof Error ? err.message : 'Network error');
    }
  }, []);

  const retryCloudSync = useCallback(() => {
    cloudConfiguredRef.current = true;
    void pushStateToCloud(state);
  }, [pushStateToCloud, state]);

  useEffect(() => {
    const loaded = loadAppState();
    setState(loaded);
    setTodayISO(new Date().toISOString().slice(0, 10));
    setMounted(true);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/sync/state?workspaceId=lucian-main');
        if (!res.ok) return;
        const json = (await res.json()) as {
          configured?: boolean;
          state?: unknown;
          updatedAt?: string | null;
        };
        if (cancelled) return;
        if (!json.configured) {
          cloudConfiguredRef.current = false;
          setSyncStatus('local-only');
          return;
        }
        cloudConfiguredRef.current = true;
        if (json.state) {
          const parsed = parseImportedState(JSON.stringify(json.state));
          if (parsed && !cancelled) {
            const localPagesById = new Map(
              (loaded.deployedHtmlPages ?? []).map((p) => [p.id, p])
            );
            const mergedPages = (parsed.deployedHtmlPages ?? []).map((cp) => {
              const lp = localPagesById.get(cp.id);
              if (lp && lp.rawHtml.length > cp.rawHtml.length) {
                return { ...cp, rawHtml: lp.rawHtml };
              }
              return cp;
            });
            const mergedState = { ...parsed, deployedHtmlPages: mergedPages };
            setState(mergedState);
            saveAppState(mergedState);
          }
          setSyncStatus('synced');
          setLastSyncedAt(json.updatedAt ?? null);
        } else {
          // First time connecting cloud DB — seed it with current local state
          await pushStateToCloud(loaded);
        }
      } catch {
        // Keep local-only gracefully
      }
    })();

    return () => {
      cancelled = true;
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    };
  }, [pushStateToCloud]);

  const commit = useCallback(
    (updater: (prev: AppState) => AppState) => {
      setState((prev) => {
        const next = updater(prev);
        saveAppState(next);
        if (cloudConfiguredRef.current) {
          setSyncStatus('syncing');
          if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
          syncTimerRef.current = window.setTimeout(() => {
            void pushStateToCloud(next);
          }, 700);
        }
        return next;
      });
    },
    [pushStateToCloud]
  );

  const updateAISettings = useCallback(
    (patch: Partial<AISettings>) => {
      commit((prev) => ({
        ...prev,
        aiSettings: { ...prev.aiSettings, ...patch },
      }));
    },
    [commit]
  );

  const updateLarkSettings = useCallback(
    (patch: Partial<LarkSettings>) => {
      commit((prev) => ({
        ...prev,
        larkSettings: { ...prev.larkSettings, ...patch },
      }));
    },
    [commit]
  );

  const updateUserGoals = useCallback(
    (goals: UserGoals) => {
      commit((prev) => ({
        ...prev,
        userGoals: goals,
      }));
    },
    [commit]
  );

  const updateResumeSummary = useCallback(
    (resumeSummary: string) => {
      commit((prev) => ({
        ...prev,
        profile: { ...prev.profile, resumeSummary },
      }));
    },
    [commit]
  );

  const toggleActiveTrack = useCallback(
    (track: RoleTrack) => {
      commit((prev) => {
        const exists = prev.profile.activeTracks.includes(track);
        const nextTracks = exists
          ? prev.profile.activeTracks.filter((t) => t !== track)
          : [...prev.profile.activeTracks, track];
        return {
          ...prev,
          profile: {
            ...prev.profile,
            activeTracks: nextTracks.length > 0 ? nextTracks : [track],
          },
        };
      });
    },
    [commit]
  );

  const addUpcomingLoop = useCallback(
    (loop: Omit<UpcomingLoop, 'id'>) => {
      commit((prev) => ({
        ...prev,
        upcomingLoops: [
          ...prev.upcomingLoops,
          { ...loop, id: `loop-${Date.now()}` },
        ].sort((a, b) => a.dateISO.localeCompare(b.dateISO)),
      }));
    },
    [commit]
  );

  const removeUpcomingLoop = useCallback(
    (id: string) => {
      commit((prev) => ({
        ...prev,
        upcomingLoops: prev.upcomingLoops.filter((l) => l.id !== id),
      }));
    },
    [commit]
  );

  const addCustomQuestion = useCallback(
    (question: InterviewQuestion) => {
      commit((prev) => {
        const exists = prev.customQuestions.some((q) => q.id === question.id);
        if (exists) return prev;
        return {
          ...prev,
          customQuestions: [question, ...prev.customQuestions],
        };
      });
    },
    [commit]
  );

  const updateCustomQuestion = useCallback(
    (question: InterviewQuestion) => {
      commit((prev) => ({
        ...prev,
        customQuestions: prev.customQuestions.map((q) =>
          q.id === question.id ? question : q
        ),
      }));
    },
    [commit]
  );

  const deleteCustomQuestion = useCallback(
    (id: string) => {
      commit((prev) => ({
        ...prev,
        customQuestions: prev.customQuestions.filter((q) => q.id !== id),
      }));
    },
    [commit]
  );

  const updateQuestionNotes = useCallback(
    (questionId: string, patch: Partial<QuestionUserNotes>) => {
      commit((prev) => {
        const existing: QuestionUserNotes = prev.questionNotes[questionId] ?? {
          myAnswer: '',
          modelAnswer: '',
          pitch60s: '',
          personalNotes: '',
          videoUrl: '',
          updatedAt: new Date().toISOString(),
        };
        return {
          ...prev,
          questionNotes: {
            ...prev.questionNotes,
            [questionId]: {
              ...existing,
              ...patch,
              updatedAt: new Date().toISOString(),
            },
          },
        };
      });
    },
    [commit]
  );

  const updateCourseSyllabus = useCallback(
    (role: CourseTrackId, syllabus: CourseSyllabus) => {
      commit((prev) => ({
        ...prev,
        courses: {
          ...prev.courses,
          [role]: {
            ...syllabus,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
    },
    [commit]
  );

  const toggleCourseLessonComplete = useCallback(
    (role: CourseTrackId, moduleId: string, subSectionId: string, lessonId: string) => {
      commit((prev) => {
        const course = prev.courses[role];
        if (!course) return prev;
        const nextCourse: CourseSyllabus = {
          ...course,
          modules: course.modules.map((mod) =>
            mod.id !== moduleId
              ? mod
              : {
                  ...mod,
                  subSections: mod.subSections.map((sub) =>
                    sub.id !== subSectionId
                      ? sub
                      : {
                          ...sub,
                          lessons: sub.lessons.map((les) =>
                            les.id === lessonId
                              ? { ...les, completed: !les.completed }
                              : les
                          ),
                        }
                  ),
                }
          ),
        };
        return {
          ...prev,
          courses: {
            ...prev.courses,
            [role]: nextCourse,
          },
          practiceDatesISO: appendTodayDate(prev.practiceDatesISO),
        };
      });
    },
    [commit]
  );

  const upsertLibraryItem = useCallback(
    (item: LibraryItem) => {
      commit((prev) => {
        const exists = prev.libraryItems.some((l) => l.id === item.id);
        return {
          ...prev,
          libraryItems: exists
            ? prev.libraryItems.map((l) => (l.id === item.id ? item : l))
            : [item, ...prev.libraryItems],
        };
      });
    },
    [commit]
  );

  const deleteLibraryItem = useCallback(
    (id: string) => {
      commit((prev) => ({
        ...prev,
        libraryItems: prev.libraryItems.filter((l) => l.id !== id),
      }));
    },
    [commit]
  );

  const toggleLibraryFavorite = useCallback(
    (id: string) => {
      commit((prev) => ({
        ...prev,
        libraryItems: prev.libraryItems.map((l) =>
          l.id === id ? { ...l, isFavorite: !l.isFavorite } : l
        ),
      }));
    },
    [commit]
  );

  const bulkImportItems = useCallback(
    (payload: {
      questions: InterviewQuestion[];
      questionNotes: Record<string, QuestionUserNotes>;
      libraryItems: LibraryItem[];
      stories: StarStory[];
    }) => {
      commit((prev) => {
        const norm = (s: string) => s.trim().toLowerCase();
        const existingQT = new Set(prev.customQuestions.map((q) => norm(q.title)));
        const existingLT = new Set(prev.libraryItems.map((l) => norm(l.title)));
        const existingST = new Set(prev.stories.map((s) => norm(s.title)));

        const newQuestions = payload.questions.filter((q) => !existingQT.has(norm(q.title)));
        const newLibrary = payload.libraryItems.filter((l) => !existingLT.has(norm(l.title)));
        const newStories = payload.stories.filter((s) => !existingST.has(norm(s.title)));

        return {
          ...prev,
          customQuestions: [...newQuestions, ...prev.customQuestions],
          questionNotes: { ...prev.questionNotes, ...payload.questionNotes },
          libraryItems: [...newLibrary, ...prev.libraryItems],
          stories: [...newStories, ...prev.stories],
        };
      });
    },
    [commit]
  );

  const saveCustomLoopPlan = useCallback(
    (plan: CustomLoopPlan) => {
      commit((prev) => ({
        ...prev,
        lastCustomLoop: plan,
      }));
    },
    [commit]
  );

  const savePracticeSession = useCallback(
    (session: PracticeSession) => {
      commit((prev) => {
        const existingIdx = prev.sessions.findIndex((s) => s.id === session.id);
        const nextSessions =
          existingIdx >= 0
            ? prev.sessions.map((s, idx) => (idx === existingIdx ? session : s))
            : [session, ...prev.sessions];

        const prevProg = prev.questionProgress[session.questionId];
        const score = session.evaluation?.overallScore;
        const bestScore =
          typeof score === 'number'
            ? Math.max(score, prevProg?.bestScore ?? 0)
            : prevProg?.bestScore;

        const computedStatus =
          typeof score === 'number'
            ? score >= 4.0
              ? 'mastered'
              : 'needs_drill'
            : prevProg?.status ?? 'needs_drill';

        return {
          ...prev,
          sessions: nextSessions,
          practiceDatesISO: appendTodayDate(prev.practiceDatesISO),
          questionProgress: {
            ...prev.questionProgress,
            [session.questionId]: {
              status: computedStatus,
              attempts: (prevProg?.attempts ?? 0) + (existingIdx >= 0 ? 0 : 1),
              bestScore,
              lastPracticedAt: new Date().toISOString(),
              notes: prevProg?.notes,
            },
          },
        };
      });
    },
    [commit]
  );

  const setQuestionProgress = useCallback(
    (questionId: string, progress: Partial<QuestionProgress>) => {
      commit((prev) => {
        const current = prev.questionProgress[questionId] ?? {
          status: 'unpracticed',
          attempts: 0,
        };
        return {
          ...prev,
          practiceDatesISO:
            progress.status && progress.status !== 'unpracticed'
              ? appendTodayDate(prev.practiceDatesISO)
              : prev.practiceDatesISO,
          questionProgress: {
            ...prev.questionProgress,
            [questionId]: { ...current, ...progress },
          },
        };
      });
    },
    [commit]
  );

  const upsertStory = useCallback(
    (story: StarStory) => {
      commit((prev) => {
        const exists = prev.stories.some((s) => s.id === story.id);
        return {
          ...prev,
          stories: exists
            ? prev.stories.map((s) => (s.id === story.id ? story : s))
            : [story, ...prev.stories],
        };
      });
    },
    [commit]
  );

  const deleteStory = useCallback(
    (id: string) => {
      commit((prev) => ({
        ...prev,
        stories: prev.stories.filter((s) => s.id !== id),
      }));
    },
    [commit]
  );

  const upsertVocabItem = useCallback(
    (item: VocabItem) => {
      commit((prev) => {
        const exists = prev.vocabItems.some((v) => v.id === item.id);
        return {
          ...prev,
          vocabItems: exists
            ? prev.vocabItems.map((v) => (v.id === item.id ? item : v))
            : [item, ...prev.vocabItems],
        };
      });
    },
    [commit]
  );

  const deleteVocabItem = useCallback(
    (id: string) => {
      commit((prev) => ({
        ...prev,
        vocabItems: prev.vocabItems.filter((v) => v.id !== id),
      }));
    },
    [commit]
  );

  const upsertKnowledgeSnippet = useCallback(
    (snippet: KnowledgeSnippet) => {
      commit((prev) => {
        const exists = prev.knowledgeSnippets.some((k) => k.id === snippet.id);
        return {
          ...prev,
          knowledgeSnippets: exists
            ? prev.knowledgeSnippets.map((k) => (k.id === snippet.id ? snippet : k))
            : [snippet, ...prev.knowledgeSnippets],
        };
      });
    },
    [commit]
  );

  const deleteKnowledgeSnippet = useCallback(
    (id: string) => {
      commit((prev) => ({
        ...prev,
        knowledgeSnippets: prev.knowledgeSnippets.filter((k) => k.id !== id),
      }));
    },
    [commit]
  );

  const upsertKnowledgeArticle = useCallback(
    (article: KnowledgeArticle) => {
      commit((prev) => {
        const list = prev.knowledgeArticles ?? [];
        const exists = list.some((a) => a.id === article.id);
        return {
          ...prev,
          knowledgeArticles: exists
            ? list.map((a) => (a.id === article.id ? article : a))
            : [article, ...list],
        };
      });
    },
    [commit]
  );

  const deleteKnowledgeArticle = useCallback(
    (id: string) => {
      commit((prev) => ({
        ...prev,
        knowledgeArticles: (prev.knowledgeArticles ?? []).filter((a) => a.id !== id),
      }));
    },
    [commit]
  );

  const addTodo = useCallback(
    (todo: Omit<TodoItem, 'id' | 'createdAt' | 'completed'>) => {
      const nextTodo: TodoItem = {
        ...todo,
        id: `todo-${Date.now()}`,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      commit((prev) => ({
        ...prev,
        todos: [nextTodo, ...prev.todos],
      }));
    },
    [commit]
  );

  const updateTodo = useCallback(
    (id: string, patch: Partial<TodoItem>) => {
      commit((prev) => ({
        ...prev,
        todos: prev.todos.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }));
    },
    [commit]
  );

  const toggleTodo = useCallback(
    (id: string) => {
      commit((prev) => ({
        ...prev,
        todos: prev.todos.map((t) =>
          t.id === id ? { ...t, completed: !t.completed } : t
        ),
      }));
    },
    [commit]
  );

  const deleteTodo = useCallback(
    (id: string) => {
      commit((prev) => ({
        ...prev,
        todos: prev.todos.filter((t) => t.id !== id),
      }));
    },
    [commit]
  );

  const updateAffirmationVideos = useCallback(
    (videos: AffirmationVideo[]) => {
      commit((prev) => ({
        ...prev,
        affirmationVideos: videos,
      }));
    },
    [commit]
  );

  const upsertApplication = useCallback(
    (app: JobApplication) => {
      commit((prev) => {
        const exists = prev.applications.some((a) => a.id === app.id);
        return {
          ...prev,
          applications: exists
            ? prev.applications.map((a) => (a.id === app.id ? app : a))
            : [app, ...prev.applications],
        };
      });
    },
    [commit]
  );

  const deleteApplication = useCallback(
    (id: string) => {
      commit((prev) => ({
        ...prev,
        applications: prev.applications.filter((a) => a.id !== id),
      }));
    },
    [commit]
  );

  const upsertSavedJD = useCallback(
    (jd: SavedJDItem) => {
      commit((prev) => {
        const exists = prev.savedJDs.some((j) => j.id === jd.id);
        return {
          ...prev,
          savedJDs: exists
            ? prev.savedJDs.map((j) => (j.id === jd.id ? jd : j))
            : [jd, ...prev.savedJDs],
        };
      });
    },
    [commit]
  );

  const deleteSavedJD = useCallback(
    (id: string) => {
      commit((prev) => ({
        ...prev,
        savedJDs: prev.savedJDs.filter((j) => j.id !== id),
      }));
    },
    [commit]
  );

  const upsertResumeProfile = useCallback(
    (resume: ResumeProfile) => {
      commit((prev) => {
        const exists = prev.resumeProfiles.some((r) => r.id === resume.id);
        return {
          ...prev,
          resumeProfiles: exists
            ? prev.resumeProfiles.map((r) => (r.id === resume.id ? resume : r))
            : [resume, ...prev.resumeProfiles],
        };
      });
    },
    [commit]
  );

  const deleteResumeProfile = useCallback(
    (id: string) => {
      commit((prev) => ({
        ...prev,
        resumeProfiles: prev.resumeProfiles.filter((r) => r.id !== id),
      }));
    },
    [commit]
  );

  const deployHtmlPage = useCallback(
    (page: Omit<DeployedHtmlPage, 'id' | 'createdAt' | 'updatedAt'>): DeployedHtmlPage => {
      const now = new Date().toISOString();
      const id = `html-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      // Save 100% lossless full HTML (with all embedded images) to IndexedDB
      void saveHtmlSnapshot(id, page.rawHtml);
      const compactHtml =
        page.rawHtml.length > 180_000
          ? cleanHtmlForReader(page.rawHtml).cleanHtml
          : page.rawHtml;
      const created: DeployedHtmlPage = {
        ...page,
        rawHtml: compactHtml,
        id,
        createdAt: now,
        updatedAt: now,
      };
      commit((prev) => ({
        ...prev,
        deployedHtmlPages: [created, ...(prev.deployedHtmlPages ?? [])],
      }));
      // Also upload lossless HTML snapshot directly to Cloudflare R2 if configured
      void uploadHtmlSnapshotToR2(page.fileName, page.rawHtml).then((cloudUrl) => {
        if (!cloudUrl) return;
        commit((prev) => ({
          ...prev,
          deployedHtmlPages: (prev.deployedHtmlPages ?? []).map((p) =>
            p.id === id ? { ...p, htmlCloudUrl: cloudUrl } : p
          ),
        }));
      });
      return created;
    },
    [commit]
  );

  const deleteHtmlPage = useCallback(
    (id: string) => {
      void deleteHtmlSnapshot(id);
      commit((prev) => ({
        ...prev,
        deployedHtmlPages: (prev.deployedHtmlPages ?? []).filter((p) => p.id !== id),
      }));
    },
    [commit]
  );

  const updateHtmlPage = useCallback(
    (id: string, patch: Partial<DeployedHtmlPage>) => {
      const now = new Date().toISOString();
      if (patch.rawHtml) {
        void saveHtmlSnapshot(id, patch.rawHtml);
      }
      commit((prev) => ({
        ...prev,
        deployedHtmlPages: (prev.deployedHtmlPages ?? []).map((p) =>
          p.id === id ? { ...p, ...patch, updatedAt: now } : p
        ),
      }));
      if (patch.rawHtml) {
        const htmlToUpload = patch.rawHtml;
        const fallbackName = patch.fileName || `${id}.html`;
        void uploadHtmlSnapshotToR2(fallbackName, htmlToUpload).then((cloudUrl) => {
          if (!cloudUrl) return;
          commit((prev) => ({
            ...prev,
            deployedHtmlPages: (prev.deployedHtmlPages ?? []).map((p) =>
              p.id === id ? { ...p, htmlCloudUrl: cloudUrl } : p
            ),
          }));
        });
      }
    },
    [commit]
  );

  const importHtmlPageToCourse = useCallback(
    (pageId: string, track: CourseTrackId) => {
      const now = new Date().toISOString();
      commit((prev) => {
        const page = (prev.deployedHtmlPages ?? []).find((p) => p.id === pageId);
        if (!page) return prev;
        const syllabus = prev.courses[track];
        if (!syllabus) return prev;

        const hasVideo = Boolean(page.videoUrl || page.localMediaId);
        const lessonItem = {
          id: `lesson-html-${page.id}`,
          title: page.title,
          kind: (hasVideo ? 'video' : 'lesson') as 'video' | 'lesson',
          htmlPageId: page.id,
          videoUrl: page.videoUrl,
          localMediaId: page.localMediaId,
          localMediaName: page.localMediaName,
          summary: page.extractedText.slice(0, 260) || page.title,
          published: true,
        };

        const existingModule = syllabus.modules.find((m) => m.id === 'mod-html-imports');
        let nextModules = syllabus.modules;

        if (existingModule) {
          nextModules = syllabus.modules.map((m) => {
            if (m.id !== 'mod-html-imports') return m;
            return {
              ...m,
              subSections: m.subSections.map((sub, idx) => {
                if (idx !== 0) return sub;
                const exists = sub.lessons.some((l) => l.htmlPageId === page.id);
                return {
                  ...sub,
                  lessons: exists
                    ? sub.lessons.map((l) => (l.htmlPageId === page.id ? lessonItem : l))
                    : [lessonItem, ...sub.lessons],
                };
              }),
            };
          });
        } else {
          const defaultStyle = syllabus.modules[0]?.titleStyle ?? {
            fontFamily: 'Inter',
            fontSize: 'md' as const,
            color: '#111118',
          };
          nextModules = [
            {
              id: 'mod-html-imports',
              title: 'Imported HTML & Video Lessons',
              description: '从 HTML 页面一键导入的课程讲义与配套视频',
              titleStyle: defaultStyle,
              subSections: [
                {
                  id: 'sub-html-imports',
                  title: 'Synced Web Lessons',
                  titleStyle: defaultStyle,
                  lessons: [lessonItem],
                },
              ],
            },
            ...syllabus.modules,
          ];
        }

        return {
          ...prev,
          deployedHtmlPages: (prev.deployedHtmlPages ?? []).map((p) =>
            p.id === pageId ? { ...p, courseTrack: track, updatedAt: now } : p
          ),
          courses: {
            ...prev.courses,
            [track]: {
              ...syllabus,
              modules: nextModules,
              updatedAt: now,
            },
          },
        };
      });
    },
    [commit]
  );

  const syncAllHtmlPagesToCourse = useCallback(
    (track: CourseTrackId) => {
      const now = new Date().toISOString();
      commit((prev) => {
        const pages = prev.deployedHtmlPages ?? [];
        const syllabus = prev.courses[track];
        if (!syllabus || pages.length === 0) return prev;

        const defaultStyle = syllabus.modules[0]?.titleStyle ?? {
          fontFamily: 'Inter',
          fontSize: 'md' as const,
          color: '#111118',
        };

        // Group all HTML pages by moduleTitle
        const grouped = new Map<string, typeof pages>();
        pages.forEach((p) => {
          const modName = p.moduleTitle?.trim() || 'Imported HTML & Video Lessons';
          const arr = grouped.get(modName) ?? [];
          arr.push(p);
          grouped.set(modName, arr);
        });

        const generatedModules = Array.from(grouped.entries()).map(([modTitle, modPages], idx) => ({
          id: `mod-html-${idx}-${modTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          title: modTitle,
          description: `由 HTML Studio 一键同步的课程章节（共 ${modPages.length} 节）`,
          titleStyle: defaultStyle,
          subSections: [
            {
              id: `sub-html-${idx}`,
              title: modTitle,
              titleStyle: defaultStyle,
              lessons: modPages.map((p) => ({
                id: `lesson-html-${p.id}`,
                title: p.title,
                kind: (p.videoUrl || p.localMediaId ? 'video' : 'lesson') as 'video' | 'lesson',
                htmlPageId: p.id,
                videoUrl: p.videoUrl,
                localMediaId: p.localMediaId,
                localMediaName: p.localMediaName,
                summary: p.extractedText.slice(0, 220) || p.title,
                published: true,
              })),
            },
          ],
        }));

        const nonHtmlModules = syllabus.modules.filter(
          (m) => !m.id.startsWith('mod-html-')
        );

        return {
          ...prev,
          deployedHtmlPages: pages.map((p) => ({
            ...p,
            courseTrack: track,
            updatedAt: now,
          })),
          courses: {
            ...prev.courses,
            [track]: {
              ...syllabus,
              modules: [...generatedModules, ...nonHtmlModules],
              updatedAt: now,
            },
          },
        };
      });
    },
    [commit]
  );

  const syncThemeFromHtml = useCallback(
    (tokens: HtmlDesignTokens | null) => {
      commit((prev) => ({
        ...prev,
        syncedTheme: tokens,
      }));
    },
    [commit]
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const theme = state.syncedTheme;
    const linkId = 'bl-synced-google-fonts';
    const existingLink = document.getElementById(linkId);

    if (!theme) {
      root.style.removeProperty('--font-sans-stack');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--canvas');
      root.style.removeProperty('--ink-primary');
      if (existingLink) existingLink.remove();
      return;
    }

    if (theme.googleFontsHref) {
      if (existingLink instanceof HTMLLinkElement) {
        if (existingLink.href !== theme.googleFontsHref) {
          existingLink.href = theme.googleFontsHref;
        }
      } else {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = theme.googleFontsHref;
        document.head.appendChild(link);
      }
    } else if (existingLink) {
      existingLink.remove();
    }

    if (theme.fontFamily) {
      root.style.setProperty('--font-sans-stack', theme.fontFamily);
    } else {
      root.style.removeProperty('--font-sans-stack');
    }

    if (theme.accentColor && isAccessibleAccentHex(theme.accentColor)) {
      root.style.setProperty('--accent', theme.accentColor);
    } else {
      root.style.removeProperty('--accent');
    }
  }, [state.syncedTheme]);

  const updateCustomCategories = useCallback(
    (categories: QuestionCategoryDef[]) => {
      commit((prev) => ({
        ...prev,
        customCategories: categories,
      }));
    },
    [commit]
  );

  const updateCourseNav = useCallback(
    (order: string[], hidden: string[]) => {
      commit((prev) => ({
        ...prev,
        courseNavOrder: order,
        hiddenCourseTracks: hidden,
      }));
    },
    [commit]
  );

  const updateGoogleCalendarUrl = useCallback(
    (url: string) => {
      commit((prev) => ({
        ...prev,
        googleCalendarIcsUrl: url.trim(),
      }));
    },
    [commit]
  );

  const exportBackup = useCallback(() => exportStateAsJson(state), [state]);

  const importBackup = useCallback((jsonText: string) => {
    const parsed = parseImportedState(jsonText);
    if (!parsed) return false;
    setState(parsed);
    saveAppState(parsed);
    return true;
  }, []);

  const resetDemoData = useCallback(() => {
    const fresh = createDefaultState(new Date().toISOString().slice(0, 10));
    setState(fresh);
    saveAppState(fresh);
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        mounted,
        todayISO,
        syncStatus,
        lastSyncedAt,
        lastSyncError,
        retryCloudSync,
        settingsOpen,
        setSettingsOpen,
        updateAISettings,
        updateLarkSettings,
        updateUserGoals,
        updateResumeSummary,
        toggleActiveTrack,
        addUpcomingLoop,
        removeUpcomingLoop,
        addCustomQuestion,
        updateCustomQuestion,
        deleteCustomQuestion,
        updateQuestionNotes,
        updateCourseSyllabus,
        toggleCourseLessonComplete,
        upsertLibraryItem,
        deleteLibraryItem,
        toggleLibraryFavorite,
        bulkImportItems,
        saveCustomLoopPlan,
        savePracticeSession,
        setQuestionProgress,
        upsertStory,
        deleteStory,
        upsertVocabItem,
        deleteVocabItem,
        upsertKnowledgeSnippet,
        deleteKnowledgeSnippet,
        upsertKnowledgeArticle,
        deleteKnowledgeArticle,
        addTodo,
        updateTodo,
        toggleTodo,
        deleteTodo,
        updateAffirmationVideos,
        upsertApplication,
        deleteApplication,
        upsertSavedJD,
        deleteSavedJD,
        upsertResumeProfile,
        deleteResumeProfile,
        deployHtmlPage,
        updateHtmlPage,
        deleteHtmlPage,
        importHtmlPageToCourse,
        syncAllHtmlPagesToCourse,
        syncThemeFromHtml,
        updateCustomCategories,
        updateCourseNav,
        updateGoogleCalendarUrl,
        exportBackup,
        importBackup,
        resetDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
