import { CanvasObject } from './types'
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react'
import { ALL_PROFILES } from './profiles'
import { generateBeamPath, getBeamPoints } from './beamPath'
import { getBoltPositions, getBoltHeadPath } from './utils/boltUtils'

const GRID_EXTENT = 5000
const DRAG_THRESHOLD = 6
const SNAP_THRESHOLD = 20

type Point = { x: number; y: number }
type Props = {
  objects: CanvasObject[]
  setObjects: Dispatch<SetStateAction<CanvasObject[]>>
  selectedId: string | null
  setSelectedId: (id: string | null) => void

  // polyline in costruzione
  drawingPolyline: Point[] | null
  setDrawingPolyline: Dispatch<SetStateAction<Point[] | null>>

  view: Point
  setView: Dispatch<SetStateAction<Point>>

  gridSize: number
  snapEnabled: boolean
  zoom: number
  setZoom: Dispatch<SetStateAction<number>>
  screenshotMode: 'grid' | 'white' | 'transparent'
  setScreenshotMode: Dispatch<SetStateAction<'grid' | 'white' | 'transparent'>>
  onScreenshot: () => void
  isArrowMode: boolean
  setIsArrowMode: (v: boolean) => void
  isBoltMode: boolean
  setIsBoltMode: (v: boolean) => void
}

type ArrowGrip = { id: string; point: 'p1' | 'p2' }

export function Canvas({
  objects,
  setObjects,
  selectedId,
  setSelectedId,
  drawingPolyline,
  setDrawingPolyline,
  view,
  setView,
  gridSize,
  snapEnabled,
  zoom,
  setZoom,
  screenshotMode,
  setScreenshotMode,
  onScreenshot,
  isArrowMode,
  setIsArrowMode,
  isBoltMode,
  setIsBoltMode,
}: Props) {


  /* ======================
   CAMERA (PAN)
   ====================== */
  // const [view, setView] = useState({ x: 0, y: 0 }) <-- REMOVED (lifted)
  const panRef = useRef<{
    startX: number
    startY: number
    viewX: number
    viewY: number
  } | null>(null)

  const svgRef = useRef<SVGSVGElement>(null)

  /* ======================
   DRAG OGGETTI
   ====================== */
  const dragRef = useRef<{
    id: string
    startX: number
    startY: number
    offsetX: number
    offsetY: number
    initialX: number
    initialY: number
    initialPoints?: Point[]
    initialX1?: number
    initialY1?: number
    initialX2?: number
    initialY2?: number
    initialP1?: Point
    initialP2?: Point
  } | null>(null)

  const resizeRef = useRef<{
    id: string
    corner: 'tl' | 'tr' | 'bl' | 'br'
  } | null>(null)

  const polylineGripRef = useRef<{
    id: string
    index: number
  } | null>(null)

  const symbolGripRef = useRef<{
    id: string
    index: number
  } | null>(null)

  const arrowGripRef = useRef<ArrowGrip | null>(null)

  const [drawingArrow, setDrawingArrow] = useState<{
    x1: number
    y1: number
    x2: number
    y2: number
  } | null>(null)

  const [drawingBolt, setDrawingBolt] = useState<{
    p1: Point
    p2: Point
  } | null>(null)


  const snap = (v: number, step: number) =>
    Math.round(v / step) * step

  const getSnapPoint = (worldX: number, worldY: number, excludeId?: string): Point => {
    if (!snapEnabled) return { x: worldX, y: worldY }

    // 1. COLLECT CANDIDATES FROM OTHER OBJECTS
    const candidates: Point[] = []
    objects.forEach((o: CanvasObject) => {
      if (o.id === excludeId) return

      if (o.type === 'rect' || o.type === 'image') {
        candidates.push({ x: o.x, y: o.y })
        candidates.push({ x: o.x + o.width, y: o.y })
        candidates.push({ x: o.x, y: o.y + o.height })
        candidates.push({ x: o.x + o.width, y: o.y + o.height })
      } else if (o.type === 'circle') {
        candidates.push({ x: o.x, y: o.y })
      } else if (o.type === 'profile') {
        const profile = ALL_PROFILES.find(p => p.name === o.profileName)
        if (profile) {
          const pts = getBeamPoints(profile)
          pts.forEach((p: Point) => {
            candidates.push({
              x: o.x + p.x * o.scale,
              y: o.y + p.y * o.scale
            })
          })
        }
      } else if (o.type === 'polyline') {
        o.points.forEach((p: Point) => candidates.push(p))
      } else if (o.type === 'bolt') {
        const boltPositions = getBoltPositions(o)
        boltPositions.forEach(bp => candidates.push(bp))
      }
    })

    // 2. CHECK VERTEX SNAPPING
    for (const c of candidates) {
      const dist = Math.sqrt((c.x - worldX) ** 2 + (c.y - worldY) ** 2)
      if (dist < SNAP_THRESHOLD) return c
    }

    // 3. FALLBACK TO GRID SNAPPING
    const gx = snap(worldX, gridSize)
    const gy = snap(worldY, gridSize)
    const gDist = Math.sqrt((gx - worldX) ** 2 + (gy - worldY) ** 2)
    if (gDist < SNAP_THRESHOLD) return { x: gx, y: gy }

    return { x: worldX, y: worldY }
  }

  const getSvgPoint = (
    e: React.MouseEvent | React.WheelEvent
  ) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }

    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY

    // transform to SVG coordinate system
    const screenCTM = svg.getScreenCTM()
    if (!screenCTM) return { x: 0, y: 0 }

    const p = pt.matrixTransform(screenCTM.inverse())
    return { x: p.x, y: p.y }
  }

  const onWheel = (e: React.WheelEvent) => {
    // Zoom centered on cursor
    const zoomSpeed = 0.001
    const delta = -e.deltaY
    const newZoom = Math.min(Math.max(zoom + delta * zoomSpeed, 0.1), 10)

    const rect = e.currentTarget.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Screen to world (current): W = (S / zoom) + view
    // We want world to stay same: (S / zoom) + view = (S / newZoom) + newView
    const dx = (mouseX / zoom) - (mouseX / newZoom)
    const dy = (mouseY / zoom) - (mouseY / newZoom)

    setZoom(newZoom)
    setView(prev => ({ x: prev.x + dx, y: prev.y + dy }))
  }
  /* ======================
     MOUSE DOWN SU OGGETTO
     ====================== */
  const onObjectMouseDown = (e: React.MouseEvent, o: CanvasObject) => {
    e.stopPropagation()
    setSelectedId(o.id)

    const p = getSvgPoint(e as React.MouseEvent<SVGSVGElement, MouseEvent>)
    const worldX = (p.x / zoom) + view.x
    const worldY = (p.y / zoom) + view.y

    const refPoint = o.type === 'polyline' ? o.points[0] : (o.type === 'arrow' ? { x: o.x1, y: o.y1 } : (o.type === 'bolt' ? o.p1 : o))

    dragRef.current = {
      id: o.id,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: worldX - refPoint.x,
      offsetY: worldY - refPoint.y,
      initialX: refPoint.x,
      initialY: refPoint.y,
      initialPoints: o.type === 'polyline' ? o.points : undefined,
      initialX1: o.type === 'arrow' ? o.x1 : undefined,
      initialY1: o.type === 'arrow' ? o.y1 : undefined,
      initialX2: o.type === 'arrow' ? o.y2 : undefined,
      initialY2: o.type === 'arrow' ? o.y2 : undefined,
      initialP1: o.type === 'bolt' ? o.p1 : undefined,
      initialP2: o.type === 'bolt' ? o.p2 : undefined,
    }
  }


  /* ======================
     DRAG OGGETTI
     ====================== */


  const onMouseMove = (
    e: React.MouseEvent<SVGSVGElement, MouseEvent>
  ) => {
    if (drawingArrow) {
      const p = getSvgPoint(e)
      const wx = (p.x / zoom) + view.x
      const wy = (p.y / zoom) + view.y
      const snapped = snapEnabled ? getSnapPoint(wx, wy) : { x: wx, y: wy }
      setDrawingArrow(prev => prev ? { ...prev, x2: snapped.x, y2: snapped.y } : null)
      return
    }

    if (drawingBolt) {
      const p = getSvgPoint(e)
      const wx = (p.x / zoom) + view.x
      const wy = (p.y / zoom) + view.y
      const snapped = snapEnabled ? getSnapPoint(wx, wy) : { x: wx, y: wy }
      setDrawingBolt(prev => prev ? { ...prev, p2: snapped } : null)
      return
    }

    if (arrowGripRef.current) {
      const g = arrowGripRef.current
      const p = getSvgPoint(e)
      const wx = (p.x / zoom) + view.x
      const wy = (p.y / zoom) + view.y
      const snapped = snapEnabled ? getSnapPoint(wx, wy, g.id) : { x: wx, y: wy }

      setObjects(objs => objs.map(o => {
        if (o.id !== g.id || o.type !== 'arrow') return o
        if (g.point === 'p1') return { ...o, x1: snapped.x, y1: snapped.y }
        return { ...o, x2: snapped.x, y2: snapped.y }
      }))
      return
    }

    if (panRef.current) {
      const dx = e.clientX - panRef.current.startX
      const dy = e.clientY - panRef.current.startY

      setView({
        x: panRef.current.viewX - dx / zoom,
        y: panRef.current.viewY - dy / zoom,
      })
      return
    }

    if (resizeRef.current) {
      const { id, corner } = resizeRef.current
      const p = getSvgPoint(e)
      const wx_raw = (p.x / zoom) + view.x
      const wy_raw = (p.y / zoom) + view.y

      const shouldSnap = snapEnabled || e.shiftKey
      const snapped = shouldSnap ? getSnapPoint(wx_raw, wy_raw, id) : { x: wx_raw, y: wy_raw }
      const wx = snapped.x
      const wy = snapped.y

      setObjects(objs =>
        objs.map(o => {
          if (o.id !== id || (o.type !== 'rect' && o.type !== 'image' && o.type !== 'text')) return o

          let { x, y } = o
          let width = (o as any).width || 100
          let height = (o as any).height || 100

          if (corner === 'tl') {
            const newX = Math.min(wx, x + width - 5)
            const newY = Math.min(wy, y + height - 5)
            width += x - newX
            height += y - newY
            x = newX
            y = newY
          }
          if (corner === 'tr') {
            const newY = Math.min(wy, y + height - 5)
            width = wx - x
            height += y - newY
            y = newY
          }
          if (corner === 'bl') {
            const newX = Math.min(wx, x + width - 5)
            width += x - newX
            x = newX
            height = wy - y
          }
          if (corner === 'br') {
            width = wx - x
            height = wy - y
          }

          return {
            ...o,
            x,
            y,
            width: Math.max(5, width),
            height: Math.max(5, height),
          } as any
        })
      )
      return
    }

    if (polylineGripRef.current) {
      const { id, index } = polylineGripRef.current
      const p = getSvgPoint(e as any)

      setObjects(objs =>
        objs.map(o => {
          if (o.id !== id || o.type !== 'polyline') return o

          const pts = o.points
          const lastIndex = pts.length - 1

          const isClosed =
            pts.length > 2 &&
            pts[0].x === pts[lastIndex].x &&
            pts[0].y === pts[lastIndex].y

          const newPoints = pts.map((pt, i) => {
            const wx = (p.x / zoom) + view.x
            const wy = (p.y / zoom) + view.y
            const shouldSnap = snapEnabled || (e as any).shiftKey
            const snapped = shouldSnap ? getSnapPoint(wx, wy, id) : { x: wx, y: wy }

            if (i === index) return snapped
            if (isClosed) {
              if (index === 0 && i === lastIndex) return snapped
              if (index === lastIndex && i === 0) return snapped
            }
            return pt
          })

          return { ...o, points: newPoints }
        })
      )
      return
    }

    if (symbolGripRef.current) {
      const g = symbolGripRef.current
      const shouldSnap = snapEnabled || e.shiftKey
      setObjects(objs =>
        objs.map(o => {
          if (o.id !== g.id || o.type !== 'symbol' || !o.points) return o
          const newPoints = [...o.points]
          const p = getSvgPoint(e)
          const rawX = (p.x / zoom) + view.x - o.x
          const rawY = (p.y / zoom) + view.y - o.y

          let finalX = rawX
          let finalY = rawY
          if (shouldSnap) {
            const snapped = getSnapPoint(rawX + o.x, rawY + o.y, o.id)
            finalX = snapped.x - o.x
            finalY = snapped.y - o.y
          }

          newPoints[g.index] = { x: finalX, y: finalY }
          return { ...o, points: newPoints }
        })
      )
      return
    }

    if (!dragRef.current) return
    const d = dragRef.current

    const dx_screen = e.clientX - d.startX
    const dy_screen = e.clientY - d.startY
    // Delta in world coordinates
    const dx_world = dx_screen / zoom
    const dy_world = dy_screen / zoom

    // Decide if we snap
    const shouldSnap = snapEnabled || e.shiftKey

    setObjects(prevObjects =>
      prevObjects.map(o => {
        // Only update the object being dragged
        if (o.id !== d.id) return o

        // Calculate the raw new position relative to initial position
        // This avoids accumulation errors
        const rawNewX = d.initialX + dx_world
        const rawNewY = d.initialY + dy_world

        // Calculate where the "mouse grab point" would be now in world space
        // We use this for snapping logic usually, but here we can snap the object origin directly
        // or snap the mouse point.
        // Let's stick to snapping the object origin for clarity if it's a simple move.
        // Or better: snap the point we grabbed, to align with grid?
        // Prior logic snapped the mouse cursor position. Let's keep that consistency.

        const rawMouseX = d.initialX + d.offsetX + dx_world
        const rawMouseY = d.initialY + d.offsetY + dy_world

        let snappedX = rawNewX
        let snappedY = rawNewY

        if (shouldSnap) {
          const snappedMouse = getSnapPoint(rawMouseX, rawMouseY, o.id)
          const snapDiffX = snappedMouse.x - rawMouseX
          const snapDiffY = snappedMouse.y - rawMouseY
          snappedX = rawNewX + snapDiffX
          snappedY = rawNewY + snapDiffY
        }

        // Apply changes based on object type
        if (o.type === 'polyline') {
          const finalDX = snappedX - d.initialX
          const finalDY = snappedY - d.initialY
          if (!d.initialPoints) return o // Safety check
          return {
            ...o,
            points: d.initialPoints.map(p => ({
              x: p.x + finalDX,
              y: p.y + finalDY
            }))
          }
        }

        if (o.type === 'arrow') {
          const finalDX = snappedX - d.initialX
          const finalDY = snappedY - d.initialY
          if (d.initialX1 === undefined || d.initialY1 === undefined || d.initialX2 === undefined || d.initialY2 === undefined) return o
          return {
            ...o,
            x1: d.initialX1 + finalDX,
            y1: d.initialY1 + finalDY,
            x2: d.initialX2 + finalDX,
            y2: d.initialY2 + finalDY
          }
        }

        if (o.type === 'bolt') {
          const finalDX = snappedX - d.initialX
          const finalDY = snappedY - d.initialY
          if (!d.initialP1 || !d.initialP2) return o
          return {
            ...o,
            p1: { x: d.initialP1.x + finalDX, y: d.initialP1.y + finalDY },
            p2: { x: d.initialP2.x + finalDX, y: d.initialP2.y + finalDY },
          }
        }

        // For all other types with x,y properties (Rect, Circle, Text, Image, Profile, Symbol)
        return {
          ...o,
          x: snappedX,
          y: snappedY
        }
      })
    )
  }

  const onMouseUp = () => {
    if (drawingArrow) {
      if (Math.abs(drawingArrow.x1 - drawingArrow.x2) > 5 || Math.abs(drawingArrow.y1 - drawingArrow.y2) > 5) {
        const newId = crypto.randomUUID()
        setObjects(prev => [...prev, {
          id: newId,
          type: 'arrow',
          x1: drawingArrow.x1,
          y1: drawingArrow.y1,
          x2: drawingArrow.x2,
          y2: drawingArrow.y2,
          stroke: '#000000',
          strokeWidth: 2,
          x: 0, y: 0 // base props
        }])
        setSelectedId(newId)
      }
      setDrawingArrow(null)
      setIsArrowMode(false)
    }

    if (drawingBolt) {
      console.log('Adding bolt object:', {
        type: 'bolt',
        p1: drawingBolt.p1,
        p2: drawingBolt.p2
      })
      const newId = crypto.randomUUID()
      setObjects(prev => [
        ...prev,
        {
          id: newId,
          type: 'bolt',
          x: drawingBolt.p1.x,
          y: drawingBolt.p1.y,
          p1: drawingBolt.p1,
          p2: drawingBolt.p2,
          diameter: 16,
          spacingX: '100',
          spacingY: '50',
          offsetX: 0,
          offsetY: 0,
        }
      ])
      setDrawingBolt(null)
      setIsBoltMode(false)
    }

    dragRef.current = null
    resizeRef.current = null
    polylineGripRef.current = null
    symbolGripRef.current = null
    arrowGripRef.current = null
    panRef.current = null
  }


  const gridLines = []
  for (let x = 0; x <= GRID_EXTENT; x += gridSize) {
    gridLines.push(
      <line
        key={`gx-${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={GRID_EXTENT}
        stroke="#cbd5e1"
        strokeWidth={0.5}
        strokeDasharray="1,4"
      />
    )
  }
  for (let y = 0; y <= GRID_EXTENT; y += gridSize) {
    gridLines.push(
      <line
        key={`gy-${y}`}
        x1={0}
        y1={y}
        x2={GRID_EXTENT}
        y2={y}
        stroke="#cbd5e1"
        strokeWidth={0.5}
        strokeDasharray="1,4"
      />
    )
  }

  return (
    <svg
      ref={svgRef}
      className="canvas"
      width="100%"
      height="100%"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
      onMouseDown={e => {
        if (isArrowMode) {
          const p = getSvgPoint(e)
          const wx = (p.x / zoom) + view.x
          const wy = (p.y / zoom) + view.y
          const snapped = snapEnabled ? getSnapPoint(wx, wy) : { x: wx, y: wy }
          setDrawingArrow({ x1: snapped.x, y1: snapped.y, x2: snapped.x, y2: snapped.y })
          return
        }

        if (isBoltMode) {
          const p = getSvgPoint(e)
          const wx = (p.x / zoom) + view.x
          const wy = (p.y / zoom) + view.y
          const snapped = snapEnabled ? getSnapPoint(wx, wy) : { x: wx, y: wy }
          setDrawingBolt({ p1: snapped, p2: snapped })
          return
        }

        if (e.target === e.currentTarget) {
          setSelectedId(null)
          panRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            viewX: view.x,
            viewY: view.y,
          }
        }
      }}

      onClick={e => {
        if (!drawingPolyline) return
        if (e.detail > 1) return


        const p = getSvgPoint(e)
        const wx = (p.x / zoom) + view.x
        const wy = (p.y / zoom) + view.y
        const snapped = getSnapPoint(wx, wy)

        setDrawingPolyline(prev =>
          prev ? [...prev, snapped] : prev
        )
      }}
      onDoubleClick={e => {
        e.stopPropagation()

        if (!drawingPolyline || drawingPolyline.length < 2) return

        const first = drawingPolyline[0]
        const closed = [...drawingPolyline, first]
        const newId = crypto.randomUUID()

        setObjects(objs => [
          ...objs,
          {
            id: newId,
            type: 'polyline',
            points: closed,
            closed: true,
            stroke: '#0f172a',
            fillEnabled: false,
            fillColor: 'transparent',
          },
        ])

        setDrawingPolyline(null)
        setSelectedId(newId)
      }}
    >
      <defs />

      <g transform={`scale(${zoom}) translate(${-view.x}, ${-view.y})`}>
        {/* griglia */}
        <g id="grid-layer" pointerEvents="none">{gridLines}</g>

        {/* polyline in costruzione */}
        {drawingPolyline && (
          <polyline
            points={drawingPolyline.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#6366f1"
            strokeWidth={2}
            strokeDasharray="4,2"
            pointerEvents="none"
          />
        )}

        {drawingArrow && (
          <line
            x1={drawingArrow.x1}
            y1={drawingArrow.y1}
            x2={drawingArrow.x2}
            y2={drawingArrow.y2}
            stroke="#6366f1"
            strokeWidth={2}
            strokeDasharray="5,5"
            pointerEvents="none"
          />
        )}

        {drawingBolt && (
          <g pointerEvents="none">
            <line
              x1={drawingBolt.p1.x}
              y1={drawingBolt.p1.y}
              x2={drawingBolt.p2.x}
              y2={drawingBolt.p2.y}
              stroke="orange"
              strokeDasharray="5,5"
            />
            <circle cx={drawingBolt.p1.x} cy={drawingBolt.p1.y} r={3} fill="orange" />
            <circle cx={drawingBolt.p2.x} cy={drawingBolt.p2.y} r={3} fill="orange" />
          </g>
        )}

        {drawingPolyline &&
          drawingPolyline.map((p, i) => (
            <circle
              key={`drawing-grip-${i}`}
              cx={p.x}
              cy={p.y}
              r={4}
              fill="white"
              stroke="#6366f1"
              strokeWidth={2}
              pointerEvents="none"
            />
          ))}

        {/* oggetti */}
        {objects.map(o => {
          const isSelected = o.id === selectedId
          // Use explicit fill or fillOpacity=0 for hit testing
          const hasFill = o.fillEnabled
          const fillColor = o.fillColor || '#cbd5e1'
          const strokeValue = isSelected ? '#6366f1' : o.stroke || '#0f172a'
          const strokeWidth = isSelected ? 2.5 : 1.5

          let finalFill = fillColor
          let finalOpacity = 0

          if (hasFill) {
            finalFill = fillColor
            finalOpacity = 1
          } else if (isSelected) {
            finalFill = 'rgba(99, 102, 241, 0.1)'
            finalOpacity = 1
          }

          if (o.type === 'rect' || o.type === 'image') {
            return (
              <g key={o.id}>
                {o.type === 'rect' ? (
                  <rect
                    x={o.x}
                    y={o.y}
                    width={o.width}
                    height={o.height}
                    fill={finalFill}
                    fillOpacity={finalOpacity}
                    stroke={strokeValue}
                    strokeWidth={strokeWidth}
                    onMouseDown={e => onObjectMouseDown(e, o)}
                    style={{ pointerEvents: 'all' }}
                  />
                ) : (
                  <image
                    href={o.src}
                    x={o.x}
                    y={o.y}
                    width={o.width}
                    height={o.height}
                    opacity={o.opacity}
                    onMouseDown={e => onObjectMouseDown(e, o)}
                    style={{ outline: isSelected ? '2px solid orange' : 'none', pointerEvents: 'all' }}
                  />
                )}

                {/* Grip di resize (solo se selezionato) */}
                {isSelected && (
                  <>
                    {([
                      { x: o.x, y: o.y, corner: 'tl' },
                      { x: o.x + o.width, y: o.y, corner: 'tr' },
                      { x: o.x, y: o.y + o.height, corner: 'bl' },
                      { x: o.x + o.width, y: o.y + o.height, corner: 'br' },
                    ] as const).map(h => (
                      <circle
                        key={h.corner}
                        cx={h.x}
                        cy={h.y}
                        r={6}
                        fill="white"
                        stroke="black"
                        strokeWidth={1}
                        cursor="nwse-resize"
                        onMouseDown={e => {
                          e.stopPropagation()
                          resizeRef.current = {
                            id: o.id,
                            corner: h.corner,
                          }
                        }}
                      />
                    ))}
                  </>
                )}
              </g>
            )
          }


          if (o.type === 'polyline') {
            const fillValue =
              o.fillEnabled && o.fillColor ? o.fillColor : (isSelected ? 'rgba(99, 102, 241, 0.1)' : 'transparent')

            const pointerMode = 'all'

            return (
              <g key={o.id}>
                {/* Polyline */}
                <polyline
                  points={o.points.map(p => `${p.x},${p.y}`).join(' ')}
                  fill={fillValue}
                  stroke={strokeValue}
                  strokeWidth={isSelected ? 4 : 2}
                  pointerEvents={pointerMode}
                  onMouseDown={e => {
                    e.stopPropagation()
                    onObjectMouseDown(e, o)
                  }}
                />

                {/* Grip sui vertici */}
                {isSelected &&
                  o.points.map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={6}
                      fill="white"
                      stroke="black"
                      strokeWidth={1}
                      cursor="move"
                      onMouseDown={e => {
                        e.stopPropagation()
                        polylineGripRef.current = {
                          id: o.id,
                          index: i,
                        }
                      }}
                    />
                  ))}
              </g>
            )
          }





          if (o.type === 'text') {
            const fontSize = o.fontSize || 20
            const padding = o.boxPadding || 10

            // If width/height are specified, use them. Otherwise estimate.
            const w = o.width || (o.text.length * (fontSize * 0.6) + padding * 2)
            const h = o.height || (fontSize + padding * 2)

            const isSelected = o.id === selectedId

            return (
              <g key={o.id}>
                <g onMouseDown={(e: React.MouseEvent) => onObjectMouseDown(e, o)}>
                  {o.boxEnabled && (
                    <rect
                      x={o.x}
                      y={o.y}
                      width={w}
                      height={h}
                      fill={o.fillEnabled ? (o.fillColor || 'white') : 'transparent'}
                      stroke={o.stroke || '#000000'}
                      strokeWidth={o.strokeWidth || 2}
                      style={{ pointerEvents: 'all' }}
                    />
                  )}
                  <text
                    x={o.x + w / 2}
                    y={o.y + h / 2}
                    fontSize={fontSize}
                    fill={o.textColor || '#000000'}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ userSelect: 'none', cursor: 'move' }}
                  >
                    {o.text}
                  </text>
                </g>

                {/* Resize handles for text box */}
                {isSelected && o.boxEnabled && (
                  <>
                    {([
                      { x: o.x, y: o.y, corner: 'tl' },
                      { x: o.x + w, y: o.y, corner: 'tr' },
                      { x: o.x, y: o.y + h, corner: 'bl' },
                      { x: o.x + w, y: o.y + h, corner: 'br' },
                    ] as const).map(handle => (
                      <circle
                        key={handle.corner}
                        cx={handle.x}
                        cy={handle.y}
                        r={6}
                        fill="white"
                        stroke="black"
                        cursor="nwse-resize"
                        onMouseDown={e => {
                          e.stopPropagation()
                          resizeRef.current = { id: o.id, corner: handle.corner }
                        }}
                      />
                    ))}
                  </>
                )}
              </g>
            )
          }

          if (o.type === 'arrow') {
            const isSelected = o.id === selectedId
            const color = isSelected ? 'orange' : (o.stroke || '#000000')
            const sw = o.strokeWidth || 2

            const angle = Math.atan2(o.y2 - o.y1, o.x2 - o.x1) * (180 / Math.PI)
            const headLen = Math.max(2, sw * 4)

            return (
              <g key={o.id}>
                {/* Hit area (invibile ma più larga per selezione facile) */}
                <line
                  x1={o.x1} y1={o.y1} x2={o.x2} y2={o.y2}
                  stroke="transparent"
                  strokeWidth={Math.max(15, sw + 10)}
                  onMouseDown={(e) => onObjectMouseDown(e, o)}
                  cursor="pointer"
                />
                {/* Visible line */}
                <line
                  x1={o.x1} y1={o.y1} x2={o.x2} y2={o.y2}
                  stroke={color}
                  strokeWidth={sw}
                  strokeLinecap="butt"
                  pointerEvents="none"
                />
                {/* Arrowhead */}
                <g transform={`translate(${o.x2}, ${o.y2}) rotate(${angle})`} pointerEvents="none">
                  <path
                    d={`M ${headLen * 0.3} 0 L ${-headLen} ${-headLen / 2} L ${-headLen} ${headLen / 2} Z`}
                    fill={color}
                  />
                </g>

                {isSelected && (
                  <>
                    <circle
                      cx={o.x1} cy={o.y1} r={6}
                      fill="white" stroke="black"
                      cursor="move"
                      onMouseDown={e => {
                        e.stopPropagation()
                        arrowGripRef.current = { id: o.id, point: 'p1' }
                      }}
                    />
                    <circle
                      cx={o.x2} cy={o.y2} r={6}
                      fill="white" stroke="black"
                      cursor="move"
                      onMouseDown={e => {
                        e.stopPropagation()
                        arrowGripRef.current = { id: o.id, point: 'p2' }
                      }}
                    />
                  </>
                )}
              </g>
            )
          }

          if (o.type === 'bolt') {
            const isSelected = o.id === selectedId
            const points = getBoltPositions(o)

            return (
              <g key={o.id}>
                {/* Axis Line */}
                <line
                  x1={o.p1.x} y1={o.p1.y} x2={o.p2.x} y2={o.p2.y}
                  stroke={isSelected ? "orange" : "#cbd5e1"}
                  strokeWidth={1}
                  strokeDasharray="5,5"
                />

                {/* Bolts */}
                {points.map((p, i) => (
                  <g key={i} transform={`translate(${p.x}, ${p.y})`}>
                    <circle
                      r={o.diameter / 2}
                      fill="none"
                      stroke={isSelected ? "orange" : "black"}
                      strokeWidth={1}
                    />
                    <line x1={-o.diameter / 2} y1={0} x2={o.diameter / 2} y2={0} stroke={isSelected ? "orange" : "black"} strokeWidth={0.5} />
                    <line x1={0} y1={-o.diameter / 2} x2={0} y2={o.diameter / 2} stroke={isSelected ? "orange" : "black"} strokeWidth={0.5} />
                  </g>
                ))}

                {/* Hit Area */}
                <line
                  x1={o.p1.x} y1={o.p1.y} x2={o.p2.x} y2={o.p2.y}
                  stroke="transparent"
                  strokeWidth={20}
                  cursor="pointer"
                  onMouseDown={(e) => onObjectMouseDown(e, o)}
                />
              </g>
            )
          }

          if (o.type === 'symbol') {
            const isSelected = o.id === selectedId
            if (o.symbolType === 'bubble') {
              return (
                <g key={o.id} onMouseDown={(e: React.MouseEvent) => onObjectMouseDown(e, o)}>
                  <circle
                    cx={o.x}
                    cy={o.y}
                    r={15}
                    fill={o.fillEnabled ? (o.fillColor || '#ffff00') : 'transparent'}
                    stroke={o.stroke || '#000000'}
                    strokeWidth={o.strokeWidth || 2}
                    style={{ pointerEvents: 'all' }}
                  />
                  <text
                    x={o.x}
                    y={o.y}
                    fontSize={14}
                    fill="black"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontWeight="bold"
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {o.value}
                  </text>
                </g>
              )
            }
            return null
          }

          if (o.type === 'circle') {
            return (
              <circle
                key={o.id}
                cx={o.x}
                cy={o.y}
                r={o.radius}
                fill={finalFill}
                fillOpacity={finalOpacity}
                stroke={strokeValue}
                strokeWidth={strokeWidth}
                onMouseDown={e => onObjectMouseDown(e, o)}
                style={{ cursor: 'move', pointerEvents: 'all' }}
              />
            )
          }

          if (o.type === 'profile') {
            const profile = ALL_PROFILES.find(p => p.name === o.profileName)
            if (!profile) return null
            const s = o.scale

            const pathData = generateBeamPath(profile)

            return (
              <g key={o.id}
                transform={`translate(${o.x}, ${o.y}) scale(${s})`}
                onMouseDown={e => onObjectMouseDown(e, o)}>
                <path
                  d={pathData}
                  fill={finalFill}
                  fillOpacity={finalOpacity}
                  stroke={strokeValue}
                  strokeWidth={strokeWidth / s} // Counter-scale stroke
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: 'all' }}
                />
              </g>
            )
          }

          return null
        })}

        {drawingArrow && (
          <line
            x1={drawingArrow.x1}
            y1={drawingArrow.y1}
            x2={drawingArrow.x2}
            y2={drawingArrow.y2}
            stroke="black"
            strokeWidth={2}
            pointerEvents="none"
          />
        )}

        {drawingBolt && (
          <g pointerEvents="none">
            <line
              x1={drawingBolt.p1.x}
              y1={drawingBolt.p1.y}
              x2={drawingBolt.p2.x}
              y2={drawingBolt.p2.y}
              stroke="orange"
              strokeDasharray="5,5"
            />
            <circle cx={drawingBolt.p1.x} cy={drawingBolt.p1.y} r={3} fill="orange" />
            <circle cx={drawingBolt.p2.x} cy={drawingBolt.p2.y} r={3} fill="orange" />
          </g>
        )}
      </g>
    </svg>
  )
}