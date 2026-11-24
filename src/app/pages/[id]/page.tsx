'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  BookPlus,
  Check,
  Film,
  Loader2,
  Palette,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { cleanHtmlForReader, toYouTubeEmbedUrl } from '@/lib/html-parser';
import { getLocalMediaBlob, saveLocalMedia } from '@/lib/media-db';
import { ROLE_LIST } from '@/lib/roles';
import type { CourseTrackId } from '@/lib/types';

export default function DeployedHtmlPageViewer() {
  const params = useParams<{ id: string }>();
  const {
    state,
    mounted,
    updateHtmlPage,
    importHtmlPageToCourse,
    syncThemeFromHtml,
    upsertKnowledgeArticle,
  } = useApp();

  const [cleanMode, setCleanMode] = useState(true);
  const [savedToHub, setSavedToHub] = useState(false);
  const [showVideoStage, setShowVideoStage] = useState(true);
  const [ytInput, setYtInput] = useState('');
  const [videoNotice, setVideoNotice] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [localObjectUrl, setLocalObjectUrl] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<CourseTrackId>('pm');
  const [importedTrack, setImportedTrack] = useState<CourseTrackId | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const page = useMemo(() => {
    const pages = state.deployedHtmlPages ?? [];
    return pages.find((p) => p.id === params.id) ?? null;
  }, [params.id, state.deployedHtmlPages]);

  const cleanedReader = useMemo(() => {
    if (!page) return { cleanHtml: '', strippedShell: false };
    return cleanHtmlForReader(page.rawHtml);
  }, [page]);

  useEffect(() => {
    if (!page?.courseTrack) return;
    setSelectedTrack(page.courseTrack);
    setImportedTrack(page.courseTrack);
  }, [page?.courseTrack]);

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
  const youtubeEmbed = page.videoUrl ? toYouTubeEmbedUrl(page.videoUrl) : null;
  const playableVideoSrc = localObjectUrl || (page.videoUrl && !youtubeEmbed ? page.videoUrl : null);
  const hasAnyVideo = Boolean(youtubeEmbed || playableVideoSrc);

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

  const handleImportCourse = () => {
    importHtmlPageToCourse(page.id, selectedTrack);
    setImportedTrack(selectedTrack);
  };

  return (
    <div className="space-y-4">
      {/* Top Control Bar */}
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
          {/* Smart De-shelling Reader Toggle */}
          <button
            type="button"
            onClick={() => setCleanMode((v) => !v)}
            data-testid="html-clean-mode-toggle"
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              cleanMode
                ? 'border-[#6E32F5]/30 bg-[#F3ECFF] text-[#6E32F5]'
                : 'border-[#ECECF2] bg-white text-[#525260] hover:border-[#6E32F5]'
            }`}
            title="自动剔除原网站多余侧边栏，保留原版字体与排版"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {cleanMode ? '纯净阅读（已去原站侧栏）' : '原始完整网页'}
          </button>

          {/* Import to Courses */}
          <div className="flex items-center gap-1 rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-1">
            <select
              value={selectedTrack}
              onChange={(e) => setSelectedTrack(e.target.value as CourseTrackId)}
              aria-label="选择课程赛道"
              className="rounded-lg bg-transparent px-2 py-1 text-xs font-semibold text-[#111118] focus:outline-none"
            >
              {ROLE_LIST.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.shortLabel}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleImportCourse}
              data-testid="html-import-course-button"
              className="inline-flex items-center gap-1 rounded-lg bg-[#111118] px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-[#2E2E3A]"
            >
              <BookOpen className="h-3.5 w-3.5" />
              {importedTrack === selectedTrack ? '更新到 Courses' : '导入到 Courses'}
            </button>
            {importedTrack && (
              <Link
                href={`/courses/${importedTrack}`}
                className="px-2 text-[11px] font-semibold text-[#6E32F5] hover:underline"
              >
                去上课 →
              </Link>
            )}
          </div>

          <button
            type="button"
            onClick={handleSaveToKnowledge}
            disabled={savedToHub}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#ECECF2] bg-white px-3 py-1.5 text-xs font-semibold text-[#111118] transition hover:border-[#6E32F5] disabled:opacity-60"
          >
            {savedToHub ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                已存入 Hub
              </>
            ) : (
              <>
                <BookPlus className="h-3.5 w-3.5 text-[#6E32F5]" />
                存入 Knowledge
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
                恢复默认UI
              </>
            ) : (
              <>
                <Palette className="h-3.5 w-3.5" />
                同步 UI 与字体
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hybrid Video Stage (YouTube Link + Local Video Upload) */}
      <div className="rounded-2xl border border-[#ECECF2] bg-white p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Film className="h-4 w-4 text-[#6E32F5]" />
            <span className="text-xs font-bold text-[#111118]">
              课程视频挂载区（支持直接贴 YouTube 链接，或上传原站下载的 MP4 视频）
            </span>
            {page.localMediaName && (
              <span className="rounded-md bg-[#F3ECFF] px-2 py-0.5 text-[10px] font-semibold text-[#6E32F5]">
                {page.localMediaName}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasAnyVideo && (
              <>
                <button
                  type="button"
                  onClick={() => setShowVideoStage((v) => !v)}
                  className="rounded-lg border border-[#ECECF2] px-2.5 py-1 text-[11px] font-semibold text-[#525260] hover:border-[#6E32F5]"
                >
                  {showVideoStage ? '收起播放器' : '展开播放器'}
                </button>
                <button
                  type="button"
                  onClick={handleClearVideo}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="h-3 w-3" />
                  移除视频
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <form onSubmit={handleAttachYoutube} className="flex min-w-[260px] flex-1 items-center gap-2">
            <div className="relative flex-1">
              <Video className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-rose-500" />
              <input
                type="url"
                value={ytInput}
                onChange={(e) => setYtInput(e.target.value)}
                placeholder="粘贴 YouTube 视频链接 (https://www.youtube.com/watch?v=...)"
                data-testid="html-youtube-input"
                className="w-full rounded-xl border border-[#ECECF2] bg-[#FAFAFC] py-2 pl-8 pr-3 text-xs text-[#111118] focus:border-[#6E32F5] focus:bg-white focus:outline-none"
              />
            </div>
            <button
              type="submit"
              data-testid="html-youtube-submit"
              className="rounded-xl bg-[#6E32F5] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#5B24D6]"
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
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4C5FD] bg-[#F9F6FF] px-3.5 py-2 text-xs font-semibold text-[#6E32F5] transition hover:bg-[#F3ECFF] disabled:opacity-60"
          >
            {uploadingVideo ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {uploadingVideo ? '上传中...' : '上传本地 MP4 视频'}
          </button>
        </div>

        {videoNotice && <p className="mt-2 text-xs text-rose-600">{videoNotice}</p>}

        {showVideoStage && hasAnyVideo && (
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

      {/* Article / HTML Renderer */}
      <div className="overflow-hidden rounded-2xl border border-[#ECECF2] bg-white shadow-sm">
        <iframe
          title={page.title}
          srcDoc={cleanMode ? cleanedReader.cleanHtml : page.rawHtml}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          className="min-h-[78vh] w-full border-0 bg-white"
          data-testid="html-reader-iframe"
        />
      </div>
    </div>
  );
}
