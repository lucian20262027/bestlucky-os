import { ROLES_BY_ID } from './roles';
import { SEED_QUESTIONS } from './seed-questions';
import {
  AppState,
  DiagramEdge,
  DiagramNode,
  InterviewQuestion,
  QuestionCategory,
  QuestionStatus,
  RoleTrack,
} from './types';

export const QUESTION_CATEGORIES: Array<{
  id: QuestionCategory;
  label: string;
  shortLabel: string;
  badgeClass: string;
}> = [
  {
    id: 'intro-culture',
    label: 'Intro & Culture Fit',
    shortLabel: 'Intro & Culture',
    badgeClass: 'bg-[#F3ECFF] text-[#6E32F5]',
  },
  {
    id: 'success-stories',
    label: 'Success Stories',
    shortLabel: 'Success Stories',
    badgeClass: 'bg-emerald-50 text-emerald-700',
  },
  {
    id: 'fail-stories',
    label: 'Failure & Conflict',
    shortLabel: 'Fail & Conflict',
    badgeClass: 'bg-rose-50 text-rose-700',
  },
  {
    id: 'xfn',
    label: 'XFN & Stakeholder',
    shortLabel: 'XFN',
    badgeClass: 'bg-sky-50 text-sky-700',
  },
  {
    id: 'metrics',
    label: 'Metrics & Execution',
    shortLabel: 'Metrics',
    badgeClass: 'bg-amber-50 text-amber-800',
  },
  {
    id: 'product-ai',
    label: 'Product & AI Design',
    shortLabel: 'Product & AI',
    badgeClass: 'bg-violet-50 text-violet-700',
  },
  {
    id: 'system-tech',
    label: 'System & Tech / Coding',
    shortLabel: 'System & Tech',
    badgeClass: 'bg-indigo-50 text-indigo-700',
  },
  {
    id: 'strategy-case',
    label: 'Strategy & Case Study',
    shortLabel: 'Strategy & Case',
    badgeClass: 'bg-teal-50 text-teal-700',
  },
];

export function getCategoryMeta(
  cat: QuestionCategory,
  customList?: Array<{ id: string; label: string; shortLabel: string; badgeClass: string }>
) {
  const list = customList && customList.length > 0 ? customList : QUESTION_CATEGORIES;
  return (
    list.find((c) => c.id === cat) ??
    QUESTION_CATEGORIES.find((c) => c.id === cat) ?? {
      id: cat,
      label: cat,
      shortLabel: cat,
      badgeClass: 'bg-[#F3ECFF] text-[#6E32F5]',
    }
  );
}

export function inferQuestionCategory(q: InterviewQuestion): QuestionCategory {
  if (q.category) return q.category;
  const text = `${q.title} ${q.prompt} ${(q.tags ?? []).join(' ')}`.toLowerCase();

  if (
    /why company|why this role|why us|tell me about yourself|self intro|culture fit|values|career arc/.test(
      text
    )
  ) {
    return 'intro-culture';
  }
  if (
    /fail|failure|mistake|conflict|disagree|pushback|missed|regret|setback|difficult stakeholder|hard feedback/.test(
      text
    )
  ) {
    return 'fail-stories';
  }
  if (
    q.round === 'xfn' ||
    /cross-functional|\bxfn\b|alignment|sales|executive|vp|ceo|stakeholder/.test(text)
  ) {
    return 'xfn';
  }
  if (
    q.round === 'execution-metrics' ||
    q.round === 'estimation' ||
    /\bmetric|\bkpi|\bwbr|\bqbr|a\/b|conversion|ebitda|margin|retention|north star|market sizing|diagnos/.test(
      text
    )
  ) {
    return 'metrics';
  }
  if (
    q.round === 'product-ai' ||
    /product design|ai design|guardrail|eval|rag|prompt|agent|copilot|ux|hallucination|hitl/.test(
      text
    )
  ) {
    return 'product-ai';
  }
  if (
    q.round === 'technical' ||
    q.round === 'decomposition' ||
    /system design|architecture|erp|api|latency|coding|debug|schema|pipeline|warehouse|30-60-90/.test(
      text
    )
  ) {
    return 'system-tech';
  }
  if (
    q.round === 'case-strategy' ||
    /strategy|case study|build vs\.? buy|pricing|gtm|go-to-market|expansion|market entry/.test(
      text
    )
  ) {
    return 'strategy-case';
  }
  if (
    q.round === 'behavioral' ||
    q.round === 'hiring-manager' ||
    q.round === 'phone-screen' ||
    /success|0→1|0-to-1|proudest|shipped|scaled|turned around|rescued/.test(text)
  ) {
    return 'success-stories';
  }
  return 'strategy-case';
}

export function getAllQuestions(state: AppState): InterviewQuestion[] {
  return [...state.customQuestions, ...SEED_QUESTIONS];
}

export function getQuestionById(state: AppState, id: string): InterviewQuestion | undefined {
  return getAllQuestions(state).find((q) => q.id === id);
}

export function getQuestionStatus(state: AppState, id: string): QuestionStatus {
  return state.questionProgress[id]?.status ?? 'unpracticed';
}

export function serializeDiagramSummary(nodes: DiagramNode[], edges: DiagramEdge[]): string {
  if (nodes.length === 0) return 'No diagram blocks yet.';
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const nodeLine = `Nodes: ${nodes.map((n) => `[${n.kind.toUpperCase()}] ${n.label}`).join('; ')}`;
  if (edges.length === 0) return nodeLine;
  const edgeLine = `Flows: ${edges
    .map((e) => {
      const from = nodeMap.get(e.from)?.label ?? '?';
      const to = nodeMap.get(e.to)?.label ?? '?';
      return `${from} -> ${to}${e.label ? ` (${e.label})` : ''}`;
    })
    .join('; ')}`;
  return `${nodeLine}\n${edgeLine}`;
}

export function daysUntil(dateISO: string, todayISO: string | null): number | null {
  if (!todayISO) return null;
  const targetMs = Date.parse(`${dateISO}T00:00:00Z`);
  const todayMs = Date.parse(`${todayISO}T00:00:00Z`);
  if (Number.isNaN(targetMs) || Number.isNaN(todayMs)) return null;
  return Math.round((targetMs - todayMs) / 86400000);
}

export function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function computeRoleReadiness(state: AppState, role: RoleTrack): {
  readinessPct: number;
  practicedCount: number;
  totalCount: number;
  avgScore: number | null;
} {
  const questions = getAllQuestions(state).filter(
    (q) => q.role === role || q.secondaryRoles.includes(role)
  );
  const totalCount = questions.length;
  const practiced = questions.filter((q) => {
    const st = getQuestionStatus(state, q.id);
    return st === 'mastered' || st === 'needs_drill';
  });
  const roleSessions = state.sessions.filter((s) => s.role === role && s.evaluation);
  const avgScore =
    roleSessions.length > 0
      ? Math.round(
          (roleSessions.reduce((sum, s) => sum + (s.evaluation?.overallScore ?? 0), 0) /
            roleSessions.length) *
            10
        ) / 10
      : null;

  const coverageRatio = totalCount > 0 ? practiced.length / totalCount : 0;
  const scoreBoost = avgScore ? (avgScore / 5) * 45 : 0;
  const readinessPct = Math.min(100, Math.round(coverageRatio * 55 + scoreBoost));

  return {
    readinessPct,
    practicedCount: practiced.length,
    totalCount,
    avgScore,
  };
}

export function computeFiveDimensionSummary(state: AppState) {
  const evaluated = state.sessions.filter((s) => s.evaluation);
  const labels = [
    { key: 'framing_mece', label: 'Problem Framing & MECE', labelZh: '问题拆解与MECE' },
    { key: 'tradeoff_depth', label: 'Trade-off & Tech Depth', labelZh: '技术与战略权衡' },
    { key: 'execution_metrics', label: 'Execution & Metrics', labelZh: '执行与指标定量' },
    { key: 'customer_stakeholder', label: 'Customer & Stakeholders', labelZh: '客户与多方协同' },
    { key: 'communication_conciseness', label: 'Executive Synthesis', labelZh: '表达与金字塔总结' },
  ] as const;

  return labels.map((dim) => {
    if (evaluated.length === 0) {
      return { ...dim, avg: null as number | null };
    }
    const vals = evaluated
      .map((s) => s.evaluation?.dimensions.find((d) => d.key === dim.key)?.score)
      .filter((v): v is number => typeof v === 'number');
    const avg =
      vals.length > 0
        ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
        : null;
    return { ...dim, avg };
  });
}

export function roleBadgeClasses(role: RoleTrack): string {
  const cfg = ROLES_BY_ID[role];
  return `${cfg.badgeBg} ${cfg.badgeText} border ${cfg.borderColor}`;
}
