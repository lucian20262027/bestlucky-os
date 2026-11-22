import { InterviewerPersona, RoleConfig, RoleTrack, RoundType } from './types';

export const ROLE_LIST: RoleConfig[] = [
  {
    id: 'fde',
    label: 'Forward Deployed Engineer',
    shortLabel: 'FDE',
    tagline: 'Ambiguous client problem → production architecture & fast value delivery',
    taglineZh: '把模糊客户痛点快速拆解并落地成可运行生产系统（架构 + 集成 + 现场推进）',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    borderColor: 'border-indigo-200',
    accentHex: '#4338CA',
    coreCompetencies: [
      'System Decomposition',
      'Legacy ERP / Data Integration',
      'Live Debugging & Triage',
      'Bespoke vs. Platform Trade-offs',
      'Executive Technical Credibility',
    ],
    defaultScratchpadSections: [
      '1. Clarify Constraints & SLA (Latency, Security, Legacy Systems)',
      '2. 30-60-90 Day Milestone Plan & Fast Time-to-Value',
      '3. Data Ingestion, Integration & AI Pipeline Architecture',
      '4. Failure Modes, Fallbacks & Observability',
      '5. Bespoke Client Code vs. Reusable Platform Core',
    ],
    sampleCompanies: ['Palantir', 'OpenAI FDE', 'Anthropic Applied AI', 'Scale AI', 'C3.ai'],
  },
  {
    id: 'fdpm',
    label: 'Forward Deployed PM',
    shortLabel: 'FDPM',
    tagline: 'Customer discovery in the field → abstract reusable product core',
    taglineZh: '深入大客户一线交付与共创，并把定制需求抽象为可复用的平台产品能力',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    borderColor: 'border-blue-200',
    accentHex: '#1D4ED8',
    coreCompetencies: [
      'Design Partner Discovery',
      '80/20 Core Abstraction',
      'Pilot-to-ARR Conversion & ROI',
      'FDE vs. Core Eng Prioritization',
      'Enterprise Security & Procurement',
    ],
    defaultScratchpadSections: [
      '1. Client Pain & True Economic Buyer (CFO vs. Operator)',
      '2. Pilot Success Criteria & Quantified ROI Proof',
      '3. What Stays Bespoke (20%) vs. Platform Core (80%)',
      '4. Stakeholder Alignment (Client IT, FDEs, Core Eng)',
      '5. Expansion Path from Pilot to Multi-Year ARR',
    ],
    sampleCompanies: ['Palantir', 'Anduril', 'Scale AI', 'Sierra', 'Glean'],
  },
  {
    id: 'ai-pm',
    label: 'AI Product Manager',
    shortLabel: 'AI PM',
    tagline: 'Evals, unit economics, HITL UX & non-deterministic reliability',
    taglineZh: '大模型/Agent产品核心：评测体系(Evals)、推理成本、人机协同与模型选型',
    badgeBg: 'bg-violet-50',
    badgeText: 'text-violet-700',
    borderColor: 'border-violet-200',
    accentHex: '#6D28D9',
    coreCompetencies: [
      'Golden Datasets & Evals',
      'RAG vs. Fine-tuning vs. Prompting',
      'Inference Latency & Token COGS',
      'HITL & Hallucination Guardrails',
      'Agent Autonomy & Tool Safety',
    ],
    defaultScratchpadSections: [
      '1. User Workflow & Acceptable Error Threshold',
      '2. Architecture Choice (Prompt/RAG vs. Fine-tune vs. Agent Tools)',
      '3. Offline + Online Eval Harness & Golden Dataset',
      '4. Latency, Token COGS & Caching Optimization',
      '5. Trust, Confidence UI & Human-in-the-Loop Fallback',
    ],
    sampleCompanies: ['OpenAI', 'Anthropic', 'Google DeepMind', 'Perplexity', 'Cursor'],
  },
  {
    id: 'pm',
    label: 'Product Manager',
    shortLabel: 'PM',
    tagline: 'User empathy, product sense, execution metrics & crisp strategy',
    taglineZh: '经典产品力：用户洞察、结构化Product Sense、指标拆解与产品战略权衡',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
    borderColor: 'border-sky-200',
    accentHex: '#0369A1',
    coreCompetencies: [
      '0→1 Product Sense',
      'Root-Cause Metric Diagnosis',
      'North Star & Guardrail Metrics',
      'Prioritization & Sequencing',
      'Competitive Moat & Positioning',
    ],
    defaultScratchpadSections: [
      '1. Clarify Goal, Geography & Constraints',
      '2. Target User Segments & Highest-Friction Pain',
      '3. Value Prop, Solutions & 10x Differentiator',
      '4. North Star, Input Metrics & Counter-Guardrails',
      '5. Risks, Trade-offs & Phased Rollout',
    ],
    sampleCompanies: ['Stripe', 'Meta', 'Google', 'Figma', 'Airbnb'],
  },
  {
    id: 'operations',
    label: 'Strategy & Operations',
    shortLabel: 'Operations',
    tagline: 'Bottleneck throughput, unit economics, SOPs & weekly operating cadence',
    taglineZh: '运营与战略：全链路瓶颈诊断、单位经济效益、激励机制与WBR运营节奏',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    accentHex: '#047857',
    coreCompetencies: [
      'Funnel & Bottleneck Throughput',
      'Capacity & Staffing Modeling',
      'Unit Economics & Margin',
      'Incentive & SLA Design',
      'WBR / MBR Operating Cadence',
    ],
    defaultScratchpadSections: [
      '1. Operational Goal & Baseline Funnel Throughput',
      '2. Bottleneck Isolation (People, Process, Tooling, Incentives)',
      '3. Unit Economics & Capacity Model',
      '4. Short-Term Stabilization vs. Structural Fix',
      '5. WBR Metrics, Owners & Red-Flag Triggers',
    ],
    sampleCompanies: ['DoorDash', 'Uber', 'Stripe BizOps', 'Scale AI Ops', 'Amazon'],
  },
  {
    id: 'pgm',
    label: 'Technical Program Manager',
    shortLabel: 'Program Manager',
    tagline: 'Cross-team dependencies, critical path, risk burn-down & crisp escalations',
    taglineZh: '复杂项目推进：关键路径拆解、跨团队依赖管理、风险预案与高层升级机制',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    borderColor: 'border-amber-200',
    accentHex: '#B45309',
    coreCompetencies: [
      'Critical Path & Dependency Mapping',
      'War-Room Incident & Launch Triage',
      'Scope vs. Timeline vs. Quality Trade-offs',
      'Executive Escalation & Alignment',
      'Lightweight Delivery Governance',
    ],
    defaultScratchpadSections: [
      '1. Program Scope, Hard Deadline & Exit Criteria',
      '2. Critical Path & Cross-Team Dependency Graph',
      '3. Top Risks (Probability × Impact) & Mitigations',
      '4. Cut-Line Decisions & Executive Escalation Framing',
      '5. Cadence, Launch Readiness Gate & Post-Mortem',
    ],
    sampleCompanies: ['Google', 'Meta', 'Stripe', 'Databricks', 'Snowflake'],
  },
  {
    id: 'consulting',
    label: 'Management Consulting',
    shortLabel: 'Consulting',
    tagline: 'MECE issue trees, hypothesis-driven math & Pyramid Principle synthesis',
    taglineZh: '管理咨询案例：MECE拆解树、假设驱动商业分析、市场规模估算与金字塔汇报',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    borderColor: 'border-rose-200',
    accentHex: '#BE123C',
    coreCompetencies: [
      'MECE Issue Tree Structuring',
      'Hypothesis-Driven Profitability',
      'Bottom-Up / Top-Down Market Sizing',
      'Mental Math & Sanity Checks',
      '60-Second Pyramid Synthesis',
    ],
    defaultScratchpadSections: [
      '1. Restate Objective, Metric & Timeline',
      '2. MECE Issue Tree (2-3 Level Branches)',
      '3. Initial Hypothesis & Priority Branch to Test',
      '4. Quantitative Analysis & Sanity Check',
      '5. Pyramid Principle Synthesis (Answer First + 3 Pillars + Risks)',
    ],
    sampleCompanies: ['McKinsey', 'BCG', 'Bain', 'Strategy&', 'L.E.K.'],
  },
];

export const ROLES_BY_ID: Record<RoleTrack, RoleConfig> = ROLE_LIST.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<RoleTrack, RoleConfig>
);

export const ROUND_LABELS: Record<RoundType, { en: string; zh: string }> = {
  'phone-screen': { en: 'Phone Screen / Recruiter', zh: '电话初筛 / HR面' },
  'hiring-manager': { en: 'Hiring Manager', zh: '用人经理面 (HM)' },
  'round-1': { en: 'Round 1', zh: '一面 (Round 1)' },
  technical: { en: 'Technical / Coding & Arch', zh: '技术与架构面' },
  decomposition: { en: 'System & Problem Decomposition', zh: '系统与问题拆解' },
  'product-ai': { en: 'Product & AI Design', zh: '产品与 AI 设计' },
  'case-strategy': { en: 'Case & Strategy', zh: '商业案例与战略' },
  'execution-metrics': { en: 'Execution, Ops & Metrics', zh: '执行、运营与指标' },
  xfn: { en: 'XFN Cross-Functional', zh: '跨团队协作 (XFN)' },
  behavioral: { en: 'Behavioral & Leadership', zh: '行为面与领导力' },
  loops: { en: 'Onsite Loops / Panel', zh: '终面 Loops' },
  estimation: { en: 'Market Sizing & Estimation', zh: '市场估算与定量分析' },
};

export const PERSONA_CONFIGS: Record<
  InterviewerPersona,
  {
    label: string;
    labelZh: string;
    description: string;
    styleInstruction: string;
  }
> = {
  coach: {
    label: 'Supportive Coach',
    labelZh: '引导型教练',
    description: 'Structured nudges when stuck; still holds a high bar.',
    styleInstruction:
      'Be encouraging yet structured. Give concise tactical nudges if the candidate misses a key dimension, then ask one sharp follow-up.',
  },
  'bar-raiser': {
    label: 'Amazon / Big Tech Bar-Raiser',
    labelZh: '高压 Bar-Raiser',
    description: 'Drills for personal ownership, numbers, and edge cases.',
    styleInstruction:
      'Be polite, clinical, and uncompromising. Challenge vague claims ("we" instead of "I"), ask for exact metrics, and probe trade-offs.',
  },
  'fde-lead': {
    label: 'Palantir / Frontier FDE Lead',
    labelZh: '前线架构负责人',
    description: 'Zero tolerance for hand-waving; cares about Day-1 production reality.',
    styleInstruction:
      'Probe concrete data schemas, failure modes, dirty legacy systems, security constraints, and what actually ships in Week 2 vs Week 8.',
  },
  'mbb-partner': {
    label: 'MBB Case Partner',
    labelZh: 'MBB 咨询合伙人',
    description: 'Tests MECE rigor, math speed, and "So What?" executive synthesis.',
    styleInstruction:
      'Demand MECE structure upfront, push back on unquantified claims, ask "So what does that mean for the CEO?" and keep pacing tight.',
  },
};

export const BEHAVIORAL_THEMES = [
  'Ambiguity',
  'Conflict / Pushback',
  'Failure & Recovery',
  '0→1 Execution',
  'Data-Driven Decision',
  'Customer Obsession',
  'Technical Depth',
  'Cross-Functional Influence',
] as const;
