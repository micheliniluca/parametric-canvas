import type { MouseEvent as ReactMouseEvent } from 'react'
import type { CanvasObject } from '../types'
import { getObjectBounds, getObjectCenter, rotatePoint, textSize } from './geometry'
import { round1 } from '../utils/mathUtils'

export type Corner = 'tl' | 'tr' | 'bl' | 'br'
export type Grip =
  | { kind: 'resize'; corner: Corner }
  | { kind: 'vertex'; index: number }
  | { kind: 'end'; end: 'p1' | 'p2' }
  | { kind: 'rotate' }

const ACCENT = '#6366f1'
/** Oltre questo numero di vertici (es. mano libera) non si mostrano le maniglie dei vertici */
const MAX_VERTEX_GRIPS = 40

type Props = {
  o: CanvasObject
  zoom: number
  onGrip: (e: ReactMouseEvent, grip: Grip) => void
}

/** Riquadro di selezione e maniglie, con dimensioni costanti a schermo. */
export function SelectionOverlay({ o, zoom, onGrip }: Props) {
  const k = 1 / zoom
  const r = 5 * k
  const center = getObjectCenter(o)
  const rotation = o.rotation || 0
  const transform = rotation ? `rotate(${rotation}, ${center.x}, ${center.y})` : undefined

  const grip = (key: string | number, cx: number, cy: number, g: Grip, cursor: string) => (
    <rect
      key={key}
      x={cx - r} y={cy - r} width={r * 2} height={r * 2} rx={1.5 * k}
      fill="white" stroke={ACCENT} strokeWidth={1.5 * k}
      style={{ cursor }}
      onMouseDown={e => { e.stopPropagation(); onGrip(e, g) }}
    />
  )

  const locked = !!o.locked
  const isEndpointType = o.type === 'arrow' || o.type === 'quote'
  const showVertices = !locked && o.type === 'polyline' && o.points.length <= MAX_VERTEX_GRIPS
  const showBox = locked || (!isEndpointType && !showVertices)
  const b = getObjectBounds(o)
  const pad = 4 * k

  let resizeBox: { x: number; y: number; w: number; h: number } | null = null
  if (!locked && (o.type === 'rect' || o.type === 'image')) resizeBox = { x: o.x, y: o.y, w: o.width, h: o.height }
  if (!locked && o.type === 'text') resizeBox = { x: o.x, y: o.y, ...textSize(o) }

  // Lunghezza/dimensioni mostrate accanto alla selezione
  const parts: string[] = []
  if (o.type === 'rect' || o.type === 'image') parts.push(`${round1(o.width)} × ${round1(o.height)}`)
  else if (o.type === 'circle') parts.push(`Ø ${round1(o.radius * 2)}`)
  else if (o.type === 'bolt') parts.push(`M${o.diameter}${o.cols * (o.view === 'section' ? 1 : o.rows) > 1 ? ` · ${o.cols}×${o.view === 'section' ? 1 : o.rows}` : ''}`)
  else if (o.type === 'arrow' || o.type === 'quote') parts.push(`${round1(Math.hypot(o.x2 - o.x1, o.y2 - o.y1))}`)
  if (rotation) parts.push(`${round1(rotation)}°`)
  const label = parts.join('  ·  ')
  // l'etichetta va sotto l'ingombro reale (anche se l'oggetto è ruotato)
  const labelY = Math.max(
    ...[[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]]
      .map(([x, y]) => rotatePoint({ x, y }, center, rotation).y),
  ) + 18 * k

  const rotR = Math.max(b.w, b.h) / 2 + 28 * k
  const hAngle = ((rotation - 90) * Math.PI) / 180
  const canRotate = !isEndpointType && !locked

  return (
    <g>
      <g transform={transform}>
        {showBox && (
          <rect
            x={b.x - pad} y={b.y - pad} width={b.w + pad * 2} height={b.h + pad * 2}
            fill="none" stroke={locked ? '#94a3b8' : ACCENT} strokeWidth={1 * k}
            strokeDasharray={`${4 * k} ${3 * k}`}
            pointerEvents="none"
          />
        )}
        {locked && (
          // icona lucchetto nell'angolo in alto a destra
          <g transform={`translate(${b.x + b.w + pad}, ${b.y - pad}) scale(${k})`} pointerEvents="none">
            <circle r={11} fill="white" stroke="#94a3b8" strokeWidth={1} />
            <rect x={-5} y={-1.5} width={10} height={7.5} rx={1.5} fill="#64748b" />
            <path d="M -3 -1.5 V -4 A 3 3 0 0 1 3 -4 V -1.5" fill="none" stroke="#64748b" strokeWidth={1.6} />
          </g>
        )}
        {resizeBox && (['tl', 'tr', 'bl', 'br'] as const).map(c =>
          grip(c,
            c === 'tl' || c === 'bl' ? resizeBox!.x : resizeBox!.x + resizeBox!.w,
            c === 'tl' || c === 'tr' ? resizeBox!.y : resizeBox!.y + resizeBox!.h,
            { kind: 'resize', corner: c },
            c === 'tl' || c === 'br' ? 'nwse-resize' : 'nesw-resize'),
        )}
        {showVertices && o.type === 'polyline' && o.points.map((p, i) =>
          // nelle polilinee chiuse l'ultimo punto coincide col primo
          o.closed && i === o.points.length - 1 && o.points.length > 1 ? null : grip(i, p.x, p.y, { kind: 'vertex', index: i }, 'move'),
        )}
        {!locked && (o.type === 'arrow' || o.type === 'quote') && (
          <>
            {grip('p1', o.x1, o.y1, { kind: 'end', end: 'p1' }, 'move')}
            {grip('p2', o.x2, o.y2, { kind: 'end', end: 'p2' }, 'move')}
          </>
        )}
      </g>

      {canRotate && (
        <g>
          <line
            x1={center.x + (rotR - 22 * k) * Math.cos(hAngle)} y1={center.y + (rotR - 22 * k) * Math.sin(hAngle)}
            x2={center.x + rotR * Math.cos(hAngle)} y2={center.y + rotR * Math.sin(hAngle)}
            stroke={ACCENT} strokeOpacity={0.35} strokeWidth={1 * k} pointerEvents="none"
          />
          <circle
            cx={center.x + rotR * Math.cos(hAngle)} cy={center.y + rotR * Math.sin(hAngle)}
            r={6 * k} fill="white" stroke={ACCENT} strokeWidth={2 * k}
            style={{ cursor: 'grab' }}
            onMouseDown={e => { e.stopPropagation(); onGrip(e, { kind: 'rotate' }) }}
          >
            <title>Ruota (Shift = passi di 15°)</title>
          </circle>
        </g>
      )}

      {label && (
        <text
          x={center.x} y={labelY}
          fontSize={11 * k} fill={ACCENT} textAnchor="middle" pointerEvents="none"
          style={{ userSelect: 'none' }}
        >
          {label}
        </text>
      )}
    </g>
  )
}
