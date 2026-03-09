import React from 'react'
import { TreeNode, TreeEdge as TEdge, BRANCH_COLORS } from '../../types'

interface Props {
  edge: TEdge
  sourceNode: TreeNode
  targetNode: TreeNode
  isHighlighted: boolean
}

export default function TreeEdge({ edge, sourceNode, targetNode, isHighlighted }: Props) {
  const color = BRANCH_COLORS[sourceNode.branch]

  // Gentle quadratic bezier — single control point offset from midpoint
  const mx = (sourceNode.x + targetNode.x) / 2
  const my = (sourceNode.y + targetNode.y) / 2
  const dx = targetNode.x - sourceNode.x
  const dy = targetNode.y - sourceNode.y
  const len = Math.sqrt(dx * dx + dy * dy)
  const curve = Math.min(len * 0.15, 60)

  // Perpendicular unit vector for the control point offset
  const px = (-dy / len) * curve
  const py = (dx / len) * curve

  const d = `M ${sourceNode.x} ${sourceNode.y} Q ${mx + px} ${my + py} ${targetNode.x} ${targetNode.y}`

  // Very long cross-tree edges (e.g. mount → back) are drawn lighter and dashed
  const isLong = len > 900
  const baseOpacity = isHighlighted ? 0.9 : isLong ? 0.18 : 0.5

  return (
    <g>
      {/* Glow halo */}
      <path
        d={d}
        stroke={color}
        strokeWidth={isHighlighted ? 10 : 6}
        fill="none"
        opacity={isHighlighted ? 0.25 : isLong ? 0.04 : 0.10}
        strokeLinecap="round"
      />
      {/* Main line */}
      <path
        d={d}
        stroke={color}
        strokeWidth={isHighlighted ? 2.5 : 1.5}
        fill="none"
        opacity={baseOpacity}
        strokeLinecap="round"
        strokeDasharray={isLong ? '7 5' : undefined}
      />
    </g>
  )
}
