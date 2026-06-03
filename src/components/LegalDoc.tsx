import type { LegalBlock } from '../legal/content'

interface LegalDocProps {
  blocks: LegalBlock[]
}

/** Renders bundled legal text (no Markdown engine — simple block list). */
export default function LegalDoc({ blocks }: LegalDocProps) {
  return (
    <div className="legal-doc">
      {blocks.map((b, i) => {
        if (b.type === 'h') return <h3 key={i} className="legal-h">{b.text}</h3>
        if (b.type === 'li') return <p key={i} className="legal-li">{b.text}</p>
        return <p key={i} className="legal-p">{b.text}</p>
      })}
    </div>
  )
}
