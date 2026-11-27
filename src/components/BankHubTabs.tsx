'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, FileUp, Layers, Video } from 'lucide-react';

export type BankHubTab = 'questions' | 'stories' | 'videos' | 'import';

interface BankHubTabsProps {
  active: BankHubTab;
  questionCount: number;
  storyCount: number;
  libraryCount: number;
  onSelectStoriesTab?: (tab: 'stories' | 'videos' | 'import') => void;
}

export function BankHubTabs({
  active,
  questionCount,
  storyCount,
  libraryCount,
  onSelectStoriesTab,
}: BankHubTabsProps) {
  const pillBase =
    'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition';
  const activeClass = 'bg-[#111118] text-white shadow-xs';
  const idleClass =
    'border border-[#ECECF2] bg-white text-[#525260] hover:border-[#D4C5FD] hover:text-[#111118]';

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[#ECECF2] pb-3">
      {active === 'questions' ? (
        <span className={`${pillBase} ${activeClass}`}>
          <BookOpen className="h-3.5 w-3.5" />
          Questions ({questionCount})
        </span>
      ) : (
        <Link href="/questions" className={`${pillBase} ${idleClass}`}>
          <BookOpen className="h-3.5 w-3.5" />
          Questions ({questionCount})
        </Link>
      )}

      {onSelectStoriesTab ? (
        <>
          <button
            type="button"
            onClick={() => onSelectStoriesTab('stories')}
            className={`${pillBase} ${active === 'stories' ? activeClass : idleClass}`}
          >
            <Layers className="h-3.5 w-3.5" />
            STAR+L Stories ({storyCount})
          </button>
          <button
            type="button"
            onClick={() => onSelectStoriesTab('videos')}
            className={`${pillBase} ${active === 'videos' ? activeClass : idleClass}`}
          >
            <Video className="h-3.5 w-3.5" />
            Videos &amp; Library ({libraryCount})
          </button>
          <button
            type="button"
            onClick={() => onSelectStoriesTab('import')}
            className={`${pillBase} ${active === 'import' ? activeClass : idleClass}`}
          >
            <FileUp className="h-3.5 w-3.5" />
            Lark Import
          </button>
        </>
      ) : (
        <>
          <Link
            href="/stories"
            className={`${pillBase} ${active === 'stories' ? activeClass : idleClass}`}
          >
            <Layers className="h-3.5 w-3.5" />
            STAR+L Stories ({storyCount})
          </Link>
          <Link
            href="/stories?tab=videos"
            className={`${pillBase} ${active === 'videos' ? activeClass : idleClass}`}
          >
            <Video className="h-3.5 w-3.5" />
            Videos &amp; Library ({libraryCount})
          </Link>
          <Link
            href="/stories?tab=import"
            className={`${pillBase} ${active === 'import' ? activeClass : idleClass}`}
          >
            <FileUp className="h-3.5 w-3.5" />
            Lark Import
          </Link>
        </>
      )}
    </div>
  );
}
