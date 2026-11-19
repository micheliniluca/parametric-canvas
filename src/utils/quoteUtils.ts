import type { Point, QuoteObject } from '../types'

/**
 * Terminali della quota alle due estremità della linea di misura:
 * frecce piene rivolte verso le linee di riferimento (predefinite) oppure trattini obliqui a 45°.
 */
export const quoteTerminals = (o: QuoteObject): { arrows: Point[][]; ticks: [Point, Point][] } => {
  const sw = o.strokeWidth ?? 1
  const L = Math.hypot(o.x2 - o.x1, o.y2 - o.y1)
  if (L === 0) return { arrows: [], ticks: [] }
  const u = { x: (o.x2 - o.x1) / L, y: (o.y2 - o.y1) / L }
  const n = { x: -u.y, y: u.x }
  const ends: [Point, number][] = [[{ x: o.x1, y: o.y1 }, 1], [{ x: o.x2, y: o.y2 }, -1]]
  if ((o.ends ?? 'arrow') === 'tick') {
    // trattino a 45° rispetto alla linea, centrato sull'estremità
    const t = 4 + sw * 1.5
    const d = { x: (u.x + n.x) * Math.SQRT1_2 * t, y: (u.y + n.y) * Math.SQRT1_2 * t }
    return { arrows: [], ticks: ends.map(([p]) => [{ x: p.x - d.x, y: p.y - d.y }, { x: p.x + d.x, y: p.y + d.y }]) }
  }
  // freccia lunga al massimo un terzo della quota, così le quote corte restano leggibili
  const len = Math.min(8 + sw * 2, L / 3)
  const hw = len * 0.28
  return {
    ticks: [],
    arrows: ends.map(([p, s]) => {
      const b = { x: p.x + u.x * len * s, y: p.y + u.y * len * s }
      return [p, { x: b.x + n.x * hw, y: b.y + n.y * hw }, { x: b.x - n.x * hw, y: b.y - n.y * hw }]
    }),
  }
}
