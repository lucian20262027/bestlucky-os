'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  Eye,
  EyeOff,
  FileText,
  Flame,
  Lightbulb,
  Loader2,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Workflow,
  Zap,
} from 'lucide-react';
import { useApp } from './AppProvider';
import { DiagramBoard } from './DiagramBoard';
import { requestInterviewerTurn, requestSessionEvaluation } from '@/lib/ai-client';
import {
  formatDuration,
  getQuestionById,
  roleBadgeClasses,
  serializeDiagramSummary,
} from '@/lib/helpers';
import { PERSONA_CONFIGS, ROLE_LIST, ROLES_BY_ID, ROUND_LABELS } from '@/lib/roles';
import {
  ChatMessage,
  DiagramEdge,
  DiagramNode,
  InterviewerPersona,
  PracticeSession,
  RoleTrack,
  SessionEvaluation,
} from '@/lib/types';

// Local Web Speech API types so TypeScript never depends on browser-specific globals
interface SpeechRecognitionResultItem {
  transcript: string;
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: {
    isFinal: boolean;
    0: SpeechRecognitionResultItem;
  };
}
interface SpeechRecognitionEventLocal {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionInstanceLocal {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: SpeechRecognitionEventLocal) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionCtorLocal = new () => SpeechRecognitionInstanceLocal;

function buildStarterScratchpad(role: RoleTrack): string {
  return ROLES_BY_ID[role].defaultScratchpadSections
    .map((heading) => `${heading}\n- `)
    .join('\n\n');
}

export function MockRoom({ questionId }: { questionId: string }) {
  const {
    state,
    mounted,
    updateAISettings,
    savePracticeSession,
    setQuestionProgress,
  } = useApp();

  const question = useMemo(() => getQuestionById(state, questionId), [state, questionId]);

  const [sessionId, setSessionId] = useState('sess-pending');
  const [persona, setPersona] = useState<InterviewerPersona>('coach');

  useEffect(() => {
    setSessionId(`sess-${Date.now()}`);
  }, []);
  const [rightTab, setRightTab] = useState<'scratchpad' | 'diagram' | 'scorecard'>('scratchpad');
  const [showPromptSpoiler, setShowPromptSpoiler] = useState(false);

  // Timer state
  const [durationLimitMin, setDurationLimitMin] = useState<number>(30);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  // Conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composer, setComposer] = useState('');
  const [stageLabel, setStageLabel] = useState('Opening Prompt');
  const [isReplying, setIsReplying] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [lastEngineNotice, setLastEngineNotice] = useState<string | null>(null);

  // Workspace artifacts
  const [scratchpad, setScratchpad] = useState('');
  const [scratchpadRole, setScratchpadRole] = useState<RoleTrack>('fde');
  const [diagramNodes, setDiagramNodes] = useState<DiagramNode[]>([]);
  const [diagramEdges, setDiagramEdges] = useState<DiagramEdge[]>([]);
  const [evaluation, setEvaluation] = useState<SessionEvaluation | null>(null);

  // Voice recording state
  const [isListening, setIsListening] = useState(false);
  const [speechLang, setSpeechLang] = useState<'en-US' | 'zh-CN'>('en-US');
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstanceLocal | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize room when question loads
  useEffect(() => {
    if (!question) return;
    setDurationLimitMin(question.timeLimitMin || 30);
    setScratchpadRole(question.role);
    setScratchpad(buildStarterScratchpad(question.role));

    if (question.sampleDiagramNodes && question.sampleDiagramNodes.length > 0) {
      const nodes: DiagramNode[] = question.sampleDiagramNodes.map((n, i) => ({
        ...n,
        id: `init-${i}`,
      }));
      const edges: DiagramEdge[] = [];
      for (let i = 0; i < nodes.length - 1; i++) {
        edges.push({ id: `init-e-${i}`, from: nodes[i].id, to: nodes[i + 1].id });
      }
      setDiagramNodes(nodes);
      setDiagramEdges(edges);
    } else {
      setDiagramNodes([]);
      setDiagramEdges([]);
    }

    const roleCfg = ROLES_BY_ID[question.role];
    setMessages([
      {
        id: 'm-init',
        sender: 'interviewer',
        text: `Welcome to the ${roleCfg.shortLabel} Mock Room. Here is your prompt:\n\n"${question.prompt}"\n\nTake a moment to outline your structure in the Framework Scratchpad or Architecture Board, then walk me through how you'd approach this.`,
        timestamp: new Date().toISOString(),
      },
    ]);
    setEvaluation(null);
    setElapsedSec(0);
    setTimerRunning(true);
  }, [question]);

  // Detect Web Speech API support on client
  useEffect(() => {
    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtorLocal;
      webkitSpeechRecognition?: SpeechRecognitionCtorLocal;
    };
    setSpeechSupported(Boolean(win.SpeechRecognition || win.webkitSpeechRecognition));
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  // Countdown / Elapsed Timer tick
  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isReplying]);

  const speakText = (text: string) => {
    if (!state.aiSettings.ttsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    const clean = text.replace(/\*\*/g, '').replace(/💡[\s\S]*$/, '').trim();
    const utter = new SpeechSynthesisUtterance(clean.slice(0, 420));
    utter.rate = 1.02;
    window.speechSynthesis.speak(utter);
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtorLocal;
      webkitSpeechRecognition?: SpeechRecognitionCtorLocal;
    };
    const Ctor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Ctor) return;

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = speechLang;
    rec.onresult = (event) => {
      let chunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          chunk += `${event.results[i][0].transcript} `;
        }
      }
      if (chunk.trim()) {
        setComposer((prev) => (prev ? `${prev.trim()} ${chunk.trim()}` : chunk.trim()));
      }
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  };

  if (!mounted) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-sm text-[var(--ink-muted)]">
        Loading Mock Room...
      </div>
    );
  }

  if (!question) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-lg font-semibold text-[var(--ink-primary)]">Question Not Found</h1>
        <p className="mt-2 text-sm text-[var(--ink-secondary)]">
          This custom or seeded question ID was not found in your local workspace.
        </p>
        <Link
          href="/questions"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--ink-primary)] px-4 py-2 text-xs font-medium text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Question Bank
        </Link>
      </div>
    );
  }

  const roleCfg = ROLES_BY_ID[question.role];
  const remainingSec = Math.max(0, durationLimitMin * 60 - elapsedSec);
  const isOvertime = elapsedSec > durationLimitMin * 60;

  const persistSessionSnapshot = (
    nextMsgs: ChatMessage[],
    nextEval: SessionEvaluation | null
  ) => {
    const sess: PracticeSession = {
      id: sessionId,
      questionId: question.id,
      questionTitle: question.title,
      role: question.role,
      round: question.round,
      persona,
      startedAt: new Date().toISOString(),
      durationSec: elapsedSec,
      messages: nextMsgs,
      scratchpad,
      diagramNodes,
      diagramEdges,
      evaluation: nextEval,
    };
    savePracticeSession(sess);
  };

  const sendTurn = async (
    overrideText?: string,
    nudgeMode?: 'clarify' | 'pushback' | 'nudge' | 'drill'
  ) => {
    const content = (overrideText ?? composer).trim();
    if (!content && !nudgeMode) return;
    if (isReplying) return;

    let updatedMsgs = [...messages];
    if (content) {
      const candidateMsg: ChatMessage = {
        id: `m-${Date.now()}`,
        sender: 'candidate',
        text: content,
        timestamp: new Date().toISOString(),
      };
      updatedMsgs = [...updatedMsgs, candidateMsg];
      setMessages(updatedMsgs);
      if (!overrideText) setComposer('');
    }

    setIsReplying(true);
    setLastEngineNotice(null);

    try {
      const res = await requestInterviewerTurn(
        {
          question,
          persona,
          messages: updatedMsgs,
          scratchpad,
          diagramSummary: serializeDiagramSummary(diagramNodes, diagramEdges),
          nudgeMode,
        },
        state.aiSettings
      );

      const interviewerMsg: ChatMessage = {
        id: `m-${Date.now()}-ai`,
        sender: 'interviewer',
        text: res.data.reply,
        timestamp: new Date().toISOString(),
      };
      const finalMsgs = [...updatedMsgs, interviewerMsg];
      setMessages(finalMsgs);
      setStageLabel(res.data.stageLabel);
      if (res.warning) {
        setLastEngineNotice(res.warning);
      }
      speakText(res.data.reply);
      persistSessionSnapshot(finalMsgs, evaluation);
    } catch {
      setLastEngineNotice('Network issue — please try sending again.');
    } finally {
      setIsReplying(false);
    }
  };

  const handleEvaluate = async () => {
    if (isEvaluating) return;
    setIsEvaluating(true);
    setTimerRunning(false);
    setRightTab('scorecard');
    setLastEngineNotice(null);

    try {
      const res = await requestSessionEvaluation(
        {
          question,
          messages,
          scratchpad,
          diagramNodes,
          diagramEdges,
          durationSec: elapsedSec,
        },
        state.aiSettings
      );
      setEvaluation(res.data);
      if (res.warning) {
        setLastEngineNotice(res.warning);
      }
      persistSessionSnapshot(messages, res.data);
    } catch {
      setLastEngineNotice('Could not evaluate session right now.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleStartThreeMinDrill = async () => {
    setDurationLimitMin(3);
    setElapsedSec(0);
    setTimerRunning(true);
    await sendTurn(
      evaluation
        ? `[Starting 3-Minute Focused Drill on: ${evaluation.recommendedDrillFocus}]`
        : '[Starting 3-Minute Focused Drill]',
      'drill'
    );
  };

  const verdictColor = (verdict: SessionEvaluation['verdict']) => {
    if (verdict === 'Strong Hire') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (verdict === 'Hire') return 'bg-blue-50 text-blue-800 border-blue-200';
    if (verdict === 'Lean Hire') return 'bg-amber-50 text-amber-800 border-amber-200';
    return 'bg-rose-50 text-rose-800 border-rose-200';
  };

  return (
    <div className="flex h-[calc(100vh-52px)] flex-col bg-[var(--canvas)] lg:h-screen">
      {/* Top Studio Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-white px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/questions"
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--ink-secondary)] hover:bg-[var(--canvas)] hover:text-[var(--ink-primary)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Bank
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${roleBadgeClasses(
                  question.role
                )}`}
              >
                {roleCfg.shortLabel}
              </span>
              <span className="rounded-md border border-[var(--border)] bg-[var(--canvas)] px-2 py-0.5 text-[11px] text-[var(--ink-secondary)]">
                {ROUND_LABELS[question.round].en}
              </span>
              <span className="hidden text-[11px] text-[var(--ink-muted)] sm:inline">
                · {question.companyStyle}
              </span>
            </div>
            <h1 className="mt-0.5 truncate text-sm font-semibold text-[var(--ink-primary)]">
              {question.title}
            </h1>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Persona Selector */}
          <select
            value={persona}
            onChange={(e) => setPersona(e.target.value as InterviewerPersona)}
            className="rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
            title="Interviewer Persona"
          >
            {Object.entries(PERSONA_CONFIGS).map(([id, cfg]) => (
              <option key={id} value={id}>
                {state.aiSettings.language === 'zh' ? cfg.labelZh : cfg.label}
              </option>
            ))}
          </select>

          {/* Language quick toggle */}
          <button
            type="button"
            onClick={() => {
              const order = ['en', 'bilingual', 'zh'] as const;
              const idx = order.indexOf(state.aiSettings.language);
              updateAISettings({ language: order[(idx + 1) % order.length] });
            }}
            className="rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 font-mono text-[11px] font-medium text-[var(--ink-secondary)] hover:bg-[var(--canvas)]"
            title="Switch Language Mode"
          >
            {state.aiSettings.language === 'bilingual'
              ? 'EN+中'
              : state.aiSettings.language.toUpperCase()}
          </button>

          {/* Timer */}
          <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-2 py-1">
            <Clock
              className={`h-3.5 w-3.5 ${
                isOvertime ? 'text-rose-600' : 'text-[var(--ink-muted)]'
              }`}
            />
            <span
              className={`font-mono text-xs font-semibold ${
                isOvertime ? 'text-rose-600' : 'text-[var(--ink-primary)]'
              }`}
            >
              {isOvertime ? `+${formatDuration(elapsedSec - durationLimitMin * 60)}` : formatDuration(remainingSec)}
            </span>
            <select
              value={durationLimitMin}
              onChange={(e) => {
                setDurationLimitMin(Number(e.target.value));
                setElapsedSec(0);
              }}
              className="bg-transparent font-mono text-[11px] text-[var(--ink-muted)] focus:outline-none"
              aria-label="Timer duration"
            >
              <option value={3}>3m</option>
              <option value={5}>5m</option>
              <option value={15}>15m</option>
              <option value={30}>30m</option>
              <option value={45}>45m</option>
            </select>
            <button
              type="button"
              onClick={() => setTimerRunning((v) => !v)}
              className="rounded p-1 text-[var(--ink-secondary)] hover:bg-white"
              title={timerRunning ? 'Pause timer' : 'Start timer'}
            >
              {timerRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </button>
            <button
              type="button"
              onClick={() => setElapsedSec(0)}
              className="rounded p-1 text-[var(--ink-secondary)] hover:bg-white"
              title="Reset timer"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>

          {/* Evaluate CTA */}
          <button
            type="button"
            onClick={handleEvaluate}
            disabled={isEvaluating}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:opacity-95 disabled:opacity-60"
          >
            {isEvaluating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Award className="h-3.5 w-3.5" />
            )}
            {isEvaluating ? 'Scoring...' : 'Evaluate & Score'}
          </button>
        </div>
      </header>

      {/* Split Workspace */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-12">
        {/* LEFT PANE: Interviewer & Transcript (~48%) */}
        <section className="flex min-h-0 flex-col border-b border-[var(--border)] bg-white lg:col-span-5 lg:border-b-0 lg:border-r">
          {/* Collapsible Prompt & Spoiler-Guarded Reference */}
          <div className="border-b border-[var(--border)] bg-[var(--canvas)]/70 px-4 py-2.5">
            <button
              type="button"
              onClick={() => setShowPromptSpoiler((v) => !v)}
              className="flex w-full items-center justify-between text-xs font-medium text-[var(--ink-primary)]"
            >
              <span className="flex items-center gap-2">
                {showPromptSpoiler ? (
                  <EyeOff className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                ) : (
                  <Eye className="h-3.5 w-3.5 text-[var(--accent)]" />
                )}
                Prompt Hints & Strong-Hire Signals
                <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-muted)] ring-1 ring-[var(--border)]">
                  {stageLabel}
                </span>
              </span>
              {showPromptSpoiler ? (
                <ChevronUp className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
              )}
            </button>

            {showPromptSpoiler && (
              <div className="mt-2.5 space-y-2.5 rounded-xl border border-[var(--border)] bg-white p-3 text-xs">
                {state.aiSettings.language !== 'en' && (
                  <p className="rounded-lg bg-amber-50/80 px-2.5 py-2 leading-relaxed text-amber-950">
                    {question.promptZhHint}
                  </p>
                )}
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                    Recommended Structure
                  </div>
                  <ul className="mt-1 space-y-1 text-[var(--ink-secondary)]">
                    {question.frameworkSteps.map((st, idx) => (
                      <li key={idx} className="leading-snug">
                        • {st}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                    Strong Hire Signals
                  </div>
                  <ul className="mt-1 space-y-1 text-[var(--ink-secondary)]">
                    {question.strongHireSignals.map((sig, idx) => (
                      <li key={idx} className="leading-snug">
                        ✓ {sig}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Chat Messages */}
          <div className="flex-1 space-y-3.5 overflow-y-auto px-4 py-4">
            {messages.map((m) => {
              const isCandidate = m.sender === 'candidate';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isCandidate ? 'items-end' : 'items-start'}`}
                >
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                    {isCandidate ? 'You (Candidate)' : PERSONA_CONFIGS[persona].label}
                  </div>
                  <div
                    className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      isCandidate
                        ? 'rounded-tr-sm bg-[var(--ink-primary)] text-white'
                        : 'rounded-tl-sm border border-[var(--border)] bg-[var(--canvas)] text-[var(--ink-primary)]'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}
            {isReplying && (
              <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Interviewer is thinking...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts + Composer */}
          <div className="border-t border-[var(--border)] bg-[var(--canvas)]/60 p-3">
            {lastEngineNotice && (
              <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
                {lastEngineNotice}
              </div>
            )}

            {/* Quick action chips */}
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={isReplying}
                onClick={() =>
                  sendTurn(
                    'Before I structure my solution, could you clarify the top hard constraints (timeline, buyer, legacy boundaries)?',
                    'clarify'
                  )
                }
                className="rounded-md border border-[var(--border)] bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--ink-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                Clarifying Questions
              </button>
              <button
                type="button"
                disabled={isReplying}
                onClick={() => sendTurn(undefined, 'pushback')}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--ink-secondary)] hover:border-rose-400 hover:text-rose-700"
              >
                <Flame className="h-3 w-3 text-rose-500" />
                Harder Follow-Up
              </button>
              <button
                type="button"
                disabled={isReplying}
                onClick={() => sendTurn(undefined, 'nudge')}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--ink-secondary)] hover:border-amber-400 hover:text-amber-700"
              >
                <Lightbulb className="h-3 w-3 text-amber-500" />
                Give a Nudge
              </button>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-white p-2 focus-within:border-[var(--accent)]">
              <textarea
                rows={3}
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    sendTurn();
                  }
                }}
                placeholder="Type or speak your structured response... (⌘/Ctrl + Enter to send)"
                className="w-full resize-none bg-transparent px-1.5 py-1 text-[13px] leading-relaxed text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none"
              />
              <div className="mt-1.5 flex items-center justify-between border-t border-[var(--border)]/60 pt-1.5">
                <div className="flex items-center gap-1.5">
                  {speechSupported && (
                    <>
                      <button
                        type="button"
                        onClick={toggleVoiceInput}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                          isListening
                            ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-300'
                            : 'bg-[var(--canvas)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                        }`}
                      >
                        {isListening ? (
                          <>
                            <MicOff className="h-3.5 w-3.5 animate-pulse" />
                            Stop Mic
                          </>
                        ) : (
                          <>
                            <Mic className="h-3.5 w-3.5" />
                            Speak
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSpeechLang((l) => (l === 'en-US' ? 'zh-CN' : 'en-US'))
                        }
                        className="rounded px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-muted)] hover:bg-[var(--canvas)]"
                        title="Toggle speech recognition language"
                      >
                        {speechLang}
                      </button>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => sendTurn()}
                  disabled={isReplying || !composer.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--ink-primary)] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40"
                >
                  <Send className="h-3 w-3" />
                  Send Turn
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT PANE: Scratchpad / Architecture Board / Scorecard (~52%) */}
        <section className="flex min-h-0 flex-col bg-[var(--canvas)] lg:col-span-7">
          {/* Tabs */}
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-white px-4 py-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setRightTab('scratchpad')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  rightTab === 'scratchpad'
                    ? 'bg-[var(--ink-primary)] text-white'
                    : 'text-[var(--ink-secondary)] hover:bg-[var(--canvas)]'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Framework Scratchpad
              </button>
              <button
                type="button"
                onClick={() => setRightTab('diagram')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  rightTab === 'diagram'
                    ? 'bg-[var(--ink-primary)] text-white'
                    : 'text-[var(--ink-secondary)] hover:bg-[var(--canvas)]'
                }`}
              >
                <Workflow className="h-3.5 w-3.5" />
                Architecture / Flow Board
                {diagramNodes.length > 0 && (
                  <span className="rounded bg-black/15 px-1.5 py-0.2 font-mono text-[10px]">
                    {diagramNodes.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setRightTab('scorecard')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  rightTab === 'scorecard'
                    ? 'bg-[var(--ink-primary)] text-white'
                    : 'text-[var(--ink-secondary)] hover:bg-[var(--canvas)]'
                }`}
              >
                <Award className="h-3.5 w-3.5" />
                Rubric & Drill Scorecard
                {evaluation && (
                  <span className="rounded bg-emerald-500/20 px-1.5 font-mono text-[10px] text-emerald-700">
                    {evaluation.overallScore}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                setQuestionProgress(question.id, {
                  status: 'mastered',
                  lastPracticedAt: new Date().toISOString(),
                })
              }
              className="hidden items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--ink-secondary)] hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 sm:inline-flex"
            >
              <CheckCircle2 className="h-3 w-3" />
              Mark Mastered
            </button>
          </div>

          {/* Tab Body */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            {rightTab === 'scratchpad' && (
              <div className="flex h-full flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5">
                  <span className="text-xs font-medium text-[var(--ink-secondary)]">
                    Switch Role Canvas Template:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ROLE_LIST.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setScratchpadRole(r.id);
                          setScratchpad((prev) =>
                            prev.trim().length > 260
                              ? `${prev}\n\n--- ${r.shortLabel} Lens ---\n${buildStarterScratchpad(r.id)}`
                              : buildStarterScratchpad(r.id)
                          );
                        }}
                        className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                          scratchpadRole === r.id
                            ? 'bg-[var(--ink-primary)] text-white'
                            : 'bg-[var(--canvas)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                        }`}
                      >
                        {r.shortLabel}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  value={scratchpad}
                  onChange={(e) => setScratchpad(e.target.value)}
                  className="min-h-[380px] flex-1 resize-none rounded-xl border border-[var(--border)] bg-white p-4 font-mono text-[12.5px] leading-relaxed text-[var(--ink-primary)] shadow-2xs focus:border-[var(--accent)] focus:outline-none"
                  placeholder="Outline your MECE tree, SLA assumptions, metrics, and risks here..."
                />
              </div>
            )}

            {rightTab === 'diagram' && (
              <DiagramBoard
                nodes={diagramNodes}
                edges={diagramEdges}
                onChangeNodes={setDiagramNodes}
                onChangeEdges={setDiagramEdges}
                starterNodes={question.sampleDiagramNodes}
              />
            )}

            {rightTab === 'scorecard' && (
              <div className="space-y-4">
                {!evaluation ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-white p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
                          Target Bar-Raiser Rubric ({roleCfg.shortLabel})
                        </h3>
                        <p className="mt-1 text-xs text-[var(--ink-secondary)]">
                          Send 1–4 turns in the conversation on the left, map your flow on the Board, and click <strong>Evaluate & Score</strong> to unlock your scored debrief and sentence-level rewrites.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleEvaluate}
                        disabled={isEvaluating}
                        className="shrink-0 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-xs font-semibold text-white"
                      >
                        {isEvaluating ? 'Scoring...' : 'Run Evaluation Now'}
                      </button>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                        <div className="text-xs font-semibold text-emerald-800">
                          What Earns Strong Hire
                        </div>
                        <ul className="mt-2 space-y-1.5 text-xs text-emerald-950">
                          {question.strongHireSignals.map((s, i) => (
                            <li key={i}>✓ {s}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
                        <div className="text-xs font-semibold text-rose-800">
                          Common Red Flags to Avoid
                        </div>
                        <ul className="mt-2 space-y-1.5 text-xs text-rose-950">
                          {question.redFlags.map((r, i) => (
                            <li key={i}>✕ {r}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Score Header Card */}
                    <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-2xs">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-2xl font-bold text-[var(--ink-primary)]">
                              {evaluation.overallScore.toFixed(1)}
                            </span>
                            <span className="text-xs text-[var(--ink-muted)]">/ 5.0</span>
                            <span
                              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${verdictColor(
                                evaluation.verdict
                              )}`}
                            >
                              {evaluation.verdict}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--canvas)] px-2 py-0.5 text-[11px] text-[var(--ink-muted)]">
                              {evaluation.engineMode === 'live_gemini' ? (
                                <Sparkles className="h-3 w-3 text-[var(--accent)]" />
                              ) : (
                                <Cpu className="h-3 w-3 text-emerald-700" />
                              )}
                              {evaluation.engineMode === 'live_gemini' ? 'Gemini 4' : 'Local Coach'}
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-[var(--ink-secondary)]">
                            {evaluation.summary}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleStartThreeMinDrill}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--ink-primary)] px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90"
                        >
                          <Zap className="h-3.5 w-3.5 text-amber-300" />
                          Drill Weakest Dimension (3m)
                        </button>
                      </div>

                      {/* 5 Dimensions */}
                      <div className="mt-5 space-y-3">
                        {evaluation.dimensions.map((d) => (
                          <div
                            key={d.key}
                            className="rounded-xl border border-[var(--border)] bg-[var(--canvas)]/60 p-3"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-[var(--ink-primary)]">
                                {d.label}{' '}
                                {state.aiSettings.language !== 'en' && (
                                  <span className="font-normal text-[var(--ink-muted)]">
                                    · {d.labelZh}
                                  </span>
                                )}
                              </span>
                              <span className="font-mono font-semibold text-[var(--ink-primary)]">
                                {d.score.toFixed(1)} / 5.0
                              </span>
                            </div>
                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                              <div
                                className={`h-full rounded-full ${
                                  d.score >= 4.0
                                    ? 'bg-emerald-600'
                                    : d.score >= 3.2
                                      ? 'bg-[var(--accent)]'
                                      : 'bg-amber-500'
                                }`}
                                style={{ width: `${(d.score / 5) * 100}%` }}
                              />
                            </div>
                            <p className="mt-2 text-[11px] text-[var(--ink-secondary)]">
                              <strong>Evidence:</strong> {d.evidence}
                            </p>
                            <p className="mt-0.5 text-[11px] text-[var(--accent)]">
                              <strong>Next Fix:</strong> {d.advice}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Strengths & Missing Blind Spots */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-emerald-200 bg-white p-4">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                          <CheckCircle2 className="h-4 w-4" />
                          Verified Strengths
                        </div>
                        <ul className="mt-2 space-y-1.5 text-xs text-[var(--ink-secondary)]">
                          {evaluation.strengths.map((s, i) => (
                            <li key={i}>• {s}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-2xl border border-amber-200 bg-white p-4">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                          <AlertTriangle className="h-4 w-4" />
                          Missing High-Signal Blind Spots
                        </div>
                        <ul className="mt-2 space-y-1.5 text-xs text-[var(--ink-secondary)]">
                          {evaluation.missingSignals.map((m, i) => (
                            <li key={i}>• {m}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Before -> Strong Hire Rewrites */}
                    <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">
                        Before → Strong Hire Answer Rewrites
                      </h4>
                      <div className="mt-3 space-y-3">
                        {evaluation.rewrites.map((rw, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-[var(--border)] bg-[var(--canvas)]/70 p-3.5 text-xs"
                          >
                            <div className="text-[11px] font-semibold text-rose-700">
                              Before (Your Draft / Excerpt):
                            </div>
                            <p className="mt-1 italic text-[var(--ink-secondary)]">
                              &ldquo;{rw.originalExcerpt}&rdquo;
                            </p>
                            <p className="mt-1 text-[11px] text-[var(--ink-muted)]">
                              Gap: {rw.issue}
                            </p>
                            <div className="mt-2.5 text-[11px] font-semibold text-emerald-700">
                              Strong Hire Upgrade:
                            </div>
                            <p className="mt-1 rounded-lg bg-white p-2.5 font-medium leading-relaxed text-[var(--ink-primary)] ring-1 ring-emerald-200">
                              {rw.strongHireRewrite}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
