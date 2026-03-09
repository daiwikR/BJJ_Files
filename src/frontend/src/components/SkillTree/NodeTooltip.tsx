import React from 'react'
import { motion } from 'framer-motion'
import { TreeNode, BRANCH_COLORS } from '../../types'

interface Props {
  node: TreeNode
  techniques: { id: string; name: string; position_id: string; target_drills: number; difficulty: string }[]
}

const diffColor = { beginner: '#22c55e', intermediate: '#f59e0b', advanced: '#ef4444' }

export default function NodeTooltip({ node, techniques }: Props) {
  const color = BRANCH_COLORS[node.branch]
  const nodeTechs = techniques.filter(t => t.position_id === node.id)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.15 }}
      className="pointer-events-none absolute z-50 w-72 rounded-xl border p-4 shadow-2xl"
      style={{
        background: 'rgba(10, 10, 26, 0.97)',
        borderColor: color,
        boxShadow: `0 0 20px ${color}44`,
      }}
    >
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <div className="h-3 w-3 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
        <span className="text-sm font-bold uppercase tracking-wider" style={{ color }}>
          {node.branch}
        </span>
      </div>

      <h3 className="mb-1 text-base font-bold text-white">{node.name}</h3>
      <p className="mb-3 text-xs text-gray-400">{node.description}</p>

      {/* Proficiency bar */}
      <div className="mb-3">
        <div className="mb-1 flex justify-between text-xs text-gray-400">
          <span>Proficiency</span>
          <span style={{ color }}>{Math.round(node.proficiency)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${color}88, ${color})` }}
            initial={{ width: 0 }}
            animate={{ width: `${node.proficiency}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Techniques */}
      {nodeTechs.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Techniques ({nodeTechs.length})
          </div>
          <ul className="space-y-1">
            {nodeTechs.slice(0, 5).map(t => (
              <li key={t.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-300">{t.name}</span>
                <span
                  className="rounded px-1 py-0.5 text-[10px] font-medium"
                  style={{
                    color: diffColor[t.difficulty as keyof typeof diffColor],
                    background: `${diffColor[t.difficulty as keyof typeof diffColor]}22`,
                  }}
                >
                  {t.difficulty}
                </span>
              </li>
            ))}
            {nodeTechs.length > 5 && (
              <li className="text-xs text-gray-500">+{nodeTechs.length - 5} more…</li>
            )}
          </ul>
        </div>
      )}
    </motion.div>
  )
}
