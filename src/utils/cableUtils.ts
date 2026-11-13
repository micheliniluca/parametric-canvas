import type { CableObject, Point } from '../types'

/**
 * Funi spiroidali chiuse FLC (Full Locked Coil) e forcelle fisse TTF.
 * Dati dal catalogo Redaelli (High Strength Steel), EN 1993-1-11, γR = 1,0.
 */
export type FlcRope = {
  /** Diametro nominale (mm) */
  d: number
  /** Resistenza caratteristica a rottura Fuk (kN) */
  Fuk: number
  /** Resistenza di progetto FRd = Fuk / (1,5·γR) (kN) */
  FRd: number
  /** Sezione metallica (mm²) */
  A: number
  /** Rigidezza assiale EA (MN) */
  EA: number
  /** Massa (kg/m) */
  mass: number
}

export type TtfSocket = {
  size: number
  /** Diametro massimo del trefolo (mm) */
  dmax: number
  Nuk: number
  NRd: number
  /** Dal centro perno alla punta della forcella (mm) */
  C: number
  /** Diametro del foro per il perno (mm) */
  Dhole: number
  /** Larghezza della testa (mm) */
  E: number
  /** Dal centro perno all'uscita della fune (mm) */
  F: number
  Smax: number
  /** Apertura della forcella (spessore piastra) min/max (mm) */
  Tmin: number
  Tmax: number
  /** Massa di una forcella (kg) */
  mass: number
}

// d, Fuk, FRd, A, EA, massa
const FLC_ROWS: [number, number, number, number, number, number][] = [
  [16, 255, 170, 170, 28, 1.4], [20, 395, 263, 266, 44, 2.2], [24, 575, 383, 383, 63, 3.2],
  [28, 780, 520, 521, 86, 4.3], [32, 1020, 680, 681, 112, 5.7], [36, 1295, 863, 862, 142, 7.2],
  [40, 1615, 1077, 1077, 178, 9.0], [44, 1955, 1303, 1303, 215, 10.8], [48, 2330, 1553, 1551, 256, 12.9],
  [52, 2765, 1843, 1841, 304, 15.3], [56, 3205, 2137, 2136, 352, 17.8], [60, 3680, 2453, 2452, 405, 20.4],
  [64, 4190, 2793, 2789, 460, 23.2], [68, 4730, 3153, 3149, 513, 26.2], [72, 5235, 3490, 3530, 575, 29.4],
  [76, 5815, 3877, 3933, 641, 32.7], [80, 6425, 4283, 4358, 710, 36.3], [84, 7070, 4713, 4805, 783, 40.0],
  [88, 7745, 5163, 5274, 860, 43.9], [92, 8450, 5633, 5764, 940, 48.0], [96, 9185, 6123, 6276, 1023, 52.2],
  [100, 10075, 6717, 6890, 1123, 57.3], [104, 10880, 7253, 7452, 1215, 62.0], [108, 11725, 7817, 8037, 1310, 66.9],
  [112, 12745, 8497, 8744, 1425, 72.8], [116, 13660, 9107, 9379, 1529, 78.0], [120, 14605, 9737, 10037, 1636, 83.5],
  [124, 15585, 10390, 10718, 1747, 89.2], [128, 16790, 11193, 11551, 1883, 96.1], [132, 17845, 11897, 12285, 1966, 102.2],
  [136, 18935, 12623, 13040, 2086, 108.5], [140, 20055, 13370, 13819, 2211, 115.0], [144, 21205, 14137, 14620, 2339, 121.7],
  [148, 22395, 14930, 15443, 2471, 128.5], [152, 23610, 15740, 16289, 2606, 135.5], [156, 24860, 16573, 17158, 2745, 142.8],
]

// taglia, dmax, Nuk, NRd, C, Dforo, E, F, Smax, Tmin, Tmax, massa
const TTF_ROWS: number[][] = [
  [12, 15, 190, 127, 38, 25.5, 60, 123, 50, 16, 22, 1.2],
  [16, 19, 320, 213, 48, 32, 78, 159, 60, 24, 30, 2.5],
  [20, 24, 490, 327, 60, 39, 94, 195, 75, 30, 37, 4.4],
  [24, 28, 700, 467, 72, 46, 112, 231, 85, 38, 45, 7.1],
  [28, 32, 970, 647, 84, 54, 132, 267, 100, 50, 56, 11],
  [32, 36, 1285, 857, 95, 61, 150, 303, 110, 55, 60, 17],
  [36, 40, 1615, 1077, 104, 67, 164, 334, 120, 65, 70, 23],
  [40, 44, 1955, 1303, 120, 76, 188, 375, 135, 70, 75, 33],
  [44, 48, 2350, 1567, 130, 83, 205, 406, 145, 80, 85, 44],
  [48, 52, 2765, 1843, 140, 90, 220, 442, 155, 90, 95, 57],
  [52, 56, 3300, 2200, 154, 98, 242, 478, 170, 95, 105, 71],
  [56, 60, 3900, 2600, 172, 109, 270, 519, 185, 105, 110, 89],
  [60, 64, 4400, 2933, 182, 116, 286, 560, 205, 115, 120, 107],
  [64, 68, 5000, 3333, 196, 124, 308, 596, 215, 125, 130, 130],
  [68, 72, 5550, 3700, 208, 131, 325, 637, 230, 130, 135, 153],
  [72, 76, 6250, 4167, 218, 138, 345, 673, 240, 140, 145, 181],
  [76, 80, 7000, 4667, 232, 146, 365, 708, 255, 150, 155, 215],
  [80, 84, 7700, 5133, 245, 154, 386, 750, 270, 155, 165, 253],
  [84, 88, 8500, 5667, 256, 161, 404, 781, 280, 165, 170, 289],
  [88, 92, 9400, 6267, 282, 179, 442, 827, 300, 175, 180, 349],
  [92, 96, 10200, 6800, 293, 187, 462, 868, 315, 185, 190, 400],
  [96, 100, 11100, 7400, 305, 194, 482, 899, 325, 190, 200, 448],
  [100, 104, 12000, 8000, 320, 202, 502, 945, 345, 195, 205, 509],
  [104, 108, 13000, 8667, 332, 210, 522, 976, 355, 205, 215, 566],
  [108, 112, 14000, 9333, 345, 218, 544, 1017, 370, 210, 225, 632],
  [112, 116, 15200, 10133, 362, 227, 570, 1058, 385, 215, 230, 707],
  [116, 120, 16150, 10767, 375, 236, 592, 1094, 400, 225, 240, 787],
  [120, 124, 17400, 11600, 388, 243, 612, 1130, 410, 230, 250, 872],
  [124, 128, 18450, 12300, 400, 252, 632, 1171, 430, 240, 255, 957],
  [128, 132, 19800, 13200, 412, 259, 650, 1207, 440, 250, 265, 1055],
  [132, 136, 20900, 13933, 425, 267, 672, 1238, 450, 255, 270, 1144],
  [136, 140, 22200, 14800, 438, 275, 692, 1279, 465, 265, 280, 1254],
  [140, 144, 23500, 15667, 452, 283, 715, 1315, 475, 270, 290, 1364],
  [144, 148, 24850, 16567, 466, 292, 736, 1351, 490, 280, 300, 1492],
  [148, 152, 26250, 17500, 479, 300, 756, 1387, 500, 290, 310, 1610],
  [152, 156, 27700, 18467, 492, 308, 776, 1423, 515, 295, 320, 1741],
  [156, 160, 29150, 19433, 505, 316, 796, 1459, 525, 300, 330, 1879],
]

export const FLC: FlcRope[] = FLC_ROWS.map(([d, Fuk, FRd, A, EA, mass]) => ({ d, Fuk, FRd, A, EA, mass }))
export const TTF: TtfSocket[] = TTF_ROWS.map(([size, dmax, Nuk, NRd, C, Dhole, E, F, Smax, Tmin, Tmax, mass]) =>
  ({ size, dmax, Nuk, NRd, C, Dhole, E, F, Smax, Tmin, Tmax, mass }))

export const FLC_SIZES = FLC.map(r => r.d)
export const DEFAULT_CABLE_SIZE = 40

export const flcRope = (d: number): FlcRope => FLC.find(r => r.d === d) ?? FLC.find(r => r.d === DEFAULT_CABLE_SIZE)!
/** Forcella abbinata alla fune: stessa taglia del catalogo (FLC 40 → TTF 40) */
export const ttfSocket = (d: number): TtfSocket => TTF.find(s => s.size === d) ?? TTF.find(s => s.size >= d) ?? TTF[TTF.length - 1]

/** Interasse tra i punti di lavoro (centri perno, o estremità della fune senza forcella) */
export const cableSpan = (o: CableObject) => Math.hypot(o.x2 - o.x1, o.y2 - o.y1)

/** Lunghezza della sola fune, tra le uscite dalle forcelle (indicativa) */
export const ropeLength = (o: CableObject) => {
  const F = ttfSocket(o.size).F
  return Math.max(0, cableSpan(o) - (o.startSocket ? F : 0) - (o.endSocket ? F : 0))
}

export const socketCount = (o: CableObject) => (o.startSocket ? 1 : 0) + (o.endSocket ? 1 : 0)

export const cableMass = (o: CableObject) =>
  (flcRope(o.size).mass * ropeLength(o)) / 1000 + socketCount(o) * ttfSocket(o.size).mass

/** Resistenza di progetto del tirante: la minore tra fune e forcelle montate */
export const cableNRd = (o: CableObject) => {
  const rope = flcRope(o.size).FRd
  return socketCount(o) ? Math.min(rope, ttfSocket(o.size).NRd) : rope
}

export const cableLabel = (o: CableObject) => {
  const n = socketCount(o)
  return `FLC ${o.size}${n ? ` + ${n === 2 ? '2×' : ''}TTF ${ttfSocket(o.size).size}` : ''}`
}

/* ---------- disegno ---------- */

type Frame = { o: Point; u: Point; v: Point }
const at = (f: Frame, x: number, y: number) => ({ x: f.o.x + f.u.x * x + f.v.x * y, y: f.o.y + f.u.y * x + f.v.y * y })
const fmt = (p: Point) => `${+p.x.toFixed(2)} ${+p.y.toFixed(2)}`

/** Raggio del codolo della forcella, dove esce la fune */
const barrelR = (s: TtfSocket) => Math.max(s.E * 0.22, s.dmax * 0.75)

/**
 * Forcella vista nel piano della forcella: testa arrotondata attorno al perno,
 * corpo che si rastrema fino al codolo da cui esce la fune.
 * Asse locale x dal perno verso la fune.
 */
function socketPath(f: Frame, s: TtfSocket, angleDeg: number) {
  const h = s.E / 2
  const rb = barrelR(s)
  const Lt = s.F * 0.62
  const P = (x: number, y: number) => fmt(at(f, x, y))
  const rot = +angleDeg.toFixed(3)
  const outline =
    `M ${P(0, -h)} A ${s.C} ${h} ${rot} 0 0 ${P(-s.C, 0)} A ${s.C} ${h} ${rot} 0 0 ${P(0, h)} ` +
    `C ${P(Lt * 0.45, h)} ${P(Lt * 0.6, rb)} ${P(Lt, rb)} L ${P(s.F, rb)} L ${P(s.F, -rb)} L ${P(Lt, -rb)} ` +
    `C ${P(Lt * 0.6, -rb)} ${P(Lt * 0.45, -h)} ${P(0, -h)} Z`
  const r = s.Dhole / 2
  // foro del perno (sottratto col riempimento evenodd)
  const hole = `M ${P(r, 0)} A ${r} ${r} 0 1 0 ${P(-r, 0)} A ${r} ${r} 0 1 0 ${P(r, 0)} Z`
  // linea del codolo e croce d'asse sul perno
  const thin = `M ${P(Lt, -rb)} L ${P(Lt, rb)} M ${P(-r * 1.4, 0)} L ${P(r * 1.4, 0)} M ${P(0, -r * 1.4)} L ${P(0, r * 1.4)}`
  const hull = [at(f, -s.C, -h), at(f, -s.C, h), at(f, 0, -h), at(f, 0, h), at(f, s.F, -rb), at(f, s.F, rb)]
  return { outline: outline + hole, thin, hull }
}

export function cableDrawing(o: CableObject) {
  const p1 = { x: o.x1, y: o.y1 }
  const p2 = { x: o.x2, y: o.y2 }
  const L = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1e-6
  const u = { x: (p2.x - p1.x) / L, y: (p2.y - p1.y) / L }
  const v = { x: -u.y, y: u.x }
  const angle = (Math.atan2(u.y, u.x) * 180) / Math.PI
  const rope = flcRope(o.size)
  const sock = ttfSocket(o.size)
  const r = rope.d / 2

  let outline = ''
  let thin = ''
  const hull: Point[] = []
  if (o.startSocket) {
    const s = socketPath({ o: p1, u, v }, sock, angle)
    outline += s.outline; thin += s.thin; hull.push(...s.hull)
  }
  if (o.endSocket) {
    const s = socketPath({ o: p2, u: { x: -u.x, y: -u.y }, v: { x: -v.x, y: -v.y } }, sock, angle + 180)
    outline += s.outline; thin += s.thin; hull.push(...s.hull)
  }
  // fune tra le uscite dalle forcelle
  const a = o.startSocket ? sock.F : 0
  const b = L - (o.endSocket ? sock.F : 0)
  const f = { o: p1, u, v }
  let rope_ = ''
  if (b > a) {
    const c = [at(f, a, -r), at(f, b, -r), at(f, b, r), at(f, a, r)]
    rope_ = `M ${c.map(fmt).join(' L ')} Z`
    hull.push(...c)
  }
  hull.push(p1, p2)
  const axis = `M ${fmt(p1)} L ${fmt(p2)}`
  return { outline, rope: rope_, thin, axis, hull, angle, u, v }
}

export function cableBounds(o: CableObject) {
  const { hull } = cableDrawing(o)
  const xs = hull.map(p => p.x)
  const ys = hull.map(p => p.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}
