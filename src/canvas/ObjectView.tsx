import type { MouseEvent as ReactMouseEvent } from 'react'
import type { CanvasObject } from '../types'
import { findProfile } from '../profiles'
import { generateBeamPath } from '../beamPath'
import { boltBounds, boltCenters, boltDrawing, boltLabel } from '../utils/boltUtils'
import { cableDrawing, cableLabel } from '../utils/cableUtils'
import { CONCRETE_TILE, concreteHatch, deckDrawing, deckLabel, deckLabelPlacement } from '../utils/deckUtils'
import { weldDrawing } from '../utils/weldUtils'
import { leaderTerminal, textLeader } from '../utils/leaderUtils'
import { quoteTerminals } from '../utils/quoteUtils'
import { dashArray } from '../style'
import { flipTransform, getObjectBounds, getObjectCenter, textSize } from './geometry'

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
export function ObjectView(props: Props) {
  const { o } = props
  const el = renderObject(props)
  // l'immagine gestisce l'opacità sul proprio elemento
  const op = o.type === 'image' ? 1 : o.opacity ?? 1
  return op < 1 ? <g opacity={op}>{el}</g> : el
}

function renderObject({ o, interactive, onMouseDown, onDoubleClick, hideText, imageSrcOverride }: Props) {
  const fo = o.fillOpacity
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
          fill={o.fillEnabled ? o.fillColor || '#cbd5e1' : 'none'} fillOpacity={fo}
          stroke={stroke} strokeWidth={sw} strokeDasharray={dashArray(o.strokeDash, sw)}
          pointerEvents={pe} onPointerDown={down}
        />
      )
    }

    case 'circle': {
      const sw = o.strokeWidth ?? 2
      return (
        <circle
          cx={o.x} cy={o.y} r={o.radius}
          fill={o.fillEnabled ? o.fillColor || '#cbd5e1' : 'none'} fillOpacity={fo}
          stroke={stroke} strokeWidth={sw} strokeDasharray={dashArray(o.strokeDash, sw)}
          pointerEvents={pe} onPointerDown={down}
        />
      )
    }

    case 'image':
      return (
        <g transform={transform}>
          <image
            href={imageSrcOverride ?? o.src}
            x={o.x} y={o.y} width={o.width} height={o.height}
            opacity={o.opacity}
            transform={flipTransform(o)}
            preserveAspectRatio="none"
            clipPath={o.clipPoints && o.clipPoints.length > 2 ? `url(#clip-${o.id})` : undefined}
            pointerEvents={pe} onPointerDown={down}
          />
        </g>
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
              pointerEvents={interactive ? 'stroke' : 'none'} onPointerDown={down}
            />
          )}
          {o.pressures && o.pressures.length === o.points.length && !o.closed ? (
            <PressureStroke points={o.points} pressures={o.pressures} width={sw} stroke={stroke} />
          ) : (
          <polyline
            points={pts}
            fill={filled ? o.fillColor || '#cbd5e1' : 'none'} fillOpacity={fo}
            stroke={stroke} strokeWidth={sw} strokeDasharray={dashArray(o.strokeDash, sw)}
            strokeLinejoin="round" strokeLinecap="round"
            pointerEvents={interactive ? (o.closed ? 'all' : 'stroke') : 'none'} onPointerDown={down}
          />
          )}
        </g>
      )
    }

    case 'text': {
      const fontSize = o.fontSize || 20
      const { w, h } = textSize(o)
      const sw = o.strokeWidth ?? 2
      const lines = o.text.split('\n')
      const lineH = fontSize * 1.2
      const ld = textLeader(o)
      const term = ld ? leaderTerminal(ld) : null
      const lc = o.textColor || '#0f172a'
      const body = (
        <g
          transform={transform}
          onPointerDown={down}
          onDoubleClick={e => { e.stopPropagation(); onDoubleClick?.(o) }}
          style={{ cursor: interactive && !o.locked ? 'move' : undefined }}
        >
          <rect
            x={o.x} y={o.y} width={w} height={h}
            // lo sfondo dipende solo dal riempimento; il bordo è a parte
            fill={o.fillEnabled ? o.fillColor || 'white' : 'transparent'} fillOpacity={fo}
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
      if (!ld) return body
      const d = `M ${ld.pts.map(p => `${p.x} ${p.y}`).join(' L ')}`
      return (
        <g>
          {/* richiamo sotto al testo: il riquadro pieno copre l'attacco */}
          <g onPointerDown={down}>
            <path d={d} fill="none" stroke="transparent" strokeWidth={12} vectorEffect="non-scaling-stroke"
              pointerEvents={interactive ? 'stroke' : 'none'} />
            <path d={d} fill="none" stroke={lc} strokeWidth={ld.width} strokeLinejoin="round" pointerEvents="none" />
            {term?.arrow && <path d={`M ${term.arrow.map(p => `${p.x} ${p.y}`).join(' L ')} Z`} fill={lc} pointerEvents="none" />}
            {term?.dot && <circle cx={term.dot.c.x} cy={term.dot.c.y} r={term.dot.r} fill={lc} pointerEvents="none" />}
          </g>
          {body}
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
            strokeWidth={Math.max(14, sw + 10)} pointerEvents={interactive ? 'stroke' : 'none'} onPointerDown={down} />
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
      const term = quoteTerminals(o)
      return (
        <g transform={transform}>
          <line x1={o.x1} y1={o.y1} x2={o.x2} y2={o.y2} stroke="transparent"
            strokeWidth={Math.max(14, sw + 10)} pointerEvents={interactive ? 'stroke' : 'none'} onPointerDown={down} />
          <line x1={o.x1} y1={o.y1} x2={o.x2} y2={o.y2} stroke={stroke} strokeWidth={sw} pointerEvents="none" />
          {[{ x: o.x1, y: o.y1 }, { x: o.x2, y: o.y2 }].map((p, i) => (
            <line key={i} transform={`translate(${p.x}, ${p.y}) rotate(${angleDeg})`}
              x1={0} y1={-tick} x2={0} y2={tick} stroke={stroke} strokeWidth={sw} pointerEvents="none" />
          ))}
          {term.arrows.map((a, i) => (
            <path key={`a${i}`} d={`M ${a.map(p => `${p.x} ${p.y}`).join(' L ')} Z`} fill={stroke} pointerEvents="none" />
          ))}
          {term.ticks.map(([a, b], i) => (
            <line key={`t${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={sw * 1.8}
              strokeLinecap="round" pointerEvents="none" />
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
        <g transform={transform} onPointerDown={down} pointerEvents={pe}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="transparent" pointerEvents={pe} />
          <path d={parts.map(p => p.axis).join('')} fill="none" stroke={stroke} strokeOpacity={0.6}
            strokeWidth={sw * 0.35} strokeDasharray={`${sw * 6} ${sw * 1.5} ${sw * 1} ${sw * 1.5}`} pointerEvents="none" />
          <path d={parts.map(p => p.outline).join('')} fill={o.fillEnabled ? o.fillColor || 'white' : 'none'} fillOpacity={fo}
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

    case 'cable': {
      const sw = o.strokeWidth ?? 1.5
      const dr = cableDrawing(o)
      const fill = o.fillEnabled ? o.fillColor || '#cbd5e1' : 'none'
      const textAngle = dr.angle > 90 || dr.angle < -90 ? dr.angle + 180 : dr.angle
      const fs = Math.max(14, o.size * 1.2)
      const off = o.size / 2 + fs * 0.4
      // il testo va sempre "sopra" la fune, dal lato leggibile
      const side = textAngle === dr.angle ? -1 : 1
      const mid = { x: (o.x1 + o.x2) / 2 + dr.v.x * off * side, y: (o.y1 + o.y2) / 2 + dr.v.y * off * side }
      return (
        <g transform={transform} onPointerDown={down}>
          <path d={dr.axis} stroke="transparent" strokeWidth={14} vectorEffect="non-scaling-stroke" fill="none"
            pointerEvents={interactive ? 'stroke' : 'none'} />
          <path d={dr.axis} fill="none" stroke={stroke} strokeOpacity={0.6} strokeWidth={sw * 0.5}
            strokeDasharray="12 3 2 3" vectorEffect="non-scaling-stroke" pointerEvents="none" />
          {dr.rope && (
            <path d={dr.rope} fill={fill} fillOpacity={fo} stroke={stroke} strokeWidth={sw} vectorEffect="non-scaling-stroke"
              strokeLinejoin="round" pointerEvents={pe} />
          )}
          {dr.outline && (
            <path d={dr.outline} fill={fill} fillOpacity={fo} fillRule="evenodd" stroke={stroke} strokeWidth={sw}
              vectorEffect="non-scaling-stroke" strokeLinejoin="round" pointerEvents={pe} />
          )}
          {dr.thin && (
            <path d={dr.thin} fill="none" stroke={stroke} strokeWidth={sw * 0.5} vectorEffect="non-scaling-stroke" pointerEvents="none" />
          )}
          {o.showLabel !== false && (
            <text transform={`translate(${mid.x}, ${mid.y}) rotate(${textAngle})`} fontSize={fs} fill={stroke}
              textAnchor="middle" dominantBaseline="middle" pointerEvents="none" style={{ userSelect: 'none' }}>
              {cableLabel(o)}
            </text>
          )}
        </g>
      )
    }

    case 'deck': {
      const sw = o.strokeWidth ?? 1.5
      const dr = deckDrawing(o)
      const fill = o.fillEnabled ? o.fillColor || '#e2e8f0' : 'none'
      const lp = o.showLabel !== false ? deckLabelPlacement(o) : null
      return (
        <g transform={transform} onPointerDown={down}>
          {/* area di presa lungo la linea d'appoggio */}
          <line x1={o.x1} y1={o.y1} x2={o.x2} y2={o.y2} stroke="transparent" strokeWidth={14}
            vectorEffect="non-scaling-stroke" pointerEvents={interactive ? 'stroke' : 'none'} />
          {dr.slab && (
            <path d={dr.slab} fill={fill} fillOpacity={fo} stroke={stroke} strokeWidth={sw * 0.75}
              vectorEffect="non-scaling-stroke" strokeLinejoin="round" pointerEvents={pe} />
          )}
          {dr.slab && o.hatch && (
            <>
              <defs>
                <pattern id={`conc-${o.id}`} width={CONCRETE_TILE} height={CONCRETE_TILE} patternUnits="userSpaceOnUse">
                  <path d={concreteHatch.triangles} fill="none" stroke={stroke} strokeWidth={0.7} strokeLinejoin="round" />
                  <path d={concreteHatch.dots} fill={stroke} />
                </pattern>
              </defs>
              <path d={dr.slab} fill={`url(#conc-${o.id})`} stroke="none" pointerEvents="none" />
            </>
          )}
          {dr.deck && (
            <path d={dr.deck} fill={o.view === 'section' || dr.slab ? 'none' : fill} fillOpacity={fo}
              stroke={stroke} strokeWidth={sw} vectorEffect="non-scaling-stroke" strokeLinejoin="round"
              pointerEvents={o.view === 'section' ? (interactive ? 'stroke' : 'none') : pe} />
          )}
          {dr.hidden && (
            <path d={dr.hidden} fill="none" stroke={stroke} strokeOpacity={0.6} strokeWidth={sw * 0.5}
              strokeDasharray="6 4" vectorEffect="non-scaling-stroke" pointerEvents="none" />
          )}
          {dr.thin && (
            <path d={dr.thin} fill="none" stroke={stroke} strokeWidth={sw * 0.5} vectorEffect="non-scaling-stroke" pointerEvents="none" />
          )}
          {dr.studs && (
            <path d={dr.studs} fill="white" stroke={stroke} strokeWidth={sw * 0.75} vectorEffect="non-scaling-stroke"
              strokeLinejoin="round" pointerEvents="none" />
          )}
          {lp && (
            <text transform={`translate(${lp.pos.x}, ${lp.pos.y}) rotate(${lp.angle})`} fontSize={lp.fontSize} fill={stroke}
              textAnchor="middle" dominantBaseline="middle" pointerEvents="none" style={{ userSelect: 'none' }}>
              {deckLabel(o)}
            </text>
          )}
        </g>
      )
    }

    case 'weld': {
      const sw = o.strokeWidth ?? 1
      const dr = weldDrawing(o)
      return (
        <g onPointerDown={down}>
          <path d={dr.hit} fill="none" stroke="transparent" strokeWidth={14} vectorEffect="non-scaling-stroke"
            pointerEvents={interactive ? 'stroke' : 'none'} />
          {dr.bead.length > 0 && (
            <path d={dr.bead.map(pl => `M ${pl.map(p => `${p.x} ${p.y}`).join(' L ')} Z`).join(' ')}
              fill={stroke} stroke={stroke} strokeWidth={sw * 0.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round"
              pointerEvents={pe} />
          )}
          <path d={dr.lines} fill="none" stroke={stroke} strokeWidth={sw} vectorEffect="non-scaling-stroke"
            strokeLinejoin="round" strokeLinecap="round" pointerEvents="none" />
          {dr.dashed && (
            <path d={dr.dashed} fill="none" stroke={stroke} strokeWidth={sw} vectorEffect="non-scaling-stroke"
              strokeDasharray="6 3" pointerEvents="none" />
          )}
          <path d={dr.solid} fill={stroke} stroke="none" pointerEvents="none" />
          {dr.ring && (
            <circle cx={dr.ring.c.x} cy={dr.ring.c.y} r={dr.ring.r} fill="none" stroke={stroke} strokeWidth={sw}
              vectorEffect="non-scaling-stroke" pointerEvents="none" />
          )}
          {dr.texts.map((t, i) => (
            <text key={i} x={t.x} y={t.y} fontSize={dr.fontSize} fill={stroke} textAnchor={t.anchor}
              dominantBaseline="central" pointerEvents="none" style={{ userSelect: 'none' }}>
              {t.text}
            </text>
          ))}
        </g>
      )
    }

    case 'symbol':
      if (o.symbolType !== 'bubble') return null
      return (
        <g transform={transform} onPointerDown={down}>
          <circle
            cx={o.x} cy={o.y} r={15}
            fill={o.fillEnabled ? o.fillColor || '#fde047' : 'white'} fillOpacity={fo}
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
      const labelText = o.label === 'name' ? profile.name : o.label === 'code' ? profile.code : o.label === 'tekla' ? profile.tekla : ''
      const lb = labelText ? getObjectBounds(o) : null
      return (
        <g>
        {lb && (
          <text transform={transform} x={lb.x} y={lb.y - 6} fontSize={12} fill={stroke} pointerEvents="none" style={{ userSelect: 'none' }}>
            {labelText}
          </text>
        )}
        <g transform={`${transform ?? ''} ${flipTransform(o) ?? ''} translate(${o.x}, ${o.y}) scale(${s})`} onPointerDown={down} pointerEvents={pe}>
          <path
            d={path} fillRule="evenodd"
            fill={o.fillEnabled ? o.fillColor || '#94a3b8' : 'none'} fillOpacity={fo}
            stroke={stroke} strokeWidth={sw} vectorEffect="non-scaling-stroke"
            strokeDasharray={dashArray(o.strokeDash, sw)}
            pointerEvents={pe}
          />
          {dashed && (
            <path d={dashed} fill="none" stroke={stroke} strokeWidth={sw / 2}
              strokeDasharray="4 2" vectorEffect="non-scaling-stroke" pointerEvents="none" />
          )}
        </g>
        </g>
      )
    }
  }
}

/**
 * Tratto a mano libera con spessore che segue la pressione della penna:
 * un segmento per coppia di punti, con estremità arrotondate perché si raccordino.
 */
export function PressureStroke({ points, pressures, width, stroke }: {
  points: { x: number; y: number }[]
  pressures: number[]
  width: number
  stroke: string
}) {
  const w = (p: number) => width * (0.25 + 1.5 * p)
  return (
    <g pointerEvents="none">
      {points.slice(1).map((p, i) => (
        <line
          key={i}
          x1={points[i].x} y1={points[i].y} x2={p.x} y2={p.y}
          stroke={stroke} strokeWidth={(w(pressures[i]) + w(pressures[i + 1])) / 2} strokeLinecap="round"
        />
      ))}
    </g>
  )
}
