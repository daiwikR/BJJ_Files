import { useEffect } from 'react'
import { useBJJStore } from '../store/bjjStore'
import { useApp } from '../store/appStore'
import SkillTreeCanvas from '../components/SkillTree/SkillTreeCanvas'
import DrillQueue from '../components/UI/DrillQueue'
import VideoModal from '../components/UI/VideoModal'
import Icon from '../components/common/Icon'
import { BRANCH_COLORS } from '../types'

export default function Techniques() {
  const { fetchTree, fetchDrillQueue, treeData, selectedNodeId, setSelectedNode, setActiveVideo } = useBJJStore()
  const { version, setTab } = useApp()

  useEffect(() => { fetchTree(); fetchDrillQueue() }, [fetchTree, fetchDrillQueue, version])

  const node = selectedNodeId && treeData ? treeData.nodes.find(n => n.id === selectedNodeId) : null
  const techs = node && treeData ? treeData.techniques.filter(t => t.position_id === node.id) : []
  const active = treeData?.nodes.filter(n => n.proficiency > 0).length ?? 0

  return (
    <div className="relative flex h-[calc(100dvh-7.5rem)] lg:h-screen">
      <div className="relative min-w-0 flex-1">
        <div className="pointer-events-none absolute left-4 top-4 z-10">
          <div className="kicker">Techniques</div>
          <h1 className="display text-4xl">Position map</h1>
          <p className="num mt-1 text-xs text-ash">{active}/{treeData?.nodes.length ?? 0} POSITIONS ACTIVE</p>
        </div>
        <SkillTreeCanvas />

        {node && (
          <div className="absolute inset-x-3 bottom-3 z-30 mx-auto max-w-xl">
            <div className="panel" style={{ boxShadow: `0 0 40px ${BRANCH_COLORS[node.branch]}33` }}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="label" style={{ color: BRANCH_COLORS[node.branch] }}>{node.branch}</div>
                  <div className="font-cond text-2xl font-bold uppercase tracking-wide">{node.name}</div>
                  <p className="text-sm text-bone-dim">{node.description}</p>
                </div>
                <div className="num text-2xl font-bold" style={{ color: BRANCH_COLORS[node.branch] }}>{Math.round(node.proficiency)}%</div>
                <button onClick={() => setSelectedNode(null)} className="text-ash hover:text-bone" aria-label="Close"><Icon name="x" /></button>
              </div>
              {techs.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-ink-600 pt-3">
                  {techs.map(t => t.video_id ? (
                    <button key={t.id} className="chip" onClick={() => setActiveVideo({ videoId: t.video_id!, title: t.name })}>
                      <span className="text-blood">▶</span>{t.name}
                    </button>
                  ) : <span key={t.id} className="chip" style={{ cursor: 'default' }}>{t.name}</span>)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <aside className="hidden w-64 shrink-0 flex-col gap-3 overflow-y-auto border-l border-ink-600 bg-ink-950/80 p-3 xl:flex">
        <DrillQueue />
        <div className="border border-ink-600 bg-ink-900 p-3">
          <h3 className="label mb-2">Branches</h3>
          <ul className="space-y-1.5">
            {Object.entries(BRANCH_COLORS).map(([b, c]) => (
              <li key={b} className="flex items-center gap-2 font-cond text-sm uppercase tracking-wider text-bone-dim"><span className="h-2 w-2" style={{ background: c }} />{b}</li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-ash">Positions fill in as you log drilled techniques with a session. Unpractised techniques decay by 1% a week.</p>
        <button className="btn btn-sm" onClick={() => setTab('train')}>Log a session</button>
      </aside>
      <VideoModal />
    </div>
  )
}
