import { create } from 'zustand'
import axios from 'axios'
import { TreeData, Session, Stats, DrillQueueItem, SessionIn } from '../types'

interface BJJStore {
  treeData: TreeData | null
  sessions: Session[]
  stats: Stats | null
  drillQueue: DrillQueueItem[]
  selectedNodeId: string | null
  hoveredNodeId: string | null
  showLogForm: boolean
  showStats: boolean
  loading: boolean
  error: string | null
  lastLevelUp: string | null   // nodeId that just hit a milestone
  activeVideo: { videoId: string; title: string } | null

  fetchTree: () => Promise<void>
  fetchSessions: () => Promise<void>
  fetchStats: () => Promise<void>
  fetchDrillQueue: () => Promise<void>
  logSession: (session: SessionIn) => Promise<void>
  setSelectedNode: (id: string | null) => void
  setHoveredNode: (id: string | null) => void
  toggleLogForm: () => void
  toggleStats: () => void
  clearLevelUp: () => void
  setActiveVideo: (video: { videoId: string; title: string } | null) => void
}

export const useBJJStore = create<BJJStore>((set, get) => ({
  treeData: null,
  sessions: [],
  stats: null,
  drillQueue: [],
  selectedNodeId: null,
  hoveredNodeId: null,
  showLogForm: false,
  showStats: false,
  loading: false,
  error: null,
  lastLevelUp: null,
  activeVideo: null,

  fetchTree: async () => {
    set({ loading: true, error: null })
    try {
      const { data } = await axios.get<TreeData>('/api/tree')
      set({ treeData: data, loading: false })
    } catch {
      set({ error: 'Failed to load skill tree', loading: false })
    }
  },

  fetchSessions: async () => {
    try {
      const { data } = await axios.get<Session[]>('/api/sessions')
      set({ sessions: data })
    } catch {
      set({ error: 'Failed to load sessions' })
    }
  },

  fetchStats: async () => {
    try {
      const { data } = await axios.get<Stats>('/api/tree/stats')
      set({ stats: data })
    } catch {
      set({ error: 'Failed to load stats' })
    }
  },

  fetchDrillQueue: async () => {
    try {
      const { data } = await axios.get<DrillQueueItem[]>('/api/tree/drill-queue')
      set({ drillQueue: data })
    } catch {/* silent */}
  },

  logSession: async (session: SessionIn) => {
    set({ loading: true, error: null })
    try {
      const prevTree = get().treeData
      await axios.post('/api/sessions', session)

      // Refresh tree + check for milestone
      const { data: newTree } = await axios.get<TreeData>('/api/tree')

      // Detect level-up (proficiency crossed a 25% threshold)
      let levelUpNode: string | null = null
      if (prevTree) {
        for (const newNode of newTree.nodes) {
          const prevNode = prevTree.nodes.find(n => n.id === newNode.id)
          if (prevNode) {
            const thresholds = [25, 50, 75, 100]
            for (const t of thresholds) {
              if (prevNode.proficiency < t && newNode.proficiency >= t) {
                levelUpNode = newNode.id
                break
              }
            }
          }
        }
      }

      set({ treeData: newTree, loading: false, lastLevelUp: levelUpNode, showLogForm: false })

      // Refresh secondary data
      get().fetchSessions()
      get().fetchStats()
      get().fetchDrillQueue()
    } catch {
      set({ error: 'Failed to log session', loading: false })
    }
  },

  setSelectedNode: (id) => set({ selectedNodeId: id }),
  setHoveredNode: (id) => set({ hoveredNodeId: id }),
  toggleLogForm: () => set(s => ({ showLogForm: !s.showLogForm })),
  toggleStats: () => set(s => ({ showStats: !s.showStats })),
  clearLevelUp: () => set({ lastLevelUp: null }),
  setActiveVideo: (video) => set({ activeVideo: video }),
}))
