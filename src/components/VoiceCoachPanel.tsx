'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Loader2, Mic, MicOff, RotateCcw, Sparkles, Square, Volume2 } from 'lucide-react';
import { useApp } from '@/components/AppProvider';

interface SpeechReviewResult {
  structureScore: number;
  clarityScore: number;
  fillerCount: number;
  wpm: number;
  feedback: string;
  polishedVersion: string;
  vocabUpgrades: Array<{ insteadOf: string; use: string; reason: string }>;
}

interface VoiceCoachPanelProps {
  questionTitle: string;
  compact?: boolean;
  initialTranscript?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function VoiceCoachPanel({
  questionTitle,
  compact = false,
  initialTranscript = '',
}: VoiceCoachPanelProps) {
  const { state } = useApp();
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState(initialTranscript);

  useEffect(() => {
    if (initialTranscript) {
      setTranscript(initialTranscript);
    }
  }, [initialTranscript]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [review, setReview] = useState<SpeechReviewResult | null>(null);
  const [micNote, setMicNote] = useState<string | null>(null);
  const [copiedPolished, setCopiedPolished] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setMicNote(null);
    setReview(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      };
      recorder.start();
      mediaRecorderRef.current = recorder;

      // Optional live Speech-to-Text
      const SpeechRec =
        (window as unknown as Record<string, unknown>).SpeechRecognition ||
        (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
      if (typeof SpeechRec === 'function') {
        const rec = new (SpeechRec as new () => SpeechRecognitionInstance)();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';
        rec.onresult = (ev) => {
          let full = '';
          for (let i = 0; i < ev.results.length; i++) {
            full += `${ev.results[i][0].transcript} `;
          }
          setTranscript(full.trim());
        };
        rec.onerror = () => {};
        rec.start();
        recognitionRef.current = rec;
      }

      setSeconds(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } catch {
      setMicNote('未检测到麦克风权限，你也可以直接在下方输入或粘贴口述文本进行 AI 口语复盘。');
    }
  };

  const stopRecording = () => {
    setRecording(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      recognitionRef.current = null;
    }
  };

  const analyzeSpeech = async () => {
    if (!transcript.trim() || analyzing) return;
    setAnalyzing(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (state.aiSettings.geminiApiKey.trim()) {
        headers['x-gemini-api-key'] = state.aiSettings.geminiApiKey.trim();
      }
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'review_speech',
          model: state.aiSettings.model,
          language: state.aiSettings.language,
          payload: {
            questionTitle,
            transcript: transcript.trim(),
            durationSec: Math.max(15, seconds),
          },
        }),
      });
      const json = (await res.json()) as { data?: SpeechReviewResult };
      if (res.ok && json.data) {
        setReview(json.data);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const speakPolished = () => {
    if (!review?.polishedVersion || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(review.polishedVersion);
    u.lang = 'en-US';
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  };

  const copyPolished = async () => {
    if (!review?.polishedVersion) return;
    await navigator.clipboard.writeText(review.polishedVersion);
    setCopiedPolished(true);
    window.setTimeout(() => setCopiedPolished(false), 1800);
  };

  const loadSampleTranscript = () => {
    setTranscript(
      'So basically, in my last project, we kind of had a big issue where enterprise customers were seeing like slow RAG responses and some hallucinations. I worked with engineering to build a deterministic validator before any tool call executed, and we also added eval harnesses. As a result, p95 latency dropped from 4.2 seconds to 1.4 seconds and pilot-to-paid conversion improved significantly.'
    );
    setReview(null);
  };

  const resetCoach = () => {
    setTranscript('');
    setReview(null);
    setMicNote(null);
    setSeconds(0);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  return (
    <div
      className={`rounded-2xl border border-[#ECECF2] bg-white ${
        compact ? 'p-3.5' : 'p-5 shadow-2xs'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F3ECFF] text-[#6E32F5]">
            <Mic className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#111118]">
              Voice Answer &amp; AI Speech Coach
            </h3>
            <p className="text-[11px] text-[#848494]">
              英文开口作答 → 自动转写 + STAR/MECE 结构评分 + 高级词替换润色
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {recording && (
            <span className="rounded-full bg-rose-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-rose-600">
              ● {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
            </span>
          )}
          <button
            type="button"
            onClick={recording ? stopRecording : () => void startRecording()}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-white transition ${
              recording
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-[#6E32F5] hover:bg-[#5B24D6]'
            }`}
          >
            {recording ? (
              <>
                <MicOff className="h-3.5 w-3.5" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="h-3.5 w-3.5" />
                Start Speaking
              </>
            )}
          </button>
        </div>
      </div>

      {micNote && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800">
          {micNote}
        </p>
      )}

      {audioUrl && (
        <div className="mt-3">
          <audio controls src={audioUrl} className="h-9 w-full" />
        </div>
      )}

      <div className="mt-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-[#848494]">
            {recording
              ? '正在实时转写英文口述...'
              : '支持麦克风录音实时转写，也可直接粘贴/编辑英文口述稿'}
          </span>
          <div className="flex items-center gap-2">
            {!transcript.trim() && !recording && (
              <button
                type="button"
                onClick={loadSampleTranscript}
                className="rounded-lg border border-[#ECECF2] bg-[#FAFAFC] px-2.5 py-1 text-[11px] font-medium text-[#5E5E6E] transition hover:border-[#6E32F5]/40 hover:text-[#6E32F5]"
              >
                加载示例口述稿
              </button>
            )}
            {(transcript.trim() || audioUrl || review) && !recording && (
              <button
                type="button"
                onClick={resetCoach}
                className="inline-flex items-center gap-1 rounded-lg border border-[#ECECF2] px-2.5 py-1 text-[11px] font-medium text-[#848494] transition hover:text-[#111118]"
              >
                <RotateCcw className="h-3 w-3" />
                清空
              </button>
            )}
          </div>
        </div>
        <textarea
          rows={compact ? 3 : 5}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="点击右上角 Start Speaking 开始英文开口作答（自动实时转写），或直接在这里输入/修改你的回答..."
          className="w-full rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-3 text-xs leading-relaxed text-[#111118] focus:border-[#6E32F5] focus:bg-white focus:outline-none"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-[#848494]">
            {transcript.trim()
              ? `当前约 ${transcript.trim().split(/\s+/).filter(Boolean).length} 词`
              : '建议时长 60–120 秒'}
          </span>
          <button
            type="button"
            disabled={!transcript.trim() || analyzing}
            onClick={() => void analyzeSpeech()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#111118] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2A2A35] disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Analyzing Speech...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 text-[#C4B5FD]" />
                AI 口语结构 &amp; 润色复盘
              </>
            )}
          </button>
        </div>
      </div>

      {review && (
        <div className="mt-4 space-y-3.5 rounded-2xl border border-[#6E32F5]/20 bg-[#F9F6FF] p-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-xl border border-[#ECECF2] bg-white px-3 py-2">
              <div className="text-[10px] font-medium uppercase tracking-wider text-[#848494]">
                Structure
              </div>
              <div className="mt-0.5 text-sm font-bold text-[#6E32F5]">
                {review.structureScore}/10
              </div>
            </div>
            <div className="rounded-xl border border-[#ECECF2] bg-white px-3 py-2">
              <div className="text-[10px] font-medium uppercase tracking-wider text-[#848494]">
                Clarity
              </div>
              <div className="mt-0.5 text-sm font-bold text-emerald-600">
                {review.clarityScore}/10
              </div>
            </div>
            <div className="rounded-xl border border-[#ECECF2] bg-white px-3 py-2">
              <div className="text-[10px] font-medium uppercase tracking-wider text-[#848494]">
                Speaking Pace
              </div>
              <div className="mt-0.5 text-sm font-bold text-[#111118]">
                {review.wpm} <span className="text-[11px] font-normal text-[#848494]">WPM</span>
              </div>
            </div>
            <div className="rounded-xl border border-[#ECECF2] bg-white px-3 py-2">
              <div className="text-[10px] font-medium uppercase tracking-wider text-[#848494]">
                Filler Words
              </div>
              <div className="mt-0.5 text-sm font-bold text-amber-600">
                {review.fillerCount}
              </div>
            </div>
          </div>

          <p className="rounded-xl border border-[#ECECF2] bg-white/80 px-3.5 py-2.5 text-xs leading-relaxed text-[#111118]">
            {review.feedback}
          </p>

          <div className="rounded-xl border border-[#ECECF2] bg-white p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6E32F5]">
                Senior / Staff Polished Rewrite
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void copyPolished()}
                  className="inline-flex items-center gap-1 rounded-md border border-[#ECECF2] bg-white px-2 py-0.5 text-[11px] font-medium text-[#5E5E6E] hover:text-[#111118]"
                >
                  {copiedPolished ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  {copiedPolished ? '已复制' : '复制'}
                </button>
                <button
                  type="button"
                  onClick={speakPolished}
                  className="inline-flex items-center gap-1 rounded-md bg-[#F3ECFF] px-2.5 py-0.5 text-[11px] font-semibold text-[#6E32F5] hover:bg-[#EAE0FF]"
                >
                  {speaking ? <Square className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                  {speaking ? '停止朗读' : '示范朗读'}
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs italic leading-relaxed text-[#111118]">
              &ldquo;{review.polishedVersion}&rdquo;
            </p>
          </div>

          {review.vocabUpgrades.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#848494]">
                Vocabulary Upgrades (高级词替换)
              </div>
              <div className="grid gap-2.5 sm:grid-cols-3">
                {review.vocabUpgrades.map((u, idx) => (
                  <div key={idx} className="rounded-xl border border-[#ECECF2] bg-white p-3 text-[11px]">
                    <div className="text-[#848494] line-through">{u.insteadOf}</div>
                    <div className="mt-0.5 font-semibold text-[#6E32F5]">→ {u.use}</div>
                    <div className="mt-1 text-[#5E5E6E]">{u.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
