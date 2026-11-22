'use client';

import React, { useRef, useState } from 'react';
import { Link2, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { DiagramEdge, DiagramNode, NodeKind } from '@/lib/types';

const NODE_PALETTE: {
  kind: NodeKind;
  label: string;
  chipClass: string;
  cardClass: string;
}[] = [
  {
    kind: 'client',
    label: 'Client / User',
    chipClass: 'bg-sky-50 text-sky-700 border-sky-200',
    cardClass: 'border-sky-300 bg-sky-50/90 text-sky-950',
  },
  {
    kind: 'data',
    label: 'Data / ERP',
    chipClass: 'bg-slate-100 text-slate-700 border-slate-300',
    cardClass: 'border-slate-300 bg-white text-slate-900',
  },
  {
    kind: 'agent',
    label: 'AI / Agent',
    chipClass: 'bg-violet-50 text-violet-700 border-violet-200',
    cardClass: 'border-violet-300 bg-violet-50/90 text-violet-950',
  },
  {
    kind: 'eval',
    label: 'Eval / Guardrail',
    chipClass: 'bg-amber-50 text-amber-800 border-amber-200',
    cardClass: 'border-amber-300 bg-amber-50/90 text-amber-950',
  },
  {
    kind: 'ops',
    label: 'Ops / Gate',
    chipClass: 'bg-rose-50 text-rose-700 border-rose-200',
    cardClass: 'border-rose-300 bg-rose-50/90 text-rose-950',
  },
  {
    kind: 'kpi',
    label: 'KPI / ROI',
    chipClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cardClass: 'border-emerald-300 bg-emerald-50/90 text-emerald-950',
  },
];

const KIND_STYLE_MAP = NODE_PALETTE.reduce(
  (acc, item) => {
    acc[item.kind] = item;
    return acc;
  },
  {} as Record<NodeKind, (typeof NODE_PALETTE)[number]>
);

interface DiagramBoardProps {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  onChangeNodes: (nodes: DiagramNode[]) => void;
  onChangeEdges: (edges: DiagramEdge[]) => void;
  starterNodes?: Omit<DiagramNode, 'id'>[];
}

export function DiagramBoard({
  nodes,
  edges,
  onChangeNodes,
  onChangeEdges,
  starterNodes,
}: DiagramBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [connectFromId, setConnectFromId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [edgeLabelInput, setEdgeLabelInput] = useState('');
  const [dragState, setDragState] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const addNode = (kind: NodeKind) => {
    const idx = nodes.length;
    const newNode: DiagramNode = {
      id: `node-${Date.now()}-${idx}`,
      label: KIND_STYLE_MAP[kind].label,
      kind,
      x: 48 + ((idx * 42) % 440),
      y: 48 + ((idx * 38) % 190),
    };
    onChangeNodes([...nodes, newNode]);
  };

  const loadStarter = () => {
    const source =
      starterNodes && starterNodes.length > 0
        ? starterNodes
        : [
            { label: 'Client Pain / Input', kind: 'client' as NodeKind, x: 40, y: 120 },
            { label: 'Legacy Data / API', kind: 'data' as NodeKind, x: 220, y: 50 },
            { label: 'Core Logic / Agent', kind: 'agent' as NodeKind, x: 220, y: 185 },
            { label: 'Eval & HITL Gate', kind: 'eval' as NodeKind, x: 430, y: 120 },
            { label: 'North Star KPI', kind: 'kpi' as NodeKind, x: 630, y: 120 },
          ];

    const created: DiagramNode[] = source.map((n, i) => ({
      ...n,
      id: `starter-${Date.now()}-${i}`,
    }));
    const autoEdges: DiagramEdge[] = [];
    for (let i = 0; i < created.length - 1; i++) {
      autoEdges.push({
        id: `edge-${Date.now()}-${i}`,
        from: created[i].id,
        to: created[i + 1].id,
      });
    }
    onChangeNodes(created);
    onChangeEdges(autoEdges);
    setConnectFromId(null);
  };

  const deleteNode = (id: string) => {
    onChangeNodes(nodes.filter((n) => n.id !== id));
    onChangeEdges(edges.filter((e) => e.from !== id && e.to !== id));
    if (connectFromId === id) setConnectFromId(null);
  };

  const handleNodePointerDown = (e: React.PointerEvent, node: DiagramNode) => {
    if (editingNodeId === node.id) return;
    if (connectMode) {
      e.stopPropagation();
      if (!connectFromId) {
        setConnectFromId(node.id);
      } else if (connectFromId !== node.id) {
        const exists = edges.some((ed) => ed.from === connectFromId && ed.to === node.id);
        if (!exists) {
          onChangeEdges([
            ...edges,
            {
              id: `edge-${Date.now()}`,
              from: connectFromId,
              to: node.id,
              label: edgeLabelInput.trim() || undefined,
            },
          ]);
        }
        setConnectFromId(null);
        setEdgeLabelInput('');
      } else {
        setConnectFromId(null);
      }
      return;
    }

    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragState({
      id: node.id,
      offsetX: e.clientX - rect.left - node.x,
      offsetY: e.clientY - rect.top - node.y,
    });
  };

  const handleBoardPointerMove = (e: React.PointerEvent) => {
    if (!dragState || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const maxX = Math.max(120, rect.width - 155);
    const maxY = Math.max(120, rect.height - 54);
    const nextX = Math.max(8, Math.min(maxX, e.clientX - rect.left - dragState.offsetX));
    const nextY = Math.max(8, Math.min(maxY, e.clientY - rect.top - dragState.offsetY));
    onChangeNodes(
      nodes.map((n) => (n.id === dragState.id ? { ...n, x: Math.round(nextX), y: Math.round(nextY) } : n))
    );
  };

  const handleBoardPointerUp = () => {
    setDragState(null);
  };

  const commitEdit = () => {
    if (!editingNodeId) return;
    const trimmed = editingText.trim();
    if (trimmed) {
      onChangeNodes(
        nodes.map((n) => (n.id === editingNodeId ? { ...n, label: trimmed } : n))
      );
    }
    setEditingNodeId(null);
  };

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {NODE_PALETTE.map((item) => (
            <button
              key={item.kind}
              type="button"
              onClick={() => addNode(item.kind)}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition hover:opacity-85 ${item.chipClass}`}
            >
              <Plus className="h-3 w-3" />
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setConnectMode((v) => !v);
              setConnectFromId(null);
            }}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition ${
              connectMode
                ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                : 'border-[var(--border)] bg-white text-[var(--ink-primary)] hover:bg-black/[0.03]'
            }`}
          >
            <Link2 className="h-3 w-3" />
            {connectMode
              ? connectFromId
                ? 'Click Target Block...'
                : 'Click Source Block'
              : 'Connect'}
          </button>

          {connectMode && (
            <input
              type="text"
              value={edgeLabelInput}
              onChange={(e) => setEdgeLabelInput(e.target.value)}
              placeholder="Edge label (optional)"
              className="w-28 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-[11px] focus:border-[var(--accent)] focus:outline-none"
            />
          )}

          <button
            type="button"
            onClick={loadStarter}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
          >
            <Sparkles className="h-3 w-3 text-[var(--accent)]" />
            Starter Map
          </button>

          {nodes.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onChangeNodes([]);
                onChangeEdges([]);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-[11px] text-[var(--ink-muted)] hover:text-rose-600"
              title="Clear board"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={boardRef}
        onPointerMove={handleBoardPointerMove}
        onPointerUp={handleBoardPointerUp}
        onPointerLeave={handleBoardPointerUp}
        className="relative min-h-[330px] flex-1 overflow-hidden rounded-xl border border-[var(--border)] bg-white select-none"
        style={{
          backgroundImage: 'radial-gradient(#D9D7D0 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      >
        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <p className="text-xs font-medium text-[var(--ink-secondary)]">
              Visual System / Workflow / Dependency Board
            </p>
            <p className="mt-1 max-w-sm text-[11px] text-[var(--ink-muted)]">
              Add blocks above or click <strong>Starter Map</strong>. Drag blocks to arrange, double-click text to rename, and toggle <strong>Connect</strong> to draw flows. The AI Interviewer reads this board!
            </p>
          </div>
        )}

        {/* SVG Edges */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          <defs>
            <marker
              id="loopos-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
            >
              <path d="M0,0 L8,4 L0,8 Z" fill="#6B7280" />
            </marker>
          </defs>
          {edges.map((edge) => {
            const fromNode = nodeMap.get(edge.from);
            const toNode = nodeMap.get(edge.to);
            if (!fromNode || !toNode) return null;
            const x1 = fromNode.x + 76;
            const y1 = fromNode.y + 24;
            const x2 = toNode.x + 76;
            const y2 = toNode.y + 24;
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            return (
              <g key={edge.id}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#9CA3AF"
                  strokeWidth="1.75"
                  markerEnd="url(#loopos-arrow)"
                />
                {edge.label && (
                  <g transform={`translate(${midX}, ${midY})`}>
                    <rect
                      x="-32"
                      y="-9"
                      width="64"
                      height="18"
                      rx="4"
                      fill="#FFFFFF"
                      stroke="#E6E5E0"
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="10"
                      fill="#5C5B57"
                    >
                      {edge.label.slice(0, 14)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Draggable Nodes */}
        {nodes.map((node) => {
          const style = KIND_STYLE_MAP[node.kind] ?? NODE_PALETTE[1];
          const isSource = connectFromId === node.id;
          return (
            <div
              key={node.id}
              onPointerDown={(e) => handleNodePointerDown(e, node)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditingNodeId(node.id);
                setEditingText(node.label);
              }}
              style={{ left: node.x, top: node.y }}
              className={`group absolute w-[152px] cursor-grab rounded-lg border px-2.5 py-2 shadow-xs transition-shadow active:cursor-grabbing ${
                style.cardClass
              } ${isSource ? 'ring-2 ring-[var(--accent)] ring-offset-1' : 'hover:shadow-md'}`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-[9px] font-semibold uppercase tracking-wider opacity-70">
                  {node.kind}
                </span>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNode(node.id);
                  }}
                  className="rounded p-0.5 opacity-0 transition hover:bg-black/10 group-hover:opacity-100"
                  aria-label="Delete block"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              {editingNodeId === node.id ? (
                <input
                  autoFocus
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit();
                    if (e.key === 'Escape') setEditingNodeId(null);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="mt-1 w-full rounded border border-[var(--accent)] bg-white px-1 py-0.5 text-xs text-[var(--ink-primary)] focus:outline-none"
                />
              ) : (
                <div className="mt-0.5 truncate text-xs font-medium" title={node.label}>
                  {node.label}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edge Chips for quick removal */}
      {edges.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--ink-secondary)]">
          <span className="font-medium text-[var(--ink-muted)]">Connections:</span>
          {edges.map((ed) => {
            const fromLabel = nodeMap.get(ed.from)?.label ?? '?';
            const toLabel = nodeMap.get(ed.to)?.label ?? '?';
            return (
              <span
                key={ed.id}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--canvas)] px-2 py-0.5"
              >
                <span className="max-w-[90px] truncate">{fromLabel}</span>
                <span>→</span>
                <span className="max-w-[90px] truncate">{toLabel}</span>
                <button
                  type="button"
                  onClick={() => onChangeEdges(edges.filter((e) => e.id !== ed.id))}
                  className="ml-0.5 text-[var(--ink-muted)] hover:text-rose-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
