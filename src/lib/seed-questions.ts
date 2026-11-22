import { InterviewQuestion } from './types';

export const SEED_QUESTIONS: InterviewQuestion[] = [
  // ===================== 1. FDE (4) =====================
  {
    id: 'fde-01',
    role: 'fde',
    secondaryRoles: ['fdpm', 'pgm'],
    round: 'decomposition',
    difficulty: 'senior',
    timeLimitMin: 35,
    companyStyle: 'Palantir / Frontier AI FDE',
    title: 'Legacy Logistics: 40-Warehouse LLM + ERP 30-60-90 Decomposition',
    prompt:
      'A Fortune 500 logistics client has 40 regional warehouses running three incompatible on-prem ERPs (SAP, Oracle, and custom AS/400 CSV dumps). Dispatchers spend 4 hours/day manually reconciling delayed shipments from PDF manifests and emails. You are the lead FDE deployed on-site on Monday. Decompose the problem, design the production architecture, and lay out your 30-60-90 delivery plan.',
    promptZhHint:
      '【中文提示】重点展示“Day 1 先止血跑通闭环 + 脏数据兼容 + 架构可演进”。先收敛试点范围（1-2个核心仓库+最高频异常），明确数据契约(Canonical Schema)、人工复核兜底(HITL)与安全边界，而不是一上来试图统一40个ERP。',
    frameworkSteps: [
      'Clarify business SLA, PII/SOC2 rules, ERP write-back permissions & pilot scope (pick 2 high-volume warehouses first).',
      'Design a Canonical Shipment Event Schema decoupling brittle ERP connectors from core matching logic.',
      'Build hybrid ingestion (OCR/VLM extraction for PDFs + deterministic ERP rule checks + LLM exception classifier with confidence score).',
      'Define HITL triage queue (<0.85 confidence goes to dispatcher with 1-click approve) & audit logs.',
      'Lay out 30-60-90: Days 1-30 Shadow mode & ROI baseline -> Days 31-60 Read-only pilot in 2 hubs -> Days 61-90 Controlled write-back & rollout playbook.',
    ],
    strongHireSignals: [
      'Explicitly avoids big-bang 40-warehouse integration; slices vertically into 1 workflow + 2 warehouses in Week 2.',
      'Separates deterministic reconciliation rules (IDs, PO totals) from probabilistic LLM extraction/reasoning.',
      'Designs shadow mode + accuracy telemetry before touching ERP write-back.',
      'Identifies human change-management risk with dispatchers and builds trust via explainable citations.',
    ],
    redFlags: [
      'Proposes a 6-month master data warehouse rewrite before shipping any user value.',
      'Uses an LLM for arithmetic/join reconciliation where SQL/deterministic code belongs.',
      'Ignores ERP write-back permissions, rate limits, and idempotency.',
    ],
    followUpProbes: [
      'Two warehouses run SAP behind an air-gapped VPN with only nightly batch SFTP exports. How does your architecture adapt?',
      'On Day 18, the client VP asks why we cannot skip shadow mode and go straight to auto-updating SAP. How do you push back?',
      'PDF manifests from smaller carriers change layout weekly and extraction recall drops to 72%. What concrete engineering guardrails prevent bad data from hitting dispatchers?',
    ],
    sampleDiagramNodes: [
      { label: 'PDF Manifests / Emails', kind: 'data', x: 40, y: 50 },
      { label: 'Legacy ERPs (SAP / AS400)', kind: 'data', x: 40, y: 185 },
      { label: 'Canonical Event & OCR', kind: 'agent', x: 260, y: 115 },
      { label: 'Confidence Guardrail', kind: 'eval', x: 470, y: 115 },
      { label: 'Dispatcher HITL UI', kind: 'client', x: 470, y: 235 },
      { label: 'Hours Saved / Accuracy', kind: 'kpi', x: 675, y: 115 },
    ],
  },
  {
    id: 'fde-02',
    role: 'fde',
    secondaryRoles: ['ai-pm', 'operations'],
    round: 'execution-metrics',
    difficulty: 'senior',
    timeLimitMin: 30,
    companyStyle: 'OpenAI / Anthropic Applied AI',
    title: 'Production AI Accuracy Drop (94% → 78%) Pre-Board Demo Triage',
    prompt:
      'You deployed an agentic contract-review assistant at a flagship enterprise customer. Three weeks after launch—and 48 hours before the customer CEO demos it to their Board—their QA lead escalates that accuracy dropped from 94% in staging to 78% in production. Walk me through your live triage, root-cause isolation, and customer communication.',
    promptZhHint:
      '【中文提示】考察生产故障应急能力：1) 先止血与对齐定义(78%是怎么测的)；2) 按“数据分布漂移 / Prompt与模型变更 / RAG检索索引 / 工具或外部依赖超时”分层排查；3) 给出48小时Board Demo稳妥方案，不硬赌不稳定修复。',
    frameworkSteps: [
      'Stabilize & align on baseline: verify exact eval slice, sample size, and failure taxonomy (retrieval miss vs. tool error vs. reasoning hallucination).',
      'Run 4-layer bisection: (a) Input distribution shift (new doc types/OCR noise), (b) Retrieval/chunking drift, (c) Model/prompt/context-window regression, (d) Upstream API timeouts.',
      'Apply immediate mitigation: pin model snapshot, tighten schema validation, route low-confidence clauses to safe fallback.',
      'Manage the 48-hour Board Demo honestly: isolate the verified 95%+ doc scope for demo vs. live telemetry transparency.',
      'Institutionalize post-incident regression gate (golden prod replay before future deploys).',
    ],
    strongHireSignals: [
      'Questions how "78%" was measured before jumping to model fine-tuning.',
      'Separates retrieval recall failures from generation/schema failures using trace logs.',
      'Balances engineering urgency with executive honesty around the 48-hour Board Demo.',
    ],
    redFlags: [
      'Immediately blames the foundation model or suggests fine-tuning inside 48 hours.',
      'Promises 99% accuracy to the executive sponsor without inspecting error clusters.',
      'Forgets to check silent OCR/PDF parsing regressions or truncated context windows.',
    ],
    followUpProbes: [
      'Trace logs show 65% of failures happen on scanned 80-page appendices where tables span page breaks. Fix this in 24 hours.',
      'The customer champion wants you to hardcode outputs for the 5 Board demo documents. How do you respond?',
      'How do you prevent silent accuracy drops like this from reaching customer QA first?',
    ],
    sampleDiagramNodes: [
      { label: 'Prod Doc Ingestion', kind: 'data', x: 40, y: 120 },
      { label: 'Chunking & Vector Index', kind: 'data', x: 230, y: 120 },
      { label: 'Agent Reasoning', kind: 'agent', x: 420, y: 120 },
      { label: 'Trace & Eval Replay', kind: 'eval', x: 420, y: 240 },
      { label: 'Safe Fallback / Escalate', kind: 'ops', x: 630, y: 120 },
    ],
  },
  {
    id: 'fde-03',
    role: 'fde',
    secondaryRoles: ['fdpm', 'pm'],
    round: 'case-strategy',
    difficulty: 'staff',
    timeLimitMin: 30,
    companyStyle: 'Palantir / Scale AI',
    title: '$3M ARR Bespoke Client Integration vs. Platform Abstraction',
    prompt:
      'Your top $3M ARR defense-manufacturing client demands a custom real-time shop-floor scheduling module with proprietary SAP BAPI hooks that no other customer uses. Building it bespoke will take 2 FDEs for 6 weeks and risk creating a permanent code fork. Core Engineering refuses to touch it for 2 quarters. What do you decide and how do you execute?',
    promptZhHint:
      '【中文提示】FDE/FDPM经典灵魂考题：千万不要二选一非黑即白。核心是“接住客户核心商业诉求 + 用插件/适配器边界隔离定制代码 + 抽离可复用原语回流平台”。',
    frameworkSteps: [
      'Interrogate the true client deadline & operational pain behind the SAP BAPI demand (is 15-min batch enough vs. sub-second?).',
      'Draw a strict architectural boundary: Connector/Adapter layer (client-owned/config-driven) vs. Core Scheduling Engine (platform-owned).',
      'Negotiate scope & commercial terms: timebox FDE adapter build, avoid forking core repo, define SLA ownership.',
      'Extract 1-2 generalized primitives (e.g., generic Webhook/ERP Connector SDK) to pitch back to Core Eng roadmap.',
    ],
    strongHireSignals: [
      'Uses architectural isolation (Adapter/Plugin pattern, declarative config) to deliver without forking core.',
      'Validates whether "real-time" is a true operational requirement or just a stakeholder wish.',
      'Frames platform abstraction in Core Eng’s language (reusable across future manufacturing logos).',
    ],
    redFlags: [
      'Says "no" to a $3M client blindly or tells FDEs to copy-paste and fork the monorepo.',
      'Turns the FDE team into a permanent custom software agency with unmaintainable tech debt.',
    ],
    followUpProbes: [
      'Six months later, two new clients also want shop-floor scheduling on different ERPs. How do you graduate your custom build into a core product?',
      'Core Eng says your proposed Connector SDK introduces security review overhead. How do you de-risk it?',
      'What metric tells leadership that FDE bespoke ratio is becoming unhealthy across the company?',
    ],
  },
  {
    id: 'fde-04',
    role: 'fde',
    secondaryRoles: ['ai-pm', 'pgm'],
    round: 'product-ai',
    difficulty: 'senior',
    timeLimitMin: 35,
    companyStyle: 'Anduril / Industrial Field AI',
    title: 'Offline-Resilient Industrial Multimodal Field Inspection App',
    prompt:
      'Field technicians inspect remote wind turbines and substations with spotty 3G/offline connectivity. They need an AI copilot on iPad/rugged Android that inspects photos/audio notes, flags safety hazards against 5,000-page OEM manuals, and syncs work orders when back online. Architect the edge-to-cloud system.',
    promptZhHint:
      '【中文提示】边缘计算+离线AI架构题：重点考虑端侧轻量模型/本地向量检索、异步队列与冲突解决(CRDT/乐观锁)、带宽压缩以及高危安全故障绝不能漏报(高Recall)。',
    frameworkSteps: [
      'Define hard constraints: offline duration (up to 48h), safety recall priority (false negative >> false positive), device memory/battery limits.',
      'Split inference tiers: Edge quantized VLM/classifier + local SQLite/embedded vector store for OEM checklists; Cloud frontier model re-verification upon sync.',
      'Design local-first sync engine: idempotent event log, media compression/chunked upload, explicit conflict resolution when two techs edit.',
      'Establish safety guardrail UX: offline badge, confidence thresholds, mandatory photo verification for high-risk alerts.',
    ],
    strongHireSignals: [
      'Cleanly splits immediate on-device safety triage from deep cloud reconciliation.',
      'Handles messy offline realities: battery drain, partial media uploads, stale manual versions, and sync conflicts.',
      'Prioritizes recall over precision for safety hazards and logs human overrides.',
    ],
    redFlags: [
      'Assumes continuous streaming to cloud APIs in an offline spec.',
      'Treats mobile sync as a trivial REST POST without idempotency or conflict semantics.',
    ],
    followUpProbes: [
      'The OEM issues an urgent safety bulletin mid-week while 200 tablets are offline. How do you guarantee stale recommendations are blocked?',
      'How do you evaluate edge model accuracy on dusty/low-light photos before deploying to 500 technicians?',
      'If device RAM only supports a 3B parameter model, how do you still search 5,000 pages accurately?',
    ],
  },

  // ===================== 2. FDPM (4) =====================
  {
    id: 'fdpm-01',
    role: 'fdpm',
    secondaryRoles: ['pm', 'ai-pm'],
    round: 'product-ai',
    difficulty: 'senior',
    timeLimitMin: 30,
    companyStyle: 'Palantir / Glean / Sierra FDPM',
    title: '3 Healthcare Design Partners → 80% Reusable Product Core',
    prompt:
      'You are FDPM for a new Clinical Revenue-Cycle AI product. Three early design partners want completely different things: Hospital A wants EHR claim denial appeals; Hospital B wants prior-auth fax triage; Hospital C wants nurse coding copilot. You only have 1 core squad and 3 FDEs. How do you structure discovery and turn this into an 80% reusable product?',
    promptZhHint:
      '【中文提示】FDPM最核心能力：透过3个表面不同的客户需求，识别底层共同原语（例如：医疗文档解析 + 医保规则引擎 + 人工审核工作台），通过序列化的 Design Partner 路线图避免团队被撕裂。',
    frameworkSteps: [
      'Map all 3 workflows end-to-end to separate domain skin (payer rules, EHR flavors) from shared horizontal primitives.',
      'Identify the shared 80% core: Medical Doc/HL7 Ingestion -> Policy Reasoning Engine -> Evidence-Cited HITL Workbench -> Audit Log.',
      'Score the 3 bets by ARR velocity, time-to-value, regulatory risk, and repeatability across the TAM.',
      'Sequence execution: anchor 1 primary wedge (e.g. Prior-Auth or Denial Appeals) across 2 partners, timebox discovery spikes for the 3rd.',
      'Define graduation criteria for FDE-built patterns to enter Core Product.',
    ],
    strongHireSignals: [
      'Refuses to build 3 unrelated point solutions; finds the common platform primitives underneath.',
      'Evaluates willingness-to-pay and buyer urgency (denial appeals = direct cash recovery = fastest CFO buy-in).',
      'Sets clear Design Partner contracts (weekly feedback + data access + conversion path).',
    ],
    redFlags: [
      'Tries to appease all 3 hospitals simultaneously with 1/3 capacity each.',
      'Focuses purely on feature lists without HIPAA/BAA, EHR integration cost, or buyer economics.',
    ],
    followUpProbes: [
      'Hospital C offers $800K upfront if you prioritize their nurse coding copilot exclusively for 4 months. Take it or pass?',
      'Your FDEs keep bypassing core APIs because core roadmap moves too slowly. How do you fix the FDE-to-Core interface?',
      'How do you prove to your CEO after 90 days that your "80% reusable" thesis is actually working?',
    ],
    sampleDiagramNodes: [
      { label: 'Hospital A/B/C Workflows', kind: 'client', x: 40, y: 120 },
      { label: '20% Payer/EHR Adapters', kind: 'data', x: 240, y: 50 },
      { label: '80% Policy & Cite Core', kind: 'agent', x: 240, y: 185 },
      { label: 'Shared HITL Review Queue', kind: 'eval', x: 460, y: 120 },
      { label: 'Recovered $ / Turnaround', kind: 'kpi', x: 670, y: 120 },
    ],
  },
  {
    id: 'fdpm-02',
    role: 'fdpm',
    secondaryRoles: ['consulting', 'operations'],
    round: 'case-strategy',
    difficulty: 'senior',
    timeLimitMin: 30,
    companyStyle: 'Enterprise AI FDPM',
    title: 'Pilot-to-$1.5M Annual Contract CFO ROI Defense',
    prompt:
      'Your 90-day pilot automating supply-chain vendor claims went live with glowing operator feedback (4.6/5 CSAT). Now the client CFO is stalling on the $1.5M/year enterprise contract because "AI demos always look good, show me hard P&L savings and risk control." Build the conversion case and rollout structure.',
    promptZhHint:
      '【中文提示】大客户 Pilot 转正式年单是 FDPM 生死线：必须把“用户点赞(CSAT)”翻译成“CFO 财务语言(硬成本削减、营运资金释放、漏损追回、Payback期)”，并提供分阶段风险共担方案。',
    frameworkSteps: [
      'Translate operator metrics into CFO P&L lines: FTE hours reallocated (not hypothetical), leaked duplicate/erroneous claims recovered, SLA penalty avoidance.',
      'Establish clean counterfactual baseline (pre-pilot vs. pilot matched cohort / A-B holdout) so savings cannot be dismissed as seasonality.',
      'Quantify Total Cost of Ownership (license + IT integration + human review cost) to show <6-month payback and 3-5x net ROI.',
      'De-risk the CFO sign-off: milestone-gated expansion tranches or partial outcome-linked SLA guarantees.',
    ],
    strongHireSignals: [
      'Distinguishes soft "time saved" (often doubted by CFOs) from hard dollar recovery / avoided headcount growth.',
      'Proactively uses control-group or pre/post matched comparison to isolate AI impact.',
      'Uses structured commercial concessions (milestone gates) instead of panicked discounting.',
    ],
    redFlags: [
      'Repeats CSAT scores and qualitative quotes to a skeptical CFO.',
      'Immediately cuts price by 40% to close the deal.',
    ],
    followUpProbes: [
      'The CFO argues: "Saving 15 minutes per analyst does not let me fire anyone, so it is $0 savings." How do you answer?',
      'Legal refuses indemnification for AI errors above 1%. How do you structure operational guardrails so Procurement signs?',
      'Suppose only 2 of 5 divisions hit target ROI in pilot. How do you pitch expansion?',
    ],
  },
  {
    id: 'fdpm-03',
    role: 'fdpm',
    secondaryRoles: ['pgm', 'fde'],
    round: 'behavioral',
    difficulty: 'senior',
    timeLimitMin: 25,
    companyStyle: 'Palantir / Stripe / High-Growth',
    title: 'Navigating FDE vs. Client Security vs. Core Eng Priorities',
    prompt:
      'Tell me about a time—or walk through how you handle a scenario—where Field Engineers wanted to ship an urgent custom workaround for a flagship customer, Client InfoSec blocked data access for 3 weeks, and Core Engineering pushed back on every dependency. How do you align all three without burning trust?',
    promptZhHint:
      '【中文提示】行为面+场景综合题：面试官想看你在多方冲突中如何“不站队、用机制和共同目标对齐”，同时给出自己亲身(I vs We)的决断动作。',
    frameworkSteps: [
      'Anchor on shared goal & real deadline (separate ego/turf from customer critical path).',
      'De-block InfoSec with minimum viable secure scope (synthetic/anonymized sample data + scoped read-only sandbox).',
      'Give FDEs a clean bounded workaround while negotiating a concrete long-term contract/API with Core Eng.',
      'Establish single-threaded weekly decision cadence & transparent trade-off log for leadership.',
    ],
    strongHireSignals: [
      'Avoids complaining about InfoSec or Core Eng; diagnoses their legitimate incentives (breach risk, tech debt).',
      'Invents creative unblocking paths (synthetic data staging) so engineering does not sit idle.',
      'Uses clear "I decided / I proposed / the measurable result was..." ownership if sharing a past story.',
    ],
    redFlags: [
      'Escalates immediately to the VP before doing homework on InfoSec or Eng constraints.',
      'Takes sides emotionally with either field sales or core engineering.',
    ],
    followUpProbes: [
      'What if the FDE lead goes around you and merges the hacky workaround directly into a release branch?',
      'How would you measure whether your new alignment process actually reduced cycle time?',
      'Tell me a real story where your compromise backfired—what did you change next time?',
    ],
  },
  {
    id: 'fdpm-04',
    role: 'fdpm',
    secondaryRoles: ['consulting', 'ai-pm'],
    round: 'case-strategy',
    difficulty: 'staff',
    timeLimitMin: 30,
    companyStyle: 'Sierra / Intercom / Scale AI',
    title: 'Pricing & Packaging an Outcome-Based Forward-Deployed AI Agent',
    prompt:
      'You built an enterprise AI Agent for B2B freight brokerage & exception resolution. Historically your company charged seat-based SaaS + fixed implementation fee. Now automation cuts customer seats by 40%, threatening NRR. Design the new pricing, packaging, and forward-deployed services model.',
    promptZhHint:
      '【中文提示】AI商业化经典难题：AI提升效率导致“按人头收费(Seat-based)”自我蚕食。答案要覆盖“价值锚点(Outcome/Resolved Case) + 基础平台费保底 + 推理成本Margin保护 + 部署服务分层”。',
    frameworkSteps: [
      'Diagnose seat cannibalization vs. value expansion (we capture value per resolved shipment/dollar saved, not per human login).',
      'Design hybrid pricing architecture: Platform Base Fee (covers infra/deployments/security) + Usage/Outcome Tier (per verified resolved exception).',
      'Protect gross margins against LLM inference spikes (tier caps, caching/model routing, overage guardrails).',
      'Package FDE onboarding cleanly (fixed-scope Quickstart vs. Enterprise Custom Integration tier) without hurting SaaS multiples.',
      'Plan existing-customer migration path so nobody feels ambushed at renewal.',
    ],
    strongHireSignals: [
      'Explicitly protects AI gross margin (COGS per outcome vs. price per outcome).',
      'Defines unambiguous "verified resolution" attribution rules so customers do not dispute bills.',
      'Considers Wall Street/investor optics (separating recurring platform ARR from services).',
    ],
    redFlags: [
      'Proposes pure 100% outcome pricing with zero floor (huge revenue volatility & attribution fights).',
      'Ignores variable inference costs when customers send messy edge-case workloads.',
    ],
    followUpProbes: [
      'A large customer games "resolution" definitions to avoid paying for partially handled tickets. Fix the billing metric.',
      'How do you model whether gross margin stays above 70% if a complex ticket triggers 12 agent tool loops?',
      'Sales reps complain outcome pricing takes 2x longer to explain in procurement. How do you simplify the quote sheet?',
    ],
  },

  // ===================== 3. AI PM (4) =====================
  {
    id: 'aipm-01',
    role: 'ai-pm',
    secondaryRoles: ['fde', 'fdpm'],
    round: 'product-ai',
    difficulty: 'senior',
    timeLimitMin: 35,
    companyStyle: 'Anthropic / OpenAI / Glean',
    title: 'Enterprise RAG + Agent Eval Harness Design',
    prompt:
      'Your enterprise knowledge assistant answers employee policy, IT, and sales questions across Slack, Confluence, Jira, and Google Drive. Users complain answers are sometimes outdated, ignore permissions, or sound confident when wrong. Design the end-to-end Eval Harness (offline + online) before your next major release.',
    promptZhHint:
      '【中文提示】AI PM 最核心护城河就是 Eval 体系。务必区分 Retrieval(检索召回/权限隔离) 与 Generation(忠实度/引用准确/拒答率)，并把离线 Golden Set 和线上隐式/显式信号串起来。',
    frameworkSteps: [
      'Define failure taxonomy: Permission leak (P0), Stale source, Retrieval miss, Faithfulness/Hallucination, Refusal calibration.',
      'Build stratified Golden Dataset (real anonymized queries + adversarial permission/unanswerable edge cases + freshness tests).',
      'Separate component metrics: Retrieval (Recall@k, ACL precision = 100%) vs. Generation (Groundedness, Citation Precision, Answer Helpfulness).',
      'Combine deterministic checks + calibrated LLM-as-a-Judge (validated against human SMEs via Cohen’s Kappa) + CI/CD release gates.',
      'Close the loop with online production signals (thumbs down, copy/click citations, fallback to human IT ticket) feeding weekly back into the Golden Set.',
    ],
    strongHireSignals: [
      'Treats ACL/permission leakage as a hard P0 deterministic gate, never an average score.',
      'Separates retrieval diagnosis from synthesis diagnosis.',
      'Calibrates LLM-as-a-Judge against human expert labels rather than trusting judge scores blindly.',
    ],
    redFlags: [
      'Only talks about "vibes" or generic NLP metrics like BLEU/ROUGE.',
      'Forgets permission/ACL leakage and document staleness in enterprise RAG.',
    ],
    followUpProbes: [
      'Two Confluence pages contradict each other (one from 2023, one from last week). How should your eval score the assistant?',
      'Your LLM-as-a-Judge agrees with human PMs only 62% of the time. How do you debug and improve the judge?',
      'You have 50,000 production Slack queries/day. What do you log and sample without violating employee privacy?',
    ],
    sampleDiagramNodes: [
      { label: 'Stratified Golden Set', kind: 'data', x: 40, y: 120 },
      { label: 'ACL + Hybrid Retrieval', kind: 'data', x: 240, y: 55 },
      { label: 'Grounded Synthesis', kind: 'agent', x: 240, y: 185 },
      { label: 'Deterministic + Judge Eval', kind: 'eval', x: 460, y: 120 },
      { label: 'Release Gate & Telemetry', kind: 'kpi', x: 670, y: 120 },
    ],
  },
  {
    id: 'aipm-02',
    role: 'ai-pm',
    secondaryRoles: ['operations', 'fde'],
    round: 'execution-metrics',
    difficulty: 'senior',
    timeLimitMin: 30,
    companyStyle: 'Perplexity / Cursor / AI SaaS',
    title: 'Cutting Agent Inference COGS 60% Without Quality Regression',
    prompt:
      'Your multi-step AI coding/research agent has strong retention, but inference spend just hit 52% of revenue (dragging gross margin down to 40%). The CFO gives you 6 weeks to cut inference COGS by 60% while holding task completion rate flat within 1%. Design your optimization roadmap.',
    promptZhHint:
      '【中文提示】AI PM 商业嗅觉与成本管控必考题：模型路由(Router/Cascade)、Prompt/上下文缓存(KV/Semantic Cache)、工具调用裁剪、高并发异步批处理，并用分层Shadow Eval守住质量底线。',
    frameworkSteps: [
      'Instrument token & dollar attribution first: break down spend by step (system prompt bloat, retrieval context, retries, frontier model overuse).',
      'Tiered Model Routing / Cascade: route easy/classification/formatting turns to small fast models (Flash-Lite / distilled); reserve frontier reasoning for hard steps.',
      'Context & Prompt Engineering: prefix/prompt caching, semantic response cache for repeat queries, tighter retrieval chunk budgets.',
      'Agent Loop Efficiency: cap runaway tool retries, parallelize independent tool calls, enforce concise structured outputs.',
      'Quality Guardrail: shadow A/B on Golden Set + live task success & retry rate monitoring.',
    ],
    strongHireSignals: [
      'Profiles where tokens actually burn (usually bloated retrieval context + multi-turn history + retries) before picking optimizations.',
      'Uses cost-vs-quality Pareto curves and automated canary gates.',
      'Considers latency wins as a secondary boost to conversion/retention.',
    ],
    redFlags: [
      'Blindly swaps every call to the cheapest model without routing or regression evals.',
      'Ignores runaway agent loops and redundant system prompts.',
    ],
    followUpProbes: [
      'A cheap router model misclassifies 8% of complex queries, hurting user trust. How do you detect and escalate dynamically?',
      'Which optimization ships in Week 1 with near-zero engineering risk, vs. Week 5?',
      'Finance asks if you should pass heavy agent power-user costs via credits. How do you evaluate pricing vs. COGS?',
    ],
  },
  {
    id: 'aipm-03',
    role: 'ai-pm',
    secondaryRoles: ['pm', 'fdpm'],
    round: 'product-ai',
    difficulty: 'senior',
    timeLimitMin: 30,
    companyStyle: 'Notion AI / Sierra / Harvey',
    title: 'HITL & Failure Recovery UX for Non-Deterministic Agents',
    prompt:
      'You are launching an AI Financial Ops Agent that can read vendor invoices, query ERP balances, draft journal entries, and initiate payments up to $50K. Users love automation on routine invoices, but one hallucinated wire transfer will get your product ripped out. Design the autonomy levels, Human-in-the-Loop UX, and failure recovery.',
    promptZhHint:
      '【中文提示】Agent UX 的核心原则：可逆操作 vs 不可逆操作(Reversible vs Irreversible)分级授权、透明可验证的证据链(Source Highlight)、以及极低摩擦的人工接管与回滚机制。',
    frameworkSteps: [
      'Classify actions by blast radius & reversibility (Read -> Draft/Tag -> Low-dollar routine -> Irreversible payment > threshold).',
      'Design graduated autonomy tiers (Shadow -> Co-pilot Draft -> Auto-approve under rules -> Full Autopilot on verified vendors).',
      'Build verification-first UI: side-by-side PDF bounding-box citation, policy check badges, confidence breakdown, 1-click edit/reject.',
      'Design graceful failure & undo: idempotent execution, pre-flight dry-run validation, crisp error explanations + instant human takeover.',
      'Measure Trust Calibration: approval rate, edit distance, override rate, and time-to-verify (seconds, not minutes).',
    ],
    strongHireSignals: [
      'Explicitly separates reversible vs. irreversible actions and applies deterministic policy rules above LLM confidence.',
      'Optimizes human review latency (making verification take 3 seconds via inline source highlighting, not rereading the whole PDF).',
      'Tracks "edit distance" and "rubber-stamping risk" (humans blindly clicking approve).',
    ],
    redFlags: [
      'Lets the agent auto-send $50K wires based solely on an LLM self-reported confidence score.',
      'Forces users to manually verify 100% of fields cleanly defeating automation value.',
    ],
    followUpProbes: [
      'Reviewers start blindly clicking "Approve All" because accuracy is 98%, then miss a $42K fraud invoice. How do you design against automation complacency?',
      'How do you decide when an enterprise customer is ready to graduate a workflow from Co-pilot to Auto-pilot?',
      'What metrics tell you the HITL queue itself has become a bottleneck?',
    ],
  },
  {
    id: 'aipm-04',
    role: 'ai-pm',
    secondaryRoles: ['fde', 'consulting'],
    round: 'decomposition',
    difficulty: 'staff',
    timeLimitMin: 30,
    companyStyle: 'AI Platform / Applied AI',
    title: 'Prompt + RAG vs. Fine-Tune vs. Custom Model Build-or-Buy',
    prompt:
      'A B2B legal-tech startup wants to improve contract redlining quality against each customer’s proprietary playbook. Your VP of Eng pitches fine-tuning an open-weights 70B model per customer; your Lead AI Engineer wants advanced RAG + frontier APIs. As AI PM, frame the build-vs-buy and architecture decision.',
    promptZhHint:
      '【中文提示】避开技术炫技陷阱：Fine-tune 擅长教“格式、语气、特定领域风格”，不擅长注入高频变化的新事实(Playbook规则常变)；同时还要算清运维成本、多租户隔离与模型迭代速度。',
    frameworkSteps: [
      'Diagnose the nature of errors first: is the gap missing proprietary context/rules (RAG/context problem) or output style/clause reasoning (fine-tuning/prompting)?',
      'Compare 3 options across Accuracy, Freshness/Playbook Updates, Latency, Cost, Multi-tenant Isolation, and Maintenance Burden.',
      'Explain why per-customer 70B fine-tuning creates massive ops debt & stale knowledge traps vs. dynamic Playbook RAG + Frontier API.',
      'Define the narrow conditions where LoRA/fine-tuning DOES make sense (distilling a locked, high-volume sub-task after prompt/RAG ceiling is proven).',
      'Propose a 2-week empirical bake-off on 200 golden redlines before committing.',
    ],
    strongHireSignals: [
      'Distinguishes knowledge injection (RAG/context) from behavioral/style adaptation (fine-tuning).',
      'Highlights hidden costs of per-tenant model hosting (GPU idle cost, version upgrades, eval matrix explosion).',
      'Anchors on an empirical benchmark ladder: Prompting/Tools -> Hybrid RAG -> Distilled Fine-tune only if warranted.',
    ],
    redFlags: [
      'Recommends fine-tuning immediately as a magic accuracy button.',
      'Ignores data isolation/GDPR and model upgrade lock-in.',
    ],
    followUpProbes: [
      'A major European bank insists zero data can leave their VPC. How does that change your build-vs-buy matrix?',
      'Six months in, prompt + RAG plateaus at 86% precision on rare indemnity clauses while latency is 9 seconds. What next?',
      'How do you communicate to the board why you skipped training a proprietary foundation model?',
    ],
  },

  // ===================== 4. PM (4) =====================
  {
    id: 'pm-01',
    role: 'pm',
    secondaryRoles: ['ai-pm', 'fdpm'],
    round: 'product-ai',
    difficulty: 'senior',
    timeLimitMin: 35,
    companyStyle: 'Stripe / Meta / Figma PM',
    title: '0→1 Product Sense: Turning Support Calls into Prioritized Eng Tickets',
    prompt:
      'Design a product for B2B SaaS teams that turns messy customer support calls, Slack threads, and tickets into prioritized engineering bugs and feature insights. Walk through users, pain points, product design, differentiation, and metrics.',
    promptZhHint:
      '【中文提示】经典 Product Sense 结构：Mission/Clarify -> Target Persona 细分 -> 核心痛点拆解 -> 端到端方案与差异化闭环（重点是如何与 ARR/流失风险绑定，而不是做一个摘要玩具）-> 指标与风险。',
    frameworkSteps: [
      'Clarify company stage & target ICP (e.g., 50-500 person B2B SaaS with high support volume & PM-Support friction).',
      'Segment personas (Support Lead, Triage PM, Engineering Lead) and isolate the #1 broken loop: signal loss & revenue-blind prioritization.',
      'Design core workflow: Auto-ingest & deduplicate signals -> Link to CRM ARR/Account Health -> Confidence-scored Bug vs. Feature cluster -> 1-click Jira/Linear sync + Auto-close-the-loop notification when shipped.',
      'Define 10x differentiator: Revenue-weighted impact + verifiable source quotes + customer loop-closure.',
      'Set North Star (% shipped roadmap items traced to verified customer demand / Triage hours saved) + guardrails (noise/spam ticket rate).',
    ],
    strongHireSignals: [
      'Avoids building "yet another AI meeting summarizer"; focuses on deduplication, ARR weighting, and closing the loop back to the customer.',
      'Thinks deeply about adoption friction (PMs hate noisy auto-generated Jira tickets).',
      'Includes strong counter-metrics against garbage-in/garbage-out ticket spam.',
    ],
    redFlags: [
      'Lists 10 generic AI features without picking one primary persona or workflow.',
      'Forgets how engineering teams reject unverified AI-created tickets.',
    ],
    followUpProbes: [
      'Engineering leads complain the tool creates 40 duplicate Linear tickets a day. How do you redesign the triage gate?',
      'Competitors like Gong and Intercom already summarize calls. Why won’t customers just use them?',
      'If you only have 6 weeks for MVP, what do you cut?',
    ],
  },
  {
    id: 'pm-02',
    role: 'pm',
    secondaryRoles: ['operations', 'consulting'],
    round: 'execution-metrics',
    difficulty: 'senior',
    timeLimitMin: 30,
    companyStyle: 'Meta / Stripe Execution PM',
    title: 'Root-Cause Diagnosis: Weekly Active Teams -14% WoW Post-Onboarding Redesign',
    prompt:
      'You are PM for a collaborative B2B workflow platform. On Monday morning, Weekly Active Teams dropped 14% week-over-week—two weeks after you shipped a redesigned self-serve onboarding flow. Walk me through how you diagnose the drop and decide your next move.',
    promptZhHint:
      '【中文提示】Meta Execution 必考题型：先排除统计口径/外部因素(Telemetry, 节假日, 爬虫)，再按漏斗阶段与维度切片(新老用户、渠道、平台、地域、实验组)，把嫌疑锁定后再决定回滚还是热修。',
    frameworkSteps: [
      'Sanity check telemetry & definition first: logging bug, ETL delay, bot filter change, or seasonality/holiday.',
      'Segment the -14% drop: New cohorts vs. Existing tenured teams, Acquisition channel, Web vs. Mobile, Geography, Plan tier.',
      'Inspect the new onboarding funnel step-by-step (Signup -> Workspace Setup -> First Invite -> Core Aha Action -> Day-7 Return).',
      'Cross-check against recent shipping changes, latency/error spikes, and support ticket volume.',
      'Decide mitigation: immediate rollback / feature flag revert if P0 regression vs. targeted hotfix if isolated step friction.',
    ],
    strongHireSignals: [
      'Does not assume the onboarding redesign caused it before verifying whether existing tenured teams also dropped!',
      'Slices systematically (Internal/Data -> External -> Product Funnel -> Segments).',
      'Articulates explicit rollback threshold criteria rather than guessing.',
    ],
    redFlags: [
      'Immediately blames the new UI without checking if the drop happened in tenured users too.',
      'Suggests running a 2-week user survey before checking error logs and funnel steps.',
    ],
    followUpProbes: [
      'Data shows tenured teams are flat, while Week-1 activation among new SMB signups fell 38% specifically at "Connect Data Source". What do you inspect next?',
      'Growth Marketing also launched a TikTok campaign that doubled low-intent signups the same week. How does that change your conclusion?',
      'Design the follow-up A/B test to recover activation without hurting enterprise security.',
    ],
  },
  {
    id: 'pm-03',
    role: 'pm',
    secondaryRoles: ['operations', 'fdpm'],
    round: 'execution-metrics',
    difficulty: 'senior',
    timeLimitMin: 30,
    companyStyle: 'Airbnb / Uber / DoorDash PM',
    title: 'Metrics Hierarchy & Guardrails for an AI Consultant Marketplace',
    prompt:
      'You run a two-sided marketplace matching Fortune 1000 companies with vetted AI Transformation Consultants & FDEs for 4-to-12 week sprints. Define the North Star metric, ecosystem health metrics, guardrail metrics, and how you detect marketplace gaming.',
    promptZhHint:
      '【中文提示】双边市场指标核心：避免只看 GMV 或注册数，要盯住“高质量双向匹配完成闭环(Verified Completed Sprints / Repeat Bookings)”与供需流动性(Liquidity)、以及防跳单/刷好评的 Guardrails。',
    frameworkSteps: [
      'Clarify marketplace business model & stage (take rate, supply-constrained vs. demand-constrained).',
      'Pick North Star capturing real two-sided value: Successfully Completed & Client-Rated Sprints (or Net Retained Sprint Value).',
      'Decompose into Supply Health (utilization, time-to-first-match, consultant NPS) & Demand Health (fill rate, time-to-shortlist, repeat enterprise rate).',
      'Define Guardrails: dispute/refund rate, off-platform leakage (circumvention), vetting pass rate, response SLA.',
      'Detail anti-gaming & measurement levers.',
    ],
    strongHireSignals: [
      'Uses a value-exchange North Star (completed successful sprints) rather than vanity clicks or raw proposals sent.',
      'Explicitly protects against off-platform disintermediation (huge real-world risk in high-ticket B2B marketplaces).',
      'Balances short-term match velocity against vetting quality.',
    ],
    redFlags: [
      'Picks "Total Registered Consultants" or "Messages Sent" as North Star.',
      'Forgets the two-sided liquidity balance.',
    ],
    followUpProbes: [
      'If shortlists get filled faster by lowering vetting standards, short-term GMV rises 15%. Which guardrail catches this early?',
      'Top clients and consultants keep exchanging emails and renewing off-platform after Sprint 1. What product + pricing fixes prevent leakage?',
      'What single number do you review every Monday morning?',
    ],
  },
  {
    id: 'pm-04',
    role: 'pm',
    secondaryRoles: ['consulting', 'fdpm'],
    round: 'case-strategy',
    difficulty: 'staff',
    timeLimitMin: 30,
    companyStyle: 'Stripe / Google / Anthropic PM',
    title: 'Enterprise Vertical Workflow Suite vs. Horizontal Developer API',
    prompt:
      'Your company built a breakthrough document & workflow intelligence engine. Currently 70% of revenue comes from a horizontal developer API ($0.02/page), while sales keeps asking for a full vertical SaaS suite for Insurance Underwriting priced at $250K/year. As Product Strategy lead, should we double down on the API, build the vertical suite, or sequence both?',
    promptZhHint:
      '【中文提示】平台 vs 垂直应用战略题：分析 TAM、毛利率、销售周期、竞争壁垒(Moat)以及团队DNA冲突。高分答案通常先明确核心战略约束，再用“数据飞轮/客户验证”设计清晰的演进路径。',
    frameworkSteps: [
      'Clarify current traction, runway, team DNA (infra-heavy vs. domain-GTM), and competitive pressure.',
      'Compare Horizontal API vs. Vertical Suite across 5 axes: ACV & Gross Margin, Defensibility/Moat, Time-to-Market, GTM Motion, and Capital Efficiency.',
      'Evaluate channel conflict & distraction risk (building vertical SaaS pulls eng into domain UI/compliance while infra competitors catch up).',
      'Recommend clear strategy (e.g. Reference Vertical Solutions powered by FDEs to harden API primitives, OR decisive pivot if API is commoditizing) with explicit kill/commit triggers.',
    ],
    strongHireSignals: [
      'Recognizes that pure horizontal APIs risk margin compression by hyperscalers unless paired with workflow lock-in.',
      'Understands GTM mismatch (PLG dev self-serve vs. 9-month enterprise insurance sales).',
      'Sets concrete 2-quarter validation gates rather than vague "let’s do both."',
    ],
    redFlags: [
      'Says "do both at 100%" without acknowledging organizational & GTM split-brain.',
      'Ignores commoditization pressure on raw document APIs.',
    ],
    followUpProbes: [
      'Your largest API customer builds an insurance underwriting tool on top of your API. Won’t launching your own vertical suite make you compete with your own customers?',
      'How do you know within 90 days whether the insurance vertical has real repeatable pull vs. one noisy sales rep?',
      'What happens to valuation multiples if services/suite work grows faster than API usage?',
    ],
  },

  // ===================== 5. OPERATIONS (4) =====================
  {
    id: 'ops-01',
    role: 'operations',
    secondaryRoles: ['pgm', 'fdpm'],
    round: 'execution-metrics',
    difficulty: 'senior',
    timeLimitMin: 30,
    companyStyle: 'Scale AI / Stripe BizOps / DoorDash',
    title: 'Enterprise Onboarding Time (18d → 47d) Under 3x Bookings Growth',
    prompt:
      'Enterprise bookings tripled this quarter—great news! However, median customer onboarding time blew up from 18 days to 47 days, creating a $4.2M backlog of unactivated ARR and rising pre-launch churn. You are Strategy & Ops Lead. Diagnose the bottleneck and cut onboarding back under 20 days within 8 weeks.',
    promptZhHint:
      '【中文提示】BizOps/Ops 核心解题思路：把“18天变47天”拆成串联/并联工序耗时(排队等待时间 vs 实际作业时间)，区分内部人手瓶颈、客户侧卡点(InfoSec/数据就绪)和工具自动化缺失，先清积压(Queue)再提稳态产能。',
    frameworkSteps: [
      'Decompose the 47-day cycle into Wait Time vs. Touch Time across every stage (Kickoff -> InfoSec/Legal -> Data Prep -> Config -> UAT -> Go-Live).',
      'Separate internal capacity bottlenecks (onboarding specialist staffing/handoffs) from customer-induced stalls (missing IT owner/data quality).',
      'Triage the $4.2M backlog (Tiger team / segment Tier-1 fast-track vs. self-serve lower tiers) while preventing new inflow stalls.',
      'Re-architect steady-state flow: Pre-close technical readiness checklist, parallelized InfoSec + Data templates, standardized playbooks.',
      'Set weekly throughput KPIs (Time-to-First-Value, Stage Aging >5d alerts, Activation Capacity Ratio).',
    ],
    strongHireSignals: [
      'Distinguishes queue/wait time (usually 70%+ of onboarding lag) from active engineering/ops touch time.',
      'Introduces a "Definition of Ready" gate at Sales-to-Ops handoff so half-baked deals do not clog the pipe.',
      'Segments onboarding tiers instead of applying white-glove 1:1 ops to small accounts.',
    ],
    redFlags: [
      'Only says "hire 20 more onboarding managers" (takes 3+ months to recruit & ramp, misses the 8-week goal).',
      'Ignores customer-side bottlenecks like client IT readiness.',
    ],
    followUpProbes: [
      'Data reveals 22 of the 47 days are spent waiting on customers to clean CSV schemas and sign InfoSec questionnaires. What do you change in Sales & Product?',
      'Sales VPs push back that your new "Ready-to-Onboard" checklist will slow down quarter-end deal closing. How do you align incentives?',
      'Show me the quick capacity math for how many specialists you need if bookings run at 120 logos/quarter.',
    ],
    sampleDiagramNodes: [
      { label: 'Sales Handoff Gate', kind: 'ops', x: 40, y: 120 },
      { label: 'Parallel InfoSec + Data', kind: 'data', x: 240, y: 60 },
      { label: 'Automated Config Kit', kind: 'agent', x: 240, y: 185 },
      { label: 'Stage Aging >5d Alert', kind: 'eval', x: 460, y: 120 },
      { label: 'TTFV < 20d / Activated ARR', kind: 'kpi', x: 670, y: 120 },
    ],
  },
  {
    id: 'ops-02',
    role: 'operations',
    secondaryRoles: ['consulting', 'fdpm'],
    round: 'case-strategy',
    difficulty: 'senior',
    timeLimitMin: 30,
    companyStyle: 'Uber / DoorDash / Scale AI Ops',
    title: 'European Managed Services Expansion: Capacity & Unit Economics',
    prompt:
      'Your US AI Data & Managed Operations business runs at 58% gross margin using a blended onshore/nearshore workforce. Leadership wants to launch in Germany and the UK next quarter to support 4 large European enterprise contracts under strict EU data residency. Model the capacity, unit economics, and operational launch plan.',
    promptZhHint:
      '【中文提示】国际化运营扩展案例：重点算清“GDPR/本地数据驻留对离岸外包的限制”如何冲击人力成本与毛利率，并用分层质量抽检、多语言排班与盈亏平衡点(Breakeven)给出落地策略。',
    frameworkSteps: [
      'Map regulatory & operational constraints: EU data residency (can tasks leave EEA?), German works-council/labor rules, bilingual domain skill supply.',
      'Build unit economics P&L per task/seat: Loaded EU labor cost vs. US/nearshore, utilization rate, QA review overhead, target >45-50% margin.',
      'Design staffing & hub strategy: e.g., high-compliance EU hub (Poland/Portugal/Ireland within EEA) + small in-country Germany/UK client leads.',
      'Build launch readiness plan (Weeks 1-12): legal entity/EOR, QA calibration, shift coverage, SLA ramp buffer.',
    ],
    strongHireSignals: [
      'Immediately spots that EU data residency breaks the cheap offshore margin model unless solved with an EEA nearshore hub (e.g. Warsaw/Lisbon/Bucharest).',
      'Factors ramp utilization curve (50% Week 1 -> 85% steady state) and QA overhead into launch P&L.',
      'Identifies EOR (Employer of Record) vs. local entity speed trade-off for a next-quarter launch.',
    ],
    redFlags: [
      'Assumes US labor rates and contractor flexibility apply directly in Germany.',
      'Forgets shift overlap, holidays, and ramp-up attrition.',
    ],
    followUpProbes: [
      'German labor costs push gross margin down from 58% to 34%. List 3 operational levers to recover 15 points of margin within 2 quarters.',
      'A client demands 24/7 2-hour SLA turnaround in German and French. How do you staff night/weekend coverage economically?',
      'What early warning metric in Month 1 tells you to pause UK expansion and stabilize Germany first?',
    ],
  },
  {
    id: 'ops-03',
    role: 'operations',
    secondaryRoles: ['pm', 'consulting'],
    round: 'case-strategy',
    difficulty: 'senior',
    timeLimitMin: 25,
    companyStyle: 'Amazon / DoorDash / BizOps',
    title: 'Fixing Broken Incentives: Launch Velocity vs. 2x 6-Month Churn',
    prompt:
      'Six months ago, you shifted Deployment & Ops leads’ bonuses to reward "Days-to-Launch" speed. Launch speed improved 35%—but 6-month customer churn doubled and support escalations spiked 3x. Diagnose the incentive failure and redesign the operating model and compensation scorecards.',
    promptZhHint:
      '【中文提示】典型“Goodhart定律(指标被当成目标后就会失效)”运营题：单维度奖励“上线速度”导致团队跳过数据校验与客户培训，把隐患推给了6个月后的续约与客服团队。需要引入质量门禁(Quality Gate)与组合平衡计分卡。',
    frameworkSteps: [
      'Diagnose mechanism of failure: single-axis speed bonus created "throw it over the wall" launches with weak customer enablement & brittle setups.',
      'Quantify downstream financial impact: faster initial booking recognition vs. destroyed LTV/CAC and support overload.',
      'Redesign balanced scorecard (Speed + Quality Gate + 90-Day Adoption): e.g., bonus only vests once customer crosses Day-60 usage/health threshold.',
      'Put hard launch exit criteria (Definition of Done) enforced independently from the launcher.',
      'Plan change-management rollout so top performers stay motivated rather than paralyzed.',
    ],
    strongHireSignals: [
      'Uses deferred vesting / paired quality guardrails (Speed × Healthy Day-60 Retention) so teams cannot game launch dates.',
      'Separates "Launch" from "Value Realization" milestones.',
      'Avoids swinging to the opposite extreme of slow bureaucratic sign-offs.',
    ],
    redFlags: [
      'Blames the ops managers’ work ethic instead of the broken incentive design.',
      'Adds 5 conflicting KPIs with equal tiny weights that confuse everyone.',
    ],
    followUpProbes: [
      'Ops reps complain: "I cannot control whether a customer uses the tool 60 days later!" How do you make the quality metric fair and controllable?',
      'How do you handle the transition quarter without cutting everyone’s variable pay unfairly?',
      'What leading indicator at Day 14 predicts 6-month churn with high precision?',
    ],
  },
  {
    id: 'ops-04',
    role: 'operations',
    secondaryRoles: ['pgm', 'consulting'],
    round: 'execution-metrics',
    difficulty: 'core',
    timeLimitMin: 25,
    companyStyle: 'Amazon WBR / Stripe BizOps',
    title: 'COO Monday WBR Dashboard (7 Metrics & Red-Flag Triggers)',
    prompt:
      'You are Chief of Staff / Ops Lead for a fast-growing $40M ARR AI Deployment & Operations org (120 FDEs, Ops managers, and Support engineers). The COO asks you to design the Monday Weekly Business Review (WBR) scorecard: pick the exact 7 metrics, explain why each earns its slot, and define the red-flag escalation triggers.',
    promptZhHint:
      '【中文提示】考察极强的结构化经营意识：一个好的 WBR 必须覆盖“供给产能/交付吞吐/质量健康/单位经济/客户价值/前置Pipeline预警”，而且每个指标必须对应明确负责人与触发动作(Trigger -> Playbook)。',
    frameworkSteps: [
      'State WBR design principles: actionable weekly (not quarterly lagging vanity metrics), covers Inputs -> Throughput -> Output Quality -> Margin.',
      'Select 7 high-signal metrics across 4 buckets: (1) Pipeline/Capacity Balance, (2) Delivery Velocity/Queue Aging, (3) Product/AI Quality & Escalations, (4) Gross Margin & Retention Leading Indicators.',
      'For each metric specify: Owner, Exact Definition, Green/Yellow/Red Threshold, and Pre-approved Playbook when Red.',
      'Explain what you explicitly left OUT (e.g., raw story points, vanity slide counts) to keep the meeting crisp in 45 minutes.',
    ],
    strongHireSignals: [
      'Balances leading input metrics (backlog aging, unstaffed launches) with output quality and gross margin.',
      'Attaches concrete red-flag triggers and an owner to every single metric.',
      'Knows how to run a data-first WBR (pre-read, exception-focused discussion, no status theater).',
    ],
    redFlags: [
      'Lists 15 disconnected metrics or slow quarterly financial numbers that do not move weekly.',
      'Includes zero threshold or action trigger ("we will discuss it if it looks bad").',
    ],
    followUpProbes: [
      'If you could only check 2 numbers while on vacation to know if the org is on fire, which 2 and why?',
      'Team leads start spending 6 hours every Friday formatting WBR slides manually. How do you automate and fix the culture?',
      'One metric goes Red 3 weeks in a row with the same excuse. What governance rule do you enforce?',
    ],
  },

  // ===================== 6. PROGRAM MANAGER (4) =====================
  {
    id: 'pgm-01',
    role: 'pgm',
    secondaryRoles: ['fde', 'operations'],
    round: 'execution-metrics',
    difficulty: 'senior',
    timeLimitMin: 30,
    companyStyle: 'Google / Meta / Stripe PgM',
    title: 'GA-3 Weeks War Room: Legal Data Residency + 2x Peak Load Risk',
    prompt:
      'You are Lead Technical Program Manager for an enterprise AI suite scheduled for General Availability in 3 weeks—anchored to an annual user conference keynote. Today: (1) Legal flags an EU data-residency subprocessor gap blocking 30% of launch pipeline, and (2) Load testing fails at 60% of projected keynote traffic. Run the 3-week war room.',
    promptZhHint:
      '【中文提示】TPM/PgM 灵魂题目：绝对不能泛泛而谈“大家加班”。必须展示：1) 关键路径切分与 Cut-line(保核心发布、拆分可延后能力)；2) 双线并行拆弹(合规隔离发布 vs 性能瓶颈定位)；3) 清晰的 Go/No-Go 门禁与高层二选一决策汇报。',
    frameworkSteps: [
      'Establish single-source-of-truth War Room & clear DRI (Directly Responsible Individual) per workstream.',
      'Triage both blockers on the critical path: isolate EU tenant flag/region gating (can US GA ship on time while EU stays controlled beta?) + bisect load failure (DB lock vs. LLM rate limit vs. cache miss).',
      'Define hard Cut-Line options (Tier-1 Must-Ship vs. Tier-2 Fast-Follow Day+14) to protect keynote credibility.',
      'Set daily burn-down cadence + objective Go/No-Go exit criteria at T-7 days and T-72 hours.',
      'Frame concise executive decision memo for VP/CEO with Option A / Option B and clear recommendation.',
    ],
    strongHireSignals: [
      'Proposes smart scoping (region-gating EU or progressive rollout) instead of binary "slip the keynote" or "ship broken".',
      'Separates technical load remediation from compliance/legal mitigation tracks.',
      'Gives executives pre-digested trade-offs with concrete dates, not raw panic.',
    ],
    redFlags: [
      'Says "we will ask engineering to work weekends" without cutting scope or testing contingency plans.',
      'Ignores Legal’s EU risk to hit a marketing date.',
    ],
    followUpProbes: [
      'At T-5 days, US load tests pass, but EU legal review will definitely miss GA by 10 days. VP of Sales insists you announce "Global GA" on stage anyway. How do you handle it?',
      'Two key staff engineers disagree for 48 hours on whether to fix the DB connection pool or add Redis caching. Break the deadlock.',
      'What goes into your Day-1 post-launch monitoring & rollback playbook?',
    ],
    sampleDiagramNodes: [
      { label: 'Keynote GA Gate (T-21d)', kind: 'ops', x: 40, y: 120 },
      { label: 'Track A: Load & Scale Fix', kind: 'agent', x: 250, y: 55 },
      { label: 'Track B: EU Region Flag', kind: 'eval', x: 250, y: 185 },
      { label: 'Cut-Line & Go/No-Go Gate', kind: 'ops', x: 470, y: 120 },
      { label: '99.9% Uptime / Zero Breach', kind: 'kpi', x: 675, y: 120 },
    ],
  },
  {
    id: 'pgm-02',
    role: 'pgm',
    secondaryRoles: ['fde', 'fdpm'],
    round: 'decomposition',
    difficulty: 'staff',
    timeLimitMin: 35,
    companyStyle: 'Databricks / Snowflake / Stripe',
    title: 'Multi-Region Platform Migration Across 6 Eng Teams + 10 Design Partners',
    prompt:
      'Your company must migrate 10 live enterprise design partners and 6 internal engineering teams from a legacy single-tenant V1 pipeline onto a new multi-tenant V2 agent runtime within 16 weeks—with zero customer downtime and strict backward API compatibility. Design the program architecture, dependency map, and migration sequence.',
    promptZhHint:
      '【中文提示】大型技术迁徙项目(Platform Migration)：关键在“影子双跑验证(Dual-run / Shadow Traffic) + 金丝雀客户分级迁移 + 双向回滚开关 + 避免大爆炸割接”。',
    frameworkSteps: [
      'Align on invariant exit criteria (zero data loss, p99 latency parity, <15 min rollback SLA, V1 deprecation date).',
      'Map 6-team dependency DAG (Auth/Tenant Isolation, Runtime Core, Connectors, Eval/Shadow Replay, Billing, Customer Success).',
      'Design zero-downtime migration pattern: Dual-write / Shadow Replay -> Canary on internal + 2 friendly partners -> Cohort waves -> V1 freeze & sunset.',
      'Manage customer comms & opt-in windows (avoiding month-end / peak financial close dates).',
      'Track migration burn-down via automated parity scorecard rather than manual status spreadsheets.',
    ],
    strongHireSignals: [
      'Uses Strangler Fig / Shadow Parity replay before cutting live partner traffic over.',
      'Schedules migration waves around customer business cycles (e.g., never migrate a finance client during quarter-end close).',
      'Prevents teams from adding net-new V1 features mid-migration via a hard V1 feature freeze.',
    ],
    redFlags: [
      'Plans a single weekend big-bang cutover for all 10 enterprise customers.',
      'Forgets rollback mechanics once data has been written to V2.',
    ],
    followUpProbes: [
      'By Week 10, 8 partners are on V2, but your largest $2M partner stalls because they built custom scripts relying on a V1 bug. Resolve this without blocking V1 sunset forever.',
      'One of the 6 eng teams keeps slipping their Auth milestone by 2 weeks every sprint. How do you intervene?',
      'How do you automate readiness tracking across 6 teams without creating meeting fatigue?',
    ],
  },
  {
    id: 'pgm-03',
    role: 'pgm',
    secondaryRoles: ['fdpm', 'pm'],
    round: 'behavioral',
    difficulty: 'senior',
    timeLimitMin: 25,
    companyStyle: 'Big Tech / Hyper-Growth PgM',
    title: 'Pushing Back on Mid-Quarter VP Demo Scope Creep',
    prompt:
      'Halfway through a tightly scoped Q3 reliability & core latency program, a senior VP sees a competitor demo and asks your team to squeeze in a flashy new voice-agent feature for an upcoming investor meeting in 3 weeks. Describe how you evaluate the request, push back or negotiate options, and protect team morale.',
    promptZhHint:
      '【中文提示】向上管理与需求挡箭牌经典考题：不要直接说“不行，这不在计划里”，而是用“透明账本(Trade-off Menu)”把代价摆在桌面上，并探索是否有低成本 Demo 原型替代方案。',
    frameworkSteps: [
      'Understand the true executive intent (is it an investor story proof-point, or a customer contract commitment?).',
      'Quantify exact impact of adding scope: which Q3 reliability milestones slip, by how many weeks, and what customer SLA risk increases.',
      'Present a clear 3-option menu: (1) Defer to Q4, (2) Build a bounded 3-day prototype sandbox isolated from core prod, (3) Trade/drop X explicitly in writing.',
      'Shield engineers from thrash until leadership locks the trade-off decision.',
    ],
    strongHireSignals: [
      'Translates "yes to this feature" into explicit "no to these 2 reliability milestones" with zero ambiguity.',
      'Separates "investor proof-of-concept video/sandbox" from "production GA commitment".',
      'Protects psychological safety and focus of engineering teams.',
    ],
    redFlags: [
      'Simply says "yes" and quietly dumps extra work on engineers.',
      'Says "no" defensively citing Jira rules without understanding the VP’s business urgency.',
    ],
    followUpProbes: [
      'The VP responds: "A great team finds a way to do both without slipping Q3." How do you answer in that room?',
      'If you agree to a bounded 3-day prototype, how do you stop Sales from selling that prototype as a live product?',
      'Share a real example from your own experience where pushing back changed a roadmap.',
    ],
  },
  {
    id: 'pgm-04',
    role: 'pgm',
    secondaryRoles: ['operations', 'consulting'],
    round: 'case-strategy',
    difficulty: 'staff',
    timeLimitMin: 30,
    companyStyle: 'Stripe / Google / Scale AI',
    title: 'Scaling Delivery Governance from 40 to 250 Builders Without Bureaucracy',
    prompt:
      'Eighteen months ago, 40 engineers and FDEs shipped fast via informal Slack chats. Now the org is 250 people across 3 time zones, and launches are colliding, dependencies break silently, and engineers complain about "too many status meetings." Design the minimal operating rhythm & governance system that scales.',
    promptZhHint:
      '【中文提示】组织运营系统设计(Scaling Eng/Delivery Rhythm)：核心理念是“高对齐、低会议摩擦(Async-first + Clear Interfaces + Lightweight Gates)”，保留初创敏捷性同时消除跨区隐性碰撞。',
    frameworkSteps: [
      'Diagnose what actually broke between 40 and 250 (n² communication explosion, unclear ownership/APIs, missing dependency contract, meeting sprawl).',
      'Define lightweight 3-tier operating cadence: Team-level async sprints -> Cross-team Dependency & Launch Gate -> Monthly Portfolio/Exec Review.',
      'Replace status meetings with async written artifacts (1-page RFCs, automated CI/release calendar, Red/Yellow/Green exception-only check-ins).',
      'Establish clear ownership primitives (Single-Threaded Owners, API contracts, Launch Readiness Tiers T1/T2/T3 so small changes stay fast).',
      'Measure governance health (Engineer Maker-Time %, Unplanned Rollbacks, Cross-Team Blocked Days).',
    ],
    strongHireSignals: [
      'Tiered launch rigor (not forcing a minor copy change through the same review gate as a multi-region DB migration).',
      'Replaces synchronous status updates with written async dashboards + exception-only meetings.',
      'Measures engineering friction (maker time, PR/launch cycle time) so PgM itself stays accountable.',
    ],
    redFlags: [
      'Imports heavy SAFe/waterfall committees and mandatory 2-hour weekly status calls.',
      'Leaves governance purely ad-hoc ("just hire better senior engineers").',
    ],
    followUpProbes: [
      'Two months after rollout, teams treat your async checklist as meaningless checkbox theater. How do you fix it?',
      'How do you adapt the cadence across SF, London, and Bangalore time zones?',
      'Which 2 meetings would you kill on Day 1?',
    ],
  },

  // ===================== 7. CONSULTING (4) =====================
  {
    id: 'cons-01',
    role: 'consulting',
    secondaryRoles: ['operations', 'fdpm'],
    round: 'case-strategy',
    difficulty: 'senior',
    timeLimitMin: 30,
    companyStyle: 'McKinsey / BCG / Bain Case',
    title: 'B2B SaaS + Services: Revenue +25% YoY While EBITDA Margin Fell 22% → 9%',
    prompt:
      'Your client is a $120M B2B Industrial Analytics software + implementation services company. Revenue grew 25% YoY, yet EBITDA margin collapsed from 22% to 9% over 4 quarters. The CEO asks you to find out why and present a turnaround plan to restore 20%+ EBITDA within 12 months.',
    promptZhHint:
      '【中文提示】咨询经典盈利能力案例(Profitability Case)：严格用 MECE 公式拆解 Profit = Revenue(Price×Vol, Mix) - Costs(COGS + OpEx)，特别敏锐地盯住“低毛利实施服务占比上升(Product Mix Shift)”和“客户交付人效下滑”。',
    frameworkSteps: [
      'Clarify revenue & cost baseline ($120M rev, 22%->9% = ~$15.6M margin compression; clarify timeline & divestiture constraints).',
      'Build MECE Profitability Issue Tree: Revenue Side (Software vs. Services Mix, Discounting, Churn) vs. Cost Side (Cloud/AI COGS, Implementation Labor Utilization, S&M CAC, G&A).',
      'Form hypothesis & probe data: e.g., mid-market/enterprise custom deployments grew faster than SaaS licenses, dragging blended gross margin + over-servicing fixed-fee pilots.',
      'Quantify exact dollar levers (e.g., re-price services / cap customization, automate top 3 onboarding connectors, cut cloud/LLM waste, target higher-margin verticals).',
      'Deliver 60-second Pyramid Synthesis (Answer first -> 3 quantified pillars -> risks & Day-1 quick wins).',
    ],
    strongHireSignals: [
      'Spots Revenue Mix Shift (services growing faster than high-margin software) immediately as a classic profitability trap.',
      'Does crisp mental math and checks sanity of dollar savings against the $13M-$15M EBITDA gap.',
      'Distinguishes quick 90-day margin levers from 12-month structural productization.',
    ],
    redFlags: [
      'Recites a generic profitability framework without tailoring branches to SaaS + Services economics.',
      'Recommends slashing R&D or Sales blindly without checking LTV/retention damage.',
    ],
    followUpProbes: [
      'Data confirms: Software ARR stayed 80% GM ($80M), while Implementation Services grew from $16M to $40M at -5% margin due to fixed-price overruns. Calculate total company GM change.',
      'If you fire or stop custom implementations tomorrow, enterprise software bookings drop 35%. How do you bridge that?',
      'Give me your 60-second CEO synthesis right now.',
    ],
    sampleDiagramNodes: [
      { label: 'EBITDA 22% → 9%', kind: 'kpi', x: 40, y: 120 },
      { label: 'Mix Shift (SaaS vs Svc)', kind: 'data', x: 250, y: 50 },
      { label: 'Delivery Overruns / COGS', kind: 'ops', x: 250, y: 185 },
      { label: 'Productize & Re-Price', kind: 'agent', x: 470, y: 120 },
      { label: 'Target +$14M EBITDA', kind: 'kpi', x: 675, y: 120 },
    ],
  },
  {
    id: 'cons-02',
    role: 'consulting',
    secondaryRoles: ['pm', 'operations'],
    round: 'estimation',
    difficulty: 'core',
    timeLimitMin: 20,
    companyStyle: 'BCG / Bain Market Sizing',
    title: 'Market Sizing: Annual AI Workflow Software Spend in US Mid-Market Logistics',
    prompt:
      'Estimate the total addressable annual software spend (TAM & SAM) for AI-powered dispatch & back-office workflow automation across US mid-market logistics and freight companies (50–1,000 employees). Show your structure, assumptions, math, and sanity check.',
    promptZhHint:
      '【中文提示】Market Sizing 高分铁律：先写公式再代数字、数字取整方便心算、区分全量TAM与可触达SAM(考虑数字化成熟度)、最后务必做一次“自上而下/宏观GDP占比”交叉验证(Sanity Check)。',
    frameworkSteps: [
      'Define exact scope: US geography, Mid-market logistics/3PL/brokerage firms (50-1,000 employees), annual recurring software spend (not freight GMV).',
      'Choose clean Bottom-Up equation: (# US Mid-Market Logistics Firms) × (Eligible % with back-office pain) × (Avg Back-Office/Dispatch Seats or Shipment Volume) × (Annual AI Software ACV / Seat or Workflow).',
      'Walk step-by-step with round numbers (~30K-40K total logistics/freight firms? Refine mid-market tier ~10%-15%, ~4,000-5,000 firms; or anchor on US ~330M pop / ~150M workforce / logistics share).',
      'Apply realistic SaaS vs. AI willingness-to-pay pricing ($40K-$100K/yr ACV) to differentiate TAM vs. 3-year SAM.',
      'Perform Sanity Check against total US freight brokerage/3PL market (~$300B+ industry, IT/software spend ~1-2%).',
    ],
    strongHireSignals: [
      'States the full algebraic equation BEFORE plugging in a single assumption.',
      'Explicitly separates freight revenue from software IT budget share.',
      'Runs an independent top-down sanity check and catches unreasonable numbers on the spot.',
    ],
    redFlags: [
      'Confuses total logistics freight spend (hundreds of billions) with software TAM.',
      'Gets tangled in messy decimals like 3.74% instead of clean round benchmarks.',
    ],
    followUpProbes: [
      'Your sanity check implies every mid-market firm spends 40% of its net profit on your software. Adjust your ACV or adoption assumptions.',
      'If your AI agent replaces 30% of dispatcher labor rather than sitting as a SaaS seat tool, how much larger does your capturable wallet share get?',
      'Which sub-segment inside mid-market logistics would you target first?',
    ],
  },
  {
    id: 'cons-03',
    role: 'consulting',
    secondaryRoles: ['ai-pm', 'fdpm'],
    round: 'case-strategy',
    difficulty: 'senior',
    timeLimitMin: 30,
    companyStyle: 'McKinsey / BCG Digital Case',
    title: 'Healthcare Diagnostics Leader: AI Triage Build vs. Buy vs. Partner',
    prompt:
      'A $4B public healthcare diagnostics company processes 250M lab orders/year. Management wants to deploy generative AI + multimodal triage across prior-auth and abnormal result follow-ups within 12 months. Should they Build in-house, Buy a specialized startup, or Partner with a frontier AI/FDE vendor? Structure the decision.',
    promptZhHint:
      '【中文提示】咨询经典 Build vs Buy vs Partner 战略评估：按“上市时间(12个月硬约束)、核心差异化壁垒(患者数据隐私与临床流程)、资本/OPEX、监管合规(HIPAA/FDA)与技术人才可得性”构建打分矩阵并给出清晰建议。',
    frameworkSteps: [
      'Clarify strategic goal (cost savings vs. turnaround speed vs. proprietary moat) and the hard 12-month timeline.',
      'Evaluate 3 strategic options (Build In-House, Acquire Niche AI Startup, Strategic Partner + FDE Co-build) across 5 weighted criteria: Time-to-Value, Regulatory/HIPAA Control, Total Cost & ROI, Talent Feasibility, Long-Term IP Ownership.',
      'Spot deal-breakers: 12-month deadline + conservative legacy IT makes pure in-house Build unrealistic; FDA/clinical liability favors controlled Partner/Acquire for workflow layer while licensing base models.',
      'Recommend hybrid path (e.g. Partner with frontier FDE platform for immediate 6-month rollout with clear data isolation, retain proprietary clinical workflow & eval IP, keep optional M&A path open).',
      'Outline 90-day governance & pilot validation milestones.',
    ],
    strongHireSignals: [
      'Recognizes that non-tech $4B incumbents usually fail at retaining top AI engineers for pure in-house foundational builds.',
      'Separates commodity model layer (Partner/API) from proprietary clinical data & workflow layer (Own).',
      'Addresses HIPAA/FDA liability and legacy lab-system integration risks explicitly.',
    ],
    redFlags: [
      'Recommends building a proprietary LLM from scratch in 12 months.',
      'Treats M&A integration as instant with zero culture or tech-stack friction.',
    ],
    followUpProbes: [
      'The CTO pushes back: "If we partner, we create vendor lock-in and hand over our crown-jewel clinical insights." How do you structure contract & architecture protections?',
      'What financial hurdle rate or payback period makes Acquiring a $60M Series B startup better than Partnering?',
      'Which single workflow out of prior-auth vs. abnormal lab triage should launch in Phase 1 and why?',
    ],
  },
  {
    id: 'cons-04',
    role: 'consulting',
    secondaryRoles: ['pgm', 'fdpm'],
    round: 'behavioral',
    difficulty: 'core',
    timeLimitMin: 20,
    companyStyle: 'MBB / Strategy Exec Comm',
    title: '60-Second Pyramid Principle Synthesis to a Skeptical CEO',
    prompt:
      'Imagine you just spent 3 weeks investigating why a global B2B tech company’s new AI Operations platform has 85% pilot sign-ups but only 22% daily active usage after Month 2. You have 60 seconds with an impatient CEO walking to the elevator. Deliver the Pyramid Principle synthesis—and defend against rapid-fire pushback.',
    promptZhHint:
      '【中文提示】金字塔原理(Pyramid Principle)压轴训练：结论先行(Answer First) -> 3个MECE支撑论据(带具体数字/归因) -> 清晰可执行建议 + 下一步行动(Next Step)。千万不要按调研时间线流水账汇报！',
    frameworkSteps: [
      'Lead immediately with the Governing Thought (the Answer & Headline Recommendation in Sentence 1).',
      'Give exactly 3 MECE supporting pillars (e.g., Data Readiness Friction, Missing Workflow Integration, Unclear Supervisor ROI) backed by crisp evidence.',
      'State the top 2 concrete actions, expected 90-day lift, and single decision needed from the CEO right now.',
      'Acknowledge the #1 risk and how you mitigate it—all inside ~150 words / 60 seconds.',
    ],
    strongHireSignals: [
      'Zero throat-clearing ("First let me tell you who we interviewed...")—puts the conclusion in the very first sentence.',
      'Groups findings into 3 clean, mutually exclusive buckets rather than a 7-item laundry list.',
      'Ends with a concrete ask for the CEO.',
    ],
    redFlags: [
      'Tells a chronological story of the 3-week investigation before stating the point.',
      'Uses vague filler words ("maybe", "we could explore", "various issues").',
    ],
    followUpProbes: [
      'The CEO interrupts at second 20: "So you are saying my engineering team built the wrong product?" Defuse and pivot crisply.',
      'Now deliver the exact same insight rewritten for the Head of FDE Deployment rather than the CEO.',
      'Share a real story where you had to deliver tough news to a senior executive quickly—what happened?',
    ],
  },
];
