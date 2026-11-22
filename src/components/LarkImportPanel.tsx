'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  CloudDownload,
  FileSpreadsheet,
  FileText,
  KeyRound,
  Layers,
  Loader2,
  Sparkles,
  Video,
} from 'lucide-react';
import { useApp } from './AppProvider';
import { RoleMultiSelect } from './RoleMultiSelect';
import {
  convertParsedItemsForCommit,
  parseCsvToItems,
  ParsedImportItem,
  parseLarkMarkdownToItems,
  parseRawPagesToItems,
  RawFetchedPage,
  SplitMode,
} from '@/lib/lark-parser';
import { ROLE_LIST, ROUND_LABELS } from '@/lib/roles';
import { SAMPLE_LARK_CSV_TEXT, SAMPLE_LARK_DOC_TEXT } from '@/lib/seed-library';
import { RoleTrack, RoundType } from '@/lib/types';

export function LarkImportPanel({
  onSwitchToVideos,
}: {
  onSwitchToVideos?: () => void;
}) {
  const { state, updateLarkSettings, bulkImportItems } = useApp();

  const [activeTab, setActiveTab] = useState<'api' | 'paste' | 'file'>('api');
  const [defaultRole, setDefaultRole] = useState<RoleTrack>('fde');
  const [targetMode, setTargetMode] = useState<'auto' | 'questions' | 'library' | 'stories'>('auto');
  const [splitMode, setSplitMode] = useState<SplitMode>('qa');
  const [includeChildren, setIncludeChildren] = useState(true);

  const [larkUrl, setLarkUrl] = useState('');
  const [showCreds, setShowCreds] = useState(true);
  const [fetchingApi, setFetchingApi] = useState(false);

  const [pasteText, setPasteText] = useState('');
  const [pasteTitle, setPasteTitle] = useState('');

  const [rawPages, setRawPages] = useState<RawFetchedPage[]>([]);
  const [showPagesDetail, setShowPagesDetail] = useState(false);
  const [previewItems, setPreviewItems] = useState<ParsedImportItem[]>([]);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [errorMsg, setErrorMsg] = useState<{ error: string; hint?: string } | null>(null);
  const [commitResult, setCommitResult] = useState<{
    questionsCount: number;
    libraryCount: number;
    storiesCount: number;
  } | null>(null);

  const reSplitFromRaw = (
    pages: RawFetchedPage[],
    nextSplit: SplitMode,
    nextRole: RoleTrack = defaultRole,
    nextTarget: typeof targetMode = targetMode
  ) => {
    if (pages.length === 0) return;
    const parsed = parseRawPagesToItems(pages, {
      defaultRole: nextRole,
      targetMode: nextTarget,
      splitMode: nextSplit,
    });
    setPreviewItems(parsed);
    setExpandedIds({});
  };

  const handleApiFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!larkUrl.trim() || fetchingApi) return;
    setFetchingApi(true);
    setErrorMsg(null);
    setCommitResult(null);

    try {
      const res = await fetch('/api/lark/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: larkUrl.trim(),
          domain: state.larkSettings.domain,
          appId: state.larkSettings.appId,
          appSecret: state.larkSettings.appSecret,
          userAccessToken: state.larkSettings.userAccessToken,
          defaultRole,
          targetMode,
          splitMode,
          includeChildren,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        hint?: string;
        rawPages?: RawFetchedPage[];
        items?: ParsedImportItem[];
      };

      if (!data.ok || !data.items) {
        setErrorMsg({
          error: data.error || '导入失败，请检查链接或权限。',
          hint: data.hint,
        });
      } else {
        setRawPages(data.rawPages ?? []);
        setPreviewItems(data.items);
        setExpandedIds({});
        if (data.items.length === 0) {
          setErrorMsg({ error: '文档内容为空，未能解析出条目。' });
        }
      }
    } catch {
      setErrorMsg({
        error: '网络请求失败，请检查本地网络或使用「零配置秒导」粘贴内容。',
      });
    } finally {
      setFetchingApi(false);
    }
  };

  const handleParseText = (raw: string, titleOverride?: string) => {
    setErrorMsg(null);
    setCommitResult(null);
    const trimmed = raw.trim();
    if (!trimmed) return;

    const firstLine = trimmed.split('\n')[0] ?? '';
    const looksLikeCsv =
      firstLine.includes(',') &&
      /(title|question|题目|问题|role|岗位|answer|回答)/i.test(firstLine);

    if (looksLikeCsv) {
      const parsed = parseCsvToItems(trimmed, defaultRole);
      setRawPages([
        {
          title: titleOverride || 'Pasted CSV Table',
          sourceUrl: '',
          objType: 'bitable',
          markdown: '',
          charCount: parsed.length,
          bitableItems: parsed,
        },
      ]);
      setPreviewItems(parsed);
    } else {
      const pages: RawFetchedPage[] = [
        {
          title: titleOverride || pasteTitle.trim() || 'Pasted Lark Document',
          sourceUrl: '',
          objType: 'docx',
          markdown: trimmed,
          charCount: trimmed.length,
        },
      ];
      setRawPages(pages);
      const parsed = parseLarkMarkdownToItems(trimmed, {
        defaultRole,
        targetMode,
        splitMode,
        docTitle: titleOverride || pasteTitle.trim() || undefined,
      });
      setPreviewItems(parsed);
      if (parsed.length === 0) {
        setErrorMsg({ error: '未能从输入内容识别到有效条目，请检查文本内容。' });
      }
    }
    setExpandedIds({});
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setCommitResult(null);
    const text = await file.text();
    if (file.name.toLowerCase().endsWith('.csv')) {
      const parsed = parseCsvToItems(text, defaultRole);
      setRawPages([
        {
          title: file.name,
          sourceUrl: '',
          objType: 'bitable',
          markdown: '',
          charCount: parsed.length,
          bitableItems: parsed,
        },
      ]);
      setPreviewItems(parsed);
    } else {
      const pages: RawFetchedPage[] = [
        {
          title: file.name.replace(/\.[^.]+$/, ''),
          sourceUrl: '',
          objType: 'docx',
          markdown: text,
          charCount: text.length,
        },
      ];
      setRawPages(pages);
      const parsed = parseLarkMarkdownToItems(text, {
        defaultRole,
        targetMode,
        splitMode,
        docTitle: file.name.replace(/\.[^.]+$/, ''),
      });
      setPreviewItems(parsed);
    }
    setExpandedIds({});
    e.target.value = '';
  };

  const handleCommitImport = () => {
    const converted = convertParsedItemsForCommit(previewItems);
    const qCount = converted.questions.length;
    const libCount = converted.libraryItems.length;
    const sCount = converted.stories.length;
    if (qCount + libCount + sCount === 0) return;

    bulkImportItems(converted);
    setCommitResult({
      questionsCount: qCount,
      libraryCount: libCount,
      storiesCount: sCount,
    });
    setPreviewItems([]);
    setRawPages([]);
  };

  const selectedCount = previewItems.filter((p) => p.selected).length;
  const totalSyncedChars = rawPages.reduce(
    (sum, p) => sum + (p.objType === 'docx' ? p.charCount : 0),
    0
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-[#111118]">
          Lark / 飞书一键同步 &amp; 批量导入
        </h2>
        <p className="text-xs text-[#525260]">
          支持递归抓取飞书 Wiki 整棵目录树，支持批量多选岗位（如 FDE + PM）和 12 种面试轮次，入库后可直接去题库或「Content &amp; Videos」筛选编辑。
        </p>
      </div>

      {/* Mode Tabs + Defaults */}
      <div className="rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ECECF2] pb-4">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'api', label: '1. Lark / 飞书 API 一键同步', icon: CloudDownload },
              { id: 'paste', label: '2. 零配置秒导（复制粘贴飞书文本/表格）', icon: ClipboardPaste },
              { id: 'file', label: '3. 批量文件导入 (.csv / .md)', icon: FileSpreadsheet },
            ].map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id as typeof activeTab)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    active
                      ? 'bg-[#6E32F5] text-white'
                      : 'bg-[#FAFAFC] text-[#525260] hover:text-[#111118]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={defaultRole}
              onChange={(e) => {
                const nextRole = e.target.value as RoleTrack;
                setDefaultRole(nextRole);
                reSplitFromRaw(rawPages, splitMode, nextRole, targetMode);
              }}
              className="rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs focus:outline-none"
            >
              {ROLE_LIST.map((r) => (
                <option key={r.id} value={r.id}>
                  默认岗位: {r.shortLabel}
                </option>
              ))}
            </select>

            <select
              value={targetMode}
              onChange={(e) => {
                const nextTarget = e.target.value as typeof targetMode;
                setTargetMode(nextTarget);
                reSplitFromRaw(rawPages, splitMode, defaultRole, nextTarget);
              }}
              className="rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs focus:outline-none"
            >
              <option value="auto">智能分流 (题库 / 资料库)</option>
              <option value="questions">全部导入为 Q&amp;A 面试题</option>
              <option value="library">全部导入为课程/视频资料</option>
              <option value="stories">全部导入为 STAR 故事</option>
            </select>
          </div>
        </div>

        {/* TAB 1 */}
        {activeTab === 'api' && (
          <form onSubmit={handleApiFetch} className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className="block text-xs font-medium text-[#525260]">
                  Lark / 飞书版本
                </label>
                <select
                  value={state.larkSettings.domain}
                  onChange={(e) =>
                    updateLarkSettings({ domain: e.target.value as 'larksuite' | 'feishu' })
                  }
                  className="mt-1 w-full rounded-lg border border-[#ECECF2] bg-white px-3 py-2 text-xs focus:outline-none"
                >
                  <option value="larksuite">Lark 国际版 (larksuite.com)</option>
                  <option value="feishu">飞书中国版 (feishu.cn)</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-[#525260]">
                  飞书文档 / Wiki / 多维表格 URL *
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    required
                    value={larkUrl}
                    onChange={(e) => setLarkUrl(e.target.value)}
                    placeholder="https://xxx.larksuite.com/wiki/... 或 /docx/... 或 /base/..."
                    className="flex-1 rounded-lg border border-[#ECECF2] px-3 py-2 text-xs focus:border-[#6E32F5] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={fetchingApi || !larkUrl.trim()}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50"
                  >
                    {fetchingApi ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CloudDownload className="h-3.5 w-3.5" />
                    )}
                    {fetchingApi ? 'Syncing All...' : 'Fetch & Parse'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#ECECF2] bg-[#FAFAFC] px-3.5 py-2.5">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[#111118]">
                <input
                  type="checkbox"
                  checked={includeChildren}
                  onChange={(e) => setIncludeChildren(e.target.checked)}
                  className="rounded"
                />
                <span>同步该 Wiki 下的所有子页面（递归读取整棵子文档目录，最多 40 篇）</span>
              </label>
              <span className="text-[11px] text-[#848494]">
                已保留真实 H1–H4 标题、列表、链接与代码块结构
              </span>
            </div>

            <div className="rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-4">
              <button
                type="button"
                onClick={() => setShowCreds((v) => !v)}
                className="flex w-full items-center justify-between text-xs font-semibold text-[#111118]"
              >
                <span className="flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5 text-[#6E32F5]" />
                  Lark / 飞书自建应用凭证（本地保存在浏览器）
                </span>
                {showCreds ? (
                  <ChevronUp className="h-4 w-4 text-[#848494]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[#848494]" />
                )}
              </button>

              {showCreds && (
                <div className="mt-3 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#525260]">
                        App ID (cli_xxx)
                      </label>
                      <input
                        value={state.larkSettings.appId}
                        onChange={(e) => updateLarkSettings({ appId: e.target.value })}
                        placeholder="cli_a1b2c3..."
                        className="mt-1 w-full rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 font-mono text-xs focus:border-[#6E32F5] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#525260]">
                        App Secret
                      </label>
                      <input
                        type="password"
                        value={state.larkSettings.appSecret}
                        onChange={(e) => updateLarkSettings({ appSecret: e.target.value })}
                        placeholder="••••••••••••"
                        className="mt-1 w-full rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 font-mono text-xs focus:border-[#6E32F5] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#525260]">
                        User Access Token (可选)
                      </label>
                      <input
                        type="password"
                        value={state.larkSettings.userAccessToken}
                        onChange={(e) => updateLarkSettings({ userAccessToken: e.target.value })}
                        placeholder="u-xxx (优先于 App Secret)"
                        className="mt-1 w-full rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 font-mono text-xs focus:border-[#6E32F5] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </form>
        )}

        {/* TAB 2 */}
        {activeTab === 'paste' && (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-[#525260]">
                在飞书文档 / 多维表格里全选复制粘贴进来，自动识别题目、答案与视频链接：
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPasteTitle('飞书真题复盘示例');
                    setPasteText(SAMPLE_LARK_DOC_TEXT);
                    handleParseText(SAMPLE_LARK_DOC_TEXT, '飞书真题复盘示例');
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#ECECF2] bg-[#FAFAFC] px-2.5 py-1 text-[11px] font-medium text-[#6E32F5] hover:border-[#6E32F5]"
                >
                  <Sparkles className="h-3 w-3" />
                  Load Sample Lark Doc
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPasteTitle('Lark Bitable CSV');
                    setPasteText(SAMPLE_LARK_CSV_TEXT);
                    handleParseText(SAMPLE_LARK_CSV_TEXT, 'Lark Bitable CSV');
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#ECECF2] bg-[#FAFAFC] px-2.5 py-1 text-[11px] font-medium text-[#111118] hover:border-[#6E32F5]"
                >
                  Load Sample Bitable CSV
                </button>
              </div>
            </div>

            <input
              value={pasteTitle}
              onChange={(e) => setPasteTitle(e.target.value)}
              placeholder="Optional Document Title..."
              className="w-full rounded-lg border border-[#ECECF2] px-3 py-2 text-xs focus:border-[#6E32F5] focus:outline-none"
            />

            <textarea
              rows={9}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={`支持格式示例：\n## Q: 题目名称\nRole: FDE\nVideo: https://www.youtube.com/watch?v=...\nA: 你的参考答案...`}
              className="w-full rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-3.5 font-mono text-xs leading-relaxed focus:border-[#6E32F5] focus:bg-white focus:outline-none"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleParseText(pasteText)}
                disabled={!pasteText.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Parse &amp; Preview Items
              </button>
            </div>
          </div>
        )}

        {/* TAB 3 */}
        {activeTab === 'file' && (
          <div className="mt-5">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#ECECF2] bg-[#FAFAFC] p-10 text-center transition hover:border-[#6E32F5]">
              <FileSpreadsheet className="h-8 w-8 text-[#6E32F5]" />
              <span className="mt-3 text-sm font-semibold text-[#111118]">
                Drop or Select Exported Lark Bitable (.csv) or Lark Doc (.md / .txt)
              </span>
              <span className="mt-1 text-xs text-[#848494]">
                支持飞书多维表格 CSV 与飞书 Markdown 导出文件
              </span>
              <input
                type="file"
                accept=".csv,.md,.txt,text/csv,text/markdown"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="h-4 w-4" />
            {errorMsg.error}
          </div>
          {errorMsg.hint && <p className="mt-1.5 text-rose-800">{errorMsg.hint}</p>}
        </div>
      )}

      {commitResult && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-950">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            成功导入：
            {commitResult.questionsCount > 0 && `${commitResult.questionsCount} 道面试题 `}
            {commitResult.libraryCount > 0 && `${commitResult.libraryCount} 份课程/视频资料 `}
            {commitResult.storiesCount > 0 && `${commitResult.storiesCount} 个 STAR 故事`}
          </div>
          <div className="flex items-center gap-2">
            {commitResult.questionsCount > 0 && (
              <Link
                href="/questions"
                className="rounded-lg bg-white px-3 py-1.5 font-semibold text-emerald-800 ring-1 ring-emerald-200"
              >
                查看题库 →
              </Link>
            )}
            {commitResult.libraryCount > 0 && onSwitchToVideos && (
              <button
                type="button"
                onClick={onSwitchToVideos}
                className="rounded-lg bg-white px-3 py-1.5 font-semibold text-emerald-800 ring-1 ring-emerald-200"
              >
                查看 Content &amp; Videos →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Telemetry & Live Split Mode */}
      {rawPages.length > 0 && (
        <section className="rounded-2xl border border-[#ECECF2] bg-white p-4 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800">
                <Layers className="h-3.5 w-3.5" />
                已完整拉取 {rawPages.length} 个飞书页面
                {totalSyncedChars > 0 ? ` · 共 ${totalSyncedChars.toLocaleString()} 字` : ''}
                {` → 解析出 ${previewItems.length} 条`}
              </span>
              <button
                type="button"
                onClick={() => setShowPagesDetail((v) => !v)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#ECECF2] px-2.5 py-1 text-[11px] font-medium text-[#525260]"
              >
                {showPagesDetail ? '收起页面明细' : '查看所有已拉取页面明细'}
                {showPagesDetail ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-[#848494]">实时拆分方式:</span>
              {(
                [
                  { id: 'qa', label: '智能问答拆分 (Auto Q&A)' },
                  { id: 'headings', label: '仅按标题拆分 (Headings)' },
                  { id: 'page', label: '整篇完整保留 (1 Page = 1 Doc)' },
                ] as { id: SplitMode; label: string }[]
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    setSplitMode(mode.id);
                    reSplitFromRaw(rawPages, mode.id);
                  }}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                    splitMode === mode.id
                      ? 'border-[#6E32F5] bg-[#6E32F5] text-white'
                      : 'border-[#ECECF2] bg-[#FAFAFC] text-[#525260]'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {showPagesDetail && (
            <div className="mt-3 grid gap-2 border-t border-[#ECECF2] pt-3 sm:grid-cols-2 lg:grid-cols-3">
              {rawPages.map((pg, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[#ECECF2] bg-[#FAFAFC] px-3 py-2 text-xs"
                >
                  <span className="flex min-w-0 items-center gap-1.5 font-medium text-[#111118]">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-[#6E32F5]" />
                    <span className="truncate">{pg.title}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-[#848494]">
                    {pg.objType === 'bitable' ? `${pg.charCount} rows` : `${pg.charCount} chars`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Preview Table with Multi-Select Role Tracks + Round Type */}
      {previewItems.length > 0 && (
        <section className="rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ECECF2] pb-3">
            <div>
              <h2 className="text-sm font-semibold text-[#111118]">
                Preview &amp; Mapping ({selectedCount}/{previewItems.length} selected)
              </h2>
              <p className="text-xs text-[#848494]">
                每条支持多选 Role Track（如同时选 FDE + PM）和指定 Round Type。
              </p>
            </div>

            <button
              type="button"
              onClick={handleCommitImport}
              disabled={selectedCount === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-95 disabled:opacity-40"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Import Selected ({selectedCount}) into LoopOS
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-2.5 text-[11px]">
            <button
              type="button"
              onClick={() =>
                setPreviewItems((prev) => prev.map((p) => ({ ...p, selected: true })))
              }
              className="rounded-md border border-[#ECECF2] bg-white px-2.5 py-1 font-medium text-[#111118]"
            >
              全选
            </button>
            <button
              type="button"
              onClick={() =>
                setPreviewItems((prev) => prev.map((p) => ({ ...p, selected: false })))
              }
              className="rounded-md border border-[#ECECF2] bg-white px-2.5 py-1 font-medium text-[#525260]"
            >
              全不选
            </button>
            <button
              type="button"
              onClick={() =>
                setPreviewItems((prev) =>
                  prev.map((p) => ({ ...p, destination: 'question' }))
                )
              }
              className="rounded-md border border-[#ECECF2] bg-white px-2.5 py-1 font-medium text-[#6E32F5]"
            >
              全部设为 → Q&amp;A 题库
            </button>
            <button
              type="button"
              onClick={() =>
                setPreviewItems((prev) =>
                  prev.map((p) => ({ ...p, destination: 'library' }))
                )
              }
              className="rounded-md border border-[#ECECF2] bg-white px-2.5 py-1 font-medium text-[#111118]"
            >
              全部设为 → Content &amp; Videos
            </button>

            <select
              defaultValue=""
              onChange={(e) => {
                if (!e.target.value) return;
                const r = e.target.value as RoleTrack;
                setPreviewItems((prev) =>
                  prev.map((p) => ({ ...p, role: r, roles: [r] }))
                );
              }}
              className="ml-auto rounded-md border border-[#ECECF2] bg-white px-2 py-1 font-medium text-[#111118]"
            >
              <option value="">批量修改岗位...</option>
              {ROLE_LIST.map((r) => (
                <option key={r.id} value={r.id}>
                  全部设为 {r.shortLabel}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 space-y-3">
            {previewItems.map((item, idx) => {
              const isExpanded = Boolean(expandedIds[item.id]);
              const itemRoles = item.roles && item.roles.length > 0 ? item.roles : [item.role];
              return (
                <div
                  key={item.id}
                  className={`space-y-2.5 rounded-xl border p-4 transition ${
                    item.selected
                      ? 'border-[#ECECF2] bg-[#FAFAFC]'
                      : 'border-[#ECECF2] bg-white opacity-55'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(e) =>
                        setPreviewItems((prev) =>
                          prev.map((p, i) =>
                            i === idx ? { ...p, selected: e.target.checked } : p
                          )
                        )
                      }
                      className="rounded"
                    />

                    <input
                      value={item.title}
                      onChange={(e) =>
                        setPreviewItems((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, title: e.target.value } : p))
                        )
                      }
                      className="min-w-[200px] flex-1 rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1 text-xs font-semibold text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                    />

                    <select
                      value={item.round}
                      onChange={(e) =>
                        setPreviewItems((prev) =>
                          prev.map((p, i) =>
                            i === idx ? { ...p, round: e.target.value as RoundType } : p
                          )
                        )
                      }
                      className="rounded-lg border border-[#ECECF2] bg-white px-2 py-1 text-xs"
                    >
                      {Object.entries(ROUND_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.en}
                        </option>
                      ))}
                    </select>

                    <select
                      value={item.destination}
                      onChange={(e) =>
                        setPreviewItems((prev) =>
                          prev.map((p, i) =>
                            i === idx
                              ? {
                                  ...p,
                                  destination: e.target.value as ParsedImportItem['destination'],
                                }
                              : p
                          )
                        )
                      }
                      className="rounded-lg border border-[#ECECF2] bg-white px-2 py-1 text-xs font-medium text-[#6E32F5]"
                    >
                      <option value="question">→ Question &amp; Answer Bank</option>
                      <option value="library">→ Content &amp; Videos</option>
                      <option value="story">→ STAR+L Story Bank</option>
                    </select>

                    {item.videoUrl && (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                        <Video className="h-3 w-3" />
                        Video Detected
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedIds((prev) => ({
                          ...prev,
                          [item.id]: !prev[item.id],
                        }))
                      }
                      className="rounded-md border border-[#ECECF2] bg-white px-2 py-1 text-[10px] font-medium text-[#525260]"
                    >
                      {isExpanded ? '收起全文' : '展开全文'}
                    </button>
                  </div>

                  {/* Multi-select roles per row */}
                  <div className="pl-6">
                    <RoleMultiSelect
                      compact
                      selected={itemRoles}
                      onChange={(nextRoles) =>
                        setPreviewItems((prev) =>
                          prev.map((p, i) =>
                            i === idx
                              ? { ...p, role: nextRoles[0], roles: nextRoles }
                              : p
                          )
                        )
                      }
                    />
                  </div>

                  {item.answer && (
                    <div
                      className={`pl-6 text-xs leading-relaxed text-[#525260] ${
                        isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'
                      }`}
                    >
                      <strong>Answer/Body:</strong> {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
