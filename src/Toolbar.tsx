import { Dispatch, SetStateAction } from 'react'
import { CanvasObject, Point } from './types'
import { captureSvgToClipboard } from './utils/capture'
import {
  Square,
  Circle,
  Type,
  Hash,
  ArrowUpRight,
  Activity,
  Zap,
  Camera,
  Layers,
  CircleDot
} from 'lucide-react'

type Props = {
  setObjects: Dispatch<SetStateAction<CanvasObject[]>>
  setDrawingPolyline: Dispatch<SetStateAction<Point[] | null>>
  getCenter: () => { x: number, y: number }
  screenshotMode: 'grid' | 'white' | 'transparent'
  onScreenshot: () => void
  nextBubbleNumber: number
  setNextBubbleNumber: Dispatch<SetStateAction<number>>
  isArrowMode: boolean
  setIsArrowMode: Dispatch<SetStateAction<boolean>>
  isBoltMode: boolean
  setIsBoltMode: Dispatch<SetStateAction<boolean>>
  drawingPolyline: Point[] | null
}

export function Toolbar({
  setObjects,
  setDrawingPolyline,
  getCenter,
  screenshotMode,
  onScreenshot,
  nextBubbleNumber,
  setNextBubbleNumber,
  setIsArrowMode,
  isArrowMode,
  setIsBoltMode,
  isBoltMode,
  drawingPolyline,
}: Props) {
  const addRect = () => {
    const c = getCenter()
    setObjects(o => [
      ...o,
      {
        id: crypto.randomUUID(),
        type: 'rect',
        x: c.x - 50,
        y: c.y - 30,
        width: 100,
        height: 60,
        stroke: '#0f172a',
        fillEnabled: false,
        fillColor: '#6366f1',
      },
    ])
  }

  const addCircle = () => {
    const c = getCenter()
    setObjects(o => [
      ...o,
      {
        id: crypto.randomUUID(),
        type: 'circle',
        x: c.x,
        y: c.y,
        radius: 40,
        stroke: '#0f172a',
        fillEnabled: false,
        fillColor: '#94a3b8',
      },
    ])
  }

  const addText = () => {
    const c = getCenter()
    setObjects(o => [
      ...o,
      {
        id: crypto.randomUUID(),
        type: 'text',
        x: c.x,
        y: c.y,
        text: 'Testo',
        fontSize: 16,
        boxEnabled: false,
        boxPadding: 8,
        width: 150,
        height: 48,
        stroke: '#0f172a',
        fillEnabled: true,
        fillColor: '#0f172a',
      },
    ])
  }

  const addBubble = () => {
    const c = getCenter()
    setObjects(o => [
      ...o,
      {
        id: crypto.randomUUID(),
        type: 'symbol',
        symbolType: 'bubble',
        x: c.x,
        y: c.y,
        value: nextBubbleNumber,
        stroke: '#0f172a',
        fillEnabled: true,
        fillColor: '#fde047',
      },
    ])
    setNextBubbleNumber(n => n + 1)
  }

  const addIPE = () => {
    const c = getCenter()
    setObjects(o => [
      ...o,
      {
        id: crypto.randomUUID(),
        type: 'profile',
        profileType: 'IPE',
        profileName: 'IPE 200',
        x: c.x,
        y: c.y,
        scale: 1,
        stroke: '#0f172a',
        fillEnabled: true,
        fillColor: '#94a3b8',
      },
    ])
  }

  const startPolyline = () => {
    setDrawingPolyline([])
    setIsArrowMode(false)
    setIsBoltMode(false)
  }

  return (
    <div className="toolbar">
      <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.03)', padding: '4px', borderRadius: '10px' }}>
        <button className={undefined} onClick={addRect} title="Rettangolo">
          <Square size={20} />
        </button>
        <button className={undefined} onClick={addCircle} title="Cerchio">
          <Circle size={20} />
        </button>
        <button
          className={drawingPolyline ? 'active' : ''}
          onClick={startPolyline}
          title="Polyline"
        >
          <Activity size={20} />
        </button>
        <button
          className={isArrowMode ? 'active' : ''}
          title="Freccia"
          onClick={() => {
            setIsArrowMode(!isArrowMode)
            setIsBoltMode(false)
            setDrawingPolyline(null)
          }}
        >
          <ArrowUpRight size={20} />
        </button>
        <button
          className={isBoltMode ? 'active' : ''}
          title="Bulloni"
          onClick={() => {
            setIsBoltMode(!isBoltMode)
            setIsArrowMode(false)
            setDrawingPolyline(null)
          }}
        >
          <CircleDot size={20} />
        </button>
      </div>

      <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 8px' }} />

      <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.03)', padding: '4px', borderRadius: '10px' }}>
        <button className={undefined} onClick={addText} title="Testo">
          <Type size={20} />
        </button>
        <button className={undefined} onClick={addBubble} title="Bollino">
          <Hash size={20} />
        </button>
        <button className={undefined} onClick={addIPE} title="Profilo IPE">
          <Zap size={20} />
        </button>
      </div>

      <div style={{ flex: 1 }} />

      <button
        onClick={() => {
          const svg = document.querySelector('.canvas') as SVGSVGElement
          if (svg) {
            captureSvgToClipboard(svg, screenshotMode)
            onScreenshot()
          }
        }}
        style={{
          background: 'var(--primary)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
        }}
      >
        <Camera size={18} />
        <span>Screenshot</span>
      </button>
    </div>
  )
}