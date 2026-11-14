import { useEffect, useState } from 'react'
import { api } from '../api'
import { useApp } from '../store/appStore'
import type { FuelDay, SleepData } from '../types'
import { BELT_NAMES, ZONE_COLORS } from '../types'
import Belt from '../components/common/Belt'
import Icon from '../components/common/Icon'
import { Meter, Panel, Ring, Stat, fmtDate } from '../components/common/ui'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function Dashboard() {
  const { profile, status, readiness, consistency, awards, setTab, goRecovery, version, dayType } = useApp()
  const [fuel, setFuel] = useState<FuelDay | null>(null)
  const [sleep, setSleep] = useState<SleepData | null>(null)
  const [eta, setEta] = useState<string | null>(null)

  useEffect(() => {
    api.fuelDay(undefined, dayType ?? undefined).then(setFuel).catch(() => {})
    api.sleep().then(setSleep).catch(() => {})
    api.roadmap().then(r => {
      const cur = r.belts.flatMap(b => b.stages).find(s => s.state === 'current')
      setEta(cur?.eta ?? null)
    }).catch(() => {})
  }, [version, dayType])

  if (!profile || !status) return null
  const stage = status.stage
  const gates = status.gates
  const zone = readiness?.zone
  const zc = zone ? ZONE_COLORS[zone.key] : '#615e58'
  const week = consistency?.this_week
  const monday = week ? new Date(week.start + 'T12:00:00') : new Date()
  const trainedDays = new Set((consistency?.calendar ?? []).filter(d => d.minutes > 0).map(d => d.day))
  const todayIdx = (new Date().getDay() + 6) % 7
  const topHint = fuel?.hints.find(h => h.tone === 'warn') ?? fuel?.hints[0]
  const recent = (awards?.awards ?? []).slice(0, 4)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Rank */}
        <Panel hot className="rise overflow-hidden lg:col-span-7">
          <div className="ghost-num absolute -right-3 -top-2 text-[11rem]">{status.stripes}</div>
          <div className="kicker">Current rank</div>
          <h1 className="display text-5xl sm:text-6xl">{BELT_NAMES[status.belt]} belt</h1>
          <Belt belt={status.belt} stripes={status.stripes} ghost={stage ? 1 : 0} className="my-4 h-9 w-full max-w-md" />
          {stage && gates ? (
            <>
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="num text-xs text-blood">STAGE {stage.index + 1}/5</span>
                <span className="font-cond text-2xl font-bold uppercase tracking-wide">{stage.title}</span>
              </div>
              <p className="prose-dim mb-4 text-sm">{stage.focus}</p>
              <div className="mb-1 flex items-end justify-between">
                <span className="label">Mat hours this stage</span>
                <span className="num text-sm"><b className="text-lg">{gates.hours.have}</b> / {gates.hours.need} h</span>
              </div>
              <Meter value={gates.hours.have} max={gates.hours.need} height={12} />
              <div className="mt-4 grid grid-cols-3 gap-2">
                {([['hours', 'Hours', 'h'], ['weeks', 'Weeks', 'wk'], ['skills', 'Skills', '']] as const).map(([k, label, unit]) => {
                  const g = gates[k]
                  return (
                    <div key={k} className={`border px-3 py-2 ${g.met ? 'border-zone-go/50 bg-zone-go/5' : 'border-ink-600 bg-ink-900'}`}>
                      <div className="flex items-center justify-between">
                        <span className="label">{label}</span>
                        <Icon name={g.met ? 'check' : 'lock'} size={14} className={g.met ? 'text-zone-go' : 'text-smoke'} />
                      </div>
                      <div className="num whitespace-nowrap text-[13px] font-bold">{g.have}<span className="text-ash">/{g.need}{unit && ` ${unit}`}</span></div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-bone-dim">
                  {status.all_met
                    ? <span className="font-semibold text-gold">Every gate is met. {status.is_belt_stage ? 'You are belt-ready.' : ''}</span>
                    : <>Next {status.is_belt_stage ? 'belt' : 'stripe'} on plan: <span className="num font-bold text-bone">{fmtDate(eta)}</span></>}
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setTab('roadmap')}>Open roadmap</button>
              </div>
            </>
          ) : (
            <p className="prose-dim text-sm">{status.belt === 'black' ? 'The roadmap ends here. The training does not.' : ''}</p>
          )}
        </Panel>

        {/* Readiness */}
        <Panel className="rise lg:col-span-5">
          <div className="kicker">Today's readiness</div>
          {readiness && zone ? (
            <>
              <div className="mt-2 flex items-center gap-5">
                <Ring value={readiness.score} color={zc} size={132}>
                  <span className="num text-4xl font-bold" style={{ color: zc }}>{readiness.score}</span>
                  <span className="label">/ 100</span>
                </Ring>
                <div className="min-w-0">
                  <div className="display text-3xl" style={{ color: zc }}>{zone.label}</div>
                  <p className="mt-1 text-sm text-bone-dim">{zone.headline}</p>
                  {zone.rpe_cap > 0 && zone.rpe_cap < 10 && (
                    <p className="num mt-2 text-xs text-ash">CAP RPE {zone.rpe_cap} · {readiness.prescription.max_minutes} MIN</p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {(['checkin', 'sleep', 'fuel'] as const).map(k => (
                  <span key={k} className={`num border px-2 py-0.5 text-[10px] uppercase ${readiness.inputs[k] ? 'border-zone-go/40 text-zone-go' : 'border-ink-600 text-smoke'}`}>
                    {readiness.inputs[k] ? '● ' : '○ '}{k === 'checkin' ? 'body' : k}
                  </span>
                ))}
                <span className="num border border-ink-600 px-2 py-0.5 text-[10px] uppercase text-ash">confidence {readiness.confidence}</span>
              </div>
              <div className="mt-4 grid grid-cols-5 gap-2">
                {Object.entries(readiness.buckets).map(([k, b]) => (
                  <div key={k} title={`${b.label}: −${b.penalty} of a possible −${b.cap}`}>
                    <Meter value={b.penalty} max={b.cap} height={5} color={b.penalty >= b.cap * 0.6 ? '#e5202f' : '#ffa42b'} />
                    <div className="label mt-1 truncate text-[0.6rem]">{k}</div>
                    <div className="num text-xs" style={{ color: b.penalty === 0 ? '#4ade80' : undefined }}>−{Math.round(b.penalty)}</div>
                  </div>
                ))}
              </div>
              {readiness.advice[0] && <p className="mt-3 border-l-2 border-blood pl-3 text-sm text-bone-dim">{readiness.advice[0]}</p>}
              <button className="btn btn-sm mt-4" onClick={() => goRecovery('readiness')}>
                {readiness.inputs.checkin && readiness.inputs.sleep ? 'See the breakdown' : 'Check in'}
              </button>
            </>
          ) : <p className="prose-dim mt-2 text-sm">Loading…</p>}
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Week */}
        <Panel className="rise">
          <div className="flex items-start justify-between">
            <div className="kicker">This week</div>
            <div className="num flex items-center gap-1 text-lg font-bold text-gold" title="Weeks on target in a row">
              <Icon name="flame" size={16} />{consistency?.streak ?? 0}<span className="label ml-1">wk streak</span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1.5">
            {DAYS.map((d, i) => {
              const day = new Date(monday); day.setDate(monday.getDate() + i)
              const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
              const done = trainedDays.has(iso)
              return (
                <div key={i} className="text-center">
                  <div className={`mx-auto flex aspect-square w-full max-w-[2.6rem] items-center justify-center border ${done ? 'border-blood bg-blood text-white' : i === todayIdx ? 'border-bone/60 text-bone' : 'border-ink-600 text-smoke'}`}>
                    {done ? <Icon name="check" size={16} /> : <span className="num text-xs">{day.getDate()}</span>}
                  </div>
                  <div className="label mt-1">{d}</div>
                </div>
              )
            })}
          </div>
          {week && consistency && (
            <p className="mt-3 text-sm text-bone-dim">
              <span className="num font-bold text-bone">{week.days}</span> of {consistency.target.days} planned days ·{' '}
              <span className="num font-bold text-bone">{week.hours}</span> h.{' '}
              {week.hit ? <span className="text-zone-go">Week locked in.</span> : `${Math.max(0, consistency.target.min_days - week.days)} more to keep the streak.`}
            </p>
          )}
          <button className="btn btn-sm mt-3" onClick={() => setTab('train')}><Icon name="train" size={14} />Log session</button>
        </Panel>

        {/* Fuel */}
        <Panel className="rise">
          <div className="flex items-start justify-between">
            <div className="kicker">Fuel today</div>
            {fuel && <span className="label">{fuel.targets.day_label}</span>}
          </div>
          {fuel ? (
            <>
              <div className="mt-3 space-y-2.5">
                {([['Protein', 'protein', 'g', '#e5202f'], ['Carbs', 'carbs', 'g', '#e3b34a'], ['Water', 'water_ml', 'mL', '#5aa9ff']] as const).map(([label, k, unit, c]) => (
                  <div key={k}>
                    <div className="flex justify-between text-xs">
                      <span className="label">{label}</span>
                      <span className="num text-bone-dim">{Math.round(fuel.totals[k])} / {fuel.targets[k]} {unit}</span>
                    </div>
                    <Meter value={fuel.totals[k]} max={fuel.targets[k]} color={c} height={6} />
                  </div>
                ))}
              </div>
              {topHint && (
                <p className={`mt-3 border-l-2 pl-3 text-sm ${topHint.tone === 'warn' ? 'border-zone-tone' : 'border-zone-go'}`}>
                  <b className="font-cond uppercase tracking-wider">{topHint.title}.</b>{' '}
                  <span className="text-bone-dim">{topHint.text.split('. ')[0]}.</span>
                </p>
              )}
              <button className="btn btn-ghost btn-sm mt-3" onClick={() => setTab('fuel')}>Log food</button>
            </>
          ) : <p className="prose-dim mt-2 text-sm">Loading…</p>}
        </Panel>

        {/* Sleep */}
        <Panel className="rise">
          <div className="kicker">Last night</div>
          {sleep?.summary ? (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Stat label="Asleep" value={sleep.summary.hours.toFixed(1)} unit="h" sub={`need ${sleep.summary.need_h} h`} />
              <Stat label="Sleep score" value={sleep.summary.score} color={sleep.summary.score >= 80 ? '#4ade80' : sleep.summary.score >= 60 ? '#ffa42b' : '#e5202f'} />
              <Stat label="7-night avg" value={sleep.summary.avg_hours_7.toFixed(1)} unit="h" />
              <Stat label="Sleep debt" value={sleep.summary.debt_hours_7.toFixed(1)} unit="h" />
            </div>
          ) : (
            <div className="mt-3">
              <Icon name="moon" size={30} className="text-smoke" />
              <p className="mt-2 text-sm text-bone-dim">Not logged yet. Two times off your phone's screen-time report is all it takes.</p>
            </div>
          )}
          <button className="btn btn-ghost btn-sm mt-3" onClick={() => goRecovery('sleep')}>
            {sleep?.summary ? 'Sleep log' : 'Log sleep'}
          </button>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Next up */}
        <Panel className="rise lg:col-span-7">
          <div className="kicker">Work on this next</div>
          {stage && status.todo && status.todo.length > 0 ? (
            <ul className="mt-3 divide-y divide-ink-600">
              {status.todo.slice(0, 4).map((c, i) => (
                <li key={c.id} className="flex gap-3 py-2.5">
                  <span className="num text-xs text-blood">0{i + 1}</span>
                  <span className="text-sm">{c.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-bone-dim">{stage ? 'Checklist complete. Keep banking hours.' : 'Keep training.'}</p>
          )}
          {stage && <p className="mt-2 border-t border-ink-600 pt-3 text-sm text-ash"><b className="font-cond uppercase tracking-wider text-bone-dim">Rolling goal:</b> {stage.rolling}</p>}
        </Panel>

        {/* Awards + totals */}
        <Panel className="rise lg:col-span-5">
          <div className="kicker">On the board</div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Stat label="Mat hours" value={consistency?.totals.hours ?? 0} />
            <Stat label="Sessions" value={consistency?.totals.sessions ?? 0} />
            <Stat label="Best streak" value={consistency?.best_streak ?? 0} unit="wk" />
          </div>
          <ul className="mt-4 space-y-2">
            {recent.length === 0 && <li className="text-sm text-ash">No badges yet. Log your first session.</li>}
            {recent.map(a => (
              <li key={a.id} className="flex items-center gap-3">
                {a.belt ? <Belt belt={a.belt} stripes={a.stripes ?? 0} className="h-3.5 w-16 shrink-0" /> : <Icon name="badges" className="w-16 shrink-0 text-gold" />}
                <span className="min-w-0 flex-1 truncate font-cond text-base font-semibold uppercase tracking-wide">{a.title}</span>
                <span className="num text-[10px] text-smoke">{fmtDate(a.earned_at.slice(0, 10), { day: 'numeric', month: 'short' })}</span>
              </li>
            ))}
          </ul>
          <button className="btn btn-ghost btn-sm mt-4" onClick={() => setTab('badges')}>All badges</button>
        </Panel>
      </div>
    </div>
  )
}
