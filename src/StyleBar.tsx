import type { CanvasObject, StrokeDash } from './types'
import type { DrawStyle } from './style'
import { FILL_COLORS, STROKE_COLORS, STROKE_WIDTHS, styleCaps, styleOf } from './style'
import { Ban } from 'lucide-react'

type Props = {
  /** Oggetto selezionato: se presente la barra ne modifica lo stile */
  selected: CanvasObject | null
  drawStyle: DrawStyle
  /** Applica una modifica allo stile corrente e, se c'è, all'oggetto selezionato */
  onChange: (patch: Partial<DrawStyle>) => void
}

const DASHES: { id: StrokeDash; label: string }[] = [
  { id: 'solid', label: 'Continua' },
  { id: 'dashed', label: 'Tratteggiata' },
  { id: 'dotted', label: 'Punteggiata' },
]

/**
 * Barra flottante con colori e stili sempre a portata di mano.
 * Senza selezione imposta lo stile dei prossimi oggetti; con selezione modifica l'oggetto.
 */
export function StyleBar({ selected, drawStyle, onChange }: Props) {
  const caps = styleCaps(selected)
  if (!caps.stroke && !caps.fill) return null

  const s = { ...drawStyle, ...(selected ? stripUndefined(styleOf(selected)) : {}) }
  const sw = s.strokeWidth ?? 2

  return (
    <div className="stylebar" onMouseDown={e => e.stopPropagation()}>
      {caps.stroke && (
        <div className="sb-group" title="Colore linea">
          <span className="sb-label">Linea</span>
          {STROKE_COLORS.map(({ c, n }) => (
            <button
              key={c}
              className={`sb-swatch ${eq(s.stroke, c) ? 'active' : ''}`}
              style={{ background: c }}
              title={n}
              onClick={() => onChange({ stroke: c })}
            />
          ))}
          <label
            className={`sb-swatch sb-custom ${isCustom(s.stroke, STROKE_COLORS) ? 'active' : ''}`}
            title="Colore personalizzato"
            style={isCustom(s.stroke, STROKE_COLORS) ? { background: s.stroke } : undefined}
          >
            <input type="color" value={toHex(s.stroke)} onChange={e => onChange({ stroke: e.target.value })} />
          </label>
        </div>
      )}

      {caps.fill && (
        <div className="sb-group" title="Riempimento">
          <span className="sb-label">Riemp.</span>
          <button
            className={`sb-swatch sb-none ${!s.fillEnabled ? 'active' : ''}`}
            title="Nessun riempimento"
            onClick={() => onChange({ fillEnabled: false })}
          >
            <Ban size={14} />
          </button>
          {FILL_COLORS.map(({ c, n }) => (
            <button
              key={c}
              className={`sb-swatch ${s.fillEnabled && eq(s.fillColor, c) ? 'active' : ''}`}
              style={{ background: c }}
              title={n}
              onClick={() => onChange({ fillEnabled: true, fillColor: c })}
            />
          ))}
          <label
            className={`sb-swatch sb-custom ${s.fillEnabled && isCustom(s.fillColor, FILL_COLORS) ? 'active' : ''}`}
            title="Riempimento personalizzato"
            style={s.fillEnabled && isCustom(s.fillColor, FILL_COLORS) ? { background: s.fillColor } : undefined}
          >
            <input type="color" value={toHex(s.fillColor)} onChange={e => onChange({ fillEnabled: true, fillColor: e.target.value })} />
          </label>
        </div>
      )}

      {caps.width && (
        <div className="sb-group" title="Spessore">
          {STROKE_WIDTHS.map(w => (
            <button
              key={w}
              className={`sb-btn ${sw === w ? 'active' : ''}`}
              title={`Spessore ${w}`}
              onClick={() => onChange({ strokeWidth: w })}
            >
              <svg width="22" height="16"><line x1="3" y1="8" x2="19" y2="8" stroke="currentColor" strokeWidth={Math.min(w, 6)} strokeLinecap="round" /></svg>
            </button>
          ))}
        </div>
      )}

      {caps.dash && (
        <div className="sb-group" title="Tipo linea">
          {DASHES.map(d => (
            <button
              key={d.id}
              className={`sb-btn ${(s.strokeDash ?? 'solid') === d.id ? 'active' : ''}`}
              title={d.label}
              onClick={() => onChange({ strokeDash: d.id })}
            >
              <svg width="22" height="16">
                <line x1="2" y1="8" x2="20" y2="8" stroke="currentColor" strokeWidth={2}
                  strokeDasharray={d.id === 'dashed' ? '5 3' : d.id === 'dotted' ? '1.5 3' : undefined}
                  strokeLinecap={d.id === 'dotted' ? 'round' : 'butt'} />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const isCustom = (c: string | undefined, palette: { c: string }[]) => !!c && !palette.some(p => eq(c, p.c))

const eq = (a: string | undefined, b: string) => (a ?? '').toLowerCase() === b.toLowerCase()

/** input[type=color] accetta solo #rrggbb */
const toHex = (c: string | undefined) => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : '#000000')

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>
}
