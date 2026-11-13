import type { CanvasObject, Point } from '../types'
import { findProfile } from '../profiles'
import { generateBeamPath } from '../beamPath'
import { boltBounds, boltCenters, boltDrawing, boltLabel } from './boltUtils'
import { cableDrawing, cableLabel } from './cableUtils'
import { getObjectBounds, getObjectCenter, rotatePoint, textSize } from '../canvas/geometry'
import { pathToPolylines } from './pathToPolylines'

/**
 * Esportazione DXF (formato R12, letto da AutoCAD, Tekla, LibreCAD, BricsCAD…).
 * Unità: millimetri, 1 unità della tela = 1 mm. L'asse Y viene ribaltato (in DXF cresce verso l'alto).
 * Un layer per tipo di oggetto; il colore del tratto viene convertito nel colore AutoCAD (ACI) più vicino.
 * Le immagini e i riempimenti non vengono esportati.
 */

type Layer = 'DISEGNO' | 'TESTI' | 'ANNOTAZIONI' | 'QUOTE' | 'PROFILI' | 'BULLONI' | 'CAVI' | 'NASCOSTE' | 'ASSI'

const LAYERS: { name: Layer; color: number; ltype: 'CONTINUOUS' | 'DASHED' | 'CENTER' }[] = [
  { name: 'DISEGNO', color: 7, ltype: 'CONTINUOUS' },
  { name: 'TESTI', color: 7, ltype: 'CONTINUOUS' },
  { name: 'ANNOTAZIONI', color: 1, ltype: 'CONTINUOUS' },
  { name: 'QUOTE', color: 3, ltype: 'CONTINUOUS' },
  { name: 'PROFILI', color: 4, ltype: 'CONTINUOUS' },
  { name: 'BULLONI', color: 2, ltype: 'CONTINUOUS' },
  { name: 'CAVI', color: 6, ltype: 'CONTINUOUS' },
  { name: 'NASCOSTE', color: 8, ltype: 'DASHED' },
  { name: 'ASSI', color: 8, ltype: 'CENTER' },
]

type Ent =
  | { kind: 'poly'; layer: Layer; color: number; pts: Point[]; closed: boolean }
  | { kind: 'circle'; layer: Layer; color: number; c: Point; r: number }
  | {
      kind: 'text'; layer: Layer; color: number; p: Point; height: number; text: string
      /** gradi, come sulla tela (orari) */
      rot: number
      align: 'left' | 'center'
      valign: 'baseline' | 'middle'
    }

/* ---------- colori ---------- */

const ACI_TABLE: { aci: number; rgb: [number, number, number] }[] = (() => {
  const t: { aci: number; rgb: [number, number, number] }[] = [
    { aci: 8, rgb: [128, 128, 128] }, { aci: 9, rgb: [192, 192, 192] },
  ]
  // ruota dei colori ACI: tinta ogni 10 indici, luminosità piena (+0), 0,65 (+2), 0,5 (+4)
  for (let hue = 0; hue < 24; hue++) {
    const h = hue * 15
    const base = hsvToRgb(h)
    ;[[0, 1], [2, 0.65], [4, 0.5]].forEach(([off, k]) => {
      t.push({ aci: 10 + hue * 10 + off, rgb: base.map(v => Math.round(v * k)) as [number, number, number] })
    })
  }
  return t
})()

function hsvToRgb(h: number): [number, number, number] {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return 255 * (1 - Math.max(0, Math.min(k, 4 - k, 1)))
  }
  return [f(5), f(3), f(1)]
}

/** Colore esadecimale → indice ACI più vicino (nero e bianco → 7, che CAD mostra in contrasto con lo sfondo) */
export function toAci(hex?: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '')
  if (!m) return 7
  const n = parseInt(m[1], 16)
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const max = Math.max(...rgb), min = Math.min(...rgb)
  if (max - min < 24 && (max < 60 || min > 230)) return 7
  let best = 7, bestD = Infinity
  for (const { aci, rgb: c } of ACI_TABLE) {
    const d = (c[0] - rgb[0]) ** 2 * 0.3 + (c[1] - rgb[1]) ** 2 * 0.59 + (c[2] - rgb[2]) ** 2 * 0.11
    if (d < bestD) { bestD = d; best = aci }
  }
  return best
}

/* ---------- oggetti → entità ---------- */

/** Altezza del testo DXF (altezza delle maiuscole) rispetto alla dimensione del carattere sulla tela */
const CAP = 0.7

function entitiesOf(o: CanvasObject): Ent[] {
  const out: Ent[] = []
  const color = toAci(o.stroke)
  const center = getObjectCenter(o)
  const rotation = o.rotation || 0
  const R = (p: Point) => rotatePoint(p, center, rotation)

  const poly = (layer: Layer, pts: Point[], closed: boolean, c = color) =>
    pts.length > 1 && out.push({ kind: 'poly', layer, color: c, pts: pts.map(R), closed })
  /** tracciato SVG, con eventuale trasformazione locale (es. scala del profilo) */
  const path = (layer: Layer, d: string | undefined, local: (p: Point) => Point = p => p) => {
    if (!d) return
    for (const pl of pathToPolylines(d)) poly(layer, pl.pts.map(local), pl.closed)
  }
  const text = (layer: Layer, p: Point, fontSize: number, t: string, rot: number,
    align: 'left' | 'center', valign: 'baseline' | 'middle', c = color) => {
    if (t.trim()) out.push({ kind: 'text', layer, color: c, p: R(p), height: fontSize * CAP, text: t, rot: rot + rotation, align, valign })
  }

  switch (o.type) {
    case 'rect':
      poly('DISEGNO', [
        { x: o.x, y: o.y }, { x: o.x + o.width, y: o.y }, { x: o.x + o.width, y: o.y + o.height }, { x: o.x, y: o.y + o.height },
      ], true)
      break

    case 'circle':
      out.push({ kind: 'circle', layer: 'DISEGNO', color, c: { x: o.x, y: o.y }, r: o.radius })
      break

    case 'polyline': {
      const closed = o.closed && o.points.length > 2
      const pts = closed ? o.points.slice(0, -1) : o.points
      poly('DISEGNO', pts, closed)
      break
    }

    case 'text': {
      const fontSize = o.fontSize || 20
      const { w, h } = textSize(o)
      const lines = o.text.split('\n')
      const lineH = fontSize * 1.2
      const tc = toAci(o.textColor || o.stroke)
      const y0 = o.y + h / 2 - ((lines.length - 1) * lineH) / 2
      lines.forEach((l, i) => text('TESTI', { x: o.x + w / 2, y: y0 + i * lineH }, fontSize, l, 0, 'center', 'middle', tc))
      if (o.boxEnabled) {
        poly('TESTI', [{ x: o.x, y: o.y }, { x: o.x + w, y: o.y }, { x: o.x + w, y: o.y + h }, { x: o.x, y: o.y + h }], true)
      }
      break
    }

    case 'arrow': {
      const sw = o.strokeWidth ?? 2
      const headLen = Math.max(6, sw * 4)
      const len = Math.hypot(o.x2 - o.x1, o.y2 - o.y1) || 1
      const u = { x: (o.x2 - o.x1) / len, y: (o.y2 - o.y1) / len }
      const v = { x: -u.y, y: u.x }
      const back = { x: o.x2 - u.x * headLen, y: o.y2 - u.y * headLen }
      const hw = headLen / 2.2
      poly('ANNOTAZIONI', [{ x: o.x1, y: o.y1 }, { x: o.x2 - u.x * headLen * 0.6, y: o.y2 - u.y * headLen * 0.6 }], false)
      poly('ANNOTAZIONI', [
        { x: o.x2, y: o.y2 }, { x: back.x + v.x * hw, y: back.y + v.y * hw }, { x: back.x - v.x * hw, y: back.y - v.y * hw },
      ], true)
      break
    }

    case 'quote': {
      const sw = o.strokeWidth ?? 1
      const dx = o.x2 - o.x1, dy = o.y2 - o.y1
      const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
      const textAngle = angleDeg > 90 || angleDeg < -90 ? angleDeg + 180 : angleDeg
      const d = Math.hypot(dx, dy)
      const tick = 6 + sw * 2
      poly('QUOTE', [{ x: o.x1, y: o.y1 }, { x: o.x2, y: o.y2 }], false)
      for (const p of [{ x: o.x1, y: o.y1 }, { x: o.x2, y: o.y2 }]) {
        const a = rotatePoint({ x: p.x, y: p.y - tick }, p, angleDeg)
        const b = rotatePoint({ x: p.x, y: p.y + tick }, p, angleDeg)
        poly('QUOTE', [a, b], false)
      }
      const mid = { x: (o.x1 + o.x2) / 2, y: (o.y1 + o.y2) / 2 }
      const tp = rotatePoint({ x: mid.x, y: mid.y - (4 + sw) }, mid, textAngle)
      text('QUOTE', tp, 14, o.text || `${Math.round(d * 10) / 10}`, textAngle, 'center', 'baseline', toAci(o.textColor || o.stroke))
      break
    }

    case 'symbol':
      out.push({ kind: 'circle', layer: 'ANNOTAZIONI', color, c: R({ x: o.x, y: o.y }), r: 15 })
      text('ANNOTAZIONI', { x: o.x, y: o.y }, 14, String(o.value ?? ''), 0, 'center', 'middle')
      break

    case 'bolt': {
      for (const c of boltCenters(o)) {
        const dr = boltDrawing(o, c)
        path('BULLONI', dr.outline)
        path('BULLONI', dr.thin)
        path('ASSI', dr.axis)
      }
      if (o.showLabel) {
        const b = boltBounds(o)
        text('BULLONI', { x: b.x + b.w + 6, y: b.y - 4 }, 12, boltLabel(o), 0, 'left', 'baseline')
      }
      break
    }

    case 'profile': {
      const profile = findProfile(o.profileName)
      if (!profile) break
      const { path: d, dashed } = generateBeamPath({ ...profile, viewType: o.viewType, length: o.length })
      const local = (p: Point) => ({ x: o.x + p.x * o.scale, y: o.y + p.y * o.scale })
      path('PROFILI', d, local)
      path('NASCOSTE', dashed, local)
      const label = o.label === 'name' ? profile.name : o.label === 'code' ? profile.code : o.label === 'tekla' ? profile.tekla : ''
      if (label) {
        const lb = getObjectBounds(o)
        text('PROFILI', { x: lb.x, y: lb.y - 6 }, 12, label, 0, 'left', 'baseline')
      }
      break
    }

    case 'cable': {
      const dr = cableDrawing(o)
      path('CAVI', dr.rope)
      path('CAVI', dr.outline)
      path('CAVI', dr.thin)
      path('ASSI', dr.axis)
      if (o.showLabel !== false) {
        const textAngle = dr.angle > 90 || dr.angle < -90 ? dr.angle + 180 : dr.angle
        const fs = Math.max(14, o.size * 1.2)
        const off = (o.size / 2 + fs * 0.4) * (textAngle === dr.angle ? -1 : 1)
        const mid = { x: (o.x1 + o.x2) / 2 + dr.v.x * off, y: (o.y1 + o.y2) / 2 + dr.v.y * off }
        text('CAVI', mid, fs, cableLabel(o), textAngle, 'center', 'middle')
      }
      break
    }

    case 'image':
      // le immagini non hanno un equivalente vettoriale
      break
  }
  return out
}

/* ---------- scrittura DXF ---------- */

const n = (v: number) => {
  const r = Math.round(v * 10000) / 10000
  return Object.is(r, -0) ? '0' : String(r)
}

/** Caratteri non ASCII come \U+XXXX (es. ×, Ø, à), letti correttamente dai CAD */
const dxfText = (s: string) =>
  s.replace(/[^\x20-\x7e]/g, ch => `\\U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`)

export function exportToDXF(objects: CanvasObject[]): string {
  const ents = objects.flatMap(entitiesOf)
  const lines: (string | number)[] = []
  const g = (code: number, value: string | number) => lines.push(code, value)
  const Y = (y: number) => -y

  // estensione del disegno
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const grow = (p: Point, r = 0) => {
    minX = Math.min(minX, p.x - r); maxX = Math.max(maxX, p.x + r)
    minY = Math.min(minY, Y(p.y) - r); maxY = Math.max(maxY, Y(p.y) + r)
  }
  for (const e of ents) {
    if (e.kind === 'poly') e.pts.forEach(p => grow(p))
    else if (e.kind === 'circle') grow(e.c, e.r)
    else grow(e.p)
  }
  if (!ents.length) { minX = minY = 0; maxX = maxY = 100 }

  g(0, 'SECTION'); g(2, 'HEADER')
  g(9, '$ACADVER'); g(1, 'AC1009')
  g(9, '$DWGCODEPAGE'); g(3, 'ANSI_1252')
  g(9, '$INSUNITS'); g(70, 4)
  g(9, '$MEASUREMENT'); g(70, 1)
  g(9, '$EXTMIN'); g(10, n(minX)); g(20, n(minY)); g(30, 0)
  g(9, '$EXTMAX'); g(10, n(maxX)); g(20, n(maxY)); g(30, 0)
  g(9, '$LTSCALE'); g(40, 1)
  g(0, 'ENDSEC')

  g(0, 'SECTION'); g(2, 'TABLES')
  // tipi di linea (lunghezze in mm)
  const ltypes: [string, string, number[]][] = [
    ['CONTINUOUS', 'Solid line', []],
    ['DASHED', 'Dashed __ __ __', [6, -3]],
    ['CENTER', 'Center ____ _ ____', [20, -4, 4, -4]],
  ]
  g(0, 'TABLE'); g(2, 'LTYPE'); g(70, ltypes.length)
  for (const [name, desc, pattern] of ltypes) {
    g(0, 'LTYPE'); g(2, name); g(70, 0); g(3, desc); g(72, 65); g(73, pattern.length)
    g(40, pattern.reduce((t, v) => t + Math.abs(v), 0))
    pattern.forEach(v => g(49, v))
  }
  g(0, 'ENDTAB')
  g(0, 'TABLE'); g(2, 'LAYER'); g(70, LAYERS.length + 1)
  g(0, 'LAYER'); g(2, '0'); g(70, 0); g(62, 7); g(6, 'CONTINUOUS')
  for (const l of LAYERS) {
    g(0, 'LAYER'); g(2, l.name); g(70, 0); g(62, l.color); g(6, l.ltype)
  }
  g(0, 'ENDTAB')
  g(0, 'TABLE'); g(2, 'STYLE'); g(70, 1)
  g(0, 'STYLE'); g(2, 'STANDARD'); g(70, 0); g(40, 0); g(41, 1); g(50, 0); g(71, 0); g(42, 2.5); g(3, 'arial.ttf'); g(4, '')
  g(0, 'ENDTAB')
  g(0, 'ENDSEC')

  g(0, 'SECTION'); g(2, 'ENTITIES')
  for (const e of ents) {
    if (e.kind === 'poly') {
      g(0, 'POLYLINE'); g(8, e.layer); g(62, e.color); g(66, 1); g(10, 0); g(20, 0); g(30, 0); g(70, e.closed ? 1 : 0)
      for (const p of e.pts) {
        g(0, 'VERTEX'); g(8, e.layer); g(10, n(p.x)); g(20, n(Y(p.y))); g(30, 0)
      }
      g(0, 'SEQEND'); g(8, e.layer)
    } else if (e.kind === 'circle') {
      g(0, 'CIRCLE'); g(8, e.layer); g(62, e.color); g(10, n(e.c.x)); g(20, n(Y(e.c.y))); g(30, 0); g(40, n(e.r))
    } else {
      const x = n(e.p.x), y = n(Y(e.p.y))
      g(0, 'TEXT'); g(8, e.layer); g(62, e.color)
      g(10, x); g(20, y); g(30, 0)
      g(40, n(e.height)); g(1, dxfText(e.text))
      // la tela ruota in senso orario (Y verso il basso), il DXF in senso antiorario
      const rot = -e.rot
      if (rot) g(50, n(((rot % 360) + 360) % 360))
      g(7, 'STANDARD')
      const hj = e.align === 'center' ? 1 : 0
      const vj = e.valign === 'middle' ? 2 : 0
      if (hj) g(72, hj)
      if (hj || vj) { g(11, x); g(21, y); g(31, 0) }
      if (vj) g(73, vj)
    }
  }
  g(0, 'ENDSEC')
  g(0, 'EOF')
  return lines.join('\n') + '\n'
}
