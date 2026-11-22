'use client';

import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  Download,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  Upload,
  Volume2,
  X,
} from 'lucide-react';
import { useApp } from './AppProvider';
import { GeminiModelChoice, LanguageMode } from '@/lib/types';

export function SettingsModal() {
  const {
    state,
    settingsOpen,
    setSettingsOpen,
    updateAISettings,
    exportBackup,
    importBackup,
    resetDemoData,
  } = useApp();

  const [showKey, setShowKey] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!settingsOpen) return null;

  const hasKey = state.aiSettings.geminiApiKey.trim().length > 0;

  const handleDownload = () => {
    const json = exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loopos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg('Backup JSON downloaded.');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const ok = importBackup(text);
    setStatusMsg(ok ? 'Workspace restored from backup!' : 'Invalid backup JSON file.');
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-xl rounded-2xl border border-[var(--border)] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--ink-primary)]">
              Workspace & AI Engine Settings
            </h2>
            <p className="text-xs text-[var(--ink-muted)]">
              配置 Gemini 4 API、语言模式与本地数据备份（零账号门槛，数据保存在本地浏览器）
            </p>
          </div>
          <button
            onClick={() => setSettingsOpen(false)}
            className="rounded-lg p-1.5 text-[var(--ink-muted)] hover:bg-[var(--sidebar)] hover:text-[var(--ink-primary)]"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[75vh] space-y-5 overflow-y-auto px-6 py-5">
          {/* AI Engine Status */}
          <div className="flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-4">
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 rounded-lg p-2 ${
                  hasKey ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {hasKey ? <Sparkles className="h-4 w-4" /> : <Cpu className="h-4 w-4" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--ink-primary)]">
                    {hasKey ? 'Live Gemini 4 AI Enabled' : 'Local Coach Engine Active'}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      hasKey
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {hasKey ? state.aiSettings.model : 'Zero-Key Offline Mode'}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[var(--ink-secondary)]">
                  {hasKey
                    ? 'Your requests use the Gemini Interactions API for dynamic follow-ups, rubric scoring, and JD tailoring.'
                    : 'Works out-of-the-box without an API key! Add a Gemini API key below (or in .env.local) anytime to upgrade to live Gemini 4 coaching.'}
                </p>
              </div>
            </div>
          </div>

          {/* API Key Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">
              Gemini API Key (Optional · Stored in Local Browser)
            </label>
            <div className="mt-2 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={state.aiSettings.geminiApiKey}
                  onChange={(e) => updateAISettings({ geminiApiKey: e.target.value })}
                  placeholder="AIza... (or set GEMINI_API_KEY in .env.local)"
                  className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 pr-9 font-mono text-xs text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-2.5 top-2 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {hasKey && (
                <button
                  type="button"
                  onClick={() => updateAISettings({ geminiApiKey: '' })}
                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--ink-secondary)] hover:bg-[var(--canvas)]"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">
              Gemini Model Tier
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2.5">
              {(
                [
                  {
                    id: 'gemini-4-hydrogen',
                    title: 'gemini-4-hydrogen',
                    desc: 'Fast, low-latency live interviewer turns (Recommended)',
                  },
                  {
                    id: 'gemini-4-argon',
                    title: 'gemini-4-argon',
                    desc: 'Deep reasoning for tough Bar-Raiser & rubric critiques',
                  },
                ] as { id: GeminiModelChoice; title: string; desc: string }[]
              ).map((m) => {
                const active = state.aiSettings.model === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => updateAISettings({ model: m.id })}
                    className={`rounded-xl border p-3 text-left transition ${
                      active
                        ? 'border-[var(--accent)] bg-blue-50/40'
                        : 'border-[var(--border)] hover:bg-[var(--canvas)]'
                    }`}
                  >
                    <div className="font-mono text-xs font-semibold text-[var(--ink-primary)]">
                      {m.title}
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--ink-secondary)]">{m.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Language & Voice */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">
                Coaching Language Mode
              </label>
              <div className="mt-2 flex rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-1">
                {(
                  [
                    { id: 'en', label: 'EN' },
                    { id: 'bilingual', label: 'EN + 中文' },
                    { id: 'zh', label: '中文' },
                  ] as { id: LanguageMode; label: string }[]
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateAISettings({ language: opt.id })}
                    className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${
                      state.aiSettings.language === opt.id
                        ? 'bg-white text-[var(--ink-primary)] shadow-xs'
                        : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">
                Interviewer Voice Readout (TTS)
              </label>
              <button
                type="button"
                onClick={() => updateAISettings({ ttsEnabled: !state.aiSettings.ttsEnabled })}
                className={`mt-2 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  state.aiSettings.ttsEnabled
                    ? 'border-[var(--accent)] bg-blue-50/40 text-[var(--accent)]'
                    : 'border-[var(--border)] bg-white text-[var(--ink-secondary)]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Speak interviewer turns aloud
                </span>
                <span>{state.aiSettings.ttsEnabled ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          {/* Backup & Reset */}
          <div className="border-t border-[var(--border)] pt-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">
              Local Data Management (Sessions, Stories, Custom Loops)
            </label>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--ink-primary)] hover:bg-[var(--canvas)]"
              >
                <Download className="h-3.5 w-3.5" />
                Export JSON Backup
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--ink-primary)] hover:bg-[var(--canvas)]"
              >
                <Upload className="h-3.5 w-3.5" />
                Import JSON
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                onChange={handleImportFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => {
                  resetDemoData();
                  setStatusMsg('Workspace reset to starter template.');
                }}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Demo Data
              </button>
            </div>
            {statusMsg && (
              <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {statusMsg}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-[var(--border)] px-6 py-3">
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            className="rounded-lg bg-[var(--ink-primary)] px-4 py-2 text-xs font-medium text-white hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
