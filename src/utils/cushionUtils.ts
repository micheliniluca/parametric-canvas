import type { CushionObject, Point } from '../types'

/**
 * Cuscino ETFE in sezione: (x1, y1)–(x2, y2) = estremità della campata L (linea di serraggio).
 * Ogni strato è un arco di cerchio per le due estremità con freccia L/n:
 * superiore L/10 verso l'alto, inferiore L/10 verso il basso; terzo strato facoltativo (intermedio) L/20 verso l'alto.
 * "Alto" = verso l'alto dello schermo (con `flip` si inverte).
 */
export const CUSHION_DEFAULT = { topN: 10, bottomN: 10, thirdN: 20 }

const f = (n: number) => +n.toFixed(2)
const path = (pts: Point[], close = false) =>
  pts.length > 1 ? `M ${pts.map(p => `${f(p.x)} ${f(p.y)}`).join(' L ')}${close ? ' Z' : ''} ` : ''

/** Normale "verso l'alto" della campata */
export function cushionFrame(o: CushionObject) {
  const dx = o.x2 - o.x1, dy = o.y2 - o.y1
  const L = Math.hypot(dx, dy) || 1
  const u = { x: dx / L, y: dy / L }
  let n = { x: u.y, y: -u.x }
  if (n.y > 1e-9 || (Math.abs(n.y) <= 1e-9 && n.x > 0)) n = { x: -n.x, y: -n.y }
  if (o.flip) n = { x: -n.x, y: -n.y }
  return { L, u, n }
}

/** Punti dell'arco per le estremità con freccia `rise` (positiva verso n) */
export function arcPoints(o: CushionObject, rise: number, steps = 48): Point[] {
  const { L, u, n } = cushionFrame(o)
  const P = (x: number, y: number): Point => ({ x: o.x1 + u.x * x + n.x * y, y: o.y1 + u.y * x + n.y * y })
  if (Math.abs(rise) < 1e-6) return [P(0, 0), P(L, 0)]
  const s = Math.abs(rise)
  const R = (L * L / 4 + s * s) / (2 * s)
  // centro sotto (o sopra) la corda, sull'asse della campata
  const cy = Math.sign(rise) * (s - R)
  const a0 = Math.atan2(0 - cy, 0 - L / 2), a1 = Math.atan2(0 - cy, L - L / 2)
  // arco minore (freccia ≤ L/2), maggiore oltre: in entrambi i casi passa per il colmo (L/2, rise)
  let span = a1 - a0
  while (span > Math.PI) span -= 2 * Math.PI
  while (span <= -Math.PI) span += 2 * Math.PI
  if (s > L / 2) span -= Math.sign(span) * 2 * Math.PI
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = a0 + (span * i) / steps
    return P(L / 2 + R * Math.cos(a), cy + R * Math.sin(a))
  })
}

export function cushionLayers(o: CushionObject) {
  const { L } = cushionFrame(o)
  const layers = [
    { key: 'top', n: o.topN, rise: L / o.topN },
    { key: 'bottom', n: o.bottomN, rise: -L / o.bottomN },
  ]
  if (o.layers === 3) layers.push({ key: 'third', n: o.thirdN, rise: L / o.thirdN })
  return layers.map(l => ({ ...l, pts: arcPoints(o, l.rise) }))
}

export function cushionDrawing(o: CushionObject) {
  const layers = cushionLayers(o)
  // contorno esterno: lo strato superiore con la freccia maggiore (il terzo può stare sopra o sotto)
  const outer = layers.filter(l => l.key !== 'bottom').reduce((a, b) => (b.rise > a.rise ? b : a))
  const bottom = layers.find(l => l.key === 'bottom')!
  let lines = ''
  for (const l of layers) lines += path(l.pts)
  // riempimento: tra lo strato esterno superiore e quello inferiore
  const fill = path([...outer.pts, ...[...bottom.pts].reverse()], true)
  const { L, u, n } = cushionFrame(o)
  const P = (x: number, y: number): Point => ({ x: o.x1 + u.x * x + n.x * y, y: o.y1 + u.y * x + n.y * y })
  const axis = path([P(-10, 0), P(L + 10, 0)]) + path([P(L / 2, bottom.rise - 10), P(L / 2, outer.rise + 10)])
  const all = layers.flatMap(l => l.pts)
  const xs = all.map(p => p.x), ys = all.map(p => p.y)
  const x0 = Math.min(...xs), y0 = Math.min(...ys)
  return { lines, fill, axis, layers, bounds: { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 } }
}

const nf = (v: number) => String(Math.round(v)).replace('.', ',')

export const cushionLabel = (o: CushionObject) => {
  const { L } = cushionFrame(o)
  const fr = `L/${o.topN} ↑ · L/${o.bottomN} ↓${o.layers === 3 ? ` · 3° strato L/${o.thirdN} ↑` : ''}`
  return `Cuscino ETFE ${o.layers} strati · L ${nf(L)} · ${fr}`
}
