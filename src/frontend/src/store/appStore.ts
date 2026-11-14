import { create } from 'zustand'
import { api } from '../api'
import type { Awards, Consistency, Profile, Readiness, SessionIn, Status } from '../types'
import { useBJJStore } from './bjjStore'

export type Tab = 'dojo' | 'roadmap' | 'train' | 'recovery' | 'fuel' | 'techniques' | 'badges'
export const TABS: Tab[] = ['dojo', 'roadmap', 'train', 'recovery', 'fuel', 'techniques', 'badges']

const tabFromHash = (): Tab => {
  const h = window.location.hash.replace('#', '').split('/')[0] as Tab
  return TABS.includes(h) ? h : 'dojo'
}

const dayTypeKey = () => `oss.dayType.${new Date().toLocaleDateString('en-CA')}`

interface AppStore {
  booted: boolean
  offline: boolean
  tab: Tab
  profile: Profile | null
  status: Status | null
  awards: Awards | null
  consistency: Consistency | null
  readiness: Readiness | null
  showProfile: boolean
  recoveryTab: 'readiness' | 'sleep' | 'injuries'
  dayType: string | null          // today's fuelling tier chosen by the athlete (kept per day)
  version: number                 // bumped after any mutation; pages re-fetch on change

  setTab: (t: Tab) => void
  goRecovery: (sub: 'readiness' | 'sleep' | 'injuries') => void
  boot: () => Promise<void>
  refresh: () => Promise<void>
  openProfile: (open: boolean) => void
  setDayType: (t: string | null) => void
  logSession: (s: SessionIn) => Promise<void>
  ackAwards: () => Promise<void>
}

export const useApp = create<AppStore>((set, get) => ({
  booted: false,
  offline: false,
  tab: tabFromHash(),
  profile: null,
  status: null,
  awards: null,
  consistency: null,
  readiness: null,
  showProfile: false,
  recoveryTab: 'readiness',
  dayType: localStorage.getItem(dayTypeKey()),
  version: 0,

  setTab: tab => {
    window.location.hash = tab
    set({ tab })
    window.scrollTo({ top: 0 })
  },

  goRecovery: sub => {
    set({ recoveryTab: sub })
    get().setTab('recovery')
  },

  boot: async () => {
    try {
      const profile = await api.profile()
      set({ profile, booted: true, offline: false })
      if (profile) await get().refresh()
    } catch {
      set({ booted: true, offline: true })
    }
  },

  refresh: async () => {
    try {
      const dt = get().dayType ?? undefined
      const [profile, status, awards, consistency, readiness] = await Promise.all([
        api.profile(), api.status(), api.awards(), api.consistency(), api.readiness({ day_type: dt }),
      ])
      set(s => ({ profile, status, awards, consistency, readiness, offline: false, version: s.version + 1 }))
    } catch {
      set({ offline: true })
    }
  },

  openProfile: showProfile => set({ showProfile }),

  setDayType: t => {
    if (t) localStorage.setItem(dayTypeKey(), t)
    else localStorage.removeItem(dayTypeKey())
    set({ dayType: t })
  },

  logSession: async s => {
    await api.logSession(s)
    await get().refresh()
    const tree = useBJJStore.getState()
    tree.fetchTree()
    tree.fetchDrillQueue()
  },

  ackAwards: async () => {
    await api.ackAwards()
    const awards = await api.awards()
    set({ awards })
  },
}))

window.addEventListener('hashchange', () => useApp.setState({ tab: tabFromHash() }))
