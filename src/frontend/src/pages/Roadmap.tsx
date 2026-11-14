import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { useApp } from '../store/appStore'
import type { BeltInfo, Roadmap, Stage } from '../types'
import Belt from '../components/common/Belt'
import Icon from '../components/common/Icon'
import { Details, Meter, PageHead, Panel, Sources, Stat, Stepper, fmtDate } from '../components/common/ui'

const LIMIT_TEXT: Record<string, string> = {
  hours: 'Limited by mat hours: train more to move this date.',
  calendar: 'Limited by the calendar floor: more hours will not move this date.',
  ibjjf: 'Limited by the IBJJF minimum time at this belt.',
  no_plan: 'No schedule set.',
}

function StageCard({ stage, belt, onToggle, onPromote, open, setOpen }:
  { stage: Stage; belt: BeltInfo; onToggle: (id: string, on: boolean) => void; onPromote: () => void; open: boolean; setOpen: (o: boolean) => void }) {
  const cur = stage.state === 'current'
  const done = stage.state === 'done'
  const isBeltStage = stage.index === 4
  const checked = new Set(stage.checked ?? [])
  const g = stage.gates

  return (
    <li className="relative pl-9">
      {/* rail marker: a strip of tape */}
      <span className={`absolute left-[5px] top-5 h-3 w-5 -translate-x-1/2 ${done ? 'bg-bone' : cur ? 'bg-blood' : 'border border-ink-500 bg-ink-900'}`} />
      <div className={`panel ${cur ? 'panel-hot' : ''} ${stage.state === 'locked' ? 'opacity-80' : ''}`}>
        <button className="flex w-full items-start gap-3 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span className="num text-[11px] text-blood">{isBeltStage ? 'BELT TEST' : `STRIPE ${stage.index + 1}`}</span>
              {cur && <span className="num bg-blood px-1.5 text-[10px] font-bold text-white">YOU ARE HERE</span>}
              {done && <span className="num text-[10px] text-zone-go">✓ EARNED</span>}
            </div>
            <h3 className="font-cond text-2xl font-bold uppercase leading-tight tracking-wide">{stage.title}</h3>
            <p className="text-sm text-bone-dim">{stage.focus}</p>
          </div>
          <div className="shrink-0 text-right">
            <div className="num text-lg font-bold">{stage.hours}<span className="text-xs font-medium text-ash"> h</span></div>
            {!done && stage.eta && <div className="num text-[11px] text-ash">≈ {fmtDate(stage.eta, { month: 'short', year: 'numeric' })}</div>}
            <Icon name="chevron" size={16} className={`ml-auto mt-1 text-smoke transition-transform ${open ? 'rotate-90' : ''}`} />
          </div>
        </button>

        {cur && g && (
          <div className="mt-3">
            <Meter value={g.hours.have} max={g.hours.need} height={10} />
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.entries(g).map(([k, v]) => (
                <div key={k} className={`border px-2.5 py-1.5 ${v.met ? 'border-zone-go/50' : 'border-ink-600'}`}>
                  <div className="label flex items-center justify-between">
                    {{ hours: 'Hours', weeks: 'Weeks in stage', skills: 'Skills', time_at_belt: 'Months at belt' }[k] ?? k}
                    <Icon name={v.met ? 'check' : 'lock'} size={12} className={v.met ? 'text-zone-go' : 'text-smoke'} />
                  </div>
                  <div className="num text-sm font-bold">{v.have} <span className="text-ash">/ {v.need}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {open && (
          <div className="rise mt-4 space-y-4 border-t border-ink-600 pt-4 text-sm">
            <div>
              <div className="label mb-1">Why this stage exists</div>
              <p className="text-bone-dim">{stage.why}</p>
            </div>
            <div>
              <div className="label mb-1">What to train</div>
              <ul className="space-y-1">
                {stage.train.map(t => <li key={t} className="flex gap-2 text-bone-dim"><span className="text-blood">▸</span>{t}</li>)}
              </ul>
            </div>
            <div>
              <div className="label mb-1">
                You are ready when {cur && g ? <span className="num text-bone">· {g.skills.have}/{g.skills.total} ticked, {g.skills.need} needed</span> : ''}
              </div>
              <ul className="space-y-1.5">
                {stage.competencies.map(c => {
                  const on = done || checked.has(c.id)
                  return (
                    <li key={c.id}>
                      <label className={`flex items-start gap-3 border px-3 py-2 ${cur ? 'cursor-pointer hover:border-smoke' : ''} ${on ? 'border-zone-go/40 bg-zone-go/5' : 'border-ink-600 bg-ink-900'}`}>
                        <input type="checkbox" className="sr-only" checked={on} disabled={!cur} onChange={e => onToggle(c.id, e.target.checked)} />
                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border ${on ? 'border-zone-go bg-zone-go text-ink-950' : 'border-ink-500'}`}>
                          {on && <Icon name="check" size={14} />}
                        </span>
                        <span className={on ? 'text-bone' : 'text-bone-dim'}>{c.text}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border-l-2 border-gold pl-3"><div className="label">Rolling goal</div><p className="text-bone-dim">{stage.rolling}</p></div>
              <div className="border-l-2 border-blood pl-3"><div className="label">Classic mistake</div><p className="text-bone-dim">{stage.mistake}</p></div>
            </div>
            {!done && stage.limited_by && (
              <p className="num text-xs text-ash">
                {stage.weeks !== undefined && `${stage.weeks} wk at your plan · `}{LIMIT_TEXT[stage.limited_by]}
                {stage.eta_actual && ` At your actual pace over the last 4 weeks: ${fmtDate(stage.eta_actual)}.`}
              </p>
            )}
            {cur && isBeltStage && (
              <div className="border border-gold/40 bg-gold/5 p-3">
                <p className="text-bone-dim">
                  {stage.ready ? 'Every gate is met. You are belt-ready. ' : ''}
                  Belts come from your coach, not from an app. When {belt.name.toLowerCase()} becomes the next colour around your waist, confirm it here.
                </p>
                <button className="btn btn-sm mt-3" onClick={onPromote}>My coach promoted me</button>
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

export default function RoadmapPage() {
  const { profile, refresh, version } = useApp()
  const [rm, setRm] = useState<Roadmap | null>(null)
  const [plan, setPlan] = useState({ classes_per_day: profile?.classes_per_day ?? 1, days_per_week: profile?.days_per_week ?? 3, class_minutes: profile?.class_minutes ?? 90 })
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [confirm, setConfirm] = useState(false)
  const scrolled = useRef(false)

  const dirty = !!profile && (plan.classes_per_day !== profile.classes_per_day || plan.days_per_week !== profile.days_per_week || plan.class_minutes !== profile.class_minutes)

  useEffect(() => {
    const t = setTimeout(() => api.roadmap(plan).then(setRm).catch(() => {}), 120)
    return () => clearTimeout(t)
  }, [plan, version])

  useEffect(() => {
    if (rm && !scrolled.current && rm.current.stage_key) {
      scrolled.current = true
      setOpen(o => ({ ...o, [rm.current.stage_key as string]: true }))
    }
  }, [rm])

  if (!rm || !profile) return <PageHead kicker="Roadmap" title="The road to black" />

  const toggle = async (stageKey: string, id: string, on: boolean) => {
    await api.check(stageKey, id, on)
    await refresh()
  }
  const savePlan = async () => {
    await api.saveProfile({ ...profile, ...plan, sync_rank: false })
    await refresh()
  }
  const promote = async () => { await api.promote(); setConfirm(false); scrolled.current = false; await refresh() }
  const v = rm.plan.volume
  const nextBelt = rm.belts.find(b => b.state === 'current')

  return (
    <div>
      <PageHead kicker="Roadmap" title="The road to black" />

      {/* Schedule what-if */}
      <Panel hot className="mb-6">
        <div className="kicker">Your schedule drives every date below</div>
        <div className="mt-3 grid gap-4 md:grid-cols-[repeat(3,minmax(0,1fr))_1.4fr]">
          <div><div className="label mb-1">Classes per day</div><Stepper value={plan.classes_per_day} min={1} max={3} onChange={x => setPlan(p => ({ ...p, classes_per_day: x }))} /></div>
          <div><div className="label mb-1">Days per week</div><Stepper value={plan.days_per_week} min={1} max={7} onChange={x => setPlan(p => ({ ...p, days_per_week: x }))} /></div>
          <div><div className="label mb-1">Class length</div><Stepper value={plan.class_minutes} min={30} max={180} step={15} unit="min" onChange={x => setPlan(p => ({ ...p, class_minutes: x }))} /></div>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Planned" value={rm.plan.weekly_hours} unit="h/wk" />
            <Stat label="Last 4 wk" value={rm.plan.actual_weekly_hours} unit="h/wk" color={rm.plan.actual_weekly_hours >= rm.plan.weekly_hours * 0.75 ? '#4ade80' : '#ffa42b'} />
            <Stat label="Black belt" value={rm.black.eta ? new Date(rm.black.eta).getFullYear() : '—'} sub={rm.black.eta ? fmtDate(rm.black.eta, { month: 'short', year: 'numeric' }) : ''} color="#e3b34a" />
          </div>
        </div>
        <p className={`mt-3 border-l-2 pl-3 text-sm ${v.level === 'high' ? 'border-zone-tone text-bone' : v.level === 'low' ? 'border-smoke text-bone-dim' : 'border-zone-go text-bone-dim'}`}>{v.text}</p>
        {dirty && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="num text-xs text-gold">WHAT-IF MODE · dates below use this trial schedule</span>
            <button className="btn btn-sm" onClick={savePlan}>Make it my schedule</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setPlan({ classes_per_day: profile.classes_per_day, days_per_week: profile.days_per_week, class_minutes: profile.class_minutes })}>Reset</button>
          </div>
        )}
        {rm.split && (
          <div className="mt-4">
            <div className="label mb-1">How to split your mat time at this belt</div>
            <div className="flex h-7 text-[11px]">
              {([['drill', 'Drilling', '#3b3b45'], ['positional', 'Positional', '#9c111d'], ['live', 'Live rolling', '#e5202f']] as const).map(([k, label, c]) => (
                <div key={k} className="num flex items-center justify-center overflow-hidden whitespace-nowrap font-bold text-white" style={{ width: `${rm.split![k]}%`, background: c }}>
                  {label} {rm.split![k]}%
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>

      {/* Timeline */}
      <div className="space-y-10">
        {rm.belts.map(belt => (
          <section key={belt.id} aria-label={belt.name}>
            <div className="mb-4 grid items-end gap-4 md:grid-cols-[1fr_auto]">
              <div>
                <Belt belt={belt.id} stripes={belt.state === 'done' ? 4 : belt.state === 'current' ? profile.stripes : 0} className="mb-3 h-7 w-full max-w-sm" />
                <div className="kicker">{belt.theme}</div>
                <h2 className="display text-4xl">{belt.name}</h2>
                <p className="mt-1 font-cond text-lg italic text-bone-dim">"{belt.creed}"</p>
              </div>
              <div className="grid grid-cols-3 gap-4 md:text-right">
                <Stat label="Mat hours" value={belt.hours_total} unit="h" />
                <Stat label="IBJJF minimum" value={belt.ibjjf_min_months || 'none'} unit={belt.ibjjf_min_months ? 'mo' : ''} />
                <Stat label={belt.state === 'done' ? 'Status' : 'On your plan'} value={belt.state === 'done' ? 'Done' : fmtDate(belt.eta, { month: 'short', year: 'numeric' })} sub={`typical ${belt.typical_years[0]}-${belt.typical_years[1]} yr`} />
              </div>
            </div>
            <p className="prose-dim mb-4 max-w-3xl text-sm">{belt.summary}</p>
            <ol className="relative space-y-3 before:absolute before:bottom-3 before:left-[5px] before:top-3 before:w-px before:bg-ink-500">
              {belt.stages.map(st => (
                <StageCard key={st.key} stage={st} belt={rm.belts[rm.belts.indexOf(belt) + 1] ?? { ...belt, name: 'Black Belt' }}
                  open={!!open[st.key]} setOpen={o => setOpen(p => ({ ...p, [st.key]: o }))}
                  onToggle={(id, on) => toggle(st.key, id, on)} onPromote={() => setConfirm(true)} />
              ))}
            </ol>
          </section>
        ))}

        <section>
          <Belt belt="black" stripes={0} className="mb-3 h-7 w-full max-w-sm" />
          <div className="kicker">{rm.black.theme}</div>
          <h2 className="display text-4xl">{rm.black.name}</h2>
          <p className="mt-1 font-cond text-lg italic text-bone-dim">"{rm.black.creed}"</p>
          <p className="prose-dim mt-2 max-w-3xl text-sm">{rm.black.summary}</p>
        </section>
      </div>

      {/* Logic */}
      <Panel className="mt-10">
        <div className="kicker">Read the fine print</div>
        <h2 className="display mb-3 text-3xl">How this roadmap works</h2>
        <p className="prose-dim mb-4 text-sm">Baseline student: {rm.model.baseline}</p>
        <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
          {rm.model.rules.map((r, i) => (
            <div key={r.id} className="flex gap-3">
              <span className="num text-xs text-blood">0{i + 1}</span>
              <div><h3 className="font-cond text-lg font-bold uppercase tracking-wide">{r.title}</h3><p className="text-sm text-bone-dim">{r.text}</p></div>
            </div>
          ))}
        </div>
        <p className="mt-5 border-l-2 border-gold pl-3 text-sm text-bone-dim">{rm.model.honesty}</p>
        <div className="mt-4"><Details title="Sources and what each one was used for"><Sources items={rm.model.sources} /></Details></div>
      </Panel>

      {confirm && nextBelt && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4" onClick={() => setConfirm(false)}>
          <div className="panel panel-hot max-w-md" onClick={e => e.stopPropagation()}>
            <div className="kicker">Promotion</div>
            <h3 className="display text-3xl">Did your coach promote you?</h3>
            <p className="prose-dim mt-2 text-sm">This closes {nextBelt.name} and opens the next belt at zero stripes. It cannot be undone from here, though you can always correct your rank in Profile.</p>
            <div className="mt-4 flex gap-3">
              <button className="btn" onClick={promote}>Yes, tie it on</button>
              <button className="btn btn-ghost" onClick={() => setConfirm(false)}>Not yet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
