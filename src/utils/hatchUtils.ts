import type { HatchId, Point } from '../types'

/**
 * Retini dei materiali da costruzione. Ogni retino è un modulo w × h (unità della tela = mm)
 * che si ripete senza giunte: linee (polilinee aperte o chiuse) e puntini pieni.
 * Le linee possono uscire dal modulo: vengono ritagliate sul suo bordo, e il modulo accanto ne disegna il resto.
 */

type Dot = { x: number; y: number; r: number }
export type HatchDef = { id: HatchId; label: string; group: string; w: number; h: number; lines: Point[][]; dots: Dot[] }

export const HATCH_GROUPS = ['Strutturali', 'Murature', 'Terreni e inerti', 'Finiture e altro'] as const

const P = (x: number, y: number): Point => ({ x, y })
/** pseudo-casuale con seme fisso: un retino è sempre uguale */
const rng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646

/** rette a 45° ("/" con l'asse y verso il basso, dir 1) o a −45° ("\", dir −1) che si ripetono sul modulo s × s */
const diag = (s: number, offsets: number[], dir: 1 | -1 = 1): Point[][] =>
  offsets.flatMap(c => [-1, 0, 1, 2].map(k => {
    const q = c + k * s
    return dir === 1 ? [P(q + 1, -1), P(q - s - 1, s + 1)] : [P(q - s - 1, -1), P(q + 1, s + 1)]
  }))

const rectPts = (x0: number, y0: number, x1: number, y1: number) => [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1), P(x0, y0)]

const ellipse = (cx: number, cy: number, rx: number, ry: number, rot = 0, n = 16) => {
  const c = Math.cos(rot), s = Math.sin(rot)
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    const x = rx * Math.cos(a), y = ry * Math.sin(a)
    return P(cx + x * c - y * s, cy + x * s + y * c)
  })
}

/** copie traslate di una figura vicina al bordo, perché il modulo si ripeta senza tagli */
const wrap = (pts: Point[], w: number, h: number) =>
  [-1, 0, 1].flatMap(i => [-1, 0, 1].map(j => pts.map(p => P(p.x + i * w, p.y + j * h))))

/** inerti (sul modello dell'AR-CONC): triangolini ruotati a caso su una griglia sfalsata, più puntini sparsi */
const aggregate = (w: number, h: number, seed: number, grid: number, rMin: number, rMax: number, keep: number, nDots: number, dotR: number) => {
  const rnd = rng(seed)
  const lines: Point[][] = []
  const dots: Dot[] = []
  const gx = grid, gy = Math.max(1, Math.round((grid * h) / w))
  for (let i = 0; i < gx; i++) {
    for (let j = 0; j < gy; j++) {
      if (rnd() > keep) continue
      const r = rMin + rnd() * (rMax - rMin)
      const cx = Math.min(w - r, Math.max(r, (i + 0.5 + (rnd() - 0.5) * 0.6) * (w / gx)))
      const cy = Math.min(h - r, Math.max(r, (j + 0.5 + (rnd() - 0.5) * 0.6) * (h / gy)))
      const a0 = rnd() * Math.PI * 2
      const pts = [0, 1, 2].map(k => {
        const a = a0 + (k * 2 * Math.PI) / 3 + (rnd() - 0.5) * 0.5
        return P(cx + r * Math.cos(a), cy + r * Math.sin(a))
      })
      lines.push([...pts, pts[0]])
    }
  }
  for (let k = 0; k < nDots; k++) {
    const r = dotR * (0.7 + rnd() * 0.6)
    dots.push({ x: r + rnd() * (w - 2 * r), y: r + rnd() * (h - 2 * r), r })
  }
  return { lines, dots }
}

const scatterDots = (w: number, h: number, seed: number, n: number, r: number): Dot[] => {
  const rnd = rng(seed)
  return Array.from({ length: n }, () => {
    const rr = r * (0.7 + rnd() * 0.6)
    return { x: rr + rnd() * (w - 2 * rr), y: rr + rnd() * (h - 2 * rr), r: rr }
  })
}

/** curva campionata su più periodi, per i retini che ripetono in orizzontale */
const wave = (x0: number, x1: number, f: (x: number) => number, step = 1) => {
  const pts: Point[] = []
  for (let x = x0; x <= x1 + 1e-9; x += step) pts.push(P(x, f(x)))
  return pts
}

function build(): HatchDef[] {
  const defs: HatchDef[] = []
  const add = (id: HatchId, label: string, group: string, w: number, h: number, lines: Point[][], dots: Dot[] = []) =>
    defs.push({ id, label, group, w, h, lines, dots })

  /* ---------- strutturali ---------- */
  const conc = aggregate(50, 50, 7, 4, 1.8, 3.2, 0.65, 24, 0.4)
  add('concrete', 'Calcestruzzo', 'Strutturali', 50, 50, conc.lines, conc.dots)
  const rc = aggregate(50, 50, 11, 4, 1.6, 2.8, 0.55, 18, 0.4)
  add('rc', 'Cemento armato', 'Strutturali', 50, 50, [...diag(50, [0, 12.5, 25, 37.5]), ...rc.lines], rc.dots)
  add('steel', 'Acciaio', 'Strutturali', 10, 10, diag(10, [0, 1.6]))
  add('timber', 'Legno (venatura)', 'Strutturali', 60, 16,
    [[2, 0], [6, 1.3], [10, 2.6], [14, 0.7]].map(([y, ph]) =>
      wave(-2, 62, x => y + 1.1 * Math.sin((2 * Math.PI * x) / 60 + ph) + 0.35 * Math.sin((6 * Math.PI * x) / 60 + 2 * ph), 2)))
  add('timberEnd', 'Legno (sezione)', 'Strutturali', 24, 24,
    [4, 8, 12, 16, 20, 24, 28, 32].map(r => {
      const pts: Point[] = []
      for (let i = 0; i <= 16; i++) {
        const a = -Math.PI / 2 + (i / 16) * (Math.PI / 2)
        pts.push(P(r * Math.cos(a), 24 + r * Math.sin(a)))
      }
      return pts
    }))

  /* ---------- murature ---------- */
  add('brick', 'Laterizio pieno', 'Murature', 6, 6, diag(6, [0]))
  {
    // corsi sfalsati di forati 40 × 10, tre fori per elemento
    const L: Point[][] = [[P(-1, 0), P(41, 0)], [P(-1, 10), P(41, 10)], [P(0, 0), P(0, 10)], [P(20, 10), P(20, 20)]]
    for (const [x0, x1] of [[5, 12], [16.5, 23.5], [28, 35]]) L.push(rectPts(x0, 3, x1, 7))
    for (const [x0, x1] of [[25, 32], [36.5, 43.5], [-3.5, 3.5], [8, 15]]) L.push(rectPts(x0, 13, x1, 17))
    add('hollowBrick', 'Laterizio forato', 'Murature', 40, 20, L)
  }
  {
    const b = aggregate(50, 25, 23, 4, 1, 1.6, 0.4, 12, 0.35)
    add('block', 'Blocchi in cls', 'Murature', 50, 25,
      [[P(-1, 0), P(51, 0)], [P(-1, 12.5), P(51, 12.5)], [P(0, 0), P(0, 12.5)], [P(25, 12.5), P(25, 25)], ...b.lines], b.dots)
  }
  {
    // pietre irregolari: griglia 3 × 3 di vertici spostati a caso, periodica sul modulo
    const T = 48, n = 3, rnd = rng(31)
    const jit = Array.from({ length: n }, () => Array.from({ length: n }, () => P((rnd() - 0.5) * 9, (rnd() - 0.5) * 9)))
    const V = (i: number, j: number) => {
      const J = jit[((i % n) + n) % n][((j % n) + n) % n]
      return P((i * T) / n + J.x, (j * T) / n + J.y)
    }
    const L: Point[][] = []
    for (let i = -1; i <= n; i++) {
      for (let j = -1; j <= n; j++) {
        L.push([V(i, j), V(i + 1, j)], [V(i, j), V(i, j + 1)])
      }
    }
    add('stone', 'Pietra naturale', 'Murature', T, T, L)
  }

  /* ---------- terreni e inerti ---------- */
  {
    const L: Point[][] = []
    const group = (cx: number, cy: number, dir: 1 | -1) => {
      for (const o of [-1.6, 0, 1.6]) {
        const ox = o * Math.SQRT1_2, oy = o * Math.SQRT1_2 * dir
        L.push(dir === 1 ? [P(cx + ox - 3, cy + oy + 3), P(cx + ox + 3, cy + oy - 3)] : [P(cx + ox - 3, cy - oy - 3), P(cx + ox + 3, cy - oy + 3)])
      }
    }
    group(7, 7, 1)
    group(19, 19, -1)
    add('soil', 'Terreno naturale', 'Terreni e inerti', 26, 26, L, [{ x: 19, y: 6, r: 0.45 }, { x: 6, y: 19, r: 0.45 }, { x: 13, y: 13, r: 0.35 }])
  }
  {
    // ghiaia: ciottoli ellittici che non si toccano
    const T = 30, rnd = rng(41)
    const stones: { x: number; y: number; r: number }[] = []
    for (let k = 0; k < 400 && stones.length < 16; k++) {
      const r = 1.4 + rnd() * 2
      const x = rnd() * T, y = rnd() * T
      const free = stones.every(s => {
        const dx = Math.abs(s.x - x), dy = Math.abs(s.y - y)
        return Math.hypot(Math.min(dx, T - dx), Math.min(dy, T - dy)) > s.r + r + 1.2
      })
      if (free) stones.push({ x, y, r })
    }
    add('gravel', 'Ghiaia / vespaio', 'Terreni e inerti', T, T,
      stones.flatMap(s => wrap(ellipse(s.x, s.y, s.r, s.r * (0.65 + rnd() * 0.3), rnd() * Math.PI), T, T)))
  }
  add('sand', 'Sabbia', 'Terreni e inerti', 20, 20, [], scatterDots(20, 20, 53, 26, 0.42))
  {
    const m = aggregate(40, 40, 61, 3, 1.2, 2, 0.5, 30, 0.32)
    add('lean', 'Magrone', 'Terreni e inerti', 40, 40, m.lines, m.dots)
  }
  {
    const T = 30, rnd = rng(71)
    const L: Point[][] = []
    for (let k = 0; k < 5; k++) L.push(ellipse(3 + rnd() * (T - 6), 3 + rnd() * (T - 6), 1 + rnd(), 0.8 + rnd() * 0.6, rnd() * Math.PI, 12))
    for (let k = 0; k < 6; k++) {
      const x = 2 + rnd() * (T - 4), y = 2 + rnd() * (T - 4), a = rnd() * Math.PI
      L.push([P(x - 1.5 * Math.cos(a), y - 1.5 * Math.sin(a)), P(x + 1.5 * Math.cos(a), y + 1.5 * Math.sin(a))])
    }
    add('fill', 'Riporto', 'Terreni e inerti', T, T, L, scatterDots(T, T, 73, 12, 0.35))
  }

  /* ---------- finiture e altro ---------- */
  add('xps', 'Isolante rigido (XPS/EPS)', 'Finiture e altro', 8, 8, [...diag(8, [0]), ...diag(8, [0], -1)])
  {
    // lana minerale: file di spirali come l'isolante dello strumento Involucro (semicerchi alterni)
    const h = 16, w = h / 2, r = h / 4
    const pts: Point[] = []
    const arc = (cx: number, cy: number, down: boolean) => {
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI - (Math.PI * i) / 8
        pts.push(P(cx + r * Math.cos(a), cy + (down ? 1 : -1) * r * Math.sin(a)))
      }
    }
    for (let k = -1; k <= 2; k++) {
      arc(k * w, h - r, true)
      arc((k + 0.5) * w, r, false)
    }
    add('wool', 'Lana minerale', 'Finiture e altro', w, h, [pts])
  }
  add('plaster', 'Intonaco / malta', 'Finiture e altro', 24, 24, [], scatterDots(24, 24, 83, 70, 0.32))
  {
    const rnd = rng(89)
    const L: Point[][] = []
    for (let k = 0; k < 3; k++) {
      const x = 2 + rnd() * 14, y = 2 + rnd() * 16
      L.push([P(x, y), P(x + 2, y)])
    }
    add('board', 'Cartongesso', 'Finiture e altro', 20, 20, L, scatterDots(20, 20, 97, 10, 0.4))
  }
  add('glass', 'Vetro', 'Finiture e altro', 40, 40,
    [-2.5, 0, 2.5].map(o => [P(15 + o, 25 + o), P(25 + o, 15 + o)]))
  add('membrane', 'Impermeabilizzazione', 'Finiture e altro', 6, 4,
    [wave(-3, 9, x => (((x % 3) + 3) % 3 < 1.5 ? 0.5 + 2 * (((x % 3) + 3) % 3) : 3.5 - 2 * ((((x % 3) + 3) % 3) - 1.5)), 1.5)])
  add('water', 'Acqua', 'Finiture e altro', 40, 16, [
    wave(4, 18, x => 5 + 1.1 * Math.sin((2 * Math.PI * (x - 4)) / 7), 0.5),
    wave(24, 38, x => 13 + 1.1 * Math.sin((2 * Math.PI * (x - 24)) / 7), 0.5),
  ])
  return defs
}

export const HATCHES: HatchDef[] = build()

export const hatchDef = (id?: HatchId) => (id ? HATCHES.find(h => h.id === id) : undefined)

/** spessore delle linee del retino (unità della tela), legato a quello del contorno */
export const hatchLineWidth = (strokeWidth?: number) => Math.max(0.25, (strokeWidth ?? 2) * 0.3)

const fmt = (v: number) => +v.toFixed(2)

/** tracciati SVG del modulo: linee e puntini */
export const hatchPaths = (() => {
  const cache = new Map<HatchId, { lines: string; dots: string }>()
  return (def: HatchDef) => {
    let c = cache.get(def.id)
    if (!c) {
      const lines = def.lines.map(pl => 'M ' + pl.map(p => `${fmt(p.x)} ${fmt(p.y)}`).join(' L ')).join(' ')
      const dots = def.dots.map(({ x, y, r }) =>
        `M ${fmt(x - r)} ${fmt(y)} a ${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(2 * r)} 0 a ${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(-2 * r)} 0 Z`).join(' ')
      c = { lines, dots }
      cache.set(def.id, c)
    }
    return c
  }
})()

/* ---------- geometria esplosa (export DXF) ---------- */

const inside = (p: Point, poly: Point[]) => {
  let r = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j]
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) r = !r
  }
  return r
}

/** ritaglio di un segmento sul rettangolo [x0,x1] × [y0,y1] (Liang–Barsky) */
const clipRect = (a: Point, b: Point, x0: number, y0: number, x1: number, y1: number): [Point, Point] | null => {
  const dx = b.x - a.x, dy = b.y - a.y
  let t0 = 0, t1 = 1
  const tests: [number, number][] = [[-dx, a.x - x0], [dx, x1 - a.x], [-dy, a.y - y0], [dy, y1 - a.y]]
  for (const [p, q] of tests) {
    if (p === 0) { if (q < 0) return null; continue }
    const t = q / p
    if (p < 0) { if (t > t1) return null; if (t > t0) t0 = t }
    else { if (t < t0) return null; if (t < t1) t1 = t }
  }
  if (t1 - t0 < 1e-9) return null
  return [P(a.x + t0 * dx, a.y + t0 * dy), P(a.x + t1 * dx, a.y + t1 * dy)]
}

/** parti di un segmento interne al poligono (regola pari–dispari) */
const clipPoly = (a: Point, b: Point, poly: Point[]): [Point, Point][] => {
  const dx = b.x - a.x, dy = b.y - a.y
  const ts = [0, 1]
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const p = poly[j], q = poly[i]
    const ex = q.x - p.x, ey = q.y - p.y
    const den = dx * ey - dy * ex
    if (Math.abs(den) < 1e-12) continue
    const t = ((p.x - a.x) * ey - (p.y - a.y) * ex) / den
    const u = ((p.x - a.x) * dy - (p.y - a.y) * dx) / den
    if (t > 0 && t < 1 && u >= 0 && u <= 1) ts.push(t)
  }
  ts.sort((x, y) => x - y)
  const out: [Point, Point][] = []
  for (let k = 0; k < ts.length - 1; k++) {
    const t0 = ts[k], t1 = ts[k + 1]
    if (t1 - t0 < 1e-9) continue
    const m = (t0 + t1) / 2
    if (!inside(P(a.x + m * dx, a.y + m * dy), poly)) continue
    const s = P(a.x + t0 * dx, a.y + t0 * dy), e = P(a.x + t1 * dx, a.y + t1 * dy)
    // unisce i tratti consecutivi della stessa retta
    const last = out[out.length - 1]
    if (last && Math.hypot(last[1].x - s.x, last[1].y - s.y) < 1e-9) last[1] = e
    else out.push([s, e])
  }
  return out
}

/**
 * Retino esploso dentro un poligono (coordinate della forma, prima della sua rotazione):
 * polilinee e puntini, con la stessa scala e lo stesso angolo del disegno a video.
 * Oltre `maxTiles` moduli restituisce null (retino troppo fitto per l'area).
 */
export function hatchGeometry(def: HatchDef, polygon: Point[], scale = 1, angle = 0, maxTiles = 40000) {
  const k = scale > 0 ? scale : 1
  const a = (angle * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
  const toPat = (p: Point) => P((c * p.x + s * p.y) / k, (-s * p.x + c * p.y) / k)
  const toWorld = (q: Point) => P(k * (c * q.x - s * q.y), k * (s * q.x + c * q.y))
  const Q = polygon.map(toPat)
  const xs = Q.map(p => p.x), ys = Q.map(p => p.y)
  const i0 = Math.floor(Math.min(...xs) / def.w), i1 = Math.floor(Math.max(...xs) / def.w)
  const j0 = Math.floor(Math.min(...ys) / def.h), j1 = Math.floor(Math.max(...ys) / def.h)
  if ((i1 - i0 + 1) * (j1 - j0 + 1) > maxTiles) return null
  /** polilinee: i tratti consecutivi di una stessa curva vengono uniti */
  const segs: Point[][] = []
  const dots: Dot[] = []
  const push = (p: Point, q: Point) => {
    const last = segs[segs.length - 1]
    const e = last?.[last.length - 1]
    if (e && Math.abs(e.x - p.x) < 1e-6 && Math.abs(e.y - p.y) < 1e-6) last.push(q)
    else segs.push([p, q])
  }
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      const ox = i * def.w, oy = j * def.h
      for (const pl of def.lines) {
        for (let n = 0; n < pl.length - 1; n++) {
          const r = clipRect(P(pl[n].x + ox, pl[n].y + oy), P(pl[n + 1].x + ox, pl[n + 1].y + oy), ox, oy, ox + def.w, oy + def.h)
          if (!r) continue
          for (const [p, q] of clipPoly(r[0], r[1], Q)) push(toWorld(p), toWorld(q))
        }
      }
      for (const d of def.dots) {
        const p = P(d.x + ox, d.y + oy)
        if (inside(p, Q)) dots.push({ ...toWorld(p), r: d.r * k })
      }
    }
  }
  return { segs, dots }
}
