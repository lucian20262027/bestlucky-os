'use client';

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ExternalLink,
  FileCode2,
  FolderOpen,
  LayoutGrid,
  LayoutList,
  Palette,
  Rocket,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { extractDocumentText } from '@/lib/doc-parser-client';
import { isAccessibleAccentHex } from '@/lib/html-parser';

export default function DeployedHtmlPagesIndex() {
  const { state, mounted, deployHtmlPage, deleteHtmlPage, syncThemeFromHtml } = useApp();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [statusMsg, setStatusMsg] = useState('');
  const [targetModuleInput, setTargetModuleInput] = useState('Imported Web Guides');
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [draggingOver, setDraggingOver] = useState(false);

  const pages = useMemo(
    () => (mounted ? state.deployedHtmlPages ?? [] : []),
    [mounted, state.deployedHtmlPages]
  );

  const moduleCounts = useMemo(() => {
    const map = new Map<string, number>();
    pages.forEach((p) => {
      const mod = p.moduleTitle?.trim() || 'Imported Web Guides';
      map.set(mod, (map.get(mod) ?? 0) + 1);
    });
    return Array.from(map.entries());
  }, [pages]);

  const filteredPages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return pages.filter((p) => {
      const mod = p.moduleTitle?.trim() || 'Imported Web Guides';
      if (moduleFilter !== 'all' && mod !== moduleFilter) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.fileName.toLowerCase().includes(q) ||
        mod.toLowerCase().includes(q) ||
        p.extractedText.toLowerCase().includes(q)
      );
    });
  }, [pages, searchQuery, moduleFilter]);

  const processHtmlFiles = async (files: File[]) => {
    if (files.length === 0) return;
    const targetMod = targetModuleInput.trim() || 'Imported Web Guides';
    let count = 0;
    let lastTitle = '';

    for (const file of files) {
      const res = await extractDocumentText(file);
      if (res.error || !res.htmlMeta) continue;
      const created = deployHtmlPage({
        title: res.htmlMeta.title,
        moduleTitle: targetMod,
        fileName: file.name,
        rawHtml: res.htmlMeta.rawHtml,
        extractedText: res.htmlMeta.text,
        designTokens: res.htmlMeta.designTokens,
      });
      lastTitle = created.title;
      count++;
    }

    if (count === 0) {
      setStatusMsg('Please upload valid .html or .htm files.');
    } else if (count === 1) {
      setStatusMsg(`Deployed "${lastTitle}" into "${targetMod}".`);
    } else {
      setStatusMsg(`Deployed ${count} HTML pages into "${targetMod}".`);
    }
  };

  const handleUploadHtml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    await processHtmlFiles(files);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDraggingOver(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    await processHtmlFiles(files);
  };

  const handleDelete = (id: string, title: string) => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Delete deployed HTML page "${title}"?`)
    ) {
      return;
    }
    deleteHtmlPage(id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#6E32F5]">
            <FileCode2 className="h-3.5 w-3.5" />
            <span>HTML Pages &amp; Reader Studio</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111118]">
            Deployed HTML Pages
          </h1>
          <p className="mt-1 text-sm text-[#525260]">
            Upload self-contained{' '}
            <code className="rounded bg-[#F4EFFF] px-1.5 py-0.5 font-mono text-xs text-[#5D26D9]">
              .html
            </code>{' '}
            guides, extract structured insights to Knowledge Hub with AI, or sync individual pages to any course track.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {state.syncedTheme && (
            <button
              type="button"
              onClick={() => syncThemeFromHtml(null)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Default Theme
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".html,.htm,text/html"
            multiple
            onChange={handleUploadHtml}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#5B24D6]"
          >
            <Upload className="h-4 w-4" />
            Upload HTML
          </button>
        </div>
      </div>

      {/* Drag & Drop Upload + Target Module Bar */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDraggingOver(true);
        }}
        onDragLeave={() => setDraggingOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col gap-3 rounded-2xl border-2 border-dashed p-4 transition sm:flex-row sm:items-center sm:justify-between ${
          draggingOver
            ? 'border-[#6E32F5] bg-[#F4EFFF]'
            : 'border-[#D4D8E4] bg-[#F8F9FC]'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#6E32F5] ring-1 ring-[#E2E5EE]">
            <Upload className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#111118]">
              Drop <code className="font-mono">.html</code> files here to deploy, or choose target folder
            </div>
            <div className="text-[11px] text-[#667085]">
              Batch upload supported · Clean typography preserved without altering global UI colors
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <FolderOpen className="h-3.5 w-3.5 text-[#667085]" />
            <input
              type="text"
              list="deployed-html-modules"
              value={targetModuleInput}
              onChange={(e) => setTargetModuleInput(e.target.value)}
              placeholder="Target folder / module..."
              className="w-48 rounded-xl border border-[#C5CBD9] bg-white px-3 py-1.5 text-xs font-medium text-[#111118] focus:border-[#6E32F5] focus:outline-none"
            />
            <datalist id="deployed-html-modules">
              <option value="Imported Web Guides" />
              <option value="Product Management Intro" />
              {moduleCounts.map(([m]) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border border-[#CBD0DC] bg-white px-3 py-1.5 text-xs font-semibold text-[#111118] hover:border-[#6E32F5] hover:text-[#6E32F5]"
          >
            Browse Files
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800">
          {statusMsg}
        </div>
      )}

      {/* Search + Module Filter Pills + Grid/List Toggle */}
      {pages.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative min-w-[220px] flex-1 max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#667085]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, filename, module, or page content..."
                className="w-full rounded-xl border border-[#D4D8E4] bg-white py-2 pr-3 pl-9 text-xs text-[#111118] focus:border-[#6E32F5] focus:outline-none"
              />
            </div>

            <div className="inline-flex rounded-xl border border-[#DCE0EA] bg-white p-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  viewMode === 'grid'
                    ? 'bg-[#111118] text-white'
                    : 'text-[#525260] hover:text-[#111118]'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  viewMode === 'list'
                    ? 'bg-[#111118] text-white'
                    : 'text-[#525260] hover:text-[#111118]'
                }`}
              >
                <LayoutList className="h-3.5 w-3.5" />
                List
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setModuleFilter('all')}
              className={`rounded-xl border px-3 py-1 text-xs font-semibold transition ${
                moduleFilter === 'all'
                  ? 'border-[#111118] bg-[#111118] text-white'
                  : 'border-[#E2E5EE] bg-white text-[#525260] hover:text-[#111118]'
              }`}
            >
              All Pages ({pages.length})
            </button>
            {moduleCounts.map(([modName, count]) => (
              <button
                key={modName}
                type="button"
                onClick={() =>
                  setModuleFilter((prev) => (prev === modName ? 'all' : modName))
                }
                className={`rounded-xl border px-3 py-1 text-xs font-semibold transition ${
                  moduleFilter === modName
                    ? 'border-[#111118] bg-[#111118] text-white'
                    : 'border-[#E2E5EE] bg-white text-[#525260] hover:border-[#D4C5FD] hover:text-[#111118]'
                }`}
              >
                {modName} ({count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pages Empty State, Grid, or List */}
      {pages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D4D8E4] bg-white p-12 text-center">
          <Rocket className="mx-auto h-9 w-9 text-[#6E32F5]/75" />
          <h2 className="mt-3 text-base font-semibold text-[#111118]">
            No deployed HTML pages yet
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[#525260]">
            Drop any{' '}
            <code className="rounded bg-[#F5F3FF] px-1.5 py-0.5 font-mono text-[11px] text-[#6E32F5]">
              .html
            </code>{' '}
            study guide above to open it inside the Distraction-Free Studio, annotate or attach videos, and sync directly into courses.
          </p>
        </div>
      ) : filteredPages.length === 0 ? (
        <div className="rounded-2xl border border-[#E6E8F0] bg-white p-10 text-center text-xs text-[#667085]">
          No HTML pages match your current search or module filter.
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPages.map((p) => {
            const isSynced = state.syncedTheme?.sourceTitle === p.title;
            const modName = p.moduleTitle?.trim() || 'Imported Web Guides';
            const usableAccent =
              p.designTokens.accentColor && isAccessibleAccentHex(p.designTokens.accentColor)
                ? p.designTokens.accentColor
                : undefined;

            return (
              <div
                key={p.id}
                className="flex flex-col justify-between rounded-2xl border border-[#E6E8F0] bg-white p-5 shadow-2xs transition hover:border-[#D4C5FD]"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-md bg-[#F3F4F8] px-2 py-0.5 text-[10px] font-semibold text-[#475467]">
                          {modName}
                        </span>
                        {p.courseTrack && (
                          <span className="rounded-md bg-[#F4EFFF] px-2 py-0.5 text-[10px] font-semibold text-[#5D26D9]">
                            {p.courseTrack.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <h3 className="line-clamp-1 text-base font-semibold text-[#111118]">
                        {p.title}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id, p.title)}
                      className="rounded-lg p-1 text-[#667085] hover:bg-rose-50 hover:text-rose-600"
                      title="Delete page"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-1 truncate font-mono text-[11px] text-[#848494]">
                    {p.fileName}
                  </div>
                  <p className="mt-2.5 line-clamp-3 text-xs leading-relaxed text-[#525260]">
                    {p.extractedText || 'Visual HTML guide'}
                  </p>

                  {(p.designTokens.fontFamily || usableAccent) && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.designTokens.fontFamily && (
                        <span className="rounded-md bg-[#F6F7FB] px-2 py-0.5 text-[10px] font-medium text-[#525260]">
                          Font: {p.designTokens.fontFamily.split(',')[0]?.replace(/['"]/g, '')}
                        </span>
                      )}
                      {usableAccent && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#F6F7FB] px-2 py-0.5 text-[10px] font-medium text-[#525260]">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: usableAccent }}
                          />
                          {usableAccent}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-[#F0F1F6] pt-3">
                  <Link
                    href={`/pages/${p.id}`}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#111118] px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                  >
                    Open Studio
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      syncThemeFromHtml(
                        isSynced ? null : { ...p.designTokens, sourceTitle: p.title }
                      )
                    }
                    className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      isSynced
                        ? 'border-amber-300 bg-amber-50 text-amber-800'
                        : 'border-[#DCE0EA] bg-white text-[#475467] hover:border-[#6E32F5] hover:text-[#111118]'
                    }`}
                  >
                    <Palette className="h-3.5 w-3.5" />
                    {isSynced ? 'Synced' : 'Sync Theme'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Compact List View */
        <div className="overflow-hidden rounded-2xl border border-[#E6E8F0] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="border-b border-[#ECEEF4] bg-[#F8F9FC] text-[11px] font-semibold uppercase tracking-wide text-[#667085]">
                <tr>
                  <th className="px-4 py-3">Title &amp; File</th>
                  <th className="px-4 py-3">Folder / Module</th>
                  <th className="px-4 py-3">Course Track</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F2F7]">
                {filteredPages.map((p) => {
                  const isSynced = state.syncedTheme?.sourceTitle === p.title;
                  return (
                    <tr key={p.id} className="hover:bg-[#FAFBFD]">
                      <td className="px-4 py-3">
                        <Link
                          href={`/pages/${p.id}`}
                          className="font-semibold text-[#111118] hover:text-[#6E32F5]"
                        >
                          {p.title}
                        </Link>
                        <div className="font-mono text-[11px] text-[#848494]">
                          {p.fileName}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#475467]">
                        {p.moduleTitle?.trim() || 'Imported Web Guides'}
                      </td>
                      <td className="px-4 py-3">
                        {p.courseTrack ? (
                          <span className="rounded bg-[#F4EFFF] px-2 py-0.5 text-[11px] font-semibold text-[#5D26D9]">
                            {p.courseTrack.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-[#9C9CAE]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/pages/${p.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#111118] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                          >
                            Open
                          </Link>
                          <button
                            type="button"
                            onClick={() =>
                              syncThemeFromHtml(
                                isSynced ? null : { ...p.designTokens, sourceTitle: p.title }
                              )
                            }
                            className="rounded-lg border border-[#DCE0EA] px-2.5 py-1.5 text-xs font-medium text-[#475467] hover:border-[#6E32F5]"
                          >
                            {isSynced ? 'Synced' : 'Theme'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id, p.title)}
                            className="rounded-lg p-1.5 text-[#667085] hover:bg-rose-50 hover:text-rose-600"
                            title="Delete page"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
