import type { CableObject, Point } from '../types'

/**
 * Funi inox AISI 316 con terminali a forcella a pressare e tenditori forcella fresata / pressare
 * (dati di catalogo: terminali art. 201260–201275, tenditori art. 201001–201014).
 * Il punto di lavoro di ogni estremità è il centro del perno della forcella.
 */
export type InoxFork = {
  art: string
  /** Ø fune (mm) */
  rope: number
  /** apertura della forcella */
  C: number
  /** Ø perno */
  B: number
  /** Ø del corpo a pressare */
  D: number
  /** dal centro perno al fondo della forcella */
  E: number
}

export type InoxTurnbuckle = {
  art: string
  rope: number
  /** filetto M */
  A: number
  B: number
  C: number
  E: number
  /** lunghezza chiuso / aperto, dal centro perno all'uscita della fune (mm) */
  L: number
  L1: number
  /** carico di rottura (valore di catalogo) */
  load: number
}

// art, fune, C, B, D, E
const FORK_ROWS: [string, number, number, number, number, number][] = [
  ['201260', 2, 5, 4, 6, 9], ['201261', 2.5, 5, 5, 6, 10], ['201262', 3, 6, 5, 6, 11], ['201263', 4, 8, 6, 8, 13],
  ['201264', 5, 8, 8, 10, 17], ['201265', 6, 10, 10, 12, 18], ['201266', 7, 12, 12, 14, 22], ['201267', 8, 12, 12, 16, 23],
  ['201268', 10, 14, 14, 18, 31], ['201269', 12, 16, 16, 20, 32], ['201270', 14, 18, 20, 26, 39], ['201271', 16, 20, 24, 28, 42],
  ['201272', 18, 22, 28, 35.5, 48], ['201273', 20, 24, 32, 35.5, 55], ['201274', 22, 26, 36, 38, 61], ['201275', 24, 28, 40, 42, 68],
]
// art, fune, A (M), B, C, E, L, L1, carico di rottura
const TB_ROWS: [string, number, number, number, number, number, number, number, number][] = [
  ['201001', 2.5, 5, 4, 5, 8, 150, 200, 650], ['201002', 3, 6, 5, 5, 10, 160, 230, 900],
  ['201003', 4, 8, 6, 8, 12, 180, 250, 1700], ['201004', 5, 10, 8, 8, 16, 210, 290, 2500],
  ['201005', 6, 12, 10, 10, 18, 250, 330, 4100], ['201006', 7, 14, 12, 12, 20, 290, 370, 5100],
  ['201007', 8, 16, 12, 12, 20, 320, 430, 6400], ['201008', 10, 18, 14, 14, 24, 400, 510, 9800],
  ['201009', 12, 20, 16, 16, 28, 440, 590, 13500], ['201010', 14, 22, 20, 18, 36, 490, 640, 17800],
  ['201011', 16, 24, 24, 20, 42, 540, 720, 23000], ['201012', 18, 27, 26, 20, 45, 600, 780, 29000],
  ['201013', 20, 30, 30, 22, 54, 660, 870, 34500], ['201014', 22, 33, 32, 22, 58, 690, 910, 40500],
]

export const INOX_FORKS: InoxFork[] = FORK_ROWS.map(([art, rope, C, B, D, E]) => ({ art, rope, C, B, D, E }))
export const INOX_TURNBUCKLES: InoxTurnbuckle[] = TB_ROWS.map(([art, rope, A, B, C, E, L, L1, load]) => ({ art, rope, A, B, C, E, L, L1, load }))
export const INOX_SIZES = INOX_FORKS.map(f => f.rope)
export const DEFAULT_INOX_SIZE = 6

export const inoxFork = (d: number) => INOX_FORKS.find(f => f.rope === d) ?? INOX_FORKS.find(f => f.rope >= d) ?? INOX_FORKS[INOX_FORKS.length - 1]
export const inoxTurnbuckle = (d: number) => INOX_TURNBUCKLES.find(t => t.rope === d)

/** Lunghezza del corpo a pressare (stima: non in tabella) */
const swageLen = (d: number) => Math.round(6.5 * d + 15)
/** Larghezza della testa della forcella attorno al perno */
const headW = (B: number, D: number) => Math.max(D, B * 1.9)
/** Lunghezza del terminale a forcella dal centro perno all'uscita della fune */
export const forkLength = (f: InoxFork) => f.E + headW(f.B, f.D) * 0.35 + swageLen(f.rope)

/** Estremità A / B: tenditore se scelto e disponibile, altrimenti forcella se attiva */
export const endKind = (o: CableObject, end: 'start' | 'end'): 'turnbuckle' | 'fork' | 'none' => {
  if (o.turnbuckle === end && inoxTurnbuckle(o.size)) return 'turnbuckle'
  return (end === 'start' ? o.startSocket : o.endSocket) ? 'fork' : 'none'
}

/** Lunghezza del tenditore alla regolazione scelta (0 = chiuso L, 1 = aperto L¹) */
export const turnbuckleLength = (t: InoxTurnbuckle, open = 0.5) => t.L + (t.L1 - t.L) * Math.min(1, Math.max(0, open))

export const endLength = (o: CableObject, end: 'start' | 'end') => {
  const k = endKind(o, end)
  if (k === 'turnbuckle') return turnbuckleLength(inoxTurnbuckle(o.size)!, o.tbOpen ?? 0.5)
  if (k === 'fork') return forkLength(inoxFork(o.size))
  return 0
}

export const inoxLabel = (o: CableObject) => {
  const f = inoxFork(o.size)
  const parts = [`Fune inox Ø${String(o.size).replace('.', ',')} AISI 316`]
  const forks = (['start', 'end'] as const).filter(e => endKind(o, e) === 'fork').length
  if (forks) parts.push(`${forks === 2 ? '2× ' : ''}forcella ${f.art}`)
  const tb = (['start', 'end'] as const).some(e => endKind(o, e) === 'turnbuckle')
  if (tb) parts.push(`tenditore ${inoxTurnbuckle(o.size)!.art} M${inoxTurnbuckle(o.size)!.A}`)
  return parts.join(' + ')
}

/* ---------- disegno ---------- */

type Frame = { o: Point; u: Point; v: Point }
const at = (f: Frame, x: number, y: number) => ({ x: f.o.x + f.u.x * x + f.v.x * y, y: f.o.y + f.u.y * x + f.v.y * y })
const fmt = (p: Point) => `${+p.x.toFixed(2)} ${+p.y.toFixed(2)}`
const poly = (f: Frame, pts: [number, number][], close = true) =>
  `M ${pts.map(([x, y]) => fmt(at(f, x, y))).join(' L ')}${close ? ' Z' : ''} `
const circle = (f: Frame, x: number, y: number, r: number) => {
  const pts: [number, number][] = Array.from({ length: 24 }, (_, i) => [x + r * Math.cos((i * Math.PI) / 12), y + r * Math.sin((i * Math.PI) / 12)])
  return poly(f, pts)
}

/**
 * Forcella vista con il perno di fronte: testa arrotondata dietro al perno, fondo della forcella a E,
 * raccordo fino al corpo Ø D. Restituisce il contorno fino a x = xNeck e la larghezza del collo.
 */
function forkHead(f: Frame, B: number, D: number, E: number, neckR: number) {
  const hw = headW(B, D) / 2
  const xe = E + hw * 0.35
  // semicerchio dietro al perno, da (0, -hw) a (0, hw), poi fianchi fino al fondo della forcella e collo
  const arc: [number, number][] = Array.from({ length: 13 }, (_, i) => {
    const a = -Math.PI / 2 - (i * Math.PI) / 12
    return [hw * Math.cos(a), hw * Math.sin(a)]
  })
  const outline: [number, number][] = [...arc, [E, hw], [xe, neckR], [xe, -neckR], [E, -hw]]
  const thin = poly(f, [[E, -hw], [E, hw]], false) + circle(f, 0, 0, B / 2)
  return { outline: poly(f, outline), thin, xe, hw, hull: [at(f, -hw, -hw), at(f, -hw, hw), at(f, xe, -hw), at(f, xe, hw)] }
}

/** Corpo a pressare da x0, Ø D, lunghezza Ls, con smusso in uscita; la fune esce a x0 + Ls */
function swage(f: Frame, x0: number, D: number, Ls: number, d: number) {
  const r = D / 2, c = Math.min(r - d / 2, Ls * 0.15)
  const outline = poly(f, [[x0, -r], [x0 + Ls - c * 1.5, -r], [x0 + Ls, -r + c], [x0 + Ls, r - c], [x0 + Ls - c * 1.5, r], [x0, r]])
  // zona pressata (linea sottile)
  const thin = poly(f, [[x0 + Ls * 0.35, -r], [x0 + Ls * 0.35, r]], false)
  return { outline, thin, hull: [at(f, x0, -r), at(f, x0 + Ls, r)] }
}

/** Terminale a forcella: perno in (0,0), fune che esce verso +x */
function forkTerminal(f: Frame, fk: InoxFork) {
  const h = forkHead(f, fk.B, fk.D, fk.E, fk.D / 2)
  const s = swage(f, h.xe, fk.D, swageLen(fk.rope), fk.rope)
  return { outline: h.outline + s.outline, thin: h.thin + s.thin, hull: [...h.hull, ...s.hull], len: h.xe + swageLen(fk.rope) }
}

/** Tenditore forcella fresata / pressare: perno in (0,0), lunghezza totale Lt fino all'uscita della fune */
function turnbuckleDrawing(f: Frame, t: InoxTurnbuckle, fk: InoxFork, open: number) {
  const A = t.A
  const Lt = turnbuckleLength(t, open)
  const h = forkHead(f, t.B, A * 1.6, t.E, A * 0.8)
  const Ls = swageLen(t.rope)
  const Dsw = Math.max(fk.D, A * 1.1)
  const nutL = A * 0.8, nutH = A * 0.95
  const thread0 = A * 0.5 + (t.L1 - t.L) * open / 2
  // dal collo della forcella: filetto, dado, corpo, dado, filetto, corpo a pressare
  const xs = h.xe
  const xNut1 = xs + thread0
  const xBody0 = xNut1 + nutL
  const xSw = Lt - Ls
  const xNut2 = xSw - thread0 - nutL
  const xBody1 = xNut2
  const body = Math.max(A * 2, xBody1 - xBody0)
  const Rb = A * 0.85
  let outline = h.outline
  let thin = h.thin
  // filetti (contorno al Ø nominale, nocciolo sottile)
  const rod = (x0: number, x1: number) => {
    if (x1 <= x0) return
    outline += poly(f, [[x0, -A / 2], [x1, -A / 2], [x1, A / 2], [x0, A / 2]])
    thin += poly(f, [[x0, -A * 0.4], [x1, -A * 0.4]], false) + poly(f, [[x0, A * 0.4], [x1, A * 0.4]], false)
  }
  rod(xs, xNut1)
  rod(xBody0 + body, xSw)
  // dadi di bloccaggio (esagono di spigolo)
  const nut = (x0: number) => {
    outline += poly(f, [[x0, -nutH], [x0 + nutL, -nutH], [x0 + nutL, nutH], [x0, nutH]])
    thin += poly(f, [[x0, -nutH * 0.5], [x0 + nutL, -nutH * 0.5]], false) + poly(f, [[x0, nutH * 0.5], [x0 + nutL, nutH * 0.5]], false)
  }
  nut(xNut1)
  // corpo del tenditore con smussi
  const c = Rb * 0.3
  outline += poly(f, [[xBody0, -Rb + c], [xBody0 + c, -Rb], [xBody0 + body - c, -Rb], [xBody0 + body, -Rb + c],
    [xBody0 + body, Rb - c], [xBody0 + body - c, Rb], [xBody0 + c, Rb], [xBody0, Rb - c]])
  nut(Math.max(xBody0 + body, xNut2))
  const sw = swage(f, xSw, Dsw, Ls, t.rope)
  outline += sw.outline
  thin += sw.thin
  return { outline, thin, hull: [...h.hull, at(f, xBody0, -Rb), at(f, xBody0 + body, Rb), ...sw.hull], len: Lt }
}

export function inoxDrawing(o: CableObject) {
  const p1 = { x: o.x1, y: o.y1 }
  const p2 = { x: o.x2, y: o.y2 }
  const L = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1e-6
  const u = { x: (p2.x - p1.x) / L, y: (p2.y - p1.y) / L }
  const v = { x: -u.y, y: u.x }
  const angle = (Math.atan2(u.y, u.x) * 180) / Math.PI
  const fk = inoxFork(o.size)
  const tb = inoxTurnbuckle(o.size)
  let outline = '', thin = ''
  const hull: Point[] = []
  const ends: Record<'start' | 'end', number> = { start: 0, end: 0 }
  for (const end of ['start', 'end'] as const) {
    const k = endKind(o, end)
    if (k === 'none') continue
    const f: Frame = end === 'start' ? { o: p1, u, v } : { o: p2, u: { x: -u.x, y: -u.y }, v: { x: -v.x, y: -v.y } }
    const d = k === 'turnbuckle' ? turnbuckleDrawing(f, tb!, fk, o.tbOpen ?? 0.5) : forkTerminal(f, fk)
    outline += d.outline; thin += d.thin; hull.push(...d.hull)
    ends[end] = d.len
  }
  const r = o.size / 2
  const f = { o: p1, u, v }
  let rope = ''
  const a = ends.start, b = L - ends.end
  if (b > a) {
    const c = [at(f, a, -r), at(f, b, -r), at(f, b, r), at(f, a, r)]
    rope = `M ${c.map(fmt).join(' L ')} Z`
    hull.push(...c)
  }
  hull.push(p1, p2)
  return { outline, rope, thin, axis: `M ${fmt(p1)} L ${fmt(p2)}`, hull, angle, u, v }
}

/** Lunghezza della sola fune tra le uscite dai terminali (indicativa) */
export const inoxRopeLength = (o: CableObject) =>
  Math.max(0, Math.hypot(o.x2 - o.x1, o.y2 - o.y1) - endLength(o, 'start') - endLength(o, 'end'))
