import React from 'react'
import { useBJJStore } from '../../store/bjjStore'
import { formatDistanceToNow } from 'date-fns'

const typeColor = {
  drilling: '#22c55e',
  sparring: '#f59e0b',
  competition: '#ef4444',
}

export default function RecentSessions() {
  const { sessions } = useBJJStore()

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-bjj-border bg-bjj-card p-3">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Recent Sessions</h3>
        <p className="text-xs text-gray-600">No sessions yet. Log your first one!</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-bjj-border bg-bjj-card p-3">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Recent Sessions</h3>
      <ul className="space-y-2">
        {sessions.slice(0, 4).map(s => (
          <li key={s.id} className="flex items-start gap-2">
            <div
              className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full"
              style={{ background: typeColor[s.session_type as keyof typeof typeColor] ?? '#6b7280' }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-gray-300">
                <span className="font-medium capitalize">{s.session_type}</span>
                <span className="text-gray-600">·</span>
                <span className="uppercase text-gray-500">{s.gi_nogi}</span>
                <span className="text-gray-600">·</span>
                <span className="text-gray-500">{s.duration_min}m</span>
              </div>
              <div className="text-[10px] text-gray-600">
                {formatDistanceToNow(new Date(s.date), { addSuffix: true })} ·{' '}
                {s.technique_logs.length} technique{s.technique_logs.length !== 1 ? 's' : ''}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
