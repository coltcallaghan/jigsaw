import { useState } from 'react'
import { purchaseUnlock, restorePurchases } from '../config/purchases'
import { FREE_PIECE_LIMIT } from '../config/platform'

interface UpsellModalProps {
  /** Called after a successful purchase or restore so the parent can refresh. */
  onUnlocked: () => void
  onClose: () => void
}

type Status = 'idle' | 'purchasing' | 'restoring' | 'error'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

export default function UpsellModal({ onUnlocked, onClose }: UpsellModalProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const busy = status === 'purchasing' || status === 'restoring'

  const run = async (action: () => Promise<boolean>, pending: Status) => {
    setStatus(pending)
    setError(null)
    try {
      const unlocked = await action()
      if (unlocked) {
        onUnlocked()
        return
      }
      setStatus('idle')
    } catch (err: unknown) {
      setError(getErrorMessage(err))
      setStatus('error')
    }
  }

  return (
    <div className="win-overlay" onClick={busy ? undefined : onClose}>
      <div className="card upsell-card" onClick={e => e.stopPropagation()}>
        <h2 style={{ marginBottom: 4 }}>Unlock every puzzle</h2>
        <p style={{ color: 'var(--text-dim)', margin: 0 }}>
          Free play includes puzzles up to {FREE_PIECE_LIMIT.toLocaleString()} pieces.
          A one-time purchase unlocks all sizes — right up to 10,000-piece Master.
        </p>

        {error && (
          <p style={{ color: 'var(--danger, #d9534f)', margin: 0, fontSize: '.9rem' }}>
            {error}
          </p>
        )}

        <button
          className="btn btn-primary btn-lg btn-block"
          style={{ justifyContent: 'center', marginTop: 6 }}
          disabled={busy}
          onClick={() => run(purchaseUnlock, 'purchasing')}
        >
          {status === 'purchasing' ? 'Processing…' : 'Unlock all sizes'}
        </button>

        <button
          className="btn btn-ghost btn-block"
          style={{ justifyContent: 'center' }}
          disabled={busy}
          onClick={() => run(restorePurchases, 'restoring')}
        >
          {status === 'restoring' ? 'Restoring…' : 'Restore purchase'}
        </button>

        <button className="back-link" disabled={busy} onClick={onClose}>
          Maybe later
        </button>
      </div>
    </div>
  )
}
