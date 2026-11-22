import { KnowledgeSnippet, VocabItem } from './types';

export const SEED_VOCAB_ITEMS: VocabItem[] = [
  {
    id: 'vocab-deterministic',
    word: 'Deterministic',
    phonetic: '/dɪˌtɜːrmɪˈnɪstɪk/ (di-TER-mi-NIS-tik)',
    meaning: '确定性的（给定相同输入必然产生相同输出，如编译器/Schema校验）',
    example:
      'We pair probabilistic LLM generation with a deterministic Python schema validator before mutating production state.',
    roles: ['fde', 'fdpm', 'ai-pm'],
    notes: '重音在 -NIS- 上，不要读成 de-ter-MIN-istic。',
    updatedAt: '2026-11-22T00:00:00.000Z',
  },
  {
    id: 'vocab-probabilistic',
    phonetic: '/ˌprɒbəbɪˈlɪstɪk/ (prob-uh-bi-LIS-tik)',
    word: 'Probabilistic',
    meaning: '概率性的（存在随机性/幻觉风险的大模型生成过程）',
    example:
      'Probabilistic generation handles ambiguity well, but needs deterministic guardrails in enterprise workflows.',
    roles: ['fde', 'ai-pm', 'fdpm'],
    notes: '重音在 -LIS- 上，常与 Deterministic 成对出现。',
    updatedAt: '2026-11-22T00:00:00.000Z',
  },
  {
    id: 'vocab-attribution',
    word: 'Attribution',
    phonetic: '/ˌætrɪˈbjuːʃən/ (a-tri-BYOO-shun)',
    meaning: '归因 / 根因定位（如 Automated Failure Attribution 自动故障归因）',
    example:
      'Automated failure attribution distinguishes between a context slip, a tool API timeout, and a permission boundary block.',
    roles: ['pgm', 'fde', 'ai-pm'],
    notes: '注意重音在 -BYOO-，动词 attribute 重音在 -TRIB-。',
    updatedAt: '2026-11-22T00:00:00.000Z',
  },
  {
    id: 'vocab-idempotent',
    word: 'Idempotent',
    phonetic: '/ˌaɪdɪmˈpoʊtənt/ (EYE-dem-POH-tent)',
    meaning: '幂等的（同一操作重试多次与执行一次效果完全相同）',
    example:
      'Every write-back webhook in our ERP adapter is idempotent so network retries never duplicate orders.',
    roles: ['fde', 'operations', 'pgm'],
    notes: '面试系统设计高频词，开头读 EYE，重音在 POH。',
    updatedAt: '2026-11-22T00:00:00.000Z',
  },
  {
    id: 'vocab-provenance',
    word: 'Provenance',
    phonetic: '/ˈprɒvənəns/ (PROV-uh-nuhns)',
    meaning: '溯源 / 血缘（模型或数据的来源与合规谱系）',
    example:
      'Enterprise buyers are waking up to model provenance and supply-chain governance risks.',
    roles: ['ai-pm', 'pm', 'consulting'],
    notes: '重音在第一音节 PROV，等同于 audit lineage 的核心词。',
    updatedAt: '2026-11-22T00:00:00.000Z',
  },
  {
    id: 'vocab-observability',
    word: 'Observability',
    phonetic: '/əbˌzɜːrvəˈbɪləti/ (ub-zer-vuh-BIL-uh-tee)',
    meaning: '可观测性（通过日志、Trace、指标定位复杂系统黑盒问题）',
    example:
      'When multi-step agent runs fail at 3 a.m., observability across model, tool, and permission layers is the real bottleneck.',
    roles: ['fde', 'pgm', 'ai-pm'],
    notes: '重音在 -BIL-，连读流畅即可。',
    updatedAt: '2026-11-22T00:00:00.000Z',
  },
];

export const SEED_KNOWLEDGE_SNIPPETS: KnowledgeSnippet[] = [
  {
    id: 'snippet-lean-riemann',
    title:
      '1. Pairing Probabilistic Generation with Deterministic Verification (Claude + Lean Riemann Hypothesis Proof Breakthrough)',
    soundbite:
      '"The biggest takeaway from today\'s Lean-verified Riemann Hypothesis breakthrough isn\'t just that an LLM can reason at a frontier level—it\'s the architecture behind it: probabilistic generation paired with a deterministic compiler that accepts zero hallucinations. In enterprise AI, I apply that exact same pattern—letting models handle ambiguity while enforcing strict Python schema assertions, type checks, and state-machine invariants as our deterministic \'compiler\' before any action hits production."',
    roles: ['ai-pm', 'fdpm', 'fde', 'pgm'],
    triggerQuestion:
      'How do you guarantee reliability and eliminate hallucinations when deploying probabilistic AI models into high-stakes business workflows?',
    deliveryTemplate:
      'Step 1 (Anchor on Today\'s Landmark News): "Look at how Levent Alpöge and Claude just cracked the Riemann Hypothesis—Claude generated millions of lines of candidate proofs, but the Lean compiler served as an unforgiving deterministic gatekeeper."\n\nStep 2 (Translate into Your Product Architecture): "That \'generate-and-verify\' separation is the core of how I ship production AI. I never trust raw model outputs to mutate a database directly. Instead, I build deterministic perimeter validators—checking JSON schemas, null edge cases, and business rules—so bad outputs are caught and routed to fallback paths automatically."',
    tags: ['AI Architecture', 'Guardrails', 'Reliability', 'FDE/FDPM'],
    updatedAt: '2026-11-22T00:00:00.000Z',
  },
  {
    id: 'snippet-model-governance',
    title:
      '2. Model-Agnostic Routing & Supply-Chain Governance (House Report on Cursor & Base Models)',
    soundbite:
      '"With yesterday\'s Congressional report putting underlying model lineage under intense scrutiny—and platforms like Cursor weighing how to decouple from specific open-weight base models—model governance is no longer just a legal footnote; it\'s a core architectural requirement. As a PM, I abstract model providers behind a unified routing and policy gateway so enterprises can swap underlying weights, enforce data residency, and maintain audit lineage without rewriting application logic."',
    roles: ['ai-pm', 'pm', 'pgm', 'consulting'],
    triggerQuestion:
      'How do you design an AI platform to handle rapidly shifting model providers, compliance requirements, and enterprise security reviews?',
    deliveryTemplate:
      'Step 1 (Cite the Geopolitical & Compliance Catalyst): "Enterprise buyers are waking up to model provenance risks—as highlighted by this week\'s House committee report on base-model dependencies in developer tools."\n\nStep 2 (Present Your Architectural Safeguard): "That\'s why I treat model selection as a configurable policy layer rather than a hardcoded dependency. By standardizing tool contracts, logging full inference lineage, and routing requests through a governance gateway, teams can hot-swap models for compliance, latency, or cost reasons with zero downtime."',
    tags: ['Model Governance', 'Enterprise AI', 'Routing Gateway', 'Compliance'],
    updatedAt: '2026-11-22T00:00:00.000Z',
  },
  {
    id: 'snippet-failure-attribution',
    title:
      '3. Reverse Q&A / Automated Failure Attribution at Scale (NVIDIA TPM - AI Infra Resilience & Apple macOS 27.3 Agent Permissions)',
    soundbite:
      '"Between Apple adding system-level permission warnings for third-party agents in macOS 27.3 and infrastructure teams racing to eliminate finger-pointing when multi-thousand-GPU clusters or complex agent runs fail at 3 a.m., observability is becoming the real bottleneck. When one of your production agent workflows fails mid-execution, how structured is your automated failure attribution—specifically, can your telemetry deterministically distinguish between a prompt/context slip, a tool API timeout, and a permission boundary block?"',
    roles: ['pgm', 'fde', 'ai-pm', 'operations'],
    triggerQuestion:
      'Reverse Q&A ("What questions do you have for us?") at the end of an interview — NVIDIA TPM, Principal Engineer, or Head of Product rounds.',
    deliveryTemplate:
      'Why it works: Instead of asking vague questions about roadmap challenges, you pinpoint the exact diagnostic pain point described in top-tier infrastructure JDs (automated root-cause attribution across model, tool, and permission layers)—immediately signaling peer-level systems mastery.',
    tags: ['Reverse Q&A', 'AI Infra', 'Observability', 'TPM'],
    updatedAt: '2026-11-22T00:00:00.000Z',
  },
];
