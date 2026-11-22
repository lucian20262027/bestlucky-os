import { SEED_COURSES } from './seed-courses';
import { SEED_KNOWLEDGE_SNIPPETS, SEED_VOCAB_ITEMS } from './seed-knowledge';
import { SEED_LIBRARY_ITEMS, SEED_QUESTION_NOTES } from './seed-library';
import { DEFAULT_RESUME_SUMMARY, SEED_STORIES } from './seed-stories';
import {
  AffirmationVideo,
  AppState,
  JobApplication,
  ResumeProfile,
  RoleTrack,
  SavedJDItem,
  TodoItem,
} from './types';

const SEED_SAVED_JDS: SavedJDItem[] = [
  {
    id: 'jd-openai-fde',
    company: 'OpenAI',
    roleTitle: 'Forward Deployed Engineer (Applied AI)',
    roleTrack: 'fde',
    jdText:
      'Embed directly with Fortune 500 engineering & ops teams to ship end-to-end agentic pipelines, RAG retrieval over legacy ERPs, evaluation harnesses, and confidence-gated human-in-the-loop workflows within 30-60 days.',
    extractedSkills: ['Agentic Pipelines', 'RAG & Evals', 'Python / TypeScript', 'HITL Guardrails', 'Legacy ERP Integration'],
    coreCapabilities: ['Ambiguity Decomposition', 'Week-2 Vertical Slice Delivery', 'Executive Stakeholder Alignment'],
    summary: '要求 30-60 天内把模糊企业需求切片落地为带 Eval 护栏的生产级 Agent 系统。',
    updatedAt: '2026-11-22T00:00:00.000Z',
  },
  {
    id: 'jd-anthropic-fdpm',
    company: 'Anthropic',
    roleTitle: 'Forward Deployed PM / Applied AI',
    roleTrack: 'fdpm',
    jdText:
      'Partner with enterprise design partners to scope high-ROI AI workflows, build deterministic safety/schema validators around probabilistic Claude outputs, and distill field learnings into core platform primitives.',
    extractedSkills: ['Design Partner Discovery', 'Deterministic Guardrails', 'Prompt & Model Routing', 'ROI Modeling'],
    coreCapabilities: ['80/20 Platform Abstraction', 'AI Safety & Compliance', 'Cross-Functional Execution'],
    summary: '聚焦 Design Partner 商业闭环、安全护栏与从客户定制沉淀为标准平台能力。',
    updatedAt: '2026-11-22T00:00:00.000Z',
  },
];

const SEED_RESUME_PROFILES: ResumeProfile[] = [
  {
    id: 'res-fde',
    label: 'FDE / Applied AI 简历',
    track: 'FDE',
    fileName: 'Lucian_Resume_FDE_v4.pdf',
    content: DEFAULT_RESUME_SUMMARY,
    updatedAt: '2026-11-22T00:00:00.000Z',
  },
  {
    id: 'res-aipm',
    label: 'AI PM / FDPM 简历',
    track: 'AI PM / FDPM',
    fileName: 'Lucian_Resume_AIPM_v3.pdf',
    content:
      'AI Product Manager & Forward Deployed PM experienced in 0->1 enterprise AI workflows, model-agnostic routing gateways, deterministic schema validation, evaluation harnesses, and pilot-to-ARR ROI commercialization.',
    updatedAt: '2026-11-22T00:00:00.000Z',
  },
  {
    id: 'res-ops-safety',
    label: 'Ops / AI Safety 简历',
    track: 'Ops / Safety',
    fileName: 'Lucian_Resume_Ops_Safety_v2.pdf',
    content:
      'Operations & Trust/Safety Strategist experienced in governance policy engines, automated failure attribution across model/tool/permission layers, WBR/QBR operating cadences, and high-stakes risk mitigation.',
    updatedAt: '2026-11-22T00:00:00.000Z',
  },
];

const SEED_APPLICATIONS: JobApplication[] = [
  {
    id: 'app-openai',
    company: 'OpenAI',
    roleTitle: 'Forward Deployed Engineer',
    roleTrack: 'fde',
    stage: 'technical',
    jdUrl: 'https://openai.com/careers',
    resumeVersion: 'Lucian_Resume_FDE_v4.pdf',
    nextInterviewDate: '2026-11-28',
    notes: 'Focus on Week-2 vertical slice, deterministic schema validation & evals.',
    debriefs: [],
    updatedAt: '2026-11-22T00:00:00.000Z',
  },
  {
    id: 'app-anthropic',
    company: 'Anthropic',
    roleTitle: 'Applied AI / FDPM',
    roleTrack: 'fdpm',
    stage: 'screen',
    jdUrl: 'https://www.anthropic.com/careers',
    resumeVersion: 'Lucian_Resume_AI_PM_v3.pdf',
    nextInterviewDate: '2026-12-03',
    notes: 'Highlight probabilistic generation + deterministic compiler pattern.',
    debriefs: [],
    updatedAt: '2026-11-22T00:00:00.000Z',
  },
  {
    id: 'app-nvidia',
    company: 'NVIDIA',
    roleTitle: 'TPM — AI Infra Resilience',
    roleTrack: 'pgm',
    stage: 'applied',
    jdUrl: 'https://www.nvidia.com/en-us/about-nvidia/careers/',
    resumeVersion: 'Lucian_Resume_TPM_v2.pdf',
    notes: 'Prep Reverse Q&A on automated failure attribution across model/tool/permission layers.',
    debriefs: [],
    updatedAt: '2026-11-22T00:00:00.000Z',
  },
];

const SEED_AFFIRMATION_VIDEOS: AffirmationVideo[] = [
  {
    id: 'aff-1',
    title: 'Daily Affirmation #1',
    subtitle: 'Confidence & Executive Presence',
    videoUrl: 'https://www.youtube.com/shorts/-RqKuDg2Pgc',
  },
  {
    id: 'aff-2',
    title: 'Daily Affirmation #2',
    subtitle: 'Focus, Resilience & Momentum',
    videoUrl: 'https://www.youtube.com/shorts/nDUcimTdoaM',
  },
  {
    id: 'aff-3',
    title: 'Daily Affirmation #3',
    subtitle: 'Calm Mastery Under Pressure',
    videoUrl: 'https://www.youtube.com/shorts/H7Q2JEsuTig',
  },
];

const SEED_TODOS: TodoItem[] = [
  {
    id: 'todo-1',
    title: 'Review 3 AI Architecture Soundbites in Knowledge Hub',
    completed: false,
    role: 'ai-pm',
    dueLabel: 'Today',
    createdAt: '2026-11-22T00:00:00.000Z',
  },
  {
    id: 'todo-2',
    title: 'Drill FDE 30-60-90 Legacy ERP System Decomposition',
    completed: false,
    role: 'fde',
    dueLabel: 'Today',
    createdAt: '2026-11-22T00:00:00.000Z',
  },
  {
    id: 'todo-3',
    title: 'Practice 6 hard-to-pronounce vocab terms with Speak button',
    completed: false,
    role: 'fdpm',
    dueLabel: 'This Week',
    createdAt: '2026-11-22T00:00:00.000Z',
  },
];

export const STORAGE_KEY = 'loopos_v1_state';

const ALL_TRACKS: RoleTrack[] = [
  'fde',
  'fdpm',
  'ai-pm',
  'pm',
  'operations',
  'pgm',
  'consulting',
];

function futureDateISO(daysFromNow: number, baseTodayISO?: string): string {
  if (!baseTodayISO) {
    const fixedDefaults: Record<number, string> = {
      6: '2026-11-27',
      11: '2026-12-02',
      16: '2026-12-07',
    };
    return fixedDefaults[daysFromNow] ?? '2026-11-28';
  }
  const ms = Date.parse(`${baseTodayISO}T00:00:00Z`) + daysFromNow * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

export function createDefaultState(baseTodayISO?: string): AppState {
  return {
    profile: {
      name: 'Lucian',
      resumeSummary: DEFAULT_RESUME_SUMMARY,
      activeTracks: ALL_TRACKS,
    },
    aiSettings: {
      geminiApiKey: '',
      model: 'gemini-4-hydrogen',
      language: 'bilingual',
      ttsEnabled: false,
    },
    upcomingLoops: [
      {
        id: 'loop-1',
        company: 'Frontier AI Lab',
        role: 'fde',
        round: 'System Decomposition + Live Triage',
        dateISO: futureDateISO(6, baseTodayISO),
        notes: 'Focus on ERP integration, 30-60-90 slice, and eval guardrails.',
      },
      {
        id: 'loop-2',
        company: 'Enterprise AI Startup',
        role: 'fdpm',
        round: 'Design Partner Discovery & ROI Case',
        dateISO: futureDateISO(11, baseTodayISO),
        notes: 'Prep 80/20 platform core narrative + CFO payback math.',
      },
      {
        id: 'loop-3',
        company: 'Hyper-Growth Tech',
        role: 'operations',
        round: 'BizOps Bottleneck & WBR Case',
        dateISO: futureDateISO(16, baseTodayISO),
        notes: 'Drill queue wait vs touch time & incentive guardrails.',
      },
    ],
    customQuestions: [],
    questionProgress: {},
    questionNotes: SEED_QUESTION_NOTES,
    libraryItems: SEED_LIBRARY_ITEMS,
    larkSettings: {
      domain: 'larksuite',
      appId: '',
      appSecret: '',
      userAccessToken: '',
    },
    courses: SEED_COURSES,
    userGoals: {
      summary:
        "I'm interviewing for FDE, FDPM, AI PM, Operations, Program Manager, Consulting & PM roles at",
      targetCompanies: ['Anthropic', 'OpenAI', 'Palantir', 'Stripe', 'McKinsey'],
    },
    practiceDatesISO: [],
    sessions: [],
    stories: SEED_STORIES,
    vocabItems: SEED_VOCAB_ITEMS,
    knowledgeSnippets: SEED_KNOWLEDGE_SNIPPETS,
    todos: SEED_TODOS,
    affirmationVideos: SEED_AFFIRMATION_VIDEOS,
    applications: SEED_APPLICATIONS,
    savedJDs: SEED_SAVED_JDS,
    resumeProfiles: SEED_RESUME_PROFILES,
    googleCalendarIcsUrl: '',
    lastCustomLoop: null,
  };
}

export function loadAppState(): AppState {
  if (typeof window === 'undefined') {
    return createDefaultState();
  }
  const todayISO = new Date().toISOString().slice(0, 10);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState(todayISO);
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const defaults = createDefaultState(todayISO);
    return {
      profile: {
        ...defaults.profile,
        ...(parsed.profile ?? {}),
        name:
          !parsed.profile?.name || parsed.profile.name === 'Yi'
            ? defaults.profile.name
            : parsed.profile.name,
        activeTracks:
          Array.isArray(parsed.profile?.activeTracks) && parsed.profile.activeTracks.length > 0
            ? parsed.profile.activeTracks
            : defaults.profile.activeTracks,
      },
      aiSettings: {
        ...defaults.aiSettings,
        ...(parsed.aiSettings ?? {}),
      },
      upcomingLoops: Array.isArray(parsed.upcomingLoops)
        ? parsed.upcomingLoops
        : defaults.upcomingLoops,
      customQuestions: Array.isArray(parsed.customQuestions) ? parsed.customQuestions : [],
      questionProgress:
        parsed.questionProgress && typeof parsed.questionProgress === 'object'
          ? parsed.questionProgress
          : {},
      questionNotes: {
        ...defaults.questionNotes,
        ...(parsed.questionNotes && typeof parsed.questionNotes === 'object'
          ? parsed.questionNotes
          : {}),
      },
      libraryItems:
        Array.isArray(parsed.libraryItems) && parsed.libraryItems.length > 0
          ? parsed.libraryItems
          : defaults.libraryItems,
      larkSettings: {
        ...defaults.larkSettings,
        ...(parsed.larkSettings ?? {}),
      },
      courses: {
        ...defaults.courses,
        ...(parsed.courses && typeof parsed.courses === 'object' ? parsed.courses : {}),
      },
      userGoals: {
        ...defaults.userGoals,
        ...(parsed.userGoals ?? {}),
      },
      practiceDatesISO: Array.isArray(parsed.practiceDatesISO)
        ? parsed.practiceDatesISO
        : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      stories:
        Array.isArray(parsed.stories) && parsed.stories.length > 0
          ? parsed.stories
          : defaults.stories,
      vocabItems:
        Array.isArray(parsed.vocabItems) && parsed.vocabItems.length > 0
          ? parsed.vocabItems
          : defaults.vocabItems,
      knowledgeSnippets:
        Array.isArray(parsed.knowledgeSnippets) && parsed.knowledgeSnippets.length > 0
          ? parsed.knowledgeSnippets
          : defaults.knowledgeSnippets,
      todos: Array.isArray(parsed.todos) ? parsed.todos : defaults.todos,
      affirmationVideos:
        Array.isArray(parsed.affirmationVideos) && parsed.affirmationVideos.length > 0
          ? parsed.affirmationVideos
          : defaults.affirmationVideos,
      applications:
        Array.isArray(parsed.applications) && parsed.applications.length > 0
          ? parsed.applications
          : defaults.applications,
      savedJDs:
        Array.isArray(parsed.savedJDs) && parsed.savedJDs.length > 0
          ? parsed.savedJDs
          : defaults.savedJDs,
      resumeProfiles:
        Array.isArray(parsed.resumeProfiles) && parsed.resumeProfiles.length > 0
          ? parsed.resumeProfiles
          : defaults.resumeProfiles,
      googleCalendarIcsUrl:
        typeof parsed.googleCalendarIcsUrl === 'string'
          ? parsed.googleCalendarIcsUrl
          : '',
      lastCustomLoop: parsed.lastCustomLoop ?? null,
    };
  } catch {
    return createDefaultState();
  }
}

export function saveAppState(state: AppState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function exportStateAsJson(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function parseImportedState(jsonText: string): AppState | null {
  try {
    const parsed = JSON.parse(jsonText) as Partial<AppState>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.profile || !Array.isArray(parsed.stories)) return null;
    const defaults = createDefaultState();
    return {
      ...defaults,
      ...parsed,
      profile: {
        ...defaults.profile,
        ...parsed.profile,
        name:
          !parsed.profile.name || parsed.profile.name === 'Yi'
            ? defaults.profile.name
            : parsed.profile.name,
      },
      aiSettings: { ...defaults.aiSettings, ...(parsed.aiSettings ?? {}) },
      upcomingLoops: Array.isArray(parsed.upcomingLoops)
        ? parsed.upcomingLoops
        : defaults.upcomingLoops,
      customQuestions: Array.isArray(parsed.customQuestions) ? parsed.customQuestions : [],
      questionProgress: parsed.questionProgress ?? {},
      questionNotes: { ...defaults.questionNotes, ...(parsed.questionNotes ?? {}) },
      libraryItems: Array.isArray(parsed.libraryItems)
        ? parsed.libraryItems
        : defaults.libraryItems,
      larkSettings: { ...defaults.larkSettings, ...(parsed.larkSettings ?? {}) },
      courses: { ...defaults.courses, ...(parsed.courses ?? {}) },
      userGoals: { ...defaults.userGoals, ...(parsed.userGoals ?? {}) },
      practiceDatesISO: Array.isArray(parsed.practiceDatesISO)
        ? parsed.practiceDatesISO
        : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      stories: parsed.stories,
      vocabItems: Array.isArray(parsed.vocabItems) ? parsed.vocabItems : defaults.vocabItems,
      knowledgeSnippets: Array.isArray(parsed.knowledgeSnippets)
        ? parsed.knowledgeSnippets
        : defaults.knowledgeSnippets,
      todos: Array.isArray(parsed.todos) ? parsed.todos : defaults.todos,
      affirmationVideos:
        Array.isArray(parsed.affirmationVideos) && parsed.affirmationVideos.length > 0
          ? parsed.affirmationVideos
          : defaults.affirmationVideos,
      applications:
        Array.isArray(parsed.applications) && parsed.applications.length > 0
          ? parsed.applications
          : defaults.applications,
      savedJDs:
        Array.isArray(parsed.savedJDs) && parsed.savedJDs.length > 0
          ? parsed.savedJDs
          : defaults.savedJDs,
      resumeProfiles:
        Array.isArray(parsed.resumeProfiles) && parsed.resumeProfiles.length > 0
          ? parsed.resumeProfiles
          : defaults.resumeProfiles,
      googleCalendarIcsUrl:
        typeof parsed.googleCalendarIcsUrl === 'string'
          ? parsed.googleCalendarIcsUrl
          : '',
      lastCustomLoop: parsed.lastCustomLoop ?? null,
    };
  } catch {
    return null;
  }
}
