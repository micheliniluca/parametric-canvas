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
  stroke: '#000000',
  strokeWidth: 2,
  strokeDash: 'solid',
  fillEnabled: false,
  fillColor: '#c9d7f2',
}

/** Palette "Tecnica CAD": colori dei layer CAD, più grigio e viola */
export const STROKE_COLORS = [
  { c: '#000000', n: 'Nero' },
  { c: '#808080', n: 'Grigio' },
  { c: '#e10600', n: 'Rosso' },
  { c: '#ff8c00', n: 'Arancio' },
  { c: '#f5c400', n: 'Giallo' },
  { c: '#00a651', n: 'Verde' },
  { c: '#00a3e0', n: 'Ciano' },
  { c: '#0047bb', n: 'Blu' },
  { c: '#7b2fbe', n: 'Viola' },
  { c: '#c4007a', n: 'Magenta' },
]

export const FILL_COLORS = [
  { c: '#ffffff', n: 'Bianco' },
  { c: '#e6e6e6', n: 'Grigio' },
  { c: '#ffd6d4', n: 'Rosso' },
  { c: '#ffe2c2', n: 'Arancio' },
  { c: '#fff1b3', n: 'Giallo' },
  { c: '#c9f0d9', n: 'Verde' },
  { c: '#c7ecf8', n: 'Ciano' },
  { c: '#c9d7f2', n: 'Blu' },
  { c: '#e2d4f5', n: 'Viola' },
  { c: '#f5cce3', n: 'Magenta' },
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
    case 'bolt': return { stroke: true, width: true, dash: o.type === 'arrow', fill: o.type === 'bolt' }
    case 'cable': return { stroke: true, width: true, dash: false, fill: true }
    case 'text': return { stroke: true, width: false, dash: false, fill: true }
    case 'polyline': return { stroke: true, width: true, dash: true, fill: o.closed }
    default: return { stroke: true, width: true, dash: true, fill: true }
  }
}
