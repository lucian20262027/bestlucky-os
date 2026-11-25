'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Upload, Video, X } from 'lucide-react';
import { useApp } from './AppProvider';
import { RoleMultiSelect } from './RoleMultiSelect';
import { inferQuestionCategory, QUESTION_CATEGORIES } from '@/lib/helpers';
import { saveLocalMedia } from '@/lib/media-db';
import { ROLES_BY_ID, ROUND_LABELS } from '@/lib/roles';
import {
  Difficulty,
  InterviewQuestion,
  QuestionCategory,
  QuestionUserNotes,
  RoleTrack,
  RoundType,
} from '@/lib/types';

interface QuestionModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (question: InterviewQuestion, initialNotes?: Partial<QuestionUserNotes>) => void;
  defaultRole?: RoleTrack;
  initialQuestion?: InterviewQuestion | null;
  initialNotes?: QuestionUserNotes;
}

export function QuestionModal({
  open,
  onClose,
  onSave,
  defaultRole = 'fde',
  initialQuestion = null,
  initialNotes,
}: QuestionModalProps) {
  const { state } = useApp();
  const categoriesList =
    state.customCategories && state.customCategories.length > 0
      ? state.customCategories
      : QUESTION_CATEGORIES;
  const [title, setTitle] = useState('');
  const [roles, setRoles] = useState<RoleTrack[]>([defaultRole]);
  const [round, setRound] = useState<RoundType>('decomposition');
  const [secondaryRounds, setSecondaryRounds] = useState<RoundType[]>([]);
  const [category, setCategory] = useState<QuestionCategory>('success-stories');
  const [difficulty, setDifficulty] = useState<Difficulty>('senior');
  const [companyStyle, setCompanyStyle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [zhHint, setZhHint] = useState('');
  const [myAnswer, setMyAnswer] = useState('');
  const [modelAnswer, setModelAnswer] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [localMediaId, setLocalMediaId] = useState<string | undefined>(undefined);
  const [localMediaName, setLocalMediaName] = useState<string | undefined>(undefined);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [stepsText, setStepsText] = useState('');
  const [probesText, setProbesText] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    if (initialQuestion) {
      setTitle(initialQuestion.title);
      const combined = Array.from(
        new Set<RoleTrack>([initialQuestion.role, ...(initialQuestion.secondaryRoles ?? [])])
      );
      setRoles(combined.length > 0 ? combined : [defaultRole]);
      setRound(initialQuestion.round);
      setSecondaryRounds(initialQuestion.secondaryRounds ?? []);
      setCategory(initialQuestion.category ?? inferQuestionCategory(initialQuestion));
      setDifficulty(initialQuestion.difficulty);
      setCompanyStyle(initialQuestion.companyStyle);
      setPrompt(initialQuestion.prompt);
      setZhHint(initialQuestion.promptZhHint);
      setStepsText(initialQuestion.frameworkSteps.join('\n'));
      setProbesText(initialQuestion.followUpProbes.join('\n'));
      setMyAnswer(initialNotes?.myAnswer ?? '');
      setModelAnswer(initialNotes?.modelAnswer ?? initialQuestion.modelAnswer ?? '');
      setVideoUrl(initialNotes?.videoUrl ?? initialQuestion.videoUrl ?? '');
      setLocalMediaId(initialNotes?.localMediaId ?? initialQuestion.localMediaId);
      setLocalMediaName(initialNotes?.localMediaName);
    } else {
      setTitle('');
      setRoles([defaultRole]);
      setRound('decomposition');
      setSecondaryRounds([]);
      setDifficulty('senior');
      setCompanyStyle('');
      setPrompt('');
      setZhHint('');
      setMyAnswer('');
      setModelAnswer('');
      setVideoUrl('');
      setLocalMediaId(undefined);
      setLocalMediaName(undefined);
      setStepsText('');
      setProbesText('');
    }
  }, [open, initialQuestion, initialNotes, defaultRole]);

  if (!open) return null;

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    try {
      const saved = await saveLocalMedia(file);
      setLocalMediaId(saved.id);
      setLocalMediaName(saved.name);
      if (saved.cloudUrl) {
        setVideoUrl(saved.cloudUrl);
      }
    } finally {
      setUploadingVideo(false);
      e.target.value = '';
    }
  };

  const toggleSecondaryRound = (r: RoundType) => {
    if (r === round) return;
    setSecondaryRounds((prev) =>
      prev.includes(r) ? prev.filter((item) => item !== r) : [...prev, r]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !prompt.trim()) return;
    const primaryRole = roles[0] ?? defaultRole;
    const secondaryRoles = roles.slice(1);
    const roleCfg = ROLES_BY_ID[primaryRole];
    const parsedSteps = stepsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const parsedProbes = probesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const savedQuestion: InterviewQuestion = {
      id: initialQuestion?.id ?? `user-q-${Date.now()}`,
      role: primaryRole,
      secondaryRoles,
      round,
      secondaryRounds: secondaryRounds.filter((r) => r !== round),
      category,
      difficulty,
      timeLimitMin: initialQuestion?.timeLimitMin ?? 30,
      companyStyle: companyStyle.trim() || `${roleCfg.shortLabel} Personal Bank`,
      title: title.trim(),
      prompt: prompt.trim(),
      promptZhHint:
        zhHint.trim() || `【自定义题目】围绕 ${roles.map((r) => ROLES_BY_ID[r].shortLabel).join(' / ')} 核心能力拆解并量化指标。`,
      frameworkSteps:
        parsedSteps.length > 0 ? parsedSteps : roleCfg.defaultScratchpadSections,
      strongHireSignals: initialQuestion?.strongHireSignals ?? [
        'Clarifies scope, constraints, and buyer/user success criteria upfront.',
        'Quantifies trade-offs, risks, and measurable guardrails.',
      ],
      redFlags: initialQuestion?.redFlags ?? [
        'Generic unstructured brainstorming without metrics or trade-offs.',
      ],
      followUpProbes:
        parsedProbes.length > 0
          ? parsedProbes
          : [
              'What is your contingency plan if your primary constraint changes mid-execution?',
              'Deliver a 45-second Pyramid Principle executive summary.',
            ],
      modelAnswer: modelAnswer.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
      localMediaId,
      isCustom: true,
      createdAt: initialQuestion?.createdAt ?? new Date().toISOString(),
    };

    onSave(savedQuestion, {
      myAnswer: myAnswer.trim(),
      modelAnswer: modelAnswer.trim(),
      videoUrl: videoUrl.trim(),
      localMediaId,
      localMediaName,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-[#ECECF2] bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ECECF2] px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-[#111118]">
              {initialQuestion
                ? 'Edit Question, Answer & Video'
                : 'Add Interview Question, Answer & Video'}
            </h2>
            <p className="text-xs text-[#848494]">
              支持多选 Role Track、丰富面试轮次（Phone Screen / HM / Technical / Loops / XFN），以及答案与视频挂载
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#848494] hover:bg-[#F5F5FA]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <label className="block text-xs font-medium text-[#525260]">Title *</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Introduce yourself / Palantir FDE Decomposition"
              className="mt-1 w-full rounded-lg border border-[#ECECF2] px-3 py-2 text-sm focus:border-[#6E32F5] focus:outline-none"
            />
          </div>

          {/* Multi-select Role Tracks */}
          <div className="rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-3">
            <RoleMultiSelect
              label="Role Tracks"
              selected={roles}
              onChange={setRoles}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-[#525260]">
                Primary Round Type
              </label>
              <select
                value={round}
                onChange={(e) => setRound(e.target.value as RoundType)}
                className="mt-1 w-full rounded-lg border border-[#ECECF2] bg-white px-2.5 py-2 text-xs focus:border-[#6E32F5] focus:outline-none"
              >
                {Object.entries(ROUND_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.en} ({v.zh})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#525260]">
                Question Category (问题大类)
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as QuestionCategory)}
                className="mt-1 w-full rounded-lg border border-[#ECECF2] bg-white px-2.5 py-2 text-xs focus:border-[#6E32F5] focus:outline-none"
              >
                {categoriesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#525260]">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="mt-1 w-full rounded-lg border border-[#ECECF2] bg-white px-2.5 py-2 text-xs focus:border-[#6E32F5] focus:outline-none"
              >
                <option value="core">Core</option>
                <option value="senior">Senior</option>
                <option value="staff">Staff / Principal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#525260]">
                Company / Source
              </label>
              <input
                value={companyStyle}
                onChange={(e) => setCompanyStyle(e.target.value)}
                placeholder="OpenAI / McKinsey"
                className="mt-1 w-full rounded-lg border border-[#ECECF2] px-2.5 py-2 text-xs focus:border-[#6E32F5] focus:outline-none"
              />
            </div>
          </div>

          {/* Optional extra round tags */}
          <div>
            <div className="mb-1 text-[11px] font-medium text-[#848494]">
              Also applicable to rounds (可选附加轮次标签):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(
                ['phone-screen', 'hiring-manager', 'round-1', 'technical', 'xfn', 'loops'] as RoundType[]
              ).map((r) => {
                const active = r === round || secondaryRounds.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    disabled={r === round}
                    onClick={() => toggleSecondaryRound(r)}
                    className={`rounded-md border px-2 py-0.5 text-[10px] font-medium transition ${
                      active
                        ? 'border-[#6E32F5] bg-[#F3ECFF] text-[#6E32F5]'
                        : 'border-[#ECECF2] bg-white text-[#525260] hover:border-[#D4C5FD]'
                    }`}
                  >
                    {ROUND_LABELS[r].en}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-[#525260]">Question Prompt *</label>
              <span className="text-[11px] text-[#848494]">支持换行与空行分段</span>
            </div>
            <textarea
              required
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Paste the exact interview question or case prompt..."
              className="mt-1 w-full resize-y rounded-xl border border-[#ECECF2] px-3.5 py-2.5 text-xs leading-relaxed focus:border-[#6E32F5] focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-[#525260]">
                Model / Reference Answer (高分范文 / 标准答案)
              </label>
              <span className="text-[11px] text-[#848494]">
                全宽大编辑区 · 支持空行分段与 Markdown 要点，可拖拽右下角调高
              </span>
            </div>
            <textarea
              rows={10}
              value={modelAnswer}
              onChange={(e) => setModelAnswer(e.target.value)}
              placeholder="Write or paste the reference answer, key numbers, or structure..."
              className="mt-1 w-full resize-y rounded-xl border border-[#ECECF2] bg-[#FAFAFC]/60 px-3.5 py-2.5 text-xs leading-relaxed focus:border-[#6E32F5] focus:bg-white focus:outline-none"
            />
          </div>

          {/* Video Attachment */}
          <div className="rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#111118]">
              <Video className="h-3.5 w-3.5 text-[#6E32F5]" />
              Attach Video Walkthrough or Self-Practice Recording (Optional)
            </div>
            <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="YouTube / Bilibili / Loom / Lark Minutes URL..."
                className="rounded-lg border border-[#ECECF2] bg-white px-3 py-2 text-xs focus:border-[#6E32F5] focus:outline-none"
              />
              <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#D4C5FD] bg-white px-3 py-2 text-xs font-medium text-[#6E32F5] hover:bg-[#F3ECFF]">
                {uploadingVideo ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                <span className="truncate">
                  {localMediaName ? `Uploaded: ${localMediaName}` : 'Upload Local MP4 / WebM / MOV'}
                </span>
                <input
                  type="file"
                  accept="video/*,audio/*"
                  onChange={handleVideoFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[#525260]">
                Bilingual Hint (Optional)
              </label>
              <input
                value={zhHint}
                onChange={(e) => setZhHint(e.target.value)}
                placeholder="【中文提示】核心考察点..."
                className="mt-1 w-full rounded-lg border border-[#ECECF2] px-3 py-2 text-xs focus:border-[#6E32F5] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#525260]">
                Framework Steps (One per line, optional)
              </label>
              <textarea
                rows={2}
                value={stepsText}
                onChange={(e) => setStepsText(e.target.value)}
                placeholder="1. Clarify constraints&#10;2. Propose slice..."
                className="mt-1 w-full rounded-lg border border-[#ECECF2] px-3 py-2 text-xs focus:border-[#6E32F5] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#525260]">
              Follow-Up Probes (One per line, optional)
            </label>
            <textarea
              rows={2}
              value={probesText}
              onChange={(e) => setProbesText(e.target.value)}
              placeholder="What breaks if latency spikes?..."
              className="mt-1 w-full rounded-lg border border-[#ECECF2] px-3 py-2 text-xs focus:border-[#6E32F5] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-[#ECECF2] pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#ECECF2] px-4 py-2 text-xs font-medium text-[#525260] hover:bg-[#FAFAFC]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white hover:opacity-95"
            >
              {initialQuestion ? 'Save Changes' : 'Save to Question Bank'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
