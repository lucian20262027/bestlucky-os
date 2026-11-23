'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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
  CustomLoopPlan,
  InterviewQuestion,
  JobApplication,
  KnowledgeArticle,
  KnowledgeSnippet,
  LarkSettings,
  LibraryItem,
  PracticeSession,
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
  updateCourseSyllabus: (role: RoleTrack, syllabus: CourseSyllabus) => void;
  toggleCourseLessonComplete: (
    role: RoleTrack,
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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => createDefaultState());
  const [mounted, setMounted] = useState(false);
  const [todayISO, setTodayISO] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('local-only');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const cloudConfiguredRef = useRef(false);
  const syncTimerRef = useRef<number | null>(null);

  const pushStateToCloud = useCallback(async (nextState: AppState) => {
    if (!cloudConfiguredRef.current) return;
    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/sync/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: 'lucian-main', state: nextState }),
      });
      const json = (await res.json()) as {
        configured?: boolean;
        saved?: boolean;
        updatedAt?: string;
      };
      if (res.ok && json.saved) {
        setSyncStatus('synced');
        setLastSyncedAt(json.updatedAt ?? new Date().toISOString());
      } else {
        setSyncStatus('error');
      }
    } catch {
      setSyncStatus('error');
    }
  }, []);

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
            setState(parsed);
            saveAppState(parsed);
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
    (role: RoleTrack, syllabus: CourseSyllabus) => {
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
    (role: RoleTrack, moduleId: string, subSectionId: string, lessonId: string) => {
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
