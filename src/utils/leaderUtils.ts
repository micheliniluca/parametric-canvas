import type { Point, TextObject } from '../types'
import { rotatePoint, textSize } from '../canvas/geometry'

/**
 * Linea di richiamo di un testo: parte dal lato del riquadro più vicino alla punta,
 * con un breve tratto orizzontale (gomito), poi va dritta alla punta.
 * Tutto in coordinate mondo, tenendo conto della rotazione del testo.
 */
export type TextLeader = {
  /** inizio sul riquadro, gomito, punta */
  pts: [Point, Point, Point]
  end: NonNullable<TextObject['leaderEnd']>
  /** dimensione del terminale (lunghezza della freccia, mm) */
  size: number
  /** spessore della linea (mm) */
  width: number
}

/** Spessore della linea di richiamo: quello scelto, oppure proporzionale al testo */
export const leaderWidth = (o: TextObject): number => o.leaderWidth ?? Math.max(0.5, (o.fontSize || 20) / 16)

export const textLeader = (o: TextObject): TextLeader | null => {
  if (!o.leader) return null
  const fs = o.fontSize || 20
  const { w, h } = textSize(o)
  const c = { x: o.x + w / 2, y: o.y + h / 2 }
  const rot = o.rotation || 0
  // la punta nel sistema del testo non ruotato
  const tipL = rotatePoint(o.leader, c, -rot)
  const right = tipL.x >= c.x
  const sideX = right ? o.x + w : o.x
  const landing = Math.min(fs * 0.8, Math.max(0, Math.abs(tipL.x - sideX)))
  const start = { x: sideX, y: c.y }
  const elbow = { x: sideX + (right ? landing : -landing), y: c.y }
  const width = leaderWidth(o)
  return {
    pts: [rotatePoint(start, c, rot), rotatePoint(elbow, c, rot), { ...o.leader }],
    end: o.leaderEnd ?? 'arrow',
    // con una linea spessa la freccia cresce, altrimenti sparirebbe sotto la linea
    size: Math.max(4, fs * 0.6, width * 5),
    width,
  }
}

/** Punta di freccia piena (triangolo) e punto, in coordinate mondo */
export const leaderTerminal = (ld: TextLeader): { arrow?: Point[]; dot?: { c: Point; r: number } } => {
  const [, from, tip] = ld.pts
  if (ld.end === 'none') return {}
  if (ld.end === 'dot') return { dot: { c: tip, r: ld.size * 0.3 } }
  const L = Math.hypot(tip.x - from.x, tip.y - from.y) || 1
  const ux = (tip.x - from.x) / L, uy = (tip.y - from.y) / L
  const b = { x: tip.x - ux * ld.size, y: tip.y - uy * ld.size }
  const hw = ld.size * 0.3
  return { arrow: [tip, { x: b.x - uy * hw, y: b.y + ux * hw }, { x: b.x + uy * hw, y: b.y - ux * hw }] }
}

/** Posizione iniziale della punta quando si attiva il richiamo: in basso a destra del testo */
export const defaultLeaderTip = (o: TextObject): Point => {
  const fs = o.fontSize || 20
  const { w, h } = textSize(o)
  return { x: o.x + w + fs * 3, y: o.y + h + fs * 2 }
}
