'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
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
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { extractDocumentText } from '@/lib/doc-parser-client';
import {
  cleanHtmlForReader,
  extractReadableTextFromHtml,
  toYouTubeEmbedUrl,
} from '@/lib/html-parser';
import { getLocalMediaBlob, saveLocalMedia } from '@/lib/media-db';
import { ROLE_LIST } from '@/lib/roles';
import type { CourseTrackId, DeployedHtmlPage } from '@/lib/types';

export default function DeployedHtmlPageViewer() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    state,
    mounted,
    deployHtmlPage,
    updateHtmlPage,
    syncAllHtmlPagesToCourse,
    syncThemeFromHtml,
    upsertKnowledgeArticle,
  } = useApp();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [cleanMode, setCleanMode] = useState(true);
  const [editArticleMode, setEditArticleMode] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const [savedToHub, setSavedToHub] = useState(false);
  const [showVideoStage, setShowVideoStage] = useState(false);
  const [ytInput, setYtInput] = useState('');
  const [videoNotice, setVideoNotice] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [localObjectUrl, setLocalObjectUrl] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<CourseTrackId>('pm');
  const [syncedTrackNotice, setSyncedTrackNotice] = useState<CourseTrackId | null>(null);

  const [titleDraft, setTitleDraft] = useState('');
  const [moduleDraft, setModuleDraft] = useState('');

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const batchHtmlInputRef = useRef<HTMLInputElement | null>(null);

  const allPages = useMemo(() => state.deployedHtmlPages ?? [], [state.deployedHtmlPages]);

  const page = useMemo(() => {
    return allPages.find((p) => p.id === params.id) ?? null;
  }, [allPages, params.id]);

  const cleanedReader = useMemo(() => {
    if (!page) return { cleanHtml: '', strippedShell: false, headings: [] };
    return cleanHtmlForReader(page.rawHtml, { editable: editArticleMode });
  }, [page, editArticleMode]);

  // Group all HTML pages by moduleTitle for the left Aced-style directory
  const groupedDirectory = useMemo(() => {
    const map = new Map<string, DeployedHtmlPage[]>();
    allPages.forEach((p) => {
      const mod = p.moduleTitle?.trim() || 'Product Management Intro';
      const arr = map.get(mod) ?? [];
      arr.push(p);
      map.set(mod, arr);
    });
    return Array.from(map.entries());
  }, [allPages]);

  useEffect(() => {
    if (!page) return;
    setTitleDraft(page.title);
    setModuleDraft(page.moduleTitle || 'Product Management Intro');
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
        Loading Course &amp; HTML Studio...
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
  const youtubeEmbed = page.videoUrl ? toYouTubeEmbedUrl(page.videoUrl) : null;
  const playableVideoSrc = localObjectUrl || (page.videoUrl && !youtubeEmbed ? page.videoUrl : null);
  const hasAnyVideo = Boolean(youtubeEmbed || playableVideoSrc);

  const handleSaveMeta = () => {
    updateHtmlPage(page.id, {
      title: titleDraft.trim() || page.title,
      moduleTitle: moduleDraft.trim() || 'Product Management Intro',
    });
    setSavedNotice('目录与标题已更新');
    window.setTimeout(() => setSavedNotice(''), 2000);
  };

  const handleSaveEditedArticle = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) {
      setEditArticleMode(false);
      return;
    }
    // Clean up editor attributes before saving
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
    setEditArticleMode(false);
    setSavedNotice('正文修改已保存');
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
          moduleTitle: moduleDraft.trim() || 'Product Management Intro',
          fileName: file.name,
          rawHtml: res.htmlMeta.rawHtml,
          extractedText: res.htmlMeta.text,
          designTokens: res.htmlMeta.designTokens,
        });
        lastCreatedId = created.id;
      }
    }
    if (lastCreatedId) {
      setSavedNotice(`已批量导入 ${files.length} 个 HTML 页面`);
      router.push(`/pages/${lastCreatedId}`);
    }
  };

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

  const handleAttachYoutube = (e: React.FormEvent) => {
    e.preventDefault();
    setVideoNotice('');
    const embed = toYouTubeEmbedUrl(ytInput);
    if (!embed) {
      setVideoNotice('请输入有效的 YouTube 链接（支持 youtube.com/watch?v=... 或 youtu.be/...）');
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
      setVideoNotice('视频上传失败，请检查文件格式（支持 MP4 / WebM / MOV）');
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

  const handleSyncAllToCourses = () => {
    syncAllHtmlPagesToCourse(selectedTrack);
    setSyncedTrackNotice(selectedTrack);
    setSavedNotice(`已将全部 ${allPages.length} 个页面同步到 Courses (${selectedTrack.toUpperCase()})`);
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
            title="展开/收起课程章节目录"
          >
            <PanelLeft className="h-3.5 w-3.5 text-[#6E32F5]" />
            课程目录
          </button>
          <Link
            href="/pages"
            className="inline-flex items-center gap-1 rounded-xl border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#525260] transition hover:border-[#6E32F5] hover:text-[#111118]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            页面库
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
              保存正文修改
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
              title="直接点击文章内文字进行编辑或删除不需要的内容"
            >
              <Edit3 className="h-3.5 w-3.5 text-[#6E32F5]" />
              编辑正文
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
            {hasAnyVideo ? '视频已挂载' : '挂载视频'}
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
            {cleanMode ? '纯净模式' : '原网页'}
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
                恢复UI
              </>
            ) : (
              <>
                <Palette className="h-3.5 w-3.5" />
                同步字体
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSaveToKnowledge}
            disabled={savedToHub}
            className="inline-flex items-center gap-1 rounded-xl border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#525260] transition hover:border-[#6E32F5] disabled:opacity-60"
          >
            {savedToHub ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <BookPlus className="h-3.5 w-3.5 text-[#6E32F5]" />
            )}
            {savedToHub ? '已入库' : '存Hub'}
          </button>
        </div>
      </div>

      {/* 3-Column Aced-Style Course Studio */}
      <div className="flex items-start gap-4">
        {/* Left Column: Custom Course Directory + Inline Chapter/Title Editor */}
        {sidebarOpen && (
          <aside
            className="sticky top-4 flex w-64 shrink-0 flex-col gap-3 rounded-2xl border border-[#ECECF2] bg-white p-3.5 shadow-2xs"
            data-testid="html-course-sidebar"
          >
            {/* Inline Chapter & Lesson Title Editor */}
            <div className="space-y-2 rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#848494]">
                当前课程归类与标题
              </div>
              <input
                type="text"
                value={moduleDraft}
                onChange={(e) => setModuleDraft(e.target.value)}
                onBlur={handleSaveMeta}
                placeholder="章节名 (如 Product Management Intro)"
                data-testid="html-module-input"
                className="w-full rounded-lg border border-[#E2E2EC] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#111118] focus:border-[#6E32F5] focus:outline-none"
              />
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={handleSaveMeta}
                placeholder="自定义课程标题"
                data-testid="html-title-input"
                className="w-full rounded-lg border border-[#E2E2EC] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#111118] focus:border-[#6E32F5] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveMeta}
                className="w-full rounded-lg bg-[#F3ECFF] py-1 text-[11px] font-semibold text-[#6E32F5] transition hover:bg-[#6E32F5] hover:text-white"
              >
                保存目录与标题
              </button>
            </div>

            {/* Batch Upload 10+ HTML Pages */}
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
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#D4C5FD] bg-[#F9F6FF] py-2 text-xs font-semibold text-[#6E32F5] transition hover:bg-[#F3ECFF]"
            >
              <Plus className="h-3.5 w-3.5" />
              批量添加 HTML 课程页
            </button>

            {/* Grouped Chapter Directory */}
            <div className="max-h-[48vh] space-y-3 overflow-y-auto pr-0.5">
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
                              ? 'bg-[#F3ECFF] font-semibold text-[#6E32F5]'
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

            {/* Sync All Directory to Courses */}
            <div className="space-y-1.5 border-t border-[#ECECF2] pt-2.5">
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedTrack}
                  onChange={(e) => setSelectedTrack(e.target.value as CourseTrackId)}
                  aria-label="同步到赛道"
                  className="flex-1 rounded-lg border border-[#ECECF2] bg-[#FAFAFC] px-2 py-1.5 text-xs font-semibold text-[#111118] focus:outline-none"
                >
                  {ROLE_LIST.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.shortLabel}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleSyncAllToCourses}
                  data-testid="html-import-course-button"
                  className="inline-flex items-center gap-1 rounded-lg bg-[#111118] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#2E2E3A]"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  同步全部
                </button>
              </div>
              {syncedTrackNotice && (
                <Link
                  href={`/courses/${syncedTrackNotice}`}
                  className="block text-center text-[11px] font-semibold text-[#6E32F5] hover:underline"
                >
                  前往 {syncedTrackNotice.toUpperCase()} 课程查看目录 →
                </Link>
              )}
            </div>
          </aside>
        )}

        {/* Center Column: Video Stage + Editable Original-Styled Article */}
        <div className="min-w-0 flex-1 space-y-3">
          {showVideoStage && (
            <div className="rounded-2xl border border-[#ECECF2] bg-white p-4 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#111118]">
                  课程视频（支持 YouTube 链接或本地 MP4 上传）
                </span>
                {hasAnyVideo && (
                  <button
                    type="button"
                    onClick={handleClearVideo}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    移除
                  </button>
                )}
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <form
                  onSubmit={handleAttachYoutube}
                  className="flex min-w-[240px] flex-1 items-center gap-2"
                >
                  <div className="relative flex-1">
                    <Video className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-rose-500" />
                    <input
                      type="url"
                      value={ytInput}
                      onChange={(e) => setYtInput(e.target.value)}
                      placeholder="粘贴 YouTube 视频链接..."
                      data-testid="html-youtube-input"
                      className="w-full rounded-xl border border-[#ECECF2] bg-[#FAFAFC] py-2 pl-8 pr-3 text-xs text-[#111118] focus:border-[#6E32F5] focus:bg-white focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    data-testid="html-youtube-submit"
                    className="rounded-xl bg-[#6E32F5] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#5B24D6]"
                  >
                    插入 YouTube
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
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4C5FD] bg-[#F9F6FF] px-3 py-2 text-xs font-semibold text-[#6E32F5] transition hover:bg-[#F3ECFF] disabled:opacity-60"
                >
                  {uploadingVideo ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {uploadingVideo ? '上传中...' : '上传本地 MP4'}
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
              ✏️ 已开启正文直编模式：直接点击下方文章任意文字即可修改或删除，完成后点击右上角绿色「保存正文修改」。
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-[#ECECF2] bg-white shadow-sm">
            <iframe
              ref={iframeRef}
              title={page.title}
              srcDoc={cleanMode ? cleanedReader.cleanHtml : page.rawHtml}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              className="min-h-[80vh] w-full border-0 bg-white"
              data-testid="html-reader-iframe"
            />
          </div>
        </div>

        {/* Right Column: Auto-extracted Lesson Contents TOC */}
        {cleanedReader.headings.length > 0 && (
          <aside className="sticky top-4 hidden w-48 shrink-0 rounded-2xl border border-[#ECECF2] bg-white p-3.5 shadow-2xs xl:block">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#848494]">
              Lesson contents
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
