'use client';

import React, { useState } from 'react';
import {
  Check,
  FileText,
  ImagePlus,
  Layers,
  Loader2,
  Plus,
  Sparkles,
  Square,
  Target,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { extractDocumentText } from '@/lib/doc-parser-client';
import { roleBadgeClasses } from '@/lib/helpers';
import { ROLE_LIST, ROLES_BY_ID } from '@/lib/roles';
import { ResumeProfile, RoleTrack, SavedJDItem } from '@/lib/types';

interface CommonSkillsReport {
  commonSkills: Array<{ skill: string; frequency: number }>;
  coreCapabilities: string[];
  prepPriorities: string[];
  summary: string;
}

interface MatchReport {
  matchScore: number;
  matchedStrengths: string[];
  missingGaps: string[];
  optimizationTips: string[];
  rewrittenBullets: string[];
}

interface JdResumeStudioProps {
  activeSection: 'jd-library' | 'resumes';
  onUseInGenerator: (opts: {
    company?: string;
    role?: RoleTrack;
    jdText?: string;
    resumeText?: string;
  }) => void;
}

export function JdResumeStudio({
  activeSection,
  onUseInGenerator,
}: JdResumeStudioProps) {
  const {
    state,
    upsertSavedJD,
    deleteSavedJD,
    upsertResumeProfile,
    deleteResumeProfile,
  } = useApp();

  // Block 1: JD Library & Multi-JD Common Analyzer
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [jdModalOpen, setJdModalOpen] = useState(false);
  const [jdCompany, setJdCompany] = useState('');
  const [jdRoleTitle, setJdRoleTitle] = useState('');
  const [jdRoleTrack, setJdRoleTrack] = useState<RoleTrack>('fde');
  const [jdTextInput, setJdTextInput] = useState('');
  const [jdScreenshotName, setJdScreenshotName] = useState('');
  const [jdScreenshotUrl, setJdScreenshotUrl] = useState('');
  const [parsingJdFile, setParsingJdFile] = useState(false);
  const [jdParseNotice, setJdParseNotice] = useState('');
  const [analyzingJd, setAnalyzingJd] = useState(false);

  const [analyzingCommon, setAnalyzingCommon] = useState(false);
  const [commonReport, setCommonReport] = useState<CommonSkillsReport | null>(null);

  // Resume Match Modal
  const [matchTargetJd, setMatchTargetJd] = useState<SavedJDItem | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<string>(
    state.resumeProfiles[0]?.id ?? ''
  );
  const [matchingResume, setMatchingResume] = useState(false);
  const [matchReport, setMatchReport] = useState<MatchReport | null>(null);

  // Block 2: Resume Library
  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [editingResume, setEditingResume] = useState<ResumeProfile | null>(null);
  const [parsingResumeFile, setParsingResumeFile] = useState(false);
  const [resumeParseNotice, setResumeParseNotice] = useState('');

  const callAiEndpoint = async (action: string, payload: Record<string, unknown>) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (state.aiSettings.geminiApiKey.trim()) {
      headers['x-gemini-api-key'] = state.aiSettings.geminiApiKey.trim();
    }
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action,
        model: state.aiSettings.model,
        language: state.aiSettings.language,
        payload,
      }),
    });
    return res.json();
  };

  const handleJdFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setJdScreenshotName(file.name);
    setJdParseNotice('');

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setJdScreenshotUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    setParsingJdFile(true);
    try {
      const result = await extractDocumentText(file);
      if (result.text) {
        setJdTextInput((prev) =>
          prev.trim() ? `${prev.trim()}\n\n${result.text}` : result.text
        );
      } else if (result.error) {
        setJdParseNotice(result.error);
      }
    } finally {
      setParsingJdFile(false);
    }
  };

  const handleAnalyzeAndSaveJd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jdTextInput.trim() && !jdScreenshotUrl) return;
    setAnalyzingJd(true);
    try {
      const json = (await callAiEndpoint('analyze_jd', {
        company: jdCompany.trim(),
        roleTitle: jdRoleTitle.trim(),
        jdText: jdTextInput.trim(),
        imageDataUrl: jdScreenshotUrl,
      })) as {
        data?: {
          company?: string;
          roleTitle?: string;
          extractedSkills?: string[];
          coreCapabilities?: string[];
          summary?: string;
          jdTextExtracted?: string;
        };
      };

      const d = json.data;
      const newItem: SavedJDItem = {
        id: `jd-${Date.now()}`,
        company: d?.company || jdCompany.trim() || 'Target Company',
        roleTitle: d?.roleTitle || jdRoleTitle.trim() || 'Applied AI / PM',
        roleTrack: jdRoleTrack,
        jdText: jdTextInput.trim() || d?.jdTextExtracted || d?.summary || '',
        screenshotName: jdScreenshotName || undefined,
        screenshotDataUrl: jdScreenshotUrl || undefined,
        extractedSkills: d?.extractedSkills ?? ['AI Architecture', 'Execution'],
        coreCapabilities: d?.coreCapabilities ?? ['Problem Decomposition'],
        summary: d?.summary ?? '',
        updatedAt: new Date().toISOString(),
      };
      upsertSavedJD(newItem);
      setJdModalOpen(false);
      setJdCompany('');
      setJdRoleTitle('');
      setJdTextInput('');
      setJdScreenshotName('');
      setJdScreenshotUrl('');
    } finally {
      setAnalyzingJd(false);
    }
  };

  const toggleSelectJd = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === state.savedJDs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(state.savedJDs.map((j) => j.id));
    }
  };

  const handleAnalyzeCommonSkills = async () => {
    const picked = state.savedJDs.filter((j) => selectedIds.includes(j.id));
    if (picked.length === 0 || analyzingCommon) return;
    setAnalyzingCommon(true);
    try {
      const json = (await callAiEndpoint('analyze_common_jds', {
        jds: picked.map((j) => ({
          company: j.company,
          roleTitle: j.roleTitle,
          extractedSkills: j.extractedSkills,
          coreCapabilities: j.coreCapabilities,
          jdText: j.jdText,
        })),
      })) as { data?: CommonSkillsReport };
      if (json.data) {
        setCommonReport(json.data);
      }
    } finally {
      setAnalyzingCommon(false);
    }
  };

  const openMatchModal = (jd: SavedJDItem) => {
    setMatchTargetJd(jd);
    setMatchReport(null);
    if (!selectedResumeId && state.resumeProfiles[0]) {
      setSelectedResumeId(state.resumeProfiles[0].id);
    }
  };

  const handleRunResumeMatch = async () => {
    if (!matchTargetJd || matchingResume) return;
    const resume =
      state.resumeProfiles.find((r) => r.id === selectedResumeId) ??
      state.resumeProfiles[0];
    if (!resume) return;
    setMatchingResume(true);
    try {
      const json = (await callAiEndpoint('match_resume_jd', {
        jdTitle: `${matchTargetJd.company} — ${matchTargetJd.roleTitle}`,
        jdText: `${matchTargetJd.jdText}\nSkills: ${matchTargetJd.extractedSkills.join(', ')}`,
        resumeLabel: resume.label,
        resumeContent: resume.content,
      })) as { data?: MatchReport };
      if (json.data) {
        setMatchReport(json.data);
      }
    } finally {
      setMatchingResume(false);
    }
  };

  const openNewResume = () => {
    setEditingResume({
      id: `res-${Date.now()}`,
      label: '',
      track: 'FDPM',
      fileName: '',
      content: '',
      updatedAt: new Date().toISOString(),
    });
    setResumeModalOpen(true);
  };

  const handleResumeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editingResume) return;
    setResumeParseNotice('');
    setParsingResumeFile(true);
    try {
      const result = await extractDocumentText(file);
      setEditingResume((prev) =>
        prev
          ? {
              ...prev,
              fileName: file.name,
              label: prev.label || file.name.replace(/\.[^.]+$/, ''),
              content: result.text || prev.content,
            }
          : prev
      );
      if (result.error && !result.text) {
        setResumeParseNotice(result.error);
      }
    } finally {
      setParsingResumeFile(false);
    }
  };

  const handleSaveResume = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResume || !editingResume.label.trim()) return;
    upsertResumeProfile({
      ...editingResume,
      label: editingResume.label.trim(),
      updatedAt: new Date().toISOString(),
    });
    setResumeModalOpen(false);
    setEditingResume(null);
  };

  return (
    <div className="space-y-6">
      {/* BLOCK 1: JD Screenshot & Text Library + Common Skills + Resume Match */}
      {activeSection === 'jd-library' && (
        <div className="space-y-5">
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ECECF2] bg-white p-4 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#ECECF2] bg-[#FAFAFC] px-3 py-2 text-xs font-semibold text-[#111118] hover:border-[#6E32F5]"
              >
                {selectedIds.length === state.savedJDs.length && state.savedJDs.length > 0 ? (
                  <Check className="h-3.5 w-3.5 text-[#6E32F5]" />
                ) : (
                  <Square className="h-3.5 w-3.5 text-[#848494]" />
                )}
                全选 ({selectedIds.length}/{state.savedJDs.length})
              </button>

              <button
                type="button"
                disabled={selectedIds.length === 0 || analyzingCommon}
                onClick={() => void handleAnalyzeCommonSkills()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#111118] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2A2A35] disabled:opacity-45"
              >
                {analyzingCommon ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    分析共同技能中...
                  </>
                ) : (
                  <>
                    <Layers className="h-3.5 w-3.5 text-[#C4B5FD]" />
                    一键分析选中岗位共同技能 ({selectedIds.length})
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setJdModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#5B24D6]"
            >
              <ImagePlus className="h-4 w-4" />
              上传 JD 截图 / 添加岗位
            </button>
          </div>

          {/* Common Skills Synthesis Report */}
          {commonReport && (
            <section className="rounded-2xl border border-[#6E32F5]/30 bg-[#F9F6FF] p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6E32F5]">
                    Cross-Company Common Skills Synthesis · 共同能力矩阵
                  </div>
                  <p className="mt-1 text-sm font-medium text-[#111118]">
                    {commonReport.summary}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCommonReport(null)}
                  className="rounded-lg p-1 text-[#848494] hover:text-[#111118]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-[#ECECF2] bg-white p-3.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6E32F5]">
                    高频共同技能 (Skills)
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {commonReport.commonSkills.map((s) => (
                      <span
                        key={s.skill}
                        className="rounded-lg bg-[#F3ECFF] px-2.5 py-1 text-xs font-semibold text-[#6E32F5]"
                      >
                        {s.skill} · {s.frequency}x
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-[#ECECF2] bg-white p-3.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5E5E6E]">
                    核心能力要求 (Capabilities)
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-[#111118]">
                    {commonReport.coreCapabilities.map((c, i) => (
                      <li key={i}>• {c}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
                    最高 ROI 冲刺建议
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-emerald-950">
                    {commonReport.prepPriorities.map((p, i) => (
                      <li key={i}>✓ {p}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* JD Cards Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {state.savedJDs.map((jd) => {
              const checked = selectedIds.includes(jd.id);
              return (
                <article
                  key={jd.id}
                  className={`flex flex-col justify-between rounded-2xl border p-5 shadow-2xs transition ${
                    checked
                      ? 'border-[#6E32F5] bg-[#FBF9FF]'
                      : 'border-[#ECECF2] bg-white hover:border-[#D4C5FD]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => toggleSelectJd(jd.id)}
                          className="mt-0.5 shrink-0"
                          aria-label={`Select ${jd.company}`}
                        >
                          {checked ? (
                            <Check className="h-4 w-4 rounded bg-[#6E32F5] p-0.5 text-white" />
                          ) : (
                            <Square className="h-4 w-4 text-[#9E9EAE]" />
                          )}
                        </button>
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="text-base font-semibold text-[#111118]">
                              {jd.company}
                            </h3>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${roleBadgeClasses(
                                jd.roleTrack
                              )}`}
                            >
                              {ROLES_BY_ID[jd.roleTrack]?.shortLabel}
                            </span>
                          </div>
                          <div className="text-xs font-medium text-[#5E5E6E]">{jd.roleTitle}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteSavedJD(jd.id)}
                        className="rounded-md p-1 text-[#B4B4C2] hover:text-rose-600"
                        title="Delete JD"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {jd.screenshotDataUrl && (
                      <div className="mt-3 overflow-hidden rounded-xl border border-[#ECECF2]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={jd.screenshotDataUrl}
                          alt={`${jd.company} JD screenshot`}
                          className="max-h-36 w-full object-cover object-top"
                        />
                      </div>
                    )}

                    {jd.summary && (
                      <p className="mt-3 text-xs leading-relaxed text-[#5E5E6E]">{jd.summary}</p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {jd.extractedSkills.map((s) => (
                        <span
                          key={s}
                          className="rounded-md bg-[#F3ECFF] px-2 py-0.5 text-[11px] font-medium text-[#6E32F5]"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card Footer: Resume Match Analysis + Use in Loop */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#F2F2F7] pt-3">
                    <button
                      type="button"
                      onClick={() => openMatchModal(jd)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#F3ECFF] px-3 py-1.5 text-xs font-semibold text-[#6E32F5] transition hover:bg-[#6E32F5] hover:text-white"
                    >
                      <Target className="h-3.5 w-3.5" />
                      简历匹配分析
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onUseInGenerator({
                          company: jd.company,
                          role: jd.roleTrack,
                          jdText: jd.jdText,
                        })
                      }
                      className="rounded-xl border border-[#ECECF2] bg-[#FAFAFC] px-3 py-1.5 text-xs font-semibold text-[#111118] hover:border-[#6E32F5]"
                    >
                      生成冲刺 Loop →
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* BLOCK 2: Multi-Direction Resume Library */}
      {activeSection === 'resumes' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ECECF2] bg-white p-4 shadow-2xs">
            <div>
              <h2 className="text-base font-semibold text-[#111118]">
                多方向简历库（FDPM / AI PM / Ops / Safety / FDE）
              </h2>
              <p className="text-xs text-[#848494]">
                按不同求职方向管理专属简历版本，随时一键加载到 Loop 生成器或与任意公司 JD 做匹配度体检。
              </p>
            </div>
            <button
              type="button"
              onClick={openNewResume}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#5B24D6]"
            >
              <Plus className="h-4 w-4" />
              上传 / 新增简历版本
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {state.resumeProfiles.map((res) => (
              <article
                key={res.id}
                className="flex flex-col justify-between rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-2xs transition hover:border-[#6E32F5]/40"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="rounded-md bg-[#F3ECFF] px-2 py-0.5 text-[10px] font-semibold text-[#6E32F5]">
                        {res.track}
                      </span>
                      <h3 className="mt-1.5 text-sm font-semibold text-[#111118]">{res.label}</h3>
                      {res.fileName && (
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[#848494]">
                          <FileText className="h-3 w-3" />
                          {res.fileName}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteResumeProfile(res.id)}
                      className="rounded p-1 text-[#B4B4C2] hover:text-rose-600"
                      title="Delete resume"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <p className="mt-3 line-clamp-4 text-xs leading-relaxed text-[#5E5E6E]">
                    {res.content}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#F2F2F7] pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingResume({ ...res });
                      setResumeModalOpen(true);
                    }}
                    className="rounded-lg border border-[#ECECF2] px-3 py-1.5 text-xs font-semibold text-[#5E5E6E] hover:text-[#111118]"
                  >
                    编辑内容
                  </button>
                  <button
                    type="button"
                    onClick={() => onUseInGenerator({ resumeText: res.content })}
                    className="rounded-lg bg-[#6E32F5] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    调用到 Loop →
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Modal 1: Add / Upload JD Screenshot */}
      {jdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#ECECF2] pb-3">
              <h3 className="text-base font-semibold text-[#111118]">
                上传公司 JD 截图或粘贴文本 · 一键技能解析
              </h3>
              <button
                type="button"
                onClick={() => setJdModalOpen(false)}
                className="rounded-lg p-1 text-[#848494]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAnalyzeAndSaveJd} className="mt-4 space-y-3.5">
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  type="text"
                  value={jdCompany}
                  onChange={(e) => setJdCompany(e.target.value)}
                  placeholder="公司名 (e.g. Palantir)"
                  className="rounded-xl border border-[#ECECF2] px-3 py-2 text-xs focus:border-[#6E32F5] focus:outline-none"
                />
                <input
                  type="text"
                  value={jdRoleTitle}
                  onChange={(e) => setJdRoleTitle(e.target.value)}
                  placeholder="岗位名 (e.g. FDPM)"
                  className="rounded-xl border border-[#ECECF2] px-3 py-2 text-xs focus:border-[#6E32F5] focus:outline-none"
                />
                <select
                  value={jdRoleTrack}
                  onChange={(e) => setJdRoleTrack(e.target.value as RoleTrack)}
                  className="rounded-xl border border-[#ECECF2] px-3 py-2 text-xs"
                >
                  {ROLE_LIST.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.shortLabel}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#D4C5FD] bg-[#F9F6FF] p-4 text-xs font-semibold text-[#6E32F5] hover:bg-[#F3ECFF]">
                {parsingJdFile ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在解析 JD 文档正文...
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-4 w-4" />
                    {jdScreenshotName
                      ? `已选择文件: ${jdScreenshotName}`
                      : '上传公司 JD 截图或文档 (PNG / JPG / PDF / DOC / DOCX)'}
                  </>
                )}
                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.txt,.md"
                  onChange={handleJdFileUpload}
                  className="hidden"
                />
              </label>
              {jdParseNotice && (
                <p className="text-[11px] text-amber-600">{jdParseNotice}</p>
              )}

              {jdScreenshotUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={jdScreenshotUrl}
                  alt="Preview JD screenshot"
                  className="max-h-40 w-full rounded-xl border border-[#ECECF2] object-contain"
                />
              )}

              <textarea
                rows={5}
                value={jdTextInput}
                onChange={(e) => setJdTextInput(e.target.value)}
                placeholder="或者直接粘贴 JD 文本要点（截图 + 文本也可同时提供）..."
                className="w-full rounded-xl border border-[#ECECF2] p-3 text-xs leading-relaxed focus:border-[#6E32F5] focus:outline-none"
              />

              <div className="flex justify-end gap-2 border-t border-[#ECECF2] pt-3">
                <button
                  type="button"
                  onClick={() => setJdModalOpen(false)}
                  className="rounded-xl border border-[#ECECF2] px-4 py-2 text-xs font-semibold text-[#5E5E6E]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={analyzingJd || (!jdTextInput.trim() && !jdScreenshotUrl)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {analyzingJd ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      解析技能中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      一键分析并入库
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Resume vs JD Match Analysis */}
      {matchTargetJd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#ECECF2] pb-3">
              <div>
                <h3 className="text-base font-semibold text-[#111118]">
                  简历匹配度分析 · {matchTargetJd.company} ({matchTargetJd.roleTitle})
                </h3>
                <p className="text-xs text-[#848494]">
                  选择简历库中的任意方向版本，对比当前 JD 找出差距并生成改写建议
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMatchTargetJd(null)}
                className="rounded-lg p-1 text-[#848494]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="flex-1 rounded-xl border border-[#ECECF2] bg-[#FAFAFC] px-3 py-2 text-xs font-medium"
              >
                {state.resumeProfiles.map((r) => (
                  <option key={r.id} value={r.id}>
                    [{r.track}] {r.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={matchingResume}
                onClick={() => void handleRunResumeMatch()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {matchingResume ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    匹配分析中...
                  </>
                ) : (
                  <>
                    <Target className="h-3.5 w-3.5" />
                    开始简历匹配分析
                  </>
                )}
              </button>
            </div>

            {matchReport && (
              <div className="mt-4 space-y-3 rounded-xl border border-[#6E32F5]/25 bg-[#F9F6FF] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#6E32F5]">Resume Match Score</span>
                  <span className="rounded-full bg-[#6E32F5] px-3 py-1 text-sm font-bold text-white">
                    {matchReport.matchScore}%
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#ECECF2] bg-white p-3">
                    <div className="text-[10px] font-semibold uppercase text-emerald-700">
                      Matched Strengths
                    </div>
                    <ul className="mt-1.5 space-y-1 text-xs text-[#111118]">
                      {matchReport.matchedStrengths.map((s, i) => (
                        <li key={i}>✓ {s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-[#ECECF2] bg-white p-3">
                    <div className="text-[10px] font-semibold uppercase text-rose-700">
                      Missing Gaps / Keywords
                    </div>
                    <ul className="mt-1.5 space-y-1 text-xs text-[#111118]">
                      {matchReport.missingGaps.map((g, i) => (
                        <li key={i}>! {g}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="rounded-xl border border-[#ECECF2] bg-white p-3">
                  <div className="text-[10px] font-semibold uppercase text-[#6E32F5]">
                    Optimization Tips (需要优化的地方)
                  </div>
                  <ul className="mt-1.5 space-y-1 text-xs text-[#111118]">
                    {matchReport.optimizationTips.map((t, i) => (
                      <li key={i}>• {t}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-[#ECECF2] bg-white p-3">
                  <div className="text-[10px] font-semibold uppercase text-[#5E5E6E]">
                    Ready-to-Paste Tailored Bullets
                  </div>
                  <ul className="mt-1.5 space-y-1.5 text-xs italic text-[#111118]">
                    {matchReport.rewrittenBullets.map((b, i) => (
                      <li key={i}>&ldquo;{b}&rdquo;</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 3: Add / Edit Resume Profile */}
      {resumeModalOpen && editingResume && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#ECECF2] bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#ECECF2] pb-3">
              <h3 className="text-base font-semibold text-[#111118]">
                添加 / 编辑简历版本
              </h3>
              <button
                type="button"
                onClick={() => setResumeModalOpen(false)}
                className="rounded-lg p-1 text-[#848494]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveResume} className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-[#5E5E6E]">简历名称 *</label>
                  <input
                    type="text"
                    required
                    value={editingResume.label}
                    onChange={(e) =>
                      setEditingResume({ ...editingResume, label: e.target.value })
                    }
                    placeholder="e.g. FDPM 2026 Q4 简历"
                    className="mt-1 w-full rounded-xl border border-[#ECECF2] px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#5E5E6E]">方向标签</label>
                  <select
                    value={editingResume.track}
                    onChange={(e) =>
                      setEditingResume({ ...editingResume, track: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-[#ECECF2] px-3 py-2 text-xs"
                  >
                    <option value="FDPM">FDPM</option>
                    <option value="AI PM">AI PM</option>
                    <option value="FDE">FDE</option>
                    <option value="Ops">Ops</option>
                    <option value="AI Safety">AI Safety</option>
                    <option value="Program Manager">Program Manager</option>
                    <option value="Consulting">Consulting</option>
                  </select>
                </div>
              </div>

              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#D4C5FD] bg-[#F9F6FF] p-3 text-xs font-semibold text-[#6E32F5] hover:bg-[#F3ECFF]">
                {parsingResumeFile ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在解析简历文件正文...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    {editingResume.fileName
                      ? `已关联文件: ${editingResume.fileName}`
                      : '上传简历文件 (PDF / DOC / DOCX / TXT / MD 自动解析正文)'}
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md"
                  onChange={handleResumeFileUpload}
                  className="hidden"
                />
              </label>
              {resumeParseNotice && (
                <p className="text-[11px] text-amber-600">{resumeParseNotice}</p>
              )}

              <div>
                <label className="text-xs font-semibold text-[#5E5E6E]">
                  简历正文 / 核心经历 (用于 AI 匹配分析与 Loop 生成)
                </label>
                <textarea
                  rows={6}
                  required
                  value={editingResume.content}
                  onChange={(e) =>
                    setEditingResume({ ...editingResume, content: e.target.value })
                  }
                  placeholder="粘贴该版本简历的核心摘要与 Bullet Points..."
                  className="mt-1 w-full rounded-xl border border-[#ECECF2] p-3 text-xs leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-[#ECECF2] pt-3">
                <button
                  type="button"
                  onClick={() => setResumeModalOpen(false)}
                  className="rounded-xl border border-[#ECECF2] px-4 py-2 text-xs font-semibold text-[#5E5E6E]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#6E32F5] px-4 py-2 text-xs font-semibold text-white"
                >
                  保存简历
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
