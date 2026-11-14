import { useEffect } from 'react'
import { useApp, Tab } from './store/appStore'
import Icon from './components/common/Icon'
import Belt from './components/common/Belt'
import ProfileForm from './components/ProfileForm'
import AwardModal from './components/AwardModal'
import Dashboard from './pages/Dashboard'
import RoadmapPage from './pages/Roadmap'
import Train from './pages/Train'
import Recovery from './pages/Recovery'
import Fuel from './pages/Fuel'
import Techniques from './pages/Techniques'
import Badges from './pages/Badges'
import { BELT_NAMES, ZONE_COLORS } from './types'

const NAV: { id: Tab; label: string; icon: string; short?: string }[] = [
  { id: 'dojo', label: 'Dojo', icon: 'dojo' },
  { id: 'roadmap', label: 'Roadmap', icon: 'roadmap' },
  { id: 'train', label: 'Train', icon: 'train' },
  { id: 'recovery', label: 'Recovery', icon: 'recovery', short: 'Recover' },
  { id: 'fuel', label: 'Fuel', icon: 'fuel' },
  { id: 'techniques', label: 'Techniques', icon: 'techniques', short: 'Tech' },
  { id: 'badges', label: 'Badges', icon: 'badges' },
]

const PAGES: Record<Tab, () => JSX.Element | null> = {
  dojo: Dashboard, roadmap: RoadmapPage, train: Train, recovery: Recovery, fuel: Fuel, techniques: Techniques, badges: Badges,
}

function Wordmark() {
  return (
    <div className="flex items-end gap-2">
      <span className="display text-4xl leading-none">OSS<span className="text-blood">/</span></span>
      <span className="label mb-1 leading-tight">BJJ<br />Progress</span>
    </div>
  )
}

export default function App() {
  const { booted, offline, tab, setTab, profile, readiness, boot, showProfile, openProfile, consistency } = useApp()

  useEffect(() => { boot() }, [boot])

  if (!booted) {
    return <div className="flex h-full items-center justify-center"><span className="display animate-pulse text-5xl">OSS<span className="text-blood">/</span></span></div>
  }

  if (offline && !profile) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="panel panel-hot max-w-md">
          <div className="kicker">No signal</div>
          <h1 className="display mb-2 text-4xl">Backend is down</h1>
          <p className="prose-dim text-sm">Start the API and reload:</p>
          <pre className="num mt-3 overflow-x-auto bg-ink-950 p-3 text-xs text-bone">bash scripts/start.sh</pre>
        </div>
      </div>
    )
  }

  if (!profile) return <ProfileForm mode="onboard" />

  const Page = PAGES[tab]
  const zone = readiness?.zone

  return (
    <div className="flex min-h-full">
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-ink-600 bg-ink-950/80 lg:flex">
        <div className="px-5 pb-4 pt-6"><Wordmark /></div>
        <div className="tape" />
        <nav className="flex-1 overflow-y-auto py-4" aria-label="Main">
          {NAV.map((n, i) => {
            const on = tab === n.id
            return (
              <button key={n.id} onClick={() => setTab(n.id)} aria-current={on ? 'page' : undefined}
                className={`group relative flex w-full items-center gap-3 px-5 py-3 text-left transition-colors ${on ? 'bg-ink-800 text-bone' : 'text-ash hover:bg-ink-850 hover:text-bone'}`}>
                {on && <span className="absolute inset-y-0 left-0 w-1 bg-blood" />}
                <span className={`num text-[10px] ${on ? 'text-blood' : 'text-smoke'}`}>0{i + 1}</span>
                <Icon name={n.icon} className={on ? 'text-blood' : ''} />
                <span className="font-cond text-lg font-semibold uppercase tracking-[0.14em]">{n.label}</span>
                {n.id === 'recovery' && zone && <span className="ml-auto h-2 w-2" style={{ background: ZONE_COLORS[zone.key] }} />}
              </button>
            )
          })}
        </nav>
        <button onClick={() => openProfile(true)} className="border-t border-ink-600 px-5 py-4 text-left hover:bg-ink-850">
          <Belt belt={profile.belt} stripes={profile.stripes} className="mb-2 h-4 w-full" />
          <div className="flex items-center justify-between">
            <div>
              <div className="font-cond text-base font-semibold uppercase tracking-wider">{profile.name || 'Athlete'}</div>
              <div className="label">{BELT_NAMES[profile.belt]} · {profile.stripes} stripe{profile.stripes === 1 ? '' : 's'}</div>
            </div>
            <Icon name="profile" className="text-ash" />
          </div>
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-ink-600 bg-ink-950/95 px-4 py-2.5 backdrop-blur lg:hidden">
          <Wordmark />
          <div className="flex items-center gap-3">
            {consistency && consistency.streak > 0 && (
              <span className="num flex items-center gap-1 text-sm font-bold text-gold"><Icon name="flame" size={15} />{consistency.streak}</span>
            )}
            <button onClick={() => openProfile(true)} aria-label="Profile" className="flex items-center gap-2 text-ash hover:text-bone">
              <Belt belt={profile.belt} stripes={profile.stripes} className="h-3.5 w-20" />
              <Icon name="profile" />
            </button>
          </div>
        </header>

        {offline && (
          <div className="bg-blood-deep px-4 py-2 text-center text-xs text-white">Lost contact with the backend. Changes are not being saved.</div>
        )}

        <main className={tab === 'techniques' ? 'flex-1' : 'mx-auto w-full max-w-[1180px] flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-9'}>
          <Page />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-ink-600 bg-ink-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Main">
        {NAV.map(n => {
          const on = tab === n.id
          return (
            <button key={n.id} onClick={() => setTab(n.id)} aria-current={on ? 'page' : undefined}
              className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 px-0.5 py-2 ${on ? 'text-bone' : 'text-ash'}`}>
              {on && <span className="absolute inset-x-3 top-0 h-0.5 bg-blood" />}
              <Icon name={n.icon} size={20} className={on ? 'text-blood' : ''} />
              <span className="font-cond text-[10px] font-semibold uppercase tracking-wide">{n.short ?? n.label}</span>
            </button>
          )
        })}
      </nav>

      {showProfile && <ProfileForm mode="edit" />}
      <AwardModal />
    </div>
  )
}
