'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, KeyRound, Loader2, Send, Sparkles, X } from 'lucide-react';
import { useApp } from '@/components/AppProvider';

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  links?: Array<{ label: string; href: string }>;
}

export function FloatingCopilotWidget() {
  const { state, updateAISettings } = useApp();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyDraft, setKeyDraft] = useState('');
  const [engineMode, setEngineMode] = useState<'unknown' | 'live_gemini' | 'local_fallback'>('unknown');
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hi Lucian! 我已接入 Gemini Copilot，任何面试题、系统设计、英文表达或通用问题都可以直接问我。',
    },
  ]);

  const sendQuery = async (raw: string) => {
    const q = raw.trim();
    if (!q || loading) return;
    setInput('');
    const nextUserTurn: ChatTurn = { id: `u-${Date.now()}`, role: 'user', text: q };
    const historyPayload = [...turns, nextUserTurn]
      .filter((t) => t.id !== 'welcome')
      .slice(-8)
      .map((t) => ({ role: t.role, text: t.text }));
    setTurns((prev) => [...prev, nextUserTurn]);
    setLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (state.aiSettings.geminiApiKey.trim()) {
        headers['x-gemini-api-key'] = state.aiSettings.geminiApiKey.trim();
      }
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'dashboard_ask',
          model: state.aiSettings.model,
          language: state.aiSettings.language,
          payload: {
            query: q,
            history: historyPayload,
          },
        }),
      });
      const json = (await res.json()) as {
        mode?: 'live_gemini' | 'local_fallback';
        data?: { answer?: string; links?: Array<{ label: string; href: string }> };
      };
      if (json.mode) {
        setEngineMode(json.mode);
      }
      setTurns((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: json.data?.answer ?? '暂时无法获取回答，请稍后再试。',
          links: json.data?.links ?? [],
        },
      ]);
    } catch {
      setTurns((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: 'assistant', text: '网络请求失败，请检查连接后重试。' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    updateAISettings({ geminiApiKey: keyDraft.trim() });
    setShowKeyInput(false);
    setEngineMode(keyDraft.trim() ? 'live_gemini' : 'unknown');
  };

  const isGeminiLive = Boolean(state.aiSettings.geminiApiKey.trim()) || engineMode === 'live_gemini';

  return (
    <div className="fixed right-5 bottom-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[490px] w-[380px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-[#ECECF2] bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-[#4F46E5] via-[#6E32F5] to-[#8B5CF6] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-semibold">BestLucky Gemini Copilot</div>
                <div className="flex items-center gap-1.5 text-[10px] text-white/85">
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      isGeminiLive ? 'bg-emerald-300' : 'bg-amber-300'
                    }`}
                  />
                  {isGeminiLive ? 'Gemini Live · Ask Anything' : '点击右上角 🔑 连接 Gemini Key'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setKeyDraft(state.aiSettings.geminiApiKey);
                  setShowKeyInput((v) => !v);
                }}
                className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
                title="配置 Gemini API Key"
              >
                <KeyRound className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-white/80 transition hover:bg-white/15 hover:text-white"
                aria-label="Close Copilot"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {showKeyInput && (
            <form
              onSubmit={handleSaveKey}
              className="flex items-center gap-2 border-b border-[#ECECF2] bg-[#F9F6FF] px-3 py-2"
            >
              <input
                type="password"
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                placeholder="粘贴 Gemini API Key (AIza...)"
                className="flex-1 rounded-lg border border-[#D4C5FD] bg-white px-2.5 py-1 text-[11px] text-[#111118] focus:border-[#6E32F5] focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-[#6E32F5] px-2.5 py-1 text-[11px] font-semibold text-white"
              >
                保存
              </button>
            </form>
          )}

          {/* Quick Chips */}
          <div className="flex flex-wrap gap-1.5 border-b border-[#F2F2F7] bg-[#FAFAFC] px-3 py-2">
            {[
              'OpenAI FDE 30-60-90',
              '帮我润色一段英文自我介绍',
              'AI PM guardrails',
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => void sendQuery(chip)}
                className="rounded-full border border-[#ECECF2] bg-white px-2.5 py-0.5 text-[11px] font-medium text-[#5E5E6E] transition hover:border-[#6E32F5]/40 hover:text-[#6E32F5]"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-3.5">
            {turns.map((t) => (
              <div
                key={t.id}
                className={`flex flex-col ${t.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    t.role === 'user'
                      ? 'bg-[#6E32F5] text-white'
                      : 'border border-[#ECECF2] bg-[#FAFAFC] text-[#111118]'
                  }`}
                >
                  {t.text}
                </div>
                {t.links && t.links.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {t.links.map((lnk) => (
                      <Link
                        key={lnk.href + lnk.label}
                        href={lnk.href}
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#6E32F5]/30 bg-[#F3ECFF] px-2 py-0.5 text-[11px] font-semibold text-[#6E32F5] hover:bg-[#6E32F5] hover:text-white"
                      >
                        {lnk.label}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-1.5 text-xs text-[#848494]">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6E32F5]" />
                Gemini 思考中...
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendQuery(input);
            }}
            className="flex items-center gap-2 border-t border-[#ECECF2] bg-white p-2.5"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="问我任何问题..."
              className="flex-1 rounded-xl border border-[#ECECF2] bg-[#FAFAFC] px-3 py-2 text-xs text-[#111118] focus:border-[#6E32F5] focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#6E32F5] text-white transition hover:bg-[#5B24D6] disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Launcher Pill */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full bg-[#6E32F5] py-2.5 pl-3 pr-4 text-xs font-semibold text-white shadow-lg transition hover:bg-[#5B24D6]"
      >
        {open ? (
          <>
            <X className="h-4 w-4" />
            Close
          </>
        ) : (
          <>
            <svg
              viewBox="0 0 64 64"
              fill="none"
              className="h-5 w-5 shrink-0 rounded-md shadow-xs ring-1 ring-white/25"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="bl-copilot-royal-gold" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#2E1065" />
                  <stop offset="52%" stopColor="#6E32F5" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
                <linearGradient id="bl-copilot-gold-rim" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.75" />
                  <stop offset="50%" stopColor="#DDD6FE" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#FBBF24" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="bl-copilot-star-gold" x1="42" y1="9" x2="54" y2="23" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FEF3C7" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
              </defs>
              <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#bl-copilot-royal-gold)" />
              <rect x="3" y="3" width="58" height="58" rx="15" stroke="url(#bl-copilot-gold-rim)" strokeWidth="1.6" />
              <path
                d="M48 9.5C48.7 13.7 51.3 16.3 55.5 17C51.3 17.7 48.7 20.3 48 24.5C47.3 20.3 44.7 17.7 40.5 17C44.7 16.3 47.3 13.7 48 9.5Z"
                fill="url(#bl-copilot-star-gold)"
              />
              <text
                x="31"
                y="42.5"
                textAnchor="middle"
                fill="#FFFFFF"
                fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif"
                fontSize="21"
                fontWeight="800"
                letterSpacing="-0.8"
              >
                Best
              </text>
              <rect x="14" y="48" width="36" height="2.4" rx="1.2" fill="url(#bl-copilot-star-gold)" opacity="0.92" />
            </svg>
            AI Copilot
          </>
        )}
      </button>
    </div>
  );
}
