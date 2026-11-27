'use client';

import React, { useState } from 'react';
import { Lock, ShieldCheck, Unlock } from 'lucide-react';
import { BrandMarkSvg } from './BrandChimeLogo';

export const PASSCODE_STORAGE_KEY = 'bestlucky_workspace_passcode';
export const UNLOCKED_SESSION_KEY = 'bestlucky_workspace_unlocked';

export function getSavedPasscode(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(PASSCODE_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setSavedPasscode(code: string) {
  if (typeof window === 'undefined') return;
  try {
    const clean = code.trim();
    if (clean) {
      window.localStorage.setItem(PASSCODE_STORAGE_KEY, clean);
      window.sessionStorage.setItem(UNLOCKED_SESSION_KEY, '1');
    } else {
      window.localStorage.removeItem(PASSCODE_STORAGE_KEY);
      window.sessionStorage.removeItem(UNLOCKED_SESSION_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

interface WorkspaceLockGateProps {
  locked: boolean;
  expectedCode: string;
  onUnlock: () => void;
}

export function WorkspaceLockGate({
  locked,
  expectedCode,
  onUnlock,
}: WorkspaceLockGateProps) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState(false);

  if (!locked || !expectedCode) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (draft.trim() === expectedCode) {
      try {
        window.sessionStorage.setItem(UNLOCKED_SESSION_KEY, '1');
      } catch {
        // ignore
      }
      setDraft('');
      setError(false);
      onUnlock();
    } else {
      setError(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0F0F17]/80 p-4 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label="Workspace Privacy Lock"
    >
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white p-7 text-center shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center">
          <BrandMarkSvg className="h-12 w-12 rounded-2xl shadow-md" />
        </div>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#F5F3FF] px-3 py-1 text-[11px] font-semibold text-[#6E32F5]">
          <Lock className="h-3 w-3" />
          Private Workspace Locked
        </div>
        <h2 className="mt-3 text-lg font-semibold tracking-tight text-[#111118]">
          Enter Passcode to Continue
        </h2>
        <p className="mt-1 text-xs text-[#6B7280]">
          Your job pipeline, resumes, and interview notes are protected.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <input
            type="password"
            autoFocus
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError(false);
            }}
            placeholder="Passcode"
            className={`w-full rounded-xl border px-3.5 py-2.5 text-center font-mono text-sm tracking-[0.25em] text-[#111118] focus:outline-none ${
              error
                ? 'border-rose-400 bg-rose-50/40'
                : 'border-[#E5E7EB] bg-[#FAFAFC] focus:border-[#6E32F5] focus:bg-white'
            }`}
          />
          {error && (
            <p className="text-xs font-medium text-rose-600">
              Incorrect passcode. Try again.
            </p>
          )}
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#111118] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#262636]"
          >
            <Unlock className="h-3.5 w-3.5" />
            Unlock BestLucky OS
          </button>
        </form>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[#9CA3AF]">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Local browser passcode guard</span>
        </div>
      </div>
    </div>
  );
}
