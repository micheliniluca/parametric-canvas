import type { Point, ScrewObject } from '../types'

/**
 * Viti metriche, viti a testa di martello e ancoranti Hilti (disegno convenzionale della filettatura:
 * contorno al diametro nominale, linea sottile al nocciolo).
 * - vite a testa cilindrica con esagono incassato ISO 4762, svasata ISO 10642, a testa bombata ISO 7380,
 *   a testa esagonale filettata fino alla testa ISO 4017
 * - vite a testa di martello per la cava dei profili in alluminio
 * - ancorante ad espansione Hilti HSA (barra, rondella, dado, clip di espansione)
 * - ancorante pesante a manicotto Hilti HSL-G-TZ (manicotto, parte espandibile, cono)
 * Origine = faccia d'appoggio (ancoranti: superficie del calcestruzzo); la vite scende lungo +y.
 */

export const METRIC_KINDS = ['machine', 'hammer', 'anchor'] as const
export const isMetric = (o: Pick<ScrewObject, 'kind'>) => (METRIC_KINDS as readonly string[]).includes(o.kind)

type M = { p: number; s: number; k: number; m: number; dw: number; tw: number
  capDk: number; cskDk: number; btnDk: number; btnK: number; key: number; cskKey: number; btnKey: number }

/** Dimensioni nominali per diametro (passo grosso, esagono, testa ISO 4017, dado ISO 4032, rondella ISO 7089, teste a esagono incassato) */
const MET: Record<number, M> = {
  5: { p: 0.8, s: 8, k: 3.5, m: 4.7, dw: 10, tw: 1, capDk: 8.5, cskDk: 10, btnDk: 9.5, btnK: 2.75, key: 4, cskKey: 3, btnKey: 3 },
  6: { p: 1, s: 10, k: 4, m: 5.2, dw: 12, tw: 1.6, capDk: 10, cskDk: 12, btnDk: 10.5, btnK: 3.3, key: 5, cskKey: 4, btnKey: 4 },
  8: { p: 1.25, s: 13, k: 5.3, m: 6.8, dw: 16, tw: 1.6, capDk: 13, cskDk: 16, btnDk: 14, btnK: 4.4, key: 6, cskKey: 5, btnKey: 5 },
  10: { p: 1.5, s: 16, k: 6.4, m: 8.4, dw: 20, tw: 2, capDk: 16, cskDk: 20, btnDk: 17.5, btnK: 5.5, key: 8, cskKey: 6, btnKey: 6 },
  12: { p: 1.75, s: 18, k: 7.5, m: 10.8, dw: 24, tw: 2.5, capDk: 18, cskDk: 24, btnDk: 21, btnK: 6.6, key: 10, cskKey: 8, btnKey: 8 },
  14: { p: 2, s: 21, k: 8.8, m: 12.8, dw: 28, tw: 2.5, capDk: 21, cskDk: 27, btnDk: 24.5, btnK: 7.7, key: 12, cskKey: 10, btnKey: 10 },
  16: { p: 2, s: 24, k: 10, m: 14.8, dw: 30, tw: 3, capDk: 24, cskDk: 30, btnDk: 28, btnK: 8.8, key: 14, cskKey: 10, btnKey: 10 },
}
export const met = (d: number): M => MET[d] ?? MET[10]

/** Manicotto HSL-G-TZ: diametro esterno (= foro) per filetto */
const HSL_SLEEVE: Record<number, number> = { 8: 12, 10: 15, 12: 18, 16: 24 }

/** Testa della vite metrica / ancorante: diametro, altezza, chiave (per il pannello) */
export function metricHead(o: ScrewObject): { dk: number; k: number; s?: number; dc?: number } {
  const t = met(o.diameter), d = o.diameter
  switch (o.head) {
    case 'socketCap': return { dk: t.capDk, k: d, s: t.key }
    case 'socketCsk': return { dk: t.cskDk, k: (t.cskDk - d) / 2, s: t.cskKey }
    case 'button': return { dk: t.btnDk, k: t.btnK, s: t.btnKey }
    case 'hammer': return { dk: hammerB(d), k: hammerK(d) }
    case 'hsa': case 'hsl': return { dk: t.s / Math.cos(Math.PI / 6), k: t.m, s: t.s, dc: t.dw }
    default: return { dk: t.s / Math.cos(Math.PI / 6), k: t.k, s: t.s }
  }
}
const hammerB = (d: number) => +(d * 2.2).toFixed(1)
const hammerW = (d: number) => +(d * 1.1).toFixed(1)
const hammerK = (d: number) => +(d * 0.65).toFixed(1)

const f = (n: number) => +n.toFixed(2)
const poly = (pts: Point[], close = false) => (pts.length > 1 ? `M ${pts.map(q => `${f(q.x)} ${f(q.y)}`).join(' L ')}${close ? ' Z' : ''} ` : '')
const circle = (cx: number, cy: number, r: number) =>
  `M ${f(cx - r)} ${f(cy)} a ${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0 a ${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0 Z `
const hexagon = (cx: number, cy: number, s: number, flatTop = false) => {
  const R = s / Math.sqrt(3)
  return poly(Array.from({ length: 6 }, (_, i) => {
    const a = (flatTop ? 0 : Math.PI / 6) + (i * Math.PI) / 3
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }
  }), true)
}

export function metricDrawing(o: ScrewObject) {
  const d = o.diameter, t = met(d)
  const P = (x: number, y: number): Point => ({ x: o.x + x, y: o.y + y })
  let outline = '', thin = '', axis = ''
  const core = d - 1.227 * t.p
  const tfix = o.fixture ?? 10

  if (o.view === 'head') {
    let R = d / 2
    if (o.head === 'hammer') {
      const b = hammerB(d) / 2, w = hammerW(d) / 2
      outline += poly([P(-b, -w), P(b, -w), P(b, w), P(-b, w)], true)
      thin += circle(o.x, o.y, d / 2)
      R = b
    } else if (o.head === 'hsa' || o.head === 'hsl') {
      outline += circle(o.x, o.y, t.dw / 2) + hexagon(o.x, o.y, t.s)
      outline += circle(o.x, o.y, d / 2)
      thin += circle(o.x, o.y, core / 2)
      R = t.dw / 2
    } else if (o.head === 'hex') {
      outline += hexagon(o.x, o.y, t.s)
      thin += circle(o.x, o.y, t.s * 0.48)
      R = t.s / Math.sqrt(3)
    } else {
      const h = metricHead(o)
      outline += circle(o.x, o.y, h.dk / 2)
      // esagono incassato
      outline += hexagon(o.x, o.y, h.s ?? t.key, true)
      R = h.dk / 2
    }
    axis = poly([P(-R - 3, 0), P(R + 3, 0)]) + poly([P(0, -R - 3), P(0, R + 3)])
    return { outline, thin, axis, bounds: { x: o.x - R, y: o.y - R, w: 2 * R, h: 2 * R } }
  }

  /** barra filettata da ya a yb: contorno al diametro nominale, nocciolo sottile, smusso in fondo */
  const rod = (ya: number, yb: number, chamferTop = false, chamferEnd = true) => {
    const r = d / 2, c = Math.min(t.p * 0.8, (yb - ya) / 3)
    const pts = [
      chamferTop ? P(-r + c, ya) : P(-r, ya), chamferTop ? P(r - c, ya) : P(r, ya),
      ...(chamferTop ? [P(r, ya + c)] : []),
      ...(chamferEnd ? [P(r, yb - c), P(r - c, yb), P(-r + c, yb), P(-r, yb - c)] : [P(r, yb), P(-r, yb)]),
      ...(chamferTop ? [P(-r, ya + c)] : []),
    ]
    outline += poly(pts, true)
    thin += poly([P(core / 2, ya + (chamferTop ? c : 0)), P(core / 2, yb - (chamferEnd ? c : 0))])
      + poly([P(-core / 2, ya + (chamferTop ? c : 0)), P(-core / 2, yb - (chamferEnd ? c : 0))])
  }
  /** esagono visto di spigolo, da yb (sotto) a yb - k */
  const hexSide = (yb: number, k: number, s: number) => {
    const e = s / Math.cos(Math.PI / 6) / 2, c = k * 0.15
    outline += poly([P(-e, yb), P(-e, yb - k + c), P(-e + c, yb - k), P(e - c, yb - k), P(e, yb - k + c), P(e, yb - c), P(e - c, yb), P(-e + c, yb), P(-e, yb - c)], true)
    thin += poly([P(-s / 2, yb), P(-s / 2, yb - k)]) + poly([P(s / 2, yb), P(s / 2, yb - k)])
  }

  let top = 0, bottom = o.length, W = d
  if (o.kind === 'anchor') {
    const yNut = -tfix - t.tw
    // rondella e dado sopra il pezzo fissato
    outline += poly([P(-t.dw / 2, -tfix - t.tw), P(t.dw / 2, -tfix - t.tw), P(t.dw / 2, -tfix), P(-t.dw / 2, -tfix)], true)
    hexSide(yNut, t.m, t.s)
    top = yNut - t.m - d * 0.4
    bottom = top + o.length
    W = Math.max(t.dw, t.s / Math.cos(Math.PI / 6))
    if (o.head === 'hsl') {
      const ds = HSL_SLEEVE[d] ?? d * 1.5
      const cone = ds * 1.1
      const yCone = bottom - cone
      const yExp = yCone - ds * 1.6
      // barra sopra il dado, manicotto dal pezzo fissato al cono, parte espandibile con tagli, cono
      rod(top, yNut - t.m, true, false)
      outline += poly([P(-ds / 2, -tfix), P(ds / 2, -tfix), P(ds / 2, yExp), P(-ds / 2, yExp)], true)
      outline += poly([P(-ds / 2, yExp), P(ds / 2, yExp), P(ds / 2 * 1.04, yCone), P(-ds / 2 * 1.04, yCone)], true)
      for (const x of [-ds / 4, ds / 4]) thin += poly([P(x, yExp + ds * 0.15), P(x, yCone - ds * 0.1)])
      outline += poly([P(-ds * 0.32, yCone), P(ds * 0.32, yCone), P(ds / 2, bottom), P(-ds / 2, bottom)], true)
      // barra interna (nascosta): solo il nocciolo
      thin += poly([P(-d / 2, yNut), P(-d / 2, yCone)]) + poly([P(d / 2, yNut), P(d / 2, yCone)])
      W = Math.max(W, ds)
    } else {
      // HSA: barra filettata, cono di espansione in fondo, clip
      const cone = d * 1.5
      const yCone = bottom - cone
      rod(top, yCone - d * 0.2, true, false)
      outline += poly([P(-d * 0.36, yCone - d * 0.2), P(d * 0.36, yCone - d * 0.2), P(d * 0.36, yCone), P(d / 2, bottom), P(-d / 2, bottom), P(-d * 0.36, yCone)], true)
      // clip di espansione attorno al cono
      const yc0 = yCone - d * 0.9, yc1 = bottom - d * 0.35
      outline += poly([P(-d * 0.6, yc0), P(-d * 0.42, yc0), P(-d * 0.5, yc1), P(-d * 0.62, yc1)], true)
      outline += poly([P(d * 0.6, yc0), P(d * 0.42, yc0), P(d * 0.5, yc1), P(d * 0.62, yc1)], true)
    }
    // superficie del calcestruzzo (asse) e pezzo fissato: linee sottili di riferimento
    thin += poly([P(-W * 0.9, 0), P(-W * 0.6, 0)]) + poly([P(W * 0.6, 0), P(W * 0.9, 0)])
  } else {
    const h = metricHead(o)
    let y0 = 0
    if (o.head === 'socketCap') {
      const r = h.dk / 2, c = h.k * 0.08
      outline += poly([P(-r, 0), P(-r, -h.k + c), P(-r + c, -h.k), P(r - c, -h.k), P(r, -h.k + c), P(r, 0)], true)
      // incasso esagonale (nascosto)
      const ks = (h.s ?? t.key) / 2
      thin += poly([P(-ks, -h.k), P(-ks, -h.k * 0.4), P(0, -h.k * 0.25), P(ks, -h.k * 0.4), P(ks, -h.k)])
      top = -h.k
    } else if (o.head === 'socketCsk') {
      outline += poly([P(-h.dk / 2, 0), P(h.dk / 2, 0), P(d / 2, h.k), P(-d / 2, h.k)], true)
      const ks = (h.s ?? t.cskKey) / 2
      thin += poly([P(-ks, 0), P(-ks, h.k * 0.7), P(0, h.k * 0.9), P(ks, h.k * 0.7), P(ks, 0)])
      y0 = h.k
    } else if (o.head === 'button') {
      const r = h.dk / 2, k = h.k
      const pts: Point[] = [P(-r, 0), P(-r, -k * 0.25)]
      for (let i = 1; i < 12; i++) {
        const a = Math.PI - (i * Math.PI) / 12
        pts.push(P(r * Math.cos(a), -k * 0.25 - k * 0.75 * Math.sin(a)))
      }
      pts.push(P(r, -k * 0.25), P(r, 0))
      outline += poly(pts, true)
      const ks = (h.s ?? t.btnKey) / 2
      thin += poly([P(-ks, -k), P(-ks, -k * 0.35), P(0, -k * 0.2), P(ks, -k * 0.35), P(ks, -k)])
      top = -k
    } else if (o.head === 'hammer') {
      const b = hammerB(d) / 2, k = h.k
      outline += poly([P(-b, 0), P(-b, -k * 0.6), P(-b * 0.8, -k), P(b * 0.8, -k), P(b, -k * 0.6), P(b, 0)], true)
      top = -k
    } else {
      hexSide(0, h.k, h.s ?? t.s)
      top = -h.k
    }
    rod(y0, o.length, false, true)
    bottom = o.length
    W = Math.max(h.dk, d)
  }
  axis = poly([P(0, top - 3), P(0, bottom + 3)])
  return { outline, thin, axis, bounds: { x: o.x - W / 2, y: o.y + top, w: W, h: bottom - top } }
}

const nf = (n: number) => String(+n.toFixed(1)).replace('.', ',')

export function metricLabel(o: ScrewObject): string {
  const d = o.diameter
  if (o.kind === 'anchor') {
    const name = o.head === 'hsl' ? 'Hilti HSL-G-TZ' : 'Hilti HSA'
    return `Ancorante ${name} M${d}×${nf(o.length)} · fissaggio ${nf(o.fixture ?? 10)}`
  }
  if (o.kind === 'hammer') return `Vite a testa di martello M${d}×${nf(o.length)}`
  const std = o.head === 'socketCap' ? 'ISO 4762' : o.head === 'socketCsk' ? 'ISO 10642' : o.head === 'button' ? 'ISO 7380' : 'ISO 4017'
  return `Vite M${d}×${nf(o.length)} ${std}`
}

/** passo e nocciolo, per il pannello */
export const metricThread = (d: number) => {
  const t = met(d)
  return { p: t.p, core: +(d - 1.227 * t.p).toFixed(2) }
}
