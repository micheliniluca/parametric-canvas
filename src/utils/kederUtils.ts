import type { KederSpec, Point } from '../types'

/**
 * Membrana con keder, in sezione: la polilinea è l'asse della membrana (spessore t).
 * Alle estremità attivate la membrana fa due strati saldati (lunghezza `weld`) e avvolge il cordone
 * del keder (Ø d): l'estremità della polilinea è il centro del cordone.
 */
export const DEFAULT_KEDER: KederSpec = { d: 12, t: 1, weld: 50, start: false, end: true }
export const KEDER_DIAMETERS = [6, 8, 10, 12, 14, 16, 18, 20]

const add = (a: Point, b: Point, k = 1): Point => ({ x: a.x + b.x * k, y: a.y + b.y * k })
const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y })
const len = (v: Point) => Math.hypot(v.x, v.y)
const unit = (v: Point): Point => { const l = len(v) || 1; return { x: v.x / l, y: v.y / l } }
/** normale a sinistra (y verso il basso: ruota di -90°) */
const left = (u: Point): Point => ({ x: u.y, y: -u.x })

/** Polilinea spostata di `off` a sinistra, con giunti a spigolo vivo (limitati) */
export function offsetPolyline(pts: Point[], off: number): Point[] {
  const n = pts.length
  if (n < 2) return pts
  const out: Point[] = []
  for (let i = 0; i < n; i++) {
    const uPrev = i > 0 ? unit(sub(pts[i], pts[i - 1])) : null
    const uNext = i < n - 1 ? unit(sub(pts[i + 1], pts[i])) : null
    if (!uPrev) { out.push(add(pts[i], left(uNext!), off)); continue }
    if (!uNext) { out.push(add(pts[i], left(uPrev), off)); continue }
    const n1 = left(uPrev), n2 = left(uNext)
    const m = unit(add(n1, n2))
    // spigolo vivo: lunghezza off / cos(metà angolo), limitata a 4 volte l'offset
    const cos = m.x * n1.x + m.y * n1.y
    out.push(add(pts[i], m, off / Math.max(cos, 0.25)))
  }
  return out
}

const arc = (c: Point, r: number, a0: number, a1: number, through: number): Point[] => {
  // verso di percorrenza che passa per l'angolo `through`
  const norm = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  const ccwSpan = norm(a1 - a0)
  const ccw = norm(through - a0) <= ccwSpan
  const span = ccw ? ccwSpan : -(2 * Math.PI - ccwSpan)
  const steps = Math.max(8, Math.ceil(Math.abs(span) / (Math.PI / 24)))
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = a0 + (span * i) / steps
    return { x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) }
  })
}

export type KederDrawing = { outline: string; thin: string; cords: { c: Point; r: number }[]; pts: Point[] }

const f = (n: number) => +n.toFixed(2)
const path = (pts: Point[], close: boolean) =>
  pts.length > 1 ? `M ${pts.map(p => `${f(p.x)} ${f(p.y)}`).join(' L ')}${close ? ' Z' : ''} ` : ''
const circle = (c: Point, r: number) =>
  `M ${f(c.x - r)} ${f(c.y)} a ${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0 a ${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0 Z `

export function kederDrawing(points: Point[], k: KederSpec): KederDrawing {
  const pts = points.filter((p, i) => i === 0 || len(sub(p, points[i - 1])) > 1e-6)
  if (pts.length < 2) return { outline: '', thin: '', cords: [], pts }
  const t = Math.max(0.1, k.t)
  const Ro = k.d / 2 + t
  const s = Math.sqrt(Math.max(Ro * Ro - t * t, 0))
  const Q = [...pts]
  let thin = ''
  const cords: { c: Point; r: number }[] = []

  /** estremità con keder: C = centro del cordone, v = direzione verso l'esterno, prev = vertice precedente */
  const cap = (C: Point, prev: Point) => {
    const v = unit(sub(C, prev))
    const avail = len(sub(C, prev))
    const w = Math.max(0, Math.min(k.weld, avail - Ro - 1))
    const Ws = add(C, v, -(Ro + w))
    thin += path([Ws, add(C, v, -k.d / 2)], false)
    cords.push({ c: C, r: k.d / 2 })
    return { Ws, v }
  }
  /** contorno dell'estremità, dal lato `from` (normale) al lato opposto */
  const capPoints = (C: Point, Ws: Point, v: Point, from: Point): Point[] => {
    const to = { x: -from.x, y: -from.y }
    const J1 = add(add(C, v, -s), from, t), J2 = add(add(C, v, -s), to, t)
    const a1 = Math.atan2(J1.y - C.y, J1.x - C.x), a2 = Math.atan2(J2.y - C.y, J2.x - C.x)
    return [add(Ws, from, t), ...arc(C, Ro, a1, a2, Math.atan2(v.y, v.x)), add(Ws, to, t)]
  }

  let endCap: { Ws: Point; v: Point } | null = null
  let startCap: { Ws: Point; v: Point } | null = null
  if (k.end) { endCap = cap(pts[pts.length - 1], pts[pts.length - 2]); Q[Q.length - 1] = endCap.Ws }
  if (k.start) { startCap = cap(pts[0], pts[1]); Q[0] = startCap.Ws }

  const up = offsetPolyline(Q, t / 2)
  const lo = offsetPolyline(Q, -t / 2)
  const uEnd = unit(sub(Q[Q.length - 1], Q[Q.length - 2]))
  const uStart = unit(sub(Q[1], Q[0]))
  const contour: Point[] = [...up]
  if (endCap) contour.push(...capPoints(pts[pts.length - 1], endCap.Ws, endCap.v, left(uEnd)))
  contour.push(...[...lo].reverse())
  if (startCap) contour.push(...capPoints(pts[0], startCap.Ws, startCap.v, { x: -left(uStart).x, y: -left(uStart).y }))

  let outline = path(contour, true)
  for (const c of cords) outline += circle(c.c, c.r)
  const all = [...contour, ...cords.flatMap(c => [add(c.c, { x: Ro, y: Ro }), add(c.c, { x: -Ro, y: -Ro })])]
  return { outline, thin, cords, pts: all }
}

export const kederLabel = (k: KederSpec) =>
  `Membrana sp. ${String(k.t).replace('.', ',')} con keder Ø${k.d}`
