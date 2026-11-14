import { useEffect, useState } from 'react'
import { api } from '../api'
import { useApp } from '../store/appStore'
import type { Food, FuelDay, FuelHistoryRow } from '../types'
import Icon from '../components/common/Icon'
import { Bars, Details, Field, Meter, PageHead, Panel, Ring, Segmented, Sources, fmtDate, localISO } from '../components/common/ui'

const MEALS = [
  { id: 'breakfast', label: 'Breakfast' }, { id: 'lunch', label: 'Lunch' }, { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snack' }, { id: 'pre', label: 'Pre-training' }, { id: 'post', label: 'Post-training' },
]
const TONE = { warn: '#ffa42b', info: '#5aa9ff', good: '#4ade80' }
const REFS = [
  { title: 'Thomas, Erdman & Burke 2016: Nutrition and Athletic Performance (ACSM / AND / Dietitians of Canada)', url: 'https://doi.org/10.1249/MSS.0000000000000852', used_for: 'Carbohydrate scaled to training load (3-5 g/kg light, 5-7 moderate, 6-10 hard), fat not chronically under 20% of energy, 0.4-0.8 L of fluid per training hour, 1.25-1.5 L per kg lost.' },
  { title: 'Jäger et al. 2017: ISSN position stand on protein and exercise', url: 'https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8', used_for: '1.4-2.0 g/kg/day for training adults, 0.25-0.4 g/kg per meal, higher intakes when cutting.' },
  { title: 'Kerksick et al. 2018: ISSN exercise & sports nutrition review', url: 'https://jissn.biomedcentral.com/articles/10.1186/s12970-018-0242-y', used_for: 'Carbohydrate and energy needs of athletes in general.' },
  { title: 'Mountjoy et al. 2018: IOC consensus on relative energy deficiency in sport', url: 'https://bjsm.bmj.com/content/52/11/687.abstract', used_for: 'Why repeated under-eating is treated as a recovery and injury risk.' },
]
const mealDefault = () => { const h = new Date().getHours(); return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 18 ? 'snack' : 'dinner' }

function AddFood({ day, onAdded }: { day: string; onAdded: () => void }) {
  const [mode, setMode] = useState<'search' | 'manual'>('search')
  const [q, setQ] = useState('')
  const [foods, setFoods] = useState<Food[]>([])
  const [pick, setPick] = useState<Food | null>(null)
  const [grams, setGrams] = useState(100)
  const [meal, setMeal] = useState(mealDefault())
  const [man, setMan] = useState({ name: '', protein: '', carbs: '', fat: '' })

  useEffect(() => {
    const t = setTimeout(() => api.foods(q).then(setFoods).catch(() => {}), 150)
    return () => clearTimeout(t)
  }, [q])

  const k = grams / 100
  const manKcal = 4 * (Number(man.protein) || 0) + 4 * (Number(man.carbs) || 0) + 9 * (Number(man.fat) || 0)

  const add = async () => {
    if (mode === 'search' && pick) await api.logFood({ food_id: pick.id, grams, meal, day })
    else if (mode === 'manual' && man.name.trim()) {
      await api.logFood({ name: man.name.trim(), protein: Number(man.protein) || 0, carbs: Number(man.carbs) || 0, fat: Number(man.fat) || 0, meal, day })
      setMan({ name: '', protein: '', carbs: '', fat: '' })
    } else return
    setPick(null); setQ(''); onAdded()
  }

  return (
    <Panel hot>
      <div className="flex items-center justify-between">
        <div className="kicker">Add food</div>
        <Segmented value={mode} onChange={setMode} options={[{ id: 'search', label: 'Library' }, { id: 'manual', label: 'Type macros' }]} />
      </div>
      <div className="mt-3"><Segmented value={meal} onChange={setMeal} options={MEALS} /></div>

      {mode === 'search' ? (
        <div className="mt-3">
          {!pick ? (
            <>
              <input className="field" value={q} onChange={e => setQ(e.target.value)} placeholder="Search: rice, chicken, dal, banana, whey…" aria-label="Search foods" />
              <ul className="mt-1 max-h-64 overflow-y-auto border border-ink-600 bg-ink-950">
                {foods.map(f => (
                  <li key={f.id}>
                    <button className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-ink-800" onClick={() => { setPick(f); setGrams(f.serving_g) }}>
                      <span className="min-w-0 truncate text-sm">{f.name}</span>
                      <span className="num shrink-0 text-[11px] text-ash">{Math.round(f.kcal)} kcal · P{Math.round(f.protein)} C{Math.round(f.carbs)} F{Math.round(f.fat)} /100 g</span>
                    </button>
                  </li>
                ))}
                {foods.length === 0 && <li className="px-3 py-3 text-sm text-ash">No match. Switch to "Type macros" to enter it by hand.</li>}
              </ul>
            </>
          ) : (
            <div className="border border-ink-600 bg-ink-950 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="font-cond text-xl font-bold uppercase tracking-wide">{pick.name}</div>
                <button className="text-ash hover:text-bone" onClick={() => setPick(null)} aria-label="Choose another food"><Icon name="x" size={16} /></button>
              </div>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <Field label="Amount (g or mL)" className="w-32">
                  <input type="number" min={1} className="field num" value={grams} onChange={e => setGrams(Math.max(1, Number(e.target.value)))} />
                </Field>
                <div className="flex gap-1.5">
                  {[0.5, 1, 2].map(m => (
                    <button key={m} className="chip" onClick={() => setGrams(Math.round(pick.serving_g * m))}>{m === 1 ? pick.serving_label ?? '1 serving' : `×${m}`}</button>
                  ))}
                </div>
              </div>
              <div className="num mt-3 grid grid-cols-4 gap-2 text-center text-sm">
                {([['kcal', pick.kcal, ''], ['Protein', pick.protein, 'g'], ['Carbs', pick.carbs, 'g'], ['Fat', pick.fat, 'g']] as const).map(([l, v, u]) => (
                  <div key={l} className="border border-ink-600 py-1.5"><div className="font-bold">{Math.round(v * k)}{u}</div><div className="label">{l}</div></div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Field label="What was it" className="col-span-3"><input className="field" value={man.name} onChange={e => setMan(p => ({ ...p, name: e.target.value }))} placeholder="Mum's chicken curry and rice" /></Field>
          {(['protein', 'carbs', 'fat'] as const).map(m => (
            <Field key={m} label={`${m} (g)`}><input type="number" min={0} inputMode="decimal" className="field num" value={man[m]} onChange={e => setMan(p => ({ ...p, [m]: e.target.value }))} /></Field>
          ))}
          <p className="num col-span-3 text-xs text-ash">= {Math.round(manKcal)} kcal</p>
        </div>
      )}
      <button className="btn mt-3 w-full" onClick={add} disabled={mode === 'search' ? !pick : !man.name.trim()}>Add to {MEALS.find(m => m.id === meal)?.label.toLowerCase()}</button>
    </Panel>
  )
}

export default function Fuel() {
  const { version, refresh, dayType, setDayType, setTab } = useApp()
  const [day, setDay] = useState(localISO())
  const [d, setD] = useState<FuelDay | null>(null)
  const [hist, setHist] = useState<FuelHistoryRow[]>([])
  const isToday = day === localISO()

  const load = () => {
    api.fuelDay(day, isToday ? dayType ?? undefined : undefined).then(setD).catch(() => {})
    api.fuelHistory().then(setHist).catch(() => {})
  }
  useEffect(load, [day, version, dayType])    // eslint-disable-line react-hooks/exhaustive-deps

  const shift = (n: number) => { const x = new Date(day + 'T12:00:00'); x.setDate(x.getDate() + n); const iso = localISO(x); if (iso <= localISO()) setDay(iso) }
  const water = async (ml: number) => { await api.logWater(ml, day); await refresh() }
  const undo = async () => { await api.undoWater(day); await refresh() }
  const del = async (id: number) => { await api.deleteFood(id); await refresh() }

  if (!d) return <PageHead kicker="Fuel" title="Eat like you train" />
  const t = d.targets
  const tot = d.totals
  const sc = d.score.score
  const scColor = sc >= 80 ? '#4ade80' : sc >= 55 ? '#ffa42b' : '#e5202f'
  const macros = [
    { k: 'kcal', label: 'Energy', unit: 'kcal', color: '#ece7dd', per: '' },
    { k: 'protein', label: 'Protein', unit: 'g', color: '#e5202f', per: `${t.per_kg.protein} g/kg` },
    { k: 'carbs', label: 'Carbs', unit: 'g', color: '#e3b34a', per: `${t.per_kg.carbs} g/kg` },
    { k: 'fat', label: 'Fat', unit: 'g', color: '#8b3fd6', per: `${t.per_kg.fat} g/kg` },
  ] as const
  const expected = isToday ? Math.max(0.1, Math.min(1, (d.hour - 6) / 15)) : undefined

  return (
    <div>
      <PageHead kicker="Fuel" title="Eat like you train">
        <div className="flex items-center gap-1">
          <button className="chip" onClick={() => shift(-1)} aria-label="Previous day">‹</button>
          <span className="num min-w-[7.5rem] border border-ink-600 bg-ink-900 px-3 py-[0.45rem] text-center text-sm">{isToday ? 'TODAY' : fmtDate(day, { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}</span>
          <button className="chip" onClick={() => shift(1)} disabled={isToday} aria-label="Next day" style={{ opacity: isToday ? 0.3 : 1 }}>›</button>
        </div>
      </PageHead>

      <div className="grid gap-4 lg:grid-cols-12">
        <Panel className="lg:col-span-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="kicker">Targets for a {t.day_label.toLowerCase()}</div>
              <p className="mt-1 max-w-md text-xs text-ash">
                Built for {t.weight_kg} kg{t.weight_assumed && ' (placeholder)'} on a {t.goal === 'maintain' ? 'hold-weight' : t.goal} plan.{' '}
                {t.day_type_source === 'logged' ? 'Day type set from the session you logged.' : t.day_type_source === 'chosen' ? 'Day type set by you.' : 'Day type assumed from your schedule: change it if today is different.'}
              </p>
            </div>
            {isToday && (
              <Segmented value={t.day_type} onChange={v => setDayType(v)}
                options={[{ id: 'rest', label: 'Rest' }, { id: 'light', label: 'Light' }, { id: 'moderate', label: 'Class' }, { id: 'hard', label: 'Hard' }]} />
            )}
          </div>

          <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
            <Ring value={sc} color={scColor} size={128}>
              <span className="num text-4xl font-bold" style={{ color: scColor }}>{d.logged ? sc : '—'}</span>
              <span className="label">fuel score</span>
            </Ring>
            <div className="min-w-0 flex-1 space-y-3">
              {macros.map(m => (
                <div key={m.k}>
                  <div className="flex items-baseline justify-between">
                    <span className="label">{m.label} {m.per && <span className="text-smoke">· {m.per}</span>}</span>
                    <span className="num text-sm"><b className="text-base">{Math.round(tot[m.k])}</b><span className="text-ash"> / {t[m.k]} {m.unit}</span></span>
                  </div>
                  <Meter value={tot[m.k]} max={t[m.k]} color={m.color} marker={expected} />
                </div>
              ))}
            </div>
          </div>
          {isToday && <p className="num mt-2 text-[10px] text-smoke">THE THIN MARK IS WHERE YOU WOULD EXPECT TO BE BY THIS TIME OF DAY</p>}

          {/* Water */}
          <div className="mt-5 border-t border-ink-600 pt-4">
            <div className="flex items-baseline justify-between">
              <span className="label flex items-center gap-1.5"><Icon name="drop" size={14} className="text-[#5aa9ff]" />Water</span>
              <span className="num text-sm"><b className="text-base">{(tot.water_ml / 1000).toFixed(2)}</b><span className="text-ash"> / {(t.water_ml / 1000).toFixed(2)} L</span></span>
            </div>
            <Meter value={tot.water_ml} max={t.water_ml} color="#5aa9ff" height={12} marker={expected} />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[250, 500, 750, 1000].map(ml => <button key={ml} className="chip" onClick={() => water(ml)}>+{ml} mL</button>)}
              <button className="chip" onClick={undo} disabled={d.water.length === 0} style={{ opacity: d.water.length ? 1 : 0.35 }}>Undo</button>
            </div>
          </div>
        </Panel>

        {/* Hints */}
        <Panel className="lg:col-span-5">
          <div className="kicker">Corner advice</div>
          {d.hints.length === 0 && <p className="mt-2 text-sm text-ash">Log some food and water and the advice shows up here.</p>}
          <ul className="mt-3 space-y-3">
            {d.hints.map(hint => (
              <li key={hint.key} className="border-l-4 pl-3" style={{ borderColor: TONE[hint.tone] }}>
                <div className="font-cond text-lg font-bold uppercase leading-tight tracking-wide" style={{ color: hint.tone === 'warn' ? TONE.warn : undefined }}>{hint.title}</div>
                <p className="text-sm text-bone-dim">{hint.text}</p>
                {hint.key === 'weight' && <button className="link mt-1 text-sm" onClick={() => useApp.getState().openProfile(true)}>Open profile</button>}
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-ink-600 pt-3">
            <div className="label mb-2">Still to hit {isToday ? 'today' : 'that day'}</div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {([['protein', 'Protein', 'g'], ['carbs', 'Carbs', 'g'], ['fat', 'Fat', 'g'], ['water_ml', 'Water', 'L']] as const).map(([k, label, unit]) => {
                const left = Math.max(0, t[k] - tot[k])
                return (
                  <div key={k} className={`border py-1.5 ${left === 0 ? 'border-zone-go/50 text-zone-go' : 'border-ink-600'}`}>
                    <div className="num text-base font-bold">{left === 0 ? '✓' : unit === 'L' ? (left / 1000).toFixed(1) : Math.round(left)}{left > 0 && <span className="text-xs font-medium text-ash"> {unit}</span>}</div>
                    <div className="label">{label}</div>
                  </div>
                )
              })}
            </div>
          </div>
          <p className="mt-4 border-t border-ink-600 pt-3 text-xs text-ash">
            Yesterday's fuel score feeds today's readiness. <button className="link" onClick={() => setTab('recovery')}>See the recovery calculator</button>
          </p>
        </Panel>

        <div className="lg:col-span-5"><AddFood day={day} onAdded={refresh} /></div>

        <Panel className="lg:col-span-7">
          <div className="kicker">Eaten {isToday ? 'today' : fmtDate(day, { day: 'numeric', month: 'short' })}</div>
          {d.entries.length === 0 ? <p className="mt-2 text-sm text-ash">Nothing logged.</p> : (
            <div className="mt-2 space-y-3">
              {MEALS.concat([{ id: 'meal', label: 'Other' }]).filter(m => d.entries.some(e => e.meal === m.id)).map(m => {
                const rows = d.entries.filter(e => e.meal === m.id)
                return (
                  <div key={m.id}>
                    <div className="flex items-baseline justify-between border-b border-ink-600 pb-1">
                      <span className="label text-bone-dim">{m.label}</span>
                      <span className="num text-[11px] text-ash">{rows.reduce((a, e) => a + e.kcal, 0)} kcal · P{Math.round(rows.reduce((a, e) => a + e.protein, 0))}</span>
                    </div>
                    <ul>
                      {rows.map(e => (
                        <li key={e.id} className="group flex items-center gap-3 py-1.5 text-sm">
                          <span className="min-w-0 flex-1 truncate">{e.name}{e.grams ? <span className="num ml-2 text-xs text-ash">{Math.round(e.grams)} g</span> : null}</span>
                          <span className="num shrink-0 text-xs text-ash">P{Math.round(e.protein)} C{Math.round(e.carbs)} F{Math.round(e.fat)}</span>
                          <span className="num w-14 shrink-0 text-right">{e.kcal}</span>
                          <button className="text-smoke hover:text-blood" onClick={() => del(e.id)} aria-label={`Remove ${e.name}`}><Icon name="x" size={14} /></button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-5 border-t border-ink-600 pt-4">
            <div className="label mb-4">Fuel score, last 14 days</div>
            <Bars height={70} max={100} every={2}
              data={hist.map(r => ({ label: fmtDate(r.day, { day: 'numeric' }), value: r.score ?? 0, color: (r.score ?? 0) >= 80 ? '#4ade80' : (r.score ?? 0) >= 55 ? '#ffa42b' : '#e5202f', title: `${fmtDate(r.day)}: ${r.logged ? `score ${r.score}, ${r.kcal} kcal, ${Math.round(r.protein)} g protein` : 'not logged'}` }))} />
          </div>
        </Panel>

        <Panel className="lg:col-span-12">
          <Details title="How the targets and the fuel score are worked out" open={false}>
            <ul className="list-disc space-y-1.5 pl-5">
              <li><b className="text-bone">Protein:</b> 1.8 g per kg of body weight a day, 2.2 g/kg when cutting.</li>
              <li><b className="text-bone">Carbs follow the work:</b> 3 g/kg on a rest day, 4 on a light day, 5 on a normal class day, 7 on a hard or double-session day. One g/kg less when cutting.</li>
              <li><b className="text-bone">Fat:</b> whatever energy is left, never under 0.8 g/kg and never over 35% of energy. Anything beyond that goes to carbs.</li>
              <li><b className="text-bone">Energy:</b> resting burn (Mifflin-St Jeor) x 1.4 for daily life, plus training (about 2.5-7.5 kcal per kg per hour depending on how hard the session was). Cutting takes 15% off, gaining adds 8%. This is an estimate; adjust to what the scale does over 2-3 weeks.</li>
              <li><b className="text-bone">Water:</b> 35 mL per kg, plus 600 mL for each hour on the mat.</li>
              <li><b className="text-bone">Fuel score:</b> protein 35 points, carbs 25, energy 20, water 20. Up to 15 points of tomorrow's readiness depend on it.</li>
            </ul>
            <p className="mt-3">These are general sports-nutrition ranges, not a diet plan. If you are cutting weight for competition, have a medical condition or a history of disordered eating, work with a dietitian.</p>
            <div className="mt-3"><Sources items={REFS} /></div>
          </Details>
        </Panel>
      </div>
    </div>
  )
}
