import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import { useApp } from '../../store/appStore'
import type { SleepData } from '../../types'
import Icon from '../../components/common/Icon'
import { Bars, Details, Field, Meter, Panel, Scale, Sources, Stat, Stepper, fmtDate, localISO } from '../../components/common/ui'

const QUALITY = ['Terrible', 'Poor', 'OK', 'Good', 'Great']
const REFS = [
  { title: 'Borger et al. 2019: sleep-wake cycles from smartphone touchscreen interactions (npj Digital Medicine)', url: 'https://link.springer.com/10.1038/s41746-019-0147-4', used_for: 'Last and first touch track sleep onset and wake time closely (R² about 0.9 against wrist actigraphy), but duration much less well (R² about 0.3).' },
  { title: 'Ciman & Wac 2019: smartphones as sleep duration sensors (JMIR mHealth)', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6547769/', used_for: 'Screen on/off patterns estimated sleep duration within about 7% on average in a small sample.' },
  { title: 'Sleep diary accuracy against actigraphy (J Thorac Dis)', url: 'https://jtd.amegroups.org/article/view/18595/html', used_for: 'Diaries get lights-out and wake time close; total sleep time is the least accurate part.' },
  { title: 'Carney et al. 2012: the Consensus Sleep Diary', url: 'https://pubmed.ncbi.nlm.nih.gov/22294820/', used_for: 'The standard diary questions: time to fall asleep, time awake in the night, quality.' },
]

const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return localISO(d) }

export default function Sleep() {
  const { refresh, version } = useApp()
  const [data, setData] = useState<SleepData | null>(null)
  const [wakeDay, setWakeDay] = useState(localISO())
  const [off, setOff] = useState('23:00')
  const [on, setOn] = useState('07:00')
  const [latency, setLatency] = useState(15)
  const [awake, setAwake] = useState(0)
  const [pickups, setPickups] = useState(0)
  const [quality, setQuality] = useState(3)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = () => api.sleep().then(setData).catch(() => {})
  useEffect(() => { load() }, [version])

  // Prefill the form from the night already logged for the chosen date.
  useEffect(() => {
    const n = data?.nights.find(x => x.day === wakeDay)
    if (!n) return
    setOff(n.screen_off.slice(11, 16)); setOn(n.screen_on.slice(11, 16)); setLatency(n.latency_min)
    setAwake(n.awake_min); setPickups(n.night_pickups); setQuality(n.quality)
  }, [data, wakeDay])

  const est = useMemo(() => {
    const [oh, om] = off.split(':').map(Number)
    const [wh, wm] = on.split(':').map(Number)
    const offMin = oh * 60 + om
    const onMin = wh * 60 + wm
    const prevDay = offMin > onMin || oh >= 15         // went to bed before midnight
    const window = prevDay ? 24 * 60 - offMin + onMin : onMin - offMin
    const lost = latency + Math.max(awake, pickups * 5)
    const asleep = Math.max(0, window - lost)
    return { prevDay, window, asleep, eff: window > 0 ? Math.round((asleep / window) * 100) : 0 }
  }, [off, on, latency, awake, pickups])

  const save = async () => {
    setBusy(true); setErr('')
    try {
      await api.saveSleep({
        screen_off: `${est.prevDay ? addDays(wakeDay, -1) : wakeDay}T${off}:00`, screen_on: `${wakeDay}T${on}:00`,
        latency_min: latency, awake_min: awake, night_pickups: pickups, quality, source: 'screen',
      })
      await refresh()
    } catch { setErr('Those times do not make a night. Wake time must be 1-16 hours after lights out.') } finally { setBusy(false) }
  }
  const tap = async (kind: 'out' | 'up' | 'cancel') => {
    if (kind === 'out') await api.lightsOut()
    else if (kind === 'cancel') await api.cancelTap()
    else await api.wake()
    await load(); await refresh()
  }
  const remove = async (day: string) => { await api.deleteSleep(day); await refresh() }

  if (!data) return null
  const s = data.summary
  const nights = [...data.nights].reverse()
  const sc = s ? (s.score >= 80 ? '#4ade80' : s.score >= 60 ? '#ffa42b' : '#e5202f') : '#615e58'
  const h = (m: number) => `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, '0')}`

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Panel hot className="lg:col-span-7">
        <div className="kicker">Log a night from your screen time</div>
        <p className="mt-1 text-sm text-ash">
          Two times from your phone anchor the night. Three quick corrections turn "phone was off" into "I was asleep".
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Morning of"><input type="date" className="field" value={wakeDay} max={localISO()} onChange={e => setWakeDay(e.target.value)} /></Field>
          <Field label="Last phone use" hint="Screen off for the night"><input type="time" className="field num" value={off} onChange={e => setOff(e.target.value)} /></Field>
          <Field label="First pickup" hint="Screen on in the morning"><input type="time" className="field num" value={on} onChange={e => setOn(e.target.value)} /></Field>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div><div className="label mb-1">Time to fall asleep</div><Stepper value={latency} onChange={setLatency} min={0} max={120} step={5} unit="min" /></div>
          <div><div className="label mb-1">Awake in the night</div><Stepper value={awake} onChange={setAwake} min={0} max={240} step={5} unit="min" /></div>
          <div><div className="label mb-1">Night-time pickups</div><Stepper value={pickups} onChange={setPickups} min={0} max={20} /></div>
        </div>
        <div className="mt-3"><div className="label mb-1">How did it feel?</div><Scale value={quality} onChange={setQuality} labels={QUALITY} /></div>

        <div className="mt-4 grid grid-cols-3 gap-3 border border-ink-600 bg-ink-950 p-3">
          <Stat label="Screen-off gap" value={h(est.window)} />
          <Stat label="Est. asleep" value={h(est.asleep)} color={est.asleep >= data.need_h * 60 ? '#4ade80' : est.asleep >= 360 ? '#ffa42b' : '#e5202f'} />
          <Stat label="Efficiency" value={est.eff} unit="%" />
        </div>
        {err && <p className="mt-2 text-sm text-blood-hot">{err}</p>}
        <button className="btn mt-4" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save night'}</button>

        <div className="mt-5 border-t border-ink-600 pt-4">
          <div className="label mb-2">Or let the app catch the times</div>
          <div className="flex flex-wrap items-center gap-3">
            {data.pending_tap ? (
              <>
                <button className="btn btn-sm" onClick={() => tap('up')}><Icon name="check" size={14} />I'm up</button>
                <button className="btn btn-ghost btn-sm" onClick={() => tap('cancel')}>Cancel</button>
                <span className="num text-xs text-ash">LIGHTS OUT {data.pending_tap.slice(11, 16)}</span>
              </>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => tap('out')}><Icon name="moon" size={14} />Lights out now</button>
            )}
          </div>
          <p className="mt-2 text-xs text-ash">Tap "Lights out" as the last thing you do on your phone and "I'm up" as the first. Then fine-tune the night above.</p>
        </div>
      </Panel>

      <div className="space-y-4 lg:col-span-5">
        <Panel>
          <div className="kicker">Last night</div>
          {s ? (
            <>
              <div className="mt-2 flex items-end gap-4">
                <div className="num text-6xl font-bold leading-none" style={{ color: sc }}>{s.score}</div>
                <div className="pb-1"><div className="label">sleep score</div><div className="num text-sm text-bone-dim">{s.hours.toFixed(1)} h of {s.need_h} h needed</div></div>
              </div>
              <div className="mt-4 space-y-2">
                {([['duration', 'Duration', 50], ['quality', 'Quality', 20], ['efficiency', 'Efficiency', 10], ['regularity', 'Regular bedtime', 10], ['debt', '7-night average', 10]] as const).map(([k, label, max]) => (
                  <div key={k}>
                    <div className="flex justify-between text-xs"><span className="label">{label}</span><span className="num text-bone-dim">{s.parts[k]} / {max}</span></div>
                    <Meter value={s.parts[k]} max={max} height={5} color={s.parts[k] >= max * 0.8 ? '#4ade80' : s.parts[k] >= max * 0.5 ? '#ffa42b' : '#e5202f'} />
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Stat label="7-night avg" value={s.avg_hours_7.toFixed(1)} unit="h" />
                <Stat label="Debt" value={s.debt_hours_7.toFixed(1)} unit="h" />
                <Stat label="Bedtime ±" value={s.bedtime_sd_min ?? '—'} unit={s.bedtime_sd_min !== null ? 'min' : ''} />
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-bone-dim">Last night is not logged, so sleep is not counted in today's readiness.</p>
          )}
        </Panel>

        <Panel>
          <div className="kicker">Where to find the two times</div>
          <dl className="mt-2 space-y-2 text-sm text-bone-dim">
            <div><dt className="font-cond font-semibold uppercase tracking-wider text-bone">iPhone</dt><dd>Settings → Screen Time → See All App & Website Activity → pick the day. "First Pickup" is your wake anchor; the last bar in the hourly chart is lights out.</dd></div>
            <div><dt className="font-cond font-semibold uppercase tracking-wider text-bone">Android</dt><dd>Settings → Digital Wellbeing → Dashboard. The hourly chart shows the last use at night and the first in the morning. Bedtime mode also reports both.</dd></div>
          </dl>
        </Panel>
      </div>

      <Panel className="lg:col-span-12">
        <div className="kicker">Last 14 nights</div>
        {nights.length === 0 ? <p className="mt-2 text-sm text-ash">No nights logged yet.</p> : (
          <>
            <div className="mt-5">
              <Bars unit=" h" target={data.need_h} max={10} height={120}
                data={nights.map(n => ({ label: fmtDate(n.day, { day: 'numeric', month: 'numeric' }), value: n.hours, color: n.hours >= data.need_h - 0.25 ? '#4ade80' : n.hours >= 6 ? '#ffa42b' : '#e5202f', title: `${fmtDate(n.day)}: ${n.hours} h asleep, quality ${n.quality}/5` }))} />
            </div>
            <ul className="mt-4 divide-y divide-ink-600 text-sm">
              {[...nights].reverse().slice(0, 7).map(n => (
                <li key={n.day} className="group flex items-center gap-3 py-2">
                  <span className="num w-16 text-xs text-ash">{fmtDate(n.day, { weekday: 'short', day: 'numeric' })}</span>
                  <span className="num flex-1">{n.screen_off.slice(11, 16)} → {n.screen_on.slice(11, 16)}</span>
                  <span className="num font-bold">{n.hours.toFixed(1)} h</span>
                  <span className="num w-10 text-right text-xs text-ash">{n.efficiency}%</span>
                  <span className="label w-12 text-right">{QUALITY[n.quality - 1]}</span>
                  <button className="text-smoke hover:text-blood" onClick={() => remove(n.day)} aria-label={`Delete night of ${n.day}`}><Icon name="trash" size={15} /></button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <Panel className="lg:col-span-12">
        <div className="kicker">The research</div>
        <h2 className="display mb-2 text-3xl">Is screen time the best way to track sleep without a wearable?</h2>
        <div className="grid gap-5 text-sm text-bone-dim md:grid-cols-3">
          <div><h3 className="font-cond text-lg font-bold uppercase tracking-wide text-zone-go">Good at: when</h3><p>Your last touch at night and first touch in the morning line up closely with when you actually fell asleep and woke. It is objective and costs you nothing to collect.</p></div>
          <div><h3 className="font-cond text-lg font-bold uppercase tracking-wide text-blood-hot">Bad at: how long</h3><p>On its own it over-counts. Lying awake after you put the phone down, and waking at 03:00 without touching it, both look like sleep. Duration from screen time alone is weak.</p></div>
          <div><h3 className="font-cond text-lg font-bold uppercase tracking-wide text-gold">Best: both together</h3><p>A sleep diary is the standard tool when there is no wearable, and its weak spot is remembering exact times. So this app uses screen time for the times and three diary questions for everything the phone cannot see.</p></div>
        </div>
        <p className="mt-4 border-l-2 border-gold pl-3 text-sm text-bone-dim">
          One limit to know about: a web app is not allowed to read your phone's screen-time data. Apple and Android only expose it to installed native apps with special permission. That is why you copy two times across, or use the tap buttons.
        </p>
        <div className="mt-3">
          <Details title="How the sleep score is built, and sources">
            <p>Estimated sleep = screen-off gap − time to fall asleep − time awake (or 5 min per night-time pickup, whichever is larger).</p>
            <p className="mt-2">Score out of 100: duration against your sleep need (50), how it felt (20), efficiency (10), how regular your bedtime has been (10) and your 7-night average (10). The readiness score loses a quarter of whatever is missing. Under 5 h caps the day at TONE IT DOWN.</p>
            <div className="mt-3"><Sources items={REFS} /></div>
          </Details>
        </div>
      </Panel>
    </div>
  )
}
