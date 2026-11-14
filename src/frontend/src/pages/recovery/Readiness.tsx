import { useEffect, useState } from 'react'
import { api } from '../../api'
import { useApp } from '../../store/appStore'
import type { CheckIn, Readiness as R } from '../../types'
import { RPE_TEXT, ZONE_COLORS } from '../../types'
import { Bars, Details, Dot, Meter, Panel, Ring, Scale, Segmented, Sources, Stat } from '../../components/common/ui'

const SCALES: { key: keyof Omit<CheckIn, 'illness' | 'notes'>; label: string; labels: string[] }[] = [
  { key: 'soreness', label: 'Muscle soreness', labels: ['Fresh', 'A little stiff', 'Sore', 'Very sore', 'Wrecked'] },
  { key: 'fatigue', label: 'Energy', labels: ['Full of energy', 'Good', 'A bit flat', 'Tired', 'Exhausted'] },
  { key: 'stress', label: 'Stress', labels: ['Relaxed', 'Normal', 'Busy head', 'Stressed', 'Overloaded'] },
  { key: 'mood', label: 'Motivation to train', labels: ['Fired up', 'Good', 'Meh', 'Low', 'Dreading it'] },
]

const REFS = [
  { title: 'Foster et al. 2001: session-RPE (load = RPE x minutes)', url: 'https://pubmed.ncbi.nlm.nih.gov/11708692/', used_for: 'How every session becomes one load number.' },
  { title: 'Gabbett 2016: the training-injury prevention paradox (BJSM)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4789704', used_for: 'Acute:chronic workload ratio, the 0.8-1.3 sweet spot and the 1.5+ danger zone.' },
  { title: 'Foster 1998: monitoring training with reference to overtraining', url: 'https://doi.org/10.1097/00005768-199807000-00023', used_for: 'Monotony and strain.' },
  { title: 'Hooper & Mackinnon 1995: monitoring overtraining in athletes', url: 'https://doi.org/10.2165/00007256-199520050-00003', used_for: 'Daily self-ratings of sleep, stress, fatigue and soreness.' },
  { title: 'Milewski et al. 2014: chronic lack of sleep and sports injuries', url: 'https://pubmed.ncbi.nlm.nih.gov/25028798/', used_for: 'Under 8 h of sleep was linked to about 1.7x the injury rate.' },
]

export default function Readiness() {
  const { readiness, refresh, profile, version, dayType, goRecovery, setTab } = useApp()
  const [ci, setCi] = useState<CheckIn>({ soreness: 2, fatigue: 2, stress: 2, mood: 2, illness: 'none' })
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [plan, setPlan] = useState({ minutes: profile?.class_minutes ?? 90, rpe: 7 })
  const [whatIf, setWhatIf] = useState<R | null>(null)

  useEffect(() => { api.checkin().then(c => { if (c) { setCi(c); setSaved(true) } }).catch(() => {}) }, [])
  useEffect(() => {
    const t = setTimeout(() => api.readiness({ planned_minutes: plan.minutes, planned_rpe: plan.rpe, day_type: dayType ?? undefined }).then(setWhatIf).catch(() => {}), 150)
    return () => clearTimeout(t)
  }, [plan, version, dayType])

  const save = async () => {
    setBusy(true)
    try { await api.saveCheckin(ci); setSaved(true); await refresh() } finally { setBusy(false) }
  }

  if (!readiness) return null
  const r = readiness
  const zc = ZONE_COLORS[r.zone.key]
  const m = r.metrics
  const buckets = Object.entries(r.buckets)

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      {/* Verdict */}
      <Panel hot className="lg:col-span-7">
        <div className="kicker">Should you train today?</div>
        <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-center">
          <Ring value={r.score} color={zc} size={170} stroke={12}>
            <span className="num text-6xl font-bold leading-none" style={{ color: zc }}>{r.score}</span>
            <span className="label mt-1">readiness</span>
          </Ring>
          <div className="min-w-0">
            <div className="display text-5xl" style={{ color: zc }}>{r.zone.label}</div>
            <p className="mt-1 text-lg text-bone">{r.zone.headline}</p>
            <div className="mt-3 flex gap-6">
              <Stat label="Intensity cap" value={r.prescription.rpe_cap > 0 ? `RPE ${r.prescription.rpe_cap}` : 'Off'} />
              <Stat label="Time cap" value={r.prescription.max_minutes} unit="min" />
            </div>
          </div>
        </div>

        {r.overrides.length > 0 && (
          <div className="mt-4 border border-blood/60 bg-blood/10 p-3">
            <div className="label text-blood-hot">Hard limits applied</div>
            <ul className="mt-1 space-y-1 text-sm">{r.overrides.map(o => <li key={o}>▸ {o}</li>)}</ul>
          </div>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="label mb-1">Good options today</div>
            <ul className="space-y-1 text-sm text-bone-dim">{r.prescription.sessions.map(s => <li key={s}><span className="mr-2" style={{ color: zc }}>▸</span>{s}</li>)}</ul>
          </div>
          <div>
            <div className="label mb-1">Why</div>
            <ul className="space-y-1.5 text-sm text-bone-dim">{r.advice.slice(0, 3).map(a => <li key={a}>{a}</li>)}</ul>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-600 pt-3 text-xs">
          <span className="label">Built from</span>
          <button className={`chip ${r.inputs.checkin ? 'chip-on' : ''}`} onClick={() => document.getElementById('checkin')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>Body {r.inputs.checkin ? '✓' : '+'}</button>
          <button className={`chip ${r.inputs.sleep ? 'chip-on' : ''}`} onClick={() => goRecovery('sleep')}>Sleep {r.inputs.sleep ? '✓' : '+'}</button>
          <button className={`chip ${r.inputs.fuel ? 'chip-on' : ''}`} onClick={() => setTab('fuel')}>Fuel {r.inputs.fuel ? '✓' : '+'}</button>
          <span className={`chip ${r.inputs.history_days >= 21 ? 'chip-on' : ''}`} style={{ cursor: 'default' }}>Load {r.inputs.history_days >= 21 ? '✓' : `${r.inputs.history_days}/21 d`}</span>
          <span className="num ml-auto uppercase text-ash">confidence: {r.confidence}</span>
        </div>
      </Panel>

      {/* Check-in */}
      <Panel className="lg:col-span-5" id="checkin">
        <div className="flex items-start justify-between">
          <div className="kicker">How do you feel?</div>
          {saved && <span className="num text-[10px] text-zone-go">✓ SAVED TODAY</span>}
        </div>
        <div className="mt-3 space-y-3">
          {SCALES.map(s => (
            <div key={s.key}>
              <div className="label mb-1">{s.label}</div>
              <Scale value={ci[s.key]} onChange={v => { setCi(p => ({ ...p, [s.key]: v })); setSaved(false) }} labels={s.labels} />
            </div>
          ))}
          <div>
            <div className="label mb-1">Sick?</div>
            <Segmented value={ci.illness} onChange={v => { setCi(p => ({ ...p, illness: v })); setSaved(false) }}
              options={[{ id: 'none', label: 'No' }, { id: 'head_cold', label: 'Head cold' }, { id: 'systemic', label: 'Fever / chest' }]} />
          </div>
          <button className="btn w-full" onClick={save} disabled={busy}>{busy ? 'Scoring…' : saved ? 'Update check-in' : 'Score my day'}</button>
        </div>
      </Panel>

      {/* What-if */}
      <Panel className="lg:col-span-5">
        <div className="kicker">Planning a session?</div>
        <p className="mt-1 text-sm text-ash">Set what you intend to do. The calculator tells you whether to tone it down.</p>
        <div className="mt-3">
          <div className="flex items-baseline justify-between"><span className="label">Duration</span><span className="num font-bold">{plan.minutes} min</span></div>
          <input type="range" min={30} max={180} step={5} value={plan.minutes} onChange={e => setPlan(p => ({ ...p, minutes: Number(e.target.value) }))} aria-label="Planned minutes" />
        </div>
        <div className="mt-2">
          <div className="label mb-1">Intended intensity</div>
          <Scale value={plan.rpe} onChange={v => setPlan(p => ({ ...p, rpe: v }))} labels={RPE_TEXT.slice(1)} />
        </div>
        {whatIf?.planned && (
          <div className={`mt-3 border-l-4 p-3 ${whatIf.planned.ok ? 'border-zone-go bg-zone-go/5' : 'border-zone-tone bg-zone-tone/5'}`}>
            <div className="font-cond text-lg font-bold uppercase tracking-wide">{whatIf.planned.ok ? 'Green light' : 'Tone it down'}</div>
            <p className="text-sm text-bone-dim">{whatIf.planned.verdict}</p>
            <p className="num mt-1 text-[11px] text-ash">
              +{whatIf.planned.load} AU{whatIf.planned.projected_acwr !== null && ` · load ratio would be ${whatIf.planned.projected_acwr}`}
            </p>
          </div>
        )}
      </Panel>

      {/* Load */}
      <Panel className="lg:col-span-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="kicker">Training load, last 28 days</div>
          <div className="flex gap-5">
            <Stat label="Load ratio" value={m.acwr ?? '—'} color={m.acwr === null ? undefined : m.acwr > 1.5 ? '#e5202f' : m.acwr > 1.3 ? '#ffa42b' : m.acwr >= 0.8 ? '#4ade80' : '#928e85'} sub="sweet spot 0.8-1.3" />
            <Stat label="7 days" value={m.acute} unit="AU" />
            <Stat label="4-wk avg" value={m.chronic} unit="AU" />
          </div>
        </div>
        <div className="mt-4">
          <Bars height={96} every={7} unit=" AU"
            data={r.series.map((d, i) => ({
              label: new Date(d.day + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric' }),
              value: d.load, dim: i < 21, color: d.load >= 720 ? '#ff4553' : '#e5202f',
            }))} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Days in a row" value={m.consecutive_days} />
          <Stat label="Hard days / 3 d" value={m.hard_3d} />
          <Stat label="Rest days / 7 d" value={m.rest_days_7} />
          <Stat label="Monotony" value={m.monotony ?? '—'} sub="over 2.0 is flat" />
        </div>
      </Panel>

      {/* Breakdown */}
      <Panel className="lg:col-span-12">
        <div className="kicker">Where the points went</div>
        <p className="mt-1 text-sm text-ash">Every day starts at 100. Each bucket can only take away so much, so one bad signal never decides the day alone.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-5">
          {buckets.map(([k, b]) => (
            <div key={k}>
              <div className="flex items-baseline justify-between">
                <span className="label">{b.label}</span>
                <span className="num text-sm font-bold" style={{ color: b.penalty === 0 ? '#4ade80' : b.penalty >= b.cap * 0.6 ? '#e5202f' : '#ffa42b' }}>−{b.penalty}</span>
              </div>
              <Meter value={b.penalty} max={b.cap} color={b.penalty >= b.cap * 0.6 ? '#e5202f' : '#ffa42b'} height={6} />
              <div className="num mt-0.5 text-[10px] text-smoke">max −{b.cap}</div>
            </div>
          ))}
        </div>
        <ul className="mt-5 grid gap-x-8 gap-y-3 md:grid-cols-2">
          {r.factors.map(f => (
            <li key={f.key} className="flex gap-3">
              <Dot status={f.status} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-cond text-base font-semibold uppercase tracking-wide">{f.label}</span>
                  <span className="num shrink-0 text-xs text-bone-dim">{f.value}{f.penalty > 0 && <span className="ml-2 text-blood-hot">−{f.penalty}</span>}</span>
                </div>
                <p className="text-xs text-ash">{f.detail}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <Details title="How the readiness score is calculated">
            <ol className="list-decimal space-y-2 pl-5">
              <li><b className="text-bone">Load (up to −40).</b> Every session becomes load = RPE x minutes. The last 7 days are compared with your 4-week weekly average. Inside 0.8-1.3 costs nothing; above 1.3 costs more the higher you go. Training many days in a row, stacking sessions at RPE 8+ and weeks where every day is the same add to it. The ratio is ignored until you have 3 weeks of history.</li>
              <li><b className="text-bone">Sleep (up to −25).</b> A quarter of the gap between last night's sleep score and 100.</li>
              <li><b className="text-bone">How you feel (up to −25).</b> Soreness and energy weigh most, then stress, then motivation.</li>
              <li><b className="text-bone">Fuel (up to −15).</b> Yesterday's fuel score, plus extra if you have under-eaten for days or are far behind on water.</li>
              <li><b className="text-bone">Injuries (up to −30).</b> 1.5 points per point of pain, plus a fixed cost for how restricted your rehab phase is.</li>
              <li><b className="text-bone">Zones.</b> 80+ GO · 65-79 TRAIN SMART · 45-64 TONE IT DOWN · 25-44 ACTIVE RECOVERY · under 25 REST.</li>
              <li><b className="text-bone">Hard limits.</b> Fever or chest symptoms mean rest. Pain 7/10 or more means rehab only. Under 5 h of sleep or a load ratio above 2.0 caps you at TONE IT DOWN. A rehab phase caps you at what that phase allows.</li>
            </ol>
            <p className="mt-3">Athletes aged 40+ have load penalties scaled by 1.15, and by 1.3 from 50. The load ratio is a guide, not a prediction: researchers disagree on how well it forecasts injury, which is why it is one input among five here.</p>
            <div className="mt-3"><Sources items={REFS} /></div>
          </Details>
        </div>
      </Panel>
    </div>
  )
}
