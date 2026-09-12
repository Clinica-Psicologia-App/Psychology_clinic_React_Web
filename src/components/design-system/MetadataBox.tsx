import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from './Button'

export function MetadataBox({ value }: { value: unknown }) {
  const text = JSON.stringify(value ?? {}, null, 2)
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="metadata-panel">
      <div className="metadata-panel-header">
        <h3>Metadados</h3>
        <Button variant="ghost" size="sm" onClick={copy}>
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copied ? 'Copiado' : 'Copiar JSON'}
        </Button>
      </div>
      <pre className="metadata-box">{text}</pre>
    </div>
  )
}
