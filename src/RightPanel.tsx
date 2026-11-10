import { useState } from 'react'
import type { ReactNode } from 'react'
import type { CanvasObject } from './types'
import type { ScreenshotMode } from './App'
import { Catalog } from './components/Catalog'
import { CATALOG_BY_SERIES, SERIES_GROUPS, SERIES_LABEL } from './profiles'
import { BOLT_DIAMETERS, BOLT_GRADES, boltDims, boltLabel, boltLength } from './utils/boltUtils'
import { exportToDXF, exportToSTL, exportToSVG } from './utils/export'
import { downloadText } from './utils/project'
import { round1 } from './utils/mathUtils'
import { Database, Download, SlidersHorizontal, MousePointerClick } from 'lucide-react'

type Props = {
  selected: CanvasObject | null
  objects: CanvasObject[]
  onChange: (patch: Partial<CanvasObject>) => void
  onAddObject: (obj: CanvasObject) => void
  getCenter: () => { x: number; y: number }
  screenshotMode: ScreenshotMode
  setScreenshotMode: (m: ScreenshotMode) => void
  onScreenshot: () => void
}

const TYPE_LABEL: Record<CanvasObject['type'], string> = {
  rect: 'Rettangolo', circle: 'Cerchio', text: 'Testo', profile: 'Profilo', image: 'Immagine',
  symbol: 'Bollino', arrow: 'Freccia', bolt: 'Bullone', quote: 'Quota', polyline: 'Linea',
}

const Field = ({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) => (
  <label className={`prop-field ${full ? 'full-width' : ''}`}>
    <span>{label}</span>
    {children}
  </label>
)

const Num = ({ value, onChange, min, step }: { value: number; onChange: (v: number) => void; min?: number; step?: number }) => (
  <input
    type="number" value={round1(value)} step={step}
    onChange={e => {
      const v = Number(e.target.value)
      if (!isNaN(v)) onChange(min !== undefined ? Math.max(min, v) : v)
    }}
  />
)

/** Pannello laterale: proprietà dell'oggetto selezionato, catalogo profili ed esportazione */
export function RightPanel({ selected, objects, onChange, onAddObject, getCenter, screenshotMode, setScreenshotMode, onScreenshot }: Props) {
  const [tab, setTab] = useState<'props' | 'catalog' | 'export'>('props')

  const handleExport = (format: 'svg' | 'dxf' | 'stl') => {
    if (format === 'svg') downloadText(exportToSVG(objects), 'disegno.svg', 'image/svg+xml')
    if (format === 'dxf') downloadText(exportToDXF(objects), 'disegno.dxf', 'application/dxf')
    if (format === 'stl') downloadText(exportToSTL(objects), 'disegno.stl', 'model/stl')
  }

  return (
    <div className="right-panel">
      <div className="rp-tabs">
        <button className={tab === 'props' ? 'active' : ''} onClick={() => setTab('props')}>
          <SlidersHorizontal size={15} /> Proprietà
        </button>
        <button className={tab === 'catalog' ? 'active' : ''} onClick={() => setTab('catalog')}>
          <Database size={15} /> Profili
        </button>
        <button className={tab === 'export' ? 'active' : ''} onClick={() => setTab('export')}>
          <Download size={15} /> Esporta
        </button>
      </div>

      <div className="rp-content">
        {tab === 'catalog' && (
          <Catalog current={selected?.type === "profile" ? selected.profileType : undefined}
            onSelect={profile => {
              const c = getCenter()
              // con un profilo selezionato, il catalogo lo sostituisce invece di aggiungerne uno nuovo
              if (selected?.type === 'profile') {
                onChange({ profileType: profile.type, profileName: profile.name })
                return
              }
              onAddObject({
                id: crypto.randomUUID(), type: 'profile', profileType: profile.type, profileName: profile.name,
                scale: 1, viewType: 'front', length: 400, x: c.x, y: c.y,
                stroke: '#0f172a', strokeWidth: 1.5, fillEnabled: true, fillColor: '#94a3b8',
              })
            }}
          />
        )}

        {tab === 'export' && (
          <div className="export-panel">
            <section>
              <h4>Screenshot negli appunti</h4>
              <div className="segmented">
                {(['white', 'grid', 'transparent'] as const).map(m => (
                  <button key={m} className={screenshotMode === m ? 'active' : ''} onClick={() => setScreenshotMode(m)}>
                    {m === 'white' ? 'Bianco' : m === 'grid' ? 'Con griglia' : 'Trasparente'}
                  </button>
                ))}
              </div>
              <button className="btn-primary wide" onClick={onScreenshot}>Copia screenshot</button>
            </section>
            <section>
              <h4>File</h4>
              <p className="muted">DXF e SVG sono adatti al taglio laser e all'importazione in CAD.</p>
              <button className="btn-secondary wide" onClick={() => handleExport('svg')}>Esporta SVG</button>
              <button className="btn-secondary wide" onClick={() => handleExport('dxf')}>Esporta DXF (2D)</button>
              <button className="btn-secondary wide" onClick={() => handleExport('stl')}>Esporta STL (3D)</button>
            </section>
          </div>
        )}

        {tab === 'props' && !selected && (
          <div className="no-selection">
            <MousePointerClick size={40} strokeWidth={1.25} />
            <p>Seleziona un oggetto per modificarne le proprietà.</p>
            <p className="muted">Colori e stili sono nella barra sopra il disegno.</p>
          </div>
        )}

        {tab === 'props' && selected && <ObjectProps o={selected} onChange={onChange} />}
      </div>
    </div>
  )
}

function ObjectProps({ o, onChange }: { o: CanvasObject; onChange: (patch: Partial<CanvasObject>) => void }) {
  const hasXY = o.type !== 'polyline' && o.type !== 'arrow' && o.type !== 'quote'
  const canRotate = o.type !== 'arrow' && o.type !== 'quote'

  return (
    <div className="properties-form">
      <div className="object-info">
        <span className="badge">{o.type === 'polyline' && o.closed ? 'Poligono' : TYPE_LABEL[o.type]}</span>
        {o.type === 'polyline' && <span className="muted">{o.closed ? o.points.length - 1 : o.points.length} vertici</span>}
      </div>

      {/* ---------- specifiche del tipo (prima, sono le più usate) ---------- */}

      {o.type === 'text' && (
        <div className="prop-grid">
          <Field label="Testo" full>
            <textarea value={o.text} onChange={e => onChange({ text: e.target.value })} />
          </Field>
          <Field label="Dimensione">
            <Num value={o.fontSize} min={4} onChange={v => onChange({ fontSize: v })} />
          </Field>
          <Field label="Riquadro">
            <select value={o.boxEnabled ? 'on' : 'off'} onChange={e => onChange({ boxEnabled: e.target.value === 'on' })}>
              <option value="off">Nessuno</option>
              <option value="on">Con bordo</option>
            </select>
          </Field>
        </div>
      )}

      {o.type === 'quote' && (
        <div className="prop-grid">
          <Field label="Testo quota" full>
            <input
              type="text" value={o.text || ''} placeholder={`${round1(Math.hypot(o.x2 - o.x1, o.y2 - o.y1))} (automatico)`}
              onChange={e => onChange({ text: e.target.value })}
            />
          </Field>
        </div>
      )}

      {o.type === 'symbol' && (
        <div className="prop-grid">
          <Field label="Numero">
            <Num value={o.value ?? 1} onChange={v => onChange({ value: v })} />
          </Field>
        </div>
      )}

      {o.type === 'profile' && (
        <div className="prop-grid">
          <Field label="Serie">
            <select
              value={o.profileType}
              onChange={e => {
                const t = e.target.value as typeof o.profileType
                const first = CATALOG_BY_SERIES[t][0]
                if (first) onChange({ profileType: t, profileName: first.name })
              }}
            >
              {SERIES_GROUPS.map(g => (
                <optgroup key={g.label} label={g.label}>
                  {g.series.map(t => <option key={t} value={t}>{SERIES_LABEL[t]}</option>)}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Profilo">
            <select value={o.profileName} onChange={e => onChange({ profileName: e.target.value })}>
              {(CATALOG_BY_SERIES[o.profileType] ?? []).map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Vista">
            <select value={o.viewType || 'front'} onChange={e => onChange({ viewType: e.target.value as typeof o.viewType })}>
              <option value="front">Sezione</option>
              <option value="side">Laterale</option>
              <option value="top">Dall'alto</option>
            </select>
          </Field>
          {o.viewType !== 'front' && (
            <Field label="Lunghezza (mm)">
              <Num value={o.length || 400} min={1} onChange={v => onChange({ length: v })} />
            </Field>
          )}
          <Field label="Scala">
            <Num value={o.scale} min={0.01} step={0.1} onChange={v => onChange({ scale: v })} />
          </Field>
        </div>
      )}

      {o.type === 'bolt' && (
        <>
          <div className="prop-grid">
            <Field label="Diametro">
              <select value={o.diameter} onChange={e => onChange({ diameter: Number(e.target.value) })}>
                {BOLT_DIAMETERS.map(d => <option key={d} value={d}>M{d}</option>)}
              </select>
            </Field>
            <Field label="Classe">
              <select value={o.grade} onChange={e => onChange({ grade: e.target.value as typeof o.grade })}>
                {BOLT_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Vista" full>
              <div className="segmented">
                {([['head', 'Testa'], ['nut', 'Dado'], ['hole', 'Foro'], ['section', 'Sezione']] as const).map(([v, l]) => (
                  <button key={v} type="button" className={o.view === v ? 'active' : ''} onClick={() => onChange({ view: v })}>{l}</button>
                ))}
              </div>
            </Field>
            <Field label="Pacco serrato (mm)">
              <Num value={o.grip} min={1} onChange={v => onChange({ grip: v })} />
            </Field>
            <Field label="Lunghezza">
              <input value={`${boltLength(o)} mm`} readOnly tabIndex={-1} />
            </Field>
            <label className="check-label full-width">
              <input type="checkbox" checked={!!o.showLabel} onChange={e => onChange({ showLabel: e.target.checked })} />
              Mostra designazione ({boltLabel(o)})
            </label>
          </div>
          <h4>Ripetizione</h4>
          <div className="prop-grid">
            <Field label="Colonne"><Num value={o.cols} min={1} onChange={v => onChange({ cols: Math.round(v) })} /></Field>
            <Field label="Passo X (mm)"><Num value={o.pitchX} min={1} onChange={v => onChange({ pitchX: v })} /></Field>
            {o.view !== 'section' && (
              <>
                <Field label="Righe"><Num value={o.rows} min={1} onChange={v => onChange({ rows: Math.round(v) })} /></Field>
                <Field label="Passo Y (mm)"><Num value={o.pitchY} min={1} onChange={v => onChange({ pitchY: v })} /></Field>
              </>
            )}
            <p className="muted full-width" style={{ margin: 0 }}>
              Passi minimi EC3 (prosp. 3.3): p1 ≥ 2,2·d0 = {round1(2.2 * boltDims(o.diameter).d0)} mm,
              p2 ≥ 2,4·d0 = {round1(2.4 * boltDims(o.diameter).d0)} mm
            </p>
          </div>
        </>
      )}

      {o.type === 'image' && (
        <div className="prop-grid">
          <Field label="Opacità" full>
            <input type="range" min={0.05} max={1} step={0.05} value={o.opacity}
              onChange={e => onChange({ opacity: Number(e.target.value) })} />
          </Field>
          {o.clipPoints && (
            <button className="btn-danger full-width" onClick={() => onChange({ clipPoints: undefined })}>
              Rimuovi scontorno
            </button>
          )}
        </div>
      )}

      {/* ---------- geometria ---------- */}
      <h4>Geometria</h4>
      <div className="prop-grid">
        {hasXY && (
          <>
            <Field label="X"><Num value={o.x} onChange={v => onChange({ x: v })} /></Field>
            <Field label="Y"><Num value={o.y} onChange={v => onChange({ y: v })} /></Field>
          </>
        )}
        {(o.type === 'rect' || o.type === 'text' || o.type === 'image') && (
          <>
            <Field label="Larghezza"><Num value={o.width || 0} min={1} onChange={v => onChange({ width: v })} /></Field>
            <Field label="Altezza"><Num value={o.height || 0} min={1} onChange={v => onChange({ height: v })} /></Field>
          </>
        )}
        {o.type === 'circle' && (
          <Field label="Diametro"><Num value={o.radius * 2} min={1} onChange={v => onChange({ radius: v / 2 })} /></Field>
        )}
        {(o.type === 'arrow' || o.type === 'quote') && (
          <>
            <Field label="X1"><Num value={o.x1} onChange={v => onChange({ x1: v })} /></Field>
            <Field label="Y1"><Num value={o.y1} onChange={v => onChange({ y1: v })} /></Field>
            <Field label="X2"><Num value={o.x2} onChange={v => onChange({ x2: v })} /></Field>
            <Field label="Y2"><Num value={o.y2} onChange={v => onChange({ y2: v })} /></Field>
          </>
        )}
        {canRotate && (
          <Field label="Rotazione (°)"><Num value={o.rotation || 0} onChange={v => onChange({ rotation: v })} /></Field>
        )}
        {(o.type === 'rect' || o.type === 'circle' || o.type === 'polyline' || o.type === 'arrow' || o.type === 'profile') && (
          <Field label="Spessore linea"><Num value={o.strokeWidth ?? 2} min={0.25} step={0.5} onChange={v => onChange({ strokeWidth: v })} /></Field>
        )}
      </div>
    </div>
  )
}
