import React from 'react'
import { motion } from 'framer-motion'
import { useBJJStore } from '../../store/bjjStore'
import { BRANCH_COLORS } from '../../types'

export default function DrillQueue() {
  const { drillQueue, treeData, setSelectedNode } = useBJJStore()

  if (drillQueue.length === 0) return null

  return (
    <div className="border border-ink-600 bg-ink-900 p-3">
      <h3 className="kicker mb-2">Drill queue</h3>
      <ul className="space-y-1.5">
        {drillQueue.slice(0, 5).map((item, i) => {
          const node = treeData?.nodes.find(n => n.id === item.position_id)
          const color = node ? BRANCH_COLORS[node.branch] : '#6b7280'
          return (
            <motion.li
              key={item.technique_id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex cursor-pointer items-center gap-2 px-2 py-1.5 transition-colors hover:bg-ink-700"
              onClick={() => node && setSelectedNode(node.id)}
            >
              <div className="h-1.5 w-1.5 flex-shrink-0" style={{ background: color }} />
              <span className="flex-1 truncate text-xs text-bone-dim">{item.name}</span>
              <span className="num text-[10px] text-gold flex-shrink-0">
                {item.days_since >= 9999 ? 'Never' : `${item.days_since}d`}
              </span>
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}
