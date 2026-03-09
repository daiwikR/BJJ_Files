import React from 'react'
import { motion } from 'framer-motion'
import { useBJJStore } from '../../store/bjjStore'

export default function Header() {
  const { toggleLogForm, toggleStats, showLogForm, showStats, treeData } = useBJJStore()

  // Count unlocked nodes (proficiency > 0)
  const unlockedCount = treeData?.nodes.filter(n => n.proficiency > 0).length ?? 0
  const totalCount = treeData?.nodes.length ?? 0

  return (
    <header className="flex h-14 items-center justify-between border-b border-bjj-border bg-bjj-card px-6">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🥋</span>
        <div>
          <h1 className="text-sm font-bold tracking-wider text-white">BJJ Skill Tree</h1>
          <p className="text-xs text-gray-500">
            {unlockedCount}/{totalCount} positions active
          </p>
        </div>
      </div>

      {/* Slim progress bar */}
      <div className="mx-6 flex-1 max-w-xs">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-bjj-border">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-purple-700 via-violet-500 to-fuchsia-500"
            animate={{ width: totalCount ? `${(unlockedCount / totalCount) * 100}%` : '0%' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <p className="mt-0.5 text-right text-[10px] text-gray-600">
          {totalCount ? Math.round((unlockedCount / totalCount) * 100) : 0}% unlocked
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleStats}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
            showStats
              ? 'border-purple-600 bg-purple-900/40 text-purple-300'
              : 'border-bjj-border text-gray-400 hover:border-purple-700 hover:text-white'
          }`}
        >
          📊 Stats
        </button>

        <button
          onClick={toggleLogForm}
          className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
            showLogForm
              ? 'bg-purple-800 text-white'
              : 'bg-gradient-to-r from-purple-700 to-violet-600 text-white shadow-purple-glow hover:from-purple-600 hover:to-violet-500'
          }`}
        >
          {showLogForm ? '✕ Close' : '+ Log Session'}
        </button>
      </div>
    </header>
  )
}
