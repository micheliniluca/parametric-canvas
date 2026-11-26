import type { Point, ScrewObject } from '../types'
import { isMetric, metricDrawing, metricHead, metricLabel, metricThread } from './screwMetric'

/**
 * Viti per acciaio, lamiera, legno, cartongesso, Aquapanel e calcestruzzo.
 * Dimensioni dalle norme (valori nominali, indicativi per il disegno):
 * - autoperforanti ISO 15480 (esagonale flangiata), ISO 15481 (bombata), ISO 15482 (svasata)
 * - autofilettanti ISO 1479 (esagonale), ISO 7049 (bombata), ISO 7050 (svasata)
 * - viti per legno EN 14592 (svasata, filetto parziale), tirafondi DIN 571
 * - viti per cartongesso (testa a trombetta, fosfatate), Aquapanel Maxi Screw (HS / TEKS)
 * - viti per calcestruzzo (esagonale flangiata)
 * Origine dell'oggetto = centro della superficie d'appoggio (faccia del materiale);
 * la vite scende lungo +y locale, la testa sporge sopra (svasate e a trombetta a filo).
 */

export type ScrewHead = ScrewObject['head']
export type ScrewPoint = ScrewObject['point']

type HeadDims = { dk: number; k: number; s?: number; dc?: number }

/** Viti a lamiera ST (ISO 1478): passo, nucleo, teste esagonale flangiata / bombata / svasata */
const ST: Record<number, { p: number; core: number; hexWasher: HeadDims; hex: HeadDims; pan: HeadDims; countersunk: HeadDims }> = {
  2.9: { p: 1.1, core: 2.1, hexWasher: { s: 5, k: 2.8, dk: 5, dc: 6.3 }, hex: { s: 5, k: 2.3, dk: 5 }, pan: { dk: 5.6, k: 2.4 }, countersunk: { dk: 5.5, k: 1.7 } },
  3.5: { p: 1.3, core: 2.6, hexWasher: { s: 5.5, k: 3.4, dk: 5.5, dc: 8.3 }, hex: { s: 5.5, k: 2.6, dk: 5.5 }, pan: { dk: 7, k: 2.6 }, countersunk: { dk: 6.8, k: 2.35 } },
  3.9: { p: 1.3, core: 2.9, hexWasher: { s: 7, k: 3.4, dk: 7, dc: 8.3 }, hex: { s: 7, k: 3, dk: 7 }, pan: { dk: 7.5, k: 2.8 }, countersunk: { dk: 7.5, k: 2.6 } },
  4.2: { p: 1.4, core: 3.1, hexWasher: { s: 7, k: 4.1, dk: 7, dc: 8.8 }, hex: { s: 7, k: 3, dk: 7 }, pan: { dk: 8, k: 3.1 }, countersunk: { dk: 8.1, k: 2.8 } },
  4.8: { p: 1.6, core: 3.6, hexWasher: { s: 8, k: 4.3, dk: 8, dc: 10.5 }, hex: { s: 8, k: 3.8, dk: 8 }, pan: { dk: 9.5, k: 3.7 }, countersunk: { dk: 9.5, k: 3.3 } },
  5.5: { p: 1.8, core: 4.1, hexWasher: { s: 8, k: 5.4, dk: 8, dc: 11 }, hex: { s: 8, k: 4.1, dk: 8 }, pan: { dk: 11, k: 4 }, countersunk: { dk: 10.8, k: 3.65 } },
  6.3: { p: 1.8, core: 4.7, hexWasher: { s: 10, k: 5.9, dk: 10, dc: 13.5 }, hex: { s: 10, k: 4.7, dk: 10 }, pan: { dk: 12, k: 4.6 }, countersunk: { dk: 12.4, k: 3.9 } },
}

/** Tirafondi DIN 571: chiave e altezza della testa */
const LAG: Record<number, { s: number; k: number }> = {
  6: { s: 10, k: 4 }, 8: { s: 13, k: 5.5 }, 10: { s: 17, k: 7 }, 12: { s: 19, k: 8 }, 16: { s: 24, k: 10 },
}

/** Viti per calcestruzzo (tipo HUS / Multi-Monti): testa esagonale flangiata */
const CONCRETE: Record<number, { s: number; k: number; dc: number }> = {
  6: { s: 10, k: 5, dc: 14 }, 8: { s: 13, k: 6, dc: 17 }, 10: { s: 15, k: 7, dc: 20 }, 12: { s: 17, k: 8, dc: 23 }, 14: { s: 21, k: 9, dc: 27 },
}

export type ScrewType = {
  id: ScrewObject['kind']
  label: string
  /** Materiale di destinazione, per l'etichetta */
  use: string
  diameters: number[]
  lengths: number[]
  heads: ScrewHead[]
  points: ScrewPoint[]
  /** Valori predefiniti */
  def: { d: number; L: number; head: ScrewHead; point: ScrewPoint; drive: ScrewObject['drive'] }
  /** Norma per testa */
  std: Partial<Record<ScrewHead, string>>
}

const STD_LENGTHS = [9.5, 13, 16, 19, 22, 25, 32, 38, 45, 50, 60, 70, 80, 100, 120]

export const SCREW_TYPES: ScrewType[] = [
  {
    id: 'drill', label: 'Autoperforante', use: 'acciaio',
    diameters: [3.5, 3.9, 4.2, 4.8, 5.5, 6.3], lengths: STD_LENGTHS,
    heads: ['hexWasher', 'pan', 'countersunk'], points: ['drill'],
    def: { d: 4.8, L: 25, head: 'hexWasher', point: 'drill', drive: 'PH' },
    std: { hexWasher: 'ISO 15480', pan: 'ISO 15481', countersunk: 'ISO 15482' },
  },
  {
    id: 'tapping', label: 'Autofilettante', use: 'lamiera',
    diameters: [2.9, 3.5, 3.9, 4.2, 4.8, 5.5, 6.3], lengths: STD_LENGTHS,
    heads: ['hex', 'pan', 'countersunk', 'hexWasher'], points: ['cone', 'blunt'],
    def: { d: 4.8, L: 19, head: 'pan', point: 'cone', drive: 'PH' },
    std: { hex: 'ISO 1479', pan: 'ISO 7049', countersunk: 'ISO 7050', hexWasher: 'ISO 7053' },
  },
  {
    id: 'wood', label: 'Vite per legno', use: 'legno',
    diameters: [3.5, 4, 4.5, 5, 6, 8, 10, 12], lengths: [20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200, 240, 280, 300, 400],
    heads: ['countersunk', 'pan', 'hexWasher'], points: ['gimlet'],
    def: { d: 5, L: 60, head: 'countersunk', point: 'gimlet', drive: 'TX' },
    std: { countersunk: 'EN 14592', pan: 'EN 14592', hexWasher: 'EN 14592' },
  },
  {
    id: 'lag', label: 'Tirafondo', use: 'legno',
    diameters: [6, 8, 10, 12, 16], lengths: [30, 40, 50, 60, 70, 80, 100, 120, 140, 160, 180, 200],
    heads: ['hex'], points: ['gimlet'],
    def: { d: 10, L: 100, head: 'hex', point: 'gimlet', drive: 'none' },
    std: { hex: 'DIN 571' },
  },
  {
    id: 'plaster', label: 'Vite per cartongesso', use: 'cartongesso',
    diameters: [3.5, 3.9], lengths: [25, 35, 45, 55, 65],
    heads: ['bugle'], points: ['needle', 'drill'],
    def: { d: 3.5, L: 25, head: 'bugle', point: 'needle', drive: 'PH' },
    std: { bugle: 'EN 14566' },
  },
  {
    id: 'aquapanel', label: 'Aquapanel Maxi Screw', use: 'Aquapanel',
    diameters: [3.9], lengths: [25, 39, 55],
    heads: ['bugle'], points: ['needle', 'drill'],
    def: { d: 3.9, L: 39, head: 'bugle', point: 'needle', drive: 'PH' },
    std: { bugle: 'Knauf' },
  },
  {
    id: 'concrete', label: 'Vite per calcestruzzo', use: 'calcestruzzo',
    diameters: [6, 8, 10, 12, 14], lengths: [40, 50, 60, 70, 80, 100, 120, 140, 160],
    heads: ['hexWasher'], points: ['blunt'],
    def: { d: 10, L: 80, head: 'hexWasher', point: 'blunt', drive: 'none' },
    std: {},
  },
  {
    id: 'machine', label: 'Vite metrica', use: 'acciaio e alluminio',
    diameters: [5, 6, 8, 10, 12, 14, 16], lengths: [10, 12, 16, 20, 25, 30, 35, 40, 45, 50, 60, 65, 70, 80, 90, 100, 120],
    heads: ['socketCap', 'socketCsk', 'button', 'hex'], points: ['flat'],
    def: { d: 10, L: 30, head: 'socketCap', point: 'flat', drive: 'none' },
    std: { socketCap: 'ISO 4762', socketCsk: 'ISO 10642', button: 'ISO 7380', hex: 'ISO 4017' },
  },
  {
    id: 'hammer', label: 'Vite a testa di martello', use: 'cava dei profili in alluminio',
    diameters: [6, 8, 10, 12], lengths: [16, 20, 25, 30, 35, 40, 50, 60],
    heads: ['hammer'], points: ['flat'],
    def: { d: 10, L: 30, head: 'hammer', point: 'flat', drive: 'none' },
    std: {},
  },
  {
    id: 'anchor', label: 'Ancorante Hilti', use: 'calcestruzzo',
    diameters: [8, 10, 12, 16], lengths: [75, 90, 100, 115, 130, 145, 160, 180, 200, 220],
    heads: ['hsa', 'hsl'], points: ['flat'],
    def: { d: 10, L: 115, head: 'hsa', point: 'flat', drive: 'none' },
    std: { hsa: 'HSA', hsl: 'HSL-G-TZ' },
  },
]

export const screwType = (kind: ScrewObject['kind']) => SCREW_TYPES.find(t => t.id === kind) ?? SCREW_TYPES[0]

export const HEAD_LABEL: Record<ScrewHead, string> = {
  hexWasher: 'Esagonale flangiata', hex: 'Esagonale', pan: 'Bombata', countersunk: 'Svasata piana', bugle: 'A trombetta',
  socketCap: 'Cilindrica, esagono incassato', socketCsk: 'Svasata, esagono incassato', button: 'Bombata, esagono incassato',
  hammer: 'A martello', hsa: 'Ad espansione (barra e dado)', hsl: 'Pesante a manicotto',
}
export const POINT_LABEL: Record<ScrewPoint, string> = {
  drill: 'Punta trapano (TEKS)', cone: 'Punta conica', blunt: 'Punta smussata', gimlet: 'Punta a succhiello', needle: 'Punta chiodo (HS)', flat: 'Piana smussata',
}

/** Dimensioni usate per il disegno */
export type ScrewDims = {
  d: number; core: number; p: number
  head: HeadDims
  /** lunghezza filettata (dalla punta) e diametro del gambo liscio */
  thread: number; shank: number
  /** lunghezza della punta */
  tip: number
  washer?: { d: number; t: number }
}

export const screwDims = (o: ScrewObject): ScrewDims => {
  if (isMetric(o)) {
    const th = metricThread(o.diameter)
    return { d: o.diameter, core: th.core, p: th.p, head: metricHead(o), thread: o.length, shank: o.diameter, tip: 0 }
  }
  const d = o.diameter
  const L = o.length
  const st = ST[d] ?? ST[4.8]
  const sheet = o.kind === 'drill' || o.kind === 'tapping'
  let head: HeadDims
  let p: number, core: number
  if (o.kind === 'lag') {
    const h = LAG[d] ?? { s: d * 1.6, k: d * 0.7 }
    head = { dk: h.s, k: h.k, s: h.s }
    p = d * 0.45; core = d * 0.68
  } else if (o.kind === 'concrete') {
    const h = CONCRETE[d] ?? { s: d * 1.5, k: d * 0.7, dc: d * 2.2 }
    head = { dk: h.s, k: h.k, s: h.s, dc: h.dc }
    p = d * 0.9; core = d * 0.78
  } else if (sheet) {
    const st2 = ST[d] ? st : null
    const h = st2 ? (st2[o.head as 'hexWasher'] ?? st2.pan) : { dk: d * 2, k: d * 0.75 }
    head = o.head === 'hexWasher' || o.head === 'hex' ? h : { dk: h.dk, k: h.k }
    p = st.p; core = st.core * (d / (ST[d] ? d : 4.8))
  } else if (o.kind === 'plaster' || o.kind === 'aquapanel') {
    head = { dk: 8.5, k: 3.4 }
    p = o.kind === 'aquapanel' ? 2.3 : 1.4; core = d * 0.68
  } else {
    // legno EN 14592: testa ≈ 2d, filetto ≈ 0,6 L
    head = o.head === 'hexWasher' ? { dk: d * 1.6, k: d * 0.75, s: d * 1.6, dc: d * 2.2 }
      : o.head === 'pan' ? { dk: d * 2, k: d * 0.7 } : { dk: d * 2, k: d * 0.9 }
    p = d * 0.45; core = d * 0.63
  }
  const partial = o.kind === 'wood' || o.kind === 'lag'
  const tip = o.point === 'drill' ? Math.max(3, d * 1.1) : o.point === 'blunt' ? d * 0.5 : o.point === 'gimlet' ? d * 1.6 : d * 1.3
  const flush = o.head === 'countersunk' || o.head === 'bugle'
  const body = L - (flush ? head.k : 0)
  const thread = partial && !o.fullThread ? Math.min(body, Math.max(o.threadLength ?? Math.round(L * 0.6), tip + p)) : body
  return {
    d, core, p, head, thread, tip,
    shank: o.kind === 'lag' ? d : d * 0.72,
    washer: o.washer && (o.head === 'hexWasher' || o.head === 'hex') ? { d: o.washerD ?? 16, t: 3 } : undefined,
  }
}

const f = (n: number) => +n.toFixed(2)
const poly = (pts: Point[], close = false) => (pts.length > 1 ? `M ${pts.map(q => `${f(q.x)} ${f(q.y)}`).join(' L ')}${close ? ' Z' : ''} ` : '')

/** Esagono (vista dall'alto) con chiave s, un vertice in alto */
const hexagon = (cx: number, cy: number, s: number) => {
  const R = s / Math.sqrt(3)
  return poly(Array.from({ length: 6 }, (_, i) => {
    const a = Math.PI / 6 + (i * Math.PI) / 3
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }
  }), true)
}
const circle = (cx: number, cy: number, r: number) =>
  `M ${f(cx - r)} ${f(cy)} a ${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0 a ${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0 Z `

export type ScrewDrawing = {
  /** contorno pieno (colore di riempimento) */
  outline: string
  /** linee sottili: facce della testa, impronta, eliche */
  thin: string
  /** asse (tratto e punto) */
  axis: string
  bounds: { x: number; y: number; w: number; h: number }
}

/** Disegno in coordinate mondo non ruotate, con origine in (o.x, o.y) */
export function screwDrawing(o: ScrewObject): ScrewDrawing {
  if (isMetric(o)) return metricDrawing(o)
  const D = screwDims(o)
  const P = (x: number, y: number): Point => ({ x: o.x + x, y: o.y + y })
  let outline = '', thin = '', axis = ''

  if (o.view === 'head') {
    const h = D.head
    if (o.head === 'hexWasher') {
      outline += circle(o.x, o.y, (h.dc ?? h.dk * 1.3) / 2)
      outline += hexagon(o.x, o.y, h.s ?? h.dk)
    } else if (o.head === 'hex') {
      if (D.washer) outline += circle(o.x, o.y, D.washer.d / 2)
      outline += hexagon(o.x, o.y, h.s ?? h.dk)
      thin += circle(o.x, o.y, (h.s ?? h.dk) * 0.48)
    } else {
      outline += circle(o.x, o.y, h.dk / 2)
    }
    if (D.washer && o.head === 'hexWasher') outline = circle(o.x, o.y, D.washer.d / 2) + outline
    // impronta (le teste esagonali si avvitano con la chiave)
    const r = Math.min(h.dk * 0.24, 4)
    const hexHead = o.head === 'hexWasher' || o.head === 'hex'
    if (hexHead) { /* nessuna impronta */ } else if (o.drive === 'PH') {
      const w = r * 0.32
      thin += poly([P(-r, -w), P(-w, -w), P(-w, -r), P(w, -r), P(w, -w), P(r, -w), P(r, w), P(w, w), P(w, r), P(-w, r), P(-w, w), P(-r, w)], true)
    } else if (o.drive === 'TX') {
      const pts: Point[] = []
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6
        const rr = i % 2 === 0 ? r : r * 0.62
        pts.push(P(rr * Math.sin(a), -rr * Math.cos(a)))
      }
      thin += poly(pts, true)
    }
    const R = Math.max(h.dc ?? 0, D.washer?.d ?? 0, h.dk) / 2
    axis = poly([P(-R - 3, 0), P(R + 3, 0)]) + poly([P(0, -R - 3), P(0, R + 3)])
    return { outline, thin, axis, bounds: { x: o.x - R, y: o.y - R, w: 2 * R, h: 2 * R } }
  }

  // ---------- vista laterale ----------
  const h = D.head
  const flush = o.head === 'countersunk' || o.head === 'bugle'
  let y0 = 0 // inizio del gambo sotto la testa
  let top = 0
  const wt = D.washer?.t ?? 0
  if (D.washer) {
    // rondella in acciaio con guarnizione EPDM: due strati
    const r = D.washer.d / 2
    outline += poly([P(-r, -wt), P(r, -wt), P(r, 0), P(-r, 0)], true)
    thin += poly([P(-r, -wt * 0.65), P(r, -wt * 0.65)])
  }
  if (o.head === 'hexWasher') {
    const dc = h.dc ?? h.dk * 1.3, s = h.s ?? h.dk
    const fw = Math.max(0.6, h.k * 0.18)
    const yb = -wt
    outline += poly([P(-dc / 2, yb - fw), P(dc / 2, yb - fw), P(dc / 2, yb), P(-dc / 2, yb)], true)
    // esagono visto di spigolo: larghezza sugli spigoli, due facce visibili
    const e = s / Math.cos(Math.PI / 6) / 2
    outline += poly([P(-e, yb - fw), P(-e, yb - h.k), P(e, yb - h.k), P(e, yb - fw)], true)
    thin += poly([P(0, yb - fw), P(0, yb - h.k)])
    top = yb - h.k
  } else if (o.head === 'hex') {
    const s = h.s ?? h.dk
    const e = s / Math.cos(Math.PI / 6) / 2
    const yb = -wt
    const c = h.k * 0.15
    outline += poly([P(-e, yb), P(-e, yb - h.k + c), P(-e + c, yb - h.k), P(e - c, yb - h.k), P(e, yb - h.k + c), P(e, yb)], true)
    thin += poly([P(0, yb), P(0, yb - h.k)])
    top = yb - h.k
  } else if (o.head === 'pan') {
    const r = h.dk / 2, k = h.k, rr = Math.min(k * 0.8, r * 0.6)
    const pts: Point[] = [P(-r, 0), P(-r, -k + rr)]
    for (let i = 1; i <= 6; i++) { const a = Math.PI - (i * Math.PI) / 12; pts.push(P(-r + rr + rr * Math.cos(a), -k + rr - rr * Math.sin(a))) }
    for (let i = 0; i <= 6; i++) { const a = Math.PI / 2 - (i * Math.PI) / 12; pts.push(P(r - rr + rr * Math.cos(a), -k + rr - rr * Math.sin(a))) }
    pts.push(P(r, 0))
    outline += poly(pts, true)
    top = -k
  } else if (o.head === 'countersunk') {
    outline += poly([P(-h.dk / 2, 0), P(h.dk / 2, 0), P(D.d / 2, h.k), P(-D.d / 2, h.k)], true)
    y0 = h.k
  } else {
    // trombetta: raccordo curvo fino al gambo
    const pts: Point[] = [P(-h.dk / 2, 0), P(h.dk / 2, 0)]
    for (let i = 1; i <= 8; i++) {
      const t = i / 8
      pts.push(P(D.d / 2 + (h.dk / 2 - D.d / 2) * (1 - t) ** 2, h.k * t))
    }
    for (let i = 8; i >= 1; i--) {
      const t = i / 8
      pts.push(P(-(D.d / 2 + (h.dk / 2 - D.d / 2) * (1 - t) ** 2), h.k * t))
    }
    outline += poly(pts, true)
    y0 = h.k
  }
  if (!flush) y0 = 0

  // lunghezza nominale: dal sotto della testa (con la rondella la testa è più in alto) o dalla faccia delle teste a filo
  const yEnd = flush ? o.length : o.length - wt
  const yTip0 = yEnd - D.tip
  const yThread = Math.max(y0, yEnd - D.thread)

  // gambo liscio
  if (yThread > y0 + 0.01) {
    outline += poly([P(-D.shank / 2, y0), P(D.shank / 2, y0), P(D.shank / 2, yThread), P(-D.shank / 2, yThread)], true)
  }

  // filetto: dente di sega sui due lati, sfalsati di mezzo passo, che si stringe sulla punta (tranne la punta trapano)
  const R = D.d / 2, r = D.core / 2
  const radiusAt = (y: number, outer: boolean) => {
    const base = outer ? R : r
    if (o.point === 'drill' || y <= yTip0) return base
    const t = Math.min(1, (y - yTip0) / D.tip)
    const end = o.point === 'blunt' ? 0.55 : 0
    return base * (1 - t * (1 - end))
  }
  const threadEnd = o.point === 'drill' ? yTip0 : yEnd - (o.point === 'blunt' ? 0 : D.p * 0.3)
  const side = (s: 1 | -1) => {
    const pts: Point[] = []
    let y = yThread + (s > 0 ? 0 : D.p / 2)
    pts.push(P(s * radiusAt(yThread, false), yThread))
    while (y < threadEnd) {
      pts.push(P(s * radiusAt(y, false), y))
      const yc = y + D.p * 0.5
      if (yc < threadEnd) pts.push(P(s * radiusAt(yc, true), yc))
      y += D.p
    }
    pts.push(P(s * radiusAt(threadEnd, false), threadEnd))
    return pts
  }
  const right = side(1), left = side(-1)
  const tipPts: Point[] = []
  if (o.point === 'drill') {
    // punta trapano: cilindro più stretto con scanalatura e cono a 118°
    const rd = r * 1.05
    const cone = rd / Math.tan((59 * Math.PI) / 180)
    tipPts.push(P(rd, yTip0), P(rd, yEnd - cone), P(0, yEnd), P(-rd, yEnd - cone), P(-rd, yTip0))
    thin += poly([P(-rd * 0.3, yTip0 + 0.5), P(rd * 0.6, yEnd - cone - 0.3)])
  } else if (o.point === 'blunt') {
    tipPts.push(P(r * 0.55, yEnd), P(-r * 0.55, yEnd))
  } else {
    tipPts.push(P(0, yEnd))
  }
  outline += poly([...right, ...tipPts, ...left.reverse()], true)
  // linea del nucleo sotto il filetto (sottile)
  thin += poly([P(r, yThread), P(r, Math.min(threadEnd, yTip0))]) + poly([P(-r, yThread), P(-r, Math.min(threadEnd, yTip0))])

  const W = Math.max(h.dc ?? 0, h.dk, D.washer?.d ?? 0, (h.s ?? 0) / Math.cos(Math.PI / 6))
  axis = poly([P(0, top - 3), P(0, yEnd + 3)])
  return { outline, thin, axis, bounds: { x: o.x - W / 2, y: o.y + top, w: W, h: yEnd - top } }
}

export const screwBounds = (o: ScrewObject) => screwDrawing(o).bounds

const nf = (n: number) => String(+n.toFixed(1)).replace('.', ',')

export const screwLabel = (o: ScrewObject): string => {
  if (isMetric(o)) return metricLabel(o)
  const t = screwType(o.kind)
  const size = o.kind === 'drill' || o.kind === 'tapping' ? `ST${nf(o.diameter)}` : `Ø${nf(o.diameter)}`
  const std = t.std[o.head]
  const pt = o.kind === 'aquapanel' || o.kind === 'plaster' ? (o.point === 'drill' ? ' TEKS' : ' HS') : ''
  const washer = o.washer && (o.head === 'hexWasher' || o.head === 'hex') ? ` + rondella Ø${o.washerD ?? 16}` : ''
  return `${t.label}${pt} ${size}×${nf(o.length)}${std && std !== 'Knauf' ? ` ${std}` : ''}${washer}`
}

export const defaultScrew = (kind: ScrewObject['kind']): Pick<ScrewObject, 'kind' | 'diameter' | 'length' | 'head' | 'point' | 'drive'> => {
  const t = screwType(kind)
  return { kind, diameter: t.def.d, length: t.def.L, head: t.def.head, point: t.def.point, drive: t.def.drive }
}
