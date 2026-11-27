'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, KeyRound, Loader2, Send, Sparkles, X } from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { BrandMarkSvg } from '@/components/BrandChimeLogo';

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  links?: Array<{ label: string; href: string }>;
}

interface FloatingCopilotWidgetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FloatingCopilotWidget({
  open,
  onOpenChange,
}: FloatingCopilotWidgetProps) {
  const { state, updateAISettings } = useApp();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyDraft, setKeyDraft] = useState('');
  const [engineMode, setEngineMode] = useState<'unknown' | 'live_gemini' | 'local_fallback'>('unknown');
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hi! Lucky Bot is ready. Ask about any interview question, system design trade-off, STAR+L framing, or phrasing polish.',
    },
  ]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

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
          text: json.data?.answer ?? 'Unable to generate a response right now. Please try again.',
          links: json.data?.links ?? [],
        },
      ]);
    } catch {
      setTurns((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: 'assistant', text: 'Network request failed. Please check your connection and retry.' },
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

  if (!open) return null;

  return (
    <div className="fixed right-5 bottom-5 z-[90] flex flex-col items-end">
      <div className="flex h-[510px] w-[390px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-[#1A1734] via-[#3B1D8F] to-[#6E32F5] px-4 py-3 text-white">
          <div className="flex items-center gap-2.5">
            <BrandMarkSvg className="h-7 w-7 rounded-lg ring-1 ring-white/20" />
            <div>
              <div className="text-xs font-semibold">Lucky Bot</div>
              <div className="flex items-center gap-1.5 text-[10px] text-white/85">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    isGeminiLive ? 'bg-emerald-300' : 'bg-amber-300'
                  }`}
                />
                {isGeminiLive ? 'Gemini Live · Ask Anything' : 'Offline Mode · Click key to connect Gemini'}
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
              title="Configure Gemini API Key"
            >
              <KeyRound className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
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
              placeholder="Paste Gemini API Key (AIza...)"
              className="flex-1 rounded-lg border border-[#D4C5FD] bg-white px-2.5 py-1 text-[11px] text-[#111118] focus:border-[#6E32F5] focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-[#6E32F5] px-2.5 py-1 text-[11px] font-semibold text-white"
            >
              Save
            </button>
          </form>
        )}

        {/* Quick Chips */}
        <div className="flex flex-wrap gap-1.5 border-b border-[#F2F2F7] bg-[#FAFAFC] px-3 py-2">
          {[
            'OpenAI FDE 30-60-90',
            'Polish my 60s self-intro',
            'AI PM evals & guardrails',
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
                    ? 'bg-[#111118] text-white'
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
                      onClick={() => onOpenChange(false)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#D4C5FD] bg-[#F5F3FF] px-2 py-0.5 text-[11px] font-semibold text-[#6E32F5] hover:bg-[#6E32F5] hover:text-white"
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
              Thinking...
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
          <Sparkles className="ml-1 h-3.5 w-3.5 shrink-0 text-[#6E32F5]" />
          <input
            type="text"
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Lucky Bot anything..."
            className="flex-1 rounded-xl border border-[#ECECF2] bg-[#FAFAFC] px-3 py-2 text-xs text-[#111118] focus:border-[#6E32F5] focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#111118] text-white transition hover:bg-[#6E32F5] disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
