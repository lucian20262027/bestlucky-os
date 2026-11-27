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
  Square,
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
  compact?: boolean;
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
  compact = false,
}: AffirmationVideoStripProps) {
  const slots = videos.slice(0, 3);
  const [activeIdx, setActiveIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
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

  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditing(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing]);

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

  // Mount YouTube IFrame API player ONLY after user clicks Play (eliminates dead black rectangle & modal z-index occlusion)
  useEffect(() => {
    if (!playing || !ytId || editing || !ytContainerRef.current) return;

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
  }, [playing, ytId, editing, slots.length]);

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
    setPlaying(false);
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

  const hasMedia = Boolean(localUrl || (current.videoUrl && (ytId || parsed?.embedUrl || parsed?.provider === 'direct')));
  const posterThumb = ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : null;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-[#E6E6EE] bg-[#11101B] text-white shadow-xs"
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
      {/* Stage */}
      <div
        className={`relative w-full overflow-hidden bg-gradient-to-br from-[#19142E] via-[#221942] to-[#11101B] ${
          compact ? 'h-[224px]' : 'h-[320px] sm:h-[360px]'
        }`}
      >
        {playing && !editing ? (
          localUrl ? (
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
              className="h-full w-full bg-black object-contain"
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
              className="h-full w-full bg-black object-contain"
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
          ) : null
        ) : (
          /* Refined Aurora Poster Preview (No Black Void & Zero Z-Index Iframe Issues) */
          <div className="relative flex h-full w-full flex-col justify-between p-4">
            {posterThumb && (
              <div
                className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity"
                style={{ backgroundImage: `url(${posterThumb})` }}
              />
            )}
            <div className="pointer-events-none absolute -top-16 -right-12 h-44 w-44 rounded-full bg-[#6E32F5]/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-[#F59E0B]/15 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0D0C16]/95 via-[#131122]/55 to-[#131122]/40" />

            {/* Top Bar inside Poster */}
            <div className="relative z-10 flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-2.5 py-1 text-[10.5px] font-medium text-white/90 backdrop-blur-md">
                <Sparkles className="h-3 w-3 text-[#C4B5FD]" />
                <span>Mindset Stage</span>
              </div>

              {/* Non-wrapping compact pill selector (fixes 375px mobile overflow) */}
              <div className="flex flex-nowrap items-center gap-1 rounded-full border border-white/15 bg-black/40 p-0.5 backdrop-blur-md">
                {slots.map((slot, idx) => {
                  const active = idx === activeIdx;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setActiveIdx(idx)}
                      className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold transition ${
                        active
                          ? 'bg-white text-[#111118]'
                          : 'text-white/75 hover:text-white'
                      }`}
                    >
                      #{idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Center Play Button */}
            <div className="relative z-10 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous video"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/85 backdrop-blur-md transition hover:bg-white/20"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {hasMedia ? (
                <button
                  type="button"
                  onClick={() => setPlaying(true)}
                  className="group inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md transition hover:scale-[1.03] hover:bg-white hover:text-[#111118]"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Play Clip</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openEditor}
                  className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/25"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Add Video</span>
                </button>
              )}

              <button
                type="button"
                onClick={goNext}
                aria-label="Next video"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/85 backdrop-blur-md transition hover:bg-white/20"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Bottom Caption */}
            <div className="relative z-10 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-amber-300/90">
                  0{activeIdx + 1} / 0{slots.length}
                </div>
                <h2 className="mt-0.5 truncate text-base font-semibold tracking-tight text-white">
                  {current.title}
                </h2>
                {current.subtitle && (
                  <p className="truncate text-[11px] text-white/70">{current.subtitle}</p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {slots.map((slot, idx) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    aria-label={`Select clip ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === activeIdx ? 'w-5 bg-white' : 'w-1.5 bg-white/35 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Compact Control Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#0D0C14] px-4 py-2 text-[11px] text-white/70">
        <div className="flex flex-wrap items-center gap-2">
          {playing && (
            <button
              type="button"
              onClick={() => setPlaying(false)}
              className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 font-medium text-white hover:bg-white/20"
            >
              <Square className="h-2.5 w-2.5 fill-current" />
              Poster
            </button>
          )}
          <button
            type="button"
            onClick={() => setAutoAdvance((v) => !v)}
            className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
          >
            {autoAdvance ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            <span>{autoAdvance ? 'Auto-Next On' : 'Auto-Next Off'}</span>
          </button>
          {playing && (
            <button
              type="button"
              onClick={toggleSound}
              className="inline-flex items-center gap-1 text-white/85 hover:text-white"
            >
              {isMuted ? (
                <>
                  <VolumeX className="h-3 w-3 text-amber-300" />
                  Unmute
                </>
              ) : (
                <>
                  <Volume2 className="h-3 w-3 text-emerald-400" />
                  Sound On
                </>
              )}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={openEditor}
          className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/8 px-2.5 py-1 text-[11px] font-medium text-white/90 transition hover:bg-white/15"
        >
          <Edit3 className="h-3 w-3" />
          Manage Clips
        </button>
      </div>

      {/* Edit / Upload Modal */}
      {editing && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 text-[#111118] backdrop-blur-[2px]"
          onClick={() => setEditing(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[#ECECF2] pb-3">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-[#6E32F5]" />
                <h3 className="text-base font-semibold text-[#111118]">
                  Manage Daily Mindset Clips
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditing(false)}
                aria-label="Close video manager"
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
                          Upload Video
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
                      placeholder="Clip title"
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
                      placeholder="Subtitle (optional)"
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
                    placeholder="Paste YouTube, Shorts, Loom, or MP4 link..."
                    className="w-full rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs focus:border-[#6E32F5] focus:outline-none"
                  />
                  {item.localMediaName && (
                    <div className="text-[11px] text-emerald-700">
                      Attached media: {item.localMediaName}
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white"
                >
                  Save &amp; Sync
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
