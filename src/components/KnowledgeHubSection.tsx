'use client';

import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  Copy,
  Edit3,
  Loader2,
  Plus,
  RotateCw,
  Search,
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

  const [subTab, setSubTab] = useState<HubSubTab>('snippets');
  const [flashcardMode, setFlashcardMode] = useState(false);
  const [flashIdx, setFlashIdx] = useState(0);
  const [flashFlipped, setFlashFlipped] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | RoleTrack>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Vocab editor state
  const [editingVocab, setEditingVocab] = useState<VocabItem | null>(null);
  const [vocabModalOpen, setVocabModalOpen] = useState(false);
  const [analyzingVocab, setAnalyzingVocab] = useState(false);
  const [vocabAnalyzeHint, setVocabAnalyzeHint] = useState<string | null>(null);

  // Snippet editor state
  const [editingSnippet, setEditingSnippet] = useState<KnowledgeSnippet | null>(null);
  const [snippetModalOpen, setSnippetModalOpen] = useState(false);
  const [tagsDraft, setTagsDraft] = useState('');

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

  const speakWord = (item: VocabItem) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(item.word);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    setSpeakingId(item.id);
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
          payload: { word: editingVocab.word.trim() },
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
      if (res.ok && json.data) {
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
            ? '已由 Gemini AI 自动生成音标、释义、面试例句与岗位标签，可微调后保存。'
            : '已自动生成标准词条格式（音标、释义、例句与岗位标签），可直接保存或微调。'
        );
      }
    } catch {
      setVocabAnalyzeHint('分析请求失败，请检查网络或手动填写。');
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
        <div className="inline-flex flex-wrap rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-1">
          <button
            type="button"
            onClick={() => setSubTab('vocab')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              subTab === 'vocab'
                ? 'bg-white text-[var(--accent)] shadow-2xs'
                : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            难词发音 &amp; 单词本 ({state.vocabItems.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('snippets')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              subTab === 'snippets'
                ? 'bg-white text-[var(--accent)] shadow-2xs'
                : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            知识摘录 &amp; Soundbites ({state.knowledgeSnippets.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('ocean')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              subTab === 'ocean'
                ? 'bg-white text-[var(--accent)] shadow-2xs'
                : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <Waves className="h-3.5 w-3.5" />
            知识海洋 ({(state.knowledgeArticles ?? []).length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                subTab === 'vocab'
                  ? '搜索单词/释义...'
                  : subTab === 'ocean'
                    ? '搜索文章/Takeaway...'
                    : '搜索关键词/问题/话术...'
              }
              className="w-48 rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-1.5 pr-3 pl-8 text-xs text-[var(--ink-primary)] focus:border-[var(--accent)] focus:bg-white focus:outline-none"
            />
          </div>

          {subTab !== 'ocean' && (
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'all' | RoleTrack)}
              className="rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3 py-1.5 text-xs font-medium text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
            >
              <option value="all">全部岗位 (All Roles)</option>
              {ROLE_LIST.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.shortLabel}
                </option>
              ))}
            </select>
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
                  ? 'border-[#6E32F5] bg-[#F3ECFF] text-[#6E32F5]'
                  : 'border-[var(--border)] bg-white text-[var(--ink-secondary)] hover:border-[var(--accent)]'
              }`}
            >
              <RotateCw className="h-3.5 w-3.5" />
              {flashcardMode ? '退出闪卡' : '闪卡抽查'}
            </button>
          )}

          {subTab !== 'ocean' && (
            <button
              type="button"
              onClick={subTab === 'vocab' ? openNewVocab : openNewSnippet}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-95"
            >
              <Plus className="h-3.5 w-3.5" />
              {subTab === 'vocab' ? '添加单词' : '添加知识摘录'}
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
        <div className="rounded-2xl border border-[#6E32F5]/30 bg-[#F9F6FF] p-6">
          {(() => {
            const card = filteredSnippets[flashIdx % filteredSnippets.length];
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-[#6E32F5]">
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
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[#848494]">
                    Trigger Question (试着先口述回答，再翻牌核对)
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
                      <p className="whitespace-pre-line border-t border-[#F2F2F7] pt-3 text-xs leading-relaxed text-[#5E5E6E]">
                        {card.deliveryTemplate}
                      </p>
                    )}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setFlashFlipped((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    {flashFlipped ? '收起答案' : '翻牌查看金句'}
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFlashIdx((i) => (i + 1) % filteredSnippets.length);
                        setFlashFlipped(false);
                      }}
                      className="rounded-xl border border-[#ECECF2] bg-white px-4 py-2 text-xs font-semibold text-[#111118] hover:border-[#6E32F5]"
                    >
                      下一张 →
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {subTab === 'snippets' && !flashcardMode && (
        <div className="space-y-4">
          {filteredSnippets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--canvas)]/60 p-8 text-center text-xs text-[var(--ink-muted)]">
              暂无匹配的知识摘录，点击右上角「添加知识摘录」即可随时保存 AI 新闻、技术架构或面试金句。
            </div>
          ) : (
            filteredSnippets.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)]/40 p-5 transition hover:border-[var(--accent)]/40"
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
                          className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="text-base font-semibold text-[var(--ink-primary)]">
                      {item.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => copyText(item.id, item.soundbite)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--ink-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          复制金句
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditSnippet(item)}
                      className="rounded-lg border border-[var(--border)] bg-white p-1.5 text-[var(--ink-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      title="编辑摘录"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteKnowledgeSnippet(item.id)}
                      className="rounded-lg border border-[var(--border)] bg-white p-1.5 text-[var(--ink-muted)] hover:border-rose-300 hover:text-rose-600"
                      title="删除摘录"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Soundbite Box */}
                <div className="mt-3 rounded-xl border border-[var(--accent)]/20 bg-white p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                    Interview Soundbite / Talking Point
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-primary)]">
                    {item.soundbite}
                  </p>
                </div>

                {/* Trigger Question + Delivery Template */}
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-[var(--border)] bg-white p-3.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                      Use Case / Trigger Question
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--ink-secondary)]">
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
        <div className="grid gap-3 md:grid-cols-2">
          {filteredVocab.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-[var(--border)] bg-[var(--canvas)]/60 p-8 text-center text-xs text-[var(--ink-muted)]">
              暂无匹配的单词，点击右上角「添加单词」即可记录难发音或高频面试术语。
            </div>
          ) : (
            filteredVocab.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-white p-4 transition hover:border-[var(--accent)]/40"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-[var(--ink-primary)]">
                          {item.word}
                        </h3>
                        <button
                          type="button"
                          onClick={() => speakWord(item)}
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition ${
                            speakingId === item.id
                              ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                              : 'border-[var(--border)] bg-[var(--canvas)] text-[var(--ink-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                          }`}
                          title="朗读发音"
                        >
                          <Volume2 className="h-3 w-3" />
                          {speakingId === item.id ? 'Speaking...' : '发音'}
                        </button>
                      </div>
                      {item.phonetic && (
                        <div className="mt-0.5 font-mono text-[11px] text-[var(--accent)]">
                          {item.phonetic}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditVocab(item)}
                        className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--ink-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                        title="编辑单词"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteVocabItem(item.id)}
                        className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--ink-muted)] hover:border-rose-300 hover:text-rose-600"
                        title="删除单词"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 text-xs font-medium text-[var(--ink-primary)]">
                    {item.meaning}
                  </p>

                  {item.example && (
                    <p className="mt-2 rounded-lg bg-[var(--canvas)] px-3 py-2 text-xs italic leading-relaxed text-[var(--ink-secondary)]">
                      &ldquo;{item.example}&rdquo;
                    </p>
                  )}

                  {item.notes && (
                    <p className="mt-2 text-[11px] text-amber-800">
                      💡 {item.notes}
                    </p>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-1 border-t border-[var(--border)] pt-2.5">
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

      {/* Vocab Add/Edit Modal */}
      {vocabModalOpen && editingVocab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--border)] bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-base font-semibold text-[var(--ink-primary)]">
                编辑 / 添加单词本词条
              </h3>
              <button
                type="button"
                onClick={() => setVocabModalOpen(false)}
                className="rounded-lg p-1 text-[var(--ink-muted)] hover:bg-[var(--canvas)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVocab} className="mt-4 space-y-3.5">
              <div className="rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-soft)]/50 p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[180px] flex-1">
                    <label className="text-xs font-semibold text-[var(--ink-secondary)]">
                      Word / Term *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingVocab.word}
                      onChange={(e) =>
                        setEditingVocab({ ...editingVocab, word: e.target.value })
                      }
                      placeholder="输入英文单词，如 hallucination"
                      className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs focus:border-[var(--accent)] focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!editingVocab.word.trim() || analyzingVocab}
                    onClick={handleAnalyzeVocab}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-xs font-semibold text-white transition hover:opacity-95 disabled:opacity-50"
                  >
                    {analyzingVocab ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        分析中...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-3.5 w-3.5" />
                        一键分析并填充
                      </>
                    )}
                  </button>
                </div>
                {vocabAnalyzeHint && (
                  <p className="mt-2 text-[11px] font-medium text-[var(--accent)]">
                    ✨ {vocabAnalyzeHint}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--ink-secondary)]">
                  Phonetic / 谐音提示
                </label>
                <input
                  type="text"
                  value={editingVocab.phonetic}
                  onChange={(e) =>
                    setEditingVocab({ ...editingVocab, phonetic: e.target.value })
                  }
                  placeholder="e.g. /həˌluːsɪˈneɪʃən/ (huh-loo-si-NAY-shun)"
                  className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-xs focus:border-[var(--accent)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--ink-secondary)]">
                  中文释义 / 面试场景含义 *
                </label>
                <input
                  type="text"
                  required
                  value={editingVocab.meaning}
                  onChange={(e) =>
                    setEditingVocab({ ...editingVocab, meaning: e.target.value })
                  }
                  placeholder="例如：确定性的（用于约束大模型幻觉的校验层）"
                  className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-xs focus:border-[var(--accent)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--ink-secondary)]">
                  面试例句 (Example Sentence)
                </label>
                <textarea
                  rows={2}
                  value={editingVocab.example}
                  onChange={(e) =>
                    setEditingVocab({ ...editingVocab, example: e.target.value })
                  }
                  placeholder="在回答中如何自然使用这个词..."
                  className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-xs focus:border-[var(--accent)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--ink-secondary)]">
                  发音/记忆备注 (Notes)
                </label>
                <input
                  type="text"
                  value={editingVocab.notes ?? ''}
                  onChange={(e) =>
                    setEditingVocab({ ...editingVocab, notes: e.target.value })
                  }
                  placeholder="例如：重音在第三音节..."
                  className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-xs focus:border-[var(--accent)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--ink-secondary)]">
                  适用岗位 (可多选)
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
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                            : 'border-[var(--border)] bg-white text-[var(--ink-secondary)]'
                        }`}
                      >
                        {r.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-3">
                <button
                  type="button"
                  onClick={() => setVocabModalOpen(false)}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--ink-secondary)]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white"
                >
                  保存单词
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Snippet Add/Edit Modal */}
      {snippetModalOpen && editingSnippet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-base font-semibold text-[var(--ink-primary)]">
                编辑 / 添加知识摘录 (Soundbite)
              </h3>
              <button
                type="button"
                onClick={() => setSnippetModalOpen(false)}
                className="rounded-lg p-1 text-[var(--ink-muted)] hover:bg-[var(--canvas)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSnippet} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-[var(--ink-secondary)]">
                  标题 (Title) *
                </label>
                <input
                  type="text"
                  required
                  value={editingSnippet.title}
                  onChange={(e) =>
                    setEditingSnippet({ ...editingSnippet, title: e.target.value })
                  }
                  placeholder="e.g. Pairing Probabilistic Generation with Deterministic Verification"
                  className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-xs focus:border-[var(--accent)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--ink-secondary)]">
                  核心金句 / Talking Point (Soundbite) *
                </label>
                <textarea
                  rows={4}
                  required
                  value={editingSnippet.soundbite}
                  onChange={(e) =>
                    setEditingSnippet({ ...editingSnippet, soundbite: e.target.value })
                  }
                  placeholder="粘贴你可以直接在面试中说出口的核心观点..."
                  className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-xs leading-relaxed focus:border-[var(--accent)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--ink-secondary)]">
                  触发问题 / 使用场景 (Trigger Question / Use Case)
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
                  placeholder="面试官问什么问题时抛出这段话..."
                  className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-xs focus:border-[var(--accent)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--ink-secondary)]">
                  表达模板 / 拆解步骤 (Delivery Template)
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
                  className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-xs leading-relaxed focus:border-[var(--accent)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--ink-secondary)]">
                  标签 (逗号分隔)
                </label>
                <input
                  type="text"
                  value={tagsDraft}
                  onChange={(e) => setTagsDraft(e.target.value)}
                  placeholder="AI Architecture, Guardrails, Reverse Q&A"
                  className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-xs focus:border-[var(--accent)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--ink-secondary)]">
                  适用岗位 (可多选)
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
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                            : 'border-[var(--border)] bg-white text-[var(--ink-secondary)]'
                        }`}
                      >
                        {r.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-3">
                <button
                  type="button"
                  onClick={() => setSnippetModalOpen(false)}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--ink-secondary)]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white"
                >
                  保存摘录
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
