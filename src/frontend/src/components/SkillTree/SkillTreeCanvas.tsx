import React, { useEffect, useRef, useState, useCallback } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { AnimatePresence } from 'framer-motion'
import { useBJJStore } from '../../store/bjjStore'
import { BRANCH_COLORS, Branch } from '../../types'
import TreeNode from './TreeNode'
import TreeEdge from './TreeEdge'
import NodeTooltip from './NodeTooltip'

// ────────────────────────────────────────────────────────────
// Canvas dimensions — must match the coordinates in skill_tree.json
// ────────────────────────────────────────────────────────────
const SVG_W = 2200
const SVG_H = 1180

// ────────────────────────────────────────────────────────────
// Branch label positions
// ────────────────────────────────────────────────────────────
const BRANCH_LABELS: { label: string; x: number; y: number; branch: Branch }[] = [
  { label: 'STANDUP',      x: 1100, y: 60,  branch: 'standup' },
  { label: 'GUARD (BOTTOM)', x: 850, y: 460, branch: 'bottom'  },
  { label: 'TOP GAME',     x: 1700, y: 260, branch: 'top'     },
  { label: 'BACK',         x: 480,  y: 290, branch: 'back'    },
  { label: 'TURTLE',       x: 480,  y: 620, branch: 'turtle'  },
]

export default function SkillTreeCanvas() {
  const {
    treeData,
    selectedNodeId,
    hoveredNodeId,
    setSelectedNode,
    setHoveredNode,
    lastLevelUp,
    clearLevelUp,
  } = useBJJStore()

  // Track mouse position in container coords for tooltip
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (lastLevelUp) {
      const t = setTimeout(clearLevelUp, 2200)
      return () => clearTimeout(t)
    }
  }, [lastLevelUp, clearLevelUp])

  const handleNodeHover = useCallback(
    (id: string | null, e?: React.MouseEvent) => {
      setHoveredNode(id)
      if (id && e && wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect()
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      } else {
        setMousePos(null)
      }
    },
    [setHoveredNode],
  )

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (hoveredNodeId && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect()
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
  }, [hoveredNodeId])

  if (!treeData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-3 text-5xl">🥋</div>
          <p className="text-sm text-gray-400">Loading skill tree…</p>
          <p className="mt-1 text-xs text-gray-600">Make sure the backend is running</p>
        </div>
      </div>
    )
  }

  const { nodes, edges, techniques } = treeData
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]))
  const hoveredNode = hoveredNodeId ? nodeMap[hoveredNodeId] : null

  return (
    <div
      ref={wrapperRef}
      className="relative h-full w-full overflow-hidden bg-bjj-dark"
      onMouseMove={handleMouseMove}
    >
      <TransformWrapper
        initialScale={0.52}
        minScale={0.2}
        maxScale={3}
        centerOnInit
        limitToBounds={false}
        wheel={{ step: 0.08 }}
      >
        <TransformComponent
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{ display: 'block' }}
        >
          <svg
            width={SVG_W}
            height={SVG_H}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            style={{ display: 'block', overflow: 'visible' }}
          >
            <defs>
              {/* Dot grid pattern */}
              <pattern id="dotgrid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <circle cx="30" cy="30" r="1.2" fill="#1e1e50" opacity="0.7" />
              </pattern>
              {/* Radial vignette */}
              <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
                <stop offset="0%"  stopColor="#0a0a1c" stopOpacity="0" />
                <stop offset="100%" stopColor="#020208" stopOpacity="0.8" />
              </radialGradient>
            </defs>

            {/* ── Background ── */}
            <rect width={SVG_W} height={SVG_H} fill="#080814" />
            <rect width={SVG_W} height={SVG_H} fill="url(#dotgrid)" />
            <rect width={SVG_W} height={SVG_H} fill="url(#vignette)" />

            {/* ── Branch labels ── */}
            {BRANCH_LABELS.map(l => (
              <text
                key={l.label}
                x={l.x}
                y={l.y}
                textAnchor="middle"
                fill={BRANCH_COLORS[l.branch]}
                fontSize={12}
                fontWeight="900"
                letterSpacing="4"
                opacity={0.3}
                style={{ userSelect: 'none', fontFamily: 'inherit' }}
              >
                {l.label}
              </text>
            ))}

            {/* ── Edges (render below nodes) ── */}
            {edges.map(edge => {
              const src = nodeMap[edge.source]
              const tgt = nodeMap[edge.target]
              if (!src || !tgt) return null
              const isHighlighted =
                selectedNodeId === edge.source || selectedNodeId === edge.target
              return (
                <TreeEdge
                  key={edge.id}
                  edge={edge}
                  sourceNode={src}
                  targetNode={tgt}
                  isHighlighted={isHighlighted}
                />
              )
            })}

            {/* ── Nodes (render above edges) ── */}
            {nodes.map(node => (
              <TreeNode
                key={node.id}
                node={node}
                isSelected={selectedNodeId === node.id}
                isHovered={hoveredNodeId === node.id}
                onClick={id => setSelectedNode(selectedNodeId === id ? null : id)}
                onHover={handleNodeHover}
              />
            ))}

            {/* ── Level-up burst at node position ── */}
            {lastLevelUp && nodeMap[lastLevelUp] && (() => {
              const n = nodeMap[lastLevelUp]
              const c = BRANCH_COLORS[n.branch]
              return (
                <>
                  <circle cx={n.x} cy={n.y} r={60} fill={c} opacity={0.3}>
                    <animate attributeName="r" from="60" to="120" dur="0.6s" fill="freeze" />
                    <animate attributeName="opacity" from="0.3" to="0" dur="0.6s" fill="freeze" />
                  </circle>
                  <circle cx={n.x} cy={n.y} r={40} fill={c} opacity={0.5}>
                    <animate attributeName="r" from="40" to="90" dur="0.5s" fill="freeze" />
                    <animate attributeName="opacity" from="0.5" to="0" dur="0.5s" fill="freeze" />
                  </circle>
                </>
              )
            })()}
          </svg>
        </TransformComponent>
      </TransformWrapper>

      {/* ── Tooltip — follows mouse, positioned in container space ── */}
      <AnimatePresence>
        {hoveredNode && mousePos && (
          <div
            className="pointer-events-none absolute z-50"
            style={{
              left: Math.min(mousePos.x + 18, (wrapperRef.current?.offsetWidth ?? 800) - 300),
              top: Math.max(mousePos.y - 10, 10),
            }}
          >
            <NodeTooltip node={hoveredNode} techniques={techniques} />
          </div>
        )}
      </AnimatePresence>

      {/* ── Controls hint ── */}
      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-1">
        <div className="rounded-lg border border-bjj-border bg-bjj-card/80 px-3 py-1.5 text-[10px] text-gray-500 backdrop-blur-sm">
          Scroll to zoom · Drag to pan · Click node to inspect
        </div>
      </div>

      {/* ── Level-up toast ── */}
      <AnimatePresence>
        {lastLevelUp && nodeMap[lastLevelUp] && (
          <div className="pointer-events-none absolute top-6 left-1/2 -translate-x-1/2 z-50">
            <div
              className="rounded-xl border px-5 py-2.5 text-sm font-bold shadow-2xl backdrop-blur-sm"
              style={{
                borderColor: BRANCH_COLORS[nodeMap[lastLevelUp].branch],
                background: `${BRANCH_COLORS[nodeMap[lastLevelUp].branch]}22`,
                color: BRANCH_COLORS[nodeMap[lastLevelUp].branch],
              }}
            >
              ⚡ Level up — {nodeMap[lastLevelUp].name}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
