import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { useApp } from '../store/appStore'
import { useBJJStore } from '../store/bjjStore'
import type { Session } from '../types'
import { RPE_TEXT, SESSION_TYPES, ZONE_COLORS } from '../types'
import Icon from '../components/common/Icon'
import { Bars, Field, PageHead, Panel, Scale, Segmented, Stat, fmtDate, localISO } from '../components/common/ui'

interface Tech { technique_id: string; position_id: string; name: string; reps: number }

function LogForm() {
  const { profile, logSession, readiness } = useApp()
  const { treeData, fetchTree } = useBJJStore()
  const [day, setDay] = useState(localISO())
  const [type, setType] = useState('class')
  const [gi, setGi] = useState<'gi' | 'nogi'>('gi')
  const [minutes, setMinutes] = useState(profile?.class_minutes ?? 90)
  const [rpe, setRpe] = useState(6)
  const [notes, setNotes] = useState('')
  const [q, setQ] = useState('')
  const [techs, setTechs] = useState<Tech[]>([])
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => { if (!treeData) fetchTree() }, [treeData, fetchTree])

  const matches = useMemo(() => {
    if (!treeData || !q.trim()) return []
    const s = q.toLowerCase()
    return treeData.techniques
      .map(t => ({ ...t, pos: treeData.nodes.find(n => n.id === t.position_id)?.name ?? '' }))
      .filter(t => (t.name + ' ' + t.pos).toLowerCase().includes(s) && !techs.some(x => x.technique_id === t.id))
      .slice(0, 8)
  }, [q, treeData, techs])

  const cap = readiness?.zone.rpe_cap ?? 10
  const overCap = day === localISO() && rpe > cap && cap > 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await logSession({
        gi_nogi: gi, session_type: type as never, duration_min: minutes, intensity: rpe, day,
        notes: notes.trim() || undefined,
        techniques: techs.map(t => ({ technique_id: t.technique_id, position_id: t.position_id, reps: t.reps })),
      })
      setNotes(''); setTechs([]); setDone(true)
      setTimeout(() => setDone(false), 2500)
    } finally { setBusy(false) }
  }

  return (
    <Panel hot as="form" onSubmit={submit}>
      <div className="kicker">Log a session</div>
      <div className="mt-3 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><input type="date" className="field" value={day} max={localISO()} onChange={e => setDay(e.target.value)} /></Field>
          <Field label="Uniform">
            <Segmented value={gi} onChange={setGi} options={[{ id: 'gi', label: 'Gi' }, { id: 'nogi', label: 'No-gi' }]} />
          </Field>
        </div>
        <Field label="Session type">
          <Segmented value={type} onChange={t => { setType(t); setRpe(SESSION_TYPES.find(s => s.id === t)?.rpe ?? 6) }}
            options={SESSION_TYPES.map(s => ({ id: s.id, label: s.label }))} />
        </Field>
        <div>
          <div className="flex items-baseline justify-between">
            <span className="label">Time on the mat</span>
            <span className="num text-xl font-bold">{minutes}<span className="text-xs font-medium text-ash"> min</span></span>
          </div>
          <input type="range" min={15} max={240} step={5} value={minutes} onChange={e => setMinutes(Number(e.target.value))} aria-label="Duration in minutes" />
        </div>
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="label">How hard was it? (RPE)</span>
            <span className="num text-xs text-ash">LOAD {minutes * rpe} AU</span>
          </div>
          <Scale value={rpe} onChange={setRpe} labels={RPE_TEXT.slice(1)} />
          {overCap && (
            <p className="mt-2 flex gap-2 border-l-2 border-zone-tone pl-3 text-xs text-bone-dim">
              Today's readiness cap was RPE {cap}. Logged honestly is better than logged low: the calculator needs the real number.
            </p>
          )}
        </div>
        <div>
          <span className="label mb-1 block">Techniques drilled <span className="text-smoke">(optional, feeds the skill tree)</span></span>
          <input className="field" value={q} onChange={e => setQ(e.target.value)} placeholder="Search: armbar, knee slice, half guard…" />
          {matches.length > 0 && (
            <ul className="max-h-44 overflow-y-auto border border-t-0 border-ink-600 bg-ink-950">
              {matches.map(t => (
                <li key={t.id}>
                  <button type="button" className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-ink-800"
                    onClick={() => { setTechs(p => [...p, { technique_id: t.id, position_id: t.position_id, name: t.name, reps: 10 }]); setQ('') }}>
                    <span>{t.name}</span><span className="text-xs text-ash">{t.pos}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {techs.length > 0 && (
            <ul className="mt-2 space-y-1">
              {techs.map(t => (
                <li key={t.technique_id} className="flex items-center gap-2 border border-ink-600 bg-ink-900 px-3 py-1.5 text-sm">
                  <span className="min-w-0 flex-1 truncate">{t.name}</span>
                  <input type="number" min={1} max={500} value={t.reps} aria-label={`Reps of ${t.name}`}
                    onChange={e => setTechs(p => p.map(x => x.technique_id === t.technique_id ? { ...x, reps: Math.max(1, Number(e.target.value)) } : x))}
                    className="num w-16 border border-ink-600 bg-ink-950 px-2 py-1 text-center" />
                  <span className="label">reps</span>
                  <button type="button" className="text-smoke hover:text-blood" aria-label={`Remove ${t.name}`} onClick={() => setTechs(p => p.filter(x => x.technique_id !== t.technique_id))}><Icon name="x" size={14} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Field label="Notes">
          <textarea className="field" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="What clicked? What got you tapped?" />
        </Field>
        <button className="btn w-full" disabled={busy}>{busy ? 'Logging…' : done ? '✓ Logged. Oss.' : 'Log session'}</button>
      </div>
    </Panel>
  )
}

function Heatmap() {
  const { consistency } = useApp()
  if (!consistency) return null
  const cells = consistency.calendar
  const weeks: typeof cells[] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  const shade = (m: number) => m === 0 ? '#15151a' : m < 60 ? '#5c0d15' : m < 100 ? '#9c111d' : m < 150 ? '#e5202f' : '#ff6b76'
  return (
    <div>
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {weeks.map((w, i) => (
          <div key={i} className={`flex-col gap-[3px] ${i < weeks.length - 18 ? 'hidden sm:flex' : 'flex'}`}>
            {w.map(c => (
              <div key={c.day} className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" title={`${fmtDate(c.day)}: ${c.minutes ? `${c.minutes} min` : 'rest'}`}
                style={{ background: c.future ? 'transparent' : shade(c.minutes), outline: c.future ? '1px dashed #2a2a32' : 'none', outlineOffset: -1 }} />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-ash">
        <span className="num">REST</span>
        {[0, 45, 90, 120, 180].map(m => <span key={m} className="h-3 w-3" style={{ background: shade(m) }} />)}
        <span className="num">2.5 H+</span>
      </div>
    </div>
  )
}

export default function Train() {
  const { consistency, version, refresh, profile } = useApp()
  const [sessions, setSessions] = useState<Session[]>([])
  const [all, setAll] = useState(false)

  useEffect(() => { api.sessions(30).then(setSessions).catch(() => {}) }, [version])

  const remove = async (id: number) => {
    await api.deleteSession(id)
    await refresh()
  }
  const weeks = (consistency?.weeks ?? []).slice(-12)
  const target = profile ? Math.round((profile.classes_per_day * profile.days_per_week * profile.class_minutes) / 6) / 10 : undefined

  return (
    <div>
      <PageHead kicker="Train" title="Show up. Log it." />
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-5"><LogForm /></div>

        <div className="min-w-0 space-y-4 lg:col-span-7">
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="kicker">Consistency</div>
              <div className="flex gap-5">
                <Stat label="Streak" value={consistency?.streak ?? 0} unit="wk" color="#e3b34a" />
                <Stat label="Best" value={consistency?.best_streak ?? 0} unit="wk" />
                <Stat label="This week" value={`${consistency?.this_week.days ?? 0}/${consistency?.target.days ?? 0}`} unit="days" />
              </div>
            </div>
            <div className="mt-4"><Heatmap /></div>
            <p className="mt-3 text-xs text-ash">{consistency?.rule}</p>
          </Panel>

          <Panel>
            <div className="kicker">Mat hours per week</div>
            <div className="mt-5">
              <Bars unit=" h" target={target} every={2}
                data={weeks.map(w => ({
                  label: fmtDate(w.start, { day: 'numeric', month: 'numeric' }), value: w.hours,
                  color: w.hit ? '#e5202f' : w.frozen ? '#5aa9ff' : '#3b3b45',
                  title: `Week of ${fmtDate(w.start)}: ${w.hours} h over ${w.days} day${w.days === 1 ? '' : 's'}${w.hit ? ' · on target' : w.frozen ? ' · frozen (injury)' : ''}`,
                }))} />
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-ash">
              <span><i className="mr-1 inline-block h-2 w-2 bg-blood" />on target</span>
              <span><i className="mr-1 inline-block h-2 w-2 bg-ink-500" />missed</span>
              <span><i className="mr-1 inline-block h-2 w-2" style={{ background: '#5aa9ff' }} />frozen by injury</span>
              <span>- - planned hours</span>
            </div>
          </Panel>

          <Panel>
            <div className="kicker">Session history</div>
            {sessions.length === 0 ? (
              <p className="mt-3 text-sm text-ash">Nothing logged yet. The first one is the hardest.</p>
            ) : (
              <ul className="mt-2 divide-y divide-ink-600">
                {(all ? sessions : sessions.slice(0, 8)).map(s => {
                  const rpe = s.intensity ?? 6
                  const c = rpe >= 8 ? ZONE_COLORS.rest : rpe >= 6 ? ZONE_COLORS.tone : ZONE_COLORS.go
                  return (
                    <li key={s.id} className="group flex items-center gap-3 py-2.5">
                      <div className="num w-14 shrink-0 text-xs text-ash">{fmtDate(s.date.slice(0, 10), { day: 'numeric', month: 'short' })}</div>
                      <div className="min-w-0 flex-1">
                        <div className="font-cond text-base font-semibold uppercase tracking-wide">
                          {SESSION_TYPES.find(t => t.id === s.session_type)?.label ?? s.session_type}
                          <span className="ml-2 text-xs font-medium text-ash">{s.gi_nogi === 'gi' ? 'GI' : 'NO-GI'}</span>
                        </div>
                        {s.notes && <div className="truncate text-xs text-ash">{s.notes}</div>}
                      </div>
                      <div className="num text-right text-sm">
                        <div>{s.duration_min} min</div>
                        <div className="text-[11px]" style={{ color: c }}>RPE {rpe}</div>
                      </div>
                      <button onClick={() => remove(s.id)} className="text-smoke opacity-60 hover:text-blood group-hover:opacity-100" aria-label="Delete session"><Icon name="trash" size={16} /></button>
                    </li>
                  )
                })}
              </ul>
            )}
            {sessions.length > 8 && (
              <button className="chip mt-3" onClick={() => setAll(a => !a)}>{all ? 'Show fewer' : `Show ${sessions.length - 8} more`}</button>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
