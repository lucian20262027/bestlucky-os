import { PERSONA_CONFIGS, ROLES_BY_ID, ROUND_LABELS } from './roles';
import {
  ChatMessage,
  CustomLoopPlan,
  DiagramEdge,
  DiagramNode,
  InterviewQuestion,
  InterviewerPersona,
  LanguageMode,
  RewriteSuggestion,
  RoleTrack,
  RoundType,
  RubricDimension,
  SessionEvaluation,
} from './types';

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(val * 10) / 10));
}

function summarizeNotesSnippet(scratchpad: string): string | null {
  const cleaned = scratchpad
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^\d+\.\s+[A-Z]/.test(l) && l.length > 18);
  if (cleaned.length === 0) return null;
  const line = cleaned[cleaned.length - 1];
  return line.length > 90 ? `${line.slice(0, 87)}...` : line;
}

export function generateLocalInterviewerReply(params: {
  question: InterviewQuestion;
  persona: InterviewerPersona;
  messages: ChatMessage[];
  scratchpad: string;
  diagramSummary: string;
  language: LanguageMode;
  nudgeMode?: 'clarify' | 'pushback' | 'nudge' | 'drill';
}): { reply: string; stageLabel: string } {
  const { question, persona, messages, scratchpad, diagramSummary, language, nudgeMode } = params;
  const candidateTurns = messages.filter((m) => m.sender === 'candidate');
  const turnCount = candidateTurns.length;
  const lastCandidateText = candidateTurns[turnCount - 1]?.text ?? '';
  const personaCfg = PERSONA_CONFIGS[persona];
  const noteSnippet = summarizeNotesSnippet(scratchpad);

  const isZh = language === 'zh';
  const isBilingual = language === 'bilingual';

  if (nudgeMode === 'clarify') {
    const step0 = question.frameworkSteps[0] ?? 'Clarify scope, SLA, and exact buyer/user constraints.';
    return {
      stageLabel: 'Clarifying Assumptions',
      reply: isZh
        ? `【${personaCfg.labelZh}】好的，在我补充条件之前，你最应该先向我确认这几个关键约束：\n1) ${step0}\n2) 这次落地最重要的成功指标和时间底线是什么？\n请基于你假设的条件先给出结构化拆解。`
        : `[${personaCfg.label}] Good instinct to clarify first. Assume standard enterprise constraints: 90-day target ROI window, strict PII/audit compliance, and no multi-quarter core rewrite.\n\nAnchor on: ${step0}\n\nWhat is your structured plan from here?${
            isBilingual ? `\n\n💡 中文提示：先对齐硬约束与验收标准，再展开你的 3-4 层结构树。` : ''
          }`,
    };
  }

  if (nudgeMode === 'nudge') {
    const nextStep =
      question.frameworkSteps[Math.min(turnCount, question.frameworkSteps.length - 1)] ??
      question.strongHireSignals[0];
    return {
      stageLabel: 'Tactical Nudge',
      reply: isZh
        ? `【教练提示】你可以往这个高分信号切入：${nextStep}\n试着用“先结论后分点 + 具体指标/取舍”组织下一段回答。`
        : `[Tactical Nudge] Consider addressing this high-signal dimension next:\n→ ${nextStep}\n\nTry framing your next response with one concrete metric, owner, or trade-off.${
            isBilingual ? `\n\n💡 中文提示：${question.promptZhHint}` : ''
          }`,
    };
  }

  if (nudgeMode === 'drill') {
    const probe = question.followUpProbes[0] ?? 'Give me a sharper 60-second synthesis with concrete numbers and trade-offs.';
    return {
      stageLabel: 'Focused Weak-Spot Drill',
      reply: isZh
        ? `【专项加练】让我们直接针对薄弱环节重练这一问（尽量控制在 3 分钟内、带具体数字与取舍）：\n\n"${probe}"`
        : `[3-Min Focused Drill] Let’s sharpen your weakest signal right now. Answer concisely with numbers, explicit trade-offs, and ownership:\n\n"${probe}"`,
    };
  }

  if (nudgeMode === 'pushback' || turnCount === 2) {
    const probe =
      question.followUpProbes[0] ??
      'What happens when your primary assumption breaks under real customer pressure?';
    const noteRef = noteSnippet
      ? `I noticed in your scratchpad: "${noteSnippet}". `
      : '';
    return {
      stageLabel: 'Deep Probe #1',
      reply: isZh
        ? `【${personaCfg.labelZh}追问】${noteRef}你的整体框架有了，但我想再往深挖一层现实阻力：\n\n${probe}`
        : `[${personaCfg.label}] ${noteRef}Your high-level framing is clear, now let’s stress-test it against production reality:\n\n${probe}${
            isBilingual ? '\n\n💡 中文提示：别只讲理想流程，明确说明取舍(Trade-off)和兜底方案。' : ''
          }`,
    };
  }

  if (turnCount === 1) {
    const hasNumbers = /\d+%|\$\d+|\d+\s*(day|week|month|hour|sec|ms|k|m)/i.test(lastCandidateText);
    const hasStructure = /1\.|first|second|step|pillar|branch|phase/i.test(lastCandidateText);
    const feedback = !hasStructure
      ? 'Start by numbering your framework explicitly so I can track your structure. '
      : !hasNumbers
        ? 'Your structure is clean—now anchor it with concrete targets, SLAs, or rough math. '
        : 'Strong structured opening with concrete scoping. ';
    const diagramNote =
      diagramSummary && diagramSummary !== 'No diagram blocks yet.'
        ? `I also see your architecture/flow blocks (${diagramSummary.split('\n')[0]}). `
        : '';
    const step2 = question.frameworkSteps[1] ?? question.strongHireSignals[0];
    return {
      stageLabel: 'Framework & Execution Depth',
      reply: isZh
        ? `【${personaCfg.labelZh}】框架收到。${diagramNote}请继续展开最关键的执行细节与风险边界（提示方向：${step2}），并说明你会监控哪 2 个核心指标。`
        : `[${personaCfg.label}] ${feedback}${diagramNote}Walk me deeper into the hardest execution bottleneck here—specifically:\n→ ${step2}\n\nAnd which 2 metrics tell you within 2 weeks whether this is actually working?`,
    };
  }

  if (turnCount === 3) {
    const probe2 =
      question.followUpProbes[1] ??
      'How do you align conflicting stakeholders while protecting your launch timeline?';
    return {
      stageLabel: 'Curveball / Trade-off Probe',
      reply: isZh
        ? `【${personaCfg.labelZh}压力测试】假设情况恶化：\n\n${probe2}\n\n你会如何拍板？`
        : `[${personaCfg.label}] Let’s inject a realistic curveball:\n\n${probe2}\n\nWhat exact call do you make, and what do you explicitly de-prioritize?`,
    };
  }

  if (turnCount >= 4) {
    const probe3 =
      question.followUpProbes[2] ??
      'Give me your 60-second executive synthesis: headline recommendation, top 2 numbers, and biggest risk.';
    return {
      stageLabel: 'Executive Synthesis',
      reply: isZh
        ? `【最终收口】时间快到了。请给我一个 60 秒高层总结：核心结论 + 2 个关键指标 + 最大风险与对策。完成后点击右上角 **Evaluate & Score** 生成完整评估报告。`
        : `[${personaCfg.label}] We’re near the end of this round. Give me your crisp 60-second executive close:\n\n${probe3}\n\n(When ready, click **Evaluate & Score** in the top bar for your full rubric breakdown and rewrites.)`,
    };
  }

  return {
    stageLabel: 'Opening Prompt',
    reply: `[${personaCfg.label}] Ready when you are. Walk me through your structured approach to: "${question.title}".`,
  };
}

export function evaluateSessionLocally(params: {
  question: InterviewQuestion;
  messages: ChatMessage[];
  scratchpad: string;
  diagramNodes: DiagramNode[];
  diagramEdges: DiagramEdge[];
  durationSec: number;
  language: LanguageMode;
}): SessionEvaluation {
  const { question, messages, scratchpad, diagramNodes, diagramEdges, language } = params;
  const candidateMsgs = messages.filter((m) => m.sender === 'candidate');
  const candidateCombined = candidateMsgs.map((m) => m.text).join('\n');
  const allCandidateEvidence = `${candidateCombined}\n${scratchpad}`.trim();
  const wordCount = candidateCombined.split(/\s+/).filter(Boolean).length;
  const noteWordCount = scratchpad.split(/\s+/).filter(Boolean).length;

  // Signal detection heuristics
  const hasStructure =
    /(\b1\.|\b2\.|\bfirst|\bsecond|\bthird|\bmece|\bpillar|\bphase|\b30-60-90|\bsituation|\btask|\baction|\bresult|第一步|首先|其次|总结)/i.test(
      allCandidateEvidence
    );
  const hasClarification =
    /(\bclarif|\bassum|\bscope|\bconstraint|\bsla|\bbudget|\btimeline|假设|前提|边界|范围)/i.test(
      allCandidateEvidence
    );
  const hasNumbers =
    /(\d+%|\$\d+|\d+x|\b\d+\s*(days?|weeks?|months?|hrs?|hours?|mins?|ms|sec|k|m|b)\b|\d+\s*(天|周|月|小时|%|万|百万))/i.test(
      allCandidateEvidence
    );
  const hasTradeoffs =
    /(\btrade-?off|\bvs\.?|\balternative|\brisk|\bmitigat|\bfallback|\bcut-?line|\bguardrail|\binstead|\bprioritiz|取舍|权衡|风险|兜底|降级|回滚)/i.test(
      allCandidateEvidence
    );
  const hasStakeholderCustomer =
    /(\bcustomer|\bclient|\bcfo|\bvp\b|\blegal|\binfosec|\bengineer|\bfde|\buser|\bdispatcher|\boperator|\bstakeholder|客户|老板|法务|安全|工程|运营)/i.test(
      allCandidateEvidence
    );
  const hasMetrics =
    /(\bmetric|\bkpi|\bnorth star|\bguardrail|\beval|\brecall|\bprecision|\blatency|\broi|\bebitda|\bmargins?|\bchurn|\bactivation|\bnrr|\bwbr|指标|评测|留存|毛利|转化率)/i.test(
      allCandidateEvidence
    );
  const hasDiagram = diagramNodes.length >= 3;

  const baseSignalBonus = Math.min(0.8, candidateMsgs.length * 0.25) + (wordCount > 120 ? 0.3 : 0);

  const framingScore = clamp(
    2.2 + (hasStructure ? 1.1 : 0) + (hasClarification ? 0.7 : 0) + baseSignalBonus * 0.6 + (noteWordCount > 35 ? 0.3 : 0),
    1.5,
    4.9
  );
  const tradeoffScore = clamp(
    2.0 + (hasTradeoffs ? 1.2 : 0) + (hasDiagram ? 0.5 : 0) + (diagramEdges.length >= 2 ? 0.3 : 0) + baseSignalBonus * 0.6,
    1.5,
    4.9
  );
  const executionScore = clamp(
    2.0 + (hasMetrics ? 1.0 : 0) + (hasNumbers ? 0.9 : 0) + baseSignalBonus * 0.6,
    1.5,
    4.9
  );
  const stakeholderScore = clamp(
    2.2 + (hasStakeholderCustomer ? 1.1 : 0) + (hasClarification ? 0.4 : 0) + baseSignalBonus * 0.6,
    1.5,
    4.9
  );
  const commScore = clamp(
    2.3 + (hasStructure ? 0.8 : 0) + (wordCount >= 60 && wordCount <= 550 ? 0.7 : 0.2) + baseSignalBonus * 0.6,
    1.5,
    4.9
  );

  const overallScore = clamp(
    (framingScore + tradeoffScore + executionScore + stakeholderScore + commScore) / 5,
    1.5,
    4.9
  );

  let verdict: SessionEvaluation['verdict'] = 'Lean Hire';
  if (overallScore >= 4.2) verdict = 'Strong Hire';
  else if (overallScore >= 3.5) verdict = 'Hire';
  else if (overallScore >= 2.7) verdict = 'Lean Hire';
  else verdict = 'No Hire';

  const dimensions: RubricDimension[] = [
    {
      key: 'framing_mece',
      label: 'Problem Framing & MECE Structure',
      labelZh: '问题拆解与 MECE 结构',
      score: framingScore,
      evidence: hasStructure
        ? 'Used explicit numbered structure / multi-branch framing across response or notes.'
        : 'Answer jumped into details without upfront numbered pillars or explicit scoping assumptions.',
      advice: hasClarification
        ? 'Keep leading with a 15-second scope lock before diving into branch 1.'
        : 'State 2-3 upfront clarifying assumptions (buyer, timeline, hard constraint) before presenting your tree.',
    },
    {
      key: 'tradeoff_depth',
      label: 'Technical / Strategic Trade-offs',
      labelZh: '技术与战略权衡深度',
      score: tradeoffScore,
      evidence: hasTradeoffs
        ? 'Explicitly weighed alternatives, fallback paths, or scope cut-lines.'
        : 'Limited explicit discussion of what you would NOT build or how to mitigate failure modes.',
      advice: hasDiagram
        ? 'Good use of visual blocks—also state failure fallback paths for your highest-risk edge.'
        : 'Add 3-5 blocks on the Architecture/Flow Board and explicitly contrast Option A vs. Option B.',
    },
    {
      key: 'execution_metrics',
      label: 'Execution, Metrics & Quantification',
      labelZh: '执行落地与定量指标',
      score: executionScore,
      evidence:
        hasNumbers && hasMetrics
          ? 'Anchored recommendations with concrete targets, thresholds, or financial math.'
          : 'Missing quantified thresholds, unit-economics checks, or paired guardrail metrics.',
      advice:
        'Attach 1 North Star metric + 1 counter-guardrail + 1 numeric threshold (e.g., <0.85 confidence -> HITL) to every proposal.',
    },
    {
      key: 'customer_stakeholder',
      label: 'Customer & Stakeholder Judgment',
      labelZh: '客户洞察与跨团队协同',
      score: stakeholderScore,
      evidence: hasStakeholderCustomer
        ? 'Factored in concrete stakeholder incentives (client ops, CFO, InfoSec, or Core Eng).'
        : 'Focused mostly on abstract solution mechanics with thin stakeholder incentive analysis.',
      advice:
        'Name the exact buyer vs. daily operator and state how you unblock conflicting incentives.',
    },
    {
      key: 'communication_conciseness',
      label: 'Executive Synthesis & Conciseness',
      labelZh: '表达清晰度与高层总结',
      score: commScore,
      evidence:
        wordCount < 45
          ? 'Very brief response—hard for an interviewer to award senior/staff signal without fuller rationale.'
          : 'Maintained conversational cadence; tighten openings with Answer-First headline summaries.',
      advice:
        'End every round with a 3-sentence Pyramid summary: Headline Decision -> 2 Quantified Reasons -> Top Risk Mitigation.',
    },
  ];

  const weakestDim = [...dimensions].sort((a, b) => a.score - b.score)[0];

  const strengths: string[] = [];
  if (hasStructure) strengths.push('Structured multi-step breakdown made your reasoning easy to follow.');
  if (hasNumbers) strengths.push('Used concrete numbers/timelines instead of purely qualitative claims.');
  if (hasTradeoffs) strengths.push('Demonstrated awareness of trade-offs, guardrails, or fallback mitigation.');
  if (hasDiagram) strengths.push(`Mapped ${diagramNodes.length} visual architecture/workflow blocks on the board.`);
  if (strengths.length === 0) {
    strengths.push('Completed an active practice turn under interview prompt constraints.');
  }

  const missingSignals: string[] = [];
  if (!hasClarification) missingSignals.push('Upfront scope & constraint clarification (SLA, security, budget, timeline).');
  if (!hasNumbers || !hasMetrics) missingSignals.push('Quantified KPI thresholds + counter-guardrails to prevent metric gaming.');
  if (!hasTradeoffs) missingSignals.push('Explicit "What we cut / Option A vs. B" trade-off framing.');
  question.strongHireSignals.slice(0, 2).forEach((sig) => {
    const keyword = sig.split(' ').slice(0, 3).join(' ').toLowerCase();
    if (!allCandidateEvidence.toLowerCase().includes(keyword.replace(/[^a-z0-9 ]/g, ''))) {
      missingSignals.push(`Role Signal: ${sig}`);
    }
  });

  const sampleExcerpt =
    candidateMsgs[0]?.text.slice(0, 140) ||
    'We can build an AI pipeline to automate the workflow and check results with metrics.';
  const roleLabel = ROLES_BY_ID[question.role]?.shortLabel ?? question.role.toUpperCase();

  const rewrites: RewriteSuggestion[] = [
    {
      originalExcerpt: sampleExcerpt + (candidateMsgs[0]?.text.length > 140 ? '...' : ''),
      issue: 'Needs tighter Answer-First scoping, quantified SLA target, and explicit guardrail boundary.',
      strongHireRewrite:
        `"For a ${roleLabel} loop, I’ll anchor on a 30-day vertical slice first: (1) Lock hard constraints & baseline SLA, (2) Separate deterministic business rules from probabilistic AI calls with a <0.85 confidence HITL fallback, and (3) Track primary outcome KPI alongside a strict zero-regression guardrail."`,
    },
    {
      originalExcerpt:
        candidateMsgs[1]?.text.slice(0, 140) ||
        'If stakeholders disagree or accuracy drops, we will communicate and fix it quickly.',
      issue: 'Too reactive/generic; Strong Hire candidates bring pre-built trade-off options and bisection steps.',
      strongHireRewrite:
        `"Instead of a blanket yes/no, I’d run a 2-hour critical-path audit and present a 3-option menu—protecting the core SLA while gating risky edge cases behind feature flags and replay evals."`,
    },
  ];

  const summary =
    language === 'zh'
      ? `【本地教练评分引擎】综合得分 ${overallScore}/5.0（${verdict}）。你在「${weakestDim.labelZh}」还有最大提分空间（${weakestDim.score}/5.0）。建议立刻点击下方「针对最弱维度加练 3 分钟」把该项拉高到 4.2+。`
      : `Local Coach Rubric Score: ${overallScore}/5.0 (${verdict}). Your highest-leverage improvement area is "${weakestDim.label}" (${weakestDim.score}/5.0). Run a 3-minute targeted drill below to lock in Strong Hire signals.`;

  return {
    overallScore,
    verdict,
    summary,
    dimensions,
    strengths: strengths.slice(0, 4),
    missingSignals: missingSignals.slice(0, 4),
    rewrites,
    recommendedDrillFocus: `${weakestDim.label}: ${weakestDim.advice}`,
    engineMode: 'local_fallback',
  };
}

export function generateLocalCustomLoop(params: {
  resumeText: string;
  jdText: string;
  role: RoleTrack;
  company: string;
  round: RoundType;
  language: LanguageMode;
}): CustomLoopPlan {
  const { resumeText, jdText, role, company, round } = params;
  const roleCfg = ROLES_BY_ID[role];
  const jdLower = jdText.toLowerCase();
  const resumeLower = resumeText.toLowerCase();

  const keywordCatalog = [
    { kw: 'rag', label: 'RAG & Retrieval Architecture' },
    { kw: 'eval', label: 'AI Evals & Golden Datasets' },
    { kw: 'erp', label: 'Legacy ERP / Enterprise Integration' },
    { kw: 'sql', label: 'SQL & Data Diagnostics' },
    { kw: 'python', label: 'Python / API Production Systems' },
    { kw: 'roi', label: 'CFO ROI & Pilot-to-ARR Conversion' },
    { kw: 'unit economics', label: 'Unit Economics & Margin Modeling' },
    { kw: 'gross margin', label: 'COGS & Gross Margin Optimization' },
    { kw: 'hitl', label: 'Human-in-the-Loop (HITL) UX' },
    { kw: 'wbr', label: 'WBR Operating Cadence & KPIs' },
    { kw: 'critical path', label: 'Critical Path & Dependency Management' },
    { kw: 'mece', label: 'MECE & Pyramid Principle Synthesis' },
    { kw: 'stakeholder', label: 'Cross-Functional Executive Alignment' },
    { kw: 'security', label: 'Enterprise Security / SOC2 / HIPAA' },
    { kw: 'onboarding', label: 'Enterprise Onboarding & Time-to-Value' },
  ];

  const jdMatched = keywordCatalog.filter((item) => jdLower.includes(item.kw));
  const matchedStrengths: string[] = [];
  const capabilityGaps: string[] = [];

  for (const item of jdMatched) {
    if (resumeLower.includes(item.kw)) {
      matchedStrengths.push(`Verified overlap on ${item.label} (present in both your resume & JD).`);
    } else {
      capabilityGaps.push(`JD emphasizes "${item.label}" — prepare a concrete metric or mini-architecture story to cover this gap.`);
    }
  }

  if (matchedStrengths.length === 0) {
    matchedStrengths.push(`Cross-functional ${roleCfg.shortLabel} problem solving & 0→1 execution framing.`);
    matchedStrengths.push(`Bridging technical feasibility with executive business outcomes.`);
  }
  if (capabilityGaps.length === 0) {
    capabilityGaps.push(`Sharpen company-specific ${company} numbers, failure edge cases, and 60-second Pyramid closes.`);
  }

  const overlapRatio =
    jdMatched.length > 0
      ? jdMatched.filter((i) => resumeLower.includes(i.kw)).length / jdMatched.length
      : 0.65;
  const matchScore = Math.round(58 + overlapRatio * 34);

  const companyName = company.trim() || roleCfg.sampleCompanies[0];
  const topFocus1 = jdMatched[0]?.label ?? roleCfg.coreCompetencies[0];
  const topFocus2 = jdMatched[1]?.label ?? roleCfg.coreCompetencies[1];
  const topFocus3 = jdMatched[2]?.label ?? roleCfg.coreCompetencies[2];
  const nowISO = new Date().toISOString();
  const baseId = `custom-${Date.now()}`;

  const questions: InterviewQuestion[] = [
    {
      id: `${baseId}-1`,
      role,
      secondaryRoles: ['fdpm', 'consulting'].filter((r) => r !== role) as RoleTrack[],
      round,
      difficulty: 'senior',
      timeLimitMin: 35,
      companyStyle: `${companyName} Custom Loop`,
      title: `${companyName}: End-to-End ${topFocus1} Case`,
      prompt: `At ${companyName}, a flagship customer asks for a 60-day rollout centered on ${topFocus1}. Based on the target JD, decompose the system/business bottlenecks, propose your architecture or operating plan, and define how you prove ROI by Day 45.`,
      promptZhHint: `【定制题提示】结合 ${companyName} 的 ${roleCfg.shortLabel} JD：重点展示 ${topFocus1} 与 ${topFocus2} 的串联落地，用具体数字和 30-60-90 切片给出可执行方案。`,
      frameworkSteps: roleCfg.defaultScratchpadSections,
      strongHireSignals: [
        `Directly connects ${topFocus1} to measurable customer/business KPIs.`,
        'Slices a realistic 30-60-90 rollout rather than a vague 12-month wish list.',
        'Builds deterministic safety/quality guardrails into Day-1 delivery.',
      ],
      redFlags: [
        'Generic textbook answer disconnected from enterprise constraints.',
        'No quantified metrics or fallback mechanism.',
      ],
      followUpProbes: [
        `Halfway through the ${companyName} rollout, ${topFocus2} breaks under production load. How do you triage?`,
        'The client executive asks to double scope without moving the deadline. Frame your 3-option pushback.',
        'Summarize your recommendation for the Hiring Manager in 45 seconds.',
      ],
      isCustom: true,
      createdAt: nowISO,
    },
    {
      id: `${baseId}-2`,
      role,
      secondaryRoles: ['ai-pm', 'operations'].filter((r) => r !== role) as RoleTrack[],
      round: 'execution-metrics',
      difficulty: 'senior',
      timeLimitMin: 30,
      companyStyle: `${companyName} Execution Round`,
      title: `${companyName}: Diagnosing a Sudden Metric Drop in ${topFocus2}`,
      prompt: `Two weeks after launching a key initiative tied to ${topFocus2} at ${companyName}, your primary health metric drops 18% while customer escalations spike. Walk through your root-cause isolation, immediate mitigation, and long-term guardrail.`,
      promptZhHint: `【定制排查题】先验证数据口径，再按分段切片(新老客户/渠道/阶段)隔离瓶颈，最后给出回滚与长期防呆指标。`,
      frameworkSteps: [
        'Verify telemetry integrity and exact drop slice (cohort, segment, step).',
        'Bisect technical/data failures vs. operational/incentive bottlenecks.',
        'Deploy short-term containment + customer communication.',
        'Install automated regression / aging alerts.',
      ],
      strongHireSignals: [
        'Checks telemetry and unaffected control cohorts before assuming root cause.',
        'Separates short-term triage from structural prevention.',
      ],
      redFlags: [
        'Guesses one cause immediately without slicing the funnel.',
      ],
      followUpProbes: [
        'Engineering and Operations disagree on whether this is a product bug or customer data issue. How do you settle it in 2 hours?',
        'Which 2 counter-metrics prevent this regression from recurring?',
      ],
      isCustom: true,
      createdAt: nowISO,
    },
    {
      id: `${baseId}-3`,
      role,
      secondaryRoles: ['pgm', 'fde'].filter((r) => r !== role) as RoleTrack[],
      round: 'behavioral',
      difficulty: 'senior',
      timeLimitMin: 25,
      companyStyle: `${companyName} Behavioral / Resume Deep-Dive`,
      title: `${companyName}: Resume Deep-Dive on ${topFocus3}`,
      prompt: `Looking at your background ("${resumeText.split('\n')[0].slice(0, 90)}"), tell me about the hardest ambiguous project involving ${topFocus3} where stakeholders disagreed on direction. What did YOU specifically do, what broke, and what measurable outcome changed?`,
      promptZhHint: `【简历深挖题】紧扣你简历里的核心经历，用 STAR+L 突出“I”而不是“We”，重点强调冲突解决与最终可量化产出。`,
      frameworkSteps: [
        'Situation & Stakes (15%): Why it mattered to revenue/customers.',
        'Task & Ambiguity (10%): What only you owned.',
        'Action & Trade-offs (45%): Specific mechanisms, pushbacks, technical/ops pivots.',
        'Result & Learning (30%): Hard before/after numbers + how you would play it differently today.',
      ],
      strongHireSignals: [
        'Sharp personal ownership ("I designed...", "I pushed back...").',
        'Real numbers and an honest reflection on what broke or could be faster.',
      ],
      redFlags: [
        'Vague "we collaborated nicely" storytelling with zero tension or metrics.',
      ],
      followUpProbes: [
        'If you had half the engineering capacity on that project, what would you cut first?',
        'What did your toughest critic on that team say about your decision?',
      ],
      isCustom: true,
      createdAt: nowISO,
    },
    {
      id: `${baseId}-4`,
      role,
      secondaryRoles: ['consulting', 'pm'].filter((r) => r !== role) as RoleTrack[],
      round: 'case-strategy',
      difficulty: 'staff',
      timeLimitMin: 30,
      companyStyle: `${companyName} Strategy & Trade-offs`,
      title: `${companyName}: Build vs. Bespoke vs. Scale Trade-Off`,
      prompt: `${companyName} has an opportunity to close a major enterprise expansion if you commit custom engineering/ops work around ${topFocus1}. How do you evaluate whether to take the deal, isolate the custom scope, and protect long-term product leverage and gross margin?`,
      promptZhHint: `【战略权衡题】把单笔大单的现金流诱惑放到平台复用度、毛利率和交付产能里算总账，设计“边界隔离+分层定价”的双赢方案。`,
      frameworkSteps: [
        'Quantify strategic value (ARR, lighthouse logo, repeatable TAM pull) vs. delivery cost.',
        'Draw clean architectural/operational boundary to avoid polluting core.',
        'Structure commercial terms & exit criteria to protect margin.',
      ],
      strongHireSignals: [
        'Protects core leverage and gross margin without reflexively turning down strategic revenue.',
      ],
      redFlags: [
        'Binary yes/no without commercial or architectural isolation options.',
      ],
      followUpProbes: [
        'What specific KPI after 90 days proves this custom bet should graduate to core?',
        'Give me your 45-second CEO recommendation.',
      ],
      isCustom: true,
      createdAt: nowISO,
    },
    {
      id: `${baseId}-5`,
      role,
      secondaryRoles: ['ai-pm', 'fdpm'].filter((r) => r !== role) as RoleTrack[],
      round: ROUND_LABELS[round] ? round : 'decomposition',
      difficulty: 'core',
      timeLimitMin: 20,
      companyStyle: `${companyName} Rapid Synthesis`,
      title: `${companyName}: 60-Second Role Pitch & First-90-Day Plan`,
      prompt: `Imagine you join ${companyName} as ${roleCfg.label} on Monday. Based on this JD and your resume, pitch your First-90-Day Blueprint to the VP: what you diagnose in Days 1–15, what high-leverage win you ship by Day 45, and what structural system you leave behind by Day 90.`,
      promptZhHint: `【压轴 90 天入职蓝图】展示你已经看透了这个岗位的核心痛点：前15天听一线客户/看真实数据，45天拿下1个可量化标杆胜利，90天把机制和复用飞轮立起来。`,
      frameworkSteps: [
        'Days 1-15 (Listen & Baseline): Shadow live customers/deployments, audit top failure modes & unit economics.',
        'Days 16-45 (Ship 1 High-Leverage Wedge): Pick 1 bottleneck/pilot and move a visible metric fast.',
        'Days 46-90 (Systematize & Scale): Turn lessons into reusable core primitives, evals, or WBR cadence.',
      ],
      strongHireSignals: [
        'Connects past resume strengths directly to the exact JD pain points.',
        'Avoids arrogant "I will change everything on Day 1"—balances fast listening with decisive Day-45 execution.',
      ],
      redFlags: [
        'Generic 30-60-90 fluff that could apply to any job at any company.',
      ],
      followUpProbes: [
        'What is the biggest blind spot you expect to discover in Week 1 at this company?',
        'How will we know at Day 90 that hiring you was a clear 10x win?',
      ],
      isCustom: true,
      createdAt: nowISO,
    },
  ];

  return {
    id: baseId,
    company: companyName,
    role,
    round,
    matchScore,
    matchedStrengths,
    capabilityGaps,
    prepPlan: [
      {
        phase: 'Days 1–2 · Gap & Framework Lock',
        focus: `Master ${roleCfg.shortLabel} mental model + address gap: ${capabilityGaps[0] ?? topFocus1}`,
        deliverables: [
          `Review ${roleCfg.shortLabel} Playbook & 30-sec opener`,
          `Adapt 2 STAR+L stories specifically for ${companyName}`,
        ],
      },
      {
        phase: 'Days 3–5 · Timed Mock & Diagram Sprints',
        focus: `Run 3 timed mocks on ${topFocus1} and ${topFocus2} using Architecture/Flow Board`,
        deliverables: [
          'Score >= 4.0/5.0 on Problem Framing & Metrics',
          'Drill weakest rubric dimension for 3 mins after each mock',
        ],
      },
      {
        phase: 'Days 6–7 · Executive Pushback & Synthesis Polish',
        focus: 'Pressure-test under Bar-Raiser / MBB Partner persona',
        deliverables: [
          'Record 60-second Pyramid Principle close under time pressure',
          'Review custom JD cheat sheet 2 hours before loop',
        ],
      },
    ],
    questions,
    engineMode: 'local_fallback',
    createdAt: nowISO,
  };
}
