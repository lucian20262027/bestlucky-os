'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, MessageSquare, Send, Sparkles, X } from 'lucide-react';
import { useApp } from '@/components/AppProvider';

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  links?: Array<{ label: string; href: string }>;
}

export function FloatingCopilotWidget() {
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hi Lucian! 我是你的 BestLucky OS 面试 Copilot，随时问我任何岗位题型、JD 冲刺策略或知识库问题。',
    },
  ]);

  const sendQuery = async (raw: string) => {
    const q = raw.trim();
    if (!q || loading) return;
    setInput('');
    setTurns((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: q }]);
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
          payload: { query: q },
        }),
      });
      const json = (await res.json()) as {
        data?: { answer?: string; links?: Array<{ label: string; href: string }> };
      };
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

  return (
    <div className="fixed right-5 bottom-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[480px] w-[370px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-[#ECECF2] bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-[#4F46E5] via-[#6E32F5] to-[#8B5CF6] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-semibold">BestLucky Copilot</div>
                <div className="text-[10px] text-white/80">
                  {state.aiSettings.geminiApiKey.trim() ? 'Gemini Live Connected' : 'Instant Coach'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-white/80 transition hover:bg-white/15 hover:text-white"
              aria-label="Close Copilot"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Chips */}
          <div className="flex flex-wrap gap-1.5 border-b border-[#F2F2F7] bg-[#FAFAFC] px-3 py-2">
            {[
              'OpenAI FDE 30-60-90',
              'NVIDIA TPM reverse Q&A',
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
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
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
                        <ArrowRight className="h-2.5 w-2.5" />
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

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendQuery(input);
            }}
            className="flex items-center gap-2 border-t border-[#ECECF2] bg-white p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your interviews..."
              className="flex-1 rounded-xl border border-[#ECECF2] bg-[#FAFAFC] px-3 py-2 text-xs text-[#111118] focus:border-[#6E32F5] focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#6E32F5] text-white transition hover:bg-[#5B24D6] disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open BestLucky AI Copilot"
        className="group flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-[#4F46E5] via-[#6E32F5] to-[#8B5CF6] px-4 text-xs font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
      >
        {open ? (
          <>
            <X className="h-4 w-4" />
            <span>Close</span>
          </>
        ) : (
          <>
            <MessageSquare className="h-4 w-4" />
            <span>AI Copilot</span>
          </>
        )}
      </button>
    </div>
  );
}
