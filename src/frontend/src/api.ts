import axios from 'axios'
import type {
  Awards, CheckIn, Consistency, Food, FuelDay, FuelHistoryRow, InjuryLibrary, MyInjury, Night, Profile,
  Readiness, Roadmap, Session, SessionIn, SleepData, Status,
} from './types'

const http = axios.create({ baseURL: '/api' })
const get = <T>(url: string, params?: object) => http.get<T>(url, { params }).then(r => r.data)

export interface ProfileInput extends Omit<Profile, 'belt_started_on' | 'level_started_on'> {
  belt_started_on?: string | null
  level_started_on?: string | null
  banked_hours?: number
  sync_rank?: boolean
}

export const api = {
  profile: () => get<Profile | null>('/profile'),
  saveProfile: (p: ProfileInput) => http.put<Profile>('/profile', p).then(r => r.data),
  status: () => get<Status | null>('/status'),
  roadmap: (plan?: { classes_per_day: number; days_per_week: number; class_minutes: number }) => get<Roadmap>('/roadmap', plan),
  check: (stage_key: string, item_id: string, checked: boolean) => http.post('/roadmap/check', { stage_key, item_id, checked }),
  promote: () => http.post('/roadmap/promote'),
  awards: () => get<Awards>('/awards'),
  ackAwards: () => http.post('/awards/ack'),
  consistency: () => get<Consistency>('/consistency'),

  sessions: (limit = 30) => get<Session[]>('/sessions', { limit }),
  logSession: (s: SessionIn) => http.post<Session>('/sessions', s).then(r => r.data),
  deleteSession: (id: number) => http.delete(`/sessions/${id}`),

  readiness: (q?: { planned_minutes?: number; planned_rpe?: number; day_type?: string }) => get<Readiness>('/recovery/assess', q),
  checkin: () => get<CheckIn | null>('/recovery/checkin'),
  saveCheckin: (c: CheckIn) => http.put<CheckIn>('/recovery/checkin', c).then(r => r.data),

  sleep: () => get<SleepData>('/sleep'),
  saveSleep: (n: Partial<Night> & { screen_off: string; screen_on: string }) => http.put<Night>('/sleep', n).then(r => r.data),
  deleteSleep: (day: string) => http.delete(`/sleep/${day}`),
  lightsOut: () => http.post('/sleep/lights-out', {}),
  wake: () => http.post<Night>('/sleep/wake', {}).then(r => r.data),
  cancelTap: () => http.delete('/sleep/tap/pending'),

  injuries: () => get<InjuryLibrary>('/injuries'),
  myInjuries: () => get<MyInjury[]>('/my-injuries'),
  addInjury: (b: { injury_slug: string; severity: string; side?: string | null; pain: number; started_on?: string }) =>
    http.post<MyInjury>('/my-injuries', b).then(r => r.data),
  patchInjury: (id: number, b: Partial<Pick<MyInjury, 'phase_index' | 'pain' | 'severity' | 'criteria_done' | 'status'>>) =>
    http.patch<MyInjury>(`/my-injuries/${id}`, b).then(r => r.data),
  deleteInjury: (id: number) => http.delete(`/my-injuries/${id}`),

  fuelDay: (day?: string, day_type?: string) => get<FuelDay>('/fuel/day', { day, day_type }),
  fuelHistory: () => get<FuelHistoryRow[]>('/fuel/history'),
  foods: (q: string) => get<Food[]>('/fuel/foods', { q }),
  addCustomFood: (f: Omit<Food, 'id' | 'custom'>) => http.post('/fuel/foods', f),
  logFood: (b: object) => http.post('/fuel/food', b),
  deleteFood: (id: number) => http.delete(`/fuel/food/${id}`),
  logWater: (ml: number, day?: string) => http.post('/fuel/water', { ml, day }),
  undoWater: (day?: string) => http.delete('/fuel/water/last', { params: { day } }),
}
