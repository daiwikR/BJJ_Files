import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBJJStore } from '../../store/bjjStore'
import { SessionIn, TechniqueLogIn, WEIGHT_CLASSES } from '../../types'

interface TechEntry {
  technique_id: string
  position_id: string
  name: string
  reps: number
}

export default function LogForm() {
  const { treeData, logSession, loading, toggleLogForm } = useBJJStore()

  const [giNogi, setGiNogi] = useState<'gi' | 'nogi'>('gi')
  const [sessionType, setSessionType] = useState<'drilling' | 'sparring' | 'competition'>('drilling')
  const [duration, setDuration] = useState(60)
  const [partnerWeight, setPartnerWeight] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedTechs, setSelectedTechs] = useState<TechEntry[]>([])
  const [searchTech, setSearchTech] = useState('')

  if (!treeData) return null

  const allTechniques = treeData.techniques.map(t => ({
    ...t,
    positionName: treeData.nodes.find(n => n.id === t.position_id)?.name ?? t.position_id,
  }))

  const filtered = allTechniques.filter(
    t =>
      t.name.toLowerCase().includes(searchTech.toLowerCase()) ||
      t.positionName.toLowerCase().includes(searchTech.toLowerCase()),
  )

  const addTechnique = (tech: (typeof allTechniques)[0]) => {
    if (selectedTechs.find(t => t.technique_id === tech.id)) return
    setSelectedTechs(prev => [
      ...prev,
      { technique_id: tech.id, position_id: tech.position_id, name: tech.name, reps: 10 },
    ])
    setSearchTech('')
  }

  const updateReps = (id: string, reps: number) => {
    setSelectedTechs(prev => prev.map(t => (t.technique_id === id ? { ...t, reps } : t)))
  }

  const removeTech = (id: string) => {
    setSelectedTechs(prev => prev.filter(t => t.technique_id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload: SessionIn = {
      gi_nogi: giNogi,
      session_type: sessionType,
      duration_min: duration,
      partner_weight: partnerWeight || undefined,
      notes: notes || undefined,
      techniques: selectedTechs.map(t => ({
        technique_id: t.technique_id,
        position_id: t.position_id,
        reps: t.reps,
      })),
    }
    await logSession(payload)
  }

  const radioBtn = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
      active
        ? 'bg-purple-700 text-white shadow-purple-glow'
        : 'bg-bjj-border text-gray-400 hover:bg-gray-700'
    }`

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex h-full flex-col"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-purple-400">Log Session</h2>
        <button onClick={toggleLogForm} className="text-gray-500 hover:text-white transition-colors">✕</button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto pr-1">
        {/* Gi / No-Gi */}
        <div>
          <label className="mb-1.5 block text-xs text-gray-400">Type</label>
          <div className="flex gap-2">
            <button type="button" className={radioBtn(giNogi === 'gi')} onClick={() => setGiNogi('gi')}>Gi</button>
            <button type="button" className={radioBtn(giNogi === 'nogi')} onClick={() => setGiNogi('nogi')}>No-Gi</button>
          </div>
        </div>

        {/* Session type */}
        <div>
          <label className="mb-1.5 block text-xs text-gray-400">Session</label>
          <div className="flex gap-2">
            {(['drilling', 'sparring', 'competition'] as const).map(s => (
              <button
                key={s}
                type="button"
                className={radioBtn(sessionType === s)}
                onClick={() => setSessionType(s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="mb-1.5 flex justify-between text-xs text-gray-400">
            <span>Duration</span>
            <span className="text-purple-400">{duration} min</span>
          </label>
          <input
            type="range"
            min={10}
            max={240}
            step={5}
            value={duration}
            onChange={e => setDuration(Number(e.target.value))}
            className="w-full accent-purple-500"
          />
        </div>

        {/* Partner weight */}
        <div>
          <label className="mb-1.5 block text-xs text-gray-400">Partner Weight Class</label>
          <select
            value={partnerWeight}
            onChange={e => setPartnerWeight(e.target.value)}
            className="w-full rounded-lg border border-bjj-border bg-bjj-card px-3 py-2 text-xs text-gray-300 focus:border-purple-500 focus:outline-none"
          >
            <option value="">— Optional —</option>
            {WEIGHT_CLASSES.map(w => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>

        {/* Techniques */}
        <div>
          <label className="mb-1.5 block text-xs text-gray-400">Techniques Drilled</label>
          <input
            type="text"
            value={searchTech}
            onChange={e => setSearchTech(e.target.value)}
            placeholder="Search techniques…"
            className="mb-2 w-full rounded-lg border border-bjj-border bg-bjj-card px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:border-purple-500 focus:outline-none"
          />

          {/* Dropdown results */}
          <AnimatePresence>
            {searchTech && (
              <motion.ul
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-2 max-h-40 overflow-y-auto rounded-lg border border-bjj-border bg-bjj-card"
              >
                {filtered.slice(0, 12).map(t => (
                  <li
                    key={t.id}
                    onClick={() => addTechnique(t)}
                    className="cursor-pointer px-3 py-2 text-xs text-gray-300 hover:bg-purple-900/40 hover:text-white"
                  >
                    <span>{t.name}</span>
                    <span className="ml-1 text-gray-500">({t.positionName})</span>
                  </li>
                ))}
                {filtered.length === 0 && (
                  <li className="px-3 py-2 text-xs text-gray-500">No matches</li>
                )}
              </motion.ul>
            )}
          </AnimatePresence>

          {/* Selected techniques */}
          <div className="space-y-2">
            {selectedTechs.map(t => (
              <div key={t.technique_id} className="flex items-center gap-2 rounded-lg border border-bjj-border bg-bjj-dark px-3 py-2">
                <span className="flex-1 text-xs text-gray-300 truncate">{t.name}</span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={t.reps}
                  onChange={e => updateReps(t.technique_id, Number(e.target.value))}
                  className="w-14 rounded border border-bjj-border bg-bjj-card px-2 py-1 text-center text-xs text-purple-300 focus:outline-none"
                />
                <span className="text-xs text-gray-500">reps</span>
                <button
                  type="button"
                  onClick={() => removeTech(t.technique_id)}
                  className="text-gray-600 hover:text-red-400 transition-colors text-xs"
                >✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1.5 block text-xs text-gray-400">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="What clicked today? What needs work?"
            className="w-full resize-none rounded-lg border border-bjj-border bg-bjj-card px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:border-purple-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-1 w-full rounded-xl bg-gradient-to-r from-purple-700 to-violet-600 py-3 text-sm font-bold text-white shadow-purple-glow transition-all hover:from-purple-600 hover:to-violet-500 disabled:opacity-50"
        >
          {loading ? 'Logging…' : '🥋 Log Session'}
        </button>
      </form>
    </motion.div>
  )
}
