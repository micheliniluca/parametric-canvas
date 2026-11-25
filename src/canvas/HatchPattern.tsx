import type { HatchDef } from '../utils/hatchUtils'
import { hatchPaths } from '../utils/hatchUtils'

/** <pattern> SVG di un retino: modulo ripetuto, ruotato e scalato, nel colore indicato */
export function HatchPattern({ id, def, scale = 1, angle = 0, color, lineWidth }: {
  id: string
  def: HatchDef
  scale?: number
  angle?: number
  color: string
  /** spessore delle linee in unità della tela (non scala con il retino) */
  lineWidth: number
}) {
  const k = scale > 0 ? scale : 1
  const { lines, dots } = hatchPaths(def)
  return (
    <defs>
      <pattern id={id} width={def.w} height={def.h} patternUnits="userSpaceOnUse"
        patternTransform={`rotate(${angle}) scale(${k})`}>
        {lines && <path d={lines} fill="none" stroke={color} strokeWidth={lineWidth / k} strokeLinejoin="round" strokeLinecap="round" />}
        {dots && <path d={dots} fill={color} />}
      </pattern>
    </defs>
  )
}
