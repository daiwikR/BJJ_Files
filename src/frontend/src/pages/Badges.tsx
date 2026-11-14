import { useApp } from '../store/appStore'
import type { BeltId } from '../types'
import { BELT_NAMES } from '../types'
import Belt from '../components/common/Belt'
import Icon from '../components/common/Icon'
import { PageHead, Panel, fmtDate } from '../components/common/ui'

const BELTS: BeltId[] = ['white', 'blue', 'purple', 'brown']
const ORDER: BeltId[] = ['white', 'blue', 'purple', 'brown', 'black']

function Tile({ earned, date, children, label }: { earned: boolean; date?: string; children: React.ReactNode; label: string }) {
  return (
    <div className={`relative border p-3 text-center ${earned ? 'border-gold/50 bg-gold/5' : 'border-ink-600 bg-ink-900'}`}>
      <div className={earned ? '' : 'opacity-25 grayscale'}>{children}</div>
      <div className={`mt-2 font-cond text-sm font-semibold uppercase tracking-wider ${earned ? 'text-bone' : 'text-smoke'}`}>{label}</div>
      <div className="num text-[10px] text-smoke">{earned ? (date ? fmtDate(date.slice(0, 10)) : 'EARNED') : 'LOCKED'}</div>
      {!earned && <Icon name="lock" size={12} className="absolute right-2 top-2 text-smoke" />}
    </div>
  )
}

export default function Badges() {
  const { awards, profile, consistency } = useApp()
  if (!awards || !profile) return null
  const byKey = new Map(awards.awards.map(a => [a.key, a]))
  const rankIdx = ORDER.indexOf(profile.belt)
  // A stripe counts as earned if the app awarded it or your current rank is already past it.
  const hasStripe = (b: BeltId, n: number) => byKey.has(`stripe:${b}-${n}`) || ORDER.indexOf(b) < rankIdx || (b === profile.belt && profile.stripes >= n)
  const hasBelt = (b: BeltId) => ORDER.indexOf(b) <= rankIdx
  const earnedCount = awards.awards.length

  const groups = [
    { title: 'Sessions logged', prefix: 'sessions', list: awards.milestones.sessions, have: consistency?.totals.sessions ?? 0, unit: '', word: 'sessions' },
    { title: 'Mat hours', prefix: 'hours', list: awards.milestones.hours, have: consistency?.totals.hours ?? 0, unit: ' h', word: 'hours' },
    { title: 'Weeks on target in a row', prefix: 'streak', list: awards.milestones.streak, have: consistency?.best_streak ?? 0, unit: ' wk', word: 'weeks' },
  ]

  return (
    <div>
      <PageHead kicker="Badges" title="Earned, not given">
        <span className="num text-sm text-ash">{earnedCount} AWARDED BY THE APP</span>
      </PageHead>

      <div className="space-y-4">
        {BELTS.map(b => {
          const next = ORDER[ORDER.indexOf(b) + 1]
          return (
            <Panel key={b} hot={b === profile.belt}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="display text-3xl">{BELT_NAMES[b]} belt</h2>
                {b === profile.belt && <span className="num bg-blood px-2 text-[10px] font-bold text-white">CURRENT</span>}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {[1, 2, 3, 4].map(n => (
                  <Tile key={n} earned={hasStripe(b, n)} date={byKey.get(`stripe:${b}-${n}`)?.earned_at} label={`Stripe ${n}`}>
                    <Belt belt={b} stripes={n} className="h-5 w-full" />
                  </Tile>
                ))}
                <Tile earned={byKey.has(`belt_ready:${next}`) || hasBelt(next)} date={byKey.get(`belt_ready:${next}`)?.earned_at} label={`${BELT_NAMES[next]}-ready`}>
                  <div className="flex h-5 items-center justify-center text-gold"><Icon name="check" size={22} /></div>
                </Tile>
                <Tile earned={hasBelt(next)} date={byKey.get(`belt:${next}`)?.earned_at} label={`${BELT_NAMES[next]} belt`}>
                  <Belt belt={next} stripes={0} className="h-5 w-full" />
                </Tile>
              </div>
            </Panel>
          )
        })}

        <Panel>
          <h2 className="display mb-3 text-3xl">Consistency</h2>
          <div className="space-y-5">
            {groups.map(g => (
              <div key={g.prefix}>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="label">{g.title}</span>
                  <span className="num text-sm text-bone-dim">now: {g.have}{g.unit}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                  {g.list.map(n => {
                    const a = byKey.get(`${g.prefix}:${n}`)
                    return (
                      <Tile key={n} earned={!!a} date={a?.earned_at} label={g.word}>
                        <div className={`display text-2xl ${a ? 'text-gold' : ''}`}>{n}</div>
                      </Tile>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
