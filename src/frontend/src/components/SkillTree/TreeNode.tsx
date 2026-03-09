import React from 'react'
import { TreeNode as TNode, BRANCH_COLORS } from '../../types'

interface Props {
  node: TNode
  isSelected: boolean
  isHovered: boolean
  onClick: (id: string) => void
  onHover: (id: string | null, e?: React.MouseEvent) => void
}

const R = 36  // node radius

function abbrev(name: string): string {
  const parts = name.split(/\s+/)
  if (parts.length === 1) return name.slice(0, 3).toUpperCase()
  return parts.slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

export default function TreeNode({ node, isSelected, isHovered, onClick, onHover }: Props) {
  const color = BRANCH_COLORS[node.branch]
  const active = node.proficiency > 0
  const highlight = isSelected || isHovered

  const ringR = R - 6
  const circ = 2 * Math.PI * ringR
  const arcLen = (node.proficiency / 100) * circ

  return (
    // NOTE: no motion.g — SVG scale animations via Framer Motion are unreliable
    // Use plain <g> with CSS transitions via style prop instead
    <g
      transform={`translate(${node.x}, ${node.y})`}
      onClick={() => onClick(node.id)}
      onMouseEnter={e => onHover(node.id, e)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: 'pointer' }}
    >
      {/* Outer diffuse glow (largest, most transparent) */}
      <circle r={R + 24} fill={color} opacity={highlight ? 0.18 : active ? 0.08 : 0.02} />
      {/* Inner glow */}
      <circle r={R + 12} fill={color} opacity={highlight ? 0.28 : active ? 0.13 : 0.03} />

      {/* Body */}
      <circle
        r={R}
        fill={active ? '#130e2e' : '#0b0b1e'}
        stroke={active ? color : '#252545'}
        strokeWidth={highlight ? 3 : 2}
      />

      {/* Proficiency arc — only when active */}
      {active && (
        <circle
          r={ringR}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={`${arcLen} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90)"
          opacity={0.95}
        />
      )}

      {/* 100% gold outer ring */}
      {node.proficiency >= 100 && (
        <circle r={R + 5} fill="none" stroke="#fbbf24" strokeWidth={2} opacity={0.8} />
      )}

      {/* Abbreviation */}
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fill={active ? '#ffffff' : '#35355a'}
        fontSize={15}
        fontWeight="800"
        letterSpacing="0.5"
        style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: 'inherit' }}
      >
        {abbrev(node.name)}
      </text>

      {/* Name label — below circle */}
      <text
        y={R + 15}
        textAnchor="middle"
        fill={active ? '#e2e8f0' : '#4b5563'}
        fontSize={11}
        fontWeight={active ? '600' : '400'}
        style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: 'inherit' }}
      >
        {node.name}
      </text>

      {/* Proficiency % label */}
      {active && (
        <text
          y={R + 28}
          textAnchor="middle"
          fill={color}
          fontSize={9}
          fontWeight="700"
          opacity={0.9}
          style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: 'inherit' }}
        >
          {Math.round(node.proficiency)}%
        </text>
      )}
    </g>
  )
}
