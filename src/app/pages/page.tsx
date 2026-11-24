'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import {
  ExternalLink,
  FileCode2,
  Palette,
  Rocket,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { extractDocumentText } from '@/lib/doc-parser-client';

export default function DeployedHtmlPagesIndex() {
  const { state, mounted, deployHtmlPage, deleteHtmlPage, syncThemeFromHtml } = useApp();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [statusMsg, setStatusMsg] = useState('');

  const pages = mounted ? state.deployedHtmlPages ?? [] : [];

  const handleUploadHtml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const res = await extractDocumentText(file);
    if (res.error) {
      setStatusMsg(res.error);
      return;
    }
    if (!res.htmlMeta) {
      setStatusMsg('请上传 .html 或 .htm 文件。');
      return;
    }

    const created = deployHtmlPage({
      title: res.htmlMeta.title,
      fileName: file.name,
      rawHtml: res.htmlMeta.rawHtml,
      extractedText: res.htmlMeta.text,
      designTokens: res.htmlMeta.designTokens,
    });

    if (
      res.htmlMeta.designTokens.fontFamily ||
      res.htmlMeta.designTokens.accentColor ||
      res.htmlMeta.designTokens.googleFontsHref
    ) {
      syncThemeFromHtml({
        ...res.htmlMeta.designTokens,
        sourceTitle: res.htmlMeta.title,
      });
      setStatusMsg(`已部署「${created.title}」并同步其 UI 字体设计！`);
    } else {
      setStatusMsg(`已部署「${created.title}」到本站页面！`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F3ECFF] px-3 py-1 text-[11px] font-semibold text-[#6E32F5]">
            <FileCode2 className="h-3.5 w-3.5" />
            HTML Pages &amp; Design Sync
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#111118]">
            Deployed HTML Pages
          </h1>
          <p className="mt-1 text-sm text-[#525260]">
            全站任意位置上传的 HTML 页面都会汇聚在此，支持原汁原味渲染与 UI/字体一键全站同步。
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
              恢复 BestLucky 默认字体/主题
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".html,.htm,text/html"
            onChange={handleUploadHtml}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#6E32F5] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#5B24D6]"
          >
            <Upload className="h-4 w-4" />
            上传 HTML 并一键部署
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800">
          {statusMsg}
        </div>
      )}

      {pages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D4C5FD] bg-white p-10 text-center">
          <Rocket className="mx-auto h-9 w-9 text-[#6E32F5]/70" />
          <h2 className="mt-3 text-base font-semibold text-[#111118]">
            还没有已部署的 HTML 页面
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-[#525260]">
            你可以在全站任何文档上传按钮（Knowledge Hub、JD Study Plan、Job Pipeline、Lark 导入）上传
            `.html` 文件并点击「一键部署」，或直接点击右上角上传。
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((p) => {
            const isSynced = state.syncedTheme?.sourceTitle === p.title;
            return (
              <div
                key={p.id}
                className="flex flex-col justify-between rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-2xs transition hover:border-[#D4C5FD]"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-1 text-base font-semibold text-[#111118]">
                      {p.title}
                    </h3>
                    <button
                      type="button"
                      onClick={() => deleteHtmlPage(p.id)}
                      className="rounded-lg p-1 text-[#848494] hover:bg-rose-50 hover:text-rose-600"
                      title="删除页面"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-1 text-[11px] text-[#848494]">{p.fileName}</div>
                  <p className="mt-2.5 line-clamp-3 text-xs leading-relaxed text-[#525260]">
                    {p.extractedText || '（纯视觉 HTML 页面）'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.designTokens.fontFamily && (
                      <span className="rounded-md bg-[#F6F5FA] px-2 py-0.5 text-[10px] font-medium text-[#525260]">
                        Font: {p.designTokens.fontFamily.split(',')[0]?.replace(/['"]/g, '')}
                      </span>
                    )}
                    {p.designTokens.accentColor && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#F6F5FA] px-2 py-0.5 text-[10px] font-medium text-[#525260]">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: p.designTokens.accentColor }}
                        />
                        {p.designTokens.accentColor}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-[#F2F2F7] pt-3">
                  <Link
                    href={`/pages/${p.id}`}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#6E32F5] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#5B24D6]"
                  >
                    打开页面
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
                        : 'border-[#ECECF2] bg-white text-[#111118] hover:border-[#6E32F5]'
                    }`}
                  >
                    <Palette className="h-3.5 w-3.5" />
                    {isSynced ? '已同步' : '同步字体/UI'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
