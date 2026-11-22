import { LibraryItem, QuestionUserNotes } from './types';

export const SEED_LIBRARY_ITEMS: LibraryItem[] = [
  {
    id: 'lib-guide-fde',
    type: 'guide',
    title: 'FDE Field Deployment Fieldbook: 30-60-90 Day Legacy ERP + AI Architecture',
    role: 'fde',
    tags: ['FDE', 'ERP', '30-60-90', 'HITL'],
    summary:
      '如何在客户现场面对 40 个脏数据仓库时，用两周跑通第一个 Shadow Pilot，避免掉进“6个月大重构”陷阱。',
    contentMarkdown: `## Core FDE Principle: Vertical Slice > Master Data Rewrite
1. **Days 1–10 (Shadow Mode & Ground Truth)**
   - Shadow 2 real dispatchers for 48 hours; record the top 5 exception patterns accounting for 80% of wasted hours.
   - Build a **Canonical Shipment Event Schema** decoupling brittle SAP/Oracle/CSV connectors from core matching logic.
   - Run deterministic SQL/rule matching first; reserve LLMs strictly for unstructured PDF parsing & ambiguous exception classification.

2. **Days 11–30 (Read-Only Pilot at 2 High-Volume Hubs)**
   - Surface AI suggestions in a **Citation-First HITL Queue**: side-by-side PDF highlight + confidence badge.
   - Anything < 0.85 confidence or touching $10k+ penalties routes automatically to human approval.

3. **Days 31–90 (Controlled Write-Back & Core Graduation)**
   - Enable idempotent ERP write-back with replay regression tests.
   - Package generic connector patterns back into the core platform SDK—never fork core code per customer.`,
    durationLabel: '8 min read',
    timestamps: [],
    isFavorite: true,
    createdAt: '2026-11-18T10:00:00Z',
    updatedAt: '2026-11-18T10:00:00Z',
  },
  {
    id: 'lib-guide-aipm',
    type: 'guide',
    title: 'AI PM Masterclass: Eval Harness + Token COGS Pareto Optimization',
    role: 'ai-pm',
    tags: ['AI PM', 'Evals', 'RAG', 'COGS'],
    summary:
      '大模型产品经理面试硬核加分项：如何把 Retrieval 与 Synthesis Eval 拆开测试，并在 6 周内砍掉 60% 推理成本。',
    contentMarkdown: `## 1. Never Bundle Retrieval and Generation into One Accuracy Score
- **Retrieval Layer**: Recall@k, MRR, and **100% deterministic ACL/permission precision** (a P0 leak fails the build immediately).
- **Synthesis Layer**: Faithfulness (grounded in retrieved chunks), Citation Precision, and Refusal Calibration on unanswerable queries.
- **Judge Calibration**: Validate your LLM-as-a-Judge against 150 SME-labeled examples (target Cohen's Kappa >= 0.78).

## 2. Cutting Agent Inference COGS by 60%
1. **Profile First**: Log token burn per step (system prompt bloat, oversized chunks, runaway retries).
2. **Prefix & Semantic Caching**: Cache repeated instructions & top FAQ trajectories.
3. **Tiered Model Cascade**: Route classification/formatting to Flash-Lite; escalate only complex reasoning turns to frontier models.`,
    durationLabel: '7 min read',
    timestamps: [],
    isFavorite: true,
    createdAt: '2026-11-19T09:00:00Z',
    updatedAt: '2026-11-19T09:00:00Z',
  },
  {
    id: 'lib-guide-fdpm',
    type: 'guide',
    title: 'FDPM Playbook: Defending $1.5M Pilot-to-ARR Conversion in Front of a Skeptical CFO',
    role: 'fdpm',
    tags: ['FDPM', 'CFO ROI', '80/20 Core', 'Pricing'],
    summary:
      '如何把一线用户的“使用点赞 (CSAT)”翻译成 CFO 愿意签 $1.5M 年单的 P&L 硬收益账本。',
    contentMarkdown: `## Why CFOs Reject "Time Saved" Decks
"Saving 15 minutes per analyst does not reduce my payroll." — Always translate pilot telemetry into **Hard P&L Impact**:
1. **Cash Recovery / Leakage Stop**: Duplicate payments caught, SLA penalties avoided, DSO days reduced.
2. **Headcount Avoidance**: Absorbing 2.5x shipment/claim volume without hiring 12 new analysts.
3. **Counterfactual Control**: Compare 2 pilot regions vs. 2 matched holdout regions over 60 days to defeat seasonality objections.

## Commercial De-Risking
- Never slash SaaS license price 40% out of panic.
- Offer **Milestone-Gated Rollout Tranches** + **80/20 Platform Core** architecture commitment.`,
    durationLabel: '6 min read',
    timestamps: [],
    createdAt: '2026-11-19T14:00:00Z',
    updatedAt: '2026-11-19T14:00:00Z',
  },
  {
    id: 'lib-video-sample',
    type: 'recording',
    title: 'Self-Review Template: 60-Second Pyramid Principle & Consulting Synthesis Drill',
    role: 'consulting',
    tags: ['Video Review', 'Pyramid Principle', 'Self-Critique'],
    summary:
      '视频复盘模板：你可以直接替换或上传自己的模拟面试录像（MP4/WebM 或 YouTube/B站/飞书妙记链接），并按时间轴记下卡壳点。',
    contentMarkdown: `### How to Use Video Self-Review in LoopOS
- Upload a 2-to-15 minute screen/webcam recording of yourself answering a prompt (stored locally in IndexedDB, never uploaded to any third-party server), OR paste a YouTube / Bilibili / Loom / Lark Minutes link.
- Pause at any weak spot and click **+ Add Timestamp Note** to tag exact seconds where you rambled, forgot numbers, or skipped trade-offs.`,
    videoUrl: '',
    durationLabel: 'Template · Ready for upload',
    timestamps: [
      { id: 'ts-1', timeSec: 12, label: 'Hook: State answer-first governing thought within 15s' },
      { id: 'ts-2', timeSec: 45, label: 'Check: Did I quantify 3 MECE pillars clearly?' },
      { id: 'ts-3', timeSec: 75, label: 'Close: Crisp recommendation + top risk mitigation' },
    ],
    isFavorite: false,
    createdAt: '2026-11-20T08:00:00Z',
    updatedAt: '2026-11-20T08:00:00Z',
  },
];

export const SEED_QUESTION_NOTES: Record<string, QuestionUserNotes> = {
  'fde-01': {
    myAnswer: '',
    modelAnswer: `### Strong Hire Model Answer (FDE — 30-60-90 Logistics ERP)
**1. Lock Scope & Hard Constraints First (30s)**
- Rather than boiling the ocean across 40 warehouses on Day 1, I clarify PII/SOC2 rules, ERP write-back permissions, and pick **2 high-volume warehouses** representing 25%+ of delayed manifest volume as our 30-day wedge.

**2. Decoupled Production Architecture**
- **Connector & Canonical Schema**: Thin adapters ingest SAP, Oracle, and AS/400 CSVs into one Canonical Shipment Event schema so core logic never breaks when one hub tweaks a CSV column.
- **Deterministic vs. Probabilistic Split**: OCR/VLM extracts line items from carrier PDFs, then deterministic SQL rules match PO numbers and totals. The LLM only classifies ambiguous delay reasons and drafts resolution actions with a confidence score.
- **HITL Safety Valve**: Anything <0.85 confidence or affecting high-value freight lands in a Dispatcher Review UI with side-by-side PDF bounding-box citations and 1-click approve.

**3. 30-60-90 Rollout**
- **Days 1–30 (Shadow Mode)**: Run silently alongside dispatchers; establish baseline reconciliation hours (4h/day) & precision/recall telemetry on 500 historical manifests.
- **Days 31–60 (Read-Only Co-Pilot in 2 Hubs)**: Dispatchers verify recommendations in <30s; iterate on failure clusters.
- **Days 61–90 (Idempotent Write-Back + Scale Playbook)**: Enable guarded ERP updates with audit logs and replicate to the remaining 38 hubs in weekly waves.`,
    pitch60s:
      'I’d slice 1 workflow across 2 high-volume hubs instead of rewriting 40 ERPs. We decouple SAP/AS400 feeds via a canonical schema, run deterministic ID matching before LLM PDF extraction, gate write-backs behind a confidence-based HITL queue, and ship Shadow Mode by Day 15 before controlled write-back in Days 61–90.',
    personalNotes: 'Remember to push back immediately if interviewer asks to auto-write SAP in Week 2 without shadow validation.',
    videoUrl: '',
    updatedAt: '2026-11-20T10:00:00Z',
  },
  'fdpm-01': {
    myAnswer: '',
    modelAnswer: `### Strong Hire Model Answer (FDPM — 3 Healthcare Design Partners)
- **Uncover Common Horizontal Primitives**: Claims appeals, prior-auth fax triage, and coding copilot look different on the surface, but all 3 share **80% identical platform infrastructure**: HIPAA-compliant Clinical Doc/HL7 Ingestion → Policy/Payer Rule Graph → Evidence-Cited Review Queue → Immutable Audit Log.
- **Rank the Wedge by CFO ROI Speed**: Prior-auth & denial appeals directly recover stalled cash within 45–60 days, making it the fastest path to enterprise contract conversion vs. open-ended nurse copilot UX.
- **Sequencing**: Anchor Core Squad on the shared Ingestion + Citation Workbench + Denial/Prior-Auth Engine across Hospitals A & B; timebox a 2-week FDE spike for Hospital C to validate overlap without fracturing Core Engineering.
- **Graduation Gate**: Any FDE field adapter needed by 2+ logos graduates onto Core roadmap via a formal monthly RFC.`,
    pitch60s:
      'All three hospitals share 80% of the underlying stack—clinical doc ingestion, payer policy reasoning, and an evidence-cited HITL queue. I’d anchor Core on revenue-recovering appeals/prior-auth across Partners A and B while keeping custom EHR glue isolated in thin FDE adapters.',
    personalNotes: '',
    videoUrl: '',
    updatedAt: '2026-11-20T10:00:00Z',
  },
  'aipm-01': {
    myAnswer: '',
    modelAnswer: `### Strong Hire Model Answer (AI PM — Enterprise RAG Eval Harness)
- **Failure Taxonomy First**: Rank failures by blast radius—(P0) ACL/permission leak, (P1) Stale policy contradiction, (P1) Hallucinated synthesis, (P2) Retrieval miss, (P2) Over-refusal.
- **Stratified Golden Dataset**: Curate 300+ queries across Slack, Confluence, Jira, and Drive—including 20% adversarial ACL boundary tests and deliberately contradictory outdated-vs-current docs.
- **Decoupled Offline Metrics**: Evaluate Retrieval (Recall@5, Freshness Weighting, **100% ACL precision hard gate**) separately from Generation (Faithfulness, Citation Precision, Answer Helpfulness). Calibrate LLM-as-a-Judge against SME labels until Kappa >= 0.78.
- **Online Feedback Loop**: Track citation clicks, follow-up re-queries, and IT ticket escalation rate; auto-promote failed production traces into next week's Golden Set.`,
    pitch60s:
      'Treat ACL permission leakage as a deterministic P0 gate, separate retrieval recall from synthesis faithfulness, calibrate LLM judges against human SMEs on a 300-query stratified golden set, and pipe production escalations back into weekly regression tests.',
    personalNotes: '',
    videoUrl: '',
    updatedAt: '2026-11-20T10:00:00Z',
  },
  'pm-01': {
    myAnswer: '',
    modelAnswer: `### Strong Hire Model Answer (PM — Support Calls to Eng Tickets)
- **Persona & Core Friction**: Target 50–500 person B2B SaaS teams where Support Leads and Triage PMs lose high-ARR customer signals inside disconnected call transcripts and noisy Slack threads.
- **10x Product Loop**: (1) Auto-ingest & deduplicate complaints across Gong/Intercom/Slack into cluster themes, (2) Enrich every cluster with live CRM ARR + renewal date + churn risk, (3) 1-click Linear/Jira sync with verbatim customer clips, (4) **Auto-notify CSMs/customers when shipped** to close the retention loop.
- **North Star & Guardrail**: North Star = Weekly Shipped Roadmap Decisions Linked to Verified Customer Demand (or Triage Hours Saved). Counter-Guardrail = Auto-created Ticket Rejection/Duplicate Rate (<5%) so engineers never lose trust.`,
    pitch60s:
      'Don’t build another call summarizer—build an ARR-weighted signal deduplicator that turns support noise into verified engineering clusters and automatically closes the loop with customers when shipped, guarded by a strict <5% duplicate-ticket rejection rate.',
    personalNotes: '',
    videoUrl: '',
    updatedAt: '2026-11-20T10:00:00Z',
  },
  'ops-01': {
    myAnswer: '',
    modelAnswer: `### Strong Hire Model Answer (Operations — 18d to 47d Onboarding)
- **Decompose Wait Time vs. Touch Time**: Break the 47 days into Kickoff, InfoSec, Client Data Prep, Config, and UAT. In 3x bookings surges, 70%+ of lag is **queue wait time and dirty customer CSVs**, not engineer work hours.
- **Stop Inflow Bleed (Day 1)**: Enforce a lightweight Sales-to-Ops "Definition of Ready" (named client IT owner + sample data schema uploaded before kickoff clock starts).
- **Clear the $4.2M Backlog**: Segment accounts—Tier-1 Enterprise gets a 2-week Tiger Team; Mid-Market switches to parallelized self-serve InfoSec + automated schema validator + group office-hour clinics.
- **WBR Telemetry**: Track Stage Aging (>5d red alert), Time-to-First-Value (<20d target), and Activated ARR/week.`,
    pitch60s:
      '70% of a 47-day onboarding blowup is queue wait and dirty client handoffs, not pure staffing. I’d install a Sales-to-Ops Ready Gate to stop new inflow stalls, run InfoSec + data prep in parallel, and segment mid-market into automated clinics to clear the $4.2M backlog under 20 days.',
    personalNotes: '',
    videoUrl: '',
    updatedAt: '2026-11-20T10:00:00Z',
  },
  'pgm-01': {
    myAnswer: '',
    modelAnswer: `### Strong Hire Model Answer (PgM — GA-3 Weeks War Room)
- **Isolate Both Risks on the Critical Path**: Do not wait passively on either blocker. Split into two DRI-owned tracks: (1) Performance bisection (DB pool/lock vs. LLM rate limit vs. cache miss) + immediate load-shedding/caching fix; (2) Legal data residency containment.
- **Smart Scoping Over Binary Slip**: Propose a crisp **Cut-Line**—ship Global Keynote GA for US/Non-EU tenants behind strict tenant region flags while keeping EU in controlled beta for +10 days until subprocessor DPAs clear.
- **War Room Cadence**: Daily 15-min exception-only burn-down, automated load-test gates at T-7d and T-72h, and a 1-page Executive Option A/B Memo so leadership locks the trade-off immediately.`,
    pitch60s:
      'I’d split into two DRI tracks—bisecting the 60% load bottleneck immediately while isolating EU tenants behind a region flag so US GA hits the keynote safely without violating EU data residency.',
    personalNotes: '',
    videoUrl: '',
    updatedAt: '2026-11-20T10:00:00Z',
  },
  'cons-01': {
    myAnswer: '',
    modelAnswer: `### Strong Hire Model Answer (Consulting — EBITDA 22% → 9%)
- **MECE Hypothesis**: Revenue grew +25% ($96M → $120M), yet EBITDA dropped ~$15.6M points. Split Profit = Revenue (SaaS vs. Services Mix, Discounting) − Costs (Delivery Labor Utilization, Cloud/AI COGS, S&M CAC).
- **Root Diagnosis**: Low-margin custom implementation services outpaced 80%-GM software licenses—fixed-fee pilots suffered scope creep and low consultant utilization, dragging blended gross margin down by ~13 points.
- **3-Pillar Turnaround (+$14M–$16M EBITDA)**: (1) Productize top 3 onboarding connectors to cut implementation hours 40%, (2) Re-price custom services to T&M / capped Quickstart packages, (3) Optimize cloud/LLM COGS & focus sales incentives on multi-year SaaS net retention.
- **60s CEO Synthesis**: Answer first, 3 quantified pillars, and Day-1 scope-freeze quick win.`,
    pitch60s:
      'EBITDA collapsed from 22% to 9% despite +25% growth because low/negative-margin custom services grew faster than high-margin SaaS. Restoring 20%+ EBITDA requires three levers: capping fixed-fee bespoke scope, productizing the top 3 ERP connectors, and shifting sales comp toward pure SaaS ARR.',
    personalNotes: '',
    videoUrl: '',
    updatedAt: '2026-11-20T10:00:00Z',
  },
};

export const SAMPLE_LARK_DOC_TEXT = `# FDE & FDPM 个人高频真题复盘笔记（飞书同步示例）

## Q: 如何向传统制造业客户解释 LLM 为什么不是 100% 准确率，同时拿下 50 万美金生产合同？
Role: FDPM
Company: Palantir / Applied AI
Video: https://www.youtube.com/watch?v=dQw4w9WgXcQ
A: 核心是把“模型准确率”转化为“业务风险可控 + 投资回报”。
1. 不承诺 100% 全自动，而是承诺“确定性规则兜底 + 低置信度人工复核(HITL)”，保证线上零静默错误写入 ERP。
2. 先用 2 周 Shadow Mode 跑真实历史工单，证明人工审单耗时从 15 分钟降到 2 分钟、整体吞吐翻倍。
3. 合同采用里程碑解锁（Milestone-gated），用 60 天可验证 ROI 换取年度框架协议。

## Q: 如果客户现场数据没有 API，只有每天凌晨导出的加密 Excel 和扫描件 PDF，FDE 怎么落地？
Role: FDE
Company: Frontier AI FDE
A:
1. 先建立 SFTP/定时文件夹监听 + 幂等 Ingestion Pipeline（按文件哈希去重，避免重跑脏数据）。
2. PDF 走多模态版面解析提取结构化 JSON，并保留页码与坐标引用（Citation Bounding Box），方便一线人员秒级核对。
3. 所有解析后的数据统一写入 Canonical Schema，隔离下游业务与上游脏格式变化。

## Q: Strategy & Ops 如何设计防止客服/交付团队刷单的绩效指标？
Role: Operations
Company: Stripe BizOps
A: 绝对不能只考核“上线天数”或“关单速度”（Goodhart 定律会导致草率上线、把坑推到 6 个月后）。必须采用“速度 × 质量门禁”组合指标：例如奖金与 Day-60 客户活跃健康度及零 P0 返工挂钩。
`;

export const SAMPLE_LARK_CSV_TEXT = `Title,Role,Company,Prompt,Model Answer,Video URL,Notes
"AI PM: Designing Guardrails for Autonomous Support Refunds",ai-pm,"Sierra / Intercom","An AI support agent can issue refunds up to $200 automatically. How do you design the policy engine, evals, and fraud guardrails?","1. Separate deterministic policy rules (order age, refund history, velocity limits) from LLM intent classification.\n2. Gate >$50 or repeat-refund users behind HITL approval.\n3. Track Fraud Leakage Rate (<0.3%) as hard guardrail alongside Auto-Resolution Rate.","https://www.loom.com/share/sample123","重点突出不可逆资金操作的确定性风控"
"PgM: Resolving Cross-Team Schema Breaking Change Before Peak",pgm,"Stripe / Databricks","Payments Team wants to ship a breaking webhook schema 10 days before Black Friday, while 4 partner squads depend on V1. How do you manage?","Freeze breaking V1 removals until after Peak; enforce additive dual-publish with automated contract tests and a Jan 15 deprecation sunset gate.","","强调 Freeze Window 与双写兼容性"
`;
