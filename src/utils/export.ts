import type { CanvasObject, Point } from '../types'
import { findProfile } from '../profiles'
import { generateBeamPath } from '../beamPath'
import { boltBounds, boltCenters, boltDrawing, boltLabel } from './boltUtils'
import { cableDrawing, cableLabel } from './cableUtils'
import { deckDrawing, deckLabel, deckLabelPlacement } from './deckUtils'
import { screwDrawing, screwLabel } from './screwUtils'
import { personBounds, personLabel, personPolygons } from './peopleUtils'
import { partDef, partWorld } from './partsLib'
import { kederDrawing } from './kederUtils'
import { clampDrawing, clampLabel } from './clampUtils'
import { cushionDrawing, cushionLabel } from './cushionUtils'
import { envelopeDrawing, envelopeLabel, envelopeThickness, labelPlacement, seamDrawing, seamLabel } from './envelopeUtils'
import { weldDrawing } from './weldUtils'
import { leaderTerminal, textLeader } from './leaderUtils'
import { quoteTerminals } from './quoteUtils'
import { getObjectBounds, getObjectCenter, profileToWorld, rotatePoint, textSize } from '../canvas/geometry'
import { pathToPolylines } from './pathToPolylines'
import { hatchDef, hatchGeometry } from './hatchUtils'

/**
 * Esportazione DXF (formato AutoCAD 2000, letto da AutoCAD, Tekla, LibreCAD, BricsCAD…).
 * Unità: millimetri, 1 unità della tela = 1 mm. L'asse Y viene ribaltato (in DXF cresce verso l'alto).
 * Layer, colori, tipi di linea e stile di testo del template Maffeis ME_TEMPLATE_CAD_STEEL; le entità sono DaLayer.
 * Materiali: acciaio ME_STEEL, alluminio ME_ALUMINIUM, vetro ME_GLASS, isolanti / calcestruzzo / guarnizioni
 * ME_OTHER MATERIALS, membrane ME_FABRIC_SECT, funi ME_CABLE, bulloni e viti ME_BOLT; testi ME_ANNO_TEXTS,
 * quote ME_ANNO_DIMENSIONS, retini ME_ANNO_HATCHES, nascoste ME_HIDDEN, assi ME_AXIS, linee libere ME_PROJECTION.
 * Le immagini e i riempimenti non vengono esportati, tranne le campiture piene (SOLID).
 */

/**
 * Layer del template Maffeis ME_TEMPLATE_CAD_STEEL (nome, colore ACI, tipo linea). Tutti gli oggetti sono DaLayer:
 * colore e tipo linea vengono dal layer, come in un disegno fatto sul template.
 */
const LAYERS = [
  { name: 'ME_ANNO_DIMENSIONS', color: 7, ltype: 'Continuous' },
  { name: 'ME_ANNO_HATCHES', color: 254, ltype: 'Continuous' },
  { name: 'ME_ANNO_TEXTS', color: 212, ltype: 'Continuous' },
  { name: 'ME_LIMIT', color: 2, ltype: 'ME_asse 2 1 0' },
  { name: 'ME_AXIS', color: 8, ltype: 'ME_DASH DOT 5 -2-0' },
  { name: 'ME_BOLT', color: 3, ltype: 'Continuous' },
  { name: 'ME_PROJECTION', color: 1, ltype: 'Continuous' },
  { name: 'ME_HIDDEN', color: 40, ltype: 'ME_HIDDEN 1-1' },
  { name: 'ME_SECTION', color: 6, ltype: 'Continuous' },
  { name: 'ME_ANNO_CLOUDS', color: 1, ltype: 'Continuous' },
  { name: 'ME_PROJECTION_NARROW', color: 4, ltype: 'Continuous' },
  { name: 'ME_BYOTHERS_HATCH', color: 9, ltype: 'Continuous' },
  { name: 'ME_FABRIC_PLAN', color: 53, ltype: 'Continuous' },
  { name: 'ME_F-REINFORCE_PLAN', color: 66, ltype: 'Continuous' },
  { name: 'ME_CUT', color: 3, ltype: 'Continuous' },
  { name: 'ME_PRINT', color: 1, ltype: 'Continuous' },
  { name: 'ME_SYSTEM', color: 6, ltype: 'Continuous' },
  { name: 'ME_ANNO_TEXTS_2', color: 9, ltype: 'Continuous' },
  { name: 'ME_HOLE', color: 2, ltype: 'Continuous' },
  { name: 'ME_INFO', color: 7, ltype: 'Continuous' },
  { name: 'ME_ALU', color: 8, ltype: 'Continuous' },
  { name: 'ME_GREY', color: 254, ltype: 'Continuous' },
  { name: 'ME_CABLE', color: 252, ltype: 'Continuous' },
  { name: 'ME_FABRIC_SECT', color: 7, ltype: 'Continuous' },
  { name: 'ME_F-REINFORCE_SECT', color: 150, ltype: 'Continuous' },
  { name: 'ME_RED', color: 10, ltype: 'Continuous' },
  { name: 'ME_GREEN', color: 80, ltype: 'Continuous' },
  { name: 'ME_YELLOW', color: 50, ltype: 'Continuous' },
  { name: 'ME_CYAN', color: 130, ltype: 'Continuous' },
  { name: 'ME_BLUE', color: 150, ltype: 'Continuous' },
  { name: 'ME_PURPLE', color: 176, ltype: 'Continuous' },
  { name: 'ME_MAGENTA', color: 210, ltype: 'Continuous' },
  { name: 'ME_DEEPRED', color: 232, ltype: 'Continuous' },
  { name: 'ME_F_REINFORCE_SECT_DASHED', color: 150, ltype: 'ME_HIDDEN 1-1' },
  { name: 'ME_FABRIC_SECT_DASHED', color: 7, ltype: 'ME_HIDDEN 1-1' },
  { name: 'ME_FOR_CONSTRUCTION', color: 141, ltype: 'Continuous' },
  { name: 'ME_ALUMINIUM', color: 3, ltype: 'Continuous' },
  { name: 'ME_STEEL', color: 2, ltype: 'Continuous' },
  { name: 'ME_GLASS', color: 4, ltype: 'Continuous' },
  { name: 'ME_OTHER MATERIALS', color: 6, ltype: 'Continuous' },
] as const

type Layer = typeof LAYERS[number]['name']

/** Spessori di linea dei layer (centesimi di mm; assenti = Default) */
const LAYER_LW: Partial<Record<string, number>> = {
  ME_ANNO_DIMENSIONS: 0, ME_ANNO_HATCHES: 0, ME_ANNO_TEXTS: 0, ME_ANNO_CLOUDS: 20, ME_BYOTHERS_HATCH: 0,
  ME_ALUMINIUM: 0, ME_STEEL: 0, ME_GLASS: 0, 'ME_OTHER MATERIALS': 0,
}
/** Colori veri (RGB) dei layer che li hanno nel template; il colore ACI resta come alternativa */
const LAYER_TRUE_COLOR: Partial<Record<string, number>> = {
  ME_ANNO_HATCHES: 0xcdd4d6, ME_AXIS: 0x808080, ME_ANNO_CLOUDS: 0xff0000, ME_BYOTHERS_HATCH: 0xb9b9b9,
}

/** Tipi di linea del template (lunghezze in mm, LTSCALE 1) */
const LTYPES: [string, string, number[]][] = [
  ['Continuous', 'Solid line', []],
  ['ME_HIDDEN 1-1', '', [0.6, -0.6, 0.6, -0.6]],
  ['ME_DASH DOT 5 -2-0', '', [5, -2, 0, -2]],
  ['ME_asse 2 1 0', ' tratto 2 spazio 1 punto', [2, -1, 0, -1]],
]

/** Stile di testo del template (Arial Narrow, fattore di larghezza 0,8) */
const TEXT_STYLE = 'Arial Narrow'

type Ent =
  | { kind: 'poly'; layer: Layer; color: number; pts: Point[]; closed: boolean }
  | { kind: 'circle'; layer: Layer; color: number; c: Point; r: number }
  /** triangolo pieno (SOLID) */
  | { kind: 'solid'; layer: Layer; color: number; pts: [Point, Point, Point] }
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

/** Triangoli di un poligono semplice (ear clipping), per le campiture piene */
export function triangulate(poly: Point[]): [Point, Point, Point][] {
  const pts = poly.slice()
  if (pts.length > 2 && Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) < 1e-9) pts.pop()
  const area = pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p.x * q.y - q.x * p.y }, 0)
  if (area < 0) pts.reverse()
  const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
  const inside = (p: Point, a: Point, b: Point, c: Point) =>
    cross(a, b, p) >= 0 && cross(b, c, p) >= 0 && cross(c, a, p) >= 0
  const out: [Point, Point, Point][] = []
  let guard = pts.length * pts.length
  while (pts.length > 3 && guard-- > 0) {
    let cut = false
    for (let i = 0; i < pts.length; i++) {
      const a = pts[(i + pts.length - 1) % pts.length], b = pts[i], c = pts[(i + 1) % pts.length]
      if (cross(a, b, c) <= 1e-12) continue
      if (pts.some(p => p !== a && p !== b && p !== c && inside(p, a, b, c))) continue
      out.push([a, b, c])
      pts.splice(i, 1)
      cut = true
      break
    }
    if (!cut) break
  }
  if (pts.length === 3) out.push([pts[0], pts[1], pts[2]])
  return out
}

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
  const fill = (layer: Layer, polygon: Point[]) => {
    for (const t of triangulate(polygon)) out.push({ kind: 'solid', layer, color, pts: [R(t[0]), R(t[1]), R(t[2])] })
  }
  /** retino del materiale dentro il contorno (coordinate prima della rotazione) */
  const hatch = (polygon: Point[]) => {
    const def = hatchDef(o.pattern)
    if (!def || polygon.length < 3) return
    const g = hatchGeometry(def, polygon, o.patternScale ?? 1, o.patternAngle ?? 0)
    if (!g) return
    for (const pl of g.segs) poly('ME_ANNO_HATCHES', pl, false)
    for (const d of g.dots) out.push({ kind: 'circle', layer: 'ME_ANNO_HATCHES', color, c: R(d), r: d.r })
  }
  const text = (layer: Layer, p: Point, fontSize: number, t: string, rot: number,
    align: 'left' | 'center', valign: 'baseline' | 'middle', c = color) => {
    // le scritte stanno sul layer dei testi, tranne i valori delle quote
    const tl: Layer = layer === 'ME_ANNO_DIMENSIONS' ? layer : 'ME_ANNO_TEXTS'
    if (t.trim()) out.push({ kind: 'text', layer: tl, color: c, p: R(p), height: fontSize * CAP, text: t, rot: rot + rotation, align, valign })
  }

  switch (o.type) {
    case 'rect': {
      const pts = [
        { x: o.x, y: o.y }, { x: o.x + o.width, y: o.y }, { x: o.x + o.width, y: o.y + o.height }, { x: o.x, y: o.y + o.height },
      ]
      poly('ME_PROJECTION', pts, true)
      hatch(pts)
      break
    }

    case 'circle':
      out.push({ kind: 'circle', layer: 'ME_PROJECTION', color, c: R({ x: o.x, y: o.y }), r: o.radius })
      if (o.pattern) hatch(Array.from({ length: 96 }, (_, i) => ({
        x: o.x + o.radius * Math.cos((i / 96) * 2 * Math.PI), y: o.y + o.radius * Math.sin((i / 96) * 2 * Math.PI),
      })))
      break

    case 'polyline': {
      if (o.keder) {
        const dr = kederDrawing(o.points, o.keder)
        path('ME_FABRIC_SECT', dr.outline)
        path('ME_FABRIC_SECT', dr.thin)
        break
      }
      const closed = o.closed && o.points.length > 2
      const pts = closed ? o.points.slice(0, -1) : o.points
      poly('ME_PROJECTION', pts, closed)
      if (closed) hatch(pts)
      break
    }

    case 'text': {
      const fontSize = o.fontSize || 20
      const { w, h } = textSize(o)
      const lines = o.text.split('\n')
      const lineH = fontSize * 1.2
      const tc = toAci(o.textColor || o.stroke)
      const y0 = o.y + h / 2 - ((lines.length - 1) * lineH) / 2
      lines.forEach((l, i) => text('ME_ANNO_TEXTS', { x: o.x + w / 2, y: y0 + i * lineH }, fontSize, l, 0, 'center', 'middle', tc))
      if (o.boxEnabled) {
        poly('ME_ANNO_TEXTS', [{ x: o.x, y: o.y }, { x: o.x + w, y: o.y }, { x: o.x + w, y: o.y + h }, { x: o.x, y: o.y + h }], true)
      }
      const ld = textLeader(o)
      if (ld) {
        // il richiamo è già in coordinate mondo (rotazione inclusa): niente R()
        out.push({ kind: 'poly', layer: 'ME_ANNO_TEXTS', color: tc, pts: ld.pts, closed: false })
        const tm = leaderTerminal(ld)
        if (tm.arrow) out.push({ kind: 'solid', layer: 'ME_ANNO_TEXTS', color: tc, pts: [tm.arrow[0], tm.arrow[1], tm.arrow[2]] })
        if (tm.dot) out.push({ kind: 'circle', layer: 'ME_ANNO_TEXTS', color: tc, c: tm.dot.c, r: tm.dot.r })
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
      poly('ME_ANNO_TEXTS', [{ x: o.x1, y: o.y1 }, { x: o.x2 - u.x * headLen * 0.6, y: o.y2 - u.y * headLen * 0.6 }], false)
      poly('ME_ANNO_TEXTS', [
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
      poly('ME_ANNO_DIMENSIONS', [{ x: o.x1, y: o.y1 }, { x: o.x2, y: o.y2 }], false)
      for (const p of [{ x: o.x1, y: o.y1 }, { x: o.x2, y: o.y2 }]) {
        const a = rotatePoint({ x: p.x, y: p.y - tick }, p, angleDeg)
        const b = rotatePoint({ x: p.x, y: p.y + tick }, p, angleDeg)
        poly('ME_ANNO_DIMENSIONS', [a, b], false)
      }
      const qt = quoteTerminals(o)
      for (const a of qt.arrows) { poly('ME_ANNO_DIMENSIONS', a, true); fill('ME_ANNO_DIMENSIONS', a) }
      for (const t of qt.ticks) poly('ME_ANNO_DIMENSIONS', t, false)
      const mid = { x: (o.x1 + o.x2) / 2, y: (o.y1 + o.y2) / 2 }
      const tp = rotatePoint({ x: mid.x, y: mid.y - (4 + sw) }, mid, textAngle)
      text('ME_ANNO_DIMENSIONS', tp, 14, o.text || `${Math.round(d * 10) / 10}`, textAngle, 'center', 'baseline', toAci(o.textColor || o.stroke))
      break
    }

    case 'symbol':
      out.push({ kind: 'circle', layer: 'ME_ANNO_TEXTS', color, c: R({ x: o.x, y: o.y }), r: 15 })
      text('ME_ANNO_TEXTS', { x: o.x, y: o.y }, 14, String(o.value ?? ''), 0, 'center', 'middle')
      break

    case 'bolt': {
      for (const c of boltCenters(o)) {
        const dr = boltDrawing(o, c)
        path('ME_BOLT', dr.outline)
        path('ME_BOLT', dr.thin)
        path('ME_AXIS', dr.axis)
      }
      if (o.showLabel) {
        const b = boltBounds(o)
        text('ME_BOLT', { x: b.x + b.w + 6, y: b.y - 4 }, 12, boltLabel(o), 0, 'left', 'baseline')
      }
      break
    }

    case 'cushion': {
      const dr = cushionDrawing(o)
      for (const l of dr.layers) out.push({ kind: 'poly', layer: 'ME_FABRIC_SECT', color, pts: l.pts, closed: false })
      path('ME_AXIS', dr.axis)
      if (o.showLabel) text('ME_ANNO_TEXTS', { x: dr.bounds.x + dr.bounds.w / 2, y: dr.bounds.y - 8 }, Math.max(12, dr.bounds.w / 40), cushionLabel(o), 0, 'center', 'baseline')
      break
    }

    case 'clamp': {
      const dr = clampDrawing(o)
      // ogni parte del morsetto sul layer del suo materiale
      const CLAMP_LAYER = { steel: 'ME_STEEL', alu: 'ME_ALUMINIUM', other: 'ME_OTHER MATERIALS', bolt: 'ME_BOLT', fabric: 'ME_FABRIC_SECT', cable: 'ME_CABLE' } as const
      for (const [m, part] of Object.entries(dr.byMat)) {
        path(CLAMP_LAYER[m as keyof typeof CLAMP_LAYER], part.outline)
        path(CLAMP_LAYER[m as keyof typeof CLAMP_LAYER], part.thin)
      }
      path('ME_AXIS', dr.axis)
      if (o.showLabel) text('ME_ANNO_TEXTS', { x: dr.bounds.x + dr.bounds.w + 6, y: dr.bounds.y + 10 }, 12, clampLabel(o), 0, 'left', 'baseline')
      break
    }

    case 'part': {
      // coordinate già ruotate: niente R()
      const def = partDef(o.part)
      if (!def) break
      const g = partWorld(o, def)
      const layer: Layer = def.g === 'Profili in alluminio' ? 'ME_ALUMINIUM' : def.g === 'Funi e terminali' ? 'ME_CABLE'
        : /keder/i.test(def.n) ? 'ME_FABRIC_SECT' : 'ME_OTHER MATERIALS'
      for (const l of g.lines) if (l.pts.length > 1) out.push({ kind: 'poly', layer, color, pts: l.pts, closed: l.closed })
      for (const f of g.fills) {
        for (const t of triangulate(f)) out.push({ kind: 'solid', layer, color, pts: [t[0], t[1], t[2]] })
      }
      for (const t of g.texts) {
        out.push({ kind: 'text', layer: 'ME_ANNO_TEXTS', color, p: t.p, height: t.height, text: t.text, rot: t.rot, align: 'left', valign: 'baseline' })
      }
      break
    }

    case 'person': {
      // sagoma piena: campiture SOLID sovrapposte
      for (const pl of personPolygons(o)) fill('ME_GREY', pl)
      if (o.showLabel) {
        const b = personBounds(o)
        text('ME_GREY', { x: b.x + b.w + 40, y: b.y + 120 }, Math.max(10, o.height / 18), personLabel(o), 0, 'left', 'baseline')
      }
      break
    }

    case 'screw': {
      const dr = screwDrawing(o)
      path('ME_BOLT', dr.outline)
      path('ME_BOLT', dr.thin)
      path('ME_AXIS', dr.axis)
      if (o.showLabel) text('ME_BOLT', { x: dr.bounds.x + dr.bounds.w + 4, y: dr.bounds.y + 4 }, 10, screwLabel(o), 0, 'left', 'baseline')
      break
    }

    case 'profile': {
      const profile = findProfile(o.profileName)
      if (!profile) break
      const { path: d, dashed } = generateBeamPath({ ...profile, viewType: o.viewType, length: o.length })
      const local = profileToWorld(o)
      path('ME_STEEL', d, local)
      path('ME_HIDDEN', dashed, local)
      const label = o.label === 'name' ? profile.name : o.label === 'code' ? profile.code : o.label === 'tekla' ? profile.tekla : ''
      if (label) {
        const lb = getObjectBounds(o)
        text('ME_STEEL', { x: lb.x, y: lb.y - 6 }, 12, label, 0, 'left', 'baseline')
      }
      break
    }

    case 'cable': {
      const dr = cableDrawing(o)
      path('ME_CABLE', dr.rope)
      path('ME_CABLE', dr.outline)
      path('ME_CABLE', dr.thin)
      path('ME_AXIS', dr.axis)
      if (o.showLabel !== false) {
        const textAngle = dr.angle > 90 || dr.angle < -90 ? dr.angle + 180 : dr.angle
        const fs = Math.max(14, o.size * 1.2)
        const off = (o.size / 2 + fs * 0.4) * (textAngle === dr.angle ? -1 : 1)
        const mid = { x: (o.x1 + o.x2) / 2 + dr.v.x * off, y: (o.y1 + o.y2) / 2 + dr.v.y * off }
        text('ME_CABLE', mid, fs, cableLabel(o), textAngle, 'center', 'middle')
      }
      break
    }

    case 'deck': {
      const dr = deckDrawing(o)
      path('ME_OTHER MATERIALS', dr.slab)
      path('ME_STEEL', dr.deck)
      path('ME_STEEL', dr.thin)
      path('ME_HIDDEN', dr.hidden)
      path('ME_BOLT', dr.studs)
      if (o.showLabel !== false) {
        const lp = deckLabelPlacement(o)
        text('ME_STEEL', lp.pos, lp.fontSize, deckLabel(o), lp.angle, 'center', 'middle')
      }
      break
    }

    case 'weld': {
      const dr = weldDrawing(o)
      path('ME_ANNO_TEXTS', dr.lines)
      path('ME_HIDDEN', dr.dashed)
      for (const pl of pathToPolylines(dr.solid)) { poly('ME_ANNO_TEXTS', pl.pts, true); fill('ME_ANNO_TEXTS', pl.pts) }
      for (const b of dr.bead) { poly('ME_ANNO_TEXTS', b, true); fill('ME_ANNO_TEXTS', b) }
      if (dr.ring) out.push({ kind: 'circle', layer: 'ME_ANNO_TEXTS', color, c: dr.ring.c, r: dr.ring.r })
      for (const t of dr.texts) {
        // la tela usa l'ancoraggio orizzontale start/end: in DXF si allinea a sinistra stimando la larghezza
        const w = t.text.length * 0.6 * dr.fontSize
        const x = t.anchor === 'end' ? t.x - w : t.anchor === 'middle' ? t.x - w / 2 : t.x
        text('ME_ANNO_TEXTS', { x, y: t.y }, dr.fontSize, t.text, 0, 'left', 'middle')
      }
      break
    }

    case 'envelope':
    case 'seam': {
      const dr = o.type === 'envelope' ? envelopeDrawing(o) : seamDrawing(o)
      const mat: Layer = o.type === 'seam' ? 'ME_STEEL' : o.kind === 'glass' ? 'ME_GLASS' : 'ME_OTHER MATERIALS'
      for (const l of dr.layers ?? []) path(mat, l.d)
      path(mat, dr.fill)
      path('ME_HIDDEN', dr.dashed)
      path(mat, dr.lines)
      path(mat, dr.thin)
      for (const pl of pathToPolylines(dr.solid)) { poly(mat, pl.pts, true); fill(mat, pl.pts) }
      if (o.showLabel) {
        const above = o.type === 'envelope' ? envelopeThickness(o) + (o.kind === 'sandwich' && o.ribs === 'roof' ? o.ribHeight ?? 40 : 0) : o.height
        const lp = labelPlacement(dr, above)
        text(mat, lp.pos, lp.fontSize, o.type === 'envelope' ? envelopeLabel(o) : seamLabel(o), lp.angle, 'center', 'middle')
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
  // maniglie (handle) esadecimali: ogni oggetto del DXF 2000 ne ha una
  let seed = 0x20
  const H = () => (seed++).toString(16).toUpperCase()
  // dizionario radice, gruppi e stile di stampa "Normal" (ogni layer ci punta con il codice 390)
  const root = H(), groups = H(), plotStyles = H(), normal = H()

  // estensione del disegno
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const grow = (p: Point, r = 0) => {
    minX = Math.min(minX, p.x - r); maxX = Math.max(maxX, p.x + r)
    minY = Math.min(minY, Y(p.y) - r); maxY = Math.max(maxY, Y(p.y) + r)
  }
  for (const e of ents) {
    if (e.kind === 'poly' || e.kind === 'solid') e.pts.forEach(p => grow(p))
    else if (e.kind === 'circle') grow(e.c, e.r)
    else grow(e.p)
  }
  if (!ents.length) { minX = minY = 0; maxX = maxY = 100 }

  // tabelle, blocchi ed entità prima; l'intestazione alla fine, quando si conosce $HANDSEED
  const table = (name: string, count: number, body: (owner: string) => void, extra?: () => void) => {
    const h = H()
    g(0, 'TABLE'); g(2, name); g(5, h); g(330, 0); g(100, 'AcDbSymbolTable'); g(70, count)
    extra?.()
    body(h)
    g(0, 'ENDTAB')
  }
  /** apre un record di tabella e ne restituisce la maniglia */
  const record = (type: string, owner: string, sub: string, handleCode = 5) => {
    const h = H()
    g(0, type); g(handleCode, h); g(330, owner); g(100, 'AcDbSymbolTableRecord'); g(100, sub)
    return h
  }

  g(0, 'SECTION'); g(2, 'TABLES')
  table('VPORT', 0, () => {})
  table('LTYPE', LTYPES.length + 2, owner => {
    for (const [name, desc, pattern] of [['ByBlock', '', []], ['ByLayer', '', []], ...LTYPES] as [string, string, number[]][]) {
      record('LTYPE', owner, 'AcDbLinetypeTableRecord')
      g(2, name); g(70, 0); g(3, desc); g(72, 65); g(73, pattern.length)
      g(40, n(pattern.reduce((t, v) => t + Math.abs(v), 0)))
      for (const v of pattern) { g(49, n(v)); g(74, 0) }
    }
  })
  table('LAYER', LAYERS.length + 2, owner => {
    const layer = (name: string, color: number, ltype: string, lw = -3, plot = true, trueColor?: number) => {
      record('LAYER', owner, 'AcDbLayerTableRecord')
      g(2, name); g(70, 0); g(62, color)
      if (trueColor !== undefined) g(420, trueColor)
      g(6, ltype); g(290, plot ? 1 : 0); g(370, lw); g(390, normal)
    }
    layer('0', 7, 'Continuous')
    // Defpoints: non stampabile, come nel template
    layer('Defpoints', 7, 'Continuous', -3, false)
    for (const l of LAYERS) layer(l.name, l.color, l.ltype, LAYER_LW[l.name] ?? -3, true, LAYER_TRUE_COLOR[l.name])
  })
  table('STYLE', 2, owner => {
    const style = (name: string, width: number, font: string) => {
      record('STYLE', owner, 'AcDbTextStyleTableRecord')
      g(2, name); g(70, 0); g(40, 0); g(41, width); g(50, 0); g(71, 0); g(42, 2.5); g(3, font); g(4, '')
    }
    style('Standard', 1, 'arial.ttf')
    style(TEXT_STYLE, 0.8, 'ARIALN.TTF')
  })
  table('VIEW', 0, () => {})
  table('UCS', 0, () => {})
  table('APPID', 1, owner => { record('APPID', owner, 'AcDbRegAppTableRecord'); g(2, 'ACAD'); g(70, 0) })
  table('DIMSTYLE', 1, owner => {
    record('DIMSTYLE', owner, 'AcDbDimStyleTableRecord', 105); g(2, 'Standard'); g(70, 0)
  }, () => { g(100, 'AcDbDimStyleTable'); g(71, 0) })
  let msRecord = '', psRecord = ''
  table('BLOCK_RECORD', 2, owner => {
    msRecord = record('BLOCK_RECORD', owner, 'AcDbBlockTableRecord'); g(2, '*Model_Space')
    psRecord = record('BLOCK_RECORD', owner, 'AcDbBlockTableRecord'); g(2, '*Paper_Space')
  })
  g(0, 'ENDSEC')

  g(0, 'SECTION'); g(2, 'BLOCKS')
  for (const [name, owner, paper] of [['*Model_Space', msRecord, false], ['*Paper_Space', psRecord, true]] as const) {
    g(0, 'BLOCK'); g(5, H()); g(330, owner); g(100, 'AcDbEntity')
    if (paper) g(67, 1)
    g(8, '0'); g(100, 'AcDbBlockBegin'); g(2, name); g(70, 0); g(10, 0); g(20, 0); g(30, 0); g(3, name); g(1, '')
    g(0, 'ENDBLK'); g(5, H()); g(330, owner); g(100, 'AcDbEntity')
    if (paper) g(67, 1)
    g(8, '0'); g(100, 'AcDbBlockEnd')
  }
  g(0, 'ENDSEC')

  // entità nello spazio modello, tutte DaLayer
  g(0, 'SECTION'); g(2, 'ENTITIES')
  const head = (type: string, layer: string, sub: string) => {
    g(0, type); g(5, H()); g(330, msRecord); g(100, 'AcDbEntity'); g(8, layer); g(100, sub)
  }
  for (const e of ents) {
    if (e.kind === 'poly') {
      head('LWPOLYLINE', e.layer, 'AcDbPolyline')
      g(90, e.pts.length); g(70, e.closed ? 1 : 0); g(43, 0)
      for (const p of e.pts) { g(10, n(p.x)); g(20, n(Y(p.y))) }
    } else if (e.kind === 'solid') {
      // SOLID a tre vertici: il quarto coincide col terzo
      const [a, b, c] = e.pts
      head('SOLID', e.layer, 'AcDbTrace')
      g(10, n(a.x)); g(20, n(Y(a.y))); g(30, 0)
      g(11, n(b.x)); g(21, n(Y(b.y))); g(31, 0)
      g(12, n(c.x)); g(22, n(Y(c.y))); g(32, 0)
      g(13, n(c.x)); g(23, n(Y(c.y))); g(33, 0)
    } else if (e.kind === 'circle') {
      head('CIRCLE', e.layer, 'AcDbCircle')
      g(10, n(e.c.x)); g(20, n(Y(e.c.y))); g(30, 0); g(40, n(e.r))
    } else {
      const x = n(e.p.x), y = n(Y(e.p.y))
      head('TEXT', e.layer, 'AcDbText')
      g(10, x); g(20, y); g(30, 0)
      g(40, n(e.height)); g(1, dxfText(e.text))
      // la tela ruota in senso orario (Y verso il basso), il DXF in senso antiorario
      const rot = -e.rot
      if (rot) g(50, n(((rot % 360) + 360) % 360))
      g(41, 0.8); g(7, TEXT_STYLE)
      const hj = e.align === 'center' ? 1 : 0
      const vj = e.valign === 'middle' ? 2 : 0
      if (hj) g(72, hj)
      if (hj || vj) { g(11, x); g(21, y); g(31, 0) }
      g(100, 'AcDbText')
      if (vj) g(73, vj)
    }
  }
  g(0, 'ENDSEC')

  // oggetti obbligatori nel DXF 2000: dizionario radice, gruppi, stili di stampa
  g(0, 'SECTION'); g(2, 'OBJECTS')
  g(0, 'DICTIONARY'); g(5, root); g(330, 0); g(100, 'AcDbDictionary'); g(281, 1)
  g(3, 'ACAD_GROUP'); g(350, groups); g(3, 'ACAD_PLOTSTYLENAME'); g(350, plotStyles)
  g(0, 'DICTIONARY'); g(5, groups); g(102, '{ACAD_REACTORS'); g(330, root); g(102, '}'); g(330, root); g(100, 'AcDbDictionary'); g(281, 1)
  g(0, 'ACDBDICTIONARYWDFLT'); g(5, plotStyles); g(102, '{ACAD_REACTORS'); g(330, root); g(102, '}'); g(330, root)
  g(100, 'AcDbDictionary'); g(281, 1); g(3, 'Normal'); g(350, normal); g(100, 'AcDbDictionaryWithDefault'); g(340, normal)
  g(0, 'ACDBPLACEHOLDER'); g(5, normal); g(102, '{ACAD_REACTORS'); g(330, plotStyles); g(102, '}'); g(330, plotStyles)
  g(0, 'ENDSEC')
  g(0, 'EOF')

  const header: (string | number)[] = []
  const hg = (code: number, value: string | number) => header.push(code, value)
  hg(0, 'SECTION'); hg(2, 'HEADER')
  hg(9, '$ACADVER'); hg(1, 'AC1015')
  hg(9, '$DWGCODEPAGE'); hg(3, 'ANSI_1252')
  hg(9, '$HANDSEED'); hg(5, H())
  hg(9, '$INSUNITS'); hg(70, 4)
  hg(9, '$MEASUREMENT'); hg(70, 1)
  hg(9, '$EXTMIN'); hg(10, n(minX)); hg(20, n(minY)); hg(30, 0)
  hg(9, '$EXTMAX'); hg(10, n(maxX)); hg(20, n(maxY)); hg(30, 0)
  hg(9, '$LTSCALE'); hg(40, 1)
  hg(9, '$PSLTSCALE'); hg(70, 1)
  hg(9, '$CECOLOR'); hg(62, 256)
  hg(9, '$CELTYPE'); hg(6, 'ByLayer')
  hg(9, '$CELWEIGHT'); hg(370, -1)
  hg(0, 'ENDSEC')
  return [...header, ...lines].join('\n') + '\n'
}
