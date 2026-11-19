import type { DeckObject, Point } from '../types'

/**
 * Lamiere grecate collaboranti (catalogo Tata Steel ComFlor).
 * Profilo trapezoidale descritto da passo, cresta, gola e altezza; il disegno parte dal centro di una cresta,
 * dove cade anche il giunto di sovrapposizione tra due lamiere.
 */
export type DeckThickness = {
  /** Spessore nominale (mm) */
  t: number
  /** Spessore di progetto (mm) */
  design: number
  /** Area della sezione (mm²/m) */
  area: number
  /** Peso del profilo (kN/m²) */
  weight: number
  /** Altezza dell'asse neutro (mm) */
  yna: number
  /** Momento d'inerzia, momento ultimo positivo e negativo (per metro) */
  I: number
  Msag: number
  Mhog: number
}

export type DeckProfile = {
  code: string
  name: string
  maker: string
  steel: string
  /** Larghezza utile di una lamiera (mm) */
  cover: number
  /** Passo delle greche (mm) */
  pitch: number
  /** Altezza (mm) */
  depth: number
  /** Larghezza della cresta (in alto) e della gola (in basso) (mm) */
  crown: number
  valley: number
  /** Nervature di irrigidimento al centro di creste e gole: larghezza e profondità (mm) */
  stiffener: { w: number; d: number }
  /** Volume dei vuoti delle greche sotto la soletta (m³/m²): volume getto = h − vuoti */
  voids: number
  /** Spessore minimo della soletta in tabella (mm) */
  minSlab: number
  thicknesses: DeckThickness[]
}

export const DECKS: DeckProfile[] = [
  {
    code: 'CF46', name: 'ComFlor 46', maker: 'Tata Steel', steel: 'S280GD+Z275',
    cover: 900, pitch: 225, depth: 46, crown: 67, valley: 105,
    stiffener: { w: 14, d: 4 },
    voids: 0.019, minSlab: 96,
    thicknesses: [
      { t: 0.9, design: 0.86, area: 1137, weight: 0.09, yna: 20.38, I: 41.5, Msag: 4.63, Mhog: 4.67 },
      { t: 1.2, design: 1.16, area: 1534, weight: 0.13, yna: 20.44, I: 53.0, Msag: 5.99, Mhog: 6.23 },
    ],
  },
]

export const DEFAULT_DECK = 'CF46'
export const deckProfile = (code: string) => DECKS.find(d => d.code === code) ?? DECKS[0]
export const deckThickness = (o: DeckObject) => {
  const p = deckProfile(o.profile)
  return p.thicknesses.find(t => t.t === o.thickness) ?? p.thicknesses[0]
}

/** Lunghezza della linea disegnata */
export const deckSpan = (o: DeckObject) => Math.hypot(o.x2 - o.x1, o.y2 - o.y1)
/** In sezione e dall'alto la linea è la larghezza; in vista laterale è la lunghezza della lamiera */
export const deckWidth = (o: DeckObject) => (o.view === 'side' ? o.width : deckSpan(o))
export const deckLength = (o: DeckObject) => (o.view === 'side' ? deckSpan(o) : o.length)

/** Lamiere intere e larghezza dell'ultima tagliata (0 se nessuna) */
export const deckSheets = (o: DeckObject) => {
  const cover = deckProfile(o.profile).cover
  const W = deckWidth(o)
  const full = Math.floor(W / cover + 1e-6)
  const cut = W - full * cover
  return { full, cut: cut > 0.5 ? cut : 0, total: full + (cut > 0.5 ? 1 : 0) }
}

/** Peso dell'acciaio (kg), da peso del profilo in kN/m² */
export const deckSteelMass = (o: DeckObject) =>
  (deckThickness(o).weight * 1000 / 9.81) * (deckWidth(o) / 1000) * (deckLength(o) / 1000)

/** Volume del getto (m³/m²) e totale (m³) */
export const slabVolume = (o: DeckObject) => {
  if (!o.slab) return { perM2: 0, total: 0 }
  const perM2 = Math.max(0, o.slab / 1000 - deckProfile(o.profile).voids)
  return { perM2, total: perM2 * (deckWidth(o) / 1000) * (deckLength(o) / 1000) }
}

export const deckLabel = (o: DeckObject) => {
  const p = deckProfile(o.profile)
  const t = deckThickness(o).t.toFixed(2).replace('.', ',')
  return `${p.name} sp. ${t}${o.slab ? ` · soletta ${o.slab}` : ''}`
}

/* ---------- pioli ---------- */

/** Pioli a testa (ISO 13918, SD): diametro gambo → diametro e altezza della testa */
export const STUD_SIZES: { d: number; head: number; k: number }[] = [
  { d: 16, head: 29, k: 8 },
  { d: 19, head: 32, k: 10 },
  { d: 22, head: 35, k: 10 },
]
/** Distanza dell'asse della trave d'estremità dal bordo della lamiera (metà della trave da 152 mm del manuale) */
export const END_BEAM_OFFSET = 76

export const studSpec = (o: DeckObject) => {
  const d = o.studD ?? 19
  const size = STUD_SIZES.find(s => s.d === d) ?? STUD_SIZES[1]
  return { ...size, h: o.studH ?? 95, per: o.studsPerTrough === 2 ? 2 : 1 }
}

/** Posizioni (lungo la larghezza) del centro delle gole */
export const troughCenters = (o: DeckObject) => {
  const p = deckProfile(o.profile)
  const W = deckWidth(o)
  const xs: number[] = []
  for (let x = p.pitch / 2; x <= W - p.valley / 2 + 1e-6; x += p.pitch) xs.push(x)
  return xs
}

/** Posizioni (lungo la lunghezza) degli assi delle travi con i pioli */
export const beamPositions = (o: DeckObject) => {
  const Lg = deckLength(o)
  const a = Math.min(END_BEAM_OFFSET, Lg / 2)
  const b = Lg - a
  const ys = [a]
  const s = o.beamSpacing ?? 0
  if (s > 0) for (let y = a + s; y < b - 1; y += s) ys.push(y)
  if (b - a > 1) ys.push(b)
  return ys
}

/** Numero di pioli: per trave e totale */
export const studCount = (o: DeckObject) => {
  const perBeam = troughCenters(o).length * studSpec(o).per
  const beams = beamPositions(o).length
  return { perBeam, beams, total: perBeam * beams }
}

/* ---------- geometria ---------- */

/** Punti di un tratto di profilo da x0 a x1 (coordinate locali: x lungo la linea, y in altezza) */
function profilePoints(p: DeckProfile, x0: number, x1: number): Point[] {
  const web = (p.pitch - p.crown - p.valley) / 2
  const hc = p.crown / 2
  const { w: sw, d: sd } = p.stiffener
  const s = p.depth
  // un passo, partendo dal centro della cresta (con la nervatura a cavallo dello zero)
  const unit: Point[] = [
    { x: 0, y: s - sd }, { x: sw / 2 - 2, y: s - sd }, { x: sw / 2, y: s },
    { x: hc, y: s },
    { x: hc + web, y: 0 },
    { x: hc + web + p.valley / 2 - sw / 2, y: 0 }, { x: hc + web + p.valley / 2 - sw / 2 + 2, y: sd },
    { x: hc + web + p.valley / 2 + sw / 2 - 2, y: sd }, { x: hc + web + p.valley / 2 + sw / 2, y: 0 },
    { x: hc + web + p.valley, y: 0 },
    { x: p.pitch - hc, y: s },
    { x: p.pitch - sw / 2, y: s }, { x: p.pitch - sw / 2 + 2, y: s - sd },
  ]
  const pts: Point[] = []
  const at = (x: number) => {
    // altezza del profilo in x (interpolazione lineare sul passo)
    const xm = ((x % p.pitch) + p.pitch) % p.pitch
    const u = [...unit, { x: p.pitch, y: s - sd }]
    for (let i = 1; i < u.length; i++) {
      if (xm <= u[i].x) {
        const a = u[i - 1], b = u[i]
        return a.y + ((b.y - a.y) * (xm - a.x)) / (b.x - a.x || 1)
      }
    }
    return s
  }
  pts.push({ x: x0, y: at(x0) })
  const first = Math.floor(x0 / p.pitch)
  for (let k = first; k * p.pitch <= x1; k++) {
    for (const q of unit) {
      const x = k * p.pitch + q.x
      if (x > x0 && x < x1) pts.push({ x, y: q.y })
    }
  }
  pts.push({ x: x1, y: at(x1) })
  return pts
}

type Frame = { o: Point; u: Point; v: Point }
const at = (f: Frame, x: number, y: number): Point => ({ x: f.o.x + f.u.x * x + f.v.x * y, y: f.o.y + f.u.y * x + f.v.y * y })
const fmt = (p: Point) => `${+p.x.toFixed(2)} ${+p.y.toFixed(2)}`
const poly = (pts: Point[], close = false) => `M ${pts.map(fmt).join(' L ')}${close ? ' Z' : ''} `

/** Piolo visto di lato: gambo dal fondo della gola e testa in cima */
function studOutline(P: (x: number, y: number) => Point, x: number, s: { d: number; head: number; k: number; h: number }) {
  const r = s.d / 2, R = s.head / 2
  return poly([P(x - r, 0), P(x - r, s.h - s.k), P(x - R, s.h - s.k), P(x - R, s.h), P(x + R, s.h), P(x + R, s.h - s.k), P(x + r, s.h - s.k), P(x + r, 0)], true)
}

const circle = (c: Point, r: number) =>
  `M ${fmt({ x: c.x - r, y: c.y })} a ${+r.toFixed(2)} ${+r.toFixed(2)} 0 1 0 ${+(2 * r).toFixed(2)} 0 a ${+r.toFixed(2)} ${+r.toFixed(2)} 0 1 0 ${+(-2 * r).toFixed(2)} 0 Z `

/**
 * Disegno della lamiera in coordinate mondo.
 * - deck: lamiera (linea media), oppure contorni nelle viste dall'alto/laterale
 * - slab: contorno del getto (riempito)
 * - thin: giunti tra le lamiere e linee secondarie
 * - hidden: linee nascoste (greche sotto il getto, vista dall'alto)
 */
export function deckDrawing(o: DeckObject) {
  const p = deckProfile(o.profile)
  const p1 = { x: o.x1, y: o.y1 }
  const L = deckSpan(o) || 1e-6
  const u = { x: (o.x2 - o.x1) / L, y: (o.y2 - o.y1) / L }
  // "sopra" la linea = verso l'alto sullo schermo, in qualunque verso sia stata disegnata
  // (linea verticale: verso sinistra)
  let v = { x: u.y, y: -u.x }
  if (v.y > 1e-9 || (Math.abs(v.y) <= 1e-9 && v.x > 0)) v = { x: -v.x, y: -v.y }
  const f: Frame = { o: p1, u, v }
  const P = (x: number, y: number) => at(f, x, y)
  const angle = (Math.atan2(u.y, u.x) * 180) / Math.PI

  let deck = '', slab = '', thin = '', hidden = '', studs = ''
  const hull: Point[] = [p1, { x: o.x2, y: o.y2 }]
  const W = deckWidth(o)
  const cover = p.cover

  if (o.view === 'section') {
    const pts = profilePoints(p, 0, W)
    deck = poly(pts.map(q => P(q.x, q.y)))
    // giunti di sovrapposizione: risvolto di 10 mm della lamiera successiva
    for (let x = cover; x < W - 1; x += cover) {
      const y = p.depth - p.stiffener.d
      thin += poly([P(x - 4, y + 8.7), P(x + 1, y)])
    }
    const top = Math.max(o.slab || 0, p.depth)
    if (o.slab) {
      const ring = [...pts, { x: W, y: top }, { x: 0, y: top }].map(q => P(q.x, q.y))
      slab = poly(ring, true)
    }
    if (o.studs) {
      // un piolo al centro di ogni gola, sulla trave (la linea); con 2 per gola il secondo sta dietro
      const s = studSpec(o)
      for (const x of troughCenters(o)) studs += studOutline(P, x, s)
    }
    hull.push(P(0, Math.max(top, o.studs ? studSpec(o).h : 0)), P(W, top))
  } else if (o.view === 'top') {
    // vista dall'alto: la linea è la larghezza, la lunghezza va in perpendicolare
    const Lg = o.length
    const rect = [P(0, 0), P(W, 0), P(W, Lg), P(0, Lg)]
    const web = (p.pitch - p.crown - p.valley) / 2
    let ribs = ''
    for (let k = 0; k * p.pitch < W + p.pitch; k++) {
      const base = k * p.pitch
      // bordi delle creste (spigoli in alto) e delle gole (spigoli in basso)
      for (const x of [base + p.crown / 2, base + p.crown / 2 + web, base + p.crown / 2 + web + p.valley, base + p.pitch - p.crown / 2]) {
        if (x > 0.5 && x < W - 0.5) ribs += poly([P(x, 0), P(x, Lg)])
      }
    }
    let joints = ''
    for (let x = cover; x < W - 1; x += cover) joints += poly([P(x, 0), P(x, Lg)])
    if (o.studs) {
      // vista dall'alto: testa e gambo come due cerchi, sulle travi
      const s = studSpec(o)
      const offs = s.per === 2 ? [-2 * s.d, 2 * s.d] : [0]
      for (const y of beamPositions(o)) {
        for (const x of troughCenters(o)) {
          for (const dy of offs) studs += circle(P(x, y + dy), s.head / 2) + circle(P(x, y + dy), s.d / 2)
        }
      }
      for (const y of beamPositions(o)) thin += poly([P(0, y), P(W, y)])
    }
    if (o.slab) {
      slab = poly(rect, true)
      hidden = ribs + joints
    } else {
      deck = poly(rect, true)
      thin = ribs
      deck += joints
    }
    hull.push(...rect)
  } else {
    // vista laterale, lungo le greche: la linea è la lunghezza della lamiera
    const Lg = L
    const top = o.slab ? Math.max(o.slab, p.depth) : p.depth
    deck = poly([P(0, 0), P(Lg, 0), P(Lg, p.depth), P(0, p.depth)], true)
    if (o.slab) slab = poly([P(0, p.depth), P(Lg, p.depth), P(Lg, top), P(0, top)], true)
    if (o.studs) {
      const s = studSpec(o)
      const offs = s.per === 2 ? [-2 * s.d, 2 * s.d] : [0]
      for (const y of beamPositions(o)) for (const dy of offs) studs += studOutline(P, y + dy, s)
    }
    hull.push(P(0, Math.max(top, o.studs ? studSpec(o).h : 0)), P(Lg, top))
  }

  return { deck, slab, thin, hidden, studs, hull, angle, u, v, frame: f }
}

export function deckBounds(o: DeckObject) {
  const { hull } = deckDrawing(o)
  const xs = hull.map(p => p.x)
  const ys = hull.map(p => p.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

/** Posizione dell'etichetta: sopra la lamiera (o il getto), a metà linea */
export function deckLabelPlacement(o: DeckObject) {
  const dr = deckDrawing(o)
  const p = deckProfile(o.profile)
  const span = deckSpan(o)
  const above = o.view === 'top' ? o.length : Math.max(o.slab || 0, p.depth)
  // in pianta la lamiera è grande: la scritta cresce con le dimensioni per restare leggibile
  const fs = o.view === 'top' ? Math.max(14, Math.min(deckWidth(o), o.length) * 0.03) : Math.max(14, p.depth * 0.6)
  const textAngle = dr.angle > 90 || dr.angle < -90 ? dr.angle + 180 : dr.angle
  const pos = at(dr.frame, span / 2, above + fs * 0.9)
  return { pos, angle: textAngle, fontSize: fs }
}

/* ---------- retino calcestruzzo ---------- */

/**
 * Modulo del retino per il calcestruzzo, sul modello dell'AR-CONC di AutoCAD:
 * puntini sparsi e piccoli triangoli (inerti) ruotati a caso. Misure in mm, modulo 100 × 100.
 */
export const CONCRETE_TILE = 100

export const concreteHatch = (() => {
  // pseudo-casuale con seme fisso: il retino è sempre uguale
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
  const tri: string[] = []
  const dots: string[] = []
  const T = CONCRETE_TILE
  // triangoli su una griglia sfalsata, per una distribuzione uniforme senza addensamenti
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (rnd() < 0.35) continue
      const cx = (i + 0.5 + (rnd() - 0.5) * 0.6) * (T / 4)
      const cy = (j + 0.5 + (rnd() - 0.5) * 0.6) * (T / 4)
      const r = 3.5 + rnd() * 3
      const a0 = rnd() * Math.PI * 2
      const pts = [0, 1, 2].map(k => {
        const a = a0 + (k * 2 * Math.PI) / 3 + (rnd() - 0.5) * 0.5
        return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`
      })
      tri.push(`M ${pts.join(' L ')} Z`)
    }
  }
  for (let k = 0; k < 28; k++) {
    const x = rnd() * T, y = rnd() * T
    const r = 0.5 + rnd() * 0.5
    dots.push(`M ${(x - r).toFixed(2)} ${y.toFixed(2)} a ${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(2 * r).toFixed(2)} 0 a ${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-2 * r).toFixed(2)} 0 Z`)
  }
  return { triangles: tri.join(' '), dots: dots.join(' ') }
})()
