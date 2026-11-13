import type { CanvasObject, Point } from '../types'
import { findProfile } from '../profiles'
import { getBeamPoints } from '../beamPath'
import { boltBounds, boltCenters } from '../utils/boltUtils'
import { cableBounds } from '../utils/cableUtils'

export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

export const rotatePoint = (p: Point, center: Point, angleDegrees: number): Point => {
  if (!angleDegrees) return p
  const rad = (angleDegrees * Math.PI) / 180
  const dx = p.x - center.x
  const dy = p.y - center.y
  return {
    x: center.x + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: center.y + dx * Math.sin(rad) + dy * Math.cos(rad),
  }
}

/** Vincolo ortogonale rispetto a un punto di riferimento */
export const applyOrtho = (p: Point, ref: Point): Point =>
  Math.abs(p.x - ref.x) > Math.abs(p.y - ref.y) ? { x: p.x, y: ref.y } : { x: ref.x, y: p.y }

export const textSize = (o: Extract<CanvasObject, { type: 'text' }>) => {
  const fontSize = o.fontSize || 20
  const padding = o.boxPadding || 10
  const lines = o.text.split('\n')
  const longest = Math.max(...lines.map(l => l.length))
  return {
    w: o.width || (longest * (fontSize * 0.6) + padding * 2),
    h: o.height || (lines.length * fontSize * 1.2 + padding * 2),
  }
}

/** Riquadro di ingombro non ruotato (coordinate mondo) */
export const getObjectBounds = (o: CanvasObject): { x: number; y: number; w: number; h: number } => {
  const fromPoints = (pts: Point[]) => {
    if (pts.length === 0) return { x: 0, y: 0, w: 0, h: 0 }
    const xs = pts.map(p => p.x)
    const ys = pts.map(p => p.y)
    const x = Math.min(...xs)
    const y = Math.min(...ys)
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
  }
  switch (o.type) {
    case 'rect':
    case 'image':
      return { x: o.x, y: o.y, w: o.width, h: o.height }
    case 'text': {
      const { w, h } = textSize(o)
      return { x: o.x, y: o.y, w, h }
    }
    case 'circle':
      return { x: o.x - o.radius, y: o.y - o.radius, w: o.radius * 2, h: o.radius * 2 }
    case 'symbol':
      return { x: o.x - 15, y: o.y - 15, w: 30, h: 30 }
    case 'polyline':
      return fromPoints(o.points)
    case 'arrow':
    case 'quote':
      return fromPoints([{ x: o.x1, y: o.y1 }, { x: o.x2, y: o.y2 }])
    case 'bolt':
      return boltBounds(o)
    case 'cable':
      return cableBounds(o)
    case 'profile': {
      const profile = findProfile(o.profileName)
      if (!profile) return { x: o.x, y: o.y, w: 0, h: 0 }
      const pts = getBeamPoints({ ...profile, viewType: o.viewType, length: o.length })
      return fromPoints(pts.map(p => ({ x: o.x + p.x * o.scale, y: o.y + p.y * o.scale })))
    }
  }
}

export const getObjectCenter = (o: CanvasObject): Point => {
  if (o.type === 'circle' || o.type === 'symbol') return { x: o.x, y: o.y }
  if (o.type === 'profile') {
    if (o.viewType === 'front') return { x: o.x, y: o.y }
    return { x: o.x + (o.length / 2) * o.scale, y: o.y }
  }
  if (o.type === 'arrow' || o.type === 'quote' || o.type === 'cable') return { x: (o.x1 + o.x2) / 2, y: (o.y1 + o.y2) / 2 }
  const b = getObjectBounds(o)
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 }
}

/** Sposta un oggetto di (dx, dy) partendo dal suo stato iniziale */
export const translateObject = (o: CanvasObject, dx: number, dy: number): CanvasObject => {
  const mv = (p: Point) => ({ x: p.x + dx, y: p.y + dy })
  switch (o.type) {
    case 'polyline':
      return { ...o, points: o.points.map(mv) }
    case 'arrow':
    case 'quote':
    case 'cable':
      return { ...o, x1: o.x1 + dx, y1: o.y1 + dy, x2: o.x2 + dx, y2: o.y2 + dy }
    default:
      return { ...o, x: o.x + dx, y: o.y + dy }
  }
}

/** Punto di riferimento usato per il trascinamento */
export const refPointOf = (o: CanvasObject): Point => {
  if (o.type === 'polyline') return o.points[0] ?? { x: 0, y: 0 }
  if (o.type === 'arrow' || o.type === 'quote' || o.type === 'cable') return { x: o.x1, y: o.y1 }
  return { x: o.x, y: o.y }
}

export const scaleObject = (obj: CanvasObject, origin: Point, sf: number): CanvasObject => {
  const sp = (p: Point): Point => ({
    x: origin.x + (p.x - origin.x) * sf,
    y: origin.y + (p.y - origin.y) * sf,
  })
  switch (obj.type) {
    case 'rect':
      return { ...obj, ...sp(obj), width: obj.width * sf, height: obj.height * sf }
    case 'image':
      return {
        ...obj, ...sp(obj), width: obj.width * sf, height: obj.height * sf,
        clipPoints: obj.clipPoints?.map(p => ({ x: p.x * sf, y: p.y * sf })),
      }
    case 'circle':
      return { ...obj, ...sp(obj), radius: obj.radius * sf }
    case 'text':
      return {
        ...obj, ...sp(obj), fontSize: obj.fontSize * sf,
        width: obj.width ? obj.width * sf : obj.width,
        height: obj.height ? obj.height * sf : obj.height,
      }
    case 'profile':
      return { ...obj, ...sp(obj), scale: obj.scale * sf }
    case 'polyline':
      return { ...obj, points: obj.points.map(sp) }
    case 'arrow':
    case 'quote':
    case 'cable': {
      const p1 = sp({ x: obj.x1, y: obj.y1 })
      const p2 = sp({ x: obj.x2, y: obj.y2 })
      return { ...obj, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }
    }
    case 'bolt':
      // il diametro resta quello normalizzato: si scalano posizione e passi
      return { ...obj, ...sp(obj), pitchX: obj.pitchX * sf, pitchY: obj.pitchY * sf }
    case 'symbol':
      return { ...obj, ...sp(obj), points: obj.points?.map(sp) }
  }
}

/**
 * Snap a vertici/punti medi, poi ai lati, poi alla griglia.
 * `threshold` è in unità mondo (passare SNAP_PX / zoom per uno snap costante a schermo).
 */
export const getSnapPoint = (
  objects: CanvasObject[],
  world: Point,
  gridSize: number,
  threshold: number,
  exclude?: string | Set<string>,
): Point => {
  const skip = (id: string) => (typeof exclude === 'string' ? id === exclude : !!exclude?.has(id))
  const candidates: Point[] = []
  let nearestEdge: Point | null = null
  let minEdge = threshold

  const checkEdge = (p1: Point, p2: Point) => {
    const l2 = (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2
    if (l2 === 0) return
    let t = ((world.x - p1.x) * (p2.x - p1.x) + (world.y - p1.y) * (p2.y - p1.y)) / l2
    t = Math.max(0, Math.min(1, t))
    const proj = { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) }
    const d = dist(proj, world)
    if (d < minEdge) {
      minEdge = d
      nearestEdge = proj
    }
  }
  const addRing = (pts: Point[], closed: boolean) => {
    candidates.push(...pts)
    const n = closed ? pts.length : pts.length - 1
    for (let i = 0; i < n; i++) {
      const a = pts[i]
      const b = pts[(i + 1) % pts.length]
      candidates.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
      checkEdge(a, b)
    }
  }

  for (const o of objects) {
    if (skip(o.id)) continue
    const center = getObjectCenter(o)
    const rot = o.rotation || 0
    const r = (p: Point) => rotatePoint(p, center, rot)

    if (o.type === 'rect' || o.type === 'image') {
      addRing([
        { x: o.x, y: o.y }, { x: o.x + o.width, y: o.y },
        { x: o.x + o.width, y: o.y + o.height }, { x: o.x, y: o.y + o.height },
      ].map(r), true)
    } else if (o.type === 'circle' || o.type === 'symbol') {
      candidates.push({ x: o.x, y: o.y })
    } else if (o.type === 'profile') {
      const profile = findProfile(o.profileName)
      if (profile) {
        const pts = getBeamPoints({ ...profile, viewType: o.viewType, length: o.length })
        addRing(pts.map(p => r({ x: o.x + p.x * o.scale, y: o.y + p.y * o.scale })), true)
      }
    } else if (o.type === 'polyline') {
      addRing(o.points.map(r), o.closed && o.points.length > 2)
    } else if (o.type === 'bolt') {
      candidates.push(...boltCenters(o).map(r))
    } else if (o.type === 'arrow' || o.type === 'quote' || o.type === 'cable') {
      addRing([{ x: o.x1, y: o.y1 }, { x: o.x2, y: o.y2 }].map(r), false)
    }
  }

  for (const c of candidates) if (dist(c, world) < threshold) return c
  if (nearestEdge) return nearestEdge

  const g = { x: Math.round(world.x / gridSize) * gridSize, y: Math.round(world.y / gridSize) * gridSize }
  if (dist(g, world) < threshold) return g
  return world
}

/** Ingombro in coordinate mondo tenendo conto della rotazione */
export const worldBounds = (o: CanvasObject) => {
  const b = getObjectBounds(o)
  const rot = o.rotation || 0
  if (!rot) return { minX: b.x, minY: b.y, maxX: b.x + b.w, maxY: b.y + b.h }
  const c = getObjectCenter(o)
  const pts = [
    { x: b.x, y: b.y }, { x: b.x + b.w, y: b.y }, { x: b.x + b.w, y: b.y + b.h }, { x: b.x, y: b.y + b.h },
  ].map(p => rotatePoint(p, c, rot))
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) }
}

export type Box = { minX: number; minY: number; maxX: number; maxY: number }

export const unionBounds = (objs: CanvasObject[]): Box | null => {
  if (!objs.length) return null
  return objs.map(worldBounds).reduce((a, b) => ({
    minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY),
  }))
}

/** Ruota un oggetto attorno a un punto esterno (rotazione di gruppo) */
export const rotateObjectAround = (o: CanvasObject, center: Point, deg: number): CanvasObject => {
  if (!deg) return o
  const rp = (p: Point) => rotatePoint(p, center, deg)
  if (o.type === 'arrow' || o.type === 'quote' || o.type === 'cable') {
    const p1 = rp({ x: o.x1, y: o.y1 })
    const p2 = rp({ x: o.x2, y: o.y2 })
    return { ...o, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }
  }
  if (o.type === 'polyline') return { ...o, points: o.points.map(rp) }
  // gli altri ruotano attorno al proprio centro: si sposta il centro e si somma l'angolo
  const c = getObjectCenter(o)
  const nc = rp(c)
  const moved = translateObject(o, nc.x - c.x, nc.y - c.y)
  const rot = ((((o.rotation || 0) + deg) % 360) + 540) % 360 - 180
  return { ...moved, rotation: rot }
}

/** Aggiunge alla lista tutti i membri dei gruppi coinvolti */
export const expandGroups = (objects: CanvasObject[], ids: string[]): string[] => {
  const groups = new Set(objects.filter(o => ids.includes(o.id) && o.groupId).map(o => o.groupId))
  if (!groups.size) return ids
  const out = new Set(ids)
  for (const o of objects) if (o.groupId && groups.has(o.groupId)) out.add(o.id)
  return [...out]
}

export type AlignKind = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom' | 'hdistribute' | 'vdistribute'

/** Allinea o distribuisce gli oggetti (i gruppi si muovono come un blocco) */
export const alignObjects = (objects: CanvasObject[], ids: string[], kind: AlignKind): CanvasObject[] => {
  const sel = objects.filter(o => ids.includes(o.id) && !o.locked)
  // unità da allineare: ogni gruppo è un blocco unico, gli altri oggetti sono singoli
  const units = new Map<string, CanvasObject[]>()
  for (const o of sel) {
    const k = o.groupId ?? o.id
    units.set(k, [...(units.get(k) ?? []), o])
  }
  const list = [...units.values()].map(objs => ({ objs, b: unionBounds(objs)! }))
  if (list.length < 2) return objects
  const all = unionBounds(sel)!
  const shift = new Map<string, Point>()
  const set = (objs: CanvasObject[], dx: number, dy: number) => objs.forEach(o => shift.set(o.id, { x: dx, y: dy }))

  if (kind === 'hdistribute' || kind === 'vdistribute') {
    const h = kind === 'hdistribute'
    const sorted = [...list].sort((a, b) => (h ? a.b.minX - b.b.minX : a.b.minY - b.b.minY))
    const size = (u: typeof list[number]) => (h ? u.b.maxX - u.b.minX : u.b.maxY - u.b.minY)
    const span = h ? all.maxX - all.minX : all.maxY - all.minY
    const gap = (span - sorted.reduce((t, u) => t + size(u), 0)) / (sorted.length - 1)
    let pos = h ? all.minX : all.minY
    for (const u of sorted) {
      const d = pos - (h ? u.b.minX : u.b.minY)
      set(u.objs, h ? d : 0, h ? 0 : d)
      pos += size(u) + gap
    }
  } else {
    for (const u of list) {
      const { b } = u
      const dx =
        kind === 'left' ? all.minX - b.minX :
        kind === 'right' ? all.maxX - b.maxX :
        kind === 'hcenter' ? (all.minX + all.maxX) / 2 - (b.minX + b.maxX) / 2 : 0
      const dy =
        kind === 'top' ? all.minY - b.minY :
        kind === 'bottom' ? all.maxY - b.maxY :
        kind === 'vcenter' ? (all.minY + all.maxY) / 2 - (b.minY + b.maxY) / 2 : 0
      set(u.objs, dx, dy)
    }
  }
  return objects.map(o => {
    const d = shift.get(o.id)
    return d && (d.x || d.y) ? translateObject(o, d.x, d.y) : o
  })
}
