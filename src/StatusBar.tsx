import type { Point } from './types'
import type { ToolId } from './tools'
import { TOOLS } from './tools'
import { Minus, Plus, Maximize2 } from 'lucide-react'

type Props = {
  tool: ToolId
  cursor: Point | null
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomFit: () => void
  gridSize: number
  setGridSize: (v: number) => void
  showGrid: boolean
  setShowGrid: (v: boolean) => void
  snapEnabled: boolean
  setSnapEnabled: (v: boolean) => void
  orthoEnabled: boolean
  setOrthoEnabled: (v: boolean) => void
}

/** Barra inferiore stile CAD: aiuti al disegno, coordinate, zoom e suggerimento dello strumento */
export function StatusBar(p: Props) {
  const toggle = (label: string, on: boolean, set: (v: boolean) => void, key: string, title: string) => (
    <button className={`st-toggle ${on ? 'on' : ''}`} onClick={() => set(!on)} title={`${title} (${key})`} aria-pressed={on}>
      {label}
    </button>
  )

  return (
    <div className="statusbar" onMouseDown={e => e.stopPropagation()}>
      <div className="st-group">
        {toggle('SNAP', p.snapEnabled, p.setSnapEnabled, 'S', 'Aggancio a vertici, punti medi e griglia — tieni Ctrl per uno snap temporaneo')}
        {toggle('ORTO', p.orthoEnabled, p.setOrthoEnabled, 'O', 'Vincolo ortogonale — tieni Shift per uno temporaneo')}
        {toggle('GRIGLIA', p.showGrid, p.setShowGrid, 'G', 'Mostra griglia')}
        <label className="st-grid" title="Passo griglia (mm)">
          <input
            type="number" min={1} value={p.gridSize}
            onChange={e => { const v = Number(e.target.value); if (v >= 1) p.setGridSize(v) }}
          />
          mm
        </label>
      </div>

      <div className="st-hint">{TOOLS[p.tool].hint}</div>

      <div className="st-group">
        <span className="st-coords">{p.cursor ? `X ${Math.round(p.cursor.x)}  Y ${Math.round(p.cursor.y)}` : ''}</span>
        <button className="st-icon" onClick={p.onZoomOut} title="Riduci (−)"><Minus size={14} /></button>
        <span className="st-zoom">{Math.round(p.zoom * 100)}%</span>
        <button className="st-icon" onClick={p.onZoomIn} title="Ingrandisci (+)"><Plus size={14} /></button>
        <button className="st-icon" onClick={p.onZoomFit} title="Adatta alla vista (Ctrl+0)"><Maximize2 size={14} /></button>
      </div>
    </div>
  )
}
