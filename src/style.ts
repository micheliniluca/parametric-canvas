import type { CanvasObject, StrokeDash } from './types'

/** Stile corrente applicato ai nuovi oggetti e modificabile dalla StyleBar */
export type DrawStyle = {
  stroke: string
  strokeWidth: number
  strokeDash: StrokeDash
  fillEnabled: boolean
  fillColor: string
}

export const DEFAULT_STYLE: DrawStyle = {
  stroke: '#0f172a',
  strokeWidth: 2,
  strokeDash: 'solid',
  fillEnabled: false,
  fillColor: '#bfdbfe',
}

export const STROKE_COLORS = [
  { c: '#0f172a', n: 'Nero' },
  { c: '#64748b', n: 'Grigio' },
  { c: '#dc2626', n: 'Rosso' },
  { c: '#ea580c', n: 'Arancio' },
  { c: '#ca8a04', n: 'Ocra' },
  { c: '#16a34a', n: 'Verde' },
  { c: '#2563eb', n: 'Blu' },
  { c: '#7c3aed', n: 'Viola' },
]

export const FILL_COLORS = [
  { c: '#ffffff', n: 'Bianco' },
  { c: '#e2e8f0', n: 'Grigio' },
  { c: '#fecaca', n: 'Rosso' },
  { c: '#fed7aa', n: 'Arancio' },
  { c: '#fef08a', n: 'Giallo' },
  { c: '#bbf7d0', n: 'Verde' },
  { c: '#bfdbfe', n: 'Azzurro' },
  { c: '#ddd6fe', n: 'Lilla' },
]

export const STROKE_WIDTHS = [1, 2, 3, 5]

export const dashArray = (dash: StrokeDash | undefined, sw: number): string | undefined => {
  if (dash === 'dashed') return `${sw * 4} ${sw * 3}`
  if (dash === 'dotted') return `${sw} ${sw * 2.5}`
  return undefined
}

/** Legge lo stile di un oggetto (per mostrare i valori correnti nella StyleBar) */
export const styleOf = (o: CanvasObject): Partial<DrawStyle> => ({
  stroke: o.type === 'text' ? (o.textColor || o.stroke) : o.stroke,
  strokeWidth: o.strokeWidth,
  strokeDash: o.strokeDash,
  fillEnabled: o.fillEnabled,
  fillColor: o.fillColor,
})

/** Converte una modifica di stile in patch per l'oggetto (il testo usa textColor) */
export const stylePatchFor = (o: CanvasObject, patch: Partial<DrawStyle>): Partial<CanvasObject> => {
  const out: Record<string, unknown> = { ...patch }
  if (patch.stroke && (o.type === 'text' || o.type === 'quote')) out.textColor = patch.stroke
  return out as Partial<CanvasObject>
}

/** Quali controlli di stile hanno senso per un tipo di oggetto */
export const styleCaps = (o: CanvasObject | null) => {
  if (!o) return { stroke: true, width: true, dash: true, fill: true }
  switch (o.type) {
    case 'image': return { stroke: false, width: false, dash: false, fill: false }
    case 'arrow':
    case 'quote':
    case 'bolt': return { stroke: true, width: o.type !== 'bolt', dash: o.type === 'arrow', fill: false }
    case 'text': return { stroke: true, width: false, dash: false, fill: true }
    case 'polyline': return { stroke: true, width: true, dash: true, fill: o.closed }
    default: return { stroke: true, width: true, dash: true, fill: true }
  }
}
