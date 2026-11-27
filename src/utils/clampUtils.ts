import type { ClampObject, Point } from '../types'
import { met } from './screwMetric'

/**
 * Morsetto radiale per fune, in pianta: due piatti piegati a U attorno alla fune, serrati da un bullone.
 * (x1, y1) = asse del bullone, (x2, y2) = asse della fune: L è la loro distanza.
 * Spessori e interasse dei piatti al bullone ricavati dal diametro della fune (proporzioni dei dettagli Maffeis).
 */
export const CLAMP_PLATES = [3, 4, 5, 6, 8, 10]
export const CLAMP_BOLTS = [10, 12, 16, 20, 24]

const f = (n: number) => +n.toFixed(2)
const path = (pts: Point[], close = false) =>
  pts.length > 1 ? `M ${pts.map(p => `${f(p.x)} ${f(p.y)}`).join(' L ')}${close ? ' Z' : ''} ` : ''

/** Materiali del morsetto (layer del DXF) */
export type ClampMaterial = 'steel' | 'alu' | 'other' | 'bolt' | 'fabric' | 'cable'

/** Spessore della guaina/inserto tra fune e piatti */
export const clampLiner = (D: number) => Math.max(2, Math.round(D * 0.05 * 2) / 2)

export function clampDims(o: ClampObject) {
  const D = o.cableD, R = D / 2, ti = clampLiner(D), t = o.plate, d = o.bolt
  const Rl = R + ti + t / 2
  const g = Math.max(1.6 * d, 0.7 * 2 * (R + ti))
  const e = 1.6 * d
  const Lmin = e + Rl + t + 2
  return { D, R, ti, t, d, Rl, g, e, Lmin, L: Math.hypot(o.x2 - o.x1, o.y2 - o.y1) }
}

/**
 * Ganasce in alluminio al bullone (proporzioni del dettaglio Maffeis): spessore = metà dell'interasse dei piatti,
 * scanalatura per il keder dietro al bullone, naso arrotondato.
 */
export function clampJaws(K: ReturnType<typeof clampDims>, kederD: number) {
  const tj = K.g / 2
  const rg = kederD / 2 + 1
  const xg = -(K.d / 2 + rg + Math.max(3, kederD * 0.3))
  return { tj, rg, xg, xl: xg - rg - tj * 0.9, xr: K.e }
}

/** Disegno in coordinate mondo */
export function clampDrawing(o: ClampObject) {
  const K = clampDims(o)
  const L = Math.max(K.L, K.Lmin)
  const dx = o.x2 - o.x1, dy = o.y2 - o.y1, l = Math.hypot(dx, dy) || 1
  const u = { x: dx / l, y: dy / l }, n = { x: -u.y, y: u.x }
  const W = (x: number, y: number): Point => ({ x: o.x1 + u.x * x + n.x * y, y: o.y1 + u.y * x + n.y * y })
  const Wp = (p: Point) => W(p.x, p.y)
  let outline = '', thin = '', axis = ''
  const all: Point[] = []
  /** materiale corrente: serve al DXF per mettere ogni parte sul suo layer */
  let mat: ClampMaterial = 'steel'
  const byMat: Record<ClampMaterial, { outline: string; thin: string }> = {
    steel: { outline: '', thin: '' }, alu: { outline: '', thin: '' }, other: { outline: '', thin: '' },
    bolt: { outline: '', thin: '' }, fabric: { outline: '', thin: '' }, cable: { outline: '', thin: '' },
  }
  const add = (pts: Point[], close = true, into: 'outline' | 'thin' = 'outline') => {
    byMat[mat][into] += path(pts.map(Wp), close)
    const s = path(pts.map(Wp), close)
    if (into === 'outline') outline += s; else thin += s
    all.push(...pts.map(Wp))
  }

  const { R, ti, t, d, Rl, g, e } = K
  const h = g / 2 + t / 2
  // tangente dal tratto piano (e, -h) al cerchio dei piatti, lato superiore
  const A = { x: e, y: -h }
  const dd = Math.hypot(A.x - L, A.y)
  const phi = Math.atan2(A.y, A.x - L)
  const beta = Math.acos(Math.min(1, Rl / dd))
  const c1 = phi + beta, c2 = phi - beta
  const th = Math.sin(c1) < Math.sin(c2) ? c1 : c2
  const thN = Math.atan2(Math.sin(th), Math.cos(th)) // in (-π, 0)
  const arcPts = (r: number, a0: number, a1: number) => {
    const steps = Math.max(12, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 36)))
    return Array.from({ length: steps + 1 }, (_, i) => {
      const a = a0 + ((a1 - a0) * i) / steps
      return { x: L + r * Math.cos(a), y: r * Math.sin(a) }
    })
  }
  // piatto a U: asse da (-e, -h) attorno alla fune fino a (-e, h), poi spessore ±t/2
  const strap = (off: number) => {
    const r = Rl + off
    // off > 0: faccia esterna (lontana dall'asse), off < 0: faccia interna
    const yt = -(h + off), yb = h + off
    const T1 = { x: L + r * Math.cos(thN), y: r * Math.sin(thN) }
    return [{ x: -e, y: yt }, { x: e, y: yt }, T1, ...arcPts(r, thN, -thN).slice(1, -1), { x: T1.x, y: -T1.y }, { x: e, y: yb }, { x: -e, y: yb }]
  }
  const outer = strap(t / 2), inner = strap(-t / 2)
  add([...outer, ...inner.reverse()])

  // guaina / inserto attorno alla fune
  const lin = [...arcPts(R + ti, thN, -thN), ...arcPts(R, -thN, thN)]
  mat = 'other'
  add(lin)

  // fune
  mat = 'cable'
  if (o.showCable !== false) {
    const c = arcPts(R, 0, 2 * Math.PI)
    add(c.slice(0, -1))
  }

  mat = 'bolt'
  // bullone: asse lungo n; testa sopra il piatto superiore, dado sotto quello inferiore
  const m = met(d)
  const face = g / 2 + t
  const eh = m.s / Math.cos(Math.PI / 6) / 2
  const hex = (yb: number, k: number, dir: 1 | -1) => {
    // esagono visto di spigolo: dalla faccia d'appoggio yb verso l'esterno (dir)
    const c = k * 0.15
    add([{ x: -eh, y: yb }, { x: -eh, y: yb + dir * (k - c) }, { x: -eh + c, y: yb + dir * k }, { x: eh - c, y: yb + dir * k }, { x: eh, y: yb + dir * (k - c) }, { x: eh, y: yb }])
    add([{ x: -m.s / 2, y: yb }, { x: -m.s / 2, y: yb + dir * k }], false, 'thin')
    add([{ x: m.s / 2, y: yb }, { x: m.s / 2, y: yb + dir * k }], false, 'thin')
  }
  const washer = (yb: number, dir: 1 | -1) => add([{ x: -m.dw / 2, y: yb }, { x: m.dw / 2, y: yb }, { x: m.dw / 2, y: yb + dir * m.tw }, { x: -m.dw / 2, y: yb + dir * m.tw }])
  washer(-face, -1)
  hex(-face - m.tw, m.k, -1)
  washer(face, 1)
  hex(face + m.tw, m.m, 1)
  // due piatti (ganasce) in alluminio tra i piatti d'acciaio: naso arrotondato verso l'esterno,
  // scanalatura per il keder e fessura per la membrana sull'asse
  const J = clampJaws(K, o.kederD ?? 12)
  const tm = 1 // spessore della membrana stretta tra le ganasce
  const jaw = (s: 1 | -1) => {
    const yo = s * (g / 2), yi = s * (tm / 2), rr = Math.min(3, J.tj * 0.2)
    const pts: Point[] = []
    // lato esterno (contro il piatto d'acciaio), da destra verso il naso
    pts.push({ x: J.xr - rr, y: yo }, { x: J.xl + J.tj / 2, y: yo })
    // naso: semicerchio dal lato esterno all'asse
    const cy = (yo + yi) / 2, rn = Math.abs(yo - yi) / 2
    for (let i = 1; i < 12; i++) {
      const a = (i * Math.PI) / 12
      pts.push({ x: J.xl + J.tj / 2 - rn * Math.sin(a), y: cy + s * rn * Math.cos(a) })
    }
    pts.push({ x: J.xl + J.tj / 2, y: yi }, { x: J.xg - J.rg, y: yi })
    // scanalatura del keder
    for (let i = 1; i < 12; i++) {
      const a = Math.PI - (i * Math.PI) / 12
      pts.push({ x: J.xg + J.rg * Math.cos(a), y: s * J.rg * Math.sin(a) })
    }
    pts.push({ x: J.xg + J.rg, y: yi }, { x: J.xr, y: yi }, { x: J.xr, y: yo - s * rr })
    add(pts)
  }
  mat = 'alu'
  jaw(-1)
  jaw(1)
  mat = 'fabric'
  if (o.showMembrane !== false) {
    // membrana che entra tra le ganasce e avvolge il keder, con il lembo fino al bullone
    const xm = J.xl - Math.max(30, J.tj * 2)
    const rk = (o.kederD ?? 12) / 2
    const ang = Math.asin(Math.min(1, (tm / 2) / J.rg))
    const wrap = Array.from({ length: 25 }, (_, i) => {
      const a = Math.PI + ang + (i * (2 * Math.PI - 2 * ang)) / 24
      return { x: J.xg + J.rg * Math.cos(a), y: J.rg * Math.sin(a) }
    })
    add([{ x: xm, y: -tm / 2 }, ...wrap, { x: xm, y: tm / 2 }], false)
    add(Array.from({ length: 36 }, (_, i) => ({ x: J.xg + rk * Math.cos((i * Math.PI) / 18), y: rk * Math.sin((i * Math.PI) / 18) })))
    add([{ x: J.xg + J.rg, y: 0 }, { x: J.xr * 0.6, y: 0 }], false, 'thin')
  }
  mat = 'bolt'
  // gambo del bullone attraverso le ganasce (linee sottili)
  add([{ x: -d / 2, y: -g / 2 }, { x: -d / 2, y: g / 2 }], false, 'thin')
  add([{ x: d / 2, y: -g / 2 }, { x: d / 2, y: g / 2 }], false, 'thin')
  const yn = face + m.tw + m.m, pr = Math.max(m.p * 2, d * 0.5), ch = m.p * 0.6
  add([{ x: -d / 2, y: yn }, { x: d / 2, y: yn }, { x: d / 2, y: yn + pr - ch }, { x: d / 2 - ch, y: yn + pr }, { x: -d / 2 + ch, y: yn + pr }, { x: -d / 2, y: yn + pr - ch }])
  const core = d - 1.227 * m.p
  add([{ x: -core / 2, y: yn }, { x: -core / 2, y: yn + pr - ch }], false, 'thin')
  add([{ x: core / 2, y: yn }, { x: core / 2, y: yn + pr - ch }], false, 'thin')

  // assi: bullone e fune
  const ax = (pts: Point[]) => { axis += path(pts.map(Wp)) }
  const top = -face - m.tw - m.k - 4
  ax([{ x: 0, y: top }, { x: 0, y: yn + pr + 4 }])
  ax([{ x: -e - 4, y: 0 }, { x: L + Rl + t + 4, y: 0 }])
  ax([{ x: L, y: -R - ti - t - 4 }, { x: L, y: R + ti + t + 4 }])

  const xs = all.map(p => p.x), ys = all.map(p => p.y)
  const x0 = Math.min(...xs), y0 = Math.min(...ys)
  return { outline, thin, axis, byMat, bounds: { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 } }
}

const nf = (n: number) => String(+n.toFixed(1)).replace('.', ',')

export const clampLabel = (o: ClampObject) =>
  `Morsetto radiale fune Ø${nf(o.cableD)} · L ${nf(clampDims(o).L)} · piatti sp. ${nf(o.plate)} · M${o.bolt}`
