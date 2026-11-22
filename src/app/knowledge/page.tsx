'use client';

import React from 'react';
import { BookMarked } from 'lucide-react';
import KnowledgeHubSection from '@/components/KnowledgeHubSection';

export default function KnowledgeHubPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white px-3 py-1 text-[11px] font-medium text-[var(--ink-secondary)]">
          <BookMarked className="h-3.5 w-3.5 text-[var(--accent)]" />
          Knowledge Hub · 单词本 & 知识摘录
        </div>
        <h1 className="mt-2.5 text-2xl font-semibold tracking-tight text-[var(--ink-primary)]">
          Knowledge Hub
        </h1>
        <p className="mt-1 text-sm text-[var(--ink-secondary)]">
          集中沉淀面试高频难发音术语（支持一键分析与语音朗读）以及日常积累的 AI / 架构金句摘录。
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-2xs">
        <KnowledgeHubSection />
      </section>
    </div>
  );
}
