'use client';

import React from 'react';
import { BookMarked } from 'lucide-react';
import KnowledgeHubSection from '@/components/KnowledgeHubSection';

export default function KnowledgeHubPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-[11px] font-semibold text-[#525260]">
          <BookMarked className="h-3.5 w-3.5 text-[#6E32F5]" />
          Knowledge Hub · Vocab · Soundbites · Knowledge Ocean
        </div>
        <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-[#111118]">
          Knowledge Hub
        </h1>
        <p className="mt-1 text-sm text-[#525260]">
          Build pronunciation fluency for hard tech terms, drill interview soundbites, and extract structured insights from articles and PDFs.
        </p>
      </div>

      <section className="rounded-2xl border border-[#E6E8F0] bg-white p-5 shadow-2xs">
        <KnowledgeHubSection />
      </section>
    </div>
  );
}
