import { Dispatch, SetStateAction, useState } from 'react'
import { CanvasObject, Point } from './types'
import { Catalog } from './components/Catalog'
import { ALL_PROFILES } from './profiles'
import { exportToDXF, exportToSTL, exportToSVG } from './utils/export'
import { captureSvgToClipboard } from './utils/capture'
import { round1 } from './utils/mathUtils'
import {
  Settings2,
  Database,
  Download,
  X,
  Boxes,
  Palette,
  Info
} from 'lucide-react'

type Props = {
  selected: CanvasObject | null
  objects: CanvasObject[]
  onChange: (patch: Partial<CanvasObject>) => void
  onAddObject: (obj: CanvasObject) => void
  setDrawingPolyline: Dispatch<SetStateAction<Point[] | null>>
  getCenter: () => { x: number, y: number }
  gridSize: number
  setGridSize: (v: number) => void
  snapEnabled: boolean
  setSnapEnabled: (v: boolean) => void
  orthoEnabled: boolean
  setOrthoEnabled: (v: boolean) => void
  screenshotMode: 'grid' | 'white' | 'transparent'
  setScreenshotMode: (mode: 'grid' | 'white' | 'transparent') => void
  onScreenshot: () => void
  nextBubbleNumber: number
  setNextBubbleNumber: Dispatch<SetStateAction<number>>
}

export function RightPanel({
  selected,
  objects,
  onChange,
  onAddObject,
  getCenter,
  gridSize,
  setGridSize,
  snapEnabled,
  setSnapEnabled,
  orthoEnabled,
  setOrthoEnabled,
  screenshotMode,
  setScreenshotMode,
  onScreenshot,
}: Props) {
  const [tab, setTab] = useState<'props' | 'catalog' | 'export'>('props')

  const handleExport = (format: 'svg' | 'dxf' | 'stl') => {
    let content = ''
    let mime = ''
    let ext = ''

    if (format === 'svg') {
      content = exportToSVG(objects)
      mime = 'image/svg+xml'
      ext = 'svg'
    } else if (format === 'dxf') {
      content = exportToDXF(objects)
      mime = 'application/dxf'
      ext = 'dxf'
    } else if (format === 'stl') {
      content = exportToSTL(objects)
      mime = 'model/stl'
      ext = 'stl'
    }

    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `drawing.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="right-panel">
      {/* GLOBAL SETTINGS - Modernized Card */}
      <div className="global-card">
        <div className="prop-header" style={{ border: 'none', padding: 0 }}>
          <Settings2 size={16} />
          <span>Configurazione Globale</span>
        </div>

        <div className="prop-grid">
          <div className="prop-field">
            <label>Griglia</label>
            <input
              type="number"
              value={gridSize}
              onChange={e => setGridSize(round1(Math.max(10, Number(e.target.value))))}
            />
          </div>
          <div className="prop-field">
            <label>Snap</label>
            <div className="checkbox-wrapper">
              <input
                type="checkbox"
                checked={snapEnabled}
                onChange={e => setSnapEnabled(e.target.checked)}
              />
            </div>
          </div>
          <div className="prop-field">
            <label>Ortho</label>
            <div className="checkbox-wrapper">
              <input
                type="checkbox"
                checked={orthoEnabled}
                onChange={e => setOrthoEnabled(e.target.checked)}
              />
            </div>
          </div>
          <div className="prop-field">
            <label>Sfondo</label>
            <select
              value={screenshotMode}
              onChange={e => setScreenshotMode(e.target.value as any)}
            >
              <option value="grid">Griglia</option>
              <option value="white">Bianco</option>
              <option value="transparent">Trasp.</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABS - Modern Segmented Control */}
      <div className="rp-tabs-container">
        <div className="rp-tabs">
          <button className={tab === 'props' ? 'active' : ''} onClick={() => setTab('props')}>
            <Palette size={16} />
            <span>Proprietà</span>
          </button>
          <button className={tab === 'catalog' ? 'active' : ''} onClick={() => setTab('catalog')}>
            <Database size={16} />
            <span>Catalogo</span>
          </button>
          <button className={tab === 'export' ? 'active' : ''} onClick={() => setTab('export')}>
            <Download size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>

      <div className="rp-content">
        {tab === 'catalog' && (
          <Catalog onSelect={(profile) => {
            const c = getCenter()
            onAddObject({
              id: crypto.randomUUID(),
              type: 'profile',
              profileType: profile.type,
              profileName: profile.name,
              scale: 1,
              viewType: 'front',
              length: 400,
              x: c.x,
              y: c.y,
              stroke: '#0f172a',
              fillEnabled: true,
              fillColor: '#94a3b8'
            })
          }} />
        )}

        {tab === 'export' && (
          <div className="export-panel">
            <div className="info-banner">
              <Download size={16} />
              <span>Scegli il formato per l'esportazione. DXF e SVG sono ottimali per il taglio laser.</span>
            </div>
            <div className="export-actions">
              <button onClick={() => handleExport('svg')}>Esporta SVG</button>
              <button onClick={() => handleExport('dxf')}>Esporta DXF (2D)</button>
              <button onClick={() => handleExport('stl')}>Esporta STL (3D)</button>
              <button className="secondary" onClick={() => {
                const svg = document.querySelector('.canvas') as SVGSVGElement
                if (svg) {
                  captureSvgToClipboard(svg, screenshotMode)
                  onScreenshot()
                }
              }}>Copia Screenshot</button>
            </div>
          </div>
        )}

        {tab === 'props' && (
          <>
            {!selected ? (
              <div className="no-selection">
                <Info size={48} strokeWidth={1} style={{ marginBottom: '16px', color: '#cbd5e1' }} />
                <p>Seleziona un oggetto sul canvas per vederne e modificarne le proprietà.</p>
              </div>
            ) : (
              <div className="properties-form">
                <div className="object-info">
                  <div className="badge">{selected.type.toUpperCase()}</div>
                  <code className="id-code">{selected.id.slice(0, 8)}</code>
                </div>

                <div className="prop-header">
                  <Boxes size={16} />
                  <span>Geometria</span>
                </div>

                <div className="prop-grid">
                  {selected.type !== 'polyline' && (
                    <>
                      <div className="prop-field">
                        <label>X (mm)</label>
                        <input
                          type="number"
                          value={round1(selected.x)}
                          onChange={e => onChange({ x: round1(Number(e.target.value)) })}
                        />
                      </div>
                      <div className="prop-field">
                        <label>Y (mm)</label>
                        <input
                          type="number"
                          value={round1(selected.y)}
                          onChange={e => onChange({ y: round1(Number(e.target.value)) })}
                        />
                      </div>
                    </>
                  )}

                  {(selected.type === 'rect' || selected.type === 'text') && (
                    <>
                      <div className="prop-field">
                        <label>Larghezza</label>
                        <input
                          type="number"
                          value={round1((selected as any).width || 0)}
                          onChange={e => onChange({ width: round1(Math.max(0, Number(e.target.value))) })}
                        />
                      </div>
                      <div className="prop-field">
                        <label>Altezza</label>
                        <input
                          type="number"
                          value={round1((selected as any).height || 0)}
                          onChange={e => onChange({ height: round1(Math.max(0, Number(e.target.value))) })}
                        />
                      </div>
                    </>
                  )}

                  {selected.type === 'circle' && (
                    <div className="prop-field">
                      <label>Raggio</label>
                      <input
                        type="number"
                        value={round1(selected.radius)}
                        onChange={e => onChange({ radius: round1(Math.max(0, Number(e.target.value))) })}
                      />
                    </div>
                  )}

                  {selected.type === 'profile' && (
                    <>
                      <div className="prop-field">
                        <label>Serie</label>
                        <select
                          value={selected.profileType}
                          onChange={e => {
                            const newType = e.target.value as any
                            const first = ALL_PROFILES.find(p => p.type === newType)
                            if (first) {
                              onChange({
                                profileType: newType,
                                profileName: first.name
                              })
                            }
                          }}
                        >
                          {Array.from(new Set(ALL_PROFILES.map(p => p.type))).map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div className="prop-field">
                        <label>Profilo</label>
                        <select
                          value={selected.profileName}
                          onChange={e => onChange({ profileName: e.target.value })}
                        >
                          {ALL_PROFILES.filter(p => p.type === selected.profileType).map(p => (
                            <option key={p.name} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="prop-field">
                        <label>Vista</label>
                        <select
                          value={selected.viewType || 'front'}
                          onChange={e => onChange({ viewType: e.target.value as any })}
                        >
                          <option value="front">Frontale</option>
                          <option value="side">Laterale</option>
                          <option value="top">Superiore</option>
                        </select>
                      </div>
                      <div className="prop-field">
                        <label>Lunghezza (mm)</label>
                        <input
                          type="number"
                          value={round1(selected.length || 400)}
                          onChange={e => onChange({ length: round1(Number(e.target.value)) })}
                        />
                      </div>
                    </>
                  )}

                  {selected.type === 'profile' && (
                    <div className="prop-field full-width">
                      <label>Scala</label>
                      <input
                        type="number"
                        step="0.1"
                        value={round1(selected.scale)}
                        onChange={e => onChange({ scale: round1(Math.max(0.1, Number(e.target.value))) })}
                      />
                    </div>
                  )}

                  {selected.type !== 'quote' && (
                    <div className="prop-field">
                      <label>Rotazione (°)</label>
                      <input
                        type="number"
                        value={round1(selected.rotation || 0)}
                        onChange={e => onChange({ rotation: round1(Number(e.target.value)) })}
                      />
                    </div>
                  )}
                </div>

                {selected.type === 'text' && (
                  <>
                    <div className="prop-field full-width" style={{ marginTop: '12px' }}>
                      <label>Testo</label>
                      <textarea
                        value={selected.text}
                        onChange={e => onChange({ text: e.target.value })}
                      />
                    </div>
                    <div className="prop-grid">
                      <div className="prop-field">
                        <label>Colore Testo</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="color"
                            value={selected.textColor || '#000000'}
                            onChange={e => onChange({ textColor: e.target.value })}
                            style={{ padding: 0, height: '24px', width: '24px', cursor: 'pointer' }}
                          />
                          {['#0f172a', '#dc2626', '#16a34a', '#2563eb'].map(c => (
                            <button
                              key={c}
                              onClick={() => onChange({ textColor: c })}
                              style={{
                                width: '18px', height: '18px', borderRadius: '50%',
                                background: c, border: `1px solid ${c === '#ffffff' ? '#ccc' : c}`, cursor: 'pointer',
                                padding: 0
                              }}
                              title={c}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="prop-field">
                        <label>Padding</label>
                        <input
                          type="number"
                          value={round1(selected.boxPadding || 0)}
                          onChange={e => onChange({ boxPadding: round1(Math.max(0, Number(e.target.value))) })}
                        />
                      </div>
                    </div>
                    <div className="prop-field" style={{ marginTop: '8px' }}>
                      <label>Sfondo e Bordo</label>
                      <div className="checkbox-wrapper">
                        <input
                          type="checkbox"
                          checked={selected.boxEnabled}
                          onChange={e => onChange({ boxEnabled: e.target.checked })}
                        />
                      </div>
                    </div>
                  </>
                )}

                {selected.type === 'quote' && (
                  <>
                    <div className="prop-field full-width" style={{ marginTop: '12px' }}>
                      <label>Testo Sovrascritto (Opzionale)</label>
                      <input
                        type="text"
                        value={(selected as any).text || ''}
                        onChange={e => onChange({ text: e.target.value })}
                        placeholder="Misura Dinamica"
                        style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div className="prop-field">
                      <label>Colore Testo</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="color"
                          value={(selected as any).textColor || '#000000'}
                          onChange={e => onChange({ textColor: e.target.value })}
                          style={{ padding: 0, height: '24px', width: '24px', cursor: 'pointer' }}
                        />
                        {['#000000', '#dc2626', '#16a34a', '#2563eb'].map(c => (
                          <button
                            key={c}
                            onClick={() => onChange({ textColor: c })}
                            style={{
                              width: '18px', height: '18px', borderRadius: '50%',
                              background: c, border: `1px solid ${c === '#ffffff' ? '#ccc' : c}`, cursor: 'pointer',
                              padding: 0
                            }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {selected.type === 'bolt' && (
                  <>
                    <div className="prop-field">
                      <label>Diametro (mm)</label>
                      <select
                        value={selected.diameter}
                        onChange={e => onChange({ diameter: Number(e.target.value) })}
                      >
                        {[12, 16, 20, 24, 27, 30, 36].map(d => (
                          <option key={d} value={d}>M{d}</option>
                        ))}
                      </select>
                    </div>
                    <div className="prop-field full-width">
                      <label>Interassi X</label>
                      <input
                        type="text"
                        value={selected.spacingX}
                        placeholder="es. 100 2*80"
                        onChange={e => onChange({ spacingX: e.target.value })}
                      />
                    </div>
                    <div className="prop-field full-width">
                      <label>Interassi Y</label>
                      <input
                        type="text"
                        value={selected.spacingY}
                        placeholder="es. 50 50"
                        onChange={e => onChange({ spacingY: e.target.value })}
                      />
                    </div>
                    <div className="prop-field">
                      <label>Offset X</label>
                      <input
                        type="number"
                        value={round1(selected.offsetX)}
                        onChange={e => onChange({ offsetX: round1(Number(e.target.value)) })}
                      />
                    </div>
                    <div className="prop-field">
                      <label>Offset Y</label>
                      <input
                        type="number"
                        value={round1(selected.offsetY)}
                        onChange={e => onChange({ offsetY: round1(Number(e.target.value)) })}
                      />
                    </div>
                    <div className="prop-field">
                      <label>Vista</label>
                      <select
                        value={selected.viewType || 'top'}
                        onChange={e => onChange({ viewType: e.target.value as any })}
                      >
                        <option value="top">Pianta (Teste esagonali)</option>
                        <option value="side">Laterale (Profilo)</option>
                      </select>
                    </div>
                    <div className="prop-field">
                      <label>Lunghezza Bullone (mm)</label>
                      <input
                        type="number"
                        value={round1(selected.length || 60)}
                        onChange={e => onChange({ length: round1(Number(e.target.value)) })}
                      />
                    </div>
                  </>
                )}

                <div className="prop-header">
                  <Palette size={16} />
                  <span>Stile</span>
                </div>

                <div className="prop-grid">
                  <div className="prop-field">
                    <label>Spessore</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={round1(selected.strokeWidth || 2)}
                      onChange={e => onChange({ strokeWidth: round1(Number(e.target.value)) })}
                    />
                  </div>
                  <div className="prop-field">
                    <label>Colore Linea</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={selected.stroke || '#0f172a'}
                        onChange={e => onChange({ stroke: e.target.value })}
                        style={{ padding: 0, height: '24px', width: '24px', cursor: 'pointer' }}
                      />
                      {['#0f172a', '#dc2626', '#16a34a', '#2563eb'].map(c => (
                        <button
                          key={c}
                          onClick={() => onChange({ stroke: c })}
                          style={{
                            width: '18px', height: '18px', borderRadius: '50%',
                            background: c, border: `1px solid ${c === '#ffffff' ? '#ccc' : c}`, cursor: 'pointer',
                            padding: 0
                          }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="prop-field">
                    <label>Riempimento</label>
                    <div className="checkbox-wrapper">
                      <input
                        type="checkbox"
                        checked={selected.fillEnabled}
                        onChange={e => onChange({ fillEnabled: e.target.checked })}
                      />
                    </div>
                  </div>
                  {selected.fillEnabled && (
                    <div className="prop-field">
                      <label>Colore</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="color"
                          value={selected.fillColor || '#cbd5e1'}
                          onChange={e => onChange({ fillColor: e.target.value })}
                          style={{ padding: 0, height: '24px', width: '24px', cursor: 'pointer' }}
                        />
                        {['#cbd5e1', '#fde047', '#ef4444', '#3b82f6'].map(c => (
                          <button
                            key={c}
                            onClick={() => onChange({ fillColor: c })}
                            style={{
                              width: '18px', height: '18px', borderRadius: '50%',
                              background: c, border: `1px solid ${c === '#ffffff' ? '#ccc' : c}`, cursor: 'pointer',
                              padding: 0
                            }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
    .global-card {
      padding: 16px 20px;
      background: white;
      border-bottom: 1px solid var(--border-color);
    }
    .prop-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 12px;
    }
    .prop-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .prop-field.full-width {
      grid-column: span 2;
    }
    .prop-field label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }
    .checkbox-wrapper {
      height: 32px;
      display: flex;
      align-items: center;
    }
    .rp-tabs-container {
      padding: 12px 20px;
      border-bottom: 1px solid var(--border-color);
      background: rgba(255, 255, 255, 0.4);
    }
    .rp-tabs {
      display: flex;
      background: var(--bg-color);
      padding: 3px;
      border-radius: 9px;
      gap: 2px;
    }
    .rp-tabs button {
      flex: 1;
      background: none;
      border: none;
      padding: 8px 4px;
      border-radius: 6px;
      font-size: 0.8rem;
      color: var(--text-muted);
      gap: 6px;
    }
    .rp-tabs button.active {
      background: white;
      color: var(--primary);
      box-shadow: var(--shadow-sm);
    }
    .rp-content {
      padding: 12px 20px;
      flex: 1;
      overflow-y: auto; 
    }
    .export-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .info-banner {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
      padding: 12px;
      border-radius: 8px;
      font-size: 0.8rem;
      display: flex;
      gap: 10px;
    }
    .export-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .export-actions button {
      width: 100%;
      padding: 10px;
      background: white;
      border: 1px solid var(--border-color);
      color: var(--text-main);
    }
    .export-actions button:hover {
      background: var(--bg-color);
      border-color: var(--primary);
      color: var(--primary);
    }
    .export-actions button.secondary {
      background: transparent;
      border: 1px dashed var(--border-color);
      color: var(--text-muted);
    }
    .properties-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .object-info {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: -10px;
    }
    .badge {
      background: #e2e8f0;
      color: #475569;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .id-code {
      font-size: 0.75rem;
      color: var(--text-muted);
      background: var(--bg-color);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .prop-header {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-color);
      margin-top: 8px;
    }
    textarea {
      min-height: 80px;
      resize: vertical;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 8px;
      font-family: inherit;
      font-size: 0.875rem;
    }
    .no-selection {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      padding: 40px 20px;
      color: var(--text-muted);
      font-size: 0.875rem;
    }
    `}</style>
    </div>
  )
}