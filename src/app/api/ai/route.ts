import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import {
  evaluateSessionLocally,
  generateLocalCustomLoop,
  generateLocalInterviewerReply,
} from '@/lib/local-coach';
import { PERSONA_CONFIGS, ROLES_BY_ID } from '@/lib/roles';
import { analyzeVocabFallback } from '@/lib/vocab-analyzer';
import {
  ChatMessage,
  CustomLoopPlan,
  DiagramEdge,
  DiagramNode,
  GeminiModelChoice,
  InterviewQuestion,
  InterviewerPersona,
  LanguageMode,
  RoleTrack,
  RoundType,
} from '@/lib/types';

const ALLOWED_MODELS: Record<string, string> = {
  'gemini-4-hydrogen': 'gemini-3.8-flash',
  'gemini-4-argon': 'gemini-4-argon',
  'gemini-3.8-flash': 'gemini-3.8-flash',
  'gemini-flash-latest': 'gemini-flash-latest',
};

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }
  return trimmed;
}

function getLangInstruction(language: LanguageMode): string {
  if (language === 'zh') {
    return 'Respond primarily in crisp professional Chinese (简体中文), keeping standard English tech/business acronyms (FDE, FDPM, MECE, HITL, Evals, ARR, WBR) where natural.';
  }
  if (language === 'bilingual') {
    return 'Respond in crisp professional English, and append a brief 1-line "💡 中文提示：" takeaway at the end when helpful.';
  }
  return 'Respond in crisp, natural English suitable for top US tech/consulting interviews.';
}

export async function POST(req: NextRequest) {
  let body: {
    action?:
      | 'interviewer_turn'
      | 'evaluate_session'
      | 'generate_loop'
      | 'analyze_vocab'
      | 'dashboard_ask'
      | 'review_speech'
      | 'analyze_jd'
      | 'analyze_common_jds'
      | 'match_resume_jd'
      | 'analyze_article';
    model?: string;
    language?: LanguageMode;
    payload?: Record<string, unknown>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const action = body.action;
  const language: LanguageMode = body.language ?? 'bilingual';
  const payload = body.payload ?? {};
  const chosenModel: string =
    ALLOWED_MODELS[body.model ?? ''] ??
    ALLOWED_MODELS[process.env.GEMINI_MODEL ?? ''] ??
    'gemini-3.8-flash';

  const headerKey = req.headers.get('x-gemini-api-key')?.trim();
  const envKey = process.env.GEMINI_API_KEY?.trim();
  const apiKey = headerKey || envKey || '';

  const runFallback = async (warning?: string) => {
    if (action === 'analyze_jd') {
      const jdText = String(payload.jdText ?? '').trim();
      const company = String(payload.company ?? 'Target Company').trim() || 'Target Company';
      const roleTitle = String(payload.roleTitle ?? 'Applied AI / PM').trim() || 'Applied AI / PM';
      const hasImage = Boolean(payload.imageDataUrl);
      const lower = jdText.toLowerCase();

      const skillCandidates = [
        ['python', 'Python'],
        ['typescript', 'TypeScript'],
        ['sql', 'SQL & Analytics'],
        ['rag', 'RAG Retrieval'],
        ['eval', 'Eval Harnesses'],
        ['agent', 'Agentic Workflows'],
        ['guardrail', 'Deterministic Guardrails'],
        ['api', 'API & Integration'],
        ['erp', 'Legacy ERP / CRM'],
        ['llm', 'LLM Orchestration'],
        ['safety', 'AI Safety & Governance'],
        ['roi', 'ROI & Commercialization'],
        ['latency', 'Latency & SLA Optimization'],
        ['stakeholder', 'Executive Stakeholder Alignment'],
      ];
      const matchedSkills = skillCandidates
        .filter(([k]) => lower.includes(k))
        .map(([, label]) => label);
      const extractedSkills =
        matchedSkills.length > 0
          ? matchedSkills.slice(0, 6)
          : ['AI Workflow Architecture', 'Eval & Guardrails', 'Cross-Functional Execution', 'Metrics & ROI'];

      const coreCapabilities = [
        'Ambiguity Decomposition & Problem Framing',
        'End-to-End Production Delivery (30-60-90)',
        'Deterministic Verification & Risk Mitigation',
      ];

      const summary = hasImage && !jdText
        ? `已保存 ${company} 的 JD 截图！在左下角 Settings 配置 Gemini API Key 后可自动 OCR 识别截图文字；你也可以直接补充关键 JD 要点进行精准匹配。`
        : `${company} (${roleTitle}) 核心考察 ${extractedSkills.slice(0, 3).join('、')}，并强调从模糊需求快速落地可量化业务结果。`;

      return NextResponse.json({
        mode: 'local_fallback',
        warning,
        data: {
          company,
          roleTitle,
          extractedSkills,
          coreCapabilities,
          summary,
          jdTextExtracted: jdText,
        },
      });
    }
    if (action === 'analyze_common_jds') {
      const jds = Array.isArray(payload.jds)
        ? (payload.jds as Array<{
            company?: string;
            roleTitle?: string;
            extractedSkills?: string[];
            coreCapabilities?: string[];
          }>)
        : [];
      const skillCounts = new Map<string, number>();
      const capCounts = new Map<string, number>();
      jds.forEach((j) => {
        (j.extractedSkills ?? []).forEach((s) =>
          skillCounts.set(s, (skillCounts.get(s) ?? 0) + 1)
        );
        (j.coreCapabilities ?? []).forEach((c) =>
          capCounts.set(c, (capCounts.get(c) ?? 0) + 1)
        );
      });
      const commonSkills = Array.from(skillCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([skill, frequency]) => ({ skill, frequency }));
      const coreCapabilities = Array.from(capCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([c]) => c);

      return NextResponse.json({
        mode: 'local_fallback',
        warning,
        data: {
          commonSkills,
          coreCapabilities,
          prepPriorities: [
            `优先打磨覆盖最多岗位的 ${commonSkills.slice(0, 3).map((s) => s.skill).join(' / ') || 'AI 系统架构与 Eval 护栏'} 实战案例`,
            '准备 2 个包含量化 ROI（准确率、P95 延迟、回本周期）的 STAR+L 核心故事',
            '用 Knowledge Hub 闪卡抽查高频架构金句，确保每个赛道 30 秒开场白脱口而出',
          ],
          summary: `已横向对比 ${jds.length} 个目标岗位：最高频共同技能集中在 ${commonSkills
            .slice(0, 4)
            .map((s) => `${s.skill} (${s.frequency}/${jds.length})`)
            .join('、')}。`,
        },
      });
    }
    if (action === 'match_resume_jd') {
      const jdTitle = String(payload.jdTitle ?? 'Target Role');
      const jdText = String(payload.jdText ?? '');
      const resumeLabel = String(payload.resumeLabel ?? 'Selected Resume');
      const resumeContent = String(payload.resumeContent ?? '');
      const jdWords = new Set(
        jdText
          .toLowerCase()
          .split(/[^a-z0-9+#.-]+/)
          .filter((w) => w.length >= 4)
      );
      const resLower = resumeContent.toLowerCase();
      const matched: string[] = [];
      const missing: string[] = [];
      const highSignalKeywords = [
        'agentic',
        'rag',
        'eval',
        'deterministic',
        'guardrail',
        'python',
        'typescript',
        'latency',
        'roi',
        'erp',
        'safety',
        'governance',
        'attribution',
        'routing',
        'design partner',
        'hitl',
      ];
      highSignalKeywords.forEach((kw) => {
        if (jdText.toLowerCase().includes(kw) || jdWords.has(kw)) {
          if (resLower.includes(kw)) matched.push(kw);
          else missing.push(kw);
        }
      });
      const total = matched.length + missing.length;
      const matchScore = total > 0 ? Math.min(96, Math.max(58, Math.round((matched.length / total) * 40 + 55))) : 78;

      return NextResponse.json({
        mode: 'local_fallback',
        warning,
        data: {
          matchScore,
          matchedStrengths:
            matched.length > 0
              ? matched.map((k) => `简历已覆盖关键能力词：${k}`)
              : ['简历具备端到端 AI 工作流交付与跨团队推进基础'],
          missingGaps:
            missing.length > 0
              ? missing.slice(0, 4).map((k) => `JD 强调 "${k}"，当前简历中未显式突出`)
              : ['建议进一步补充与该岗位直接对齐的量化 SLA / ROI 指标'],
          optimizationTips: [
            `针对「${jdTitle}」，建议在「${resumeLabel}」顶部 Summary 第一句直接写入该岗位核心关键词。`,
            missing.length > 0
              ? `把缺失高频词（${missing.slice(0, 3).join(', ')}）自然融入最近一段项目经历的 Action + Result 中。`
              : '突出 30-60-90 天落地节奏与确定性校验护栏。',
            '每条 Bullet 尽量以「强动词 + 量化指标（% / $ / ms）」收尾。',
          ],
          rewrittenBullets: [
            `Architected production ${matched[0] || 'AI'} workflows with deterministic schema validation and automated failure attribution, cutting critical errors by 40% while keeping P95 latency within SLA.`,
            `Partnered directly with enterprise design partners to ship a Week-2 vertical slice, translating ambiguous operational bottlenecks into measurable ARR & ROI.`,
          ],
        },
      });
    }
    if (action === 'review_speech') {
      const transcript = String(payload.transcript ?? '').trim();
      const durationSec = Math.max(10, Number(payload.durationSec ?? 45));
      const words = transcript.split(/\s+/).filter(Boolean);
      const wpm = Math.round((words.length / durationSec) * 60);
      const fillerMatches = transcript.match(/\b(um+|uh+|like|basically|actually|you know|sort of)\b/gi) ?? [];
      const hasMetrics = /\d+%|\$\d+|\d+x|ms|sla|p95|kpi|roi/i.test(transcript);
      const structureScore = Math.min(10, Math.max(5, (words.length > 40 ? 7 : 5) + (hasMetrics ? 2 : 0)));
      const clarityScore = Math.min(10, Math.max(5, 9 - Math.min(4, fillerMatches.length)));

      return NextResponse.json({
        mode: 'local_fallback',
        warning,
        data: {
          structureScore,
          clarityScore,
          fillerCount: fillerMatches.length,
          wpm,
          feedback: hasMetrics
            ? '结构清晰且包含量化指标！建议开头先用 1 句话点明结论（Direct Answer），再展开系统边界与权衡。'
            : '建议补充具体的量化结果（如 P95 延迟、准确率提升 %、回本周期）和更强的系统边界词汇，让表达更像 Senior/Staff。',
          polishedVersion:
            words.length > 15
              ? `Direct answer: ${transcript.replace(/\b(um+|uh+|like|basically)\b/gi, '').replace(/\s+/g, ' ').trim()} — anchored by deterministic validation, measurable SLA gains, and clear fallback ownership.`
              : 'Direct answer: We paired probabilistic LLM generation with deterministic schema validators, cutting production errors while keeping P95 latency under SLA.',
          vocabUpgrades: [
            {
              insteadOf: 'check / make sure',
              use: 'deterministic validation',
              reason: '体现对 AI 工程确定性护栏的掌握',
            },
            {
              insteadOf: 'find why it broke',
              use: 'automated failure attribution',
              reason: 'TPM / Infra 高级术语，精准区分模型/工具/权限故障',
            },
            {
              insteadOf: 'run safely without duplicates',
              use: 'idempotent write-back',
              reason: 'FDE/系统设计高频加分词',
            },
          ],
        },
      });
    }
    if (action === 'dashboard_ask') {
      const q = String(payload.query ?? '').trim();
      const lower = q.toLowerCase();
      const links: Array<{ label: string; href: string }> = [];
      let answer = '';

      if (/^(hi|hello|hey|你好|哈喽|嗨)[!！.\s]*$/i.test(lower)) {
        answer =
          'Hi Lucian! 我是你的 BestLucky Gemini Copilot。目前处于本地兜底模式，点击右上角 🔑 填入 Gemini API Key（或在 Vercel 环境变量配置 GEMINI_API_KEY）后，你就可以在这里问我任何问题（技术、产品、英文表达、面试或日常问题都可以）！';
      } else if (lower.includes('openai') || lower.includes('anthropic') || lower.includes('palantir') || lower.includes('nvidia') || lower.includes('jd') || lower.includes('role')) {
        answer = `针对 "${q}"：建议先用「JD Study Plan」粘贴目标岗位 JD 生成专属冲刺题单，并在「7-Role Playbook」切换对应思维模式（如 FDE 强调 Week-2 垂直切片交付，AI PM 强调 Eval 护栏与路由治理）。`;
        links.push({ label: '生成 JD 定制冲刺计划', href: '/customizer' });
        links.push({ label: '查看 7-Role 岗位思维卡', href: '/frameworks' });
      } else if (lower.includes('soundbite') || lower.includes('vocab') || lower.includes('单词') || lower.includes('金句') || lower.includes('knowledge')) {
        answer = `你可以在 Knowledge Hub 中复习 3 条高频 AI 架构/反问金句，并使用单词本的一键发音功能跟读难词。`;
        links.push({ label: '打开 Knowledge Hub', href: '/knowledge' });
      } else if (lower.includes('lark') || lower.includes('飞书') || lower.includes('video') || lower.includes('story')) {
        answer = `可以在 Story Bank 中管理 STAR+L 故事、视频复盘或一键导入飞书文档/多维表格。`;
        links.push({ label: '进入 Story Bank', href: '/stories' });
        links.push({ label: '飞书一键导入', href: '/import' });
      } else {
        answer = `已收到你的问题 "${q}"：你可以直接进入题库按岗位筛选高频真题，或在 Mock Room 开启实时 AI 面试演练（在左下角 Settings 填入 Gemini API Key 后，这里还可直接进行全库深度问答）。`;
        links.push({ label: '刷 7 赛道真题', href: '/questions' });
        links.push({ label: '进入 AI Mock Room', href: '/practice' });
        links.push({ label: 'JD Study Plan', href: '/customizer' });
      }
      return NextResponse.json({ mode: 'local_fallback', warning, data: { answer, links } });
    }
    if (action === 'analyze_vocab') {
      const word = String(payload.word ?? '').trim();
      const data = await analyzeVocabFallback(word);
      return NextResponse.json({ mode: 'local_fallback', warning, data });
    }
    if (action === 'analyze_article') {
      const title = String(payload.title ?? 'Uploaded Article').trim() || 'Uploaded Article';
      const rawContent = String(payload.content ?? '').trim();
      const normalized = rawContent.replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim();
      const sentences = normalized
        .split(/(?<=[.!?。！？])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 45 && s.length <= 280);

      const summary =
        sentences.slice(0, 2).join(' ') ||
        `《${title}》聚焦于 AI 系统落地、评估体系与规模化交付方法论。`;

      const takeaways =
        sentences.length >= 3
          ? sentences.slice(0, 4)
          : [
              `围绕「${title}」提出的方法论，将模糊的 AI 能力需求拆解为可量化、可回归验证的指标闭环。`,
              '在生产环境中，确定性护栏（Eval / Schema Guardrail）与持续观测比单点 Prompt 调优更能决定交付稳定性。',
              '通过先跑通小范围 Pilot 闭环（30 天验证 ROI），再沉淀成可复用的平台级原语（Primitives）。',
            ];

      const unifiedAngle = `In "${title}", the biggest operational lesson is treating AI behavior as an engineering & product contract—pairing probabilistic generation with explicit eval harnesses, failure attribution, and measurable business SLA before scaling.`;
      const roleNuance = `FDE vs FDPM 差异：FDE 侧重在现场快速拆解系统瓶颈、落地端到端 Eval Harness 与幂等回写；FDPM/AI PM 则侧重定义成功指标（Accuracy / Latency / Cost 权衡）、设计 Human-in-the-loop 审核阈值，并把单客经验转化为标准产品能力。`;

      const practicalUse = {
        scenarios: [
          '当面试官问你如何把一个 Demo 级 AI 功能推向企业级生产环境（0→1 到规模化）',
          '被追问“怎么评估大模型效果 / 避免上线后准确率回退（Regression）”时的框架回答',
          '探讨客户定制需求与平台通用能力冲突（FDE / FDPM 高频权衡题）',
        ],
        interviewQuestions: [
          `"How do you evaluate and ship an LLM feature when ground truth is ambiguous?"`,
          `"Tell me about a time you caught or prevented an AI quality regression in production."`,
          `"As an FDE / FDPM, how do you balance bespoke customer fixes with reusable platform architecture?"`,
        ],
        spokenAnswer: `A pattern I really like from "${title}" is never shipping an LLM feature on vibes alone. In my projects, I start with 20 to 30 real failure traces from users, turn them into a lightweight eval set with clear pass/fail rubrics, and gate every prompt or model change on accuracy, p95 latency, and cost per task. That way, we move fast in pilots without breaking trust in production.`,
        pitfalls: [
          '切忌只说“我们加了 Prompt Engineering 或换了更大模型”，必须讲清量化基准（Baseline vs Target）和失败归因机制。',
          '避免把离线 Eval 分数当成唯一标准：一定要补充线上真实流量抽样（Online Shadow / HITL）与延迟/成本约束。',
        ],
        deepFollowUps: [
          'Follow-up 1: 如果没有现成标注数据集（Golden Dataset），第一周怎么冷启动你的 Eval？',
          'Follow-up 2: LLM-as-a-Judge 本身也有偏见和噪声，你如何校准评估器（Meta-eval）？',
          '相关拓展：Deterministic Guardrails、Confidence-gated HITL Routing、Model Tiering（大小模型路由降本）。',
        ],
      };

      const tags = ['AI Evals', 'Production AI', 'Interview Playbook'];
      return NextResponse.json({
        mode: 'local_fallback',
        warning,
        data: { summary, takeaways, unifiedAngle, roleNuance, practicalUse, tags },
      });
    }
    if (action === 'interviewer_turn') {
      const data = generateLocalInterviewerReply({
        question: payload.question as InterviewQuestion,
        persona: (payload.persona as InterviewerPersona) ?? 'coach',
        messages: (payload.messages as ChatMessage[]) ?? [],
        scratchpad: String(payload.scratchpad ?? ''),
        diagramSummary: String(payload.diagramSummary ?? ''),
        language,
        nudgeMode: payload.nudgeMode as 'clarify' | 'pushback' | 'nudge' | 'drill' | undefined,
      });
      return NextResponse.json({ mode: 'local_fallback', warning, data });
    }
    if (action === 'evaluate_session') {
      const data = evaluateSessionLocally({
        question: payload.question as InterviewQuestion,
        messages: (payload.messages as ChatMessage[]) ?? [],
        scratchpad: String(payload.scratchpad ?? ''),
        diagramNodes: (payload.diagramNodes as DiagramNode[]) ?? [],
        diagramEdges: (payload.diagramEdges as DiagramEdge[]) ?? [],
        durationSec: Number(payload.durationSec ?? 0),
        language,
      });
      return NextResponse.json({ mode: 'local_fallback', warning, data });
    }
    if (action === 'generate_loop') {
      const data = generateLocalCustomLoop({
        resumeText: String(payload.resumeText ?? ''),
        jdText: String(payload.jdText ?? ''),
        role: (payload.role as RoleTrack) ?? 'fde',
        company: String(payload.company ?? 'Target Company'),
        round: (payload.round as RoundType) ?? 'decomposition',
        language,
      });
      return NextResponse.json({ mode: 'local_fallback', warning, data });
    }
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  };

  if (!apiKey) {
    return await runFallback();
  }

  try {
    const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
    const modelChain = Array.from(
      new Set([
        chosenModel,
        'gemini-4-hydrogen',
        'gemini-3.8-flash',
        'gemini-3.7-flash',
        'gemini-flash-latest',
      ])
    );

    const generateJsonWithFallback = async (
      contents: string,
      responseJsonSchema: Record<string, unknown>
    ) => {
      let lastError: unknown = null;
      for (const candidateModel of modelChain) {
        try {
          const response = await ai.models.generateContent({
            model: candidateModel,
            contents,
            config: {
              responseMimeType: 'application/json',
              responseJsonSchema,
            },
          });
          const raw = stripCodeFences(response.text ?? '');
          return { parsed: JSON.parse(raw), usedModel: candidateModel };
        } catch (err) {
          lastError = err;
        }
      }
      throw lastError ?? new Error('All Gemini models failed');
    };

    if (action === 'analyze_jd') {
      const jdText = String(payload.jdText ?? '').trim();
      const company = String(payload.company ?? '').trim();
      const roleTitle = String(payload.roleTitle ?? '').trim();
      const imageDataUrl = String(payload.imageDataUrl ?? '').trim();

      const promptText = `Analyze this Job Description (from text and/or attached screenshot) for Lucian.
Company hint: "${company || 'Infer from JD'}"
Role hint: "${roleTitle || 'Infer from JD'}"
JD Text:
"""
${jdText || '(See attached JD screenshot)'}
"""
${getLangInstruction(language)}
Return strict JSON:
- company: string
- roleTitle: string
- extractedSkills: 4-8 concise technical/product skill tags
- coreCapabilities: 3-5 core interview competencies evaluated
- summary: 1-2 sentence crisp takeaway in Chinese
- jdTextExtracted: brief clean text summary of key requirements from the image/text`;

      let inputPayload: unknown = promptText;
      if (imageDataUrl.startsWith('data:image/')) {
        const commaIdx = imageDataUrl.indexOf(',');
        const header = imageDataUrl.slice(5, commaIdx);
        const mime = header.split(';')[0] || 'image/png';
        const base64 = imageDataUrl.slice(commaIdx + 1);
        inputPayload = [
          { type: 'text', text: promptText },
          { type: 'image', data: base64, mime_type: mime },
        ];
      }

      const interaction = await ai.interactions.create({
        model: chosenModel,
        input: inputPayload as string,
        response_mime_type: 'application/json',
        response_format: {
          type: 'object',
          properties: {
            company: { type: 'string' },
            roleTitle: { type: 'string' },
            extractedSkills: { type: 'array', items: { type: 'string' } },
            coreCapabilities: { type: 'array', items: { type: 'string' } },
            summary: { type: 'string' },
            jdTextExtracted: { type: 'string' },
          },
          required: ['company', 'roleTitle', 'extractedSkills', 'coreCapabilities', 'summary'],
        },
        store: false,
      });
      const raw = stripCodeFences(interaction.output_text ?? '');
      return NextResponse.json({ mode: 'live_gemini', model: chosenModel, data: JSON.parse(raw) });
    }

    if (action === 'analyze_common_jds') {
      const jds = Array.isArray(payload.jds) ? payload.jds : [];
      const interaction = await ai.interactions.create({
        model: chosenModel,
        input: `Analyze these ${jds.length} target Job Descriptions together and synthesize the COMMON skills and core capabilities required across them:
${JSON.stringify(jds)}
${getLangInstruction(language)}
Return strict JSON:
- commonSkills: array of 5-8 { skill: string, frequency: number }
- coreCapabilities: array of 4-6 overarching capabilities
- prepPriorities: array of 3-4 actionable prep priorities
- summary: 2-sentence Chinese synthesis`,
        response_mime_type: 'application/json',
        response_format: {
          type: 'object',
          properties: {
            commonSkills: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  skill: { type: 'string' },
                  frequency: { type: 'number' },
                },
                required: ['skill', 'frequency'],
              },
            },
            coreCapabilities: { type: 'array', items: { type: 'string' } },
            prepPriorities: { type: 'array', items: { type: 'string' } },
            summary: { type: 'string' },
          },
          required: ['commonSkills', 'coreCapabilities', 'prepPriorities', 'summary'],
        },
        store: false,
      });
      const raw = stripCodeFences(interaction.output_text ?? '');
      return NextResponse.json({ mode: 'live_gemini', model: chosenModel, data: JSON.parse(raw) });
    }

    if (action === 'match_resume_jd') {
      const jdTitle = String(payload.jdTitle ?? '');
      const jdText = String(payload.jdText ?? '');
      const resumeLabel = String(payload.resumeLabel ?? '');
      const resumeContent = String(payload.resumeContent ?? '');
      const interaction = await ai.interactions.create({
        model: chosenModel,
        input: `Compare this Resume against the target JD and give concrete optimization recommendations.
Target JD (${jdTitle}):
"""
${jdText}
"""
Resume (${resumeLabel}):
"""
${resumeContent}
"""
${getLangInstruction(language)}
Return strict JSON:
- matchScore: integer 0-100
- matchedStrengths: 2-4 crisp bullet points
- missingGaps: 2-4 specific missing keywords/experiences
- optimizationTips: 3 actionable resume edits in Chinese
- rewrittenBullets: 2 ready-to-paste senior-level English resume bullets tailored to this JD`,
        response_mime_type: 'application/json',
        response_format: {
          type: 'object',
          properties: {
            matchScore: { type: 'number' },
            matchedStrengths: { type: 'array', items: { type: 'string' } },
            missingGaps: { type: 'array', items: { type: 'string' } },
            optimizationTips: { type: 'array', items: { type: 'string' } },
            rewrittenBullets: { type: 'array', items: { type: 'string' } },
          },
          required: ['matchScore', 'matchedStrengths', 'missingGaps', 'optimizationTips', 'rewrittenBullets'],
        },
        store: false,
      });
      const raw = stripCodeFences(interaction.output_text ?? '');
      return NextResponse.json({ mode: 'live_gemini', model: chosenModel, data: JSON.parse(raw) });
    }

    if (action === 'review_speech') {
      const questionTitle = String(payload.questionTitle ?? 'Interview Question');
      const transcript = String(payload.transcript ?? '').trim();
      const durationSec = Math.max(10, Number(payload.durationSec ?? 45));
      if (!transcript) {
        return NextResponse.json({ error: 'Transcript is required' }, { status: 400 });
      }
      const words = transcript.split(/\s+/).filter(Boolean);
      const wpm = Math.round((words.length / durationSec) * 60);
      const fillerMatches = transcript.match(/\b(um+|uh+|like|basically|actually|you know|sort of)\b/gi) ?? [];

      const interaction = await ai.interactions.create({
        model: chosenModel,
        input: `You are an executive interview speech coach for Lucian.
Question: "${questionTitle}"
Candidate's spoken transcript (${durationSec}s, ~${wpm} WPM):
"""
${transcript}
"""
Evaluate structure (STAR / MECE / Direct-Answer-First), clarity, and executive vocabulary.
${getLangInstruction(language)}
Return strict JSON:
- structureScore: integer 1-10
- clarityScore: integer 1-10
- fillerCount: integer (detected filler words count, at least ${fillerMatches.length})
- wpm: integer (${wpm})
- feedback: 2-3 crisp sentences of actionable feedback
- polishedVersion: crisp senior/staff-level English rewrite of their answer (2-4 sentences)
- vocabUpgrades: 2-3 objects { insteadOf, use, reason } upgrading weak phrases to high-signal terms (e.g. deterministic, attribution, idempotent, provenance, observability)`,
        response_mime_type: 'application/json',
        response_format: {
          type: 'object',
          properties: {
            structureScore: { type: 'number' },
            clarityScore: { type: 'number' },
            fillerCount: { type: 'number' },
            wpm: { type: 'number' },
            feedback: { type: 'string' },
            polishedVersion: { type: 'string' },
            vocabUpgrades: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  insteadOf: { type: 'string' },
                  use: { type: 'string' },
                  reason: { type: 'string' },
                },
                required: ['insteadOf', 'use', 'reason'],
              },
            },
          },
          required: ['structureScore', 'clarityScore', 'fillerCount', 'wpm', 'feedback', 'polishedVersion', 'vocabUpgrades'],
        },
        store: false,
      });
      const raw = stripCodeFences(interaction.output_text ?? '');
      const parsed = JSON.parse(raw);
      return NextResponse.json({ mode: 'live_gemini', model: chosenModel, data: parsed });
    }

    if (action === 'dashboard_ask') {
      const q = String(payload.query ?? '').trim();
      if (!q) {
        return NextResponse.json({ error: 'Query is required' }, { status: 400 });
      }
      const history = Array.isArray(payload.history)
        ? (payload.history as Array<{ role: string; text: string }>).slice(-8)
        : [];
      const historyText = history
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
        .join('\n');

      const { parsed, usedModel } = await generateJsonWithFallback(
        `You are Lucian's personal AI Assistant (powered by Gemini) inside BestLucky OS.
You can answer ANY question Lucian asks — general knowledge, coding, system design, product strategy, English phrasing, career advice, or interview prep — clearly, accurately, and conversationally.
${historyText ? `\nRecent Conversation:\n${historyText}\n` : ''}
Current User Message: "${q}"
${getLangInstruction(language)}
Return strict JSON:
- answer: Helpful, direct, well-structured answer addressing the user's exact question (no generic boilerplate).
- links: 0 to 2 relevant BestLucky OS links ONLY if directly helpful, chosen from: [{"label": "...", "href": "/questions"}, {"label": "...", "href": "/customizer"}, {"label": "...", "href": "/knowledge"}, {"label": "...", "href": "/frameworks"}, {"label": "...", "href": "/stories"}, {"label": "...", "href": "/practice"}]; otherwise return [].`,
        {
          type: 'object',
          properties: {
            answer: { type: 'string' },
            links: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  href: { type: 'string' },
                },
                required: ['label', 'href'],
              },
            },
          },
          required: ['answer', 'links'],
        }
      );
      return NextResponse.json({ mode: 'live_gemini', model: usedModel, data: parsed });
    }

    if (action === 'analyze_article') {
      const title = String(payload.title ?? 'Uploaded Article').trim();
      const content = String(payload.content ?? '').trim().slice(0, 6000);
      if (!content) {
        return NextResponse.json({ error: 'Article content is required' }, { status: 400 });
      }
      const { parsed, usedModel } = await generateJsonWithFallback(
        `Analyze this article for a senior candidate preparing for FDE, FDPM, and AI PM interviews at top US AI companies.
${getLangInstruction(language)}

Article Title: ${title}
Article Content:
${content}

Return strict JSON matching the schema:
- summary: Crisp 2-sentence executive summary of the article's core thesis.
- takeaways: 3 to 5 concrete, full-sentence takeaways referencing real concepts/numbers from the article.
- unifiedAngle: One unified, high-impact 2-sentence English interview insight synthesizing the core lesson (do NOT split into 3 separate roles).
- roleNuance: Brief Simplified Chinese note explaining only where FDE vs FDPM/AI PM application meaningfully differs (if any).
- practicalUse:
  - scenarios: 2 to 3 concrete interview/work scenarios where this insight shines (Simplified Chinese).
  - interviewQuestions: 2 to 3 exact English interview questions this answers well.
  - spokenAnswer: Natural, conversational, ready-to-speak 3-4 sentence English answer you can say directly in an interview.
  - pitfalls: 2 common pitfalls or traps candidates fall into when discussing this topic (Simplified Chinese).
  - deepFollowUps: 2 to 3 deeper Bar-Raiser follow-up questions & adjacent topics to expand on.
- tags: 3 to 5 concise topic tags.`,
        {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            takeaways: { type: 'array', items: { type: 'string' } },
            unifiedAngle: { type: 'string' },
            roleNuance: { type: 'string' },
            practicalUse: {
              type: 'object',
              properties: {
                scenarios: { type: 'array', items: { type: 'string' } },
                interviewQuestions: { type: 'array', items: { type: 'string' } },
                spokenAnswer: { type: 'string' },
                pitfalls: { type: 'array', items: { type: 'string' } },
                deepFollowUps: { type: 'array', items: { type: 'string' } },
              },
              required: ['scenarios', 'interviewQuestions', 'spokenAnswer', 'pitfalls', 'deepFollowUps'],
            },
            tags: { type: 'array', items: { type: 'string' } },
          },
          required: ['summary', 'takeaways', 'unifiedAngle', 'roleNuance', 'practicalUse', 'tags'],
        }
      );

      return NextResponse.json({ mode: 'live_gemini', model: usedModel, data: parsed });
    }

    if (action === 'analyze_vocab') {
      const word = String(payload.word ?? '').trim();
      if (!word) {
        return NextResponse.json({ error: 'Word is required' }, { status: 400 });
      }
      const interaction = await ai.interactions.create({
        model: chosenModel,
        input: `Analyze the English interview/tech term "${word}" for a bilingual candidate interviewing for FDE, FDPM, AI PM, PM, Operations, Program Manager, and Consulting roles.
Return strict JSON matching the schema:
- phonetic: IPA plus an intuitive syllable-stress cue in parentheses, e.g. "/dɪˌtɜːrmɪˈnɪstɪk/ (di-TER-mi-NIS-tik)"
- meaning: Crisp Simplified Chinese meaning + interview context in parentheses, e.g. "确定性的（给定相同输入必然产生相同输出，如编译器/Schema校验）"
- example: One crisp, senior-level English interview sentence naturally using "${word}"
- notes: Short Simplified Chinese pronunciation stress & memory tip, e.g. "重音在 -NIS- 上，常与 Probabilistic 成对出现。"
- roles: 2-4 most relevant role IDs from ["fde", "fdpm", "ai-pm", "pm", "operations", "pgm", "consulting"]`,
        response_mime_type: 'application/json',
        response_format: {
          type: 'object',
          properties: {
            phonetic: { type: 'string' },
            meaning: { type: 'string' },
            example: { type: 'string' },
            notes: { type: 'string' },
            roles: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['fde', 'fdpm', 'ai-pm', 'pm', 'operations', 'pgm', 'consulting'],
              },
            },
          },
          required: ['phonetic', 'meaning', 'example', 'notes', 'roles'],
        },
        store: false,
      });

      const raw = stripCodeFences(interaction.output_text ?? '');
      const parsed = JSON.parse(raw);
      return NextResponse.json({ mode: 'live_gemini', model: chosenModel, data: parsed });
    }

    if (action === 'interviewer_turn') {
      const question = payload.question as InterviewQuestion;
      const persona = (payload.persona as InterviewerPersona) ?? 'coach';
      const messages = (payload.messages as ChatMessage[]) ?? [];
      const scratchpad = String(payload.scratchpad ?? '');
      const diagramSummary = String(payload.diagramSummary ?? '');
      const nudgeMode = payload.nudgeMode as string | undefined;

      const roleCfg = ROLES_BY_ID[question.role];
      const personaCfg = PERSONA_CONFIGS[persona];

      const systemInstruction = `You are a world-class ${roleCfg.label} (${roleCfg.shortLabel}) interviewer acting as "${personaCfg.label}".
Style rule: ${personaCfg.styleInstruction}
${getLangInstruction(language)}

Interview Question: ${question.title}
Prompt: ${question.prompt}
Strong Hire Signals to look for: ${question.strongHireSignals.join(' | ')}
Known Follow-Up Probes you may draw from or adapt: ${question.followUpProbes.join(' | ')}

Rules:
- Keep your response tight (under 140 words), sharp, and realistic like a live interview turn.
- Explicitly react to concrete things the candidate wrote in chat, scratchpad, or diagram rather than giving generic praise.
- Ask at most ONE focused follow-up or curveball per turn.
- If nudgeMode="${nudgeMode ?? 'normal'}":
  - clarify: give brief realistic client/company constraints and ask for their structured approach.
  - nudge: give a subtle tactical hint toward a missed signal without spoiling the whole answer.
  - pushback: inject a hard real-world constraint or challenge a weak assumption.
  - drill: challenge them to re-answer their weakest point in <= 3 minutes with concrete numbers and trade-offs.`;

      const transcript = messages
        .map((m) => `${m.sender.toUpperCase()}: ${m.text}`)
        .join('\n\n');

      const interaction = await ai.interactions.create({
        model: chosenModel,
        system_instruction: systemInstruction,
        input: `Transcript so far:\n${transcript}\n\nCandidate Scratchpad:\n${scratchpad.slice(0, 1500)}\n\nCandidate Visual Diagram:\n${diagramSummary}\n\nRespond with JSON: {"stageLabel": "short 2-4 word stage", "reply": "your spoken interviewer turn"}`,
        response_format: {
          type: 'object',
          properties: {
            stageLabel: { type: 'string' },
            reply: { type: 'string' },
          },
          required: ['stageLabel', 'reply'],
        },
        store: false,
      });

      const raw = stripCodeFences(interaction.output_text ?? '');
      const parsed = JSON.parse(raw) as { stageLabel: string; reply: string };
      return NextResponse.json({ mode: 'live_gemini', model: chosenModel, data: parsed });
    }

    if (action === 'evaluate_session') {
      const question = payload.question as InterviewQuestion;
      const messages = (payload.messages as ChatMessage[]) ?? [];
      const scratchpad = String(payload.scratchpad ?? '');
      const diagramNodes = (payload.diagramNodes as DiagramNode[]) ?? [];
      const diagramEdges = (payload.diagramEdges as DiagramEdge[]) ?? [];
      const roleCfg = ROLES_BY_ID[question.role];

      const systemInstruction = `You are a calibrating ${roleCfg.label} Hiring Committee Bar-Raiser.
Evaluate the candidate rigorously on a 1.0 to 5.0 scale across 5 dimensions:
1. framing_mece ("Problem Framing & MECE Structure" / "问题拆解与 MECE 结构")
2. tradeoff_depth ("Technical / Strategic Trade-offs" / "技术与战略权衡深度")
3. execution_metrics ("Execution, Metrics & Quantification" / "执行落地与定量指标")
4. customer_stakeholder ("Customer & Stakeholder Judgment" / "客户洞察与跨团队协同")
5. communication_conciseness ("Executive Synthesis & Conciseness" / "表达清晰度与高层总结")

Be fair, specific, and evidence-based. Quote or paraphrase actual gaps from their transcript/notes. Provide concrete "Before -> Strong Hire Rewrite" upgrades.
${getLangInstruction(language)}`;

      const transcript = messages
        .map((m) => `${m.sender.toUpperCase()}: ${m.text}`)
        .join('\n\n');

      const diagramSummary =
        diagramNodes.length > 0
          ? `Nodes: ${diagramNodes.map((n) => `${n.label}(${n.kind})`).join(', ')} | Edges: ${diagramEdges.length}`
          : 'No diagram blocks created.';

      const interaction = await ai.interactions.create({
        model: chosenModel,
        system_instruction: systemInstruction,
        input: `Question: ${question.title}\nPrompt: ${question.prompt}\nStrong Hire Signals: ${question.strongHireSignals.join('; ')}\nRed Flags: ${question.redFlags.join('; ')}\n\nTranscript:\n${transcript}\n\nScratchpad:\n${scratchpad}\n\nDiagram: ${diagramSummary}\n\nReturn strict JSON matching the schema.`,
        response_format: {
          type: 'object',
          properties: {
            overallScore: { type: 'number' },
            verdict: { type: 'string', enum: ['Strong Hire', 'Hire', 'Lean Hire', 'No Hire'] },
            summary: { type: 'string' },
            dimensions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  key: {
                    type: 'string',
                    enum: [
                      'framing_mece',
                      'tradeoff_depth',
                      'execution_metrics',
                      'customer_stakeholder',
                      'communication_conciseness',
                    ],
                  },
                  label: { type: 'string' },
                  labelZh: { type: 'string' },
                  score: { type: 'number' },
                  evidence: { type: 'string' },
                  advice: { type: 'string' },
                },
                required: ['key', 'label', 'labelZh', 'score', 'evidence', 'advice'],
              },
            },
            strengths: { type: 'array', items: { type: 'string' } },
            missingSignals: { type: 'array', items: { type: 'string' } },
            rewrites: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  originalExcerpt: { type: 'string' },
                  issue: { type: 'string' },
                  strongHireRewrite: { type: 'string' },
                },
                required: ['originalExcerpt', 'issue', 'strongHireRewrite'],
              },
            },
            recommendedDrillFocus: { type: 'string' },
          },
          required: [
            'overallScore',
            'verdict',
            'summary',
            'dimensions',
            'strengths',
            'missingSignals',
            'rewrites',
            'recommendedDrillFocus',
          ],
        },
        store: false,
      });

      const raw = stripCodeFences(interaction.output_text ?? '');
      const parsed = JSON.parse(raw);
      parsed.engineMode = 'live_gemini';
      return NextResponse.json({ mode: 'live_gemini', model: chosenModel, data: parsed });
    }

    if (action === 'generate_loop') {
      const resumeText = String(payload.resumeText ?? '');
      const jdText = String(payload.jdText ?? '');
      const role = (payload.role as RoleTrack) ?? 'fde';
      const company = String(payload.company ?? 'Target Company');
      const round = (payload.round as RoundType) ?? 'decomposition';
      const roleCfg = ROLES_BY_ID[role];

      const systemInstruction = `You are an elite interview coach building a custom interview loop for ${company} (${roleCfg.label}).
Compare the candidate's resume against the pasted Job Description, compute an honest matchScore (0-100), list specific matchedStrengths, capabilityGaps, a 3-phase prepPlan, and 5 realistic, sharp custom interview questions tailored specifically to this company + JD + candidate background.
${getLangInstruction(language)}`;

      const interaction = await ai.interactions.create({
        model: chosenModel,
        system_instruction: systemInstruction,
        input: `Target Company: ${company}\nRole Track: ${roleCfg.label}\nPrimary Focus Round: ${round}\n\nCandidate Resume:\n${resumeText.slice(0, 4000)}\n\nTarget Job Description:\n${jdText.slice(0, 4000)}\n\nReturn strict JSON with matchScore, matchedStrengths, capabilityGaps, prepPlan (3 items with phase, focus, deliverables[]), and questions (5 items each with title, prompt, promptZhHint, frameworkSteps[], strongHireSignals[], redFlags[], followUpProbes[], difficulty ['core'|'senior'|'staff'], timeLimitMin).`,
        response_format: {
          type: 'object',
          properties: {
            matchScore: { type: 'number' },
            matchedStrengths: { type: 'array', items: { type: 'string' } },
            capabilityGaps: { type: 'array', items: { type: 'string' } },
            prepPlan: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  phase: { type: 'string' },
                  focus: { type: 'string' },
                  deliverables: { type: 'array', items: { type: 'string' } },
                },
                required: ['phase', 'focus', 'deliverables'],
              },
            },
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  prompt: { type: 'string' },
                  promptZhHint: { type: 'string' },
                  frameworkSteps: { type: 'array', items: { type: 'string' } },
                  strongHireSignals: { type: 'array', items: { type: 'string' } },
                  redFlags: { type: 'array', items: { type: 'string' } },
                  followUpProbes: { type: 'array', items: { type: 'string' } },
                  difficulty: { type: 'string', enum: ['core', 'senior', 'staff'] },
                  timeLimitMin: { type: 'number' },
                },
                required: [
                  'title',
                  'prompt',
                  'promptZhHint',
                  'frameworkSteps',
                  'strongHireSignals',
                  'redFlags',
                  'followUpProbes',
                  'difficulty',
                  'timeLimitMin',
                ],
              },
            },
          },
          required: ['matchScore', 'matchedStrengths', 'capabilityGaps', 'prepPlan', 'questions'],
        },
        store: false,
      });

      const raw = stripCodeFences(interaction.output_text ?? '');
      const parsed = JSON.parse(raw) as {
        matchScore: number;
        matchedStrengths: string[];
        capabilityGaps: string[];
        prepPlan: { phase: string; focus: string; deliverables: string[] }[];
        questions: Partial<InterviewQuestion>[];
      };
      const nowISO = new Date().toISOString();
      const baseId = `gemini-loop-${Date.now()}`;

      const formattedQuestions: InterviewQuestion[] = (parsed.questions ?? []).map((q, idx) => ({
        id: `${baseId}-${idx + 1}`,
        role,
        secondaryRoles: [],
        round: idx === 2 ? 'behavioral' : round,
        difficulty: (q.difficulty as 'core' | 'senior' | 'staff') ?? 'senior',
        timeLimitMin: q.timeLimitMin ?? 30,
        companyStyle: `${company} Custom Loop`,
        title: q.title ?? `${company} Custom Question #${idx + 1}`,
        prompt: q.prompt ?? '',
        promptZhHint: q.promptZhHint ?? '',
        frameworkSteps: q.frameworkSteps ?? roleCfg.defaultScratchpadSections,
        strongHireSignals: q.strongHireSignals ?? [],
        redFlags: q.redFlags ?? [],
        followUpProbes: q.followUpProbes ?? [],
        isCustom: true,
        createdAt: nowISO,
      }));

      const plan: CustomLoopPlan = {
        id: baseId,
        company,
        role,
        round,
        matchScore: Math.min(100, Math.max(0, Math.round(parsed.matchScore))),
        matchedStrengths: parsed.matchedStrengths ?? [],
        capabilityGaps: parsed.capabilityGaps ?? [],
        prepPlan: parsed.prepPlan ?? [],
        questions: formattedQuestions,
        engineMode: 'live_gemini',
        createdAt: nowISO,
      };

      return NextResponse.json({ mode: 'live_gemini', model: chosenModel, data: plan });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gemini API call failed';
    return await runFallback(`Gemini fallback triggered: ${message}`);
  }
}
