'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, BookPlus, Check, Palette, RotateCcw } from 'lucide-react';
import { useApp } from '@/components/AppProvider';

export default function DeployedHtmlPageViewer() {
  const params = useParams<{ id: string }>();
  const { state, mounted, syncThemeFromHtml, upsertKnowledgeArticle } = useApp();
  const [savedToHub, setSavedToHub] = useState(false);

  const page = useMemo(() => {
    const pages = state.deployedHtmlPages ?? [];
    return pages.find((p) => p.id === params.id) ?? null;
  }, [params.id, state.deployedHtmlPages]);

  if (!mounted) {
    return (
      <div className="rounded-2xl border border-[#ECECF2] bg-white p-8 text-sm text-[#848494]">
        Loading deployed HTML page...
      </div>
    );
  }

  if (!page) {
    return (
      <div className="space-y-4 rounded-2xl border border-[#ECECF2] bg-white p-8 text-center">
        <h1 className="text-lg font-bold text-[#111118]">未找到该 HTML 页面</h1>
        <p className="text-xs text-[#525260]">可能已被删除或尚未部署。</p>
        <Link
          href="/pages"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回已部署页面列表
        </Link>
      </div>
    );
  }

  const isThemeSynced = state.syncedTheme?.sourceTitle === page.title;

  const handleSaveToKnowledge = () => {
    upsertKnowledgeArticle({
      id: `art-html-${Date.now()}`,
      title: page.title,
      fileName: page.fileName,
      rawText: page.extractedText || page.rawHtml,
      summary: page.extractedText.slice(0, 260) || page.title,
      takeaways: [
        page.designTokens.fontFamily
          ? `Font: ${page.designTokens.fontFamily}`
          : 'Imported from HTML page',
      ],
      tags: ['HTML Page'],
      createdAt: new Date().toISOString(),
    });
    setSavedToHub(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ECECF2] bg-white px-4 py-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/pages"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#ECECF2] bg-[#FAFAFC] px-3 py-1.5 text-xs font-semibold text-[#111118] transition hover:border-[#6E32F5]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            HTML 页面库
          </Link>
          <div>
            <h1 className="text-sm font-bold text-[#111118]">{page.title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#848494]">
              <span>{page.fileName}</span>
              {page.designTokens.fontFamily && (
                <span>
                  · 字体: {page.designTokens.fontFamily.split(',')[0]?.replace(/['"]/g, '')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSaveToKnowledge}
            disabled={savedToHub}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#ECECF2] bg-white px-3 py-1.5 text-xs font-semibold text-[#111118] transition hover:border-[#6E32F5] disabled:opacity-60"
          >
            {savedToHub ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                已存入 Knowledge Hub
              </>
            ) : (
              <>
                <BookPlus className="h-3.5 w-3.5 text-[#6E32F5]" />
                正文存入 Knowledge Hub
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              syncThemeFromHtml(
                isThemeSynced ? null : { ...page.designTokens, sourceTitle: page.title }
              )
            }
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
              isThemeSynced
                ? 'border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                : 'bg-[#6E32F5] text-white hover:bg-[#5B24D6]'
            }`}
          >
            {isThemeSynced ? (
              <>
                <RotateCcw className="h-3.5 w-3.5" />
                已同步 UI/字体 · 恢复默认
              </>
            ) : (
              <>
                <Palette className="h-3.5 w-3.5" />
                同步此页面 UI 与字体到全站
              </>
            )}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#ECECF2] bg-white shadow-sm">
        <iframe
          title={page.title}
          srcDoc={page.rawHtml}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          className="min-h-[78vh] w-full border-0 bg-white"
        />
      </div>
    </div>
  );
}
