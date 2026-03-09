import React, { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useBJJStore } from './store/bjjStore'
import Header from './components/UI/Header'
import SkillTreeCanvas from './components/SkillTree/SkillTreeCanvas'
import LogForm from './components/SessionLog/LogForm'
import WeeklyChart from './components/Charts/WeeklyChart'
import DrillQueue from './components/UI/DrillQueue'
import RecentSessions from './components/UI/RecentSessions'
import VideoModal from './components/UI/VideoModal'
import { BRANCH_COLORS } from './types'

export default function App() {
  const {
    fetchTree,
    fetchSessions,
    fetchStats,
    fetchDrillQueue,
    showLogForm,
    showStats,
    selectedNodeId,
    setSelectedNode,
    setActiveVideo,
    treeData,
    error,
    loading,
  } = useBJJStore()

  useEffect(() => {
    fetchTree()
    fetchSessions()
    fetchStats()
    fetchDrillQueue()
  }, [])

  const selectedNode = selectedNodeId && treeData
    ? treeData.nodes.find(n => n.id === selectedNodeId)
    : null

  const selectedTechs = selectedNode && treeData
    ? treeData.techniques.filter(t => t.position_id === selectedNode.id)
    : []

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bjj-dark text-white">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <AnimatePresence>
          {showLogForm && (
            <motion.aside
              key="log-form"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden border-r border-bjj-border bg-bjj-card"
            >
              <div className="h-full w-80 overflow-y-auto p-4">
                <LogForm />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main area: tree + right panel */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-red-900/40 px-4 py-2 text-xs text-red-300 border-b border-red-800"
              >
                ⚠ {error} — is the backend running? (<code>uvicorn src.backend.main:app --reload</code>)
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-1 overflow-hidden">
            {/* Skill tree canvas */}
            <div className="flex-1 overflow-hidden">
              <SkillTreeCanvas />
            </div>

            {/* Right panel — drill queue + recent sessions */}
            <aside className="hidden w-56 flex-col gap-3 overflow-y-auto border-l border-bjj-border bg-bjj-card p-3 xl:flex">
              <DrillQueue />
              <RecentSessions />

              {/* Branch legend */}
              <div className="rounded-xl border border-bjj-border bg-bjj-dark p-3">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Branches</h3>
                <ul className="space-y-1.5">
                  {Object.entries(BRANCH_COLORS).map(([branch, color]) => (
                    <li key={branch} className="flex items-center gap-2 text-xs text-gray-400">
                      <div className="h-2 w-2 rounded-full" style={{ background: color }} />
                      <span className="capitalize">{branch}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>

          {/* Bottom stats panel */}
          <AnimatePresence>
            {showStats && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 160, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden border-t border-bjj-border bg-bjj-card px-4 py-3"
              >
                <WeeklyChart />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Node detail overlay (bottom of screen when node selected) */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute bottom-6 left-1/2 z-40 -translate-x-1/2"
            style={{ maxWidth: 600, width: '90vw' }}
          >
            <div
              className="rounded-2xl border px-5 py-3 shadow-2xl backdrop-blur-sm"
              style={{
                background: 'rgba(10, 10, 26, 0.97)',
                borderColor: BRANCH_COLORS[selectedNode.branch],
                boxShadow: `0 0 30px ${BRANCH_COLORS[selectedNode.branch]}33`,
              }}
            >
              {/* Top row */}
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">{selectedNode.branch}</div>
                  <div className="text-sm font-bold text-white">{selectedNode.name}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <div
                    className="h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                    style={{ borderColor: BRANCH_COLORS[selectedNode.branch], color: BRANCH_COLORS[selectedNode.branch] }}
                  >
                    {Math.round(selectedNode.proficiency)}
                  </div>
                  <span className="text-xs text-gray-500">%</span>
                </div>
                <p className="hidden sm:block text-xs text-gray-400 max-w-[200px] shrink">{selectedNode.description}</p>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="shrink-0 text-gray-600 hover:text-gray-300 transition-colors text-base leading-none ml-1"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              {/* Technique buttons */}
              {selectedTechs.length > 0 && (
                <div className="border-t border-white/10 pt-2 flex flex-wrap gap-1.5">
                  {selectedTechs.map(t => (
                    t.video_id ? (
                      <button
                        key={t.id}
                        onClick={() => setActiveVideo({ videoId: t.video_id!, title: t.name })}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all hover:brightness-125 active:scale-95"
                        style={{
                          background: `${BRANCH_COLORS[selectedNode.branch]}22`,
                          color: BRANCH_COLORS[selectedNode.branch],
                          border: `1px solid ${BRANCH_COLORS[selectedNode.branch]}44`,
                        }}
                      >
                        <span style={{ fontSize: 10 }}>▶</span>
                        {t.name}
                      </button>
                    ) : (
                      <span
                        key={t.id}
                        className="rounded-lg px-2.5 py-1 text-xs text-gray-500 bg-white/5 border border-white/10"
                      >
                        {t.name}
                      </span>
                    )
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading shimmer */}
      {loading && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="rounded-xl border border-bjj-border bg-bjj-card px-6 py-4 text-sm text-purple-300">
            Updating tree…
          </div>
        </div>
      )}

      {/* Video modal */}
      <VideoModal />
    </div>
  )
}
