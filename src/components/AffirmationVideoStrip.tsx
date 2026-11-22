'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  Loader2,
  Pause,
  Play,
  Sparkles,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { getLocalMediaBlob, saveLocalMedia } from '@/lib/media-db';
import { AffirmationVideo } from '@/lib/types';
import { parseVideoSource } from '@/lib/video-utils';

interface AffirmationVideoStripProps {
  videos: AffirmationVideo[];
  onSaveVideos: (videos: AffirmationVideo[]) => void;
}

export function AffirmationVideoStrip({
  videos,
  onSaveVideos,
}: AffirmationVideoStripProps) {
  const slots = videos.slice(0, 3);
  const [activeIdx, setActiveIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<AffirmationVideo[]>(videos);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [localBlobUrls, setLocalBlobUrls] = useState<Record<string, string>>({});
  const touchStartX = useRef<number | null>(null);

  // Load IndexedDB object URLs for any local uploaded videos
  useEffect(() => {
    let active = true;
    const created: string[] = [];
    (async () => {
      const next: Record<string, string> = {};
      for (const v of slots) {
        if (v.localMediaId) {
          const blob = await getLocalMediaBlob(v.localMediaId);
          if (blob) {
            const url = URL.createObjectURL(blob);
            next[v.id] = url;
            created.push(url);
          }
        }
      }
      if (active) setLocalBlobUrls(next);
    })();
    return () => {
      active = false;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [videos]);

  // Smooth auto-rotation every 12 seconds when autoPlay is enabled & not editing
  useEffect(() => {
    if (!autoPlay || editing || slots.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % slots.length);
    }, 12000);
    return () => window.clearInterval(timer);
  }, [autoPlay, editing, slots.length]);

  const goPrev = () => {
    setActiveIdx((prev) => (prev - 1 + slots.length) % slots.length);
  };

  const goNext = () => {
    setActiveIdx((prev) => (prev + 1) % slots.length);
  };

  const openEditor = () => {
    const padded = [...videos];
    while (padded.length < 3) {
      padded.push({
        id: `aff-${Date.now()}-${padded.length}`,
        title: `Daily Affirmation #${padded.length + 1}`,
        subtitle: 'Mindset & Confidence',
        videoUrl: '',
      });
    }
    setDrafts(padded.slice(0, 3));
    setEditing(true);
  };

  const handleUploadLocal = async (
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingIdx(idx);
    try {
      const saved = await saveLocalMedia(file);
      setDrafts((prev) =>
        prev.map((item, i) =>
          i === idx
            ? {
                ...item,
                localMediaId: saved.id,
                localMediaName: saved.name,
                videoUrl: saved.cloudUrl || '',
                title: item.title || file.name.replace(/\.[^.]+$/, ''),
              }
            : item
        )
      );
    } finally {
      setUploadingIdx(null);
      e.target.value = '';
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveVideos(drafts);
    setEditing(false);
  };

  const current = slots[activeIdx] ?? slots[0];
  if (!current) return null;

  const parsed = current.videoUrl ? parseVideoSource(current.videoUrl) : null;
  const localUrl = localBlobUrls[current.id];

  // Build muted autoplay embed URL for YouTube Shorts/Video so it plays smoothly in hero stage
  let embedSrc = parsed?.embedUrl;
  if (parsed?.provider === 'youtube' && parsed.embedUrl) {
    const ytId = parsed.embedUrl.split('/embed/')[1]?.split('?')[0];
    if (ytId) {
      embedSrc = `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&rel=0&modestbranding=1&playsinline=1`;
    }
  }

  return (
    <section
      className="overflow-hidden rounded-3xl border border-[#1E1E28] bg-[#0B0B10] text-white shadow-xl"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
        touchStartX.current = null;
        if (dx > 45) goPrev();
        else if (dx < -45) goNext();
      }}
    >
      {/* Hero Stage */}
      <div className="relative h-[340px] w-full overflow-hidden bg-gradient-to-br from-[#131022] via-[#1B1434] to-[#0A0A0F] sm:h-[380px]">
        {/* Active Video Layer */}
        {localUrl ? (
          <video
            key={localUrl}
            src={localUrl}
            autoPlay
            muted
            loop
            playsInline
            controls
            className="h-full w-full object-cover"
          />
        ) : current.videoUrl && parsed?.provider === 'direct' ? (
          <video
            key={current.videoUrl}
            src={current.videoUrl}
            autoPlay
            muted
            loop
            playsInline
            controls
            className="h-full w-full object-cover"
          />
        ) : embedSrc ? (
          <iframe
            key={embedSrc}
            src={embedSrc}
            title={current.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-white/60">
            Click &ldquo;Edit / Upload&rdquo; to add a video
          </div>
        )}

        {/* Top Gradient + Top-Right Pill Switcher (Bomie.ai style) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="absolute top-3.5 right-3.5 left-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md">
            <Sparkles className="h-3 w-3 text-[#C4B5FD]" />
            Daily Mindset Stage
          </div>

          <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-white/15 bg-black/50 p-1 backdrop-blur-md">
            {slots.map((slot, idx) => {
              const active = idx === activeIdx;
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setActiveIdx(idx)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                    active
                      ? 'bg-white text-[#111118] shadow-xs'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {slot.title.replace(/^Daily\s+/i, '') || `Clip #${idx + 1}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Left / Right Swipe Arrows */}
        <button
          type="button"
          onClick={goPrev}
          aria-label="Previous video"
          className="absolute top-1/2 left-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white/90 backdrop-blur-md transition hover:bg-black/70"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={goNext}
          aria-label="Next video"
          className="absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white/90 backdrop-blur-md transition hover:bg-black/70"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Bottom-Left Cinematic Overlay + Bottom-Right Progress Pills */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />
        <div className="pointer-events-none absolute inset-x-5 bottom-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-amber-300">
              0{activeIdx + 1} · DAILY AFFIRMATION &amp; ENERGY
            </div>
            <h2 className="mt-0.5 truncate text-xl font-bold tracking-tight text-white sm:text-2xl">
              {current.title}
            </h2>
            {current.subtitle && (
              <p className="truncate text-xs text-white/75">{current.subtitle}</p>
            )}
          </div>

          {/* Bomie-style pill indicators */}
          <div className="pointer-events-auto flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-2.5 py-1.5 backdrop-blur-md">
            {slots.map((slot, idx) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setActiveIdx(idx)}
                aria-label={`Go to video ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === activeIdx ? 'w-7 bg-white' : 'w-2 bg-white/35 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bomie-style Dark Footer Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#0F0F16] px-5 py-2.5 text-xs text-white/75">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-white">BestLucky Mindset</span>
          <span className="text-white/30">·</span>
          <span>{parsed?.label ?? 'Local / Cloud Video'}</span>
          <span className="text-white/30">·</span>
          <button
            type="button"
            onClick={() => setAutoPlay((v) => !v)}
            className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
          >
            {autoPlay ? (
              <>
                <Pause className="h-3 w-3" />
                Auto-Rotate On
              </>
            ) : (
              <>
                <Play className="h-3 w-3" />
                Auto-Rotate Paused
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={openEditor}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-white/20"
        >
          <Edit3 className="h-3 w-3" />
          Edit / Upload Videos
        </button>
      </div>

      {/* Edit / Upload Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 text-[#111118]">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#ECECF2] pb-3">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-[#6E32F5]" />
                <h3 className="text-base font-semibold text-[#111118]">
                  管理轮播 3 个 Affirmation 视频
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg p-1 text-[#848494] hover:bg-[#FAFAFC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {drafts.map((item, idx) => (
                <div
                  key={item.id}
                  className="space-y-2.5 rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-3.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#6E32F5]">
                      Video Slot #{idx + 1}
                    </span>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#111118] hover:border-[#6E32F5]">
                      {uploadingIdx === idx ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-3 w-3 text-[#6E32F5]" />
                          上传本地视频
                        </>
                      )}
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => void handleUploadLocal(idx, e)}
                      />
                    </label>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) =>
                        setDrafts((prev) =>
                          prev.map((d, i) => (i === idx ? { ...d, title: e.target.value } : d))
                        )
                      }
                      placeholder="视频标题"
                      className="rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs focus:border-[#6E32F5] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={item.subtitle ?? ''}
                      onChange={(e) =>
                        setDrafts((prev) =>
                          prev.map((d, i) =>
                            i === idx ? { ...d, subtitle: e.target.value } : d
                          )
                        )
                      }
                      placeholder="副标题（可选）"
                      className="rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs focus:border-[#6E32F5] focus:outline-none"
                    />
                  </div>

                  <input
                    type="text"
                    value={item.videoUrl}
                    onChange={(e) =>
                      setDrafts((prev) =>
                        prev.map((d, i) =>
                          i === idx
                            ? { ...d, videoUrl: e.target.value, localMediaId: undefined }
                            : d
                        )
                      )
                    }
                    placeholder="粘贴 YouTube / Shorts / Bilibili / Loom 链接..."
                    className="w-full rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs focus:border-[#6E32F5] focus:outline-none"
                  />
                  {item.localMediaName && (
                    <div className="text-[11px] text-emerald-700">
                      已绑定本地/云端视频: {item.localMediaName}
                    </div>
                  )}
                </div>
              ))}

              <div className="flex justify-end gap-2 border-t border-[#ECECF2] pt-3">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-xl border border-[#ECECF2] px-4 py-2 text-xs font-semibold text-[#5E5E6E]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white"
                >
                  保存并同步
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
