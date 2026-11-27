'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BookPlus,
  Check,
  Edit3,
  Film,
  FolderOpen,
  Loader2,
  Palette,
  PanelLeft,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { extractDocumentText } from '@/lib/doc-parser-client';
import {
  cleanHtmlForReader,
  extractReadableTextFromHtml,
  toYouTubeEmbedUrl,
} from '@/lib/html-parser';
import { getHtmlSnapshot, saveHtmlSnapshot } from '@/lib/html-snapshot-db';
import { getLocalMediaBlob, saveLocalMedia } from '@/lib/media-db';
import { ROLE_LIST } from '@/lib/roles';
import type { CourseTrackId, DeployedHtmlPage, KnowledgeArticle } from '@/lib/types';

export default function DeployedHtmlPageViewer() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    state,
    mounted,
    deployHtmlPage,
    updateHtmlPage,
    importHtmlPageToCourse,
    syncAllHtmlPagesToCourse,
    syncThemeFromHtml,
    upsertKnowledgeArticle,
  } = useApp();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [cleanMode, setCleanMode] = useState(true);
  const [editArticleMode, setEditArticleMode] = useState(false);
  const [editingMetaInSidebar, setEditingMetaInSidebar] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const [extractingInsights, setExtractingInsights] = useState(false);
  const [extractedPreview, setExtractedPreview] = useState<KnowledgeArticle | null>(null);
  const [showVideoStage, setShowVideoStage] = useState(false);
  const [ytInput, setYtInput] = useState('');
  const [videoNotice, setVideoNotice] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [localObjectUrl, setLocalObjectUrl] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<CourseTrackId>('pm');
  const [syncedTrackNotice, setSyncedTrackNotice] = useState<CourseTrackId | null>(null);

  const [titleDraft, setTitleDraft] = useState('');
  const [moduleDraft, setModuleDraft] = useState('');
  const [fullSnapshotHtml, setFullSnapshotHtml] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const batchHtmlInputRef = useRef<HTMLInputElement | null>(null);

  const allPages = useMemo(() => state.deployedHtmlPages ?? [], [state.deployedHtmlPages]);

  const pageIndex = useMemo(
    () => allPages.findIndex((p) => p.id === params.id),
    [allPages, params.id]
  );
  const page = pageIndex >= 0 ? allPages[pageIndex] : null;
  const prevPage = pageIndex > 0 ? allPages[pageIndex - 1] : null;
  const nextPage =
    pageIndex >= 0 && pageIndex < allPages.length - 1 ? allPages[pageIndex + 1] : null;

  useEffect(() => {
    setExtractedPreview(null);
    setEditArticleMode(false);
    setEditingMetaInSidebar(false);
    setSyncedTrackNotice(null);
  }, [params.id]);

  useEffect(() => {
    if (!page?.id) {
      setFullSnapshotHtml(null);
      return;
    }
    let cancelled = false;
    void getHtmlSnapshot(page.id).then(async (snap) => {
      if (cancelled) return;
      if (snap) {
        setFullSnapshotHtml(snap);
        return;
      }
      if (page.htmlCloudUrl) {
        try {
          const res = await fetch(page.htmlCloudUrl);
          if (res.ok) {
            const remoteHtml = await res.text();
            if (!cancelled && remoteHtml) {
              setFullSnapshotHtml(remoteHtml);
              void saveHtmlSnapshot(page.id, remoteHtml);
            }
          }
        } catch {
          // keep fallback rawHtml
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [page?.id, page?.htmlCloudUrl]);

  const effectiveRawHtml =
    fullSnapshotHtml && fullSnapshotHtml.length > (page?.rawHtml.length ?? 0)
      ? fullSnapshotHtml
      : page?.rawHtml ?? '';

  const cleanedReader = useMemo(() => {
    if (!page) return { cleanHtml: '', strippedShell: false, headings: [] };
    return cleanHtmlForReader(effectiveRawHtml, { editable: editArticleMode });
  }, [page, effectiveRawHtml, editArticleMode]);

  const groupedDirectory = useMemo(() => {
    const map = new Map<string, DeployedHtmlPage[]>();
    allPages.forEach((p) => {
      const mod = p.moduleTitle?.trim() || 'Imported Web Guides';
      const arr = map.get(mod) ?? [];
      arr.push(p);
      map.set(mod, arr);
    });
    return Array.from(map.entries());
  }, [allPages]);

  useEffect(() => {
    if (!page) return;
    setTitleDraft(page.title);
    setModuleDraft(page.moduleTitle || 'Imported Web Guides');
    if (page.courseTrack) {
      setSelectedTrack(page.courseTrack);
    }
    if (page.videoUrl || page.localMediaId) {
      setShowVideoStage(true);
    }
  }, [page]);

  useEffect(() => {
    if (!page?.localMediaId) {
      setLocalObjectUrl(null);
      return;
    }
    let revoked = false;
    let url: string | null = null;
    void getLocalMediaBlob(page.localMediaId).then((blob) => {
      if (!blob || revoked) return;
      url = URL.createObjectURL(blob);
      setLocalObjectUrl(url);
    });
    return () => {
      revoked = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [page?.localMediaId]);

  if (!mounted) {
    return (
      <div className="rounded-2xl border border-[#ECECF2] bg-white p-8 text-sm text-[#848494]">
        Loading HTML Studio...
      </div>
    );
  }

  if (!page) {
    return (
      <div className="space-y-4 rounded-2xl border border-[#ECECF2] bg-white p-8 text-center">
        <h1 className="text-lg font-bold text-[#111118]">HTML Page Not Found</h1>
        <p className="text-xs text-[#525260]">It may have been deleted or not yet deployed.</p>
        <Link
          href="/pages"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to HTML Pages
        </Link>
      </div>
    );
  }

  const isThemeSynced = state.syncedTheme?.sourceTitle === page.title;
  const youtubeEmbed = page.videoUrl ? toYouTubeEmbedUrl(page.videoUrl) : null;
  const playableVideoSrc =
    localObjectUrl || (page.videoUrl && !youtubeEmbed ? page.videoUrl : null);
  const hasAnyVideo = Boolean(youtubeEmbed || playableVideoSrc);

  const handleSaveMeta = () => {
    updateHtmlPage(page.id, {
      title: titleDraft.trim() || page.title,
      moduleTitle: moduleDraft.trim() || 'Imported Web Guides',
    });
    setEditingMetaInSidebar(false);
    setSavedNotice('Updated page title & folder');
    window.setTimeout(() => setSavedNotice(''), 2000);
  };

  const handleSaveEditedArticle = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) {
      setEditArticleMode(false);
      return;
    }
    doc.querySelectorAll('[data-bl-editable]').forEach((el) => {
      el.removeAttribute('contenteditable');
      el.removeAttribute('data-bl-editable');
    });
    doc.getElementById('bl-reader-clean-reset')?.remove();
    const updatedHtml = `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
    const extracted = extractReadableTextFromHtml(updatedHtml);
    updateHtmlPage(page.id, {
      rawHtml: updatedHtml,
      extractedText: extracted.text || page.extractedText,
    });
    setFullSnapshotHtml(updatedHtml);
    setEditArticleMode(false);
    setSavedNotice('Saved article edits');
    window.setTimeout(() => setSavedNotice(''), 2500);
  };

  const handleBatchUploadHtml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    let lastCreatedId = '';
    for (const file of files) {
      const res = await extractDocumentText(file);
      if (res.htmlMeta) {
        const created = deployHtmlPage({
          title: res.htmlMeta.title,
          moduleTitle: moduleDraft.trim() || 'Imported Web Guides',
          fileName: file.name,
          rawHtml: res.htmlMeta.rawHtml,
          extractedText: res.htmlMeta.text,
          designTokens: res.htmlMeta.designTokens,
        });
        lastCreatedId = created.id;
      }
    }
    if (lastCreatedId) {
      setSavedNotice(`Imported ${files.length} HTML ${files.length === 1 ? 'page' : 'pages'}`);
      router.push(`/pages/${lastCreatedId}`);
    }
  };

  const handleAiExtractToHub = async () => {
    if (extractingInsights) return;
    setExtractingInsights(true);
    setSavedNotice('');
    try {
      const content = (
        page.extractedText || extractReadableTextFromHtml(effectiveRawHtml).text || page.title
      )
        .trim()
        .slice(0, 12000);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (state.aiSettings.geminiApiKey.trim()) {
        headers['x-gemini-api-key'] = state.aiSettings.geminiApiKey.trim();
      }
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'analyze_article',
          model: state.aiSettings.model,
          language: state.aiSettings.language,
          payload: {
            title: page.title,
            content,
          },
        }),
      });
      const json = (await res.json()) as {
        data?: {
          summary: string;
          takeaways: string[];
          unifiedAngle?: string;
          roleNuance?: string;
          practicalUse?: KnowledgeArticle['practicalUse'];
          roleAngles?: KnowledgeArticle['roleAngles'];
          tags: string[];
        };
      };

      const article: KnowledgeArticle =
        res.ok && json.data
          ? {
              id: `art-html-${page.id}`,
              title: page.title,
              fileName: page.fileName,
              rawText: content,
              summary: json.data.summary,
              takeaways: json.data.takeaways,
              unifiedAngle: json.data.unifiedAngle,
              roleNuance: json.data.roleNuance,
              practicalUse: json.data.practicalUse,
              roleAngles: json.data.roleAngles,
              tags: json.data.tags?.length > 0 ? json.data.tags : ['HTML Page'],
              createdAt: new Date().toISOString(),
            }
          : {
              id: `art-html-${page.id}`,
              title: page.title,
              fileName: page.fileName,
              rawText: content,
              summary: content.slice(0, 260) || page.title,
              takeaways: ['Extracted from deployed HTML guide'],
              tags: ['HTML Page'],
              createdAt: new Date().toISOString(),
            };

      upsertKnowledgeArticle(article);
      setExtractedPreview(article);
      setSavedNotice('Extracted structured insights to Knowledge Hub');
      window.setTimeout(() => setSavedNotice(''), 3000);
    } catch {
      setSavedNotice('AI extraction failed. Please try again.');
    } finally {
      setExtractingInsights(false);
    }
  };

  const handleAttachYoutube = (e: React.FormEvent) => {
    e.preventDefault();
    setVideoNotice('');
    const embed = toYouTubeEmbedUrl(ytInput);
    if (!embed) {
      setVideoNotice('Please enter a valid YouTube URL (youtube.com/watch?v=... or youtu.be/...).');
      return;
    }
    updateHtmlPage(page.id, {
      videoUrl: ytInput.trim(),
      localMediaId: undefined,
      localMediaName: undefined,
    });
    setYtInput('');
    setShowVideoStage(true);
  };

  const handleUploadLocalVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setVideoNotice('');
    setUploadingVideo(true);
    try {
      const saved = await saveLocalMedia(file);
      updateHtmlPage(page.id, {
        localMediaId: saved.id,
        localMediaName: saved.name,
        videoUrl: saved.cloudUrl || undefined,
      });
      setShowVideoStage(true);
    } catch {
      setVideoNotice('Video upload failed. Use MP4, WebM, or MOV.');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleClearVideo = () => {
    updateHtmlPage(page.id, {
      videoUrl: undefined,
      localMediaId: undefined,
      localMediaName: undefined,
    });
  };

  const handleSyncSinglePage = () => {
    importHtmlPageToCourse(page.id, selectedTrack);
    setSyncedTrackNotice(selectedTrack);
    setSavedNotice(`Synced "${page.title}" to ${selectedTrack.toUpperCase()} course`);
    window.setTimeout(() => setSavedNotice(''), 3000);
  };

  const handleSyncAllToCourses = () => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        `Sync all ${allPages.length} deployed HTML pages into the ${selectedTrack.toUpperCase()} course syllabus?`
      )
    ) {
      return;
    }
    syncAllHtmlPagesToCourse(selectedTrack);
    setSyncedTrackNotice(selectedTrack);
    setSavedNotice(`Synced all ${allPages.length} pages to ${selectedTrack.toUpperCase()} course`);
    window.setTimeout(() => setSavedNotice(''), 3000);
  };

  const scrollToHeading = (headingId: string) => {
    const el = iframeRef.current?.contentDocument?.getElementById(headingId);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-3">
      {/* Compact Clean Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#ECECF2] bg-white px-4 py-2.5 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#ECECF2] bg-[#FAFAFC] px-2.5 py-1.5 text-xs font-semibold text-[#111118] transition hover:border-[#6E32F5]"
            title="Toggle directory sidebar"
          >
            <PanelLeft className="h-3.5 w-3.5 text-[#6E32F5]" />
            Directory
          </button>
          <Link
            href="/pages"
            className="inline-flex items-center gap-1 rounded-xl border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#525260] transition hover:border-[#6E32F5] hover:text-[#111118]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All Pages
          </Link>
          {savedNotice && (
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              ✓ {savedNotice}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {editArticleMode ? (
            <button
              type="button"
              onClick={handleSaveEditedArticle}
              data-testid="html-save-edit-button"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700"
            >
              <Save className="h-3.5 w-3.5" />
              Save Article
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setCleanMode(true);
                setEditArticleMode(true);
              }}
              data-testid="html-edit-content-button"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#ECECF2] bg-white px-3 py-1.5 text-xs font-semibold text-[#111118] transition hover:border-[#6E32F5]"
              title="Click text inside the article to edit directly"
            >
              <Edit3 className="h-3.5 w-3.5 text-[#6E32F5]" />
              Edit Article
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowVideoStage((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              showVideoStage || hasAnyVideo
                ? 'border-[#6E32F5]/30 bg-[#F3ECFF] text-[#6E32F5]'
                : 'border-[#ECECF2] bg-white text-[#111118] hover:border-[#6E32F5]'
            }`}
          >
            <Film className="h-3.5 w-3.5" />
            {hasAnyVideo ? 'Video Attached' : 'Attach Video'}
          </button>

          <button
            type="button"
            onClick={() => setCleanMode((v) => !v)}
            data-testid="html-clean-mode-toggle"
            className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${
              cleanMode
                ? 'border-[#ECECF2] bg-[#FAFAFC] text-[#525260]'
                : 'border-amber-300 bg-amber-50 text-amber-800'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {cleanMode ? 'Reader Mode' : 'Original HTML'}
          </button>

          <button
            type="button"
            onClick={() =>
              syncThemeFromHtml(
                isThemeSynced ? null : { ...page.designTokens, sourceTitle: page.title }
              )
            }
            className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${
              isThemeSynced
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : 'border-[#ECECF2] bg-white text-[#525260] hover:border-[#6E32F5]'
            }`}
          >
            {isThemeSynced ? (
              <>
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Theme
              </>
            ) : (
              <>
                <Palette className="h-3.5 w-3.5" />
                Sync Theme
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleAiExtractToHub}
            disabled={extractingInsights}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4C5FD] bg-[#F7F4FF] px-3 py-1.5 text-xs font-semibold text-[#5D26D9] transition hover:bg-[#EFE8FF] disabled:opacity-60"
          >
            {extractingInsights ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Extracting...
              </>
            ) : extractedPreview ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Insights Saved
              </>
            ) : (
              <>
                <BookPlus className="h-3.5 w-3.5" />
                Extract Insights
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dismissible AI Summary Preview Banner after extraction */}
      {extractedPreview && (
        <div className="rounded-2xl border border-[#D4C5FD] bg-[#F8F6FF] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#5D26D9]">
              <Sparkles className="h-4 w-4" />
              AI Takeaways Extracted &amp; Saved to Knowledge Ocean
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/knowledge"
                className="text-xs font-semibold text-[#6E32F5] hover:underline"
              >
                Open in Knowledge Hub →
              </Link>
              <button
                type="button"
                onClick={() => setExtractedPreview(null)}
                className="rounded-lg p-1 text-[#667085] hover:bg-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-[#2E2E3A]">
            {extractedPreview.summary}
          </p>
          {extractedPreview.takeaways.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-[#475467]">
              {extractedPreview.takeaways.slice(0, 4).map((t, idx) => (
                <li key={idx}>• {t}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 3-Column Course & HTML Studio */}
      <div className="flex items-start gap-4">
        {/* Left Column: Directory + Collapsible Rename/Move + Single-Page Course Sync */}
        {sidebarOpen && (
          <aside
            className="sticky top-4 flex w-64 shrink-0 flex-col gap-3 rounded-2xl border border-[#ECECF2] bg-white p-3.5 shadow-2xs"
            data-testid="html-course-sidebar"
          >
            {/* Current Page Title + Collapsible Rename/Move */}
            <div className="rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[10px] font-bold uppercase tracking-wider text-[#848494]">
                    {page.moduleTitle || 'Imported Web Guides'}
                  </div>
                  <div className="truncate text-xs font-semibold text-[#111118]">
                    {page.title}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingMetaInSidebar((v) => !v)}
                  className="shrink-0 rounded-lg border border-[#DCE0EA] bg-white px-2 py-1 text-[10px] font-semibold text-[#475467] hover:border-[#6E32F5] hover:text-[#111118]"
                >
                  {editingMetaInSidebar ? 'Close' : 'Rename'}
                </button>
              </div>

              {editingMetaInSidebar && (
                <div className="mt-2.5 space-y-2 border-t border-[#ECEEF4] pt-2.5">
                  <input
                    type="text"
                    value={moduleDraft}
                    onChange={(e) => setModuleDraft(e.target.value)}
                    onBlur={handleSaveMeta}
                    placeholder="Folder / Module name"
                    data-testid="html-module-input"
                    className="w-full rounded-lg border border-[#D4D8E4] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                  />
                  <input
                    type="text"
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={handleSaveMeta}
                    placeholder="Page title"
                    data-testid="html-title-input"
                    className="w-full rounded-lg border border-[#D4D8E4] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#111118] focus:border-[#6E32F5] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveMeta}
                    className="w-full rounded-lg bg-[#111118] py-1 text-[11px] font-semibold text-white hover:opacity-90"
                  >
                    Save Title &amp; Folder
                  </button>
                </div>
              )}
            </div>

            {/* Batch Upload More HTML Pages */}
            <input
              ref={batchHtmlInputRef}
              type="file"
              accept=".html,.htm,text/html"
              multiple
              onChange={handleBatchUploadHtml}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => batchHtmlInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#D4C5FD] bg-[#F9F6FF] py-2 text-xs font-semibold text-[#5D26D9] transition hover:bg-[#F3ECFF]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add HTML Pages
            </button>

            {/* Grouped Chapter Directory */}
            <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-0.5">
              {groupedDirectory.map(([modName, items]) => (
                <div key={modName} className="space-y-1">
                  <div className="flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-[#848494]">
                    <FolderOpen className="h-3 w-3 text-[#6E32F5]" />
                    <span className="truncate">{modName}</span>
                  </div>
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const active = item.id === page.id;
                      return (
                        <Link
                          key={item.id}
                          href={`/pages/${item.id}`}
                          className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition ${
                            active
                              ? 'bg-[#F4EFFF] font-semibold text-[#5D26D9]'
                              : 'text-[#525260] hover:bg-[#FAFAFC] hover:text-[#111118]'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                              active ? 'bg-[#6E32F5]' : 'bg-[#D0D0DC]'
                            }`}
                          />
                          <span className="truncate">{item.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Single-Page & Optional Bulk Sync to Courses */}
            <div className="space-y-2 border-t border-[#ECECF2] pt-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#848494]">
                Sync to Course Track
              </div>
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedTrack}
                  onChange={(e) => setSelectedTrack(e.target.value as CourseTrackId)}
                  aria-label="Target course track"
                  className="flex-1 rounded-lg border border-[#D4D8E4] bg-[#FAFAFC] px-2 py-1.5 text-xs font-semibold text-[#111118] focus:outline-none"
                >
                  {ROLE_LIST.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.shortLabel}
                    </option>
                  ))}
                  <option value="self-intro">Self Intro</option>
                </select>
                <button
                  type="button"
                  onClick={handleSyncSinglePage}
                  data-testid="html-import-course-button"
                  className="inline-flex items-center gap-1 rounded-lg bg-[#111118] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                  title="Sync only this page into the selected course"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Sync Page
                </button>
              </div>
              <button
                type="button"
                onClick={handleSyncAllToCourses}
                className="w-full rounded-lg border border-[#E2E5EE] bg-white py-1 text-[11px] font-medium text-[#667085] transition hover:border-[#6E32F5] hover:text-[#111118]"
              >
                Sync All {allPages.length} Pages to {selectedTrack.toUpperCase()}
              </button>
              {syncedTrackNotice && (
                <Link
                  href={`/courses/${syncedTrackNotice}`}
                  className="block text-center text-[11px] font-semibold text-[#6E32F5] hover:underline"
                >
                  Open {syncedTrackNotice.toUpperCase()} Course →
                </Link>
              )}
            </div>
          </aside>
        )}

        {/* Center Column: Video Stage + Editable Reader + Prev/Next */}
        <div className="min-w-0 flex-1 space-y-3">
          {showVideoStage && (
            <div className="rounded-2xl border border-[#ECECF2] bg-white p-4 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#111118]">
                  Lesson Video (YouTube URL or Local MP4)
                </span>
                {hasAnyVideo && (
                  <button
                    type="button"
                    onClick={handleClearVideo}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                )}
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <form
                  onSubmit={handleAttachYoutube}
                  className="flex min-w-[240px] flex-1 items-center gap-2"
                >
                  <div className="relative flex-1">
                    <Video className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-rose-500" />
                    <input
                      type="url"
                      value={ytInput}
                      onChange={(e) => setYtInput(e.target.value)}
                      placeholder="Paste YouTube video URL..."
                      data-testid="html-youtube-input"
                      className="w-full rounded-xl border border-[#D4D8E4] bg-[#FAFAFC] py-2 pr-3 pl-8 text-xs text-[#111118] focus:border-[#6E32F5] focus:bg-white focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    data-testid="html-youtube-submit"
                    className="rounded-xl bg-[#6E32F5] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#5B24D6]"
                  >
                    Attach YouTube
                  </button>
                </form>

                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*,.mp4,.webm,.mov"
                  onChange={handleUploadLocalVideo}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={uploadingVideo}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4C5FD] bg-[#F9F6FF] px-3 py-2 text-xs font-semibold text-[#5D26D9] transition hover:bg-[#F3ECFF] disabled:opacity-60"
                >
                  {uploadingVideo ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {uploadingVideo ? 'Uploading...' : 'Upload MP4'}
                </button>
              </div>

              {videoNotice && <p className="mt-2 text-xs text-rose-600">{videoNotice}</p>}

              {hasAnyVideo && (
                <div
                  className="mt-3 overflow-hidden rounded-xl border border-[#ECECF2] bg-black"
                  data-testid="html-video-player"
                >
                  {youtubeEmbed ? (
                    <div className="aspect-video w-full">
                      <iframe
                        title={`${page.title} YouTube Video`}
                        src={youtubeEmbed}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="h-full w-full border-0"
                      />
                    </div>
                  ) : playableVideoSrc ? (
                    <video
                      src={playableVideoSrc}
                      controls
                      className="aspect-video w-full bg-black"
                    />
                  ) : null}
                </div>
              )}
            </div>
          )}

          {editArticleMode && (
            <div className="rounded-xl border border-[#D4C5FD] bg-[#F6F1FF] px-4 py-2 text-xs font-medium text-[#4C1D95]">
              Direct edit enabled: click any paragraph below to modify or delete text, then click &ldquo;Save Article&rdquo;.
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-[#ECECF2] bg-white shadow-sm">
            <iframe
              ref={iframeRef}
              title={page.title}
              srcDoc={cleanMode ? cleanedReader.cleanHtml : effectiveRawHtml}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              className="min-h-[80vh] w-full border-0 bg-white"
              data-testid="html-reader-iframe"
            />
          </div>

          {/* Bottom Previous / Next Page Navigation */}
          {(prevPage || nextPage) && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#ECECF2] bg-white px-4 py-3">
              {prevPage ? (
                <Link
                  href={`/pages/${prevPage.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4D8E4] px-3 py-1.5 text-xs font-semibold text-[#111118] hover:border-[#6E32F5]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span className="max-w-[200px] truncate">{prevPage.title}</span>
                </Link>
              ) : (
                <span />
              )}

              {nextPage && (
                <Link
                  href={`/pages/${nextPage.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#111118] px-3.5 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  <span className="max-w-[200px] truncate">{nextPage.title}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Auto-extracted Lesson Contents TOC */}
        {cleanedReader.headings.length > 0 && (
          <aside className="sticky top-4 hidden w-48 shrink-0 rounded-2xl border border-[#ECECF2] bg-white p-3.5 shadow-2xs xl:block">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#848494]">
              On This Page
            </div>
            <nav className="mt-2.5 space-y-1">
              {cleanedReader.headings.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => scrollToHeading(h.id)}
                  className={`block w-full truncate text-left text-xs transition hover:text-[#6E32F5] ${
                    h.level === 3 ? 'pl-2.5 text-[#848494]' : 'font-medium text-[#525260]'
                  }`}
                >
                  {h.text}
                </button>
              ))}
            </nav>
          </aside>
        )}
      </div>
    </div>
  );
}
