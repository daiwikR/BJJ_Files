import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts'
import { useBJJStore } from '../../store/bjjStore'
import { BRANCH_COLORS } from '../../types'

const TooltipStyle = {
  contentStyle: {
    background: '#12122a',
    border: '1px solid #1e1e4a',
    borderRadius: 8,
    fontSize: 11,
    color: '#e5e7eb',
  },
  cursor: { fill: 'rgba(168,85,247,0.08)' },
}

export default function WeeklyChart() {
  const { stats, treeData } = useBJJStore()

  if (!stats) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-gray-500">
        No stats yet — log your first session!
      </div>
    )
  }

  // Top positions as bar data
  const positionData = stats.top_positions.map(p => ({
    name: treeData?.nodes.find(n => n.id === p.position_id)?.name ?? p.position_id,
    reps: p.total_reps,
    fill: BRANCH_COLORS[treeData?.nodes.find(n => n.id === p.position_id)?.branch ?? 'bottom'],
  }))

  return (
    <div className="flex h-full gap-6 overflow-hidden px-1">
      {/* Weekly mat hours */}
      <div className="flex-1">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Weekly Mat Hours
        </h3>
        {stats.weekly_mat_hours.length === 0 ? (
          <div className="flex h-28 items-center justify-center text-xs text-gray-600">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={stats.weekly_mat_hours} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} />
              <Tooltip
                {...TooltipStyle}
                formatter={(v: number) => [`${v}h`, 'Mat time']}
              />
              <Bar dataKey="hours" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top positions */}
      <div className="flex-1">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Top Positions (reps)
        </h3>
        {positionData.length === 0 ? (
          <div className="flex h-28 items-center justify-center text-xs text-gray-600">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={positionData} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 9, fill: '#6b7280' }} />
              <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 9, fill: '#9ca3af' }} />
              <Tooltip {...TooltipStyle} formatter={(v: number) => [v, 'reps']} />
              <Bar dataKey="reps" radius={[0, 4, 4, 0]}>
                {positionData.map((entry, i) => (
                  <rect key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary stats */}
      <div className="flex flex-col justify-center gap-3 pr-2">
        {[
          { label: 'Sessions', value: stats.total_sessions, color: '#a855f7' },
          { label: 'Mat Hours', value: `${stats.total_mat_hours}h`, color: '#22c55e' },
          { label: 'Total Reps', value: stats.total_techniques_drilled, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="text-center">
            <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
