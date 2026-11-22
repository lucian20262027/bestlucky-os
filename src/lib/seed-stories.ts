import { RoleTrack, RoundType, StarStory } from './types';

export const SEED_STORIES: StarStory[] = [
  {
    id: 'story-template-01',
    title: '[Template] Rescuing a Stalled Enterprise Pilot Under Dirty Legacy Data',
    competencies: ['0→1 Execution', 'Technical Depth', 'Customer Obsession', 'Ambiguity'],
    targetRoles: ['fde', 'fdpm', 'ai-pm', 'operations'],
    situation:
      'At an enterprise customer deployment, our AI workflow pilot stalled in Week 3 because 40% of real-world records arrived as unstructured PDFs and legacy CSV exports with inconsistent vendor IDs, threatening a $450K renewal.',
    task:
      'Unblock production accuracy from ~74% to >92% within 14 days without waiting a quarter for Core Engineering to build bespoke ETL connectors.',
    action:
      'I shadowed client operators for 2 days to catalog the top 5 failure clusters, introduced a thin canonical adapter normalizing IDs deterministically before LLM classification, added a confidence-gated human review queue with inline PDF citations, and set up daily replay evals on 120 real samples.',
    result:
      'Accuracy reached 94.5% in 11 days, median operator review time dropped from 14 minutes to 2.5 minutes, and the pilot converted into a $480K/year multi-site contract—plus 2 adapter primitives were promoted into Core Product.',
    learning:
      'Never solve deterministic data-hygiene bugs with heavier prompting; observing real operators for 48 hours beats weeks of remote guessing.',
    roleFramings: {
      fde: 'Emphasize the canonical data adapter, deterministic-vs-probabilistic split, and shadow eval pipeline shipped in 11 days.',
      fdpm: 'Highlight how field discovery uncovered the 80% reusable pattern and converted an at-risk pilot into $480K ARR.',
      'ai-pm': 'Focus on the 120-sample golden replay harness and confidence-gated HITL UI cutting verification time by 82%.',
      operations: 'Highlight operator shadowing, isolating the top 5 queue bottlenecks, and SLA cycle-time reduction (14m → 2.5m).',
    },
    metrics: ['74% → 94.5% accuracy', '14m → 2.5m review time', '$480K ARR conversion'],
    isTemplate: true,
    updatedAt: '2026-11-20T12:00:00Z',
  },
  {
    id: 'story-template-02',
    title: '[Template] Pushing Back on Mid-Quarter Exec Scope Creep via Trade-Off Menu',
    competencies: [
      'Conflict / Pushback',
      'Cross-Functional Influence',
      'Data-Driven Decision',
    ],
    targetRoles: ['pgm', 'fdpm', 'pm', 'consulting'],
    situation:
      'Four weeks before a hard GA reliability launch across 4 engineering squads, an executive stakeholder requested adding an unvetted custom analytics module for a tier-1 prospect demo.',
    task:
      'Protect the GA critical path and team focus without appearing obstructionist or losing the strategic prospect opportunity.',
    action:
      'Instead of saying "no", I mapped engineering capacity against the critical path in 2 hours and presented a 3-option trade-off memo: (A) Full scope + 3-week GA slip, (B) Cut 2 non-critical reporting widgets to fit, or (C) Build a 2-day sandboxed prototype separate from the GA release branch. I recommended Option C with clear sales guardrails.',
    result:
      'Leadership aligned on Option C within 24 hours; GA shipped on time with zero Sev-1 incidents, the prospect signed a $320K pilot, and the trade-off menu became our standard escalation template.',
    learning:
      'Saying "no" creates conflict; presenting quantified "if X, then Y slips by N weeks" trade-offs turns executives into co-owners of the critical path.',
    roleFramings: {
      pgm: 'Lead with critical-path dependency mapping, burn-down protection, and the 3-option decision memo.',
      fdpm: 'Highlight balancing one strategic prospect demo against multi-tenant GA platform integrity.',
      pm: 'Focus on product prioritization discipline and protecting user-facing reliability over shiny demo requests.',
      consulting: 'Frame it as a structured executive synthesis: Situation -> Complication -> 3 Quantified Options -> Clear Recommendation.',
    },
    metrics: ['0-day GA slip', '0 Sev-1 incidents', '$320K pilot closed'],
    isTemplate: true,
    updatedAt: '2026-11-20T12:00:00Z',
  },
  {
    id: 'story-template-03',
    title: '[Template] Fixing a Failing Launch & Cutting Onboarding Backlog by 55%',
    competencies: [
      'Failure & Recovery',
      'Data-Driven Decision',
      'Ambiguity',
      'Cross-Functional Influence',
    ],
    targetRoles: ['operations', 'consulting', 'pgm', 'pm'],
    situation:
      'I championed a streamlined self-serve onboarding rollout aimed at halving implementation hours, but within 4 weeks activation fell 18% and support escalations doubled.',
    task:
      'Own the misdiagnosis publicly, isolate why customers stalled, and recover both activation and onboarding throughput.',
    action:
      'I halted further rollout, personally audited 25 stalled accounts, and discovered our "streamlined" flow removed a mandatory Sales-to-Ops data readiness check—pushing dirty schema failures downstream. I rebuilt a lightweight pre-flight schema validator + tiered 30-minute launch clinic for mid-market accounts.',
    result:
      'Activation rebounded +24% above baseline within 5 weeks, median onboarding dropped from 31 to 14 days (55% faster), and support ticket volume per launch fell 48%.',
    learning:
      'Removing a visible step from a funnel does not remove complexity—unless you automate or resolve the underlying data prerequisite, friction just explodes downstream.',
    roleFramings: {
      operations: 'Focus on wait-time vs. touch-time diagnostics, upstream Sales-to-Ops Definition of Ready, and 55% cycle-time drop.',
      consulting: 'Highlight root-cause hypothesis testing across 25 stalled accounts and quantified before/after turnaround.',
      pgm: 'Emphasize crisp rollback/pause judgment and cross-team recovery across Sales, Support, and Product.',
      pm: 'Center on cohort funnel diagnosis, owning an assumption miss quickly, and shipping the automated schema validator.',
    },
    metrics: ['31d → 14d onboarding (-55%)', '+24% activation recovery', '-48% launch tickets'],
    isTemplate: true,
    updatedAt: '2026-11-20T12:00:00Z',
  },
];

export interface SampleJD {
  id: string;
  label: string;
  company: string;
  role: RoleTrack;
  round: RoundType;
  jdText: string;
}

export const SAMPLE_JDS: SampleJD[] = [
  {
    id: 'jd-fde',
    label: 'Frontier AI Lab — Forward Deployed Engineer (FDE)',
    company: 'Anthropic / OpenAI Applied AI',
    role: 'fde',
    round: 'decomposition',
    jdText: `Role: Forward Deployed Engineer (Applied AI)
Location: San Francisco / Hybrid (30% on-site with enterprise design partners)

What You Will Do:
- Embed directly with Fortune 500 engineering, operations, and executive teams to decompose ambiguous operational workflows into production AI systems within 30-60 days.
- Architect end-to-end agentic pipelines, RAG retrieval over heterogeneous legacy ERPs/PDFs, evaluation harnesses, and confidence-gated human-in-the-loop workflows.
- Rapidly debug production accuracy regressions, latency spikes, and security/VPC integration blockers in live customer environments.
- Partner with Core Product & Research to distill bespoke field patterns into reusable platform primitives.

What We Look For:
- Strong software/systems engineering depth (Python/TypeScript, APIs, SQL, distributed reliability) combined with executive client communication.
- Bias toward shipping vertical slices fast while respecting data security, observability, and deterministic fallbacks.`,
  },
  {
    id: 'jd-fdpm-aipm',
    label: 'Enterprise AI — Forward Deployed PM / AI PM',
    company: 'Sierra / Glean / Palantir',
    role: 'fdpm',
    round: 'product-ai',
    jdText: `Role: Forward Deployed Product Manager (Enterprise AI Agents)
What You Will Do:
- Own product discovery and technical scoping with flagship design partners across healthcare, logistics, and financial operations.
- Translate messy 1-off customer requests into an 80% reusable agent platform roadmap while empowering FDE squads to deliver fast Day-1 value.
- Define offline/online evaluation rubrics, hallucination guardrails, HITL UX, and unit economics (inference COGS vs. outcome pricing).
- Partner with Sales and Client CFOs to structure pilot success criteria, counterfactual ROI proof, and expansion into $1M+ ARR contracts.`,
  },
  {
    id: 'jd-ops-pgm',
    label: 'Hyper-Growth Tech — Strategy & Operations / PgM Lead',
    company: 'Stripe / Scale AI BizOps',
    role: 'operations',
    round: 'execution-metrics',
    jdText: `Role: Strategy & Operations / Technical Program Lead
What You Will Do:
- Diagnose funnel bottlenecks across enterprise onboarding, deployment capacity, and cross-functional GTM/Engineering handoffs.
- Design staffing models, unit economics scorecards, incentive alignment mechanisms, and the executive Weekly Business Review (WBR) cadence.
- Lead high-stakes war rooms and multi-team launches across Product, Engineering, Legal, and Field Operations with zero missed SLAs.
- Use rigorous quantitative modeling and structured executive synthesis (MECE / Pyramid Principle) to drive C-suite decisions.`,
  },
];

export const DEFAULT_RESUME_SUMMARY = `Product, Strategy & Applied AI builder experienced in 0→1 enterprise AI workflows, forward-deployed customer discovery, multi-team execution, and operational scaling.
Key highlights:
- Led cross-functional AI workflow deployments integrating messy enterprise data, RAG + evaluation harnesses, and human-in-the-loop review queues.
- Owned end-to-end KPI diagnostics, pilot-to-ARR ROI cases, and WBR operating cadences across product, engineering, and ops teams.
- Comfortable bridging technical system decomposition (APIs, latency, evals, guardrails) with executive business synthesis (unit economics, MECE, stakeholder alignment).`;
