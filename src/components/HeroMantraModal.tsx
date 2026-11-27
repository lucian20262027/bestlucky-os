'use client';

import React, { useEffect } from 'react';
import { Sparkles, Volume2, X } from 'lucide-react';

interface HeroMantraModalProps {
  open: boolean;
  onClose: () => void;
}

const HERO_MANTRA = 'I am Lucian Wang, I am the hero of myself.';

export function HeroMantraModal({ open, onClose }: HeroMantraModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const speakMantra = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(HERO_MANTRA);
    u.lang = 'en-US';
    u.rate = 0.92;
    window.speechSynthesis.speak(u);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="hero-mantra-title"
      data-testid="hero-mantra-modal"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#A78BFA]/30 bg-gradient-to-br from-[#160A2E] via-[#221048] to-[#0F0E17] p-7 text-white shadow-2xl animate-bl-pop-spring"
      >
        {/* Ambient radial glows */}
        <div className="pointer-events-none absolute -top-20 -right-16 h-52 w-52 rounded-full bg-[#6E32F5]/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-[#F59E0B]/20 blur-3xl" />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-white/10 p-1.5 text-white/70 transition hover:bg-white/20 hover:text-white"
          aria-label="Close mantra modal"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Top Emblem */}
        <div className="relative flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#FDE68A]/40 bg-gradient-to-br from-[#2E1065] via-[#6E32F5] to-[#F59E0B] text-lg font-extrabold tracking-tight text-white shadow-lg shadow-[#6E32F5]/35">
            LU
          </div>

          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#FDE68A]/25 bg-white/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FDE68A]">
            <Sparkles className="h-3 w-3 text-[#FBBF24]" />
            Daily Hero Manifesto
          </div>

          {/* Centerpiece Mantra */}
          <h2
            id="hero-mantra-title"
            className="mt-5 font-serif text-2xl font-bold leading-snug tracking-tight text-white sm:text-[26px]"
          >
            &ldquo;I am Lucian Wang, I am the{' '}
            <span className="bg-gradient-to-r from-[#FDE68A] via-[#FBBF24] to-[#C4B5FD] bg-clip-text text-transparent">
              hero of myself
            </span>
            .&rdquo;
          </h2>

          <p className="mt-3 text-xs font-medium tracking-wide text-white/65">
            我是 Lucian Wang，我是自己的英雄。
          </p>

          {/* Divider */}
          <div className="my-5 h-px w-24 bg-gradient-to-r from-transparent via-[#A78BFA]/45 to-transparent" />

          {/* Actions */}
          <div className="flex w-full items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={speakMantra}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              <Volume2 className="h-3.5 w-3.5 text-[#FDE68A]" />
              Speak
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#6E32F5] via-[#7C3AED] to-[#F59E0B] px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#6E32F5]/30 transition hover:opacity-95"
            >
              I&apos;m Ready 🚀
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
