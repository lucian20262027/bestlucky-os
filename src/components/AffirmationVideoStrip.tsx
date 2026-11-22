'use client';

import React, { useState } from 'react';
import { Edit3, Loader2, Sparkles, Upload, Video, X } from 'lucide-react';
import { VideoPlayer } from '@/components/VideoPlayer';
import { saveLocalMedia } from '@/lib/media-db';
import { AffirmationVideo } from '@/lib/types';

interface AffirmationVideoStripProps {
  videos: AffirmationVideo[];
  onSaveVideos: (videos: AffirmationVideo[]) => void;
}

export function AffirmationVideoStrip({
  videos,
  onSaveVideos,
}: AffirmationVideoStripProps) {
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<AffirmationVideo[]>(videos);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

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

  return (
    <section className="rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F3ECFF] text-[#6E32F5]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#111118]">
              Daily Affirmation &amp; Mindset Videos
            </h2>
            <p className="text-[11px] text-[#848494]">
              每天刷题前 1 分钟能量充电 · 支持 YouTube / Shorts 链接或本地视频上传同步
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openEditor}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#ECECF2] bg-[#FAFAFC] px-3 py-1.5 text-xs font-semibold text-[#111118] transition hover:border-[#6E32F5] hover:text-[#6E32F5]"
        >
          <Edit3 className="h-3.5 w-3.5" />
          Edit / Upload Videos
        </button>
      </div>

      {/* 3-Column Video Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {videos.slice(0, 3).map((vid, idx) => (
          <div
            key={vid.id}
            className="flex flex-col overflow-hidden rounded-2xl border border-[#EFEFF5] bg-[#FAFAFC] p-2.5 transition hover:border-[#6E32F5]/35 hover:bg-white hover:shadow-sm"
          >
            <VideoPlayer
              videoUrl={vid.videoUrl}
              localMediaId={vid.localMediaId}
            />
            <div className="mt-2.5 flex items-center justify-between gap-2 px-1">
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-[#111118]">
                  {vid.title || `Daily Affirmation #${idx + 1}`}
                </div>
                {vid.subtitle && (
                  <div className="truncate text-[11px] text-[#848494]">{vid.subtitle}</div>
                )}
              </div>
              <span className="shrink-0 rounded-md bg-[#F3ECFF] px-2 py-0.5 text-[10px] font-semibold text-[#6E32F5]">
                #{idx + 1}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Upload Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#ECECF2] pb-3">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-[#6E32F5]" />
                <h3 className="text-base font-semibold text-[#111118]">
                  管理首页 3 个 Affirmation 视频
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
