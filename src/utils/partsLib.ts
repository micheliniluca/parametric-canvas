import { useEffect, useState } from 'react'
import type { CanvasObject, PartObject, Point } from '../types'

const rotatePoint = (p: Point, c: Point, deg: number): Point => {
  if (!deg) return p
  const a = (deg * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a)
  return { x: c.x + (p.x - c.x) * cos - (p.y - c.y) * sin, y: c.y + (p.x - c.x) * sin + (p.y - c.y) * cos }
}

/**
 * Libreria dei componenti per membrane (ETFE e tessuto PTFE): profili in alluminio, keder, morsetti,
 * piastre, terminali di fune e bulloneria, estratti dai blocchi dei dettagli tipici Maffeis.
 * Coordinate in mm, origine nel punto di inserimento del blocco, y verso il basso.
 * Il file (≈650 kB) si carica solo quando serve.
 */
export type PartDef = {
  id: string
  /** nome */
  n: string
  /** gruppo */
  g: PartGroup
  /** origine: etfe, ptfe o etfe+ptfe */
  s: string
  /** ingombro [x0, y0, x1, y1] */
  b: [number, number, number, number]
  /** linee: tracciato SVG con soli M/L/Z */
  d: string
  /** campiture piene: tracciato SVG con soli M/L/Z */
  f: string
  /** testi: [x, y (linea di base), altezza maiuscole, rotazione °, testo] */
  t: [number, number, number, number, string][]
}

export const PART_GROUPS = [
  'Profili in alluminio', 'Guarnizioni e keder', 'Funi e terminali',
] as const
export type PartGroup = typeof PART_GROUPS[number]

let parts: PartDef[] = []
const byId = new Map<string, PartDef>()
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()

export function loadParts(): Promise<void> {
  if (!loading) {
    loading = import('../data/membraneParts.json').then(mod => {
      parts = (mod as unknown as { default: { parts: PartDef[] } }).default.parts
      for (const p of parts) byId.set(p.id, p)
      listeners.forEach(l => l())
    })
  }
  return loading
}

/** Elenco dei componenti; ridisegna chi lo usa quando la libreria è caricata. `load` = false: solo in ascolto */
export function useParts(load = true): PartDef[] {
  const [, setTick] = useState(0)
  useEffect(() => {
    const l = () => setTick(t => t + 1)
    listeners.add(l)
    return () => { listeners.delete(l) }
  }, [])
  useEffect(() => {
    if (load) loadParts()
  }, [load])
  return parts
}

export const partDef = (id: string | undefined) => (id ? byId.get(id) : undefined)
export const partsLoaded = () => parts.length > 0

/** Nome leggibile dell'origine */
export const partSourceLabel = (s: string) =>
  s === 'etfe' ? 'ETFE' : s === 'ptfe' ? 'Tessuto PTFE' : 'ETFE e tessuto'

export function partLabel(o: PartObject) {
  const k = o.scale ?? 1
  return `${o.name}${Math.abs(k - 1) > 1e-6 ? ` · scala ${fmtScale(k)}` : ''}`
}

const fmtScale = (k: number) => (k >= 1 ? `${+k.toFixed(3)}:1` : `1:${+(1 / k).toFixed(2)}`)

/** Punto locale del componente -> mondo (senza la rotazione dell'oggetto) */
export const partPoint = (o: PartObject, p: Point): Point => {
  const k = o.scale ?? 1
  return { x: o.x + (o.flipX ? -p.x : p.x) * k, y: o.y + p.y * k }
}

/** Ingombro non ruotato in coordinate mondo (dal riquadro salvato nell'oggetto: non serve la libreria) */
export function partBounds(o: PartObject) {
  const [x0, y0, x1, y1] = o.box
  const a = partPoint(o, { x: x0, y: y0 })
  const b = partPoint(o, { x: x1, y: y1 })
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) }
}

/** Trasformazione SVG del disegno locale (traslazione, scala, specchio) */
export const partTransform = (o: PartObject) => {
  const k = o.scale ?? 1
  return `translate(${o.x} ${o.y}) scale(${o.flipX ? -k : k} ${k})`
}

/** Tracciato M/L/Z -> polilinee */
export function pathPolylines(d: string): { pts: Point[]; closed: boolean }[] {
  const out: { pts: Point[]; closed: boolean }[] = []
  for (const seg of d.match(/M[^M]*/g) ?? []) {
    // dentro un segmento le Z chiudono il tratto corrente; i tratti successivi ripartono da L
    const pieces = seg.split('Z')
    pieces.forEach((piece, i) => {
      const nums = piece.match(/-?\d+(?:\.\d+)?/g)
      if (!nums || nums.length < 4) return
      const pts: Point[] = []
      for (let j = 0; j + 1 < nums.length; j += 2) pts.push({ x: +nums[j], y: +nums[j + 1] })
      out.push({ pts, closed: i < pieces.length - 1 })
    })
  }
  return out
}

/** Nuovo componente con il punto di inserimento in `p` */
export function makePart(def: PartDef, p: Point, prev?: Partial<PartObject>): PartObject {
  return {
    id: crypto.randomUUID(), type: 'part', x: p.x, y: p.y,
    part: def.id, name: def.n, box: def.b,
    scale: prev?.scale ?? 1, flipX: prev?.flipX, rotation: prev?.rotation,
    stroke: prev?.stroke, strokeWidth: prev?.strokeWidth,
  }
}

/** Geometria in coordinate mondo, rotazione compresa (per DXF ed esplosione) */
export function partWorld(o: PartObject, def: PartDef) {
  const b = partBounds(o)
  const center = { x: b.x + b.w / 2, y: b.y + b.h / 2 }
  const rot = o.rotation || 0
  const W = (p: Point) => rotatePoint(partPoint(o, p), center, rot)
  const k = o.scale ?? 1
  return {
    lines: pathPolylines(def.d).map(pl => ({ pts: pl.pts.map(W), closed: pl.closed })),
    fills: pathPolylines(def.f).map(pl => pl.pts.map(W)),
    texts: def.t.map(([x, y, h, r, text]) => ({
      p: W({ x, y }), height: h * k, rot: (o.flipX ? -r : r) + rot, text,
    })),
  }
}

/** Esplode il componente in polilinee, campiture e testi raggruppati */
export function explodePart(o: PartObject): CanvasObject[] {
  const def = partDef(o.part)
  if (!def) return [o]
  const g = partWorld(o, def)
  const groupId = crypto.randomUUID()
  const stroke = o.stroke || '#0f172a'
  const sw = o.strokeWidth ?? 0.35
  const out: CanvasObject[] = []
  for (const l of g.lines) {
    out.push({ id: crypto.randomUUID(), type: 'polyline', points: l.pts, closed: l.closed, stroke, strokeWidth: sw, fillEnabled: false, groupId })
  }
  for (const f of g.fills) {
    if (f.length < 3) continue
    out.push({ id: crypto.randomUUID(), type: 'polyline', points: f, closed: true, stroke, strokeWidth: sw, fillEnabled: true, fillColor: stroke, groupId })
  }
  for (const t of g.texts) {
    // testo senza riquadro: il centro sta a metà larghezza sulla linea di base, alzato di mezza altezza
    const fontSize = t.height / 0.7
    const w = t.text.length * fontSize * 0.6
    const h = fontSize * 1.2
    const a = (t.rot * Math.PI) / 180
    const cx = t.p.x + (w / 2) * Math.cos(a) + (t.height / 2) * Math.sin(a)
    const cy = t.p.y + (w / 2) * Math.sin(a) - (t.height / 2) * Math.cos(a)
    out.push({
      id: crypto.randomUUID(), type: 'text', x: cx - w / 2, y: cy - h / 2, text: t.text, fontSize,
      boxEnabled: false, boxPadding: 0, width: w, height: h, rotation: t.rot || undefined,
      stroke, textColor: stroke, groupId,
    })
  }
  return out
}
