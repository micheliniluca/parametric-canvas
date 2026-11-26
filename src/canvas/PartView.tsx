import type { MouseEvent as ReactMouseEvent } from 'react'
import type { PartObject } from '../types'
import { partBounds, partDef, partPoint, partTransform, useParts } from '../utils/partsLib'

/** Componente membrana: linee e campiture dalla libreria; finché non è caricata, il solo ingombro */
export function PartView({ o, transform, pe, down, stroke }: {
  o: PartObject
  transform?: string
  pe: 'all' | 'none'
  down: (e: ReactMouseEvent) => void
  stroke: string
}) {
  useParts()
  const def = partDef(o.part)
  const b = partBounds(o)
  const k = o.scale ?? 1
  const sw = o.strokeWidth ?? 0.35
  return (
    <g transform={transform} onPointerDown={down} pointerEvents={pe}>
      <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="transparent" pointerEvents={pe} />
      {def ? (
        <>
          <g transform={partTransform(o)} pointerEvents="none">
            {def.f && <path d={def.f} fill={stroke} stroke="none" />}
            <path d={def.d} fill="none" stroke={stroke} strokeWidth={sw / k} strokeLinejoin="round" strokeLinecap="round" />
          </g>
          {/* testi mai specchiati: si sposta solo il punto d'attacco */}
          {def.t.map(([x, y, h, r, text], i) => {
            const p = partPoint(o, { x, y })
            return (
              <text key={i} x={p.x} y={p.y} fontSize={(h * k) / 0.7} fill={stroke} pointerEvents="none"
                transform={r ? `rotate(${o.flipX ? -r : r} ${p.x} ${p.y})` : undefined} style={{ userSelect: 'none' }}>
                {text}
              </text>
            )
          })}
        </>
      ) : (
        <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray={`${sw * 6} ${sw * 4}`} pointerEvents="none" />
      )}
    </g>
  )
}
