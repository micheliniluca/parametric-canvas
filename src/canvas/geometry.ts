import type { CanvasObject, Point } from '../types'
import { ALL_PROFILES } from '../profiles'
import { getBeamPoints } from '../beamPath'
import { getBoltPositions } from '../utils/boltUtils'

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
    case 'bolt': {
      const pts = [o.p1, o.p2, ...getBoltPositions(o)]
      const b = fromPoints(pts)
      const r = o.diameter
      return { x: b.x - r, y: b.y - r, w: b.w + r * 2, h: b.h + r * 2 }
    }
    case 'profile': {
      const profile = ALL_PROFILES.find(p => p.name === o.profileName)
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
  if (o.type === 'arrow' || o.type === 'quote') return { x: (o.x1 + o.x2) / 2, y: (o.y1 + o.y2) / 2 }
  if (o.type === 'bolt') return { x: (o.p1.x + o.p2.x) / 2, y: (o.p1.y + o.p2.y) / 2 }
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
      return { ...o, x1: o.x1 + dx, y1: o.y1 + dy, x2: o.x2 + dx, y2: o.y2 + dy }
    case 'bolt':
      return { ...o, x: o.x + dx, y: o.y + dy, p1: mv(o.p1), p2: mv(o.p2) }
    default:
      return { ...o, x: o.x + dx, y: o.y + dy }
  }
}

/** Punto di riferimento usato per il trascinamento */
export const refPointOf = (o: CanvasObject): Point => {
  if (o.type === 'polyline') return o.points[0] ?? { x: 0, y: 0 }
  if (o.type === 'arrow' || o.type === 'quote') return { x: o.x1, y: o.y1 }
  if (o.type === 'bolt') return o.p1
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
    case 'quote': {
      const p1 = sp({ x: obj.x1, y: obj.y1 })
      const p2 = sp({ x: obj.x2, y: obj.y2 })
      return { ...obj, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }
    }
    case 'bolt':
      return { ...obj, p1: sp(obj.p1), p2: sp(obj.p2), diameter: obj.diameter * sf }
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
  excludeId?: string,
): Point => {
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
    if (o.id === excludeId) continue
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
      const profile = ALL_PROFILES.find(p => p.name === o.profileName)
      if (profile) {
        const pts = getBeamPoints({ ...profile, viewType: o.viewType, length: o.length })
        addRing(pts.map(p => r({ x: o.x + p.x * o.scale, y: o.y + p.y * o.scale })), true)
      }
    } else if (o.type === 'polyline') {
      addRing(o.points.map(r), o.closed && o.points.length > 2)
    } else if (o.type === 'bolt') {
      candidates.push(...getBoltPositions(o).map(r))
    } else if (o.type === 'arrow' || o.type === 'quote') {
      addRing([{ x: o.x1, y: o.y1 }, { x: o.x2, y: o.y2 }].map(r), false)
    }
  }

  for (const c of candidates) if (dist(c, world) < threshold) return c
  if (nearestEdge) return nearestEdge

  const g = { x: Math.round(world.x / gridSize) * gridSize, y: Math.round(world.y / gridSize) * gridSize }
  if (dist(g, world) < threshold) return g
  return world
}
