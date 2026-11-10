import { useEffect, useRef } from 'react'
import type { CanvasObject, Point } from '../types'
import { getObjectCenter, textSize } from './geometry'

type TextObj = Extract<CanvasObject, { type: 'text' }>

type Props = {
  o: TextObj
  zoom: number
  view: Point
  onChange: (text: string) => void
  onDone: () => void
}

/**
 * Editor del testo sovrapposto alla tela, nella stessa posizione e scala dell'oggetto.
 * Invio = a capo, Ctrl+Invio / Esc / clic fuori = conferma.
 */
export function TextEditor({ o, zoom, view, onChange, onDone }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    el.select()
  }, [o.id])

  const fontSize = o.fontSize || 20
  const { w, h } = textSize({ ...o, text: o.text || 'M' })
  const c = getObjectCenter(o)
  // larghezza minima per scrivere comodamente mentre il testo è corto
  const width = Math.max(w, fontSize * 4) * zoom
  const height = h * zoom

  return (
    <textarea
      ref={ref}
      className="text-editor"
      value={o.text}
      spellCheck={false}
      onChange={e => onChange(e.target.value)}
      onBlur={onDone}
      onMouseDown={e => e.stopPropagation()}
      onKeyDown={e => {
        if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
          e.preventDefault()
          onDone()
        }
      }}
      style={{
        left: (c.x - view.x) * zoom - width / 2,
        top: (c.y - view.y) * zoom - height / 2,
        width,
        height,
        fontSize: fontSize * zoom,
        lineHeight: 1.2,
        padding: `${(o.boxPadding || 10) * zoom}px 0`,
        color: o.textColor || '#0f172a',
        transform: o.rotation ? `rotate(${o.rotation}deg)` : undefined,
      }}
    />
  )
}
