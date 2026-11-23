'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  Globe,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { extractDocumentText } from '@/lib/doc-parser-client';
import { KnowledgeArticle, KnowledgeSnippet } from '@/lib/types';

interface KnowledgeOceanTabProps {
  searchQuery: string;
  onJumpToSnippets?: () => void;
}

export default function KnowledgeOceanTab({
  searchQuery,
  onJumpToSnippets,
}: KnowledgeOceanTabProps) {
  const {
    state,
    upsertKnowledgeArticle,
    deleteKnowledgeArticle,
    upsertKnowledgeSnippet,
  } = useApp();

  const [titleInput, setTitleInput] = useState('');
  const [sourceUrlInput, setSourceUrlInput] = useState('');
  const [fileNameInput, setFileNameInput] = useState('');
  const [rawTextInput, setRawTextInput] = useState('');
  const [parsingFile, setParsingFile] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [notice, setNotice] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const [expandedRaw, setExpandedRaw] = useState<Record<string, boolean>>({});

  const articles = useMemo(() => {
    const list = state.knowledgeArticles ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.takeaways.some((t) => t.toLowerCase().includes(q)) ||
        a.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [state.knowledgeArticles, searchQuery]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setNotice('');
    setParsingFile(true);
    setFileNameInput(file.name);
    if (!titleInput.trim()) {
      setTitleInput(file.name.replace(/\.[^.]+$/, ''));
    }
    try {
      const result = await extractDocumentText(file);
      if (result.text) {
        setRawTextInput(result.text);
      } else if (result.error) {
        setNotice(result.error);
      }
    } finally {
      setParsingFile(false);
    }
  };

  const loadSampleArticle = () => {
    setTitleInput('Building Effective Enterprise Agents — Anthropic Engineering Field Notes');
    setFileNameInput('Anthropic_Effective_Agents.pdf');
    setSourceUrlInput('https://www.anthropic.com/research/building-effective-agents');
    setRawTextInput(
      `The most successful enterprise AI teams start with composable, simple workflows rather than over-engineered multi-agent swarms. Every tool interface should be treated with the same rigor as a public API—clear schemas, deterministic validation before state mutation, and explicit error recovery. Evaluation harnesses must run continuously on real production failure traces, measuring task completion, latency SLA, and cost per resolution before expanding autonomy.`
    );
    setNotice('');
  };

  const handleAnalyzeArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawTextInput.trim() || analyzing) return;
    setAnalyzing(true);
    setNotice('');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (state.aiSettings.geminiApiKey.trim()) {
        headers['x-gemini-api-key'] = state.aiSettings.geminiApiKey.trim();
      }
      const finalTitle = titleInput.trim() || fileNameInput || 'Saved Article Insight';
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'analyze_article',
          model: state.aiSettings.model,
          language: state.aiSettings.language,
          payload: {
            title: finalTitle,
            content: rawTextInput.trim(),
          },
        }),
      });
      const json = (await res.json()) as {
        mode?: 'live_gemini' | 'local_fallback';
        warning?: string;
        data?: {
          summary: string;
          takeaways: string[];
          unifiedAngle?: string;
          roleNuance?: string;
          practicalUse?: {
            scenarios: string[];
            interviewQuestions: string[];
            spokenAnswer: string;
            pitfalls: string[];
            deepFollowUps: string[];
          };
          roleAngles?: { fdpm: string; aiPm: string; fde: string };
          tags: string[];
        };
        error?: string;
      };
      if (!res.ok || !json.data) {
        setNotice(json.error || '分析失败，请稍后重试');
        return;
      }
      if (json.warning) {
        setNotice(json.warning);
      }

      const nextArticle: KnowledgeArticle = {
        id: `art-${Date.now()}`,
        title: finalTitle,
        fileName: fileNameInput || undefined,
        sourceUrl: sourceUrlInput.trim() || undefined,
        rawText: rawTextInput.trim(),
        summary: json.data.summary,
        takeaways: json.data.takeaways,
        unifiedAngle: json.data.unifiedAngle,
        roleNuance: json.data.roleNuance,
        practicalUse: json.data.practicalUse,
        roleAngles: json.data.roleAngles,
        tags: json.data.tags,
        createdAt: new Date().toISOString(),
      };
      upsertKnowledgeArticle(nextArticle);
      setTitleInput('');
      setSourceUrlInput('');
      setFileNameInput('');
      setRawTextInput('');
    } finally {
      setAnalyzing(false);
    }
  };

  const syncToSnippets = (article: KnowledgeArticle) => {
    const snippetId = article.syncedSnippetId || `snip-ocean-${article.id}`;
    const mainSoundbite =
      article.practicalUse?.spokenAnswer ||
      article.unifiedAngle ||
      article.roleAngles?.aiPm ||
      article.summary;
    const triggerQuestion =
      article.practicalUse?.interviewQuestions?.[0] ||
      `How would you apply "${article.title}" to enterprise AI product delivery?`;
    const snippet: KnowledgeSnippet = {
      id: snippetId,
      title: article.title,
      soundbite: mainSoundbite,
      triggerQuestion,
      deliveryTemplate: [
        `核心 Takeaways：\n${article.takeaways.map((t, i) => `${i + 1}. ${t}`).join('\n')}`,
        article.roleNuance ? `\n[FDE vs FDPM 差异]\n${article.roleNuance}` : '',
        article.practicalUse?.pitfalls?.length
          ? `\n[注意风险]\n${article.practicalUse.pitfalls.map((p) => `- ${p}`).join('\n')}`
          : '',
        article.practicalUse?.deepFollowUps?.length
          ? `\n[深度 Follow-up]\n${article.practicalUse.deepFollowUps.map((f) => `- ${f}`).join('\n')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
      roles: ['fdpm', 'ai-pm', 'fde'],
      tags: article.tags.length > 0 ? article.tags : ['Knowledge Ocean'],
      updatedAt: new Date().toISOString(),
    };
    upsertKnowledgeSnippet(snippet);
    upsertKnowledgeArticle({
      ...article,
      syncedSnippetId: snippetId,
    });
  };

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1600);
    } catch {
      // Ignore clipboard failure
    }
  };

  const speakText = (key: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (speakingKey === key) {
      window.speechSynthesis.cancel();
      setSpeakingKey(null);
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.95;
    u.onend = () => setSpeakingKey(null);
    u.onerror = () => setSpeakingKey(null);
    setSpeakingKey(key);
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="space-y-6">
      {/* Upload & Analyze Studio */}
      <form
        onSubmit={handleAnalyzeArticle}
        className="rounded-2xl border border-[#ECECF2] bg-[#FAFAFC] p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[#111118]">
              Knowledge Ocean · 好文章 PDF 上传与面试洞察提炼
            </h2>
            <p className="text-xs text-[#848494]">
              把平时读到的好文章存成 PDF 上传到这里，一键提炼核心 Takeaways + FDPM / AI PM / FDE 面试口语套用，并可同步到「知识摘录」。
            </p>
          </div>
          {!rawTextInput.trim() && (
            <button
              type="button"
              onClick={loadSampleArticle}
              className="rounded-xl border border-[#ECECF2] bg-white px-3 py-1.5 text-xs font-medium text-[#5E5E6E] transition hover:border-[#6E32F5]/40 hover:text-[#6E32F5]"
            >
              加载示例深度文章
            </button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="文章标题（上传 PDF 后会自动填充文件名）"
            className="rounded-xl border border-[#ECECF2] bg-white px-3.5 py-2 text-xs text-[#111118] focus:border-[#6E32F5] focus:outline-none"
          />
          <input
            type="url"
            value={sourceUrlInput}
            onChange={(e) => setSourceUrlInput(e.target.value)}
            placeholder="原文链接（可选，方便回溯）"
            className="rounded-xl border border-[#ECECF2] bg-white px-3.5 py-2 text-xs text-[#111118] focus:border-[#6E32F5] focus:outline-none"
          />
        </div>

        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#D4C5FD] bg-[#F9F6FF] p-3.5 text-xs font-semibold text-[#6E32F5] transition hover:bg-[#F3ECFF]">
          {parsingFile ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              正在解析文章 PDF / 文档正文...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              {fileNameInput
                ? `已导入文档: ${fileNameInput}`
                : '点击上传文章 PDF / Word / TXT (自动提取正文)'}
            </>
          )}
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        {notice && <p className="text-xs text-amber-600">{notice}</p>}

        <textarea
          rows={5}
          value={rawTextInput}
          onChange={(e) => setRawTextInput(e.target.value)}
          placeholder="上传 PDF 后会自动提取正文到这里；你也可以直接粘贴文章核心段落或全文..."
          className="w-full rounded-xl border border-[#ECECF2] bg-white p-3 text-xs leading-relaxed text-[#111118] focus:border-[#6E32F5] focus:outline-none"
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-[#848494]">
            {rawTextInput.trim()
              ? `已加载约 ${rawTextInput.trim().length} 字符`
              : '支持 PDF、DOC、DOCX、TXT、MD 或直接粘贴'}
          </span>
          <button
            type="submit"
            disabled={analyzing || !rawTextInput.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#5B24D6] disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                正在提炼 Takeaways &amp; 面试套用...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                一键分析 Takeaways &amp; 面试套用
              </>
            )}
          </button>
        </div>
      </form>

      {/* Analyzed Articles List */}
      {articles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#ECECF2] p-10 text-center text-xs text-[#848494]">
          知识海洋还是空的 — 上传一篇好文章 PDF，立即提炼核心 Takeaways 和 FDPM / AI PM / FDE 面试套用话术。
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => {
            const isSynced = Boolean(
              article.syncedSnippetId &&
                state.knowledgeSnippets.some((s) => s.id === article.syncedSnippetId)
            );
            const showRaw = Boolean(expandedRaw[article.id]);
            return (
              <article
                key={article.id}
                className="rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-2xs transition hover:border-[#6E32F5]/30"
              >
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {article.fileName && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#F7F7FA] px-2 py-0.5 text-[10px] font-medium text-[#5E5E6E]">
                          <FileText className="h-3 w-3 text-[#6E32F5]" />
                          {article.fileName}
                        </span>
                      )}
                      {article.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-[#F3ECFF] px-2 py-0.5 text-[10px] font-semibold text-[#6E32F5]"
                        >
                          {tag}
                        </span>
                      ))}
                      {article.sourceUrl && (
                        <a
                          href={article.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-[#848494] hover:text-[#6E32F5]"
                        >
                          <Globe className="h-3 w-3" />
                          原文
                        </a>
                      )}
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-[#111118]">
                      {article.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#5E5E6E]">
                      {article.summary}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => syncToSnippets(article)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                        isSynced
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'bg-[#6E32F5] text-white hover:bg-[#5B24D6]'
                      }`}
                    >
                      {isSynced ? (
                        <>
                          <BookmarkCheck className="h-3.5 w-3.5" />
                          已同步到知识摘录
                        </>
                      ) : (
                        <>
                          <ArrowRight className="h-3.5 w-3.5" />
                          一键同步到知识摘录
                        </>
                      )}
                    </button>
                    {isSynced && onJumpToSnippets && (
                      <button
                        type="button"
                        onClick={onJumpToSnippets}
                        className="rounded-xl border border-[#ECECF2] px-2.5 py-1.5 text-[11px] font-medium text-[#5E5E6E] hover:text-[#6E32F5]"
                      >
                        去查看 →
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteKnowledgeArticle(article.id)}
                      className="rounded-lg p-1.5 text-[#848494] hover:bg-rose-50 hover:text-rose-600"
                      title="删除文章"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Takeaways */}
                <div className="mt-4 rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-3.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6E32F5]">
                    Core Takeaways
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {article.takeaways.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-xs leading-relaxed text-[#111118]"
                      >
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#F3ECFF] text-[10px] font-bold text-[#6E32F5]">
                          {idx + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Unified Interview Synthesis + FDE/FDPM Nuance */}
                {(article.unifiedAngle || article.roleAngles) && (
                  <div className="mt-4 rounded-xl border border-[#D4C5FD]/60 bg-[#F9F6FF] p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6E32F5]">
                        面试统一洞察 (FDE / FDPM / AI PM 通用)
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            speakText(
                              `${article.id}-unified`,
                              article.unifiedAngle || article.roleAngles?.aiPm || ''
                            )
                          }
                          className="rounded-md p-1 text-[#6E32F5] hover:bg-white"
                          title="朗读洞察"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void copyText(
                              `${article.id}-unified`,
                              article.unifiedAngle || article.roleAngles?.aiPm || ''
                            )
                          }
                          className="rounded-md p-1 text-[#6E32F5] hover:bg-white"
                          title="复制洞察"
                        >
                          {copiedKey === `${article.id}-unified` ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#111118]">
                      &ldquo;{article.unifiedAngle || article.roleAngles?.aiPm}&rdquo;
                    </p>
                    {article.roleNuance && (
                      <p className="mt-2 rounded-lg bg-white/80 px-3 py-2 text-[11px] leading-relaxed text-[#5E5E6E]">
                        💡 {article.roleNuance}
                      </p>
                    )}
                  </div>
                )}

                {/* Practical Use Playbook (真实实用) */}
                {article.practicalUse && (
                  <div className="mt-4 rounded-xl border border-[#ECECF2] bg-white p-4 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#111118]">
                        真实实用 · 面试实战手册 (Practical Playbook)
                      </span>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {/* Scenarios & Interview Questions */}
                      <div className="rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-3 space-y-2.5">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6E32F5]">
                            可能用到的场景
                          </div>
                          <ul className="mt-1.5 space-y-1">
                            {article.practicalUse.scenarios.map((sc, i) => (
                              <li key={i} className="text-[11px] leading-relaxed text-[#111118]">
                                • {sc}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="border-t border-[#ECECF2] pt-2">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#848494]">
                            高频面试提问
                          </div>
                          <ul className="mt-1 space-y-1">
                            {article.practicalUse.interviewQuestions.map((q, i) => (
                              <li
                                key={i}
                                className="text-[11px] italic leading-relaxed text-[#5E5E6E]"
                              >
                                {q}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Spoken Direct Answer */}
                      <div className="flex flex-col justify-between rounded-xl border border-[#D4C5FD]/60 bg-[#F9F6FF]/60 p-3">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6E32F5]">
                              口语化直接回答 (Ready-to-Speak)
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  speakText(
                                    `${article.id}-spoken`,
                                    article.practicalUse?.spokenAnswer ?? ''
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-[#6E32F5] hover:bg-[#F3ECFF]"
                              >
                                <Volume2 className="h-3 w-3" />
                                朗读
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void copyText(
                                    `${article.id}-spoken`,
                                    article.practicalUse?.spokenAnswer ?? ''
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-[#5E5E6E] hover:text-[#111118]"
                              >
                                {copiedKey === `${article.id}-spoken` ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                                复制
                              </button>
                            </div>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-[#111118]">
                            &ldquo;{article.practicalUse.spokenAnswer}&rdquo;
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Risks & Deep Follow-ups */}
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                          注意的风险与避坑
                        </div>
                        <ul className="mt-1.5 space-y-1">
                          {article.practicalUse.pitfalls.map((pit, i) => (
                            <li key={i} className="text-[11px] leading-relaxed text-[#111118]">
                              ⚠ {pit}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6E32F5]">
                          深度 Follow-up 与话题拓展
                        </div>
                        <ul className="mt-1.5 space-y-1">
                          {article.practicalUse.deepFollowUps.map((fu, i) => (
                            <li key={i} className="text-[11px] leading-relaxed text-[#111118]">
                              → {fu}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Collapsible raw text */}
                <div className="mt-3 border-t border-[#ECECF2] pt-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedRaw((prev) => ({
                        ...prev,
                        [article.id]: !prev[article.id],
                      }))
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#848494] hover:text-[#111118]"
                  >
                    {showRaw ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" />
                        收起原文
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" />
                        展开文章原文
                      </>
                    )}
                  </button>
                  {showRaw && (
                    <p className="mt-2 max-h-48 overflow-y-auto rounded-xl bg-[#FAFAFC] p-3 text-[11px] leading-relaxed whitespace-pre-wrap text-[#5E5E6E]">
                      {article.rawText}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
