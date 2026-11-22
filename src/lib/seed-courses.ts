import { ROLES_BY_ID } from './roles';
import { SEED_QUESTIONS } from './seed-questions';
import {
  DEFAULT_HERO_STYLE,
  DEFAULT_MODULE_STYLE,
  DEFAULT_SUBSECTION_STYLE,
} from './typography';
import { CourseSyllabus, RoleTrack } from './types';

function buildSyllabusForRole(
  role: RoleTrack,
  heroTitle: string,
  heroSubtitle: string,
  highlights: string[],
  moduleSpecs: {
    title: string;
    description: string;
    overviewLessons: { title: string; kind: 'lesson' | 'video'; summary: string }[];
  }[]
): CourseSyllabus {
  const roleQuestions = SEED_QUESTIONS.filter((q) => q.role === role);
  const secondaryQuestions = SEED_QUESTIONS.filter(
    (q) => q.role !== role && q.secondaryRoles.includes(role)
  );
  const combinedQuestions = [...roleQuestions, ...secondaryQuestions];

  const modules = moduleSpecs.map((spec, mIdx) => {
    const slice = combinedQuestions.slice(mIdx * 2, mIdx * 2 + 2);
    return {
      id: `${role}-mod-${mIdx + 1}`,
      title: spec.title,
      description: spec.description,
      titleStyle: DEFAULT_MODULE_STYLE,
      subSections: [
        {
          id: `${role}-mod-${mIdx + 1}-overview`,
          title: 'Overview & Frameworks',
          titleStyle: DEFAULT_SUBSECTION_STYLE,
          lessons: spec.overviewLessons.map((les, lIdx) => ({
            id: `${role}-m${mIdx + 1}-ov-${lIdx + 1}`,
            title: les.title,
            kind: les.kind,
            summary: les.summary,
            completed: mIdx === 0 && lIdx === 0,
            published: true,
          })),
        },
        {
          id: `${role}-mod-${mIdx + 1}-practice`,
          title: 'Mock Interviews & Practice Questions',
          titleStyle: DEFAULT_SUBSECTION_STYLE,
          lessons: slice.map((q) => ({
            id: `${role}-m${mIdx + 1}-q-${q.id}`,
            title: q.title,
            kind: 'question' as const,
            questionId: q.id,
            summary: q.prompt.slice(0, 140),
            completed: false,
            published: true,
          })),
        },
      ],
    };
  });

  return {
    role,
    editionBadge: '2026 EDITION',
    heroTitle,
    heroTitleStyle: DEFAULT_HERO_STYLE,
    heroSubtitle,
    highlights,
    modules,
    published: true,
    updatedAt: '2026-11-21T00:00:00Z',
  };
}

export const SEED_COURSES: Record<RoleTrack, CourseSyllabus> = {
  fde: buildSyllabusForRole(
    'fde',
    'Forward Deployed Engineer Prep',
    `Master ${ROLES_BY_ID.fde.sampleCompanies.join(', ')} field loops: messy ERP decomposition, 30-60-90 shipping slices, live production AI triage, and bespoke-vs-platform architecture.`,
    [
      'Real FDE decomposition cases from Palantir & frontier AI labs',
      'Deterministic vs. probabilistic guardrails & HITL patterns',
      'Editable text answers, video walkthroughs & custom sections',
      'Interactive architecture board + timed AI mock room',
    ],
    [
      {
        title: 'FDE Mindset & 30-60-90 Decomposition',
        description:
          'How top FDEs turn ambiguous operational pain into a working Week-2 vertical slice without boiling the ocean.',
        overviewLessons: [
          {
            title: 'Welcome to FDE + How Field Loops Differ from SWE',
            kind: 'lesson',
            summary: 'Why client empathy + shipping speed beats textbook microservices.',
          },
          {
            title: '30-60-90 Day Legacy ERP Architecture Walkthrough',
            kind: 'video',
            summary: 'Shadow mode -> Read-only HITL -> Controlled write-back.',
          },
        ],
      },
      {
        title: 'Production Triage & Bespoke vs. Platform',
        description:
          'Debugging live accuracy drops under executive pressure and isolating custom glue from core code.',
        overviewLessons: [
          {
            title: '4-Layer Bisection for Production AI Regressions',
            kind: 'lesson',
            summary: 'Input drift vs. retrieval miss vs. prompt regression vs. tool timeout.',
          },
          {
            title: 'Adapter Boundaries: Serving $3M ARR Without Forking Core',
            kind: 'video',
            summary: 'Decoupling client ERP schemas while promoting shared primitives.',
          },
        ],
      },
      {
        title: 'Edge, Security & Executive Credibility',
        description:
          'Offline-resilient industrial systems, air-gapped VPCs, and communicating trade-offs to client VPs.',
        overviewLessons: [
          {
            title: 'Rubric for FDE Technical & Client Ownership Rounds',
            kind: 'lesson',
            summary: 'What differentiates Senior/Staff FDE signals from generic SWE answers.',
          },
        ],
      },
    ]
  ),
  fdpm: buildSyllabusForRole(
    'fdpm',
    'Forward Deployed PM Prep',
    `Land FDPM roles at ${ROLES_BY_ID.fdpm.sampleCompanies.join(', ')}. Turn field discovery across noisy design partners into an 80% reusable core platform and hard CFO ROI.`,
    [
      '80/20 platform abstraction frameworks across enterprise logos',
      'Pilot-to-$1.5M ARR conversion & counterfactual ROI math',
      'Outcome-based AI pricing & gross margin defense',
      'Aligning FDEs, Client InfoSec & Core Engineering',
    ],
    [
      {
        title: 'Design Partner Discovery & 80/20 Abstraction',
        description:
          'Spotting shared horizontal primitives underneath conflicting early enterprise requests.',
        overviewLessons: [
          {
            title: 'How Frontier AI Companies Evaluate FDPMs',
            kind: 'lesson',
            summary: 'Balancing customer urgency with multi-year product compounding.',
          },
          {
            title: 'Case Walkthrough: 3 Hospitals → 1 Reusable Clinical Core',
            kind: 'video',
            summary: 'Sequencing design partners and graduating field adapters.',
          },
        ],
      },
      {
        title: 'CFO ROI Defense & AI Commercialization',
        description:
          'Translating operator CSAT into hard P&L savings and pricing autonomous agents without margin collapse.',
        overviewLessons: [
          {
            title: 'Building Counterfactual ROI Proof in 60-Day Pilots',
            kind: 'lesson',
            summary: 'Why CFOs reject soft "minutes saved" claims and what wins signatures.',
          },
          {
            title: 'Outcome Pricing vs. Seat Cannibalization',
            kind: 'video',
            summary: 'Hybrid base platform fee + verified resolution tiers.',
          },
        ],
      },
      {
        title: 'Field Conflict & Stakeholder Execution',
        description:
          'Unblocking InfoSec, shielding Core Eng, and owning behavioral leadership stories.',
        overviewLessons: [
          {
            title: 'FDE-to-Core Escalation & Graduation Playbook',
            kind: 'lesson',
            summary: 'Turning field tension into single-threaded weekly decision cadences.',
          },
        ],
      },
    ]
  ),
  'ai-pm': buildSyllabusForRole(
    'ai-pm',
    'AI Product Manager Prep',
    `Ace AI PM interviews at ${ROLES_BY_ID['ai-pm'].sampleCompanies.join(', ')}. Master Evals, RAG vs. fine-tuning, token COGS optimization, and human-in-the-loop agent UX.`,
    [
      'Offline golden datasets + calibrated LLM-as-a-Judge harnesses',
      'Cutting agent inference COGS 60% via routing & caching',
      'Graduated agent autonomy & irreversible-action guardrails',
      'Prompt/RAG vs. LoRA/fine-tuning build-or-buy matrices',
    ],
    [
      {
        title: 'AI Evals & Reliability Engineering',
        description:
          'Designing retrieval vs. synthesis eval gates that catch P0 permission leaks and stale docs.',
        overviewLessons: [
          {
            title: 'Why Non-Deterministic Products Need Eval Harnesses First',
            kind: 'lesson',
            summary: 'Moving beyond vibes to stratified golden sets and Kappa calibration.',
          },
          {
            title: 'Enterprise RAG Eval Architecture Walkthrough',
            kind: 'video',
            summary: 'ACL hard gates, groundedness, and closed-loop telemetry.',
          },
        ],
      },
      {
        title: 'AI Unit Economics & HITL Agent UX',
        description:
          'Protecting gross margin under multi-step agent loops and preventing human automation complacency.',
        overviewLessons: [
          {
            title: 'Model Cascading, Prompt Caching & Loop Caps',
            kind: 'lesson',
            summary: 'Cutting inference spend without degrading task completion.',
          },
          {
            title: 'Verification-First HITL UX for High-Stakes Workflows',
            kind: 'video',
            summary: 'Reversible vs. irreversible action thresholds and inline citations.',
          },
        ],
      },
      {
        title: 'AI Strategy & Model Build-or-Buy',
        description:
          'Knowing when fine-tuning hurts freshness and how to frame empirical bake-offs.',
        overviewLessons: [
          {
            title: 'The AI PM Architecture Decision Ladder',
            kind: 'lesson',
            summary: 'Prompting/Tools -> Hybrid RAG -> Distilled Fine-Tuning.',
          },
        ],
      },
    ]
  ),
  pm: buildSyllabusForRole(
    'pm',
    'Product Management Interview Prep',
    `Prepare for ${ROLES_BY_ID.pm.sampleCompanies.join(', ')} PM rounds: 0→1 product sense, root-cause metric diagnosis, two-sided marketplace guardrails, and platform strategy.`,
    [
      'Sharp persona segmentation & 10x core-loop product sense',
      'Systematic root-cause diagnosis for sudden metric drops',
      'North Star + counter-guardrail metric hierarchies',
      'Horizontal API vs. vertical suite strategic trade-offs',
    ],
    [
      {
        title: 'Product Sense & 0→1 Design',
        description:
          'Framing user segments, isolating highest-leverage friction, and building closed-loop workflows.',
        overviewLessons: [
          {
            title: 'PM Product Sense Structure in the AI Era',
            kind: 'lesson',
            summary: 'Clarify goal -> Segment personas -> Pain -> 10x loop -> Guardrails.',
          },
          {
            title: 'Mock Walkthrough: Support Noise to Prioritized Linear Tickets',
            kind: 'video',
            summary: 'Connecting revenue weight and customer loop-closure.',
          },
        ],
      },
      {
        title: 'Execution, Metrics & Root-Cause Diagnosis',
        description:
          'Debugging -14% WoW retention drops cleanly and preventing marketplace disintermediation.',
        overviewLessons: [
          {
            title: '5-Step Funnel & Telemetry Bisection Checklist',
            kind: 'lesson',
            summary: 'Sanity check -> Internal vs. External -> Cohort slices -> Rollback gates.',
          },
          {
            title: 'Two-Sided Marketplace Metrics & Anti-Gaming',
            kind: 'video',
            summary: 'Liquidity, fill rate, and off-platform leakage protection.',
          },
        ],
      },
      {
        title: 'Product Strategy & Platform Moats',
        description:
          'Navigating GTM mismatch and horizontal vs. vertical sequencing.',
        overviewLessons: [
          {
            title: 'Rubric for Staff & Senior PM Strategy Rounds',
            kind: 'lesson',
            summary: 'Articulating explicit kill/commit triggers over hand-waving.',
          },
        ],
      },
    ]
  ),
  operations: buildSyllabusForRole(
    'operations',
    'Strategy & Operations (BizOps) Prep',
    `Excel in ${ROLES_BY_ID.operations.sampleCompanies.join(', ')} BizOps & Operations loops: funnel bottleneck triage, international unit economics, incentive design, and COO WBRs.`,
    [
      'Wait-time vs. touch-time decomposition across onboarding',
      'International staffing & GDPR/EEA margin modeling',
      'Anti-Goodhart incentive scorecards & quality gates',
      'Designing a crisp 7-metric Monday WBR dashboard',
    ],
    [
      {
        title: 'Throughput Bottlenecks & Capacity Math',
        description:
          'Fixing exploding enterprise onboarding timelines under 3x bookings growth.',
        overviewLessons: [
          {
            title: 'Queue Theory for BizOps: Wait Time vs. Touch Time',
            kind: 'lesson',
            summary: 'Why hiring headcount alone misses an 8-week turnaround target.',
          },
          {
            title: 'Sales-to-Ops Ready Gates & Tiered Clinics',
            kind: 'video',
            summary: 'Clearing $4.2M unactivated ARR backlogs sustainably.',
          },
        ],
      },
      {
        title: 'Unit Economics & Incentive Design',
        description:
          'Protecting gross margin in Europe and stopping bonus-driven launch churn.',
        overviewLessons: [
          {
            title: 'Preventing Goodhart’s Law in Deployment Compensation',
            kind: 'lesson',
            summary: 'Pairing speed targets with Day-60 healthy retention gates.',
          },
          {
            title: 'EU Expansion P&L & EEA Nearshore Hub Modeling',
            kind: 'video',
            summary: 'Balancing data residency compliance with >50% gross margin.',
          },
        ],
      },
      {
        title: 'Executive Operating Cadence (WBR)',
        description:
          'Selecting 7 leading/lagging metrics with clear owners and red-flag playbooks.',
        overviewLessons: [
          {
            title: 'How to Run an Amazon-Style Data-First WBR',
            kind: 'lesson',
            summary: 'Exception-based reviews with pre-approved red-flag triggers.',
          },
        ],
      },
    ]
  ),
  pgm: buildSyllabusForRole(
    'pgm',
    'Program Manager (TPM) Prep',
    `Nail ${ROLES_BY_ID.pgm.sampleCompanies.join(', ')} Program & Technical Program Management rounds: GA war rooms, multi-region migrations, exec pushback, and scaling eng rhythms.`,
    [
      'Critical-path war rooms & smart Cut-Line scoping',
      'Zero-downtime Strangler Fig & Shadow Replay migrations',
      'Deflecting mid-quarter VP scope creep with 3-option menus',
      'Async-first governance from 40 to 250 builders',
    ],
    [
      {
        title: 'War Rooms & Critical-Path Launch Gates',
        description:
          'Managing T-3 weeks Legal + Load crises without slipping keynote dates or breaking compliance.',
        overviewLessons: [
          {
            title: 'Cut-Lines Over Heroics: How Great PgMs Save Launches',
            kind: 'lesson',
            summary: 'Region gating, progressive rollouts, and single-threaded DRIs.',
          },
          {
            title: 'Multi-Team Dependency DAGs & Shadow Parity',
            kind: 'video',
            summary: 'Migrating 10 design partners with zero customer downtime.',
          },
        ],
      },
      {
        title: 'Executive Pushback & Scaling Governance',
        description:
          'Saying no constructively to VPs and killing status-meeting sprawl.',
        overviewLessons: [
          {
            title: 'The 3-Option Trade-Off Memo for Scope Creep',
            kind: 'lesson',
            summary: 'Separating investor demos from production GA commitments.',
          },
          {
            title: 'Tiered Launch Readiness (T1/T2/T3) at 250+ Scale',
            kind: 'video',
            summary: 'Measuring maker-time preservation alongside schedule variance.',
          },
        ],
      },
      {
        title: 'TPM Behavioral & Ownership Stories',
        description:
          'Framing high-stakes cross-team rescues with clear personal decisions.',
        overviewLessons: [
          {
            title: 'Bar-Raiser Checklist for Program Management Loops',
            kind: 'lesson',
            summary: 'Proving crisp personal authority without formal reporting lines.',
          },
        ],
      },
    ]
  ),
  consulting: buildSyllabusForRole(
    'consulting',
    'Management Consulting Case Prep',
    `Crush ${ROLES_BY_ID.consulting.sampleCompanies.join(', ')} case & executive communication loops: MECE issue trees, SaaS+Services profitability, market sizing, and 60s Pyramid synthesis.`,
    [
      'Custom MECE issue trees tailored to tech & AI economics',
      'SaaS vs. Services mix-shift profitability math',
      'Bottom-up & top-down market sizing with sanity checks',
      'Answer-First 60-second Pyramid Principle CEO pitches',
    ],
    [
      {
        title: 'MECE Structuring & Profitability Cases',
        description:
          'Diagnosing EBITDA collapse despite +25% top-line growth using clean revenue-mix math.',
        overviewLessons: [
          {
            title: 'Custom Issue Trees vs. Memorized Frameworks',
            kind: 'lesson',
            summary: 'Why partners penalize generic 4P/3C dumps immediately.',
          },
          {
            title: 'SaaS + Services Mix-Shift Profitability Walkthrough',
            kind: 'video',
            summary: 'Calculating blended gross margin drag and turnaround levers.',
          },
        ],
      },
      {
        title: 'Market Sizing & Strategic Build-vs-Buy',
        description:
          'Writing clean algebraic sizing formulas upfront and running realistic sanity checks.',
        overviewLessons: [
          {
            title: 'Market Sizing Rules: Equation First, Round Math Always',
            kind: 'lesson',
            summary: 'Separating total freight GMV from capturable AI software spend.',
          },
          {
            title: 'Build vs. Buy vs. Partner in Regulated Industries',
            kind: 'video',
            summary: 'Weighing 12-month time-to-value against long-term IP moats.',
          },
        ],
      },
      {
        title: '60-Second Pyramid Principle Synthesis',
        description:
          'Delivering Answer-First executive recommendations under skeptical CEO interruptions.',
        overviewLessons: [
          {
            title: 'Governing Thought -> 3 Quantified Pillars -> Next Ask',
            kind: 'lesson',
            summary: 'Replacing chronological investigation stories with crisp synthesis.',
          },
        ],
      },
    ]
  ),
};
