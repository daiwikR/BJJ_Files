import { useState } from 'react'
import { api } from '../api'
import { useApp } from '../store/appStore'
import type { BeltId } from '../types'
import { BELT_NAMES } from '../types'
import Belt from './common/Belt'
import { Field, Modal, Segmented, Stepper, localISO } from './common/ui'

const BELTS: BeltId[] = ['white', 'blue', 'purple', 'brown', 'black']

/** First-run onboarding and the profile editor are the same form. */
export default function ProfileForm({ mode }: { mode: 'onboard' | 'edit' }) {
  const { profile, refresh, openProfile, boot } = useApp()
  const [f, setF] = useState({
    name: profile?.name ?? '',
    belt: (profile?.belt ?? 'white') as BeltId,
    stripes: profile?.stripes ?? 0,
    belt_started_on: profile?.belt_started_on ?? localISO(),
    banked_hours: 0,
    classes_per_day: profile?.classes_per_day ?? 1,
    days_per_week: profile?.days_per_week ?? 3,
    class_minutes: profile?.class_minutes ?? 90,
    weight_kg: profile?.weight_kg ? String(profile.weight_kg) : '',
    height_cm: profile?.height_cm ? String(profile.height_cm) : '',
    age: profile?.age ? String(profile.age) : '',
    sex: profile?.sex ?? null,
    goal: profile?.goal ?? 'maintain',
    sleep_need_h: profile?.sleep_need_h ?? 8,
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(p => ({ ...p, [k]: v }))

  const rankChanged = mode === 'onboard' || f.belt !== profile?.belt || f.stripes !== profile?.stripes
  const weekly = (f.classes_per_day * f.days_per_week * f.class_minutes) / 60
  const num = (s: string) => (s.trim() === '' ? null : Number(s))

  const save = async () => {
    setSaving(true)
    setErr('')
    try {
      await api.saveProfile({
        name: f.name.trim() || null, belt: f.belt, stripes: f.belt === 'black' ? 0 : f.stripes,
        belt_started_on: f.belt_started_on || null,
        level_started_on: mode === 'onboard' && f.stripes === 0 ? f.belt_started_on || null : null,
        banked_hours: f.banked_hours, classes_per_day: f.classes_per_day, days_per_week: f.days_per_week,
        class_minutes: f.class_minutes, weight_kg: num(f.weight_kg), height_cm: num(f.height_cm), age: num(f.age),
        sex: f.sex, goal: f.goal, sleep_need_h: f.sleep_need_h, sync_rank: rankChanged,
      })
      if (mode === 'onboard') await boot()
      else { await refresh(); openProfile(false) }
    } catch {
      setErr('Could not save. Check the numbers and that the backend is running.')
    } finally {
      setSaving(false)
    }
  }

  const body = (
    <div>
      <div className="kicker">{mode === 'onboard' ? 'Step on the mat' : 'Profile'}</div>
      <h1 className="display mb-1 text-4xl sm:text-5xl">{mode === 'onboard' ? 'Who is training?' : 'Your numbers'}</h1>
      <p className="prose-dim mb-5 max-w-prose text-sm">
        {mode === 'onboard'
          ? 'Three things build your roadmap: where you are now, how often you can train, and how long you spend on the mat. Everything stays on this machine.'
          : 'Change your schedule or body data any time. Changing belt or stripes restarts the current stage.'}
      </p>

      <div className="space-y-6">
        <section>
          <h2 className="label mb-2 text-blood">01 · Rank</h2>
          <div className="grid grid-cols-5 gap-1.5">
            {BELTS.map(b => (
              <button key={b} type="button" onClick={() => set('belt', b)} aria-pressed={f.belt === b}
                className={`border p-2 text-left transition-colors ${f.belt === b ? 'border-blood bg-ink-800' : 'border-ink-600 bg-ink-900 hover:border-smoke'}`}>
                <Belt belt={b} stripes={f.belt === b && b !== 'black' ? f.stripes : 0} className="h-3.5 w-full" />
                <div className="mt-1.5 font-cond text-sm font-semibold uppercase tracking-wider">{BELT_NAMES[b]}</div>
              </button>
            ))}
          </div>
          {f.belt !== 'black' && (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label="Stripes">
                <Segmented value={f.stripes} onChange={v => set('stripes', v)} options={[0, 1, 2, 3, 4].map(n => ({ id: n, label: String(n) }))} />
              </Field>
              <Field label="Got this belt on">
                <input type="date" className="field" value={f.belt_started_on} max={localISO()} onChange={e => set('belt_started_on', e.target.value)} />
              </Field>
              {rankChanged && (
                <Field label="Hours since last stripe" hint="Rough guess is fine. 0 if unsure.">
                  <input type="number" min={0} max={500} className="field num" value={f.banked_hours} onChange={e => set('banked_hours', Math.max(0, Number(e.target.value)))} />
                </Field>
              )}
            </div>
          )}
        </section>

        <section>
          <h2 className="label mb-2 text-blood">02 · Schedule</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Classes per training day"><Stepper value={f.classes_per_day} onChange={v => set('classes_per_day', v)} min={1} max={3} /></Field>
            <Field label="Training days per week"><Stepper value={f.days_per_week} onChange={v => set('days_per_week', v)} min={1} max={7} /></Field>
            <Field label="Class length"><Stepper value={f.class_minutes} onChange={v => set('class_minutes', v)} min={30} max={180} step={15} unit="min" /></Field>
          </div>
          <p className="mt-2 text-sm text-bone-dim">
            That is <span className="num font-bold text-bone">{weekly.toFixed(1)} h</span> on the mat a week across{' '}
            <span className="num font-bold text-bone">{f.classes_per_day * f.days_per_week}</span> sessions.
          </p>
        </section>

        <section>
          <h2 className="label mb-2 text-blood">03 · Body <span className="text-smoke">(for recovery and fuel maths)</span></h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Name"><input className="field" value={f.name} onChange={e => set('name', e.target.value)} placeholder="Optional" /></Field>
            <Field label="Weight (kg)"><input type="number" inputMode="decimal" className="field num" value={f.weight_kg} onChange={e => set('weight_kg', e.target.value)} placeholder="78" /></Field>
            <Field label="Height (cm)"><input type="number" inputMode="decimal" className="field num" value={f.height_cm} onChange={e => set('height_cm', e.target.value)} placeholder="178" /></Field>
            <Field label="Age"><input type="number" inputMode="numeric" className="field num" value={f.age} onChange={e => set('age', e.target.value)} placeholder="29" /></Field>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field label="Sex (energy estimate)">
              <Segmented value={f.sex} onChange={v => set('sex', v)} options={[{ id: 'male', label: 'Male' }, { id: 'female', label: 'Female' }]} />
            </Field>
            <Field label="Weight goal">
              <Segmented value={f.goal} onChange={v => set('goal', v)} options={[{ id: 'cut', label: 'Cut' }, { id: 'maintain', label: 'Hold' }, { id: 'gain', label: 'Gain' }]} />
            </Field>
            <Field label="Sleep you need"><Stepper value={f.sleep_need_h} onChange={v => set('sleep_need_h', v)} min={6} max={10} step={0.5} unit="h" /></Field>
          </div>
        </section>
      </div>

      {err && <p className="mt-4 text-sm text-blood-hot">{err}</p>}
      <div className="mt-6 flex items-center gap-3">
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : mode === 'onboard' ? 'Build my roadmap' : 'Save'}</button>
        {mode === 'edit' && <button className="btn btn-ghost" onClick={() => openProfile(false)}>Cancel</button>}
      </div>
    </div>
  )

  if (mode === 'edit') return <Modal open wide onClose={() => openProfile(false)} title="Profile">{body}</Modal>
  return (
    <div className="mx-auto flex min-h-full max-w-3xl items-center p-4 sm:p-8">
      <div className="panel panel-hot rise w-full">{body}</div>
    </div>
  )
}
