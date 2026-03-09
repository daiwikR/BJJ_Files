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
  session_type: 'drilling' | 'sparring' | 'competition'
  duration_min: number
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
