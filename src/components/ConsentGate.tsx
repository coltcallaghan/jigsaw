import { useState } from 'react'
import { PRIVACY_POLICY, TERMS_OF_USE } from '../legal/content'
import LegalDoc from './LegalDoc'

interface ConsentGateProps {
  onAccept: () => void
}

type Doc = 'privacy' | 'terms'

/**
 * Blocking first-run gate: the user must accept before reaching the game.
 * Declining is allowed and does NOT trap them — it shows a calm "review
 * required" state with a clear way back to the policy and the Accept button.
 */
export default function ConsentGate({ onAccept }: ConsentGateProps) {
  const [doc, setDoc] = useState<Doc>('privacy')
  const [declined, setDeclined] = useState(false)

  if (declined) {
    return (
      <div className="win-overlay" role="dialog" aria-modal="true" aria-label="Consent required">
        <div className="card consent-card" style={{ textAlign: 'center', gap: 14 }}>
          <h2 style={{ marginBottom: 4 }}>Just one step</h2>
          <p style={{ color: 'var(--text-dim)', margin: 0 }}>
            To play Jigsaw you'll need to accept the Privacy Policy and Terms of Use.
            You can review them again whenever you like.
          </p>
          <button
            className="btn btn-primary btn-lg btn-block"
            style={{ justifyContent: 'center', marginTop: 6 }}
            onClick={() => setDeclined(false)}
          >
            Review again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="win-overlay" role="dialog" aria-modal="true" aria-label="Welcome to Jigsaw">
      <div className="card consent-card">
        <h2 style={{ marginBottom: 4 }}>Welcome to Jigsaw</h2>
        <p style={{ color: 'var(--text-dim)', margin: 0 }}>
          Please review and accept our Privacy Policy and Terms of Use to continue.
        </p>

        <div className="tabs" style={{ marginTop: 14 }}>
          <button className={`tab${doc === 'privacy' ? ' active' : ''}`} onClick={() => setDoc('privacy')}>
            Privacy Policy
          </button>
          <button className={`tab${doc === 'terms' ? ' active' : ''}`} onClick={() => setDoc('terms')}>
            Terms of Use
          </button>
        </div>

        <div className="legal-scroll">
          <LegalDoc blocks={doc === 'privacy' ? PRIVACY_POLICY : TERMS_OF_USE} />
        </div>

        <button
          className="btn btn-primary btn-lg btn-block"
          style={{ justifyContent: 'center', marginTop: 14 }}
          onClick={onAccept}
        >
          Accept &amp; Play
        </button>
        <button
          className="back-link"
          style={{ marginTop: 8 }}
          onClick={() => setDeclined(true)}
        >
          Decline
        </button>
      </div>
    </div>
  )
}
