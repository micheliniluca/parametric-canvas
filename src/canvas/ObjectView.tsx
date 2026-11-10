import type { MouseEvent as ReactMouseEvent } from 'react'
import type { CanvasObject } from '../types'
import { findProfile } from '../profiles'
import { generateBeamPath } from '../beamPath'
import { boltBounds, boltCenters, boltDrawing, boltLabel } from '../utils/boltUtils'
import { dashArray } from '../style'
import { getObjectCenter, textSize } from './geometry'

type Props = {
  o: CanvasObject
  interactive: boolean
  onMouseDown: (e: ReactMouseEvent, o: CanvasObject) => void
  onDoubleClick?: (o: CanvasObject) => void
  /** Nasconde il testo mentre è aperto l'editor sulla tela */
  hideText?: boolean
  /** Anteprima della bacchetta magica per le immagini */
  imageSrcOverride?: string
}

/** Disegna un singolo oggetto. Nessuna logica di selezione: quella sta in SelectionOverlay. */
export function ObjectView({ o, interactive, onMouseDown, onDoubleClick, hideText, imageSrcOverride }: Props) {
  const pe = interactive ? 'all' : 'none'
  const down = (e: ReactMouseEvent) => onMouseDown(e, o)
  const stroke = o.stroke || '#0f172a'
  const center = getObjectCenter(o)
  const rotation = o.rotation || 0
  const transform = rotation ? `rotate(${rotation}, ${center.x}, ${center.y})` : undefined

  switch (o.type) {
    case 'rect': {
      const sw = o.strokeWidth ?? 2
      return (
        <rect
          x={o.x} y={o.y} width={o.width} height={o.height}
          transform={transform}
          fill={o.fillEnabled ? o.fillColor || '#cbd5e1' : 'none'}
          stroke={stroke} strokeWidth={sw} strokeDasharray={dashArray(o.strokeDash, sw)}
          pointerEvents={pe} onMouseDown={down}
        />
      )
    }

    case 'circle': {
      const sw = o.strokeWidth ?? 2
      return (
        <circle
          cx={o.x} cy={o.y} r={o.radius}
          fill={o.fillEnabled ? o.fillColor || '#cbd5e1' : 'none'}
          stroke={stroke} strokeWidth={sw} strokeDasharray={dashArray(o.strokeDash, sw)}
          pointerEvents={pe} onMouseDown={down}
        />
      )
    }

    case 'image':
      return (
        <image
          href={imageSrcOverride ?? o.src}
          x={o.x} y={o.y} width={o.width} height={o.height}
          opacity={o.opacity}
          transform={transform}
          preserveAspectRatio="none"
          clipPath={o.clipPoints && o.clipPoints.length > 2 ? `url(#clip-${o.id})` : undefined}
          pointerEvents={pe} onMouseDown={down}
        />
      )

    case 'polyline': {
      const sw = o.strokeWidth ?? 2
      const pts = o.points.map(p => `${p.x},${p.y}`).join(' ')
      const filled = o.closed && o.fillEnabled
      return (
        <g transform={transform}>
          {/* area di presa più larga della linea visibile */}
          {!o.closed && (
            <polyline
              points={pts} fill="none" stroke="transparent"
              strokeWidth={Math.max(12, sw + 8)}
              strokeLinejoin="round" strokeLinecap="round"
              pointerEvents={interactive ? 'stroke' : 'none'} onMouseDown={down}
            />
          )}
          <polyline
            points={pts}
            fill={filled ? o.fillColor || '#cbd5e1' : 'none'}
            stroke={stroke} strokeWidth={sw} strokeDasharray={dashArray(o.strokeDash, sw)}
            strokeLinejoin="round" strokeLinecap="round"
            pointerEvents={interactive ? (o.closed ? 'all' : 'stroke') : 'none'} onMouseDown={down}
          />
        </g>
      )
    }

    case 'text': {
      const fontSize = o.fontSize || 20
      const { w, h } = textSize(o)
      const sw = o.strokeWidth ?? 2
      const lines = o.text.split('\n')
      const lineH = fontSize * 1.2
      return (
        <g
          transform={transform}
          onMouseDown={down}
          onDoubleClick={e => { e.stopPropagation(); onDoubleClick?.(o) }}
          style={{ cursor: interactive && !o.locked ? 'move' : undefined }}
        >
          <rect
            x={o.x} y={o.y} width={w} height={h}
            fill={o.boxEnabled && o.fillEnabled ? o.fillColor || 'white' : 'transparent'}
            stroke={o.boxEnabled ? stroke : 'none'} strokeWidth={sw}
            strokeDasharray={o.boxEnabled ? dashArray(o.strokeDash, sw) : undefined}
            pointerEvents={pe}
          />
          <text
            x={o.x + w / 2}
            y={o.y + h / 2 - ((lines.length - 1) * lineH) / 2}
            fontSize={fontSize}
            fill={o.textColor || '#0f172a'}
            textAnchor="middle" dominantBaseline="middle"
            style={{ userSelect: 'none' }} pointerEvents="none"
            opacity={hideText ? 0 : 1}
          >
            {lines.map((l, i) => (
              <tspan key={i} x={o.x + w / 2} dy={i === 0 ? 0 : lineH}>{l || ' '}</tspan>
            ))}
          </text>
        </g>
      )
    }

    case 'arrow': {
      const sw = o.strokeWidth ?? 2
      const angle = Math.atan2(o.y2 - o.y1, o.x2 - o.x1) * (180 / Math.PI)
      const headLen = Math.max(6, sw * 4)
      // accorcia la linea per non far sporgere la punta
      const len = Math.hypot(o.x2 - o.x1, o.y2 - o.y1) || 1
      const ex = o.x2 - ((o.x2 - o.x1) / len) * headLen * 0.6
      const ey = o.y2 - ((o.y2 - o.y1) / len) * headLen * 0.6
      return (
        <g transform={transform}>
          <line x1={o.x1} y1={o.y1} x2={o.x2} y2={o.y2} stroke="transparent"
            strokeWidth={Math.max(14, sw + 10)} pointerEvents={interactive ? 'stroke' : 'none'} onMouseDown={down} />
          <line x1={o.x1} y1={o.y1} x2={ex} y2={ey} stroke={stroke} strokeWidth={sw}
            strokeDasharray={dashArray(o.strokeDash, sw)} pointerEvents="none" />
          <path
            transform={`translate(${o.x2}, ${o.y2}) rotate(${angle})`}
            d={`M 0 0 L ${-headLen} ${-headLen / 2.2} L ${-headLen} ${headLen / 2.2} Z`}
            fill={stroke} pointerEvents="none"
          />
        </g>
      )
    }

    case 'quote': {
      const sw = o.strokeWidth ?? 1
      const dx = o.x2 - o.x1
      const dy = o.y2 - o.y1
      const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI)
      // testo sempre leggibile (mai capovolto)
      const textAngle = angleDeg > 90 || angleDeg < -90 ? angleDeg + 180 : angleDeg
      const d = Math.hypot(dx, dy)
      const label = o.text || `${Math.round(d * 10) / 10}`
      const tick = 6 + sw * 2
      return (
        <g transform={transform}>
          <line x1={o.x1} y1={o.y1} x2={o.x2} y2={o.y2} stroke="transparent"
            strokeWidth={Math.max(14, sw + 10)} pointerEvents={interactive ? 'stroke' : 'none'} onMouseDown={down} />
          <line x1={o.x1} y1={o.y1} x2={o.x2} y2={o.y2} stroke={stroke} strokeWidth={sw} pointerEvents="none" />
          {[{ x: o.x1, y: o.y1 }, { x: o.x2, y: o.y2 }].map((p, i) => (
            <line key={i} transform={`translate(${p.x}, ${p.y}) rotate(${angleDeg})`}
              x1={0} y1={-tick} x2={0} y2={tick} stroke={stroke} strokeWidth={sw} pointerEvents="none" />
          ))}
          <text
            transform={`translate(${(o.x1 + o.x2) / 2}, ${(o.y1 + o.y2) / 2}) rotate(${textAngle})`}
            y={-(4 + sw)} fill={o.textColor || stroke} fontSize={14}
            textAnchor="middle" dominantBaseline="auto" pointerEvents="none"
            style={{ userSelect: 'none' }}
          >
            {label}
          </text>
        </g>
      )
    }

    case 'bolt': {
      const sw = o.strokeWidth ?? 1
      const parts = boltCenters(o).map(c => boltDrawing(o, c))
      const b = boltBounds(o)
      return (
        <g transform={transform} onMouseDown={down} pointerEvents={pe}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="transparent" pointerEvents={pe} />
          <path d={parts.map(p => p.axis).join('')} fill="none" stroke={stroke} strokeOpacity={0.6}
            strokeWidth={sw * 0.35} strokeDasharray={`${sw * 6} ${sw * 1.5} ${sw * 1} ${sw * 1.5}`} pointerEvents="none" />
          <path d={parts.map(p => p.outline).join('')} fill={o.fillEnabled ? o.fillColor || 'white' : 'none'}
            fillRule="evenodd" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" pointerEvents="none" />
          <path d={parts.map(p => p.thin).join('')} fill="none" stroke={stroke} strokeWidth={sw * 0.5} pointerEvents="none" />
          {o.showLabel && (
            <text x={b.x + b.w + 6} y={b.y - 4} fontSize={12} fill={stroke} pointerEvents="none" style={{ userSelect: 'none' }}>
              {boltLabel(o)}
            </text>
          )}
        </g>
      )
    }

    case 'symbol':
      if (o.symbolType !== 'bubble') return null
      return (
        <g transform={transform} onMouseDown={down}>
          <circle
            cx={o.x} cy={o.y} r={15}
            fill={o.fillEnabled ? o.fillColor || '#fde047' : 'white'}
            stroke={stroke} strokeWidth={o.strokeWidth ?? 2}
            pointerEvents={pe}
          />
          <text x={o.x} y={o.y} fontSize={14} fill={stroke} textAnchor="middle" dominantBaseline="central"
            fontWeight="bold" pointerEvents="none" style={{ userSelect: 'none' }}>
            {o.value}
          </text>
        </g>
      )

    case 'profile': {
      const profile = findProfile(o.profileName)
      if (!profile) return null
      const s = o.scale
      const sw = o.strokeWidth ?? 1.5
      const { path, dashed } = generateBeamPath({ ...profile, viewType: o.viewType, length: o.length })
      return (
        <g transform={`${transform ?? ''} translate(${o.x}, ${o.y}) scale(${s})`} onMouseDown={down} pointerEvents={pe}>
          <path
            d={path} fillRule="evenodd"
            fill={o.fillEnabled ? o.fillColor || '#94a3b8' : 'none'}
            stroke={stroke} strokeWidth={sw} vectorEffect="non-scaling-stroke"
            strokeDasharray={dashArray(o.strokeDash, sw)}
            pointerEvents={pe}
          />
          {dashed && (
            <path d={dashed} fill="none" stroke={stroke} strokeWidth={sw / 2}
              strokeDasharray="4 2" vectorEffect="non-scaling-stroke" pointerEvents="none" />
          )}
        </g>
      )
    }
  }
}
