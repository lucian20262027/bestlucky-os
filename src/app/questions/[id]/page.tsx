'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  FileText,
  Film,
  Loader2,
  Play,
  Plus,
  Rocket,
  Sparkles,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { QuestionModal } from '@/components/QuestionModal';
import { RichAnswerEditor } from '@/components/RichAnswerEditor';
import { TypographyPicker } from '@/components/TypographyPicker';
import { VideoPlayer } from '@/components/VideoPlayer';
import { VoiceCoachPanel } from '@/components/VoiceCoachPanel';
import { requestInterviewerTurn } from '@/lib/ai-client';
import { getQuestionById, getQuestionStatus, roleBadgeClasses } from '@/lib/helpers';
import { saveLocalMedia } from '@/lib/media-db';
import { ROLES_BY_ID, ROUND_LABELS } from '@/lib/roles';
import {
  DEFAULT_BODY_STYLE,
  DEFAULT_HERO_STYLE,
  DEFAULT_SUBSECTION_STYLE,
  getTypographyClasses,
  getTypographyStyle,
} from '@/lib/typography';
import {
  CustomAnswerBlock,
  QuestionStatus,
  QuestionUserNotes,
} from '@/lib/types';

function estimateSpeakingTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const cjkChars = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const totalUnits = words + cjkChars * 0.5;
  if (totalUnits === 0) return '0s';
  const secs = Math.round((totalUnits / 135) * 60);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `~${m}m ${s}s` : `~${s}s`;
}

function QuestionStudyContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? decodeURIComponent(params.id) : '';

  const {
    state,
    mounted,
    updateQuestionNotes,
    updateCustomQuestion,
    deleteCustomQuestion,
    setQuestionProgress,
  } = useApp();

  const question = useMemo(() => getQuestionById(state, id), [state, id]);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'model' | 'my' | 'pitch' | 'notes'>('model');
  const [showVideoAttach, setShowVideoAttach] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});
  const [answerSaved, setAnswerSaved] = useState(false);

  if (!mounted) {
    return (
      <div className="flex h-[65vh] items-center justify-center text-sm text-[#848494]">
        Loading Question Studio...
      </div>
    );
  }

  if (!question) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-lg font-semibold text-[#111118]">Question Not Found</h1>
        <p className="mt-2 text-sm text-[#525260]">
          This question ID was not found in your local bank.
        </p>
        <Link
          href="/questions"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Question Bank
        </Link>
      </div>
    );
  }

  const roleCfg = ROLES_BY_ID[question.role];
  const status = getQuestionStatus(state, question.id);
  const notes: QuestionUserNotes = state.questionNotes[question.id] ?? {
    myAnswer: '',
    modelAnswer: question.modelAnswer ?? '',
    pitch60s: '',
    personalNotes: '',
    videoUrl: question.videoUrl ?? '',
    localMediaId: question.localMediaId,
    sourceUrl: question.sourceUrl,
    updatedAt: '',
  };

  const displayTitle = notes.customTitle?.trim() || question.title;
  const displayPrompt = notes.customPrompt?.trim() || question.prompt;
  const titleStyle = notes.titleStyle ?? DEFAULT_HERO_STYLE;
  const answerStyle = notes.answerStyle ?? DEFAULT_BODY_STYLE;
  const customBlocks = notes.customBlocks ?? [];
  const isPublished = notes.published ?? true;
  const hasVideo = Boolean(notes.videoUrl || notes.localMediaId);

  const handleTogglePublish = () => {
    if (editMode) {
      updateQuestionNotes(question.id, {
        published: true,
        customBlocks: customBlocks.map((b) => ({ ...b, published: true })),
      });
      setEditMode(false);
    } else {
      setEditMode(true);
    }
  };

  const handleUploadLocalVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    try {
      const saved = await saveLocalMedia(file);
      updateQuestionNotes(question.id, {
        localMediaId: saved.id,
        localMediaName: saved.name,
        ...(saved.cloudUrl ? { videoUrl: saved.cloudUrl } : {}),
      });
      setShowVideoAttach(false);
    } finally {
      setUploadingVideo(false);
      e.target.value = '';
    }
  };

  const handleSaveVideoUrl = (e: React.FormEvent) => {
    e.preventDefault();
    updateQuestionNotes(question.id, { videoUrl: videoUrlInput.trim() });
    setShowVideoAttach(false);
  };

  const handleAddCustomBlock = (kind: CustomAnswerBlock['kind']) => {
    const labelMap: Record<CustomAnswerBlock['kind'], string> = {
      qa: 'Follow-Up Sub-Question (补充子问题)',
      text: 'My Written Answer / Key Takeaway (文字答案)',
      video: 'Video Answer Walkthrough (视频回答)',
    };
    const newBlock: CustomAnswerBlock = {
      id: `blk-${Date.now()}`,
      kind,
      heading: labelMap[kind],
      body: '',
      videoUrl: '',
      headingStyle: DEFAULT_SUBSECTION_STYLE,
      bodyStyle: DEFAULT_BODY_STYLE,
      published: false,
      updatedAt: new Date().toISOString(),
    };
    updateQuestionNotes(question.id, {
      customBlocks: [...customBlocks, newBlock],
    });
    setEditMode(true);
  };

  const updateBlock = (blockId: string, patch: Partial<CustomAnswerBlock>) => {
    updateQuestionNotes(question.id, {
      customBlocks: customBlocks.map((b) =>
        b.id === blockId
          ? { ...b, ...patch, updatedAt: new Date().toISOString() }
          : b
      ),
    });
  };

  const moveBlock = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= customBlocks.length) return;
    const copy = [...customBlocks];
    const [picked] = copy.splice(idx, 1);
    copy.splice(nextIdx, 0, picked);
    updateQuestionNotes(question.id, { customBlocks: copy });
  };

  const handleUploadBlockVideo = async (
    blockId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBlockId(blockId);
    try {
      const saved = await saveLocalMedia(file);
      updateBlock(blockId, {
        localMediaId: saved.id,
        localMediaName: saved.name,
        ...(saved.cloudUrl ? { videoUrl: saved.cloudUrl } : {}),
      });
    } finally {
      setUploadingBlockId(null);
      e.target.value = '';
    }
  };

  const handleGenerateModelAnswer = async () => {
    if (generatingAi) return;
    setGeneratingAi(true);
    try {
      if (state.aiSettings.geminiApiKey.trim()) {
        const res = await requestInterviewerTurn(
          {
            question,
            persona: 'coach',
            messages: [
              {
                id: 'gen-req',
                sender: 'candidate',
                text: `Please write a crisp Strong Hire model answer outline covering all steps (${question.frameworkSteps.join(' | ')}) and key metrics/trade-offs for this ${roleCfg.shortLabel} prompt.`,
                timestamp: new Date().toISOString(),
              },
            ],
            scratchpad: notes.myAnswer || notes.personalNotes,
            diagramSummary: '',
          },
          state.aiSettings
        );
        const generated = `### Strong Hire Model Answer (${roleCfg.shortLabel})\n${res.data.reply}\n\n**Key Signals Covered:**\n${question.strongHireSignals.map((s) => `- ${s}`).join('\n')}`;
        updateQuestionNotes(question.id, { modelAnswer: generated });
      } else {
        const template = `### Strong Hire Reference Structure (${roleCfg.shortLabel} · ${ROUND_LABELS[question.round].en})

**1. Upfront Scope & Constraints (First 30s)**
- ${question.frameworkSteps[0] ?? 'Clarify buyer, hard SLA, security boundary, and timeline.'}

**2. Core Architecture / Execution Plan**
${question.frameworkSteps.slice(1).map((st, idx) => `- **Step ${idx + 2}**: ${st}`).join('\n')}

**3. High-Signal Metrics & Guardrails**
${question.strongHireSignals.map((s) => `- ✓ ${s}`).join('\n')}

**4. Red Flags Avoided**
${question.redFlags.map((r) => `- Avoid: ${r}`).join('\n')}`;
        updateQuestionNotes(question.id, { modelAnswer: template });
      }
      setActiveTab('model');
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleDeleteCustom = () => {
    deleteCustomQuestion(question.id);
    router.push('/questions');
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb + Edit/Publish + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/questions"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#ECECF2] bg-white px-3 py-1.5 text-xs font-medium text-[#525260] hover:text-[#111118]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Questions
          </Link>
          <Link
            href={`/courses/${question.role}`}
            className="inline-flex items-center gap-1 rounded-xl border border-[#ECECF2] bg-white px-3 py-1.5 text-xs font-medium text-[#6E32F5] hover:bg-[#F3ECFF]"
          >
            {roleCfg.shortLabel} Course
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Switcher */}
          <div className="flex rounded-xl border border-[#ECECF2] bg-white p-1">
            {(
              [
                { id: 'unpracticed', label: 'Unpracticed' },
                { id: 'needs_drill', label: 'Needs Drill' },
                { id: 'mastered', label: 'Mastered' },
              ] as { id: QuestionStatus; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  setQuestionProgress(question.id, {
                    status: opt.id,
                    lastPracticedAt: new Date().toISOString(),
                  })
                }
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                  status === opt.id
                    ? opt.id === 'mastered'
                      ? 'bg-emerald-600 text-white'
                      : opt.id === 'needs_drill'
                        ? 'bg-amber-500 text-white'
                        : 'bg-[#111118] text-white'
                    : 'text-[#525260] hover:text-[#111118]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              editMode
                ? 'bg-amber-50 text-amber-800'
                : isPublished
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-[#F5F5FA] text-[#525260]'
            }`}
          >
            {editMode ? 'Editing' : 'Published'}
          </span>

          <button
            type="button"
            onClick={handleTogglePublish}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              editMode
                ? 'bg-[#6E32F5] text-white shadow-xs hover:opacity-95'
                : 'border border-[#ECECF2] bg-white text-[#111118] hover:border-[#6E32F5] hover:text-[#6E32F5]'
            }`}
          >
            {editMode ? (
              <>
                <Rocket className="h-3.5 w-3.5" />
                Publish (发布)
              </>
            ) : (
              <>
                <Edit3 className="h-3.5 w-3.5" />
                Edit (编辑字体/答案)
              </>
            )}
          </button>

          {question.isCustom && (
            <>
              <button
                type="button"
                onClick={() => setEditModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-xl border border-[#ECECF2] bg-white px-3 py-2 text-xs font-medium text-[#111118] hover:bg-[#FAFAFC]"
                title="Metadata Modal"
              >
                Meta
              </button>
              <button
                type="button"
                onClick={handleDeleteCustom}
                className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}

          <Link
            href={`/practice/${question.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#111118] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-90"
          >
            <Play className="h-3.5 w-3.5" />
            Mock Room
          </Link>
        </div>
      </div>

      {/* Question Prompt Header Card */}
      <section className="rounded-3xl border border-[#ECECF2] bg-white p-6 shadow-[0_1px_2px_rgba(16,16,24,0.03)]">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${roleBadgeClasses(
              question.role
            )}`}
          >
            {roleCfg.label}
          </span>
          {question.secondaryRoles.map((sr) => (
            <span
              key={sr}
              className="rounded-md border border-[#ECECF2] bg-[#FAFAFC] px-2 py-0.5 text-[11px] font-medium text-[#525260]"
            >
              +{ROLES_BY_ID[sr].shortLabel}
            </span>
          ))}
          <span className="rounded-md bg-[#FAFAFC] px-2.5 py-0.5 text-xs text-[#525260]">
            {ROUND_LABELS[question.round].en}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-[#848494]">
            <Clock className="h-3.5 w-3.5" />
            {question.timeLimitMin}m · {question.difficulty.toUpperCase()} · {question.companyStyle}
          </span>
          {notes.sourceUrl && (
            <a
              href={notes.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-[#F3ECFF] px-2 py-0.5 text-[11px] font-medium text-[#6E32F5] hover:underline"
            >
              Lark Source <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {editMode ? (
          <div className="mt-4 space-y-3 rounded-2xl border border-[#D4C5FD] bg-[#FAF9FF] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E32F5]">
                Big Question Title Style (大标题字体与字号)
              </span>
              <TypographyPicker
                value={titleStyle}
                onChange={(st) => updateQuestionNotes(question.id, { titleStyle: st })}
              />
            </div>
            <input
              value={displayTitle}
              onChange={(e) =>
                updateQuestionNotes(question.id, { customTitle: e.target.value })
              }
              className="w-full rounded-xl border border-[#ECECF2] bg-white px-3 py-2 text-sm font-bold focus:border-[#6E32F5] focus:outline-none"
            />
            <textarea
              rows={3}
              value={displayPrompt}
              onChange={(e) =>
                updateQuestionNotes(question.id, { customPrompt: e.target.value })
              }
              className="w-full rounded-xl border border-[#ECECF2] bg-white p-3 text-xs leading-relaxed focus:border-[#6E32F5] focus:outline-none"
            />
          </div>
        ) : (
          <>
            <h1
              style={getTypographyStyle(titleStyle)}
              className={`mt-3 text-[#111118] ${getTypographyClasses(titleStyle, 'heading')}`}
            >
              {displayTitle}
            </h1>
            <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-[#525260]">
              {displayPrompt}
            </p>
          </>
        )}

        {state.aiSettings.language !== 'en' && question.promptZhHint && (
          <p className="mt-3 rounded-xl bg-amber-50/75 px-3.5 py-2.5 text-xs leading-relaxed text-amber-950">
            {question.promptZhHint}
          </p>
        )}
      </section>

      {/* Main Study Studio Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 8 cols: Video + Answer Studio + Custom Sub-Q/Video Blocks */}
        <div className="space-y-6 lg:col-span-9">
          {/* 1. Primary Video Walkthrough / Self-Recording */}
          <section className="rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-[0_1px_2px_rgba(16,16,24,0.03)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-[#6E32F5]" />
                <h2 className="text-sm font-semibold text-[#111118]">
                  Main Video Answer / Self-Recording
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setVideoUrlInput(notes.videoUrl || '');
                  setShowVideoAttach((v) => !v);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#ECECF2] bg-[#FAFAFC] px-3 py-1.5 text-xs font-medium text-[#111118] hover:border-[#6E32F5]"
              >
                <Upload className="h-3.5 w-3.5 text-[#6E32F5]" />
                {hasVideo ? 'Change Video / Upload' : 'Attach Video URL or MP4'}
              </button>
            </div>

            {showVideoAttach && (
              <div className="mt-3 space-y-3 rounded-xl border border-[#ECECF2] bg-[#FAFAFC] p-3.5">
                <form onSubmit={handleSaveVideoUrl} className="flex flex-wrap gap-2">
                  <input
                    value={videoUrlInput}
                    onChange={(e) => setVideoUrlInput(e.target.value)}
                    placeholder="Paste YouTube, Bilibili, Loom, Vimeo, or Lark Minutes URL..."
                    className="min-w-[220px] flex-1 rounded-lg border border-[#ECECF2] bg-white px-3 py-2 text-xs focus:border-[#6E32F5] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-[#6E32F5] px-3.5 py-2 text-xs font-semibold text-white"
                  >
                    Save URL
                  </button>
                </form>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#ECECF2] pt-2.5">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-[#D4C5FD] bg-white px-3 py-1.5 text-xs font-medium text-[#6E32F5]">
                    {uploadingVideo ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Upload Local Video / Audio (MP4, WebM, MOV, M4A)
                    <input
                      type="file"
                      accept="video/*,audio/*"
                      onChange={handleUploadLocalVideo}
                      className="hidden"
                    />
                  </label>
                  {hasVideo && (
                    <button
                      type="button"
                      onClick={() =>
                        updateQuestionNotes(question.id, {
                          videoUrl: '',
                          localMediaId: undefined,
                          localMediaName: undefined,
                        })
                      }
                      className="text-xs text-rose-600 hover:underline"
                    >
                      Remove Video
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4">
              <VideoPlayer
                videoUrl={notes.videoUrl}
                localMediaId={notes.localMediaId}
                localMediaName={notes.localMediaName}
              />
            </div>

            <div className="mt-4">
              <VoiceCoachPanel questionTitle={question.title} compact />
            </div>
          </section>

          {/* 2. 4-Tab Editable Answer Studio */}
          <section className="rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-[0_1px_2px_rgba(16,16,24,0.03)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ECECF2] pb-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'model', label: 'Model Answer (高分范文)' },
                    { id: 'my', label: 'My Answer (我的回答)' },
                    { id: 'pitch', label: '60s Pitch' },
                    { id: 'notes', label: 'Notes' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      activeTab === tab.id
                        ? 'bg-[#6E32F5] text-white'
                        : 'text-[#525260] hover:bg-[#F5F5FA]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {editMode && (
                  <TypographyPicker
                    label="Answer"
                    value={answerStyle}
                    onChange={(st) => updateQuestionNotes(question.id, { answerStyle: st })}
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    updateQuestionNotes(question.id, {
                      myAnswer: notes.myAnswer,
                      myAnswerHtml: notes.myAnswerHtml,
                      modelAnswer: notes.modelAnswer,
                      modelAnswerHtml: notes.modelAnswerHtml,
                      pitch60s: notes.pitch60s,
                      pitch60sHtml: notes.pitch60sHtml,
                      personalNotes: notes.personalNotes,
                      personalNotesHtml: notes.personalNotesHtml,
                    });
                    setAnswerSaved(true);
                    window.setTimeout(() => setAnswerSaved(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#6E32F5] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#5B24D6]"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {answerSaved ? '已保存 (Saved)' : 'Save (保存)'}
                </button>
                <button
                  type="button"
                  onClick={handleGenerateModelAnswer}
                  disabled={generatingAi}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#ECECF2] bg-[#FAFAFC] px-3 py-1.5 text-xs font-medium text-[#6E32F5] hover:border-[#6E32F5]"
                >
                  {generatingAi ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {notes.modelAnswer ? 'Regenerate AI Draft' : 'Generate Model Answer'}
                </button>
              </div>
            </div>

            <div className="mt-4">
              {activeTab === 'my' && (
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs text-[#848494]">
                    <span className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      选中任意文字可单独调字体、字号与高亮颜色（自动保存）
                    </span>
                    <span className="font-mono">
                      Est. speaking time: {estimateSpeakingTime(notes.myAnswer)}
                    </span>
                  </div>
                  <RichAnswerEditor
                    htmlValue={notes.myAnswerHtml}
                    textValue={notes.myAnswer}
                    minHeightClass="min-h-[300px]"
                    placeholder="1. Clarifying assumptions..."
                    onChange={({ html, text }) =>
                      updateQuestionNotes(question.id, {
                        myAnswer: text,
                        myAnswerHtml: html,
                      })
                    }
                  />
                </div>
              )}

              {activeTab === 'model' && (
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs text-[#848494]">
                    <span>选中任意文字可单独设置字体、字号与重点颜色（自动保存）</span>
                    <span className="font-mono">
                      Est. speaking time: {estimateSpeakingTime(notes.modelAnswer)}
                    </span>
                  </div>
                  <RichAnswerEditor
                    htmlValue={notes.modelAnswerHtml}
                    textValue={notes.modelAnswer}
                    minHeightClass="min-h-[380px]"
                    placeholder="Click 'Generate Model Answer' above or write your own..."
                    onChange={({ html, text }) =>
                      updateQuestionNotes(question.id, {
                        modelAnswer: text,
                        modelAnswerHtml: html,
                      })
                    }
                  />
                </div>
              )}

              {activeTab === 'pitch' && (
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs text-[#848494]">
                    <span>Pyramid Principle 60-second synthesis</span>
                    <span className="font-mono">
                      Est. speaking time: {estimateSpeakingTime(notes.pitch60s)}
                    </span>
                  </div>
                  <RichAnswerEditor
                    htmlValue={notes.pitch60sHtml}
                    textValue={notes.pitch60s}
                    minHeightClass="min-h-[220px]"
                    placeholder="Headline recommendation in sentence 1 -> 3 quantified pillars..."
                    onChange={({ html, text }) =>
                      updateQuestionNotes(question.id, {
                        pitch60s: text,
                        pitch60sHtml: html,
                      })
                    }
                  />
                </div>
              )}

              {activeTab === 'notes' && (
                <RichAnswerEditor
                  htmlValue={notes.personalNotesHtml}
                  textValue={notes.personalNotes}
                  minHeightClass="min-h-[260px]"
                  placeholder="Personal debrief notes, company twists, or interviewer follow-ups..."
                  onChange={({ html, text }) =>
                    updateQuestionNotes(question.id, {
                      personalNotes: text,
                      personalNotesHtml: html,
                    })
                  }
                />
              )}
            </div>
          </section>

          {/* 3. Custom Sub-Questions, Written Answers & Video Answers */}
          <section className="rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-[0_1px_2px_rgba(16,16,24,0.03)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ECECF2] pb-3">
              <div>
                <h2 className="text-sm font-semibold text-[#111118]">
                  Custom Sub-Questions, Written Answers &amp; Video Answers ({customBlocks.length})
                </h2>
                <p className="text-xs text-[#848494]">
                  在此题下随时添加补充子问题、自己的文字答案或上传视频答案，选择字体字号并 Publish 方便复习。
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddCustomBlock('qa')}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#D4C5FD] bg-[#FAF9FF] px-2.5 py-1.5 text-[11px] font-semibold text-[#6E32F5] hover:bg-[#F3ECFF]"
                >
                  <Plus className="h-3 w-3" />
                  Add Sub-Question &amp; Answer
                </button>
                <button
                  type="button"
                  onClick={() => handleAddCustomBlock('text')}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#ECECF2] bg-[#FAFAFC] px-2.5 py-1.5 text-[11px] font-semibold text-[#111118] hover:border-[#6E32F5]"
                >
                  <Plus className="h-3 w-3" />
                  Add Text Answer Block
                </button>
                <button
                  type="button"
                  onClick={() => handleAddCustomBlock('video')}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#ECECF2] bg-[#FAFAFC] px-2.5 py-1.5 text-[11px] font-semibold text-[#111118] hover:border-[#6E32F5]"
                >
                  <Film className="h-3 w-3 text-[#6E32F5]" />
                  Add / Upload Video Answer
                </button>
              </div>
            </div>

            {customBlocks.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-[#ECECF2] bg-[#FAFAFC] p-6 text-center text-xs text-[#848494]">
                还没有添加自定义子题、补充文字或视频答案。点击上方按钮即可直接创建、调整字体字号并 Publish。
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {customBlocks.map((blk, idx) => (
                  <div
                    key={blk.id}
                    className="rounded-2xl border border-[#ECECF2] bg-[#FAFAFC]/70 p-4"
                  >
                    {editMode ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="rounded bg-[#F3ECFF] px-2 py-0.5 text-[10px] font-bold uppercase text-[#6E32F5]">
                            {blk.kind === 'qa'
                              ? 'Sub-Question & Answer'
                              : blk.kind === 'video'
                                ? 'Video Answer'
                                : 'Text Answer Block'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => moveBlock(idx, -1)}
                              className="rounded border border-[#ECECF2] bg-white p-1 text-[#525260]"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveBlock(idx, 1)}
                              className="rounded border border-[#ECECF2] bg-white p-1 text-[#525260]"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateQuestionNotes(question.id, {
                                  customBlocks: customBlocks.filter((b) => b.id !== blk.id),
                                })
                              }
                              className="rounded border border-rose-200 bg-rose-50 p-1 text-rose-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <input
                            value={blk.heading}
                            onChange={(e) => updateBlock(blk.id, { heading: e.target.value })}
                            placeholder="Section / Sub-question title..."
                            className="min-w-[200px] flex-1 rounded-lg border border-[#ECECF2] bg-white px-3 py-1.5 text-xs font-semibold focus:border-[#6E32F5] focus:outline-none"
                          />
                          <TypographyPicker
                            label="Title"
                            value={blk.headingStyle}
                            onChange={(st) => updateBlock(blk.id, { headingStyle: st })}
                          />
                        </div>

                        <div className="flex justify-end">
                          <TypographyPicker
                            label="Body"
                            value={blk.bodyStyle}
                            onChange={(st) => updateBlock(blk.id, { bodyStyle: st })}
                          />
                        </div>

                        <textarea
                          rows={4}
                          style={getTypographyStyle(blk.bodyStyle)}
                          value={blk.body}
                          onChange={(e) => updateBlock(blk.id, { body: e.target.value })}
                          placeholder="Write your text answer, metrics, or notes here..."
                          className={`w-full rounded-xl border border-[#ECECF2] bg-white p-3 text-[#111118] focus:border-[#6E32F5] focus:outline-none ${getTypographyClasses(
                            blk.bodyStyle,
                            'body'
                          )}`}
                        />

                        {/* Video URL or Upload */}
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            value={blk.videoUrl ?? ''}
                            onChange={(e) => updateBlock(blk.id, { videoUrl: e.target.value })}
                            placeholder="Video URL (YouTube / Bilibili / Loom / Lark)..."
                            className="rounded-lg border border-[#ECECF2] bg-white px-2.5 py-1.5 text-xs focus:border-[#6E32F5] focus:outline-none"
                          />
                          <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#D4C5FD] bg-white px-3 py-1.5 text-xs font-medium text-[#6E32F5]">
                            {uploadingBlockId === blk.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Upload className="h-3.5 w-3.5" />
                            )}
                            <span className="truncate">
                              {blk.localMediaName
                                ? `Uploaded: ${blk.localMediaName}`
                                : 'Upload Local Video (.mp4 / .webm)'}
                            </span>
                            <input
                              type="file"
                              accept="video/*,audio/*"
                              onChange={(e) => handleUploadBlockVideo(blk.id, e)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <h3
                          style={getTypographyStyle(blk.headingStyle)}
                          className={`text-[#111118] ${getTypographyClasses(
                            blk.headingStyle,
                            'heading'
                          )}`}
                        >
                          {blk.heading}
                        </h3>
                        {blk.body && (
                          <div
                            style={getTypographyStyle(blk.bodyStyle)}
                            className={`whitespace-pre-wrap text-[#2E2E3A] ${getTypographyClasses(
                              blk.bodyStyle,
                              'body'
                            )}`}
                          >
                            {blk.body}
                          </div>
                        )}
                        {(blk.videoUrl || blk.localMediaId) && (
                          <VideoPlayer
                            videoUrl={blk.videoUrl}
                            localMediaId={blk.localMediaId}
                            localMediaName={blk.localMediaName}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {editMode && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleTogglePublish}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white"
                    >
                      <Rocket className="h-3.5 w-3.5" />
                      Publish All Sections (发布)
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Right 4 cols: Framework Checklist + Signals + Probes */}
        <aside className="space-y-4 lg:col-span-3">
          <div className="rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-[0_1px_2px_rgba(16,16,24,0.03)]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#525260]">
              Framework Steps Checklist
            </h3>
            <div className="mt-3 space-y-2">
              {question.frameworkSteps.map((st, idx) => {
                const checked = Boolean(checkedSteps[idx]);
                return (
                  <label
                    key={idx}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 text-xs transition ${
                      checked
                        ? 'border-emerald-200 bg-emerald-50/50 text-emerald-950'
                        : 'border-[#ECECF2] bg-[#FAFAFC] text-[#111118]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setCheckedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }))
                      }
                      className="mt-0.5 rounded"
                    />
                    <span className="leading-snug">{st}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Linked STAR+L Stories */}
          <div className="rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-[0_1px_2px_rgba(16,16,24,0.03)]">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6E32F5]">
                Linked STAR+L Stories ({(notes.linkedStoryIds ?? []).length})
              </h3>
              <Link
                href="/stories"
                className="text-[11px] font-medium text-[#848494] hover:text-[#6E32F5]"
              >
                Story Bank →
              </Link>
            </div>
            <select
              value=""
              onChange={(e) => {
                const sid = e.target.value;
                if (!sid) return;
                const current = notes.linkedStoryIds ?? [];
                if (!current.includes(sid)) {
                  updateQuestionNotes(question.id, {
                    linkedStoryIds: [...current, sid],
                  });
                }
              }}
              className="mt-2.5 w-full rounded-xl border border-[#ECECF2] bg-[#FAFAFC] px-3 py-2 text-xs text-[#111118] focus:border-[#6E32F5] focus:bg-white focus:outline-none"
            >
              <option value="">+ 挂载一个 STAR+L 故事到此题...</option>
              {state.stories
                .filter((s) => !(notes.linkedStoryIds ?? []).includes(s.id))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
            </select>

            {(notes.linkedStoryIds ?? []).length > 0 && (
              <div className="mt-3 space-y-2.5">
                {(notes.linkedStoryIds ?? []).map((sid) => {
                  const st = state.stories.find((item) => item.id === sid);
                  if (!st) return null;
                  return (
                    <div
                      key={sid}
                      className="rounded-xl border border-[#D4C5FD]/60 bg-[#F9F6FF]/60 p-3 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-[#111118]">{st.title}</div>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuestionNotes(question.id, {
                              linkedStoryIds: (notes.linkedStoryIds ?? []).filter(
                                (x) => x !== sid
                              ),
                            })
                          }
                          className="text-[11px] text-[#848494] hover:text-rose-600"
                          title="取消关联"
                        >
                          移除
                        </button>
                      </div>
                      {st.metrics.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {st.metrics.slice(0, 3).map((m, idx) => (
                            <span
                              key={idx}
                              className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-700"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-[#525260]">
                        <span className="font-semibold text-[#6E32F5]">Result:</span>{' '}
                        {st.result || st.action}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,16,24,0.03)]">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Strong Hire Signals
            </div>
            <ul className="mt-2.5 space-y-2 text-xs leading-snug text-emerald-950">
              {question.strongHireSignals.map((sig, i) => (
                <li key={i}>✓ {sig}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,16,24,0.03)]">
            <div className="text-xs font-semibold uppercase tracking-wider text-rose-800">
              Red Flags to Avoid
            </div>
            <ul className="mt-2.5 space-y-1.5 text-xs leading-snug text-rose-950">
              {question.redFlags.map((rf, i) => (
                <li key={i}>✕ {rf}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-[0_1px_2px_rgba(16,16,24,0.03)]">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#6E32F5]">
              Likely Follow-Up Probes
            </div>
            <ul className="mt-2.5 space-y-2 text-xs leading-snug text-[#525260]">
              {question.followUpProbes.map((p, i) => (
                <li key={i} className="rounded-lg bg-[#FAFAFC] p-2.5">
                  &ldquo;{p}&rdquo;
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <QuestionModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        initialQuestion={question}
        initialNotes={notes}
        onSave={(updatedQ, updatedNotes) => {
          updateCustomQuestion(updatedQ);
          if (updatedNotes) {
            updateQuestionNotes(updatedQ.id, updatedNotes);
          }
        }}
      />
    </div>
  );
}

export default function QuestionDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[70vh] items-center justify-center text-sm text-[#848494]">
          Loading Question Studio...
        </div>
      }
    >
      <QuestionStudyContent />
    </Suspense>
  );
}
