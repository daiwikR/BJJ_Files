import { useApp } from '../store/appStore'
import { PageHead } from '../components/common/ui'
import Readiness from './recovery/Readiness'
import Sleep from './recovery/Sleep'
import Injuries from './recovery/Injuries'

const SUBS = [
  { id: 'readiness', label: 'Readiness' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'injuries', label: 'Injuries & rehab' },
] as const

export default function Recovery() {
  const { recoveryTab, goRecovery } = useApp()
  return (
    <div>
      <PageHead kicker="Recovery" title="Train hard. Recover harder.">
        <div className="flex gap-1" role="tablist">
          {SUBS.map(s => (
            <button key={s.id} role="tab" aria-selected={recoveryTab === s.id} className="chip" aria-pressed={recoveryTab === s.id} onClick={() => goRecovery(s.id)}>{s.label}</button>
          ))}
        </div>
      </PageHead>
      {recoveryTab === 'readiness' && <Readiness />}
      {recoveryTab === 'sleep' && <Sleep />}
      {recoveryTab === 'injuries' && <Injuries />}
    </div>
  )
}
