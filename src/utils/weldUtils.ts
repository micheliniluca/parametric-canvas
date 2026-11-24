import type { Point, WeldObject } from '../types'

/**
 * Simbolo di saldatura secondo ISO 2553 (sistema A) o AWS A2.4, con il cordone in sezione (opzionale).
 * (x1, y1) = punta della freccia, sul giunto; (x2, y2) = inizio della linea di riferimento.
 * La linea di riferimento è orizzontale e prosegue dalla parte opposta alla freccia.
 */

export type WeldKind = WeldObject['kind']

export const WELD_KINDS: { id: WeldKind; label: string; both: string }[] = [
  { id: 'fillet', label: "D'angolo", both: "D'angolo su due lati" },
  { id: 'I', label: 'Testa a testa a lembi retti (I)', both: 'I da due lati' },
  { id: 'V', label: 'A V', both: 'A X (doppia V)' },
  { id: 'bevel', label: 'A mezza V', both: 'A K (doppia mezza V)' },
  { id: 'Y', label: 'A Y', both: 'A doppia Y' },
  { id: 'bevelY', label: 'A mezza Y', both: 'A doppia mezza Y' },
  { id: 'U', label: 'A U', both: 'A doppia U' },
  { id: 'J', label: 'A J', both: 'A doppia J' },
]

export const WELD_PROCESSES: { code: string; label: string }[] = [
  { code: '', label: '—' },
  { code: '111', label: '111 elettrodo rivestito' },
  { code: '135', label: '135 MAG filo pieno' },
  { code: '136', label: '136 MAG filo animato' },
  { code: '138', label: '138 MAG filo animato metallico' },
  { code: '141', label: '141 TIG' },
  { code: '121', label: '121 arco sommerso' },
  { code: 'SMAW', label: 'SMAW (AWS)' },
  { code: 'GMAW', label: 'GMAW (AWS)' },
  { code: 'FCAW', label: 'FCAW (AWS)' },
  { code: 'GTAW', label: 'GTAW (AWS)' },
  { code: 'SAW', label: 'SAW (AWS)' },
]

const fmt = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',')

export const isButt = (o: Pick<WeldObject, 'kind'>) => o.kind !== 'fillet'

/** Lato del cordone d'angolo (mm): z = a·√2 in ISO quando si dà la gola, lato diretto in AWS */
export const filletLeg = (o: WeldObject): number => {
  const s = o.size > 0 ? o.size : 5
  if (o.standard === 'iso' && (o.sizeRef ?? 'a') === 'a') return s * Math.SQRT2
  return s
}

/** Gola efficace del cordone d'angolo (mm) */
export const filletThroat = (o: WeldObject): number => {
  const s = o.size > 0 ? o.size : 5
  if (o.standard === 'iso' && (o.sizeRef ?? 'a') === 'a') return s
  return s / Math.SQRT2
}

/** Quota a sinistra del simbolo (dimensione della sezione) */
export const sizeText = (o: WeldObject): string => {
  if (o.kind === 'fillet') {
    if (!(o.size > 0)) return ''
    return o.standard === 'iso' ? `${o.sizeRef ?? 'a'}${fmt(o.size)}` : fmt(o.size)
  }
  if (!(o.size > 0)) return ''
  return o.standard === 'iso' ? `s${fmt(o.size)}` : `(${fmt(o.size)})`
}

/** Quota a destra del simbolo (lunghezza, a tratti n × l (e) in ISO, l-p in AWS) */
export const lengthText = (o: WeldObject): string => {
  const l = o.length ?? 0
  const n = o.count ?? 0
  const e = o.gap ?? 0
  if (n > 1 && l > 0) return o.standard === 'iso' ? `${n}×${fmt(l)} (${fmt(e)})` : `${fmt(l)}-${fmt(l + e)}`
  return l > 0 ? fmt(l) : ''
}

/** Designazione breve per pannello e selezione */
/** Contenuto della coda: procedimento e testo libero */
export const tailText = (o: WeldObject): string =>
  [o.process?.trim(), o.tailText?.trim()].filter(Boolean).join(' / ')

export const weldLabel = (o: WeldObject): string => {
  const k = WELD_KINDS.find(w => w.id === o.kind)
  const name = o.side === 'both' ? k?.both : k?.label
  const dims = [sizeText(o), lengthText(o)].filter(Boolean).join(' ')
  return `${name ?? o.kind}${dims ? ` ${dims}` : ''}`
}

/* ---------- geometria del simbolo ---------- */

type Glyph = { w: number; d: (x0: number, base: number, s: number, g: number) => string }

/**
 * Arco SVG del simbolo: `sweep` è il verso quando il simbolo sta sotto la linea (s = +1);
 * sopra la linea il simbolo è specchiato e il verso si inverte.
 */
const arc = (r: number, sweep: 0 | 1, s: number, x: number, y: number) =>
  `A ${r} ${r} 0 0 ${s > 0 ? sweep : 1 - sweep} ${x} ${y} `

/**
 * Simboli elementari: base sulla linea, altezza g, verso s (-1 = sopra la linea, +1 = sotto).
 * Il lato verticale (angolo, mezza V, mezza Y, J) è sempre a sinistra, come in entrambe le norme.
 */
const GLYPHS: Record<WeldKind, Glyph> = {
  fillet: { w: 1, d: (x, b, s, g) => `M ${x} ${b} V ${b + s * g} L ${x + g} ${b} Z ` },
  I: { w: 0.55, d: (x, b, s, g) => `M ${x} ${b} V ${b + s * g} M ${x + 0.55 * g} ${b} V ${b + s * g} ` },
  V: { w: 1.1, d: (x, b, s, g) => `M ${x} ${b + s * g} L ${x + 0.55 * g} ${b} L ${x + 1.1 * g} ${b + s * g} ` },
  bevel: { w: 0.8, d: (x, b, s, g) => `M ${x} ${b} V ${b + s * g} M ${x} ${b} L ${x + 0.8 * g} ${b + s * g} ` },
  Y: {
    w: 1.1,
    d: (x, b, s, g) => `M ${x} ${b + s * g} L ${x + 0.55 * g} ${b + s * 0.45 * g} L ${x + 1.1 * g} ${b + s * g} M ${x + 0.55 * g} ${b + s * 0.45 * g} V ${b} `,
  },
  bevelY: {
    w: 0.8,
    d: (x, b, s, g) => `M ${x} ${b} V ${b + s * g} M ${x} ${b + s * 0.45 * g} L ${x + 0.8 * g} ${b + s * g} `,
  },
  U: {
    w: 1,
    // dal bordo sinistro al destro passando per il fondo, verso la linea
    d:(x, b, s, g) => `M ${x} ${b + s * g} ${arc(0.5 * g, 1, s, x + g, b + s * g)}M ${x + 0.5 * g} ${b + s * 0.5 * g} V ${b} `,
  },
  J: {
    w: 0.75,
    d: (x, b, s, g) => `M ${x} ${b} V ${b + s * g} M ${x} ${b + s * 0.35 * g} ${arc(0.65 * g, 1, s, x + 0.65 * g, b + s * g)}`,
  },
}

/** Larghezza stimata di un testo (carattere tecnico, ~0,6 em per carattere) */
const textW = (t: string, h: number) => t.length * 0.6 * h

export type WeldText = { x: number; y: number; text: string; anchor: 'start' | 'middle' | 'end' }

export type WeldDrawing = {
  /** linee continue: freccia, linea di riferimento, simboli, coda, asta della bandierina */
  lines: string
  /** linea di identificazione tratteggiata (solo ISO) */
  dashed: string
  /** campiture piene del simbolo: punta della freccia, bandierina */
  solid: string
  /** cerchio "tutto intorno" */
  ring: { c: Point; r: number } | null
  /** cordone in sezione (pieno) */
  bead: Point[][]
  texts: WeldText[]
  fontSize: number
  /** contorno per la selezione: freccia + linea di riferimento */
  hit: string
  bounds: { x: number; y: number; w: number; h: number }
}

const rotQ = (p: Point, q: number): Point => {
  // rotazione oraria di 90° sullo schermo (y verso il basso): (x, y) → (-y, x)
  let r = p
  for (let i = 0; i < ((q % 4) + 4) % 4; i++) r = { x: -r.y, y: r.x }
  return r
}

/** Punti di un arco (centro, raggio, angoli in gradi, y verso il basso) */
const arcPts = (c: Point, r: number, a0: number, a1: number, n = 10): Point[] => {
  const pts: Point[] = []
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180
    pts.push({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) })
  }
  return pts
}

/**
 * Metà destra (x ≥ 0) o intera sezione di una preparazione, dalla faccia (y = 0) alla radice (y = depth).
 * Restituisce il contorno chiuso del materiale d'apporto. Gioco alla radice 2 mm.
 */
const groove = (kind: WeldKind, depth: number): Point[] => {
  const gap = 2
  const g2 = gap / 2
  const c = Math.min(2, depth / 3) // spalla (Y, mezza Y, U, J)
  const t30 = Math.tan((30 * Math.PI) / 180)
  const t45 = 1
  switch (kind) {
    case 'I':
      return [{ x: -g2, y: 0 }, { x: g2, y: 0 }, { x: g2, y: depth }, { x: -g2, y: depth }]
    case 'V': {
      const w = g2 + depth * t30
      return [{ x: -w, y: 0 }, { x: w, y: 0 }, { x: g2, y: depth }, { x: -g2, y: depth }]
    }
    case 'bevel':
      return [{ x: -g2, y: 0 }, { x: g2 + depth * t45, y: 0 }, { x: g2, y: depth }, { x: -g2, y: depth }]
    case 'Y': {
      const w = g2 + (depth - c) * t30
      return [
        { x: -w, y: 0 }, { x: w, y: 0 }, { x: g2, y: depth - c }, { x: g2, y: depth },
        { x: -g2, y: depth }, { x: -g2, y: depth - c },
      ]
    }
    case 'bevelY':
      return [
        { x: -g2, y: 0 }, { x: g2 + (depth - c) * t45, y: 0 }, { x: g2, y: depth - c }, { x: g2, y: depth },
        { x: -g2, y: depth },
      ]
    case 'U': {
      const R = Math.min(6, (depth - c) * 0.6)
      const yc = depth - c - R
      const flare = Math.tan((10 * Math.PI) / 180) * Math.max(0, yc)
      // fondo ad arco fino al gioco, poi la spalla fino alla radice
      const a0 = (Math.acos(Math.min(1, g2 / R)) * 180) / Math.PI
      return [
        { x: -(R + flare), y: 0 }, { x: R + flare, y: 0 },
        ...arcPts({ x: 0, y: yc }, R, 0, a0, 6),
        { x: g2, y: depth }, { x: -g2, y: depth },
        ...arcPts({ x: 0, y: yc }, R, 180 - a0, 180, 6),
      ]
    }
    case 'J': {
      const R = Math.min(6, (depth - c) * 0.6)
      const yc = depth - c - R
      const flare = Math.tan((10 * Math.PI) / 180) * Math.max(0, yc)
      return [
        { x: -g2, y: 0 }, { x: g2 + R + flare, y: 0 },
        ...arcPts({ x: g2, y: yc }, R, 0, 90),
        { x: g2, y: depth }, { x: -g2, y: depth },
      ]
    }
    default:
      return []
  }
}

/** Cordoni in sezione nella posizione canonica (prima di rotazione e specchiatura) */
const canonicalBead = (o: WeldObject): Point[][] => {
  const t = o.plate && o.plate > 0 ? o.plate : 10
  if (o.kind === 'fillet') {
    // giunto a T: anima verticale x ∈ [-t, 0] verso l'alto, piatto sotto (y > 0); cordone lato freccia a destra
    const z = filletLeg(o)
    const arrowSide = [{ x: 0, y: 0 }, { x: z, y: 0 }, { x: 0, y: -z }]
    const otherSide = [{ x: -t, y: 0 }, { x: -t - z, y: 0 }, { x: -t, y: -z }]
    if (o.side === 'arrow') return [arrowSide]
    if (o.side === 'other') return [otherSide]
    return [arrowSide, otherSide]
  }
  // testa a testa: faccia lato freccia in alto (y = 0), lamiera verso il basso fino a y = t
  if (o.side === 'both') {
    const d = t / 2
    const top = groove(o.kind, d)
    const bottom = groove(o.kind, d).map(p => ({ x: p.x, y: t - p.y }))
    return [top, bottom]
  }
  const g = groove(o.kind, t)
  // lato opposto: la preparazione parte dalla faccia inferiore
  return [o.side === 'other' ? g.map(p => ({ x: p.x, y: t - p.y })) : g]
}

/** Orientamento iniziale del cordone: rivolto verso la linea di riferimento */
export const defaultBeadRot = (kind: WeldKind, tip: Point, knee: Point): number => {
  const dx = knee.x - tip.x, dy = knee.y - tip.y
  if (kind === 'fillet') {
    // quadranti: ne 0, se 1, sw 2, nw 3
    if (dx >= 0) return dy <= 0 ? 0 : 1
    return dy <= 0 ? 3 : 2
  }
  // faccia verso: nord 0, est 1, sud 2, ovest 3
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 1 : 3
  return dy <= 0 ? 0 : 2
}

export const beadPolygons = (o: WeldObject): Point[][] => {
  const tip = { x: o.x1, y: o.y1 }
  return canonicalBead(o).map(poly => poly.map(p => {
    const f = o.beadFlip ? { x: -p.x, y: p.y } : p
    const r = rotQ(f, o.beadRot ?? 0)
    return { x: tip.x + r.x, y: tip.y + r.y }
  }))
}

/** Primo punto (parametro 0–1 da a verso b) in cui il segmento a→b entra in uno dei poligoni */
const firstHit = (a: Point, b: Point, polys: Point[][]): number | null => {
  let best: number | null = null
  const rx = b.x - a.x, ry = b.y - a.y
  for (const poly of polys) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length]
      const sx = q.x - p.x, sy = q.y - p.y
      const den = rx * sy - ry * sx
      if (Math.abs(den) < 1e-12) continue
      const t = ((p.x - a.x) * sy - (p.y - a.y) * sx) / den
      const u = ((p.x - a.x) * ry - (p.y - a.y) * rx) / den
      if (t > 1e-6 && t <= 1 && u >= 0 && u <= 1 && (best === null || t < best)) best = t
    }
  }
  return best
}

export const weldDrawing = (o: WeldObject): WeldDrawing => {
  const h = o.textSize && o.textSize > 0 ? o.textSize : 14
  const g = 0.8 * h
  const tip = { x: o.x1, y: o.y1 }
  const K = { x: o.x2, y: o.y2 }
  const dir = o.x2 >= o.x1 ? 1 : -1
  const iso = o.standard === 'iso'
  const both = o.side === 'both'
  const dashGap = 0.3 * h
  const showDash = iso && !both

  // slot del simbolo: lato freccia e lato opposto, sopra (-1) o sotto (+1) la linea
  const arrowSlot = iso ? -1 : 1
  const slots: { s: number; base: number; shift: number }[] = []
  const baseFor = (s: number) => (s > 0 && showDash ? K.y + dashGap : K.y)
  if (o.side === 'arrow' || both) slots.push({ s: arrowSlot, base: baseFor(arrowSlot), shift: 0 })
  if (o.side === 'other' || both) slots.push({ s: -arrowSlot, base: baseFor(-arrowSlot), shift: 0 })
  const glyph = GLYPHS[o.kind]
  const gw = glyph.w * g
  // cordoni a tratti sfalsati: i simboli dei due lati sono spostati tra loro
  const stagger = both && o.staggered && (o.count ?? 0) > 1 ? gw * 0.7 : 0
  if (stagger) slots[1].shift = stagger

  const tL = sizeText(o)
  const tR = lengthText(o)
  const wL = textW(tL, h)
  const wR = textW(tR, h)
  const gapT = 0.3 * h
  const contentW = (wL ? wL + gapT : 0) + gw + stagger + (wR ? gapT + wR : 0)
  const lineLen = Math.max(3 * h, contentW + 1.5 * h)
  const ox = dir > 0 ? K.x + 0.6 * h : K.x - 0.6 * h - contentW
  const xGlyph = ox + (wL ? wL + gapT : 0)
  const xEnd = K.x + dir * lineLen

  let lines = ''
  let solid = ''
  const texts: WeldText[] = []

  // freccia: con il cordone visibile la punta si ferma sulla sua superficie, altrimenti lo coprirebbe
  const bead = o.showBead ? beadPolygons(o) : []
  const hitT = firstHit(K, tip, bead)
  if (hitT !== null) {
    tip.x = K.x + (tip.x - K.x) * hitT
    tip.y = K.y + (tip.y - K.y) * hitT
  }
  const L = Math.hypot(K.x - tip.x, K.y - tip.y) || 1
  const ux = (K.x - tip.x) / L, uy = (K.y - tip.y) / L
  const ah = 0.8 * h, aw = 0.22 * h
  const ab = { x: tip.x + ux * ah, y: tip.y + uy * ah }
  lines += `M ${ab.x} ${ab.y} L ${K.x} ${K.y} `
  solid += `M ${tip.x} ${tip.y} L ${ab.x - uy * aw} ${ab.y + ux * aw} L ${ab.x + uy * aw} ${ab.y - ux * aw} Z `

  // linea di riferimento
  lines += `M ${K.x} ${K.y} H ${xEnd} `
  const dashed = showDash ? `M ${Math.min(K.x, xEnd)} ${K.y + dashGap} H ${Math.max(K.x, xEnd)} ` : ''

  // simboli, quote e finitura
  for (const sl of slots) {
    const x = xGlyph + sl.shift
    lines += glyph.d(x, sl.base, sl.s, g)
    // testo centrato poco sopra la metà del simbolo, per staccarlo dalla linea
    const ym = sl.base + sl.s * (g * 0.5 + 0.12 * h)
    if (tL) texts.push({ x: ox + sl.shift, y: ym, text: tL, anchor: 'start' })
    if (tR) texts.push({ x: xGlyph + gw + stagger + gapT, y: ym, text: tR, anchor: 'start' })
    const c = o.contour ?? 'none'
    if (c !== 'none') {
      const yc = sl.base + sl.s * (g + 0.3 * h)
      const x0 = x - 0.1 * g, x1 = x + gw + 0.1 * g
      if (c === 'flat') lines += `M ${x0} ${yc} H ${x1} `
      else {
        // convessa: l'arco si allontana dalla linea; concava: si avvicina
        const bulge = (c === 'convex' ? 1 : -1) * sl.s * 0.25 * h
        lines += `M ${x0} ${yc} Q ${(x0 + x1) / 2} ${yc + bulge * 2} ${x1} ${yc} `
      }
    }
  }

  // coda: procedimento e testo libero, separati da "/" come nella ISO 2553
  const tail = tailText(o)
  if (tail) {
    const tl = 0.5 * h
    lines += `M ${xEnd} ${K.y} l ${dir * tl} ${-tl} M ${xEnd} ${K.y} l ${dir * tl} ${tl} `
    texts.push({ x: xEnd + dir * (tl + 0.25 * h), y: K.y, text: tail, anchor: dir > 0 ? 'start' : 'end' })
  }

  // saldatura in opera (bandierina verso la coda) e tutto intorno
  if (o.field) {
    const top = K.y - 1.6 * h
    lines += `M ${K.x} ${K.y} V ${top} `
    solid += `M ${K.x} ${top} L ${K.x + dir * 0.8 * h} ${top + 0.28 * h} L ${K.x} ${top + 0.56 * h} Z `
  }
  const ring = o.allAround ? { c: K, r: 0.35 * h } : null

  // ingombro
  const pts: Point[] = [tip, K, { x: xEnd, y: K.y }]
  const ext = g + ((o.contour ?? 'none') !== 'none' ? 0.6 * h : 0) + 0.1 * h
  pts.push({ x: K.x, y: K.y - ext })
  pts.push({ x: K.x, y: K.y + ext + (showDash ? dashGap : 0) })
  if (o.field) pts.push({ x: K.x, y: K.y - 1.6 * h }, { x: K.x + dir * 0.8 * h, y: K.y - 1.6 * h })
  if (tail) pts.push({ x: xEnd + dir * (0.75 * h + textW(tail, h)), y: K.y })
  for (const p of bead.flat()) pts.push(p)
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
  const minX = Math.min(...xs), minY = Math.min(...ys)
  const bounds = { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY }

  const hit = `M ${tip.x} ${tip.y} L ${K.x} ${K.y} H ${xEnd} `
  return { lines, dashed, solid, ring, bead, texts, fontSize: h, hit, bounds }
}

export const weldBounds = (o: WeldObject) => weldDrawing(o).bounds
