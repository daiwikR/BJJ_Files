import React from 'react'
import { motion } from 'framer-motion'
import { useBJJStore } from '../../store/bjjStore'
import { BRANCH_COLORS } from '../../types'

export default function DrillQueue() {
  const { drillQueue, treeData, setSelectedNode } = useBJJStore()

  if (drillQueue.length === 0) return null

  return (
    <div className="rounded-xl border border-bjj-border bg-bjj-card p-3">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-orange-400">
        🔥 Drill Queue
      </h3>
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
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-bjj-border"
              onClick={() => node && setSelectedNode(node.id)}
            >
              <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="flex-1 truncate text-xs text-gray-300">{item.name}</span>
              <span className="text-[10px] text-orange-400 flex-shrink-0">
                {item.days_since >= 9999 ? 'Never' : `${item.days_since}d`}
              </span>
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}
