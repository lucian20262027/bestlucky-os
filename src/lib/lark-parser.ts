import { ROLES_BY_ID } from './roles';
import {
  InterviewQuestion,
  LibraryItem,
  QuestionUserNotes,
  RoleTrack,
  RoundType,
  StarStory,
} from './types';

export type SplitMode = 'qa' | 'headings' | 'page';

export interface ParsedImportItem {
  id: string;
  selected: boolean;
  destination: 'question' | 'library' | 'story';
  title: string;
  role: RoleTrack;
  roles?: RoleTrack[];
  round: RoundType;
  companyStyle: string;
  prompt: string;
  answer: string;
  notes: string;
  videoUrl: string;
  sourceUrl?: string;
  tags: string[];
}

export interface RawFetchedPage {
  title: string;
  sourceUrl: string;
  objType: 'docx' | 'bitable';
  markdown: string;
  charCount: number;
  bitableItems?: ParsedImportItem[];
}

export function detectRoleFromText(text: string, fallback: RoleTrack = 'fde'): RoleTrack {
  const lower = text.toLowerCase();
  if (/\bfdpm\b|forward deployed pm|design partner|80\/20|pilot.?to.?arr/i.test(lower)) {
    return 'fdpm';
  }
  if (/\bfde\b|forward deployed engineer|erp|sap|canonical|on-prem|shadow mode/i.test(lower)) {
    return 'fde';
  }
  if (/\bai pm\b|eval|rag|hallucination|token|cogs|fine-?tun|hitl|prompt/i.test(lower)) {
    return 'ai-pm';
  }
  if (/\bconsulting\b|mece|ebitda|pyramid|market sizing|mbb|mckinsey|bcg|bain/i.test(lower)) {
    return 'consulting';
  }
  if (/\boperations\b|\bbizops\b|\bwbr\b|onboarding|unit economics|capacity|throughput|churn/i.test(lower)) {
    return 'operations';
  }
  if (/\bpgm\b|\btpm\b|program manager|critical path|war room|dependency|cut-line|migration/i.test(lower)) {
    return 'pgm';
  }
  if (/\bproduct manager\b|\bpm\b|product sense|north star|activation/i.test(lower)) {
    return 'pm';
  }
  return fallback;
}

function normalizeRoleValue(raw: string, fallback: RoleTrack): RoleTrack {
  const clean = raw.trim().toLowerCase();
  const map: Record<string, RoleTrack> = {
    fde: 'fde',
    'forward deployed engineer': 'fde',
    fdpm: 'fdpm',
    'forward deployed pm': 'fdpm',
    'ai-pm': 'ai-pm',
    'ai pm': 'ai-pm',
    aipm: 'ai-pm',
    pm: 'pm',
    'product manager': 'pm',
    operations: 'operations',
    ops: 'operations',
    bizops: 'operations',
    pgm: 'pgm',
    tpm: 'pgm',
    'program manager': 'pgm',
    consulting: 'consulting',
    mbb: 'consulting',
  };
  if (map[clean]) return map[clean];
  return detectRoleFromText(raw, fallback);
}

function extractFirstVideoUrl(text: string): string {
  const match = text.match(
    /https?:\/\/[^\s)>\]"']*(?:youtube\.com|youtu\.be|bilibili\.com|loom\.com|vimeo\.com|\.mp4|\.webm|\.mov|minutes)[^\s)>\]"']*/i
  );
  return match ? match[0] : '';
}

function inferRoundFromText(text: string): RoundType {
  const lower = text.toLowerCase();
  if (/phone screen|recruiter|intro|tell me about yourself|自我介绍|初筛/i.test(lower))
    return 'phone-screen';
  if (/hiring manager|\bhm\b|用人经理/i.test(lower)) return 'hiring-manager';
  if (/\bxfn\b|cross-functional|stakeholder|跨团队/i.test(lower)) return 'xfn';
  if (/onsite|loop|panel|终面/i.test(lower)) return 'loops';
  if (/round 1|一面/i.test(lower)) return 'round-1';
  if (/coding|system design|architecture|api|technical|架构|代码/i.test(lower))
    return 'technical';
  if (/story|star|conflict|time when|tell me about|讲一个|经历|冲突/i.test(lower))
    return 'behavioral';
  if (/market sizing|tam|sam|estimat|估算/i.test(lower)) return 'estimation';
  if (/ebitda|pricing|strategy|build vs|profitability|战略|定价/i.test(lower))
    return 'case-strategy';
  if (/metric|wbr|kpi|drop|triage|onboarding|latency|cogs|指标|排查/i.test(lower))
    return 'execution-metrics';
  if (/rag|eval|hitl|design a product|ux|product sense|设计/i.test(lower)) return 'product-ai';
  return 'decomposition';
}

function isStandaloneQuestionLine(trimmed: string): boolean {
  if (!trimmed || trimmed.length > 180) return false;
  // Exclude bullets, quotes, code blocks, or answer prefixes
  if (/^(?:[-*>#`]|\d+[.)、]|A\s*[:：]|Answer\s*[:：]|Direct answer|Why it mattered|What we did)/i.test(trimmed)) {
    return false;
  }
  const clean = trimmed.replace(/^["“*]+|["”*]+$/g, '').trim();
  if (clean.length < 8) return false;
  return (
    /[?？]$/.test(clean) ||
    /^(?:Tell me about|Walk me through|Describe a time|How would you|How did you|Why did you|What was your)/i.test(
      clean
    )
  );
}

export function parseLarkMarkdownToItems(
  rawText: string,
  options: {
    defaultRole: RoleTrack;
    targetMode?: 'auto' | 'questions' | 'library' | 'stories';
    splitMode?: SplitMode;
    sourceUrl?: string;
    docTitle?: string;
    seedOffset?: number;
  }
): ParsedImportItem[] {
  const text = rawText.trim();
  if (!text) return [];

  const targetMode = options.targetMode ?? 'auto';
  const splitMode: SplitMode = options.splitMode ?? 'qa';
  const defaultDest: ParsedImportItem['destination'] =
    targetMode === 'library'
      ? 'library'
      : targetMode === 'stories'
        ? 'story'
        : 'question';
  const offset = options.seedOffset ?? 0;

  // 1. Whole Page Mode: keep 100% of the document intact as 1 item
  if (splitMode === 'page') {
    const videoUrl = extractFirstVideoUrl(text);
    const detectedRole = detectRoleFromText(`${options.docTitle ?? ''}\n${text}`, options.defaultRole);
    const dest: ParsedImportItem['destination'] =
      targetMode === 'questions'
        ? 'question'
        : targetMode === 'stories'
          ? 'story'
          : 'library';
    return [
      {
        id: `imp-${Date.now()}-${offset}-0`,
        selected: true,
        destination: dest,
        title: options.docTitle?.trim() || 'Imported Lark Document',
        role: detectedRole,
        round: inferRoundFromText(text),
        companyStyle: 'Lark Synced Doc',
        prompt: options.docTitle?.trim() || text.slice(0, 180),
        answer: text,
        notes: '',
        videoUrl,
        sourceUrl: options.sourceUrl,
        tags: ['Lark', ROLES_BY_ID[detectedRole].shortLabel, videoUrl ? 'Video' : 'Full Doc'],
      },
    ];
  }

  // Pre-normalize inline Q1:, Q8: markers onto newlines in 'qa' mode
  const normalizedText =
    splitMode === 'qa'
      ? text.replace(
          /([^\n])\s+(?=(?:\*\*|__)?(?:Q\d+|Question\s*\d*|题目\s*\d*|问题\s*\d*)\s*[:：.\)）、])/gi,
          '$1\n'
        )
      : text;

  const lines = normalizedText.split(/\r?\n/);
  const blocks: { heading: string; bodyLines: string[] }[] = [];
  let current: { heading: string; bodyLines: string[] } | null = null;
  let topTitle = options.docTitle?.trim() || '';

  for (const line of lines) {
    const trimmed = line.trim();
    const h1Match = trimmed.match(/^#\s+(.+)$/);
    if (h1Match && !topTitle && blocks.length === 0 && !current) {
      topTitle = h1Match[1].trim();
      continue;
    }

    let matchedHeading: string | null = null;
    if (splitMode === 'headings') {
      const headingMatch = trimmed.match(/^#{1,4}\s+(.+)$/);
      if (headingMatch) matchedHeading = headingMatch[1].trim();
    } else {
      const headingMatch = trimmed.match(/^#{1,4}\s+(.+)$/);
      const qPrefixMatch = trimmed.match(
        /^(?:\*\*|__)?(?:Q\d*|Question\s*\d*|题目\s*\d*|问题\s*\d*)\s*[:：.\)）、]\s*(.+?)(?:\*\*|__)?$/i
      );
      if (headingMatch) {
        matchedHeading = headingMatch[1]
          .replace(/^(?:Q\d*|Question\s*\d*|题目\s*\d*|问题\s*\d*)\s*[:：.\)）、]\s*/i, '')
          .trim();
      } else if (qPrefixMatch) {
        matchedHeading = qPrefixMatch[1].trim();
      } else if (isStandaloneQuestionLine(trimmed)) {
        matchedHeading = trimmed.replace(/^["“*]+|["”*]+$/g, '').trim();
      }
    }

    if (matchedHeading !== null) {
      if (current && (current.heading || current.bodyLines.join('').trim().length > 0)) {
        blocks.push(current);
      }
      current = { heading: matchedHeading, bodyLines: [] };
    } else {
      if (!current) {
        current = { heading: topTitle || 'Imported Lark Overview', bodyLines: [] };
      }
      current.bodyLines.push(line);
    }
  }

  if (current && (current.heading || current.bodyLines.join('').trim().length > 0)) {
    blocks.push(current);
  }

  return blocks
    .filter((b) => b.heading.trim().length > 0 || b.bodyLines.join('').trim().length > 0)
    .map((b, idx) => {
      const bodyRaw = b.bodyLines.join('\n').trim();
      let explicitRole: RoleTrack | null = null;
      let companyStyle = 'Lark Imported';
      let videoUrl = extractFirstVideoUrl(bodyRaw);
      const promptLines: string[] = [];
      const answerLines: string[] = [];
      let inAnswer = false;

      for (const l of b.bodyLines) {
        const roleLine = l.match(/^(?:Role|Track|岗位)\s*[:：]\s*(.+)$/i);
        if (roleLine) {
          explicitRole = normalizeRoleValue(roleLine[1], options.defaultRole);
          continue;
        }
        const compLine = l.match(/^(?:Company|Source|公司)\s*[:：]\s*(.+)$/i);
        if (compLine) {
          companyStyle = compLine[1].trim();
          continue;
        }
        const vidLine = l.match(/^(?:Video|Video URL|视频|妙记)\s*[:：]\s*(https?:\/\/\S+)/i);
        if (vidLine) {
          videoUrl = vidLine[1].trim();
          continue;
        }
        const ansStart = l.match(/^(?:A|Answer|Model Answer|Direct answer|回答|答案|参考答案|思路)\s*[:：]\s*(.*)$/i);
        if (ansStart) {
          inAnswer = true;
          if (ansStart[1].trim()) answerLines.push(ansStart[1].trim());
          continue;
        }
        const promptLine = l.match(/^(?:Prompt|Context|详情|背景)\s*[:：]\s*(.+)$/i);
        if (promptLine && !inAnswer) {
          promptLines.push(promptLine[1].trim());
          continue;
        }

        if (inAnswer) {
          answerLines.push(l);
        } else {
          promptLines.push(l);
        }
      }

      const detectedRole =
        explicitRole ?? detectRoleFromText(`${b.heading}\n${bodyRaw}`, options.defaultRole);
      const promptText = promptLines.join('\n').trim() || b.heading;
      const answerText = answerLines.join('\n').trim() || bodyRaw;

      const looksLikeQuestion =
        /[?？]$/.test(b.heading.trim()) ||
        /^(?:Tell me|Walk me|Describe|How|Why|What|Design|Estimate|Q\d+)/i.test(b.heading.trim()) ||
        inAnswer;

      const resolvedDestination: ParsedImportItem['destination'] =
        targetMode === 'auto'
          ? looksLikeQuestion
            ? 'question'
            : 'library'
          : defaultDest;

      return {
        id: `imp-${Date.now()}-${offset}-${idx}`,
        selected: true,
        destination: resolvedDestination,
        title: b.heading,
        role: detectedRole,
        round: inferRoundFromText(`${b.heading}\n${promptText}`),
        companyStyle,
        prompt: b.heading === promptText ? b.heading : `${b.heading}\n\n${promptText}`.slice(0, 600),
        answer: answerText,
        notes: '',
        videoUrl,
        sourceUrl: options.sourceUrl,
        tags: ['Lark', ROLES_BY_ID[detectedRole].shortLabel],
      };
    });
}

export function parseRawPagesToItems(
  pages: RawFetchedPage[],
  options: {
    defaultRole: RoleTrack;
    targetMode: 'auto' | 'questions' | 'library' | 'stories';
    splitMode: SplitMode;
  }
): ParsedImportItem[] {
  const results: ParsedImportItem[] = [];
  pages.forEach((page, pIdx) => {
    if (page.objType === 'bitable' && page.bitableItems) {
      page.bitableItems.forEach((item, rIdx) => {
        results.push({
          ...item,
          id: `bitable-${Date.now()}-${pIdx}-${rIdx}`,
          destination:
            options.targetMode === 'library'
              ? 'library'
              : options.targetMode === 'stories'
                ? 'story'
                : 'question',
        });
      });
    } else if (page.markdown.trim()) {
      const parsed = parseLarkMarkdownToItems(page.markdown, {
        defaultRole: options.defaultRole,
        targetMode: options.targetMode,
        splitMode: options.splitMode,
        sourceUrl: page.sourceUrl,
        docTitle: page.title,
        seedOffset: pIdx * 1000,
      });
      results.push(...parsed);
    }
  });
  return results;
}

// RFC-4180 compliant CSV parser for Lark Bitable exports
function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field.trim());
        field = '';
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        if (ch === '\r') i++;
        row.push(field.trim());
        if (row.some((cell) => cell.length > 0)) rows.push(row);
        row = [];
        field = '';
      } else if (ch !== '\r') {
        field += ch;
      }
    }
  }
  row.push(field.trim());
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  return rows;
}

export function parseCsvToItems(csvText: string, defaultRole: RoleTrack): ParsedImportItem[] {
  const rows = parseCsvRows(csvText.trim());
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.toLowerCase());
  const findCol = (patterns: RegExp[]) =>
    headers.findIndex((h) => patterns.some((p) => p.test(h)));

  const titleCol = findCol([/title|question|题目|问题|标题/]);
  const roleCol = findCol([/role|track|岗位|方向/]);
  const compCol = findCol([/company|source|公司/]);
  const promptCol = findCol([/prompt|detail|context|描述|详情/]);
  const ansCol = findCol([/answer|solution|回答|答案|思路/]);
  const videoCol = findCol([/video|url|link|视频|链接|妙记/]);
  const notesCol = findCol([/note|remark|复盘|笔记/]);

  return rows.slice(1).map((cols, idx) => {
    const rawTitle = (titleCol >= 0 ? cols[titleCol] : cols[0]) || `Imported Row #${idx + 1}`;
    const rawRole = roleCol >= 0 ? cols[roleCol] : '';
    const rawComp = (compCol >= 0 ? cols[compCol] : '') || 'Lark Bitable';
    const rawPrompt = (promptCol >= 0 ? cols[promptCol] : '') || rawTitle;
    const rawAns = ansCol >= 0 ? cols[ansCol] : '';
    const rawVid = videoCol >= 0 ? cols[videoCol] : '';
    const rawNotes = notesCol >= 0 ? cols[notesCol] : '';

    const role = normalizeRoleValue(`${rawRole} ${rawTitle} ${rawPrompt}`, defaultRole);

    return {
      id: `csv-${Date.now()}-${idx}`,
      selected: true,
      destination: 'question',
      title: rawTitle,
      role,
      round: inferRoundFromText(`${rawTitle} ${rawPrompt}`),
      companyStyle: rawComp,
      prompt: rawPrompt,
      answer: rawAns,
      notes: rawNotes,
      videoUrl: rawVid,
      tags: ['Lark Bitable', ROLES_BY_ID[role].shortLabel],
    };
  });
}

export function convertParsedItemsForCommit(items: ParsedImportItem[]): {
  questions: InterviewQuestion[];
  questionNotes: Record<string, QuestionUserNotes>;
  libraryItems: LibraryItem[];
  stories: StarStory[];
} {
  const nowISO = new Date().toISOString();
  const questions: InterviewQuestion[] = [];
  const questionNotes: Record<string, QuestionUserNotes> = {};
  const libraryItems: LibraryItem[] = [];
  const stories: StarStory[] = [];

  items
    .filter((it) => it.selected)
    .forEach((it, idx) => {
      const selectedRoles = it.roles && it.roles.length > 0 ? it.roles : [it.role];
      const primaryRole = selectedRoles[0];
      const secondaryRoles = selectedRoles.slice(1);
      const roleCfg = ROLES_BY_ID[primaryRole];
      if (it.destination === 'question') {
        const qId = `lark-q-${Date.now()}-${idx}`;
        questions.push({
          id: qId,
          role: primaryRole,
          secondaryRoles,
          round: it.round,
          difficulty: 'senior',
          timeLimitMin: 30,
          companyStyle: it.companyStyle || 'Lark Imported',
          title: it.title,
          prompt: it.prompt || it.title,
          promptZhHint: it.notes || `【飞书导入】结合 ${roleCfg.shortLabel} 结构框架与量化指标回答。`,
          frameworkSteps: roleCfg.defaultScratchpadSections,
          strongHireSignals: [
            'Clarifies scope, buyer constraints, and failure thresholds upfront.',
            'Supports recommendations with concrete metrics and explicit trade-offs.',
          ],
          redFlags: ['Vague brainstorming without structured framing or metrics.'],
          followUpProbes: [
            'What breaks first if volume doubles or data is incomplete?',
            'Summarize your core recommendation in 45 seconds.',
          ],
          modelAnswer: it.answer || undefined,
          videoUrl: it.videoUrl || undefined,
          sourceUrl: it.sourceUrl || undefined,
          tags: it.tags,
          isCustom: true,
          createdAt: nowISO,
        });
        questionNotes[qId] = {
          myAnswer: '',
          modelAnswer: it.answer,
          pitch60s: '',
          personalNotes: it.notes,
          videoUrl: it.videoUrl,
          sourceUrl: it.sourceUrl,
          updatedAt: nowISO,
        };
      } else if (it.destination === 'library') {
        libraryItems.push({
          id: `lark-lib-${Date.now()}-${idx}`,
          type: it.videoUrl ? 'video' : it.sourceUrl ? 'lark-doc' : 'guide',
          title: it.title,
          role: primaryRole,
          secondaryRoles,
          tags: it.tags,
          summary: (it.prompt || it.answer).slice(0, 180),
          contentMarkdown: it.answer || it.prompt,
          videoUrl: it.videoUrl || undefined,
          sourceUrl: it.sourceUrl || undefined,
          timestamps: [],
          createdAt: nowISO,
          updatedAt: nowISO,
        });
      } else if (it.destination === 'story') {
        stories.push({
          id: `lark-story-${Date.now()}-${idx}`,
          title: it.title,
          competencies: ['0→1 Execution', 'Cross-Functional Influence'],
          targetRoles: selectedRoles,
          situation: it.prompt,
          task: 'Imported from Lark — refine your explicit personal ownership here.',
          action: it.answer,
          result: it.notes || 'Add quantified before/after metrics.',
          learning: '',
          roleFramings: { [primaryRole]: it.answer.slice(0, 140) },
          metrics: [],
          updatedAt: nowISO,
        });
      }
    });

  return { questions, questionNotes, libraryItems, stories };
}
