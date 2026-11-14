export type Branch = 'standup' | 'top' | 'bottom' | 'back' | 'turtle'

export interface TreeNode {
  id: string
  name: string
  branch: Branch
  x: number
  y: number
  description: string
  target_drills: number
  proficiency: number
}

export interface TreeEdge {
  id: string
  source: string
  target: string
  technique: string
}

export interface Technique {
  id: string
  name: string
  position_id: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  target_drills: number
  description: string
  video_id?: string
}

export interface TreeData {
  nodes: TreeNode[]
  edges: TreeEdge[]
  techniques: Technique[]
}

export interface TechniqueLogIn {
  technique_id: string
  position_id: string
  reps: number
}

export interface SessionIn {
  gi_nogi: 'gi' | 'nogi'
  session_type: string
  duration_min: number
  intensity: number
  day?: string
  partner_weight?: string
  notes?: string
  techniques: TechniqueLogIn[]
}

export interface Session {
  id: number
  date: string
  gi_nogi: string
  session_type: string
  duration_min: number
  intensity: number | null
  partner_weight?: string
  notes?: string
  technique_logs: { id: number; technique_id: string; position_id: string; reps: number }[]
}

export interface Stats {
  total_sessions: number
  total_mat_hours: number
  total_techniques_drilled: number
  weekly_mat_hours: { week: string; hours: number }[]
  weekly_new_techniques: { week: string; count: number }[]
  top_positions: { position_id: string; total_reps: number }[]
}

export interface DrillQueueItem {
  technique_id: string
  position_id: string
  days_since: number
  name: string
}

export const BRANCH_COLORS: Record<Branch, string> = {
  standup: '#22c55e',
  top: '#f59e0b',
  bottom: '#a855f7',
  back: '#ef4444',
  turtle: '#06b6d4',
}

export const WEIGHT_CLASSES = [
  'Rooster (< 57.5 kg)',
  'Light Feather (< 64 kg)',
  'Feather (< 70 kg)',
  'Light (< 76 kg)',
  'Middle (< 82.3 kg)',
  'Medium Heavy (< 88.3 kg)',
  'Heavy (< 94.3 kg)',
  'Super Heavy (< 100.5 kg)',
  'Ultra Heavy (> 100.5 kg)',
]

// ─── App-wide types (profile, roadmap, recovery, sleep, fuel) ────────────────

export type BeltId = 'white' | 'blue' | 'purple' | 'brown' | 'black'
export const BELT_COLORS: Record<BeltId, string> = {
  white: '#ece7dd', blue: '#2463eb', purple: '#8b3fd6', brown: '#8a5a2b', black: '#141416',
}
export const BELT_NAMES: Record<BeltId, string> = {
  white: 'White', blue: 'Blue', purple: 'Purple', brown: 'Brown', black: 'Black',
}

export interface Profile {
  name: string | null
  belt: BeltId
  stripes: number
  belt_started_on: string | null
  level_started_on: string | null
  classes_per_day: number
  days_per_week: number
  class_minutes: number
  age: number | null
  sex: 'male' | 'female' | null
  weight_kg: number | null
  height_cm: number | null
  goal: 'cut' | 'maintain' | 'gain'
  sleep_need_h: number
}

export interface Gate { have: number; need: number; met: boolean; total?: number }
export type Gates = Record<string, Gate>
export interface Competency { id: string; text: string }

export interface Stage {
  key: string
  title: string
  focus: string
  hours: number
  why: string
  train: string[]
  competencies: Competency[]
  rolling: string
  mistake: string
  index: number
  floor_weeks: number
  state?: 'done' | 'current' | 'locked'
  checked?: string[]
  gates?: Gates
  pct?: number
  ready?: boolean
  eta?: string | null
  eta_actual?: string
  weeks?: number
  limited_by?: string
}

export interface BeltInfo {
  id: BeltId
  name: string
  color: string
  theme: string
  creed: string
  summary: string
  hours_total: number
  ibjjf_min_months: number
  stage_floor_weeks: number
  typical_years: number[]
  weekly_sessions: number[]
  split: { drill: number; positional: number; live: number }
  state: 'done' | 'current' | 'locked'
  stages: Stage[]
  eta?: string | null
}

export interface Roadmap {
  model: {
    baseline: string
    rules: { id: string; title: string; text: string }[]
    sources: { title: string; url: string; used_for: string }[]
    honesty: string
  }
  belts: BeltInfo[]
  black: { name: string; theme: string; creed: string; summary: string; state: string; eta: string | null }
  plan: {
    classes_per_day: number; days_per_week: number; class_minutes: number
    weekly_hours: number; effective_weekly_hours: number; actual_weekly_hours: number
    sessions_per_week: number; volume: { level: 'ok' | 'high' | 'low'; text: string }
  }
  current: { belt: BeltId; stripes: number; stage_key: string | null; ready: boolean; is_belt_stage: boolean }
  split: { drill: number; positional: number; live: number } | null
}

export interface Status {
  belt: BeltId
  stripes: number
  stage: Stage | null
  gates?: Gates
  pct?: number
  all_met?: boolean
  is_belt_stage?: boolean
  checked?: string[]
  todo?: Competency[]
  belt_info?: { name: string; theme: string; creed: string; color: string; split: { drill: number; positional: number; live: number }; weekly_sessions: number[] }
  total_hours?: number
}

export interface Award {
  id: number; key: string; kind: 'stripe' | 'belt_ready' | 'belt' | 'consistency'
  title: string; detail: string | null; belt: BeltId | null; stripes: number | null; earned_at: string; seen: boolean
}
export interface Awards { awards: Award[]; unseen: Award[]; milestones: { sessions: number[]; hours: number[]; streak: number[] } }

export interface WeekRow { start: string; days: number; sessions: number; minutes: number; hours: number; load: number; hit: boolean; frozen: boolean; current: boolean }
export interface Consistency {
  target: { days: number; sessions: number; min_days: number }
  this_week: WeekRow & { days_left: number }
  streak: number
  best_streak: number
  weeks: WeekRow[]
  calendar: { day: string; minutes: number; sessions: number; max_rpe: number; future: boolean }[]
  totals: { sessions: number; hours: number; days: number }
  rule: string
}

export type ZoneKey = 'go' | 'smart' | 'tone' | 'recover' | 'rest'
export const ZONE_COLORS: Record<ZoneKey, string> = {
  go: '#4ade80', smart: '#d6dd45', tone: '#ffa42b', recover: '#ff6a3d', rest: '#e5202f',
}
export interface Factor { key: string; bucket: string; label: string; value: string; status: 'good' | 'watch' | 'bad' | 'info'; penalty: number; detail: string }
export interface Readiness {
  score: number
  zone: { key: ZoneKey; label: string; headline: string; rpe_cap: number; volume_factor: number }
  overrides: string[]
  buckets: Record<string, { label: string; penalty: number; cap: number }>
  factors: Factor[]
  metrics: { acute: number; chronic: number; acwr: number | null; monotony: number | null; strain: number | null; consecutive_days: number; hard_3d: number; training_days_7: number; rest_days_7: number; history_days: number; today_load: number }
  series: { day: string; load: number }[]
  prescription: { rpe_cap: number; max_minutes: number; sessions: string[]; load_room: number | null }
  planned: { minutes: number; rpe: number; load: number; projected_acwr: number | null; ok: boolean; verdict: string } | null
  advice: string[]
  confidence: 'low' | 'medium' | 'high'
  inputs: { checkin: boolean; sleep: boolean; fuel: boolean; injuries: number; history_days: number }
  day: string
}

export interface CheckIn { soreness: number; fatigue: number; stress: number; mood: number; illness: 'none' | 'head_cold' | 'systemic'; notes?: string | null }

export interface Night {
  day: string; source: string; screen_off: string; screen_on: string; latency_min: number; awake_min: number
  night_pickups: number; quality: number; notes: string | null; window_min: number; asleep_min: number; hours: number; efficiency: number
}
export interface SleepSummary {
  day: string; hours: number; window_min: number; efficiency: number; quality: number; avg_hours_7: number
  debt_hours_7: number; bedtime_sd_min: number | null; nights_logged: number; need_h: number; score: number
  parts: Record<string, number>
}
export interface SleepData { nights: Night[]; summary: SleepSummary | null; pending_tap: string | null; need_h: number; today: string }

export interface RehabPhase { name: string; window: string; mat: string; goals: string[]; work: { name: string; dose: string }[]; progress_when: string[] }
export interface InjuryDoc {
  slug: string; name: string; region: string; tagline: string; how: string[]; symptoms: string[]; red_flags: string[]
  weeks: Record<string, number[]>; phases: RehabPhase[]; avoid: string[]; prevent: string[]
}
export interface InjuryLibrary { disclaimer: string; mat_levels: Record<string, string>; sources: { title: string; url: string }[]; injuries: InjuryDoc[] }
export interface MyInjury {
  id: number; slug: string; name: string; region: string; side: string | null; severity: 'mild' | 'moderate' | 'severe'
  started_on: string; days: number; phase_index: number; phase_count: number; phase: RehabPhase | null; pain: number
  criteria_done: string[]; status: 'active' | 'resolved'; resolved_on: string | null; notes: string | null
  expected_weeks: (number | null)[]; mat_level: string; mat_text: string
}

export interface Food { id: number; name: string; category: string; kcal: number; protein: number; carbs: number; fat: number; serving_g: number; serving_label: string | null; custom: boolean }
export interface FuelHint { key: string; tone: 'warn' | 'info' | 'good'; title: string; text: string }
export interface FuelDay {
  day: string
  targets: {
    day_type: string; day_label: string; goal: string; weight_kg: number; weight_assumed: boolean; kcal: number; protein: number
    carbs: number; fat: number; water_ml: number; per_kg: { protein: number; carbs: number; fat: number }; tdee: number
    training_kcal: number; fat_floor: number; day_type_source: string; training_hours: number
  }
  totals: { kcal: number; protein: number; carbs: number; fat: number; water_ml: number; entries: number }
  score: { score: number; parts: Record<string, number>; energy_ratio: number }
  logged: boolean
  hour: number
  trained: boolean
  entries: { id: number; meal: string; name: string; grams: number | null; kcal: number; protein: number; carbs: number; fat: number }[]
  water: { id: number; ml: number }[]
  hints: FuelHint[]
  day_types: Record<string, string>
}
export interface FuelHistoryRow { day: string; logged: boolean; score: number | null; kcal: number; protein: number; water_ml: number; target_kcal: number; target_protein: number }

export const SESSION_TYPES: { id: string; label: string; rpe: number }[] = [
  { id: 'class', label: 'Class', rpe: 6 },
  { id: 'drilling', label: 'Drilling', rpe: 4 },
  { id: 'sparring', label: 'Sparring', rpe: 8 },
  { id: 'open_mat', label: 'Open mat', rpe: 6 },
  { id: 'competition', label: 'Comp', rpe: 9 },
  { id: 'private', label: 'Private', rpe: 5 },
]

export const RPE_TEXT = [
  '', 'Barely moving', 'Very easy', 'Easy, could chat', 'Light sweat', 'Steady work',
  'Working, still in control', 'Hard rounds', 'Very hard, gassed', 'Near max', 'Everything you had',
]
