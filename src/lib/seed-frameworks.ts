import { RoleTrack } from './types';

export interface RolePlaybookDetail {
  role: RoleTrack;
  coreMentalModel: string;
  coreMentalModelZh: string;
  goldenFormula: string[];
  keyMetrics: string[];
  commonTraps: string[];
  thirtySecOpener: string;
}

export const ROLE_PLAYBOOKS: Record<RoleTrack, RolePlaybookDetail> = {
  fde: {
    role: 'fde',
    coreMentalModel:
      'Own the outcome from messy client floor to running production code. Ship value in Week 2 via narrow vertical slices while keeping platform boundaries clean.',
    coreMentalModelZh:
      '以交付结果倒推架构：能用确定性代码解决的绝不交给大模型，先用最小垂直切片跑通生产闭环并接入HITL，再逐步抽象扩展。',
    goldenFormula: [
      '1. Clarify business SLA, security boundary & dirty legacy interfaces (ERP/PDF/VPN)',
      '2. Slice 1 high-ROI workflow into a 30-60-90 rollout (Shadow -> Read-Only -> Write-Back)',
      '3. Separate deterministic rules from probabilistic AI + enforce confidence-gated HITL',
      '4. Isolate bespoke client glue in adapters so Core Platform stays clean',
    ],
    keyMetrics: [
      'Time-to-First-Value (TTFV)',
      'End-to-End Accuracy vs. Recall on Critical Errors',
      'Human Override / Fallback Rate',
      'P95 Latency & Integration Uptime',
      'Core Reusability Ratio (%)',
    ],
    commonTraps: [
      'Designing a 6-month ideal data lake before shipping anything to real users',
      'Letting LLMs do arithmetic, exact joins, or unverified ERP mutations',
      'Never checking how client operators actually work day-to-day',
    ],
    thirtySecOpener:
      '"Before drawing boxes, I want to lock down 3 constraints: who the Day-1 operator is, what legacy systems we must read/write safely, and what accuracy bar unlocks a Week-2 shadow pilot..."',
  },
  fdpm: {
    role: 'fdpm',
    coreMentalModel:
      'Bridge forward-deployed field reality and core product compounding. Turn 1-off customer urgency into repeatable 80% platform primitives + hard CFO ROI.',
    coreMentalModelZh:
      '站在客户一线发现真痛点，同时守住平台产品复利：用财务语言把Pilot转成年单，并把80%共性能力沉淀回Core产品。',
    goldenFormula: [
      '1. Separate Economic Buyer (CFO/VP) ROI from End-User workflow friction',
      '2. Identify the 80% horizontal core primitives underneath 3 noisy client asks',
      '3. Design Pilot Exit Criteria & Control-Group ROI proof on Day 1',
      '4. Manage FDE vs. Core Eng interface with clear graduation contracts',
    ],
    keyMetrics: [
      'Pilot-to-ARR Conversion Rate',
      'Net Dollar Retention (NDR) & Expansion ACV',
      'Time-to-ROI / Payback Months',
      'Platform Core vs. Bespoke Code Split (80/20)',
    ],
    commonTraps: [
      'Acting like a project coordinator who just says "yes" to every custom client feature',
      'Pitching operator CSAT to a CFO who only cares about hard P&L impact',
      'Failing to negotiate clean design-partner commitments',
    ],
    thirtySecOpener:
      '"First let’s align on what success unlocks the multi-year contract: who signs the check, how we prove counterfactual ROI in 60 days, and which 80% of this build belongs in our core platform."',
  },
  'ai-pm': {
    role: 'ai-pm',
    coreMentalModel:
      'Traditional software is deterministic; AI software is probabilistic. Your job is designing Evals, latency/COGS economics, and failure-tolerant HITL UX.',
    coreMentalModelZh:
      '传统软件看确定性逻辑，AI产品看概率分布管理：以评测集(Evals)为锚、管住Token单位经济性，并为不可逆操作设计低摩擦人机协同。',
    goldenFormula: [
      '1. Define Acceptable Error Threshold & Reversible vs. Irreversible Action Blast Radius',
      '2. Pick simplest architecture that clears the bar (Prompt/Tools -> Hybrid RAG -> Fine-Tune)',
      '3. Separate Retrieval Eval from Generation/Faithfulness Eval + Calibrated LLM Judge',
      '4. Manage Token COGS & Latency via model routing, caching, and loop caps',
    ],
    keyMetrics: [
      'Task Completion Rate & Groundedness / Citation Precision',
      'ACL / P0 Safety Violation Rate (must be 0%)',
      'Cost per Successful Task & AI Gross Margin',
      'Human Edit Distance & Override Rate',
    ],
    commonTraps: [
      'Suggesting fine-tuning when retrieval or prompt instructions are actually broken',
      'Ignoring token costs and latency until gross margin collapses',
      'Building passive chatboxes instead of workflow-embedded verification UI',
    ],
    thirtySecOpener:
      '"Because this workflow involves non-deterministic outputs, let’s start by mapping error tolerance—specifically which failures are reversible vs. catastrophic—and build our eval harness around that boundary."',
  },
  pm: {
    role: 'pm',
    coreMentalModel:
      'Anchor every product choice on a sharp user segment, measurable friction, a 10x core loop, and counter-metrics that keep growth honest.',
    coreMentalModelZh:
      '经典产品思维铁三角：精准用户切口 + 不可替代的核心体验闭环 + 带制衡护栏(Guardrails)的北极星指标体系。',
    goldenFormula: [
      '1. Clarify Company Goal, Constraints & Strategic Fit',
      '2. Pick a High-Leverage User Segment & Isolate #1 Underserved Pain',
      '3. Design End-to-End Core Loop with 10x Advantage & Adoption Wedge',
      '4. Pair North Star Metric with Counter-Guardrails + Phased Rollout',
    ],
    keyMetrics: [
      'Activation Rate & Time-to-Aha',
      'Cohort Retention (D7 / D30 / M6)',
      'North Star Value-Delivery Events',
      'Counter-Metrics (Spam, Latency, Churn, Quality)',
    ],
    commonTraps: [
      'Listing 8 shallow features instead of going deep on 1 high-conviction workflow',
      'In Execution/Diagnosis questions, skipping telemetry sanity checks and jumping to guesses',
      'Picking vanity metrics like signups or pageviews as North Star',
    ],
    thirtySecOpener:
      '"To make sure we solve the highest-leverage problem, let’s confirm our business goal first, segment the users involved, and narrow down to the single biggest friction point before designing solutions."',
  },
  operations: {
    role: 'operations',
    coreMentalModel:
      'Every operational crisis is a funnel throughput, capacity, or incentive mismatch problem. Isolate wait time vs. touch time, quantify unit economics, and install a weekly operating cadence.',
    coreMentalModelZh:
      '运营不是救火，而是系统流转与机制设计：把模糊卡顿拆成“排队等待 vs 实际作业耗时”，算清单位经济账，并用防博弈的计分卡和WBR周会固化执行。',
    goldenFormula: [
      '1. Map End-to-End Process Funnel & Measure Wait Time vs. Touch Time',
      '2. Isolate Bottleneck Root Cause (Capacity, Tooling, Handoff Gate, or Broken Incentives)',
      '3. Model Unit Economics, Staffing & Queue Triage (Backlog vs. Steady State)',
      '4. Lock WBR Metrics with Clear Owners, Thresholds & Escalation Triggers',
    ],
    keyMetrics: [
      'Cycle Time / Time-to-Value (Median & P90)',
      'Stage Aging & Backlog Burn-down Rate',
      'Fully Loaded Gross Margin & Utilization %',
      '60/90-Day Healthy Retention (Quality Gate)',
    ],
    commonTraps: [
      'Defaulting to "hire more people" instead of fixing queue waits and handoff gates',
      'Designing single-metric bonuses that trigger Goodhart gaming & churn',
      'Presenting unowned metrics without Red/Yellow/Green thresholds',
    ],
    thirtySecOpener:
      '"Let’s treat this as an end-to-end throughput system: I’ll break down cycle time into queue wait vs. active work, isolate where volume or quality breaks, and size both the backlog fix and steady-state capacity."',
  },
  pgm: {
    role: 'pgm',
    coreMentalModel:
      'Great PgMs remove ambiguity without adding bureaucracy. Map the critical path DAG, expose invisible cross-team risks early, and bring executives crisp trade-off menus.',
    coreMentalModelZh:
      '卓越项目经理靠“依赖全景图 + 关键路径卡点预判 + 清晰可落地的Cut-line决策菜单”推进，而不是开无休止的对齐会或催进度。',
    goldenFormula: [
      '1. Lock Scope, Hard Deadlines & Objective Exit Criteria',
      '2. Map Cross-Team Critical Path & Single-Threaded Owners (DRIs)',
      '3. Run Risk Matrix (Probability × Impact) + Concrete Mitigations & Cut-Lines',
      '4. Frame Executive Escalations as Option A / B / Recommended Trade-off',
    ],
    keyMetrics: [
      'Critical Path Schedule Variance & Blocker Burn-down',
      'Launch Readiness Gate Pass Rate',
      'Post-Launch Sev-1/Sev-2 Incident & Rollback Rate',
      'Engineering Maker-Time Preservation',
    ],
    commonTraps: [
      'Solving schedule slippage by saying "work harder/weekends" instead of cutting or phasing scope',
      'Being a passive note-taker who escalates problems without pre-built options',
      'Over-engineering process theater that slows small independent launches',
    ],
    thirtySecOpener:
      '"With a hard deadline ahead, I want to anchor on our non-negotiable exit criteria, map the critical path dependencies across teams, and lay out our Cut-Line options before locking the war-room cadence."',
  },
  consulting: {
    role: 'consulting',
    coreMentalModel:
      'Structure before numbers, hypothesis before rabbit holes, synthesis before details. Every minute must drive toward a quantified "So What?" for the CEO.',
    coreMentalModelZh:
      '结构先于数字，假设先于发散，结论先于过程：MECE拆解问题树、用清晰公式算账并做合理性校验，最后用60秒金字塔原理给出CEO决策建议。',
    goldenFormula: [
      '1. Clarify Objective, Exact Metric, Timeline & Constraints',
      '2. Present Tailored 2-3 Level MECE Issue Tree + Initial Hypothesis',
      '3. Drive Hypothesis-First Math (State Equation -> Plug Round Numbers -> Sanity Check)',
      '4. Deliver Pyramid Synthesis (Answer First -> 3 Quantified Pillars -> Risks & Next Step)',
    ],
    keyMetrics: [
      'Revenue Mix & Contribution Margin (%)',
      'EBITDA Bridge ($M) & Payback Period',
      'Bottom-Up / Top-Down TAM vs. Realistic SAM',
      'NPV / Hurdle Rate & Risk-Adjusted ROI',
    ],
    commonTraps: [
      'Dumping memorized generic frameworks without customizing to the industry',
      'Running silent messy calculations without stating the formula upfront',
      'Giving a chronological storytelling summary instead of Answer-First Pyramid synthesis',
    ],
    thirtySecOpener:
      '"To solve this rigorously, let me confirm our target metric and timeframe first—then I’ll walk you through a tailored MECE structure covering both revenue mix and cost drivers to isolate the biggest lever."',
  },
};

export interface CrossRoleComparisonRow {
  role: RoleTrack;
  first90Seconds: string;
  keyArtifact: string;
  primaryKpi: string;
  biggestRiskFlagged: string;
}

export const SAME_PROMPT_SCENARIO = {
  title: 'Shared Scenario: "An enterprise client wants an AI agent to automate invoice exception handling across 5 regional ERPs."',
  titleZh: '同一道场景题，7 个岗位在面试前 90 秒的切入视角对比',
  rows: [
    {
      role: 'fde' as RoleTrack,
      first90Seconds:
        'Audit the 5 ERP APIs/batch dumps, pick 1 region + top 2 exception types for Week-2 shadow mode, and isolate deterministic matching from LLM PDF extraction.',
      keyArtifact: 'Canonical Event Schema + ERP Adapter Diagram + Shadow Log Pipeline',
      primaryKpi: 'Extraction/Match Precision & Zero Silent Bad ERP Writes',
      biggestRiskFlagged: 'Air-gapped SAP permissions, duplicate write-backs, dirty OCR tables',
    },
    {
      role: 'fdpm' as RoleTrack,
      first90Seconds:
        'Identify the economic buyer (VP Finance/AP), lock pilot ROI target ($ recovered/FTE hours freed), and separate the 80% reusable AP Engine from 20% regional tax rules.',
      keyArtifact: 'Pilot ROI Charter + 80/20 Platform vs. Bespoke Boundary Spec',
      primaryKpi: 'Pilot-to-Enterprise ARR Conversion & Verified Payback Months',
      biggestRiskFlagged: 'Building 5 bespoke regional forks that Core Eng refuses to maintain',
    },
    {
      role: 'ai-pm' as RoleTrack,
      first90Seconds:
        'Define exception taxonomy & blast radius (auto-approve <$500 vs. mandatory HITL >$500), build golden eval set, and optimize token COGS via model routing.',
      keyArtifact: 'Offline/Online Eval Harness + Confidence-Gated HITL Review UI',
      primaryKpi: 'Auto-Resolution Rate at <0.5% Error + Inference Cost per Invoice',
      biggestRiskFlagged: 'Automation complacency (humans blindly approving hallucinated wire edits)',
    },
    {
      role: 'pm' as RoleTrack,
      first90Seconds:
        'Segment AP Clerks vs. Controllers, diagnose why exception queues stall today, and craft a 10x collaborative resolution loop with audit-ready explainability.',
      keyArtifact: 'User Journey Map + Prioritized Workflow PRD + Guardrail Metric Tree',
      primaryKpi: 'Weekly Active AP Workflows Resolved & Time-to-Resolution',
      biggestRiskFlagged: 'Low daily trust/adoption if clerks cannot verify why AI flagged an exception',
    },
    {
      role: 'operations' as RoleTrack,
      first90Seconds:
        'Measure current AP queue wait time vs. touch time across the 5 regions, model staffing & exception SLA tiers, and design rollout + QA audit cadence.',
      keyArtifact: 'Funnel Bottleneck Audit + Staffing/Unit Economics Sheet + WBR Scorecard',
      primaryKpi: 'Days-to-Close Exceptions & Cost per Processed Exception',
      biggestRiskFlagged: 'Customer data prep bottlenecks stalling onboarding across regions',
    },
    {
      role: 'pgm' as RoleTrack,
      first90Seconds:
        'Map dependencies across ERP, AI, InfoSec, and 5 regional Finance teams; define Wave 1-3 rollout gates (avoiding month-end close) and rollback triggers.',
      keyArtifact: 'Cross-Team Critical Path DAG + Regional Cut-Line & Go/No-Go Checklist',
      primaryKpi: 'On-Time Regional Cutover & Zero Month-End Close Disruptions',
      biggestRiskFlagged: 'Silent dependency collisions between Core API changes and regional pilots',
    },
    {
      role: 'consulting' as RoleTrack,
      first90Seconds:
        'Frame total value pool (early-payment discounts captured + duplicate leak recovery + labor efficiency vs. build/run TCO) and rank which 2 regions have fastest ROI.',
      keyArtifact: 'MECE Value-Pool Tree + 3-Year NPV Business Case + CEO Pyramid Deck',
      primaryKpi: 'Net EBITDA Impact ($M) & 12-Month Payback Hurdle',
      biggestRiskFlagged: 'Overestimating soft headcount savings when regional ERP complexity eats margin',
    },
  ],
};
