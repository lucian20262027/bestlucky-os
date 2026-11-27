'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Check,
  Copy,
  Edit3,
  Loader2,
  Mic,
  Plus,
  RotateCw,
  Search,
  Shuffle,
  Sparkles,
  Trash2,
  Volume2,
  Wand2,
  Waves,
  X,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import KnowledgeOceanTab from '@/components/KnowledgeOceanTab';
import { roleBadgeClasses } from '@/lib/helpers';
import { ROLE_LIST, ROLES_BY_ID } from '@/lib/roles';
import { KnowledgeSnippet, RoleTrack, VocabItem } from '@/lib/types';

type HubSubTab = 'vocab' | 'snippets' | 'ocean';

export default function KnowledgeHubSection() {
  const {
    state,
    upsertVocabItem,
    deleteVocabItem,
    upsertKnowledgeSnippet,
    deleteKnowledgeSnippet,
  } = useApp();

  const [subTab, setSubTab] = useState<HubSubTab>('vocab');
  const [flashcardMode, setFlashcardMode] = useState(false);
  const [flashIdx, setFlashIdx] = useState(0);
  const [flashFlipped, setFlashFlipped] = useState(false);
  const [vocabFlashMode, setVocabFlashMode] = useState(false);
  const [vocabFlashIdx, setVocabFlashIdx] = useState(0);
  const [vocabFlashFlipped, setVocabFlashFlipped] = useState(false);
  const [speechRate, setSpeechRate] = useState<0.75 | 1.0>(1.0);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | RoleTrack>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Quick-Add Vocab with AI Bar
  const [quickWordsInput, setQuickWordsInput] = useState('');
  const [quickAddingVocab, setQuickAddingVocab] = useState(false);
  const [quickAddNotice, setQuickAddNotice] = useState<string | null>(null);

  // Vocab editor state
  const [editingVocab, setEditingVocab] = useState<VocabItem | null>(null);
  const [vocabModalOpen, setVocabModalOpen] = useState(false);
  const [analyzingVocab, setAnalyzingVocab] = useState(false);
  const [vocabAnalyzeHint, setVocabAnalyzeHint] = useState<string | null>(null);

  // Snippet editor state
  const [editingSnippet, setEditingSnippet] = useState<KnowledgeSnippet | null>(null);
  const [snippetModalOpen, setSnippetModalOpen] = useState(false);
  const [tagsDraft, setTagsDraft] = useState('');

  useEffect(() => {
    if (!vocabModalOpen && !snippetModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (vocabModalOpen) setVocabModalOpen(false);
        if (snippetModalOpen) setSnippetModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [vocabModalOpen, snippetModalOpen]);

  const filteredVocab = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return state.vocabItems.filter((item) => {
      const matchesRole = roleFilter === 'all' || item.roles.includes(roleFilter);
      if (!matchesRole) return false;
      if (!q) return true;
      return (
        item.word.toLowerCase().includes(q) ||
        item.meaning.toLowerCase().includes(q) ||
        item.example.toLowerCase().includes(q) ||
        (item.notes ?? '').toLowerCase().includes(q)
      );
    });
  }, [state.vocabItems, searchQuery, roleFilter]);

  const filteredSnippets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return state.knowledgeSnippets.filter((item) => {
      const matchesRole = roleFilter === 'all' || item.roles.includes(roleFilter);
      if (!matchesRole) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.soundbite.toLowerCase().includes(q) ||
        item.triggerQuestion.toLowerCase().includes(q) ||
        item.deliveryTemplate.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [state.knowledgeSnippets, searchQuery, roleFilter]);

  const speakText = (speakKey: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) {
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = speechRate;
    setSpeakingId(speakKey);
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    window.speechSynthesis.speak(utterance);
  };

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      // Ignore clipboard errors cleanly
    }
  };

  const fetchVocabAnalysis = async (term: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (state.aiSettings.geminiApiKey.trim()) {
      headers['x-gemini-api-key'] = state.aiSettings.geminiApiKey.trim();
    }
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'analyze_vocab',
        model: state.aiSettings.model,
        language: state.aiSettings.language,
        payload: { word: term },
      }),
    });
    const json = (await res.json()) as {
      mode?: string;
      data?: {
        phonetic?: string;
        meaning?: string;
        example?: string;
        notes?: string;
        roles?: RoleTrack[];
      };
    };
    return { ok: res.ok, json };
  };

  const handleQuickAddWords = async (e: React.FormEvent) => {
    e.preventDefault();
    const terms = quickWordsInput
      .split(/[,，\n]+/)
      .map((w) => w.trim())
      .filter(Boolean)
      .slice(0, 5);
    if (terms.length === 0 || quickAddingVocab) return;

    setQuickAddingVocab(true);
    setQuickAddNotice(null);
    let addedCount = 0;

    try {
      for (const term of terms) {
        try {
          const { ok, json } = await fetchVocabAnalysis(term);
          const data = ok && json.data ? json.data : {};
          upsertVocabItem({
            id: `vocab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            word: term,
            phonetic: (data.phonetic ?? '').trim(),
            meaning: (data.meaning ?? `${term} (interview term)`).trim(),
            example: (data.example ?? '').trim(),
            notes: (data.notes ?? '').trim(),
            roles:
              Array.isArray(data.roles) && data.roles.length > 0
                ? data.roles
                : ['ai-pm', 'fde'],
            updatedAt: new Date().toISOString(),
          });
          addedCount++;
        } catch {
          // continue remaining terms cleanly
        }
      }
      if (addedCount > 0) {
        setQuickWordsInput('');
        setQuickAddNotice(`Added ${addedCount} ${addedCount === 1 ? 'word' : 'words'} with AI.`);
        window.setTimeout(() => setQuickAddNotice(null), 3500);
      } else {
        setQuickAddNotice('Could not analyze word(s). Try the "+ Add Word" dialog.');
      }
    } finally {
      setQuickAddingVocab(false);
    }
  };

  const openNewVocab = () => {
    setEditingVocab({
      id: `vocab-${Date.now()}`,
      word: '',
      phonetic: '',
      meaning: '',
      example: '',
      roles: ['ai-pm', 'fde'],
      notes: '',
      updatedAt: new Date().toISOString(),
    });
    setVocabAnalyzeHint(null);
    setVocabModalOpen(true);
  };

  const openEditVocab = (item: VocabItem) => {
    setEditingVocab({ ...item });
    setVocabAnalyzeHint(null);
    setVocabModalOpen(true);
  };

  const handleAnalyzeVocab = async () => {
    if (!editingVocab || !editingVocab.word.trim() || analyzingVocab) return;
    setAnalyzingVocab(true);
    setVocabAnalyzeHint(null);
    try {
      const { ok, json } = await fetchVocabAnalysis(editingVocab.word.trim());
      if (ok && json.data) {
        setEditingVocab((prev) =>
          prev
            ? {
                ...prev,
                phonetic: json.data?.phonetic || prev.phonetic,
                meaning: json.data?.meaning || prev.meaning,
                example: json.data?.example || prev.example,
                notes: json.data?.notes || prev.notes,
                roles:
                  Array.isArray(json.data?.roles) && json.data.roles.length > 0
                    ? json.data.roles
                    : prev.roles,
              }
            : prev
        );
        setVocabAnalyzeHint(
          json.mode === 'live_gemini'
            ? 'Generated IPA phonetic, meaning, interview example, and role tags via Gemini AI.'
            : 'Generated standard phonetic, meaning, example, and role tags.'
        );
      }
    } catch {
      setVocabAnalyzeHint('Analysis failed. Check network or enter fields manually.');
    } finally {
      setAnalyzingVocab(false);
    }
  };

  const handleSaveVocab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVocab || !editingVocab.word.trim()) return;
    upsertVocabItem({
      ...editingVocab,
      word: editingVocab.word.trim(),
      phonetic: editingVocab.phonetic.trim(),
      meaning: editingVocab.meaning.trim(),
      example: editingVocab.example.trim(),
      notes: editingVocab.notes?.trim() ?? '',
      roles: editingVocab.roles.length > 0 ? editingVocab.roles : ['ai-pm'],
      updatedAt: new Date().toISOString(),
    });
    setVocabModalOpen(false);
    setEditingVocab(null);
  };

  const handleDeleteVocab = (item: VocabItem) => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Delete word "${item.word}" from your vocabulary bank?`)
    ) {
      return;
    }
    deleteVocabItem(item.id);
  };

  const openNewSnippet = () => {
    setEditingSnippet({
      id: `snippet-${Date.now()}`,
      title: '',
      soundbite: '',
      roles: ['ai-pm', 'fdpm'],
      triggerQuestion: '',
      deliveryTemplate: '',
      tags: ['AI Architecture'],
      updatedAt: new Date().toISOString(),
    });
    setTagsDraft('AI Architecture');
    setSnippetModalOpen(true);
  };

  const openEditSnippet = (item: KnowledgeSnippet) => {
    setEditingSnippet({ ...item });
    setTagsDraft(item.tags.join(', '));
    setSnippetModalOpen(true);
  };

  const handleSaveSnippet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSnippet || !editingSnippet.title.trim() || !editingSnippet.soundbite.trim()) {
      return;
    }
    const parsedTags = tagsDraft
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    upsertKnowledgeSnippet({
      ...editingSnippet,
      title: editingSnippet.title.trim(),
      soundbite: editingSnippet.soundbite.trim(),
      triggerQuestion: editingSnippet.triggerQuestion.trim(),
      deliveryTemplate: editingSnippet.deliveryTemplate.trim(),
      tags: parsedTags.length > 0 ? parsedTags : ['Interview Soundbite'],
      roles: editingSnippet.roles.length > 0 ? editingSnippet.roles : ['ai-pm'],
      updatedAt: new Date().toISOString(),
    });
    setSnippetModalOpen(false);
    setEditingSnippet(null);
  };

  const handleDeleteSnippet = (item: KnowledgeSnippet) => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Delete soundbite "${item.title}"?`)
    ) {
      return;
    }
    deleteKnowledgeSnippet(item.id);
  };

  const toggleVocabRole = (role: RoleTrack) => {
    if (!editingVocab) return;
    const exists = editingVocab.roles.includes(role);
    const next = exists
      ? editingVocab.roles.filter((r) => r !== role)
      : [...editingVocab.roles, role];
    setEditingVocab({ ...editingVocab, roles: next });
  };

  const toggleSnippetRole = (role: RoleTrack) => {
    if (!editingSnippet) return;
    const exists = editingSnippet.roles.includes(role);
    const next = exists
      ? editingSnippet.roles.filter((r) => r !== role)
      : [...editingSnippet.roles, role];
    setEditingSnippet({ ...editingSnippet, roles: next });
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap rounded-xl border border-[#DCE0EA] bg-[#F6F7FB] p-1">
          <button
            type="button"
            onClick={() => setSubTab('vocab')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              subTab === 'vocab'
                ? 'bg-[#111118] text-white shadow-2xs'
                : 'text-[#475467] hover:text-[#111118]'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Vocab &amp; Pronunciation ({state.vocabItems.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('snippets')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              subTab === 'snippets'
                ? 'bg-[#111118] text-white shadow-2xs'
                : 'text-[#475467] hover:text-[#111118]'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Soundbites ({state.knowledgeSnippets.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('ocean')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              subTab === 'ocean'
                ? 'bg-[#111118] text-white shadow-2xs'
                : 'text-[#475467] hover:text-[#111118]'
            }`}
          >
            <Waves className="h-3.5 w-3.5" />
            Knowledge Ocean ({(state.knowledgeArticles ?? []).length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#667085]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                subTab === 'vocab'
                  ? 'Search words or meanings...'
                  : subTab === 'ocean'
                    ? 'Search articles or takeaways...'
                    : 'Search soundbites or triggers...'
              }
              className="w-52 rounded-xl border border-[#D4D8E4] bg-white py-1.5 pr-3 pl-8 text-xs text-[#111118] focus:border-[#6E32F5] focus:outline-none"
            />
          </div>

          {subTab !== 'ocean' && (
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'all' | RoleTrack)}
              className="rounded-xl border border-[#D4D8E4] bg-white px-3 py-1.5 text-xs font-medium text-[#111118] focus:border-[#6E32F5] focus:outline-none"
            >
              <option value="all">All Roles</option>
              {ROLE_LIST.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.shortLabel}
                </option>
              ))}
            </select>
          )}

          {subTab === 'vocab' && (
            <>
              <button
                type="button"
                onClick={() => setSpeechRate((r) => (r === 1.0 ? 0.75 : 1.0))}
                className={`rounded-xl border px-2.5 py-1.5 font-mono text-[11px] font-semibold transition ${
                  speechRate === 0.75
                    ? 'border-[#6E32F5] bg-[#F4EFFF] text-[#5D26D9]'
                    : 'border-[#D4D8E4] bg-white text-[#475467] hover:text-[#111118]'
                }`}
                title="Toggle TTS speaking speed"
              >
                {speechRate === 0.75 ? '0.75x Slow' : '1.0x Normal'}
              </button>

              {filteredVocab.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setVocabFlashMode((v) => !v);
                    setVocabFlashIdx(0);
                    setVocabFlashFlipped(false);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                    vocabFlashMode
                      ? 'border-[#6E32F5] bg-[#F4EFFF] text-[#5D26D9]'
                      : 'border-[#D4D8E4] bg-white text-[#344054] hover:border-[#6E32F5]'
                  }`}
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  {vocabFlashMode ? 'Exit Flashcards' : 'Vocab Flashcards'}
                </button>
              )}
            </>
          )}

          {subTab === 'snippets' && filteredSnippets.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setFlashcardMode((v) => !v);
                setFlashIdx(0);
                setFlashFlipped(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                flashcardMode
                  ? 'border-[#6E32F5] bg-[#F4EFFF] text-[#5D26D9]'
                  : 'border-[#D4D8E4] bg-white text-[#344054] hover:border-[#6E32F5]'
              }`}
            >
              <RotateCw className="h-3.5 w-3.5" />
              {flashcardMode ? 'Exit Flashcards' : 'Flashcard Drill'}
            </button>
          )}

          {subTab !== 'ocean' && (
            <button
              type="button"
              onClick={subTab === 'vocab' ? openNewVocab : openNewSnippet}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#6E32F5] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#5B24D6]"
            >
              <Plus className="h-3.5 w-3.5" />
              {subTab === 'vocab' ? 'Add Word' : 'Add Soundbite'}
            </button>
          )}
        </div>
      </div>

      {/* Sub-module 3: Knowledge Ocean */}
      {subTab === 'ocean' && (
        <KnowledgeOceanTab
          searchQuery={searchQuery}
          onJumpToSnippets={() => setSubTab('snippets')}
        />
      )}

      {/* Sub-module 1: Knowledge Snippets / Soundbites (List or Flashcard Mode) */}
      {subTab === 'snippets' && flashcardMode && filteredSnippets.length > 0 && (
        <div className="rounded-2xl border border-[#D4C5FD] bg-[#F9F6FF] p-6">
          {(() => {
            const card = filteredSnippets[flashIdx % filteredSnippets.length];
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-[#5D26D9]">
                  <span className="font-semibold">
                    Flashcard {(flashIdx % filteredSnippets.length) + 1} / {filteredSnippets.length}
                  </span>
                  <div className="flex gap-1">
                    {card.roles.map((r) => (
                      <span
                        key={r}
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold ${roleBadgeClasses(
                          r
                        )}`}
                      >
                        {ROLES_BY_ID[r]?.shortLabel}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-[#ECECF2] bg-white p-5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[#667085]">
                    Trigger Question (Answer out loud before flipping)
                  </div>
                  <p className="mt-2 text-base font-semibold text-[#111118]">
                    {card.triggerQuestion || card.title}
                  </p>
                </div>

                {flashFlipped ? (
                  <div className="space-y-3 rounded-xl border border-emerald-200 bg-white p-5">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                      Target Soundbite &amp; Delivery
                    </div>
                    <p className="text-sm leading-relaxed text-[#111118]">{card.soundbite}</p>
                    {card.deliveryTemplate && (
                      <p className="whitespace-pre-line border-t border-[#F2F2F7] pt-3 text-xs leading-relaxed text-[#475467]">
                        {card.deliveryTemplate}
                      </p>
                    )}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setFlashFlipped((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5B24D6]"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    {flashFlipped ? 'Hide Answer' : 'Reveal Soundbite'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFlashIdx((i) => (i + 1) % filteredSnippets.length);
                      setFlashFlipped(false);
                    }}
                    className="rounded-xl border border-[#D4D8E4] bg-white px-4 py-2 text-xs font-semibold text-[#111118] hover:border-[#6E32F5]"
                  >
                    Next Card →
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {subTab === 'snippets' && !flashcardMode && (
        <div className="space-y-4">
          {filteredSnippets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D4D8E4] bg-[#F8F9FC] p-8 text-center text-xs text-[#667085]">
              No matching soundbites yet. Click &ldquo;Add Soundbite&rdquo; to save AI talking points, architectural angles, or crisp interview lines.
            </div>
          ) : (
            filteredSnippets.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-[#E6E8F0] bg-[#FAFBFD] p-5 transition hover:border-[#D4C5FD]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.roles.map((r) => (
                        <span
                          key={r}
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${roleBadgeClasses(
                            r
                          )}`}
                        >
                          {ROLES_BY_ID[r]?.shortLabel ?? r}
                        </span>
                      ))}
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-[#F4EFFF] px-2 py-0.5 text-[10px] font-medium text-[#5D26D9]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="text-base font-semibold text-[#111118]">
                      {item.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link
                      href="/practice?mode=coach"
                      className="inline-flex items-center gap-1 rounded-lg border border-[#D4C5FD] bg-[#F9F6FF] px-2.5 py-1 text-[11px] font-semibold text-[#5D26D9] hover:bg-[#F3ECFF]"
                    >
                      <Mic className="h-3 w-3" />
                      Practice
                    </Link>
                    <button
                      type="button"
                      onClick={() => copyText(item.id, item.soundbite)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#D4D8E4] bg-white px-2.5 py-1 text-[11px] font-medium text-[#475467] hover:border-[#6E32F5] hover:text-[#111118]"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copy
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditSnippet(item)}
                      className="rounded-lg border border-[#D4D8E4] bg-white p-1.5 text-[#475467] hover:border-[#6E32F5] hover:text-[#111118]"
                      title="Edit soundbite"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSnippet(item)}
                      className="rounded-lg border border-[#D4D8E4] bg-white p-1.5 text-[#667085] hover:border-rose-300 hover:text-rose-600"
                      title="Delete soundbite"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Soundbite Box */}
                <div className="mt-3 rounded-xl border border-[#E2D4FF] bg-white p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[#5D26D9]">
                    Interview Soundbite / Talking Point
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#111118]">
                    {item.soundbite}
                  </p>
                </div>

                {/* Trigger Question + Delivery Template */}
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-[#E6E8F0] bg-white p-3.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#667085]">
                      Use Case / Trigger Question
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[#475467]">
                      {item.triggerQuestion || '—'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
                      Delivery Template (How to Use)
                    </div>
                    <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-emerald-950">
                      {item.deliveryTemplate || '—'}
                    </p>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {/* Sub-module 2: Vocabulary & Pronunciation Book */}
      {subTab === 'vocab' && (
        <div className="space-y-4">
          {/* Quick-Add with AI Bar */}
          <form
            onSubmit={handleQuickAddWords}
            className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#DCE0EA] bg-[#F6F7FB] p-3"
          >
            <Wand2 className="ml-1 h-4 w-4 shrink-0 text-[#6E32F5]" />
            <input
              type="text"
              value={quickWordsInput}
              onChange={(e) => setQuickWordsInput(e.target.value)}
              placeholder="Quick-add words with AI (comma-separated, e.g. hallucination, idempotent, telemetry)..."
              className="min-w-[220px] flex-1 rounded-xl border border-[#CFD4E0] bg-white px-3 py-2 text-xs text-[#111118] placeholder:text-[#848B9C] focus:border-[#6E32F5] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!quickWordsInput.trim() || quickAddingVocab}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#111118] px-3.5 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-45"
            >
              {quickAddingVocab ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-[#C4B5FD]" />
                  AI Quick Add
                </>
              )}
            </button>
            {quickAddNotice && (
              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                {quickAddNotice}
              </span>
            )}
          </form>

          {vocabFlashMode && filteredVocab.length > 0 ? (
            /* Vocab Flashcard Drill Mode */
            <div className="rounded-2xl border border-[#D4C5FD] bg-[#F9F6FF] p-6">
              {(() => {
                const card = filteredVocab[vocabFlashIdx % filteredVocab.length];
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-[#5D26D9]">
                      <span className="font-semibold">
                        Word {(vocabFlashIdx % filteredVocab.length) + 1} / {filteredVocab.length}
                      </span>
                      <div className="flex gap-1">
                        {card.roles.map((r) => (
                          <span
                            key={r}
                            className={`rounded px-2 py-0.5 text-[10px] font-semibold ${roleBadgeClasses(
                              r
                            )}`}
                          >
                            {ROLES_BY_ID[r]?.shortLabel}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#ECECF2] bg-white p-6">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#667085]">
                          Pronounce &amp; Define Out Loud
                        </div>
                        <div className="mt-1.5 text-2xl font-bold text-[#111118]">
                          {card.word}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => speakText(`flash-${card.id}`, card.word)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4C5FD] bg-[#F4EFFF] px-3.5 py-2 text-xs font-semibold text-[#5D26D9] hover:bg-[#EAE1FF]"
                      >
                        <Volume2 className="h-4 w-4" />
                        Speak ({speechRate}x)
                      </button>
                    </div>

                    {vocabFlashFlipped && (
                      <div className="space-y-3 rounded-xl border border-emerald-200 bg-white p-5">
                        {card.phonetic && (
                          <div className="font-mono text-xs font-semibold text-[#6E32F5]">
                            {card.phonetic}
                          </div>
                        )}
                        <p className="text-sm font-medium text-[#111118]">{card.meaning}</p>
                        {card.notes && (
                          <p className="text-xs text-amber-800">💡 {card.notes}</p>
                        )}
                        {card.example && (
                          <div className="flex items-start justify-between gap-3 rounded-lg bg-[#F8F9FC] p-3">
                            <p className="text-xs italic leading-relaxed text-[#475467]">
                              &ldquo;{card.example}&rdquo;
                            </p>
                            <button
                              type="button"
                              onClick={() => speakText(`flash-ex-${card.id}`, card.example)}
                              className="shrink-0 rounded-lg border border-[#D4D8E4] bg-white p-1.5 text-[#5D26D9] hover:border-[#6E32F5]"
                              title="Play example sentence"
                            >
                              <Volume2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setVocabFlashFlipped((v) => !v)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5B24D6]"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                        {vocabFlashFlipped ? 'Hide Details' : 'Flip Card'}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const randomIdx = Math.floor(Math.random() * filteredVocab.length);
                            setVocabFlashIdx(randomIdx);
                            setVocabFlashFlipped(false);
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-[#D4D8E4] bg-white px-3.5 py-2 text-xs font-semibold text-[#344054] hover:border-[#6E32F5]"
                        >
                          <Shuffle className="h-3.5 w-3.5" />
                          Shuffle
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setVocabFlashIdx((i) => (i + 1) % filteredVocab.length);
                            setVocabFlashFlipped(false);
                          }}
                          className="rounded-xl bg-[#111118] px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
                        >
                          Next Word →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredVocab.length === 0 ? (
                <div className="col-span-full rounded-xl border border-dashed border-[#D4D8E4] bg-[#F8F9FC] p-8 text-center text-xs text-[#667085]">
                  No matching words yet. Use AI Quick Add above or click &ldquo;Add Word&rdquo; to save hard-to-pronounce interview terms.
                </div>
              ) : (
                filteredVocab.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between rounded-2xl border border-[#E6E8F0] bg-white p-4 transition hover:border-[#D4C5FD]"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-[#111118]">
                              {item.word}
                            </h3>
                            <button
                              type="button"
                              onClick={() => speakText(`word-${item.id}`, item.word)}
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition ${
                                speakingId === `word-${item.id}`
                                  ? 'border-[#6E32F5] bg-[#F4EFFF] text-[#5D26D9]'
                                  : 'border-[#DCE0EA] bg-[#F8F9FC] text-[#475467] hover:border-[#6E32F5] hover:text-[#5D26D9]'
                              }`}
                              title="Speak word pronunciation"
                            >
                              <Volume2 className="h-3 w-3" />
                              {speakingId === `word-${item.id}` ? 'Speaking...' : 'Pronounce'}
                            </button>
                          </div>
                          {item.phonetic && (
                            <div className="mt-0.5 font-mono text-[11px] font-medium text-[#6E32F5]">
                              {item.phonetic}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditVocab(item)}
                            className="rounded-lg border border-[#DCE0EA] p-1.5 text-[#475467] hover:border-[#6E32F5] hover:text-[#111118]"
                            title="Edit word"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteVocab(item)}
                            className="rounded-lg border border-[#DCE0EA] p-1.5 text-[#667085] hover:border-rose-300 hover:text-rose-600"
                            title="Delete word"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="mt-2 text-xs font-medium text-[#111118]">
                        {item.meaning}
                      </p>

                      {item.example && (
                        <div className="mt-2 flex items-start justify-between gap-2 rounded-lg bg-[#F6F7FB] px-3 py-2">
                          <p className="text-xs italic leading-relaxed text-[#475467]">
                            &ldquo;{item.example}&rdquo;
                          </p>
                          <button
                            type="button"
                            onClick={() => speakText(`ex-${item.id}`, item.example)}
                            className={`shrink-0 rounded-md p-1 transition ${
                              speakingId === `ex-${item.id}`
                                ? 'bg-[#F4EFFF] text-[#6E32F5]'
                                : 'text-[#667085] hover:bg-white hover:text-[#5D26D9]'
                            }`}
                            title="Speak example sentence"
                          >
                            <Volume2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {item.notes && (
                        <p className="mt-2 text-[11px] text-amber-800">
                          💡 {item.notes}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1 border-t border-[#ECEEF4] pt-2.5">
                      {item.roles.map((r) => (
                        <span
                          key={r}
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${roleBadgeClasses(
                            r
                          )}`}
                        >
                          {ROLES_BY_ID[r]?.shortLabel ?? r}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Vocab Add/Edit Modal */}
      {vocabModalOpen && editingVocab && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setVocabModalOpen(false);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#D2D6E2] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#ECEEF4] pb-3">
              <h3 className="text-base font-semibold text-[#111118]">
                Add / Edit Vocabulary Term
              </h3>
              <button
                type="button"
                onClick={() => setVocabModalOpen(false)}
                className="rounded-lg p-1 text-[#667085] hover:bg-[#F3F4F8]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVocab} className="mt-4 space-y-3.5">
              <div className="rounded-xl border border-[#D4C5FD] bg-[#F7F4FF] p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[180px] flex-1">
                    <label className="text-xs font-semibold text-[#344054]">
                      Word / Term *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingVocab.word}
                      onChange={(e) =>
                        setEditingVocab({ ...editingVocab, word: e.target.value })
                      }
                      placeholder="e.g. hallucination"
                      className="mt-1 w-full rounded-xl border border-[#C5CBD9] bg-white px-3 py-2 text-xs text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!editingVocab.word.trim() || analyzingVocab}
                    onClick={handleAnalyzeVocab}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#6E32F5] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#5B24D6] disabled:opacity-50"
                  >
                    {analyzingVocab ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-3.5 w-3.5" />
                        AI Auto-Fill
                      </>
                    )}
                  </button>
                </div>
                {vocabAnalyzeHint && (
                  <p className="mt-2 text-[11px] font-medium text-[#5D26D9]">
                    ✨ {vocabAnalyzeHint}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-[#344054]">
                  Phonetic / Stress Guide
                </label>
                <input
                  type="text"
                  value={editingVocab.phonetic}
                  onChange={(e) =>
                    setEditingVocab({ ...editingVocab, phonetic: e.target.value })
                  }
                  placeholder="e.g. /həˌluːsɪˈneɪʃən/ (huh-loo-si-NAY-shun)"
                  className="mt-1 w-full rounded-xl border border-[#C5CBD9] px-3 py-2 text-xs text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#344054]">
                  Meaning &amp; Interview Context *
                </label>
                <input
                  type="text"
                  required
                  value={editingVocab.meaning}
                  onChange={(e) =>
                    setEditingVocab({ ...editingVocab, meaning: e.target.value })
                  }
                  placeholder="e.g. Deterministic validation layer before mutating production state"
                  className="mt-1 w-full rounded-xl border border-[#C5CBD9] px-3 py-2 text-xs text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#344054]">
                  Interview Example Sentence
                </label>
                <textarea
                  rows={2}
                  value={editingVocab.example}
                  onChange={(e) =>
                    setEditingVocab({ ...editingVocab, example: e.target.value })
                  }
                  placeholder="How you naturally drop this term in an interview answer..."
                  className="mt-1 w-full rounded-xl border border-[#C5CBD9] px-3 py-2 text-xs text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#344054]">
                  Pronunciation Tip (Notes)
                </label>
                <input
                  type="text"
                  value={editingVocab.notes ?? ''}
                  onChange={(e) =>
                    setEditingVocab({ ...editingVocab, notes: e.target.value })
                  }
                  placeholder="e.g. Stress the third syllable..."
                  className="mt-1 w-full rounded-xl border border-[#C5CBD9] px-3 py-2 text-xs text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#344054]">
                  Target Roles (Multi-select)
                </label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {ROLE_LIST.map((r) => {
                    const active = editingVocab.roles.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => toggleVocabRole(r.id)}
                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                          active
                            ? 'border-[#6E32F5] bg-[#F4EFFF] text-[#5D26D9]'
                            : 'border-[#DCE0EA] bg-white text-[#475467]'
                        }`}
                      >
                        {r.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#ECEEF4] pt-3">
                <button
                  type="button"
                  onClick={() => setVocabModalOpen(false)}
                  className="rounded-xl border border-[#CFD4E0] px-4 py-2 text-xs font-semibold text-[#475467]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5B24D6]"
                >
                  Save Word
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Snippet Add/Edit Modal */}
      {snippetModalOpen && editingSnippet && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSnippetModalOpen(false);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#D2D6E2] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#ECEEF4] pb-3">
              <h3 className="text-base font-semibold text-[#111118]">
                Add / Edit Soundbite
              </h3>
              <button
                type="button"
                onClick={() => setSnippetModalOpen(false)}
                className="rounded-lg p-1 text-[#667085] hover:bg-[#F3F4F8]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSnippet} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-[#344054]">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={editingSnippet.title}
                  onChange={(e) =>
                    setEditingSnippet({ ...editingSnippet, title: e.target.value })
                  }
                  placeholder="e.g. Pairing Probabilistic Generation with Deterministic Verification"
                  className="mt-1 w-full rounded-xl border border-[#C5CBD9] px-3 py-2 text-xs text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#344054]">
                  Interview Soundbite / Talking Point *
                </label>
                <textarea
                  rows={4}
                  required
                  value={editingSnippet.soundbite}
                  onChange={(e) =>
                    setEditingSnippet({ ...editingSnippet, soundbite: e.target.value })
                  }
                  placeholder="Verbatim sharp point you can deliver in an interview..."
                  className="mt-1 w-full rounded-xl border border-[#C5CBD9] px-3 py-2 text-xs leading-relaxed text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#344054]">
                  Trigger Question / Use Case
                </label>
                <textarea
                  rows={2}
                  value={editingSnippet.triggerQuestion}
                  onChange={(e) =>
                    setEditingSnippet({
                      ...editingSnippet,
                      triggerQuestion: e.target.value,
                    })
                  }
                  placeholder="Which interviewer prompt triggers this talking point?"
                  className="mt-1 w-full rounded-xl border border-[#C5CBD9] px-3 py-2 text-xs text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#344054]">
                  Delivery Template
                </label>
                <textarea
                  rows={4}
                  value={editingSnippet.deliveryTemplate}
                  onChange={(e) =>
                    setEditingSnippet({
                      ...editingSnippet,
                      deliveryTemplate: e.target.value,
                    })
                  }
                  placeholder="Step 1 ... Step 2 ..."
                  className="mt-1 w-full rounded-xl border border-[#C5CBD9] px-3 py-2 text-xs leading-relaxed text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#344054]">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tagsDraft}
                  onChange={(e) => setTagsDraft(e.target.value)}
                  placeholder="AI Architecture, Guardrails, Reverse Q&A"
                  className="mt-1 w-full rounded-xl border border-[#C5CBD9] px-3 py-2 text-xs text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#344054]">
                  Target Roles (Multi-select)
                </label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {ROLE_LIST.map((r) => {
                    const active = editingSnippet.roles.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => toggleSnippetRole(r.id)}
                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                          active
                            ? 'border-[#6E32F5] bg-[#F4EFFF] text-[#5D26D9]'
                            : 'border-[#DCE0EA] bg-white text-[#475467]'
                        }`}
                      >
                        {r.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#ECEEF4] pt-3">
                <button
                  type="button"
                  onClick={() => setSnippetModalOpen(false)}
                  className="rounded-xl border border-[#CFD4E0] px-4 py-2 text-xs font-semibold text-[#475467]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5B24D6]"
                >
                  Save Soundbite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
