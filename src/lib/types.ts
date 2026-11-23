export type RoleTrack =
  | 'fde'
  | 'fdpm'
  | 'ai-pm'
  | 'pm'
  | 'operations'
  | 'pgm'
  | 'consulting';

export type RoundType =
  | 'phone-screen'
  | 'hiring-manager'
  | 'round-1'
  | 'technical'
  | 'decomposition'
  | 'product-ai'
  | 'case-strategy'
  | 'execution-metrics'
  | 'xfn'
  | 'behavioral'
  | 'loops'
  | 'estimation';

export type Difficulty = 'core' | 'senior' | 'staff';

export type QuestionStatus = 'unpracticed' | 'needs_drill' | 'mastered';

export type LanguageMode = 'en' | 'bilingual' | 'zh';

export type InterviewerPersona = 'coach' | 'bar-raiser' | 'fde-lead' | 'mbb-partner';

export type GeminiModelChoice = 'gemini-4-hydrogen' | 'gemini-4-argon';

export type NodeKind = 'client' | 'data' | 'agent' | 'eval' | 'ops' | 'kpi';

export interface RoleConfig {
  id: RoleTrack;
  label: string;
  shortLabel: string;
  tagline: string;
  taglineZh: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  accentHex: string;
  coreCompetencies: string[];
  defaultScratchpadSections: string[];
  sampleCompanies: string[];
}

export interface RubricDimension {
  key:
    | 'framing_mece'
    | 'tradeoff_depth'
    | 'execution_metrics'
    | 'customer_stakeholder'
    | 'communication_conciseness';
  label: string;
  labelZh: string;
  score: number; // 1.0 - 5.0
  evidence: string;
  advice: string;
}

export interface DiagramNode {
  id: string;
  label: string;
  kind: NodeKind;
  x: number;
  y: number;
}

export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface InterviewQuestion {
  id: string;
  role: RoleTrack;
  secondaryRoles: RoleTrack[];
  round: RoundType;
  secondaryRounds?: RoundType[];
  difficulty: Difficulty;
  timeLimitMin: number;
  companyStyle: string;
  title: string;
  prompt: string;
  promptZhHint: string;
  frameworkSteps: string[];
  strongHireSignals: string[];
  redFlags: string[];
  followUpProbes: string[];
  sampleDiagramNodes?: Omit<DiagramNode, 'id'>[];
  modelAnswer?: string;
  videoUrl?: string;
  localMediaId?: string;
  sourceUrl?: string;
  tags?: string[];
  isCustom?: boolean;
  createdAt?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'interviewer' | 'candidate' | 'system';
  text: string;
  timestamp: string;
}

export interface RewriteSuggestion {
  originalExcerpt: string;
  issue: string;
  strongHireRewrite: string;
}

export interface SessionEvaluation {
  overallScore: number; // 1.0 - 5.0
  verdict: 'Strong Hire' | 'Hire' | 'Lean Hire' | 'No Hire';
  summary: string;
  dimensions: RubricDimension[];
  strengths: string[];
  missingSignals: string[];
  rewrites: RewriteSuggestion[];
  recommendedDrillFocus: string;
  engineMode?: 'live_gemini' | 'local_fallback';
}

export interface PracticeSession {
  id: string;
  questionId: string;
  questionTitle: string;
  role: RoleTrack;
  round: RoundType;
  persona: InterviewerPersona;
  startedAt: string;
  durationSec: number;
  messages: ChatMessage[];
  scratchpad: string;
  diagramNodes: DiagramNode[];
  diagramEdges: DiagramEdge[];
  evaluation: SessionEvaluation | null;
}

export interface StarStory {
  id: string;
  title: string;
  competencies: string[];
  targetRoles: RoleTrack[];
  situation: string;
  task: string;
  action: string;
  result: string;
  learning: string;
  roleFramings: Partial<Record<RoleTrack, string>>;
  metrics: string[];
  isTemplate?: boolean;
  updatedAt: string;
}

export interface UpcomingLoop {
  id: string;
  company: string;
  role: RoleTrack;
  round: string;
  dateISO: string;
  notes?: string;
}

export interface QuestionProgress {
  status: QuestionStatus;
  attempts: number;
  bestScore?: number;
  lastPracticedAt?: string;
  notes?: string;
}

export interface AISettings {
  geminiApiKey: string;
  model: GeminiModelChoice;
  language: LanguageMode;
  ttsEnabled: boolean;
}

export interface UserProfile {
  name: string;
  resumeSummary: string;
  activeTracks: RoleTrack[];
}

export interface CustomLoopPlan {
  id: string;
  company: string;
  role: RoleTrack;
  round: RoundType;
  matchScore: number;
  matchedStrengths: string[];
  capabilityGaps: string[];
  prepPlan: { phase: string; focus: string; deliverables: string[] }[];
  questions: InterviewQuestion[];
  engineMode: 'live_gemini' | 'local_fallback';
  createdAt: string;
}

export type FontFamilyChoice = 'sans' | 'serif' | 'mono';
export type FontSizeChoice = 'sm' | 'base' | 'lg' | 'xl' | '2xl';

export interface TextStyleConfig {
  fontFamily: FontFamilyChoice;
  fontSize: FontSizeChoice;
}

export interface CustomAnswerBlock {
  id: string;
  kind: 'qa' | 'text' | 'video';
  heading: string;
  body: string;
  videoUrl?: string;
  localMediaId?: string;
  localMediaName?: string;
  headingStyle: TextStyleConfig;
  bodyStyle: TextStyleConfig;
  published: boolean;
  updatedAt: string;
}

export interface QuestionUserNotes {
  myAnswer: string;
  modelAnswer: string;
  pitch60s: string;
  personalNotes: string;
  videoUrl: string;
  localMediaId?: string;
  localMediaName?: string;
  sourceUrl?: string;
  customTitle?: string;
  customPrompt?: string;
  titleStyle?: TextStyleConfig;
  answerStyle?: TextStyleConfig;
  customBlocks?: CustomAnswerBlock[];
  published?: boolean;
  updatedAt: string;
}

export interface CourseLessonItem {
  id: string;
  title: string;
  kind: 'lesson' | 'video' | 'question';
  questionId?: string;
  videoUrl?: string;
  localMediaId?: string;
  localMediaName?: string;
  summary?: string;
  completed?: boolean;
  published: boolean;
}

export interface CourseSubSection {
  id: string;
  title: string;
  titleStyle: TextStyleConfig;
  lessons: CourseLessonItem[];
}

export interface CourseModuleSection {
  id: string;
  title: string;
  description: string;
  titleStyle: TextStyleConfig;
  subSections: CourseSubSection[];
}

export interface CourseSyllabus {
  role: RoleTrack;
  editionBadge: string;
  heroTitle: string;
  heroTitleStyle: TextStyleConfig;
  heroSubtitle: string;
  highlights: string[];
  introVideoUrl?: string;
  introLocalMediaId?: string;
  introLocalMediaName?: string;
  modules: CourseModuleSection[];
  published: boolean;
  updatedAt: string;
}

export interface UserGoals {
  summary: string;
  targetCompanies: string[];
}

export interface VideoTimestampNote {
  id: string;
  timeSec: number;
  label: string;
}

export type LibraryItemType = 'video' | 'recording' | 'guide' | 'lark-doc';

export interface LibraryItem {
  id: string;
  type: LibraryItemType;
  title: string;
  role: RoleTrack;
  secondaryRoles?: RoleTrack[];
  tags: string[];
  summary: string;
  contentMarkdown: string;
  videoUrl?: string;
  localMediaId?: string;
  localMediaName?: string;
  sourceUrl?: string;
  durationLabel?: string;
  timestamps: VideoTimestampNote[];
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LarkSettings {
  domain: 'larksuite' | 'feishu';
  appId: string;
  appSecret: string;
  userAccessToken: string;
}

export interface VocabItem {
  id: string;
  word: string;
  phonetic: string;
  meaning: string;
  example: string;
  roles: RoleTrack[];
  notes?: string;
  updatedAt: string;
}

export interface KnowledgeSnippet {
  id: string;
  title: string;
  soundbite: string;
  roles: RoleTrack[];
  triggerQuestion: string;
  deliveryTemplate: string;
  tags: string[];
  updatedAt: string;
}

export type TodoPriority = 'urgent' | 'p0' | 'p1' | 'p2';

export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  priority?: TodoPriority;
  role?: RoleTrack;
  dueLabel?: string;
  dueDateISO?: string;
  createdAt: string;
}

export interface AffirmationVideo {
  id: string;
  title: string;
  subtitle?: string;
  videoUrl: string;
  localMediaId?: string;
  localMediaName?: string;
}

export type PipelineStage =
  | 'wishlist'
  | 'applied'
  | 'screen'
  | 'technical'
  | 'onsite'
  | 'offer';

export interface PostInterviewDebrief {
  roundName: string;
  dateISO: string;
  wentWell: string;
  stumbledOn: string;
  followUpProbes: string;
  nextAction: string;
}

export interface JobApplication {
  id: string;
  company: string;
  roleTitle: string;
  roleTrack: RoleTrack;
  stage: PipelineStage;
  jdUrl?: string;
  resumeVersion?: string;
  nextInterviewDate?: string;
  recruiterName?: string;
  notes?: string;
  debriefs: PostInterviewDebrief[];
  updatedAt: string;
}

export interface SavedJDItem {
  id: string;
  company: string;
  roleTitle: string;
  roleTrack: RoleTrack;
  jdText: string;
  screenshotName?: string;
  screenshotDataUrl?: string;
  extractedSkills: string[];
  coreCapabilities: string[];
  summary: string;
  updatedAt: string;
}

export interface ResumeProfile {
  id: string;
  label: string;
  track: string; // e.g. 'FDPM' | 'AI PM' | 'Ops' | 'Safety' | 'FDE'
  fileName?: string;
  content: string;
  updatedAt: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  fileName?: string;
  sourceUrl?: string;
  rawText: string;
  summary: string;
  takeaways: string[];
  roleAngles: {
    fdpm: string;
    aiPm: string;
    fde: string;
  };
  tags: string[];
  syncedSnippetId?: string;
  createdAt: string;
}

export interface AppState {
  profile: UserProfile;
  aiSettings: AISettings;
  upcomingLoops: UpcomingLoop[];
  customQuestions: InterviewQuestion[];
  questionProgress: Record<string, QuestionProgress>;
  questionNotes: Record<string, QuestionUserNotes>;
  libraryItems: LibraryItem[];
  larkSettings: LarkSettings;
  courses: Record<RoleTrack, CourseSyllabus>;
  userGoals: UserGoals;
  practiceDatesISO: string[];
  sessions: PracticeSession[];
  stories: StarStory[];
  vocabItems: VocabItem[];
  knowledgeSnippets: KnowledgeSnippet[];
  knowledgeArticles: KnowledgeArticle[];
  todos: TodoItem[];
  affirmationVideos: AffirmationVideo[];
  applications: JobApplication[];
  savedJDs: SavedJDItem[];
  resumeProfiles: ResumeProfile[];
  googleCalendarIcsUrl?: string;
  lastCustomLoop: CustomLoopPlan | null;
}
