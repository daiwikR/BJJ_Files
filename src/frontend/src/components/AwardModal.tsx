import { useApp } from '../store/appStore'
import Belt from './common/Belt'
import Icon from './common/Icon'
import { Modal } from './common/ui'

const KIND_LABEL = { stripe: 'Stripe earned', belt_ready: 'Belt-ready', belt: 'Promoted', consistency: 'Milestone' }
const WEIGHT = { belt: 3, belt_ready: 2, stripe: 1, consistency: 0 }

/** Shows everything earned since you last looked: the biggest award up top, the rest listed. */
export default function AwardModal() {
  const { awards, ackAwards } = useApp()
  const unseen = awards?.unseen ?? []
  if (unseen.length === 0) return null
  const a = [...unseen].sort((x, y) => WEIGHT[y.kind] - WEIGHT[x.kind])[0]
  const rest = unseen.filter(x => x.id !== a.id)
  return (
    <Modal open onClose={ackAwards} title="New award">
      <div className="py-4 text-center">
        <div className="kicker">{KIND_LABEL[a.kind]}</div>
        {a.belt ? (
          <div className="stamp mx-auto my-6 w-72 max-w-full shadow-[0_0_60px_rgba(229,32,47,0.35)]">
            <Belt belt={a.belt} stripes={a.stripes ?? 0} className="h-12 w-full" />
          </div>
        ) : (
          <div className="stamp mx-auto my-6 flex h-28 w-28 items-center justify-center border-4 border-gold text-gold">
            <Icon name="badges" size={56} />
          </div>
        )}
        <h2 className="display text-4xl">{a.title}</h2>
        {a.detail && <p className="prose-dim mx-auto mt-3 max-w-sm text-sm">{a.detail}</p>}
        {a.kind === 'belt_ready' && (
          <p className="mx-auto mt-3 max-w-sm text-xs text-ash">Never ask for the belt. When your coach ties it on, confirm it on the Roadmap.</p>
        )}
        {rest.length > 0 && (
          <div className="mx-auto mt-5 max-w-sm border-t border-ink-600 pt-3 text-left">
            <div className="label mb-1">Also earned</div>
            <ul className="space-y-1">
              {rest.slice(0, 6).map(r => (
                <li key={r.id} className="flex items-center gap-2 font-cond text-base font-semibold uppercase tracking-wide">
                  <Icon name="badges" size={15} className="text-gold" />{r.title}
                </li>
              ))}
              {rest.length > 6 && <li className="text-xs text-ash">and {rest.length - 6} more on the Badges page</li>}
            </ul>
          </div>
        )}
        <button className="btn mt-6" onClick={ackAwards}>Oss</button>
      </div>
    </Modal>
  )
}
