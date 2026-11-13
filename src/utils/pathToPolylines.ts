import type { Point } from '../types'

export type Polyline = { pts: Point[]; closed: boolean }

/** Segmenti per un giro completo di arco (gli archi più piccoli ne usano in proporzione) */
const ARC_SEGMENTS = 48
const CURVE_SEGMENTS = 16

/**
 * Converte il dato "d" di un tracciato SVG in polilinee.
 * Supporta M L H V C S Q T A Z, assoluti e relativi; archi e curve vengono suddivisi in segmenti.
 */
export function pathToPolylines(d: string): Polyline[] {
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? []
  const out: Polyline[] = []
  let cur: Polyline | null = null
  let p: Point = { x: 0, y: 0 }
  let start: Point = { x: 0, y: 0 }
  let lastCtrl: Point | null = null
  let cmd = ''
  let i = 0

  const num = () => parseFloat(tokens[i++])
  const isNum = () => i < tokens.length && !/^[A-Za-z]$/.test(tokens[i])
  const flush = () => {
    if (cur && cur.pts.length > 1) out.push(cur)
    cur = null
  }
  const lineTo = (q: Point) => {
    if (!cur) cur = { pts: [p], closed: false }
    cur.pts.push(q)
    p = q
  }

  while (i < tokens.length) {
    if (!isNum()) cmd = tokens[i++]
    const rel = cmd === cmd.toLowerCase()
    const C = cmd.toUpperCase()
    const ox = rel ? p.x : 0
    const oy = rel ? p.y : 0
    switch (C) {
      case 'M': {
        flush()
        p = { x: ox + num(), y: oy + num() }
        start = p
        cur = { pts: [p], closed: false }
        // le coppie successive a M sono L implicite
        cmd = rel ? 'l' : 'L'
        lastCtrl = null
        break
      }
      case 'L': lineTo({ x: ox + num(), y: oy + num() }); lastCtrl = null; break
      case 'H': lineTo({ x: (rel ? p.x : 0) + num(), y: p.y }); lastCtrl = null; break
      case 'V': lineTo({ x: p.x, y: (rel ? p.y : 0) + num() }); lastCtrl = null; break
      case 'C':
      case 'S': {
        const c1: Point = C === 'C'
          ? { x: ox + num(), y: oy + num() }
          : lastCtrl ? { x: 2 * p.x - lastCtrl.x, y: 2 * p.y - lastCtrl.y } : p
        const c2 = { x: ox + num(), y: oy + num() }
        const e = { x: ox + num(), y: oy + num() }
        const p0 = p
        for (let k = 1; k <= CURVE_SEGMENTS; k++) {
          const t = k / CURVE_SEGMENTS, u = 1 - t
          lineTo({
            x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * e.x,
            y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * e.y,
          })
        }
        lastCtrl = c2
        break
      }
      case 'Q':
      case 'T': {
        const c: Point = C === 'Q'
          ? { x: ox + num(), y: oy + num() }
          : lastCtrl ? { x: 2 * p.x - lastCtrl.x, y: 2 * p.y - lastCtrl.y } : p
        const e = { x: ox + num(), y: oy + num() }
        const p0 = p
        for (let k = 1; k <= CURVE_SEGMENTS; k++) {
          const t = k / CURVE_SEGMENTS, u = 1 - t
          lineTo({ x: u * u * p0.x + 2 * u * t * c.x + t * t * e.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * e.y })
        }
        lastCtrl = c
        break
      }
      case 'A': {
        const rx = num(), ry = num(), phi = num(), large = num(), sweep = num()
        const e = { x: ox + num(), y: oy + num() }
        arcPoints(p, e, rx, ry, phi, !!large, !!sweep).forEach(lineTo)
        p = e
        lastCtrl = null
        break
      }
      case 'Z': {
        if (cur) {
          const c = cur as Polyline
          const last = c.pts[c.pts.length - 1]
          if (Math.hypot(last.x - start.x, last.y - start.y) < 1e-6) c.pts.pop()
          c.closed = true
        }
        flush()
        p = start
        lastCtrl = null
        break
      }
      default:
        i++ // comando sconosciuto: si salta
    }
  }
  flush()
  return out
}

/** Arco ellittico SVG → punti (conversione al centro, specifica SVG F.6.5), escluso il punto iniziale */
function arcPoints(p1: Point, p2: Point, rx: number, ry: number, phiDeg: number, large: boolean, sweep: boolean): Point[] {
  if (rx === 0 || ry === 0 || (p1.x === p2.x && p1.y === p2.y)) return [p2]
  rx = Math.abs(rx); ry = Math.abs(ry)
  const phi = (phiDeg * Math.PI) / 180
  const cos = Math.cos(phi), sin = Math.sin(phi)
  const dx = (p1.x - p2.x) / 2, dy = (p1.y - p2.y) / 2
  const x1 = cos * dx + sin * dy
  const y1 = -sin * dx + cos * dy
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry)
  if (lambda > 1) { const s = Math.sqrt(lambda); rx *= s; ry *= s }
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1
  let co = Math.sqrt(Math.max(0, num / den))
  if (large === sweep) co = -co
  const cx1 = (co * rx * y1) / ry
  const cy1 = (-co * ry * x1) / rx
  const cx = cos * cx1 - sin * cy1 + (p1.x + p2.x) / 2
  const cy = sin * cx1 + cos * cy1 + (p1.y + p2.y) / 2
  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
    return a
  }
  const t1 = ang(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry)
  let dt = ang((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry)
  if (!sweep && dt > 0) dt -= 2 * Math.PI
  if (sweep && dt < 0) dt += 2 * Math.PI
  const n = Math.max(2, Math.ceil((Math.abs(dt) / (2 * Math.PI)) * ARC_SEGMENTS))
  const pts: Point[] = []
  for (let k = 1; k <= n; k++) {
    const t = t1 + (dt * k) / n
    const ex = rx * Math.cos(t), ey = ry * Math.sin(t)
    pts.push({ x: cos * ex - sin * ey + cx, y: sin * ex + cos * ey + cy })
  }
  pts[pts.length - 1] = p2
  return pts
}
