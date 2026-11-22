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

const ALLOWED_MODELS: Record<string, GeminiModelChoice> = {
  'gemini-4-hydrogen': 'gemini-4-hydrogen',
  'gemini-4-argon': 'gemini-4-argon',
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
      | 'review_speech';
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
  const chosenModel: GeminiModelChoice =
    ALLOWED_MODELS[body.model ?? ''] ??
    ALLOWED_MODELS[process.env.GEMINI_MODEL ?? ''] ??
    'gemini-4-hydrogen';

  const headerKey = req.headers.get('x-gemini-api-key')?.trim();
  const envKey = process.env.GEMINI_API_KEY?.trim();
  const apiKey = headerKey || envKey || '';

  const runFallback = async (warning?: string) => {
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

      if (lower.includes('openai') || lower.includes('anthropic') || lower.includes('palantir') || lower.includes('nvidia') || lower.includes('jd') || lower.includes('role')) {
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
    const ai = new GoogleGenAI({ apiKey });

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
      const interaction = await ai.interactions.create({
        model: chosenModel,
        input: `You are Lucian's personal Interview Copilot inside LoopOS (targeting FDE, FDPM, AI PM, PM, Operations, Program Manager, Consulting roles at Anthropic, OpenAI, Palantir, NVIDIA, Stripe, McKinsey).
User question: "${q}"
${getLangInstruction(language)}
Return strict JSON:
- answer: Crisp, actionable 2-4 sentence answer directly addressing the user's question with concrete interview tactics.
- links: 2-3 relevant internal navigation links chosen ONLY from: [{"label": "...", "href": "/questions"}, {"label": "...", "href": "/customizer"}, {"label": "...", "href": "/knowledge"}, {"label": "...", "href": "/frameworks"}, {"label": "...", "href": "/stories"}, {"label": "...", "href": "/practice"}]`,
        response_mime_type: 'application/json',
        response_format: {
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
        },
        store: false,
      });
      const raw = stripCodeFences(interaction.output_text ?? '');
      const parsed = JSON.parse(raw);
      return NextResponse.json({ mode: 'live_gemini', model: chosenModel, data: parsed });
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
