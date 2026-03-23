import { useEffect, useState } from 'react'
import { Canvas } from './Canvas'
import { Toolbar } from './Toolbar'
import { RightPanel } from './RightPanel'
import { CanvasObject } from './types'

type Point = { x: number; y: number }

export default function App() {
  const [objects, setObjects] = useState<CanvasObject[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawingPolyline, setDrawingPolyline] =
    useState<Point[] | null>(null)

  // View state (Pan) lifted from Canvas
  const [view, setView] = useState({ x: 0, y: 0 })
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const [gridSize, setGridSize] = useState(50)
  const [snapEnabled, setSnapEnabled] = useState(false)
  const [zoom, setZoom] = useState(1.0)
  const [screenshotMode, setScreenshotMode] = useState<'grid' | 'white' | 'transparent'>('grid')
  const [lastAction, setLastAction] = useState<'internal' | 'system'>('internal')
  const [nextBubbleNumber, setNextBubbleNumber] = useState(1)
  const [isArrowMode, setIsArrowMode] = useState(false)
  const [isBoltMode, setIsBoltMode] = useState(false)
  const [isLineMode, setIsLineMode] = useState(false)
  const [isFreehandMode, setIsFreehandMode] = useState(false)

  const onScreenshot = () => setLastAction('system')

  const getCenter = () => {
    // Canvas is full screen, but left panel is 320px if open
    // We want visual center of the canvas area
    const leftOffset = isPanelOpen ? 320 : 0
    const canvasWidth = window.innerWidth - leftOffset
    const canvasHeight = window.innerHeight

    // View transform is translate(-view.x, -view.y) and scale(zoom)
    // World point = (Screen / Zoom) + View
    const cx = (canvasWidth / 2) / zoom + view.x
    const cy = (canvasHeight / 2) / zoom + view.y
    return { x: cx, y: cy }
  }

  /* ======================
     KEYBOARD SHORTCUTS
     ====================== */
  const [clipboard, setClipboard] = useState<CanvasObject | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid shortcuts if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // DELETE
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          setObjects(objs => objs.filter(o => o.id !== selectedId))
          setSelectedId(null)
          e.preventDefault()
        }
      }

      // COPY (Cmd+C or Ctrl+C)
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        const selected = objects.find(o => o.id === selectedId)
        if (selected) {
          setClipboard(JSON.parse(JSON.stringify(selected)))
          setLastAction('internal')
          // No preventDefault to allow system copy of text if needed, 
          // but we already checked e.target
        }
      }

      // PASTE (Cmd+V or Ctrl+V) - Handled via 'paste' event listener below
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, objects, clipboard])

  // Unified Paste Listener (Images & Internal Objects)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!e.clipboardData) return
      const items = e.clipboardData.items
      let foundImage = false
      let blob: File | null = null

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          foundImage = true
          blob = items[i].getAsFile()
          break
        }
      }

      const pasteInternal = () => {
        if (clipboard) {
          const newId = crypto.randomUUID()
          const copy = JSON.parse(JSON.stringify(clipboard)) as CanvasObject
          copy.id = newId
          if (copy.type === 'polyline') {
            copy.points = copy.points.map((p: Point) => ({ x: p.x + 20, y: p.y + 20 }))
          } else {
            copy.x += 20
            copy.y += 20
          }
          setObjects(objs => [...objs, copy])
          setSelectedId(newId)
        }
      }

      const pasteSystem = () => {
        if (blob) {
          const reader = new FileReader()
          reader.onload = (event) => {
            const img = new Image()
            img.onload = () => {
              const c = getCenter()
              const newId = crypto.randomUUID()
              setObjects(prev => [...prev, {
                id: newId,
                type: 'image',
                x: c.x - img.width / 2,
                y: c.y - img.height / 2,
                width: img.width,
                height: img.height,
                src: event.target?.result as string,
                opacity: 1
              }])
              setSelectedId(newId)
            }
            img.src = event.target?.result as string
          }
          reader.readAsDataURL(blob)
        }
      }

      if (lastAction === 'system') {
        if (foundImage) pasteSystem()
        else pasteInternal()
      } else {
        if (clipboard) pasteInternal()
        else if (foundImage) pasteSystem()
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [setObjects, view, isPanelOpen, clipboard, zoom, lastAction])

  /* ======================
     FLOATING PANEL STATE
     ====================== */

  const selectedObject =
    objects.find(o => o.id === selectedId) || null

  // Open panel when an object is selected
  useEffect(() => {
    if (selectedId) {
      setIsPanelOpen(true)
    }
  }, [selectedId])

  /* ======================
     UPDATE OBJECT
     ====================== */
  const updateSelectedObject = (patch: Partial<CanvasObject>) => {
    if (!selectedId) return
    setObjects(objs =>
      objs.map(o =>
        o.id === selectedId ? { ...o, ...patch } as CanvasObject : o
      )
    )
  }

  /* ======================
     Z-ORDER (ORDERING)
     ====================== */
  const bringToFront = () => {
    if (!selectedId) return
    setObjects(objs => {
      const idx = objs.findIndex(o => o.id === selectedId)
      if (idx === -1) return objs
      const newObjs = [...objs]
      const [item] = newObjs.splice(idx, 1)
      newObjs.push(item)
      return newObjs
    })
  }

  const sendToBack = () => {
    if (!selectedId) return
    setObjects(objs => {
      const idx = objs.findIndex(o => o.id === selectedId)
      if (idx === -1) return objs
      const newObjs = [...objs]
      const [item] = newObjs.splice(idx, 1)
      newObjs.unshift(item)
      return newObjs
    })
  }

  const bringForward = () => {
    if (!selectedId) return
    setObjects(objs => {
      const idx = objs.findIndex(o => o.id === selectedId)
      if (idx === -1 || idx === objs.length - 1) return objs
      const newObjs = [...objs]
      const temp = newObjs[idx]
      newObjs[idx] = newObjs[idx + 1]
      newObjs[idx + 1] = temp
      return newObjs
    })
  }

  const sendBackward = () => {
    if (!selectedId) return
    setObjects(objs => {
      const idx = objs.findIndex(o => o.id === selectedId)
      if (idx === -1 || idx === 0) return objs
      const newObjs = [...objs]
      const temp = newObjs[idx]
      newObjs[idx] = newObjs[idx - 1]
      newObjs[idx - 1] = temp
      return newObjs
    })
  }

  /* ======================
     RENDER
     ====================== */
  return (
    <div className="app" style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* TOOLBAR */}
      <div className="toolbar-container" style={{ flexShrink: 0, zIndex: 200, position: 'relative', background: 'white', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', padding: '0 10px', height: '50px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginRight: '20px' }}>
          <button
            onClick={() => setIsPanelOpen(v => !v)}
            style={{
              background: isPanelOpen ? '#eee' : 'transparent',
              fontWeight: '500',
              border: '1px solid #ccc',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.9em'
            }}
          >
            {isPanelOpen ? 'Hide Props' : 'Show Props'}
          </button>
        </div>

        <div className="bottom-area">
          <Toolbar
            setObjects={setObjects}
            setDrawingPolyline={setDrawingPolyline}
            getCenter={getCenter}
            screenshotMode={screenshotMode}
            onScreenshot={onScreenshot}
            nextBubbleNumber={nextBubbleNumber}
            setNextBubbleNumber={setNextBubbleNumber}
            isArrowMode={isArrowMode}
            setIsArrowMode={setIsArrowMode}
            isBoltMode={isBoltMode}
            setIsBoltMode={setIsBoltMode}
            isLineMode={isLineMode}
            setIsLineMode={setIsLineMode}
            isFreehandMode={isFreehandMode}
            setIsFreehandMode={setIsFreehandMode}
            drawingPolyline={drawingPolyline}
            bringToFront={bringToFront}
            sendToBack={sendToBack}
            bringForward={bringForward}
            sendBackward={sendBackward}
            selectedId={selectedId}
          />
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="main" style={{ position: 'relative', flex: 1, overflow: 'hidden', background: '#f5f5f5', display: 'flex', flexDirection: 'row' }}>

        {/* LEFT PANEL (Docked) */}
        {isPanelOpen && (
          <div className="left-panel-container" style={{
            width: '320px',
            flexShrink: 0,
            background: 'white',
            borderRight: '1px solid #ddd',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10
          }}>
            <div className="panel-header" style={{ padding: '12px 16px', background: '#f9f9f9', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold' }}>Properties</span>
              <button onClick={() => setIsPanelOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2em', lineHeight: '1' }}>×</button>
            </div>
            <div className="panel-content" style={{ overflowY: 'auto', flex: 1 }}>
              <RightPanel
                selected={objects.find(o => o.id === selectedId) || null}
                onChange={patch => {
                  if (selectedId) {
                    setObjects(objs => objs.map((o): CanvasObject => o.id === selectedId ? { ...o, ...patch } as any : o))
                  }
                }}
                objects={objects}
                onAddObject={newObj => setObjects(prev => [...prev, newObj])}
                setDrawingPolyline={setDrawingPolyline}
                getCenter={getCenter}
                gridSize={gridSize}
                setGridSize={setGridSize}
                snapEnabled={snapEnabled}
                setSnapEnabled={setSnapEnabled}
                screenshotMode={screenshotMode}
                setScreenshotMode={setScreenshotMode}
                onScreenshot={onScreenshot}
                nextBubbleNumber={nextBubbleNumber}
                setNextBubbleNumber={setNextBubbleNumber}
              />
            </div>
          </div>
        )}

        {/* CANVAS LAYER (Flex Grow - Fills remaining space) */}
        <div className="canvas-viewport" style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#f0f0f0' }}>
          <Canvas
            objects={objects}
            setObjects={setObjects}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            drawingPolyline={drawingPolyline}
            setDrawingPolyline={setDrawingPolyline}
            view={view}
            setView={setView}
            gridSize={gridSize}
            snapEnabled={snapEnabled}
            zoom={zoom}
            setZoom={setZoom}
            screenshotMode={screenshotMode}
            setScreenshotMode={setScreenshotMode}
            onScreenshot={onScreenshot}
            isArrowMode={isArrowMode}
            setIsArrowMode={setIsArrowMode}
            isBoltMode={isBoltMode}
            setIsBoltMode={setIsBoltMode}
            isLineMode={isLineMode}
            setIsLineMode={setIsLineMode}
            isFreehandMode={isFreehandMode}
            setIsFreehandMode={setIsFreehandMode}
          />
        </div>

      </div>
    </div>
  )
}
