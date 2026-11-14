import { useEffect, useState } from 'react'
import { api } from '../../api'
import { useApp } from '../../store/appStore'
import type { InjuryDoc, InjuryLibrary, MyInjury } from '../../types'
import Icon from '../../components/common/Icon'
import { Details, Meter, Modal, Panel, Segmented, Sources } from '../../components/common/ui'

const REGIONS: Record<string, string> = {
  knee: 'Knee', shoulder: 'Shoulder', elbow: 'Elbow', hand: 'Hand & wrist', neck: 'Neck', back: 'Back',
  ribs: 'Ribs', hip: 'Hip & groin', ankle_foot: 'Ankle & foot', head: 'Head', skin: 'Skin',
}
const MAT_COLOR: Record<string, string> = { off: '#e5202f', solo: '#ff6a3d', drill: '#ffa42b', positional: '#d6dd45', light: '#d6dd45', full: '#4ade80' }
const MAT_LABEL: Record<string, string> = { off: 'Off the mat', solo: 'Solo only', drill: 'Drilling only', positional: 'Positional', light: 'Light rolling', full: 'Full training' }

function MatTag({ level }: { level: string }) {
  return <span className="num border px-1.5 py-0.5 text-[10px] font-bold uppercase" style={{ color: MAT_COLOR[level], borderColor: MAT_COLOR[level] }}>{MAT_LABEL[level] ?? level}</span>
}

function PhaseBody({ phase, checks, onCheck, prefix }: { phase: InjuryDoc['phases'][number]; checks?: Set<string>; onCheck?: (key: string, on: boolean) => void; prefix?: string }) {
  return (
    <div className="grid gap-4 text-sm md:grid-cols-3">
      <div>
        <div className="label mb-1">Goals</div>
        <ul className="space-y-1 text-bone-dim">{phase.goals.map(g => <li key={g}>▸ {g}</li>)}</ul>
      </div>
      <div>
        <div className="label mb-1">The work</div>
        <ul className="space-y-1.5">
          {phase.work.map(w => (
            <li key={w.name}><div className="text-bone">{w.name}</div><div className="num text-[11px] text-ash">{w.dose}</div></li>
          ))}
        </ul>
      </div>
      <div>
        <div className="label mb-1">Move on when</div>
        <ul className="space-y-1.5">
          {phase.progress_when.map((c, i) => {
            const key = `${prefix}:${i}`
            const on = checks?.has(key) ?? false
            return onCheck ? (
              <li key={c}>
                <label className="flex cursor-pointer items-start gap-2">
                  <input type="checkbox" className="sr-only" checked={on} onChange={e => onCheck(key, e.target.checked)} />
                  <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border ${on ? 'border-zone-go bg-zone-go text-ink-950' : 'border-ink-500'}`}>{on && <Icon name="check" size={12} />}</span>
                  <span className={on ? 'text-bone' : 'text-bone-dim'}>{c}</span>
                </label>
              </li>
            ) : <li key={c} className="text-bone-dim">▸ {c}</li>
          })}
        </ul>
      </div>
    </div>
  )
}

function ActiveCard({ inj, doc, onChange }: { inj: MyInjury; doc?: InjuryDoc; onChange: () => void }) {
  const [pain, setPain] = useState(inj.pain)
  useEffect(() => setPain(inj.pain), [inj.pain])
  const phase = inj.phase
  const checks = new Set(inj.criteria_done)
  const allDone = phase ? phase.progress_when.every((_, i) => checks.has(`${inj.phase_index}:${i}`)) : false
  const last = inj.phase_index >= inj.phase_count - 1
  const patch = async (b: Parameters<typeof api.patchInjury>[1]) => { await api.patchInjury(inj.id, b); onChange() }
  const [lo, hi] = inj.expected_weeks
  const weeksIn = inj.days / 7

  return (
    <Panel hot>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="kicker">{REGIONS[inj.region] ?? inj.region}{inj.side ? ` · ${inj.side}` : ''} · {inj.severity}</div>
          <h3 className="display text-3xl">{inj.name}</h3>
        </div>
        <div className="text-right">
          <MatTag level={inj.mat_level} />
          <div className="num mt-1 text-xs text-ash">DAY {inj.days + 1}{lo !== null && ` · TYPICAL ${lo}-${hi} WK`}</div>
        </div>
      </div>
      {lo !== null && hi !== null && <div className="mt-3"><Meter value={weeksIn} max={hi} marker={lo / hi} height={5} color="#5aa9ff" /></div>}

      {/* Phase stepper */}
      <ol className="mt-4 flex gap-1">
        {(doc?.phases ?? []).map((p, i) => (
          <li key={p.name} className="min-w-0 flex-1">
            <button onClick={() => patch({ phase_index: i })} className="w-full text-left" aria-current={i === inj.phase_index ? 'step' : undefined}>
              <div className={`h-1.5 ${i < inj.phase_index ? 'bg-bone' : i === inj.phase_index ? 'bg-blood' : 'bg-ink-600'}`} />
              <div className={`mt-1 truncate font-cond text-xs font-semibold uppercase tracking-wider ${i === inj.phase_index ? 'text-bone' : 'text-smoke'}`}>{i + 1}. {p.name}</div>
            </button>
          </li>
        ))}
      </ol>

      {phase && (
        <div className="mt-4">
          <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
            <span className="font-cond text-xl font-bold uppercase tracking-wide">{phase.name}</span>
            <span className="num text-xs text-ash">{phase.window}</span>
          </div>
          <p className="mb-3 text-sm text-bone-dim"><b className="text-bone">On the mat:</b> {inj.mat_text}</p>
          <PhaseBody phase={phase} checks={checks} prefix={String(inj.phase_index)}
            onCheck={(key, on) => patch({ criteria_done: on ? [...inj.criteria_done, key] : inj.criteria_done.filter(k => k !== key) })} />
        </div>
      )}

      <div className="mt-5 grid gap-4 border-t border-ink-600 pt-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="flex items-baseline justify-between">
            <span className="label">Pain right now</span>
            <span className="num text-lg font-bold" style={{ color: pain >= 7 ? '#e5202f' : pain >= 4 ? '#ffa42b' : '#4ade80' }}>{pain}/10</span>
          </div>
          <input type="range" min={0} max={10} value={pain} onChange={e => setPain(Number(e.target.value))}
            onMouseUp={() => pain !== inj.pain && patch({ pain })} onTouchEnd={() => pain !== inj.pain && patch({ pain })} onKeyUp={() => pain !== inj.pain && patch({ pain })} aria-label="Pain level" />
          {pain >= 7 && <p className="mt-1 text-xs text-blood-hot">Pain this high means rehab only today, and it is worth getting examined.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {!last && <button className="btn btn-sm" disabled={!allDone} title={allDone ? '' : 'Tick every "move on when" box first'} onClick={() => patch({ phase_index: inj.phase_index + 1 })}>Next phase</button>}
          <button className="btn btn-ghost btn-sm" onClick={() => patch({ status: 'resolved' })}>{last && allDone ? 'Fully recovered' : 'Mark resolved'}</button>
        </div>
      </div>
    </Panel>
  )
}

function LibraryModal({ doc, onClose, onStart }: { doc: InjuryDoc; onClose: () => void; onStart: (b: { severity: string; side: string | null; pain: number }) => void }) {
  const [severity, setSeverity] = useState('mild')
  const [side, setSide] = useState<string | null>(null)
  const [pain, setPain] = useState(3)
  const sided = !['neck', 'back', 'head', 'skin'].includes(doc.region)
  return (
    <Modal open onClose={onClose} wide title={doc.name}>
      <div className="kicker">{REGIONS[doc.region]}</div>
      <h2 className="display text-4xl">{doc.name}</h2>
      <p className="mt-1 font-cond text-lg text-bone-dim">{doc.tagline}</p>

      <div className="mt-4 border border-blood/70 bg-blood/10 p-3">
        <div className="label flex items-center gap-2 text-blood-hot"><Icon name="alert" size={14} />See a clinician if</div>
        <ul className="mt-1 space-y-1 text-sm">{doc.red_flags.map(r => <li key={r}>▸ {r}</li>)}</ul>
      </div>

      <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
        <div><div className="label mb-1">How it happens in BJJ</div><ul className="space-y-1 text-bone-dim">{doc.how.map(x => <li key={x}>▸ {x}</li>)}</ul></div>
        <div><div className="label mb-1">What it feels like</div><ul className="space-y-1 text-bone-dim">{doc.symptoms.map(x => <li key={x}>▸ {x}</li>)}</ul></div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {(['mild', 'moderate', 'severe'] as const).map(g => (
          <div key={g} className="border border-ink-600 bg-ink-900 px-3 py-2">
            <div className="label">{g}</div><div className="num text-lg font-bold">{doc.weeks[g][0]}-{doc.weeks[g][1]} <span className="text-xs font-medium text-ash">wk</span></div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="label mb-2">Rehab phases</div>
        {doc.phases.map((p, i) => (
          <details key={p.name} className="group border-t border-ink-600 py-2.5" open={i === 0}>
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1">
              <span className="num text-xs text-blood">0{i + 1}</span>
              <span className="font-cond text-lg font-bold uppercase tracking-wide">{p.name}</span>
              <span className="num text-xs text-ash">{p.window}</span>
              <span className="ml-auto"><MatTag level={p.mat} /></span>
            </summary>
            <div className="pt-3"><PhaseBody phase={p} /></div>
          </details>
        ))}
      </div>

      <div className="mt-4 grid gap-4 border-t border-ink-600 pt-4 text-sm md:grid-cols-2">
        <div><div className="label mb-1 text-blood-hot">Avoid while healing</div><ul className="space-y-1 text-bone-dim">{doc.avoid.map(x => <li key={x}>✕ {x}</li>)}</ul></div>
        <div><div className="label mb-1 text-zone-go">Stop it happening again</div><ul className="space-y-1 text-bone-dim">{doc.prevent.map(x => <li key={x}>✓ {x}</li>)}</ul></div>
      </div>

      <div className="mt-5 border border-ink-600 bg-ink-950 p-4">
        <div className="kicker">I have this. Track my rehab</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div><div className="label mb-1">How bad</div><Segmented value={severity} onChange={setSeverity} options={[{ id: 'mild', label: 'Mild' }, { id: 'moderate', label: 'Mod' }, { id: 'severe', label: 'Severe' }]} /></div>
          {sided && <div><div className="label mb-1">Side</div><Segmented value={side} onChange={setSide} options={[{ id: 'left', label: 'L' }, { id: 'right', label: 'R' }, { id: 'both', label: 'Both' }]} /></div>}
          <div><div className="flex justify-between"><span className="label">Pain now</span><span className="num font-bold">{pain}/10</span></div>
            <input type="range" min={0} max={10} value={pain} onChange={e => setPain(Number(e.target.value))} aria-label="Pain now" /></div>
        </div>
        <button className="btn mt-3" onClick={() => onStart({ severity, side, pain })}>Start rehab plan</button>
        <p className="mt-2 text-xs text-ash">While it is active the recovery calculator limits you to what the current phase allows, and missed weeks freeze your streak instead of breaking it.</p>
      </div>
    </Modal>
  )
}

export default function Injuries() {
  const { refresh, version } = useApp()
  const [lib, setLib] = useState<InjuryLibrary | null>(null)
  const [mine, setMine] = useState<MyInjury[]>([])
  const [region, setRegion] = useState<string>('all')
  const [openDoc, setOpenDoc] = useState<InjuryDoc | null>(null)

  useEffect(() => { api.injuries().then(setLib).catch(() => {}) }, [])
  useEffect(() => { api.myInjuries().then(setMine).catch(() => {}) }, [version])

  if (!lib) return null
  const active = mine.filter(m => m.status === 'active')
  const past = mine.filter(m => m.status === 'resolved')
  const regions = ['all', ...Array.from(new Set(lib.injuries.map(i => i.region)))]
  const shown = lib.injuries.filter(i => region === 'all' || i.region === region)

  const start = async (b: { severity: string; side: string | null; pain: number }) => {
    if (!openDoc) return
    await api.addInjury({ injury_slug: openDoc.slug, ...b })
    setOpenDoc(null)
    await refresh()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-6">
      <p className="flex gap-3 border border-ink-600 bg-ink-900 p-3 text-xs text-bone-dim"><Icon name="alert" size={16} className="shrink-0 text-gold" />{lib.disclaimer}</p>

      {active.length > 0 && (
        <section className="space-y-4">
          <h2 className="display text-3xl">Active rehab</h2>
          {active.map(inj => <ActiveCard key={inj.id} inj={inj} doc={lib.injuries.find(d => d.slug === inj.slug)} onChange={refresh} />)}
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="display text-3xl">Injury library</h2>
          <span className="num text-xs text-ash">{lib.injuries.length} CONDITIONS · TAP ONE FOR THE FULL PLAN</span>
        </div>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {regions.map(r => <button key={r} className="chip" aria-pressed={region === r} onClick={() => setRegion(r)}>{r === 'all' ? 'All' : REGIONS[r] ?? r}</button>)}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map(d => (
            <button key={d.slug} onClick={() => setOpenDoc(d)} className="panel group text-left transition-transform hover:-translate-y-0.5">
              <div className="kicker">{REGIONS[d.region]}</div>
              <h3 className="font-cond text-2xl font-bold uppercase leading-tight tracking-wide group-hover:text-blood-hot">{d.name}</h3>
              <p className="mt-1 text-sm text-bone-dim">{d.tagline}</p>
              <div className="num mt-3 flex items-center justify-between text-[11px] text-ash">
                <span>{d.weeks.mild[0]}-{d.weeks.severe[1]} WK · {d.phases.length} PHASES</span>
                <Icon name="chevron" size={14} className="text-blood" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="label mb-2">Injury history</h2>
          <ul className="divide-y divide-ink-600 border-y border-ink-600 text-sm">
            {past.map(p => (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <span className="flex-1">{p.name}{p.side ? `, ${p.side}` : ''}</span>
                <span className="num text-xs text-ash">{p.days} days</span>
                <button className="chip" onClick={async () => { await api.patchInjury(p.id, { status: 'active' }); refresh() }}>Reopen</button>
                <button className="text-smoke hover:text-blood" aria-label="Delete" onClick={async () => { await api.deleteInjury(p.id); refresh() }}><Icon name="trash" size={15} /></button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Details title="Where the injury data comes from"><Sources items={lib.sources} /></Details>

      {openDoc && <LibraryModal doc={openDoc} onClose={() => setOpenDoc(null)} onStart={start} />}
    </div>
  )
}
