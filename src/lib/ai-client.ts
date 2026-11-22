import {
  AISettings,
  ChatMessage,
  CustomLoopPlan,
  DiagramEdge,
  DiagramNode,
  InterviewQuestion,
  InterviewerPersona,
  RoleTrack,
  RoundType,
  SessionEvaluation,
} from './types';

export interface AIResponseEnvelope<T> {
  mode: 'live_gemini' | 'local_fallback';
  model?: string;
  warning?: string;
  data: T;
}

export async function callAI<T>(
  action: 'interviewer_turn' | 'evaluate_session' | 'generate_loop',
  payload: Record<string, unknown>,
  aiSettings: AISettings
): Promise<AIResponseEnvelope<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (aiSettings.geminiApiKey.trim()) {
    headers['x-gemini-api-key'] = aiSettings.geminiApiKey.trim();
  }

  const res = await fetch('/api/ai', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action,
      model: aiSettings.model,
      language: aiSettings.language,
      payload,
    }),
  });

  if (!res.ok) {
    throw new Error(`AI endpoint error (${res.status})`);
  }
  return (await res.json()) as AIResponseEnvelope<T>;
}

export function requestInterviewerTurn(
  params: {
    question: InterviewQuestion;
    persona: InterviewerPersona;
    messages: ChatMessage[];
    scratchpad: string;
    diagramSummary: string;
    nudgeMode?: 'clarify' | 'pushback' | 'nudge' | 'drill';
  },
  aiSettings: AISettings
) {
  return callAI<{ reply: string; stageLabel: string }>('interviewer_turn', params, aiSettings);
}

export function requestSessionEvaluation(
  params: {
    question: InterviewQuestion;
    messages: ChatMessage[];
    scratchpad: string;
    diagramNodes: DiagramNode[];
    diagramEdges: DiagramEdge[];
    durationSec: number;
  },
  aiSettings: AISettings
) {
  return callAI<SessionEvaluation>('evaluate_session', params, aiSettings);
}

export function requestCustomLoop(
  params: {
    resumeText: string;
    jdText: string;
    role: RoleTrack;
    company: string;
    round: RoundType;
  },
  aiSettings: AISettings
) {
  return callAI<CustomLoopPlan>('generate_loop', params, aiSettings);
}
