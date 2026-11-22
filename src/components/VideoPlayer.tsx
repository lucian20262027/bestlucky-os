'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Clock,
  ExternalLink,
  Film,
  Plus,
  Trash2,
  Video as VideoIcon,
} from 'lucide-react';
import { getLocalMediaBlob } from '@/lib/media-db';
import {
  formatTimestamp,
  parseTimestampInput,
  parseVideoSource,
} from '@/lib/video-utils';
import { VideoTimestampNote } from '@/lib/types';

interface VideoPlayerProps {
  videoUrl?: string;
  localMediaId?: string;
  localMediaName?: string;
  timestamps?: VideoTimestampNote[];
  onChangeTimestamps?: (next: VideoTimestampNote[]) => void;
}

export function VideoPlayer({
  videoUrl,
  localMediaId,
  localMediaName,
  timestamps = [],
  onChangeTimestamps,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadingBlob, setLoadingBlob] = useState(false);
  const [timeInput, setTimeInput] = useState('');
  const [noteInput, setNoteInput] = useState('');

  useEffect(() => {
    let activeUrl: string | null = null;
    let cancelled = false;

    if (!localMediaId) {
      setBlobUrl(null);
      return;
    }

    setLoadingBlob(true);
    getLocalMediaBlob(localMediaId)
      .then((blob) => {
        if (cancelled) return;
        if (blob) {
          activeUrl = URL.createObjectURL(blob);
          setBlobUrl(activeUrl);
        } else {
          setBlobUrl(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingBlob(false);
      });

    return () => {
      cancelled = true;
      if (activeUrl) URL.revokeObjectURL(activeUrl);
    };
  }, [localMediaId]);

  const parsed = videoUrl ? parseVideoSource(videoUrl) : null;
  const hasNativeVideo = Boolean(blobUrl) || parsed?.provider === 'direct';
  const nativeSrc = blobUrl || (parsed?.provider === 'direct' ? parsed.embedUrl : undefined);

  const handleCaptureCurrentTime = () => {
    const sec = Math.floor(videoRef.current?.currentTime ?? 0);
    setTimeInput(formatTimestamp(sec));
  };

  const handleAddTimestamp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onChangeTimestamps || !noteInput.trim()) return;
    let sec = parseTimestampInput(timeInput);
    if (sec === null) {
      sec = Math.floor(videoRef.current?.currentTime ?? 0);
    }
    const next: VideoTimestampNote[] = [
      ...timestamps,
      {
        id: `ts-${Date.now()}`,
        timeSec: sec,
        label: noteInput.trim(),
      },
    ].sort((a, b) => a.timeSec - b.timeSec);
    onChangeTimestamps(next);
    setTimeInput('');
    setNoteInput('');
  };

  const seekTo = (sec: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = sec;
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <div className="space-y-3">
      {/* Player Surface */}
      {localMediaId ? (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-black">
          {loadingBlob ? (
            <div className="flex aspect-video items-center justify-center text-xs text-white/70">
              Loading local recording ({localMediaName || 'video'})...
            </div>
          ) : nativeSrc ? (
            <video
              ref={videoRef}
              src={nativeSrc}
              controls
              className="aspect-video w-full bg-black"
            />
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center p-6 text-center text-xs text-white/75">
              <Film className="mb-2 h-6 w-6 opacity-70" />
              Local recording not found in this browser&apos;s IndexedDB store. Re-upload the video file to play it here.
            </div>
          )}
        </div>
      ) : parsed && (parsed.provider === 'youtube' || parsed.provider === 'bilibili' || parsed.provider === 'loom' || parsed.provider === 'vimeo') ? (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-black">
          <iframe
            src={parsed.embedUrl}
            title={parsed.label}
            className="aspect-video w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : parsed?.provider === 'direct' && nativeSrc ? (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-black">
          <video
            ref={videoRef}
            src={nativeSrc}
            controls
            className="aspect-video w-full bg-black"
          />
        </div>
      ) : parsed?.originalUrl ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2.5 text-[var(--accent)]">
              <VideoIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[var(--ink-primary)]">
                {parsed.label}
              </div>
              <div className="max-w-md truncate font-mono text-[11px] text-[var(--ink-muted)]">
                {parsed.originalUrl}
              </div>
              {parsed.provider === 'lark' && (
                <div className="mt-0.5 text-[11px] text-[var(--ink-secondary)]">
                  飞书/Lark 链接出于安全策略禁止第三方页面内嵌，请在新标签页打开观看并同步在下方记录时间点笔记。
                </div>
              )}
            </div>
          </div>
          <a
            href={parsed.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--ink-primary)] px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90"
          >
            Open Video
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--canvas)]/60 p-6 text-center">
          <VideoIcon className="h-6 w-6 text-[var(--ink-muted)]" />
          <p className="mt-2 text-xs font-medium text-[var(--ink-secondary)]">
            No video or recording attached yet
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">
            Paste a YouTube / Bilibili / Loom / Lark Minutes URL or upload a local MP4/WebM self-practice recording.
          </p>
        </div>
      )}

      {/* Timestamped Notes */}
      {onChangeTimestamps && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--canvas)]/70 p-3.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-primary)]">
              <Clock className="h-3.5 w-3.5 text-[var(--accent)]" />
              Timestamped Review Notes ({timestamps.length})
            </span>
            {hasNativeVideo && (
              <button
                type="button"
                onClick={handleCaptureCurrentTime}
                className="rounded-md border border-[var(--border)] bg-white px-2 py-0.5 font-mono text-[10px] font-medium text-[var(--ink-secondary)] hover:text-[var(--accent)]"
              >
                Use Current Time
              </button>
            )}
          </div>

          {timestamps.length > 0 && (
            <div className="mt-2.5 space-y-1.5">
              {timestamps.map((ts) => (
                <div
                  key={ts.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => seekTo(ts.timeSec)}
                      className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--accent)] hover:bg-blue-100"
                      title={hasNativeVideo ? 'Seek video to timestamp' : 'Timestamp'}
                    >
                      {formatTimestamp(ts.timeSec)}
                    </button>
                    <span className="truncate text-[var(--ink-primary)]">{ts.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeTimestamps(timestamps.filter((item) => item.id !== ts.id))
                    }
                    className="shrink-0 text-[var(--ink-muted)] hover:text-rose-600"
                    title="Delete timestamp note"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddTimestamp} className="mt-2.5 flex flex-wrap gap-2">
            <input
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              placeholder="01:20"
              className="w-20 rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 font-mono text-xs focus:border-[var(--accent)] focus:outline-none"
            />
            <input
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Add note at this timestamp (e.g. Forgot CFO payback math)..."
              className="min-w-[180px] flex-1 rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs focus:border-[var(--accent)] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!noteInput.trim()}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--ink-primary)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Note
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
