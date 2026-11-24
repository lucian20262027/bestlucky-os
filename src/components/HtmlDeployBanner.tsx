'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, ExternalLink, Palette, Rocket, RotateCcw, X } from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import type { HtmlParseResult } from '@/lib/html-parser';

interface HtmlDeployBannerProps {
  htmlMeta: HtmlParseResult | null;
  onDismiss?: () => void;
}

export function HtmlDeployBanner({ htmlMeta, onDismiss }: HtmlDeployBannerProps) {
  const { state, deployHtmlPage, syncThemeFromHtml } = useApp();
  const [deployedId, setDeployedId] = useState<string | null>(null);

  if (!htmlMeta) return null;

  const { title, rawHtml, text, designTokens } = htmlMeta;
  const isThemeSynced =
    Boolean(state.syncedTheme) && state.syncedTheme?.sourceTitle === title;

  const handleDeploy = () => {
    const created = deployHtmlPage({
      title,
      fileName: `${title}.html`,
      rawHtml,
      extractedText: text,
      designTokens,
    });
    setDeployedId(created.id);
  };

  const handleToggleSync = () => {
    if (isThemeSynced) {
      syncThemeFromHtml(null);
    } else {
      syncThemeFromHtml({
        ...designTokens,
        sourceTitle: title,
      });
    }
  };

  return (
    <div
      className="mt-2.5 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-[#D4C5FD] bg-gradient-to-r from-[#F6F1FF] via-white to-[#FFFBEB] px-3.5 py-2.5 text-xs shadow-2xs"
      data-testid="html-deploy-banner"
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <span className="rounded-md bg-[#6E32F5] px-1.5 py-0.5 text-[10px] font-bold text-white">
          HTML 已识别
        </span>
        <span className="truncate font-semibold text-[#111118]">{title}</span>
        {designTokens.fontFamily && (
          <span className="max-w-[180px] truncate rounded-md border border-[#ECECF2] bg-white px-2 py-0.5 text-[10px] text-[#525260]">
            字体: {designTokens.fontFamily.split(',')[0]?.replace(/['"]/g, '')}
          </span>
        )}
        {designTokens.accentColor && (
          <span className="inline-flex items-center gap-1 rounded-md border border-[#ECECF2] bg-white px-2 py-0.5 text-[10px] text-[#525260]">
            <span
              className="h-2.5 w-2.5 rounded-full border border-black/10"
              style={{ backgroundColor: designTokens.accentColor }}
            />
            {designTokens.accentColor}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {deployedId ? (
          <Link
            href={`/pages/${deployedId}`}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-2xs transition hover:bg-emerald-700"
            data-testid="html-open-deployed-link"
          >
            <Check className="h-3.5 w-3.5" />
            已部署 · 打开页面
            <ExternalLink className="h-3 w-3" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleDeploy}
            className="inline-flex items-center gap-1 rounded-lg bg-[#6E32F5] px-3 py-1.5 text-[11px] font-semibold text-white shadow-2xs transition hover:bg-[#5B24D6]"
            data-testid="html-deploy-button"
          >
            <Rocket className="h-3.5 w-3.5" />
            一键部署为本站页面
          </button>
        )}

        <button
          type="button"
          onClick={handleToggleSync}
          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
            isThemeSynced
              ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
              : 'border-[#D4C5FD] bg-white text-[#6E32F5] hover:bg-[#F3ECFF]'
          }`}
          data-testid="html-sync-theme-button"
        >
          {isThemeSynced ? (
            <>
              <RotateCcw className="h-3.5 w-3.5" />
              已同步UI/字体 · 恢复默认
            </>
          ) : (
            <>
              <Palette className="h-3.5 w-3.5" />
              同步 UI 与字体
            </>
          )}
        </button>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg p-1 text-[#848494] hover:bg-black/5 hover:text-[#111118]"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
