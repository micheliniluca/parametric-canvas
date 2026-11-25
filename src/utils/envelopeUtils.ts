import type { EnvelopeObject, Point, SeamObject } from '../types'

/**
 * Elementi d'involucro in sezione, disegnati con una linea come la lamiera grecata:
 * la linea è la faccia d'appoggio, lo spessore cresce verso l'alto dello schermo
 * (linea verticale: verso sinistra), oppure dall'altra parte con "flip".
 * - envelope: isolante (retino a spirale), pannello sandwich, vetrata
 * - seam: copertura a giunti aggraffati (standing seam)
 * Tutte le misure in mm.
 */

type Frame = { o: Point; u: Point; v: Point; L: number; angle: number }

const frameOf = (o: { x1: number; y1: number; x2: number; y2: number; flip?: boolean }): Frame => {
  const L = Math.hypot(o.x2 - o.x1, o.y2 - o.y1) || 1e-6
  const u = { x: (o.x2 - o.x1) / L, y: (o.y2 - o.y1) / L }
  let v = { x: u.y, y: -u.x }
  if (v.y > 1e-9 || (Math.abs(v.y) <= 1e-9 && v.x > 0)) v = { x: -v.x, y: -v.y }
  if (o.flip) v = { x: -v.x, y: -v.y }
  return { o: { x: o.x1, y: o.y1 }, u, v, L, angle: (Math.atan2(u.y, u.x) * 180) / Math.PI }
}

const at = (f: Frame, x: number, y: number): Point => ({ x: f.o.x + f.u.x * x + f.v.x * y, y: f.o.y + f.u.y * x + f.v.y * y })
const fmt = (p: Point) => `${+p.x.toFixed(2)} ${+p.y.toFixed(2)}`
const polyD = (pts: Point[], close = false) => (pts.length > 1 ? `M ${pts.map(fmt).join(' L ')}${close ? ' Z' : ''} ` : '')

/** Disegno in coordinate mondo */
export type EnvelopeDrawing = {
  /** aree riempite col colore di riempimento e contornate */
  fill: string
  /** linee principali */
  lines: string
  /** linee sottili (retino, giunti, intercalari) */
  thin: string
  /** aree piene nel colore del tratto (distanziatori, teste delle aggraffature) */
  solid: string
  /** strati con un colore proprio (parete Aquapanel), sotto alle altre linee */
  layers?: { d: string; color: string }[]
  /** linee tratteggiate (rete di armatura, telo) */
  dashed?: string
  hull: Point[]
  frame: Frame
}

/* ---------- isolante ---------- */

/**
 * Retino dell'isolante morbido a spirale: archi in alto e in basso uniti da tratti obliqui che si incrociano.
 * Passo = metà spessore, raggio degli archi = un quarto dello spessore.
 */
const coil = (P: (x: number, y: number) => Point, L: number, t: number, x0 = 0, y0 = 0, steps = 6): string => {
  const p = t / 2, r = t / 4
  const arc = (cx: number, cy: number, top: boolean) => {
    const pts: Point[] = []
    for (let i = 0; i <= steps; i++) {
      const a = Math.PI - (Math.PI * i) / steps
      pts.push(P(x0 + cx + r * Math.cos(a), y0 + cy + (top ? 1 : -1) * r * Math.sin(a)))
    }
    return pts
  }
  const pts: Point[] = []
  for (let k = 1; k * p + r <= L + 1e-6; k++) {
    pts.push(...arc(k * p, t - r, true))
    if ((k + 0.5) * p + r <= L + 1e-6) pts.push(...arc((k + 0.5) * p, r, false))
  }
  return polyD(pts)
}

/* ---------- parete Aquapanel Outdoor ---------- */

/** Spessori del sistema Knauf Aquapanel Outdoor (manuale 10/2012) */
export const AQ = {
  board: 12.5,
  /** lastra interna in gesso rivestito */
  inner: 12.5,
  /** ali dei montanti C 50/xx/50 e risvolti */
  flange: 50,
  lip: 6,
  studs: [50, 75, 100, 150],
}

export const aquapanelLayers = (o: EnvelopeObject) => {
  const r = o.aqRender ?? 5
  const frames = o.aqFrames ?? 1
  const d1 = o.aqStud ?? 75
  const d2 = frames === 2 ? o.aqInnerStud ?? 50 : 0
  const gap = frames === 2 ? o.aqGap ?? 10 : 0
  const nb = Math.max(0, Math.round(o.aqBoards ?? 1))
  return { r, frames, d1, d2, gap, nb, total: r + AQ.board + d1 + gap + d2 + nb * AQ.inner }
}

/** Sezione orizzontale della parete Aquapanel: strati, montanti C a interasse, isolante tra i montanti */
function aquapanelDrawing(o: EnvelopeObject, P: (x: number, y: number) => Point, L: number) {
  const { r, frames, d1, d2, gap, nb } = aquapanelLayers(o)
  const rect = (y0: number, y1: number) => polyD([P(0, y0), P(L, y0), P(L, y1), P(0, y1)], true)
  const layers: { d: string; color: string }[] = []
  let lines = '', thin = '', dashed = ''
  // rasatura (Exterior Basecoat con rete) e lastra Aquapanel Outdoor
  layers.push({ d: rect(0, r), color: '#f5f5f4' })
  dashed += polyD([P(0, r * 0.55), P(L, r * 0.55)])
  let y = r
  layers.push({ d: rect(y, y + AQ.board), color: '#d6d3d1' })
  y += AQ.board
  // Tyvek StuccoWrap sul retro della lastra
  dashed += polyD([P(0, y + 0.8), P(L, y + 0.8)])
  const spacing = Math.max(100, o.aqSpacing ?? 600)
  const frame = (y0: number, d: number) => {
    const xs: number[] = []
    for (let x = 0; x + AQ.flange <= L + 1e-6; x += spacing) xs.push(x)
    for (const x of xs) {
      // montante C: anima perpendicolare alla parete, ali lungo le facce, piccoli risvolti
      lines += polyD([
        P(x + AQ.flange, y0 + AQ.lip), P(x + AQ.flange, y0), P(x, y0),
        P(x, y0 + d), P(x + AQ.flange, y0 + d), P(x + AQ.flange, y0 + d - AQ.lip),
      ])
    }
    if (o.aqInsulation !== false) {
      const bays = [...xs, L]
      for (let i = 0; i < bays.length - 1; i++) {
        if (bays[i + 1] - bays[i] > d / 2) thin += coil(P, bays[i + 1] - bays[i], d, bays[i], y0)
      }
    }
  }
  frame(y, d1)
  y += d1
  if (frames === 2) {
    y += gap
    frame(y, d2)
    y += d2
  }
  // lastre interne in gesso rivestito
  for (let i = 0; i < nb; i++) {
    layers.push({ d: rect(y, y + AQ.inner), color: '#f8fafc' })
    y += AQ.inner
  }
  return { layers, lines, thin, dashed, top: y }
}

/* ---------- vetro ---------- */

export type GlassLayer = { kind: 'pane' | 'interlayer' | 'cavity'; t: number }

/**
 * Composizione della vetrata nella notazione corrente, dall'esterno (lato linea) verso l'interno:
 * "6/16/6" = lastra 6, intercapedine 16, lastra 6; "33.1" o "44.2" = stratificato (3+3 o 4+4 con 1 o 2 PVB da 0,38).
 */
export const parseGlazing = (s: string): GlassLayer[] => {
  const out: GlassLayer[] = []
  s.split('/').map(x => x.trim()).filter(Boolean).forEach((tok, i) => {
    const n = parseFloat(tok.replace(',', '.'))
    if (i % 2 === 1) {
      if (n > 0) out.push({ kind: 'cavity', t: n })
      return
    }
    const lam = /^(\d)(\d)\.(\d)$/.exec(tok)
    if (lam) {
      out.push({ kind: 'pane', t: +lam[1] }, { kind: 'interlayer', t: +lam[3] * 0.38 }, { kind: 'pane', t: +lam[2] })
    } else if (n > 0) out.push({ kind: 'pane', t: n })
  })
  return out
}

export const glazingThickness = (s: string) => parseGlazing(s).reduce((a, l) => a + l.t, 0)

/* ---------- disegno ---------- */

export const ENVELOPE_KINDS: { id: EnvelopeObject['kind']; label: string; fill: string }[] = [
  { id: 'insulation', label: 'Isolante', fill: '#fef9c3' },
  { id: 'sandwich', label: 'Pannello sandwich', fill: '#fef9c3' },
  { id: 'glass', label: 'Vetro', fill: '#dbeafe' },
  { id: 'aquapanel', label: 'Aquapanel Outdoor', fill: '#d6d3d1' },
]

export const envelopeThickness = (o: EnvelopeObject) =>
  o.kind === 'glass' ? glazingThickness(o.glazing ?? '6/16/6') : o.kind === 'aquapanel' ? aquapanelLayers(o).total : o.thickness

export function envelopeDrawing(o: EnvelopeObject): EnvelopeDrawing {
  const f = frameOf(o)
  const P = (x: number, y: number) => at(f, x, y)
  const L = f.L
  let fill = '', lines = '', thin = '', solid = '', dashed = ''
  let layers: { d: string; color: string }[] = []
  let top = envelopeThickness(o)

  if (o.kind === 'insulation') {
    const t = o.thickness
    fill = polyD([P(0, 0), P(L, 0), P(L, t), P(0, t)], true)
    thin = coil(P, L, t)
  } else if (o.kind === 'sandwich') {
    const t = o.thickness
    // faccia esterna (in alto): piana o con greche trapezoidali
    const outer: Point[] = [P(0, t)]
    if (o.ribs === 'roof') {
      const pitch = Math.max(50, o.ribPitch ?? 250)
      const h = Math.max(5, o.ribHeight ?? 40)
      const base = pitch * 0.24, crown = pitch * 0.1
      // greche centrate sui moduli del pannello
      for (let c = pitch / 2; c + base / 2 <= L; c += pitch) {
        outer.push(P(c - base / 2, t), P(c - crown / 2, t + h), P(c + crown / 2, t + h), P(c + base / 2, t))
      }
      top = t + h
    }
    outer.push(P(L, t))
    // nucleo: tra la lamiera interna (sulla linea) e quella esterna
    fill = polyD([P(0, 0), P(L, 0), ...outer.slice().reverse()], true)
    lines = polyD(outer)
    // seconda linea per lo spessore delle lamiere, se si vede
    const skin = o.skin ?? 0.5
    lines += polyD([P(0, skin), P(L, skin)])
    // giunti tra i pannelli (larghezza utile)
    const module = o.module ?? 1000
    if (module > 0) for (let x = module; x < L - 1; x += module) thin += polyD([P(x, 0), P(x, t)])
  } else if (o.kind === 'aquapanel') {
    const aq = aquapanelDrawing(o, P, L)
    ;({ layers, lines, thin, dashed } = aq)
    top = aq.top
  } else {
    // vetrata: lastre, intercalari, intercapedini con distanziatore alle estremità
    let y = 0
    const spacer = Math.min(12, L / 4)
    for (const l of parseGlazing(o.glazing ?? '6/16/6')) {
      if (l.kind === 'pane') fill += polyD([P(0, y), P(L, y), P(L, y + l.t), P(0, y + l.t)], true)
      else if (l.kind === 'interlayer') thin += polyD([P(0, y + l.t / 2), P(L, y + l.t / 2)])
      else {
        solid += polyD([P(0, y), P(spacer, y), P(spacer, y + l.t), P(0, y + l.t)], true)
        solid += polyD([P(L - spacer, y), P(L, y), P(L, y + l.t), P(L - spacer, y + l.t)], true)
      }
      y += l.t
    }
  }

  return { fill, lines, thin, solid, layers, dashed, hull: [P(0, 0), P(L, 0), P(L, top), P(0, top)], frame: f }
}

/* ---------- standing seam ---------- */

export const SEAM_TYPES: { id: SeamObject['seam']; label: string }[] = [
  { id: 'double', label: 'Doppia aggraffatura' },
  { id: 'angle', label: 'Aggraffatura angolare' },
  { id: 'snap', label: 'A scatto' },
]

/**
 * Copertura a giunti aggraffati: lamiera (linea media) con le nervature verticali al passo di posa.
 * Le nervature sono centrate sulla linea; la testa dipende dal tipo di aggraffatura.
 */
export function seamDrawing(o: SeamObject): EnvelopeDrawing {
  const f = frameOf(o)
  const P = (x: number, y: number) => at(f, x, y)
  const L = f.L
  const h = Math.max(10, o.height)
  const pitch = Math.max(100, o.pitch)
  const g = 1.2 // distanza tra i due risvolti della nervatura
  let lines = '', solid = ''
  const seams: number[] = []
  const n = Math.floor(L / pitch)
  for (let k = 0; k <= n; k++) {
    const x = (L - n * pitch) / 2 + k * pitch
    if (x > g && x < L - g) seams.push(x)
  }
  // lamiera: tratti piani e risvolti verticali, con la testa delle aggraffature
  const pan: Point[] = [P(0, 0)]
  for (const x of seams) {
    pan.push(P(x - g, 0), P(x - g, h))
    lines += polyD(pan)
    pan.length = 0
    pan.push(P(x + g, h), P(x + g, 0))
    if (o.seam === 'double') {
      // testa ripiegata due volte: blocchetto 8 × 10
      solid += polyD([P(x - 4, h - 10), P(x + 4, h - 10), P(x + 4, h), P(x - 4, h)], true)
    } else if (o.seam === 'angle') {
      // risvolto piegato a 90°
      solid += polyD([P(x - g, h - 4), P(x + 9, h - 4), P(x + 9, h), P(x - g, h)], true)
    } else {
      // coprigiunto arrotondato
      const pts: Point[] = []
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI - (Math.PI * i) / 8
        pts.push(P(x + 4 * Math.cos(a), h - 3 + 5 * Math.sin(a)))
      }
      pts.push(P(x + 4, h - 7), P(x - 4, h - 7))
      solid += polyD(pts, true)
    }
  }
  pan.push(P(L, 0))
  lines += polyD(pan)
  return { fill: '', lines, thin: '', solid, hull: [P(0, 0), P(L, 0), P(L, h + 1), P(0, h + 1)], frame: f }
}

/* ---------- etichette e ingombri ---------- */

export const envelopeLabel = (o: EnvelopeObject): string => {
  if (o.kind === 'glass') return `Vetro ${o.glazing ?? '6/16/6'} (${+glazingThickness(o.glazing ?? '6/16/6').toFixed(2)} mm)`
  if (o.kind === 'aquapanel') {
    const a = aquapanelLayers(o)
    const studs = a.frames === 2 ? `C${a.d1} + C${a.d2}` : `C${a.d1}`
    return `Aquapanel Outdoor · ${studs} i${o.aqSpacing ?? 600} · ${a.nb ? `${a.nb}×12,5 int.` : 'senza lastre int.'} · ${+a.total.toFixed(1)} mm`
  }
  if (o.kind === 'sandwich') return `Pannello sandwich ${o.thickness}${o.ribs === 'roof' ? ' copertura' : ''}`
  return `Isolante ${o.thickness}`
}

export const seamLabel = (o: SeamObject): string =>
  `${SEAM_TYPES.find(s => s.id === o.seam)?.label ?? 'Aggraffatura'} h ${o.height} · passo ${o.pitch}`

const boundsOf = (hull: Point[]) => {
  const xs = hull.map(p => p.x), ys = hull.map(p => p.y)
  const x = Math.min(...xs), y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

export const envelopeBounds = (o: EnvelopeObject) => boundsOf(envelopeDrawing(o).hull)
export const seamBounds = (o: SeamObject) => boundsOf(seamDrawing(o).hull)

/** Etichetta sopra l'elemento, a metà linea, sempre leggibile */
export const labelPlacement = (dr: EnvelopeDrawing, above: number) => {
  const fs = Math.max(14, Math.min(40, above * 0.4))
  const textAngle = dr.frame.angle > 90 || dr.frame.angle < -90 ? dr.frame.angle + 180 : dr.frame.angle
  return { pos: at(dr.frame, dr.frame.L / 2, above + fs * 0.9), angle: textAngle, fontSize: fs }
}
