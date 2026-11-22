'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Edit3,
  ExternalLink,
  FileText,
  FileUp,
  Film,
  Loader2,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { useApp } from './AppProvider';
import { RoleMultiSelect } from './RoleMultiSelect';
import { VideoPlayer } from './VideoPlayer';
import { roleBadgeClasses } from '@/lib/helpers';
import { deleteLocalMedia, saveLocalMedia } from '@/lib/media-db';
import { ROLE_LIST, ROLES_BY_ID } from '@/lib/roles';
import { LibraryItem, LibraryItemType, RoleTrack } from '@/lib/types';

const TYPE_META: Record<
  LibraryItemType,
  { label: string; zh: string; badgeClass: string; icon: typeof Video }
> = {
  video: {
    label: 'Video Lesson',
    zh: '视频讲解',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: Video,
  },
  recording: {
    label: 'Mock Recording',
    zh: '自测录像',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: Film,
  },
  guide: {
    label: 'Study Guide',
    zh: '课程指南',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: BookOpen,
  },
  'lark-doc': {
    label: 'Lark Synced Doc',
    zh: '飞书同步笔记',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: FileText,
  },
};

export function LibraryPanel({
  onSwitchToImport,
}: {
  onSwitchToImport?: () => void;
}) {
  const { state, upsertLibraryItem, deleteLibraryItem, toggleLibraryFavorite } = useApp();
  const [roleFilters, setRoleFilters] = useState<RoleTrack[]>([]);
  const [typeFilter, setTypeFilter] = useState<LibraryItemType | 'all'>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);

  // Modal form fields
  const [formType, setFormType] = useState<LibraryItemType>('video');
  const [formTitle, setFormTitle] = useState('');
  const [formRoles, setFormRoles] = useState<RoleTrack[]>(['fde']);
  const [formSummary, setFormSummary] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formSourceUrl, setFormSourceUrl] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formLocalMediaId, setFormLocalMediaId] = useState<string | undefined>(undefined);
  const [formLocalMediaName, setFormLocalMediaName] = useState<string | undefined>(undefined);
  const [uploadingFile, setUploadingFile] = useState(false);

  const toggleFilterRole = (r: RoleTrack) => {
    setRoleFilters((prev) =>
      prev.includes(r) ? prev.filter((item) => item !== r) : [...prev, r]
    );
  };

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.libraryItems.filter((item) => {
      if (roleFilters.length > 0) {
        const itemRoles = [item.role, ...(item.secondaryRoles ?? [])];
        if (!roleFilters.some((rf) => itemRoles.includes(rf))) return false;
      }
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (onlyFavorites && !item.isFavorite) return false;
      if (q) {
        const hay = `${item.title} ${item.summary} ${item.contentMarkdown} ${item.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [state.libraryItems, roleFilters, typeFilter, onlyFavorites, search]);

  const activeItem = useMemo(() => {
    if (selectedId) {
      const found = filteredItems.find((i) => i.id === selectedId);
      if (found) return found;
    }
    return filteredItems[0] ?? null;
  }, [filteredItems, selectedId]);

  const openModal = (item?: LibraryItem) => {
    if (item) {
      setEditingItem(item);
      setFormType(item.type);
      setFormTitle(item.title);
      const combined = Array.from(
        new Set<RoleTrack>([item.role, ...(item.secondaryRoles ?? [])])
      );
      setFormRoles(combined.length > 0 ? combined : ['fde']);
      setFormSummary(item.summary);
      setFormContent(item.contentMarkdown);
      setFormVideoUrl(item.videoUrl ?? '');
      setFormSourceUrl(item.sourceUrl ?? '');
      setFormTags(item.tags.join(', '));
      setFormLocalMediaId(item.localMediaId);
      setFormLocalMediaName(item.localMediaName);
    } else {
      setEditingItem(null);
      setFormType('video');
      setFormTitle('');
      setFormRoles(roleFilters.length > 0 ? roleFilters : ['fde']);
      setFormSummary('');
      setFormContent('');
      setFormVideoUrl('');
      setFormSourceUrl('');
      setFormTags('');
      setFormLocalMediaId(undefined);
      setFormLocalMediaName(undefined);
    }
    setModalOpen(true);
  };

  const handleUploadMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const saved = await saveLocalMedia(file);
      setFormLocalMediaId(saved.id);
      setFormLocalMediaName(saved.name);
      if (!formTitle.trim()) {
        setFormTitle(file.name.replace(/\.[^.]+$/, ''));
      }
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    const nowISO = new Date().toISOString();
    const tags = formTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const primaryRole = formRoles[0] ?? 'fde';
    const secondaryRoles = formRoles.slice(1);

    const newItem: LibraryItem = {
      id: editingItem?.id ?? `lib-${Date.now()}`,
      type: formType,
      title: formTitle.trim(),
      role: primaryRole,
      secondaryRoles,
      tags: tags.length > 0 ? tags : formRoles.map((r) => ROLES_BY_ID[r].shortLabel),
      summary: formSummary.trim() || formContent.trim().slice(0, 140),
      contentMarkdown: formContent.trim(),
      videoUrl: formVideoUrl.trim() || undefined,
      localMediaId: formLocalMediaId,
      localMediaName: formLocalMediaName,
      sourceUrl: formSourceUrl.trim() || undefined,
      durationLabel: formLocalMediaId ? 'Local Recording' : formVideoUrl ? 'Video' : 'Guide',
      timestamps: editingItem?.timestamps ?? [],
      isFavorite: editingItem?.isFavorite ?? false,
      createdAt: editingItem?.createdAt ?? nowISO,
      updatedAt: nowISO,
    };

    upsertLibraryItem(newItem);
    setSelectedId(newItem.id);
    setModalOpen(false);
  };

  const handleDelete = async (item: LibraryItem) => {
    if (item.localMediaId) {
      await deleteLocalMedia(item.localMediaId);
    }
    deleteLibraryItem(item.id);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#111118]">
            Content &amp; Video Library ({state.libraryItems.length})
          </h2>
          <p className="text-xs text-[#525260]">
            管理你上传的本地模拟录像、YouTube/B站/Loom/飞书妙记视频链接，以及飞书导入的长文档，支持多岗位筛选与时间轴笔记。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onSwitchToImport ? (
            <button
              type="button"
              onClick={onSwitchToImport}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#ECECF2] bg-white px-3.5 py-2 text-xs font-semibold text-[#111118] hover:border-[#6E32F5]"
            >
              <FileUp className="h-3.5 w-3.5 text-[#6E32F5]" />
              Lark Import
            </button>
          ) : (
            <Link
              href="/stories?tab=import"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#ECECF2] bg-white px-3.5 py-2 text-xs font-semibold text-[#111118] hover:border-[#6E32F5]"
            >
              <FileUp className="h-3.5 w-3.5 text-[#6E32F5]" />
              Lark Import
            </Link>
          )}
          <button
            type="button"
            onClick={() => openModal()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white hover:opacity-95"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Video / Guide / Recording
          </button>
        </div>
      </div>

      {/* Multi-select Role Pills + Filters */}
      <div className="space-y-3 rounded-2xl border border-[#ECECF2] bg-white p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setRoleFilters([])}
            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
              roleFilters.length === 0
                ? 'border-[#111118] bg-[#111118] text-white'
                : 'border-[#ECECF2] bg-[#FAFAFC] text-[#525260]'
            }`}
          >
            All Roles
          </button>
          {ROLE_LIST.map((r) => {
            const active = roleFilters.includes(r.id);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => toggleFilterRole(r.id)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                  active
                    ? 'border-[#6E32F5] bg-[#6E32F5] text-white'
                    : 'border-[#ECECF2] bg-white text-[#525260] hover:border-[#D4C5FD]'
                }`}
              >
                {r.shortLabel}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F0F0F5] pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as LibraryItemType | 'all')}
              className="rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs focus:outline-none"
            >
              <option value="all">All Content Types</option>
              {Object.entries(TYPE_META).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label} ({v.zh})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setOnlyFavorites((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                onlyFavorites
                  ? 'border-amber-300 bg-amber-50 text-amber-800'
                  : 'border-[#ECECF2] bg-white text-[#525260]'
              }`}
            >
              <Star className="h-3.5 w-3.5" />
              Starred
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-[#848494]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search videos, links, notes..."
              className="w-full rounded-lg border border-[#ECECF2] bg-[#FAFAFC] py-1.5 pl-8 pr-3 text-xs focus:border-[#6E32F5] focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Split Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-5">
          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-[#ECECF2] bg-white p-8 text-center text-xs text-[#848494]">
              No items match your filters. Click &ldquo;Add Video / Guide / Recording&rdquo; above!
            </div>
          ) : (
            filteredItems.map((item) => {
              const meta = TYPE_META[item.type];
              const Icon = meta.icon;
              const isSelected = activeItem?.id === item.id;
              const itemRoles = [item.role, ...(item.secondaryRoles ?? [])];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? 'border-[#6E32F5] bg-white ring-2 ring-[#6E32F5]/15'
                      : 'border-[#ECECF2] bg-white hover:border-[#D4C5FD]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${meta.badgeClass}`}
                      >
                        <Icon className="h-2.5 w-2.5" />
                        {meta.label}
                      </span>
                      {itemRoles.map((r) => (
                        <span
                          key={r}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${roleBadgeClasses(
                            r
                          )}`}
                        >
                          {ROLES_BY_ID[r]?.shortLabel ?? r}
                        </span>
                      ))}
                    </div>
                    {item.isFavorite && (
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                    )}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-[#111118]">{item.title}</div>
                  <p className="mt-1 line-clamp-2 text-xs text-[#525260]">{item.summary}</p>
                </button>
              );
            })
          )}
        </div>

        <div className="lg:col-span-7">
          {activeItem ? (
            <div className="space-y-5 rounded-2xl border border-[#ECECF2] bg-white p-6 shadow-2xs">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ECECF2] pb-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${
                        TYPE_META[activeItem.type].badgeClass
                      }`}
                    >
                      {TYPE_META[activeItem.type].label}
                    </span>
                    {[activeItem.role, ...(activeItem.secondaryRoles ?? [])].map((r) => (
                      <span
                        key={r}
                        className={`rounded px-2 py-0.5 text-[11px] font-semibold ${roleBadgeClasses(
                          r
                        )}`}
                      >
                        {ROLES_BY_ID[r]?.shortLabel ?? r}
                      </span>
                    ))}
                    {activeItem.sourceUrl && (
                      <a
                        href={activeItem.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#6E32F5] hover:underline"
                      >
                        Open Original Lark Doc <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <h2 className="mt-2 text-lg font-semibold text-[#111118]">
                    {activeItem.title}
                  </h2>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleLibraryFavorite(activeItem.id)}
                    className={`rounded-lg border p-2 ${
                      activeItem.isFavorite
                        ? 'border-amber-300 bg-amber-50 text-amber-600'
                        : 'border-[#ECECF2] text-[#848494] hover:text-amber-600'
                    }`}
                  >
                    <Star
                      className={`h-4 w-4 ${activeItem.isFavorite ? 'fill-amber-400' : ''}`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => openModal(activeItem)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#ECECF2] px-3 py-2 text-xs font-medium text-[#111118] hover:bg-[#FAFAFC]"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(activeItem)}
                    className="rounded-lg border border-[#ECECF2] p-2 text-[#848494] hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {(activeItem.type === 'video' ||
                activeItem.type === 'recording' ||
                activeItem.videoUrl ||
                activeItem.localMediaId) && (
                <VideoPlayer
                  videoUrl={activeItem.videoUrl}
                  localMediaId={activeItem.localMediaId}
                  localMediaName={activeItem.localMediaName}
                  timestamps={activeItem.timestamps}
                  onChangeTimestamps={(nextTs) =>
                    upsertLibraryItem({
                      ...activeItem,
                      timestamps: nextTs,
                      updatedAt: new Date().toISOString(),
                    })
                  }
                />
              )}

              <div>
                <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#525260]">
                  <span>Study Notes &amp; Breakdown (Auto-saved)</span>
                  <span className="font-mono text-[10px] text-[#848494]">
                    Markdown supported
                  </span>
                </div>
                <textarea
                  rows={11}
                  value={activeItem.contentMarkdown}
                  onChange={(e) =>
                    upsertLibraryItem({
                      ...activeItem,
                      contentMarkdown: e.target.value,
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  placeholder="Write your detailed study notes, frameworks, or video key takeaways here..."
                  className="w-full rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-4 font-mono text-[12.5px] leading-relaxed text-[#111118] focus:border-[#6E32F5] focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#ECECF2] bg-white p-12 text-center text-sm text-[#848494]">
              Select a video or study guide on the left, or create a new one.
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]">
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-[#ECECF2] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#ECECF2] px-6 py-4">
              <h2 className="text-base font-semibold text-[#111118]">
                {editingItem ? 'Edit Content / Video Item' : 'Add Video, Recording, or Study Guide'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-[#848494] hover:bg-[#FAFAFC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleSaveModal}
              className="flex-1 space-y-4 overflow-y-auto px-6 py-5"
            >
              <div>
                <label className="block text-xs font-medium text-[#525260]">Content Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as LibraryItemType)}
                  className="mt-1 w-full rounded-lg border border-[#ECECF2] bg-white px-2.5 py-2 text-xs focus:outline-none"
                >
                  {Object.entries(TYPE_META).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label} ({v.zh})
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-3">
                <RoleMultiSelect
                  label="Role Tracks"
                  selected={formRoles}
                  onChange={setFormRoles}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#525260]">Title *</label>
                <input
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., Palantir FDE Mock Walkthrough / My 60s Pitch Recording"
                  className="mt-1 w-full rounded-lg border border-[#ECECF2] px-3 py-2 text-xs focus:border-[#6E32F5] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#525260]">
                  Video Link (YouTube, Bilibili, Loom, Vimeo, Lark Minutes)
                </label>
                <input
                  value={formVideoUrl}
                  onChange={(e) => setFormVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or https://www.bilibili.com/video/BV..."
                  className="mt-1 w-full rounded-lg border border-[#ECECF2] px-3 py-2 text-xs focus:border-[#6E32F5] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#525260]">
                  Or Upload Local Video / Audio Recording (Stored in Browser IndexedDB)
                </label>
                <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#D4C5FD] bg-[#FAF9FF] px-4 py-3 text-xs font-medium text-[#6E32F5] hover:bg-[#F3ECFF]">
                  {uploadingFile ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span>
                    {formLocalMediaName
                      ? `Attached: ${formLocalMediaName}`
                      : 'Click to choose MP4, WebM, MOV, or M4A recording...'}
                  </span>
                  <input
                    type="file"
                    accept="video/*,audio/*"
                    onChange={handleUploadMedia}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#525260]">
                  Short Summary
                </label>
                <input
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  placeholder="1-sentence takeaway..."
                  className="mt-1 w-full rounded-lg border border-[#ECECF2] px-3 py-2 text-xs focus:border-[#6E32F5] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#525260]">
                  Detailed Notes / Transcript / Course Outline
                </label>
                <textarea
                  rows={4}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Markdown notes, key frameworks, or self-critique..."
                  className="mt-1 w-full rounded-lg border border-[#ECECF2] p-3 text-xs leading-relaxed focus:border-[#6E32F5] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#525260]">
                    Tags (Comma-separated)
                  </label>
                  <input
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="FDE, System Design, Video"
                    className="mt-1 w-full rounded-lg border border-[#ECECF2] px-3 py-2 text-xs focus:border-[#6E32F5] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#525260]">
                    Source Doc URL (Optional)
                  </label>
                  <input
                    value={formSourceUrl}
                    onChange={(e) => setFormSourceUrl(e.target.value)}
                    placeholder="https://...larksuite.com/docx/..."
                    className="mt-1 w-full rounded-lg border border-[#ECECF2] px-3 py-2 text-xs focus:border-[#6E32F5] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#ECECF2] pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-[#ECECF2] px-4 py-2 text-xs font-medium text-[#525260]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white"
                >
                  Save to Library
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
