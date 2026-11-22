import { RoleTrack } from './types';

export interface AnalyzedVocabResult {
  phonetic: string;
  meaning: string;
  example: string;
  notes: string;
  roles: RoleTrack[];
}

const CURATED_TECH_VOCAB: Record<string, AnalyzedVocabResult> = {
  hallucination: {
    phonetic: '/həˌluːsɪˈneɪʃən/ (huh-loo-si-NAY-shun)',
    meaning: '幻觉（大模型生成看似合理但与事实或约束不符的输出）',
    example:
      'To eliminate hallucinations in high-stakes workflows, we pair probabilistic LLM generation with deterministic schema validators.',
    notes: '重音在 -NAY- 上，结尾 -tion 轻读为 shun。',
    roles: ['ai-pm', 'fde', 'fdpm'],
  },
  latency: {
    phonetic: '/ˈleɪtənsi/ (LAY-tuhn-see)',
    meaning: '延迟（系统从接收请求到返回首字/结果的时间开销）',
    example:
      'We reduced P95 latency by routing lightweight intent classification to a smaller model while preserving accuracy.',
    notes: '重音在第一音节 LAY，注意不要读成 LA-ten-cy。',
    roles: ['fde', 'ai-pm', 'pgm'],
  },
  throughput: {
    phonetic: '/ˈθruːpʊt/ (THROO-put)',
    meaning: '吞吐量（单位时间内系统成功处理的请求或任务总数）',
    example:
      'Batching embedding calls doubled our pipeline throughput without breaching our token budget.',
    notes: '合成词 through + put，重音在 THROO，咬舌音 th。',
    roles: ['fde', 'pgm', 'operations'],
  },
  orchestration: {
    phonetic: '/ˌɔːrkɪˈstreɪʃən/ (or-ki-STRAY-shun)',
    meaning: '编排（对多个 Agent、工具调用与状态流转的协同调度）',
    example:
      'Our orchestration layer enforces retry budgets and permission boundaries across multi-step agent runs.',
    notes: '重音在 -STRAY- 上，中间 ch 读 /k/ 音（类似 orchestra）。',
    roles: ['fde', 'ai-pm', 'fdpm', 'pgm'],
  },
  guardrail: {
    phonetic: '/ˈɡɑːrdreɪl/ (GARD-rayl)',
    meaning: '护栏 / 安全边界（防止 AI 越权、幻觉或违规输出的控制机制）',
    example:
      'Deterministic guardrails catch invalid JSON or unauthorized DB mutations before any write-back executes.',
    notes: '重音在 GARD，面试聊 AI 安全与可靠性高频词。',
    roles: ['ai-pm', 'fde', 'fdpm', 'pm'],
  },
  guardrails: {
    phonetic: '/ˈɡɑːrdreɪlz/ (GARD-raylz)',
    meaning: '护栏 / 安全边界（防止 AI 越权、幻觉或违规输出的控制机制）',
    example:
      'Deterministic guardrails catch invalid JSON or unauthorized DB mutations before any write-back executes.',
    notes: '重音在 GARD，常与 deterministic / HITL 搭配。',
    roles: ['ai-pm', 'fde', 'fdpm', 'pm'],
  },
  telemetry: {
    phonetic: '/təˈlemətri/ (tuh-LEM-uh-tree)',
    meaning: '遥测数据（自动采集的系统日志、Trace、指标与故障诊断信号）',
    example:
      'Our telemetry deterministically distinguishes between a context slip, a tool API timeout, and a permission block.',
    notes: '重音在第二个音节 -LEM-，不要读成 TELE-metry。',
    roles: ['pgm', 'fde', 'ai-pm'],
  },
  reconciliation: {
    phonetic: '/ˌrekənsɪliˈeɪʃən/ (rek-uhn-sil-ee-AY-shun)',
    meaning: '对账 / 状态对齐（核对并修复上下游系统数据不一致的过程）',
    example:
      'We built an automated nightly reconciliation job to verify ERP order state against our shadow ledger.',
    notes: '较长词汇，按音节拆成 rek-on-sili-AY-shun，重音在 AY。',
    roles: ['operations', 'fde', 'fdpm'],
  },
  canonical: {
    phonetic: '/kəˈnɒnɪkəl/ (kuh-NON-i-kul)',
    meaning: '规范的 / 标准统一的（如 Canonical Data Model 统一数据模型）',
    example:
      'Client-specific ERP adapters map messy payloads into a single canonical schema so core logic stays clean.',
    notes: '重音在第二音节 -NON-，不要读成 CAN-on-i-cal。',
    roles: ['fde', 'fdpm', 'pgm'],
  },
  amortized: {
    phonetic: '/ˈæmərtaɪzd/ (AM-er-tyzd)',
    meaning: '摊销的 / 均摊的（将一次性研发或算力成本分摊到长期使用中）',
    example:
      'Although the initial integration took two weeks, the amortized engineering cost dropped 80% by customer five.',
    notes: '重音在第一音节 AM，结尾 -ized 读 /aɪzd/。',
    roles: ['consulting', 'pm', 'operations'],
  },
  counterfactual: {
    phonetic: '/ˌkaʊntərˈfæktʃuəl/ (kown-ter-FAK-choo-uhl)',
    meaning: '反事实的（用于因果推断：如果没有采取某策略结果会怎样）',
    example:
      'To prove incremental GMV, we ran a counterfactual holdout against matched baseline sellers.',
    notes: '重音在 -FAK-，常见于增量效果归因与 AB 实验面试。',
    roles: ['pm', 'ai-pm', 'consulting'],
  },
  ephemeral: {
    phonetic: '/ɪˈfemərəl/ (ih-FEM-er-uhl)',
    meaning: '临时的 / 阅后即焚的（如按需拉起、用完即销毁的沙盒环境）',
    example:
      'Every untrusted code execution runs inside an ephemeral microVM sandbox with strict network isolation.',
    notes: '重音在 -FEM-，ph 发 /f/ 音。',
    roles: ['fde', 'pgm'],
  },
  heuristic: {
    phonetic: '/hjʊˈrɪstɪk/ (hyoo-RIS-tik)',
    meaning: '启发式规则（基于经验的快速近似判断，区别于大模型推理）',
    example:
      'We filter obvious noise with cheap deterministic heuristics before invoking expensive LLM reasoning.',
    notes: '重音在 -RIS-，开头读 hyoo。',
    roles: ['fde', 'ai-pm', 'pm'],
  },
  resilience: {
    phonetic: '/rɪˈzɪliəns/ (ri-ZIL-yuhns)',
    meaning: '韧性 / 容错恢复能力（系统面对节点故障或异常流量的抗压能力）',
    example:
      'AI infra resilience requires automated failure attribution and graceful degradation when GPU clusters fail.',
    notes: '重音在 -ZIL-，s 发 /z/ 音。',
    roles: ['pgm', 'fde', 'operations'],
  },
  scalability: {
    phonetic: '/ˌskeɪləˈbɪləti/ (skay-luh-BIL-uh-tee)',
    meaning: '可扩展性（系统在负载或客户数量成倍增长时保持性能的能力）',
    example:
      'Isolating bespoke client glue in adapters is what unlocks multi-tenant scalability.',
    notes: '重音在 -BIL-，开头读 skay。',
    roles: ['fde', 'fdpm', 'pgm'],
  },
  inference: {
    phonetic: '/ˈɪnfərəns/ (IN-fer-uhns)',
    meaning: '推理（模型加载权重后对输入生成预测结果的计算过程）',
    example:
      'Logging full inference lineage lets enterprise teams audit which base model served each decision.',
    notes: '重音在第一音节 IN-，常与 latency / cost / lineage 连用。',
    roles: ['ai-pm', 'fde', 'pgm'],
  },
};

export async function analyzeVocabFallback(rawWord: string): Promise<AnalyzedVocabResult> {
  const clean = rawWord.trim();
  const key = clean.toLowerCase();

  if (CURATED_TECH_VOCAB[key]) {
    return CURATED_TECH_VOCAB[key];
  }

  // Try free public dictionary API for real IPA + definition + example when online
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`,
      { signal: controller.signal }
    );
    clearTimeout(timer);

    if (res.ok) {
      const entries = (await res.json()) as Array<{
        phonetic?: string;
        phonetics?: Array<{ text?: string }>;
        meanings?: Array<{
          partOfSpeech?: string;
          definitions?: Array<{ definition?: string; example?: string }>;
        }>;
      }>;
      const first = entries?.[0];
      const ipa =
        first?.phonetic ||
        first?.phonetics?.find((p) => p.text && p.text.trim().length > 0)?.text ||
        '';
      const firstMeaning = first?.meanings?.[0];
      const firstDef = firstMeaning?.definitions?.[0];
      const pos = firstMeaning?.partOfSpeech ? `(${firstMeaning.partOfSpeech}) ` : '';
      const defText = firstDef?.definition ?? '';
      const exText =
        firstDef?.example ||
        `In our production AI workflow, "${clean}" is a core consideration for reliability and scale.`;

      return {
        phonetic: ipa || `/${key}/`,
        meaning: defText ? `${pos}${defText}` : `${clean}（面试高频术语，建议补充中文释义）`,
        example: exText,
        notes: ipa
          ? `已自动抓取音标 ${ipa}；可在上方点击「发音」跟读确认重音。`
          : '建议结合上方「发音」按钮跟读并补充重音提示。',
        roles: ['ai-pm', 'fde', 'pm'],
      };
    }
  } catch {
    // Offline or timeout — return clean structured template
  }

  return {
    phonetic: `/${key}/`,
    meaning: `${clean}（面试核心术语 — 可补充中文释义与业务场景）`,
    example: `When designing enterprise AI systems, we explicitly account for ${clean} to ensure production reliability.`,
    notes: '点击卡片上的「发音」按钮即可跟读，或配置 Gemini API Key 获取自动中文释义与音节拆解。',
    roles: ['ai-pm', 'fde'],
  };
}
