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
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { getLocalMediaBlob, saveLocalMedia } from '@/lib/media-db';
import { AffirmationVideo } from '@/lib/types';
import { parseVideoSource } from '@/lib/video-utils';

interface AffirmationVideoStripProps {
  videos: AffirmationVideo[];
  onSaveVideos: (videos: AffirmationVideo[]) => void;
}

interface YTPlayerInstance {
  destroy: () => void;
  unMute: () => void;
  mute: () => void;
  isMuted: () => boolean;
  setVolume: (vol: number) => void;
  playVideo: () => void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (e: { target: YTPlayerInstance }) => void;
            onStateChange?: (e: { data: number; target: YTPlayerInstance }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState?: { ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,15})/
  );
  return match?.[1] ?? null;
}

export function AffirmationVideoStrip({
  videos,
  onSaveVideos,
}: AffirmationVideoStripProps) {
  const slots = videos.slice(0, 3);
  const [activeIdx, setActiveIdx] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<AffirmationVideo[]>(videos);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [localBlobUrls, setLocalBlobUrls] = useState<Record<string, string>>({});

  const touchStartX = useRef<number | null>(null);
  const ytContainerRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<YTPlayerInstance | null>(null);
  const htmlVideoRef = useRef<HTMLVideoElement | null>(null);
  const autoAdvanceRef = useRef(autoAdvance);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    autoAdvanceRef.current = autoAdvance;
  }, [autoAdvance]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Load IndexedDB object URLs for local uploaded videos
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

  const current = slots[activeIdx] ?? slots[0];
  const localUrl = current ? localBlobUrls[current.id] : undefined;
  const parsed = current?.videoUrl ? parseVideoSource(current.videoUrl) : null;
  const ytId =
    !localUrl && current?.videoUrl && parsed?.provider === 'youtube'
      ? extractYouTubeId(current.videoUrl)
      : null;

  const goPrev = () => {
    setActiveIdx((prev) => (prev - 1 + slots.length) % slots.length);
  };

  const goNext = () => {
    setActiveIdx((prev) => (prev + 1) % slots.length);
  };

  // Mount YouTube IFrame API player so we get exact ENDED events (play full video before advancing) + Unmute control
  useEffect(() => {
    if (!ytId || editing || !ytContainerRef.current) return;

    let cancelled = false;

    const mountPlayer = () => {
      if (cancelled || !ytContainerRef.current || !window.YT?.Player) return;
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          // Ignore cleanup errors
        }
        ytPlayerRef.current = null;
      }
      ytContainerRef.current.innerHTML = '';
      const targetDiv = document.createElement('div');
      targetDiv.style.width = '100%';
      targetDiv.style.height = '100%';
      ytContainerRef.current.appendChild(targetDiv);

      ytPlayerRef.current = new window.YT.Player(targetDiv, {
        videoId: ytId,
        playerVars: {
          autoplay: 1,
          mute: isMutedRef.current ? 1 : 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          controls: 1,
        },
        events: {
          onReady: (e) => {
            if (!isMutedRef.current) {
              e.target.unMute();
              e.target.setVolume(100);
            } else {
              e.target.mute();
            }
            e.target.playVideo();
          },
          onStateChange: (e) => {
            // 0 = YT.PlayerState.ENDED — advance ONLY after full video finishes!
            if (e.data === 0 && autoAdvanceRef.current && slots.length > 1) {
              setActiveIdx((prev) => (prev + 1) % slots.length);
            }
          },
        },
      });
    };

    if (window.YT?.Player) {
      mountPlayer();
    } else {
      const prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevReady) prevReady();
        mountPlayer();
      };
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    }

    return () => {
      cancelled = true;
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          // Ignore cleanup errors
        }
        ytPlayerRef.current = null;
      }
    };
  }, [ytId, editing, slots.length]);

  const toggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (ytPlayerRef.current) {
      if (nextMuted) {
        ytPlayerRef.current.mute();
      } else {
        ytPlayerRef.current.unMute();
        ytPlayerRef.current.setVolume(100);
        ytPlayerRef.current.playVideo();
      }
    }
    if (htmlVideoRef.current) {
      htmlVideoRef.current.muted = nextMuted;
      if (!nextMuted) {
        htmlVideoRef.current.volume = 1;
        void htmlVideoRef.current.play().catch(() => {});
      }
    }
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

  if (!current) return null;

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
      <div className="relative h-[360px] w-full overflow-hidden bg-gradient-to-br from-[#131022] via-[#1B1434] to-[#0A0A0F] sm:h-[400px]">
        {/* Active Video Layer */}
        {localUrl ? (
          <video
            ref={htmlVideoRef}
            key={localUrl}
            src={localUrl}
            autoPlay
            muted={isMuted}
            playsInline
            controls
            onEnded={() => {
              if (autoAdvance && slots.length > 1) goNext();
            }}
            className="h-full w-full object-contain bg-black"
          />
        ) : current.videoUrl && parsed?.provider === 'direct' ? (
          <video
            ref={htmlVideoRef}
            key={current.videoUrl}
            src={current.videoUrl}
            autoPlay
            muted={isMuted}
            playsInline
            controls
            onEnded={() => {
              if (autoAdvance && slots.length > 1) goNext();
            }}
            className="h-full w-full object-contain bg-black"
          />
        ) : ytId ? (
          <div ref={ytContainerRef} className="h-full w-full bg-black" />
        ) : parsed?.embedUrl ? (
          <iframe
            key={parsed.embedUrl}
            src={parsed.embedUrl}
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

        {/* Top Gradient + Controls */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-black/75 to-transparent" />
        <div className="absolute top-3.5 right-3.5 left-3.5 z-10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md">
              <Sparkles className="h-3 w-3 text-[#C4B5FD]" />
              Daily Mindset Stage
            </div>

            {/* Prominent Sound Unmute / Mute Pill */}
            <button
              type="button"
              onClick={toggleSound}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold backdrop-blur-md transition ${
                isMuted
                  ? 'border-amber-300/60 bg-amber-400/20 text-amber-200 hover:bg-amber-400/35'
                  : 'border-emerald-300/50 bg-emerald-500/25 text-emerald-200 hover:bg-emerald-500/35'
              }`}
            >
              {isMuted ? (
                <>
                  <VolumeX className="h-3.5 w-3.5" />
                  Tap to Unmute
                </>
              ) : (
                <>
                  <Volume2 className="h-3.5 w-3.5" />
                  Sound On
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-white/15 bg-black/55 p-1 backdrop-blur-md">
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
          className="absolute top-1/2 left-3 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/90 backdrop-blur-md transition hover:bg-black/75"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={goNext}
          aria-label="Next video"
          className="absolute top-1/2 right-3 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/90 backdrop-blur-md transition hover:bg-black/75"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Bottom-Left Cinematic Overlay + Bottom-Right Progress Pills */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-28 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        <div className="pointer-events-none absolute inset-x-5 bottom-10 z-10 flex items-end justify-between gap-4 sm:bottom-5">
          <div className="min-w-0">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-amber-300">
              0{activeIdx + 1} · PLAYS FULL CLIP THEN AUTO-NEXT
            </div>
            <h2 className="mt-0.5 truncate text-xl font-bold tracking-tight text-white sm:text-2xl">
              {current.title}
            </h2>
            {current.subtitle && (
              <p className="truncate text-xs text-white/75">{current.subtitle}</p>
            )}
          </div>

          <div className="pointer-events-auto flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-2.5 py-1.5 backdrop-blur-md">
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
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-semibold text-white">BestLucky Mindset</span>
          <span className="text-white/30">·</span>
          <span>{parsed?.label ?? 'Local / Cloud Video'}</span>
          <span className="text-white/30">·</span>
          <button
            type="button"
            onClick={() => setAutoAdvance((v) => !v)}
            className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
          >
            {autoAdvance ? (
              <>
                <Pause className="h-3 w-3" />
                Auto-Next On Finish
              </>
            ) : (
              <>
                <Play className="h-3 w-3" />
                Auto-Next Paused
              </>
            )}
          </button>
          <span className="text-white/30">·</span>
          <button
            type="button"
            onClick={toggleSound}
            className="inline-flex items-center gap-1 text-white/85 hover:text-white"
          >
            {isMuted ? (
              <>
                <VolumeX className="h-3 w-3 text-amber-300" />
                Muted (Click to Unmute)
              </>
            ) : (
              <>
                <Volume2 className="h-3 w-3 text-emerald-400" />
                Sound On
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
