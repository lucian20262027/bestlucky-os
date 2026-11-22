'use client';

import React, { useMemo, useState } from 'react';
import { BookMarked, Sparkles, Star, Volume2, X, Zap } from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { ROLE_LIST, ROLES_BY_ID } from '@/lib/roles';
import { ROLE_PLAYBOOKS } from '@/lib/seed-frameworks';
import { RoleTrack } from '@/lib/types';

interface WarmupModalProps {
  open: boolean;
  onClose: () => void;
}

export function WarmupModal({ open, onClose }: WarmupModalProps) {
  const { state } = useApp();
  const [role, setRole] = useState<RoleTrack>('fde');

  const playbook = ROLE_PLAYBOOKS[role];

  const topStories = useMemo(() => {
    const matched = state.stories.filter((s) => s.targetRoles.includes(role));
    return (matched.length > 0 ? matched : state.stories).slice(0, 2);
  }, [state.stories, role]);

  const topSoundbites = useMemo(() => {
    const matched = state.knowledgeSnippets.filter((k) => k.roles.includes(role));
    return (matched.length > 0 ? matched : state.knowledgeSnippets).slice(0, 2);
  }, [state.knowledgeSnippets, role]);

  const topVocab = useMemo(() => {
    const matched = state.vocabItems.filter((v) => v.roles.includes(role));
    return (matched.length > 0 ? matched : state.vocabItems).slice(0, 3);
  }, [state.vocabItems, role]);

  if (!open) return null;

  const speak = (word: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = 'en-US';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#ECECF2] bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ECECF2] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#6E32F5] to-[#9333EA] text-white">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#111118]">
                Pre-Interview 15-Minute Warmup
              </h2>
              <p className="text-xs text-[#848494]">
                考前 15 分钟突击模式：只看最核心的 30s 开场白、2 个故事、2 条金句与 3 个难词
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#848494] hover:bg-[#FAFAFC]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Role Selector */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {ROLE_LIST.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRole(r.id)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                role === r.id
                  ? 'border-[#6E32F5] bg-[#6E32F5] text-white'
                  : 'border-[#ECECF2] bg-[#FAFAFC] text-[#5E5E6E] hover:text-[#111118]'
              }`}
            >
              {r.shortLabel}
            </button>
          ))}
        </div>

        {/* 4 Lifesaving Blocks */}
        <div className="mt-5 space-y-4">
          {/* 1. 30-Second Opener */}
          <div className="rounded-xl border border-[#6E32F5]/25 bg-[#F9F6FF] p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6E32F5]">
              1. {ROLES_BY_ID[role]?.shortLabel} · 30-Second Opening Script
            </div>
            <p className="mt-1.5 text-sm font-medium italic leading-relaxed text-[#111118]">
              {playbook.thirtySecOpener}
            </p>
          </div>

          {/* 2. Top 2 STAR+L Stories */}
          <div className="rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5E5E6E]">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              2. Top 2 STAR+L Stories
            </div>
            <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
              {topStories.map((st) => (
                <div key={st.id} className="rounded-xl border border-[#ECECF2] bg-white p-3">
                  <div className="text-xs font-semibold text-[#111118]">{st.title}</div>
                  <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-[#5E5E6E]">
                    {st.result}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Top 2 Soundbites / Reverse Q&A */}
          <div className="rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5E5E6E]">
              <Sparkles className="h-3.5 w-3.5 text-[#6E32F5]" />
              3. 2 High-Signal Soundbites &amp; Reverse Q&amp;A
            </div>
            <div className="mt-2.5 space-y-2.5">
              {topSoundbites.map((kb) => (
                <div key={kb.id} className="rounded-xl border border-[#ECECF2] bg-white p-3">
                  <div className="text-xs font-semibold text-[#111118]">{kb.title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-[#5E5E6E]">{kb.soundbite}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Top 3 Hard-to-Pronounce Vocab */}
          <div className="rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5E5E6E]">
              <BookMarked className="h-3.5 w-3.5 text-[#6E32F5]" />
              4. 3 High-Frequency Vocab Terms (Click to Speak)
            </div>
            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
              {topVocab.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[#ECECF2] bg-white px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-[#111118]">{v.word}</div>
                    <div className="truncate font-mono text-[10px] text-[#6E32F5]">
                      {v.phonetic}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => speak(v.word)}
                    className="shrink-0 rounded-full bg-[#F3ECFF] p-1.5 text-[#6E32F5] hover:bg-[#6E32F5] hover:text-white"
                    title="发音"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
