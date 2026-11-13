import { useCallback, useEffect, useRef, useState } from 'react'
import type { CanvasObject, Point } from './types'
import type { ToolId } from './tools'
import { TOOLS } from './tools'
import { Canvas } from './Canvas'
import { Toolbar } from './Toolbar'
import { RightPanel } from './RightPanel'
import type { PanelTab } from './RightPanel'
import { StyleBar } from './StyleBar'
import { StatusBar } from './StatusBar'
import { useHistory } from './hooks/useHistory'
import type { DrawStyle } from './style'
import { DEFAULT_STYLE, stylePatchFor } from './style'
import { alignObjects, getObjectBounds, translateObject } from './canvas/geometry'
import type { AlignKind } from './canvas/geometry'
import { captureSvgToClipboard } from './utils/capture'
import { migrateObjects } from './utils/boltUtils'
import { DEFAULT_PROFILE_CODE, loadCatalog, useCatalog } from './profiles'
import {
  loadAutosave, openProjectFile, resetFileHandle, saveProjectFile, serializeProject, writeAutosave,
} from './utils/project'

export type ScreenshotMode = 'grid' | 'white' | 'transparent'

/** Prefisso usato negli appunti per riconoscere gli oggetti copiati da questa app */
const CLIP_MARKER = 'parametric-canvas/objects:'

export default function App() {
  const history = useHistory<CanvasObject[]>([])
  // ridisegna quando il catalogo profili è caricato
  useCatalog()
  const objects = history.state
  const setObjects = history.setState

  /** Oggetti selezionati (più di uno con Ctrl+clic, riquadro o Ctrl+A) */
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null
  const setSelectedId = useCallback((id: string | null) => setSelectedIds(id ? [id] : []), [])
  const [tool, setToolRaw] = useState<ToolId>('select')
  const [view, setView] = useState<Point>({ x: -100, y: -100 })
  const [zoom, setZoom] = useState(1)
  const [gridSize, setGridSize] = useState(50)
  const [showGrid, setShowGrid] = useState(true)
  const [snapEnabled, setSnapEnabled] = useState(false)
  const [orthoEnabled, setOrthoEnabled] = useState(false)
  const [drawStyle, setDrawStyle] = useState<DrawStyle>(DEFAULT_STYLE)
  const [nextBubbleNumber, setNextBubbleNumber] = useState(1)
  const [panelOpen, setPanelOpen] = useState(true)
  const [panelTab, setPanelTab] = useState<PanelTab>('props')
  /** Profilo che lo strumento Profilo inserisce al clic */
  const [placeProfile, setPlaceProfile] = useState(DEFAULT_PROFILE_CODE)
  const [screenshotMode, setScreenshotMode] = useState<ScreenshotMode>('white')
  const [cursor, setCursor] = useState<Point | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const viewportRef = useRef<HTMLDivElement>(null)

  const selected = objects.find(o => o.id === selectedId) ?? null
  const selectedObjs = objects.filter(o => selectedIds.includes(o.id))

  const notify = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(t => (t === msg ? null : t)), 2500)
  }, [])

  const setTool = useCallback((t: ToolId) => {
    setToolRaw(t)
    // lo strumento Profilo apre il catalogo per scegliere cosa inserire
    if (t === 'profile') {
      setPanelOpen(true)
      setPanelTab('catalog')
    }
    // gli strumenti che lavorano su un oggetto mantengono la selezione
    if (t !== 'select' && !TOOLS[t].keepSelection) setSelectedId(null)
  }, [])

  /* ======================
     AUTOSALVATAGGIO
     ====================== */
  useEffect(() => {
    // il catalogo profili serve per disegnare i profili salvati: si attende anche quello
    Promise.all([loadAutosave(), loadCatalog().catch(() => undefined)]).then(([p]) => {
      if (p) {
        history.reset(p.objects)
        setView(p.view)
        setZoom(p.zoom)
        setGridSize(p.gridSize)
        setNextBubbleNumber(p.nextBubbleNumber)
        if (p.style) setDrawStyle(p.style)
      }
      setLoaded(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const projectJson = () => serializeProject({ objects, view, zoom, gridSize, nextBubbleNumber, style: drawStyle })

  useEffect(() => {
    if (!loaded) return
    const t = window.setTimeout(() => {
      writeAutosave(projectJson()).then(ok => { if (!ok) notify('Autosalvataggio non riuscito: salva il file manualmente') })
    }, 800)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects, view, zoom, gridSize, nextBubbleNumber, drawStyle, loaded])

  /* ======================
     FILE
     ====================== */
  const onSave = async (saveAs = false) => {
    try {
      const name = await saveProjectFile(projectJson(), saveAs)
      if (name) notify(`Salvato: ${name}`)
    } catch (err) {
      notify(`Errore nel salvataggio: ${(err as Error).message}`)
    }
  }

  const onOpen = async () => {
    try {
      const p = await openProjectFile()
      if (!p) return
      history.reset(p.objects)
      setView(p.view)
      setZoom(p.zoom)
      setGridSize(p.gridSize)
      setNextBubbleNumber(p.nextBubbleNumber)
      setSelectedId(null)
      notify(`Aperto: ${p.objects.length} oggetti`)
    } catch (err) {
      notify(`Impossibile aprire il file: ${(err as Error).message}`)
    }
  }

  const onNew = () => {
    // niente finestra di conferma (bloccata in alcuni browser): l'operazione si annulla con Ctrl+Z
    const hadObjects = objects.length > 0
    setObjects([])
    setToolRaw('select')
    if (hadObjects) notify('Nuovo disegno — Ctrl+Z per ripristinare il precedente')
    setSelectedId(null)
    setNextBubbleNumber(1)
    resetFileHandle()
  }

  /* ======================
     VISTA
     ====================== */
  const viewportSize = () => {
    const el = viewportRef.current
    return { w: el?.clientWidth ?? window.innerWidth, h: el?.clientHeight ?? window.innerHeight }
  }

  const getCenter = (): Point => {
    const { w, h } = viewportSize()
    return { x: w / 2 / zoom + view.x, y: h / 2 / zoom + view.y }
  }

  const zoomAt = (factor: number) => {
    const { w, h } = viewportSize()
    const nz = Math.min(Math.max(zoom * factor, 0.05), 20)
    setView(v => ({ x: v.x + w / 2 / zoom - w / 2 / nz, y: v.y + h / 2 / zoom - h / 2 / nz }))
    setZoom(nz)
  }

  const zoomToFit = () => {
    if (!objects.length) {
      setZoom(1)
      setView({ x: -100, y: -100 })
      return
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const o of objects) {
      const b = getObjectBounds(o)
      minX = Math.min(minX, b.x); minY = Math.min(minY, b.y)
      maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h)
    }
    const { w, h } = viewportSize()
    const pad = 60
    const nz = Math.min(Math.max(Math.min((w - pad * 2) / (maxX - minX || 1), (h - pad * 2) / (maxY - minY || 1)), 0.05), 4)
    setZoom(nz)
    setView({ x: (minX + maxX) / 2 - w / 2 / nz, y: (minY + maxY) / 2 - h / 2 / nz })
  }

  /* ======================
     OGGETTI
     ====================== */
  const addObject = (o: CanvasObject) => {
    setObjects(prev => [...prev, o])
    setSelectedId(o.id)
    setToolRaw('select')
  }

  const updateSelected = (patch: Partial<CanvasObject>) => {
    if (!selectedId) return
    setObjects(objs => objs.map(o => (o.id === selectedId ? ({ ...o, ...patch } as CanvasObject) : o)))
  }

  /** Applica una trasformazione a tutti gli oggetti selezionati */
  const updateMany = (fn: (o: CanvasObject) => CanvasObject) =>
    setObjects(objs => objs.map(o => (selectedIds.includes(o.id) ? fn(o) : o)))

  const onStyleChange = (patch: Partial<DrawStyle>) => {
    setDrawStyle(s => ({ ...s, ...patch }))
    updateMany(o => ({ ...o, ...stylePatchFor(o, patch) }) as CanvasObject)
  }

  const toggleLock = () => {
    if (!selectedObjs.length) return
    const lock = !selectedObjs.every(o => o.locked)
    updateMany(o => ({ ...o, locked: lock }))
    notify(lock ? 'Bloccato: non si sposta né si elimina' : 'Sbloccato')
  }

  const deleteSelected = () => {
    if (!selectedObjs.length) return
    const removable = selectedObjs.filter(o => !o.locked).map(o => o.id)
    if (!removable.length) {
      notify('Oggetto bloccato: sbloccalo per eliminarlo')
      return
    }
    setObjects(objs => objs.filter(o => !removable.includes(o.id)))
    setSelectedIds([])
    if (removable.length < selectedObjs.length) notify('Gli oggetti bloccati non sono stati eliminati')
  }

  const pasteObjects = (items: CanvasObject[], offset = 20) => {
    // ogni gruppo incollato riceve un nuovo identificativo, distinto dall'originale
    const groupMap = new Map<string, string>()
    const copies = items.map(o => {
      const c = { ...translateObject(o, offset, offset), id: crypto.randomUUID() } as CanvasObject
      if (o.groupId) {
        if (!groupMap.has(o.groupId)) groupMap.set(o.groupId, crypto.randomUUID())
        c.groupId = groupMap.get(o.groupId)
      }
      return c
    })
    setObjects(prev => [...prev, ...copies])
    setSelectedIds(copies.map(c => c.id))
  }

  const duplicate = () => { if (selectedObjs.length) pasteObjects(selectedObjs) }

  /** Porta in primo piano o in fondo mantenendo l'ordine relativo degli oggetti selezionati */
  const reorder = (toFront: boolean) => {
    if (!selectedIds.length) return
    setObjects(objs => {
      const sel = objs.filter(x => selectedIds.includes(x.id))
      const rest = objs.filter(x => !selectedIds.includes(x.id))
      return toFront ? [...rest, ...sel] : [...sel, ...rest]
    })
  }

  const selectAll = () => {
    setToolRaw('select')
    setSelectedIds(objects.filter(o => !o.locked).map(o => o.id))
  }

  const group = () => {
    if (selectedObjs.length < 2) {
      notify('Seleziona almeno due oggetti da raggruppare')
      return
    }
    const gid = crypto.randomUUID()
    updateMany(o => ({ ...o, groupId: gid }))
    notify(`Gruppo creato (${selectedObjs.length} oggetti) — Alt+clic per selezionarne uno solo`)
  }

  const ungroup = () => {
    if (!selectedObjs.some(o => o.groupId)) return
    updateMany(o => ({ ...o, groupId: undefined }))
    notify('Gruppo sciolto')
  }

  const align = (kind: AlignKind) => setObjects(objs => alignObjects(objs, selectedIds, kind))

  const screenshot = () => {
    const svg = document.querySelector('svg.canvas') as SVGSVGElement | null
    if (!svg) return
    captureSvgToClipboard(svg, screenshotMode).then(r =>
      notify(r === 'copied' ? 'Screenshot copiato negli appunti' : r === 'downloaded' ? 'Appunti non disponibili: screenshot scaricato come PNG' : 'Impossibile creare lo screenshot'),
    )
  }

  const addImageFromBlob = (blob: Blob, at?: Point) => {
    const reader = new FileReader()
    reader.onload = ev => {
      const src = ev.target?.result as string
      const img = new Image()
      img.onload = () => {
        const c = at ?? getCenter()
        // le immagini molto grandi vengono ridotte per stare nella vista
        const { w, h } = viewportSize()
        const fit = Math.min(1, (w * 0.8) / zoom / img.width, (h * 0.8) / zoom / img.height)
        const iw = img.width * fit
        const ih = img.height * fit
        addObject({ id: crypto.randomUUID(), type: 'image', x: c.x - iw / 2, y: c.y - ih / 2, width: iw, height: ih, src, opacity: 1 })
      }
      img.src = src
    }
    reader.readAsDataURL(blob)
  }

  /* ======================
     APPUNTI
     ====================== */

  /** Gestisce il contenuto incollato: immagine, oggetti di questa app o testo */
  const handleIncoming = (image: Blob | null, text: string, at?: Point) => {
    if (image) {
      addImageFromBlob(image, at)
      return true
    }
    if (!text) return false
    if (text.startsWith(CLIP_MARKER)) {
      try {
        pasteObjects(migrateObjects(JSON.parse(text.slice(CLIP_MARKER.length))))
      } catch { /* contenuto non valido */ }
      return true
    }
    const c = at ?? getCenter()
    addObject({
      id: crypto.randomUUID(), type: 'text', x: c.x, y: c.y, text, fontSize: 16, boxEnabled: false, boxPadding: 8,
      stroke: drawStyle.stroke, textColor: drawStyle.stroke, strokeWidth: 1, fillEnabled: false, fillColor: '#ffffff',
    })
    return true
  }

  /** Pulsante "Incolla": legge gli appunti di sistema (serve il permesso del browser) */
  const pasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard?.read) throw new Error('non supportato')
      const items = await navigator.clipboard.read()
      for (const item of items) {
        const imgType = item.types.find(t => t.startsWith('image/'))
        if (imgType) {
          handleIncoming(await item.getType(imgType), '')
          return
        }
      }
      for (const item of items) {
        if (item.types.includes('text/plain')) {
          const text = await (await item.getType('text/plain')).text()
          if (handleIncoming(null, text)) return
        }
      }
      notify('Gli appunti sono vuoti')
    } catch {
      notify('Il browser non consente di leggere gli appunti: usa Ctrl+V')
    }
  }

  const isTyping = (t: EventTarget | null) =>
    t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement

  useEffect(() => {
    const onCopy = (e: ClipboardEvent) => {
      if (isTyping(e.target) || !selectedObjs.length || !e.clipboardData) return
      e.clipboardData.setData('text/plain', CLIP_MARKER + JSON.stringify(selectedObjs))
      e.preventDefault()
      if (e.type === 'cut') deleteSelected()
    }
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target) || !e.clipboardData) return
      // l'immagine (screenshot copiato da altre applicazioni) ha la precedenza sul testo
      const imageItem = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
      const image = imageItem?.getAsFile() ?? null
      if (handleIncoming(image, e.clipboardData.getData('text/plain'), cursor ?? undefined)) e.preventDefault()
    }
    window.addEventListener('copy', onCopy)
    window.addEventListener('cut', onCopy)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('copy', onCopy)
      window.removeEventListener('cut', onCopy)
      window.removeEventListener('paste', onPaste)
    }
  })

  /* ======================
     TASTIERA
     ====================== */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()

      if (mod) {
        if (key === 'z' && !e.shiftKey) { e.preventDefault(); history.undo(); setSelectedId(null) }
        else if (key === 'y' || (key === 'z' && e.shiftKey)) { e.preventDefault(); history.redo(); setSelectedId(null) }
        else if (key === 's') { e.preventDefault(); onSave(e.shiftKey) }
        else if (key === 'o') { e.preventDefault(); onOpen() }
        else if (key === 'd') { e.preventDefault(); duplicate() }
        else if (e.key === ']') { e.preventDefault(); reorder(true) }
        else if (e.key === '[') { e.preventDefault(); reorder(false) }
        else if (key === '0') { e.preventDefault(); zoomToFit() }
        else if (key === 'l') { e.preventDefault(); toggleLock() }
        else if (key === 'a') { e.preventDefault(); selectAll() }
        else if (key === 'g' && e.shiftKey) { e.preventDefault(); ungroup() }
        else if (key === 'g') { e.preventDefault(); group() }
        return
      }
      if (e.altKey) return

      if (e.key === 'Escape') {
        setToolRaw('select')
        setSelectedId(null)
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteSelected()
        return
      }
      if (e.key.startsWith('Arrow') && selectedObjs.length) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        updateMany(o => (o.locked ? o : translateObject(o, dx, dy)))
        return
      }
      if (e.key === '+' || e.key === '=') return zoomAt(1.2)
      if (e.key === '-') return zoomAt(1 / 1.2)

      const shortcutTool = (Object.values(TOOLS).find(t => t.shortcut?.toLowerCase() === key))
      if (shortcutTool) return setTool(shortcutTool.id)
      if (key === 'g') return setShowGrid(v => !v)
      if (key === 's') return setSnapEnabled(v => !v)
      if (key === 'o') return setOrthoEnabled(v => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /* ======================
     RENDER
     ====================== */
  return (
    <div className="app">
      <Toolbar
        tool={tool}
        setTool={setTool}
        selected={selected}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={() => { history.undo(); setSelectedId(null) }}
        onRedo={() => { history.redo(); setSelectedId(null) }}
        onNew={onNew}
        onOpen={onOpen}
        onSave={() => onSave()}
        onScreenshot={screenshot}
        onBringToFront={() => reorder(true)}
        onSendToBack={() => reorder(false)}
        onDuplicate={duplicate}
        onDelete={deleteSelected}
        onPaste={pasteFromClipboard}
        onToggleLock={toggleLock}
        selectionCount={selectedObjs.length}
        allLocked={selectedObjs.length > 0 && selectedObjs.every(o => o.locked)}
        grouped={selectedObjs.some(o => o.groupId)}
        onGroup={group}
        onUngroup={ungroup}
        panelOpen={panelOpen}
        togglePanel={() => setPanelOpen(v => !v)}
      />

      <div className="main">
        <div
          className="canvas-viewport"
          ref={viewportRef}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault()
            const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'))
            if (file) addImageFromBlob(file, cursor ?? undefined)
          }}
        >
          <Canvas
            objects={objects}
            setObjects={setObjects}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            view={view}
            setView={setView}
            zoom={zoom}
            setZoom={setZoom}
            gridSize={gridSize}
            showGrid={showGrid}
            snapEnabled={snapEnabled}
            orthoEnabled={orthoEnabled}
            tool={tool}
            setTool={setTool}
            drawStyle={drawStyle}
            onCursorMove={setCursor}
            notify={notify}
            placeProfileCode={placeProfile}
            nextBubbleNumber={nextBubbleNumber}
            onBubblePlaced={() => setNextBubbleNumber(n => n + 1)}
          />

          <StyleBar selected={selected} drawStyle={drawStyle} onChange={onStyleChange} />

          {objects.length === 0 && tool === 'select' && (
            <div className="empty-hint">
              <b>Incolla uno screenshot</b> (Ctrl+V o pulsante Incolla) o trascina qui un'immagine,<br />
              poi disegna sopra con gli strumenti in alto.
            </div>
          )}

          {toast && <div className="toast">{toast}</div>}

          <StatusBar
            tool={tool}
            cursor={cursor}
            zoom={zoom}
            onZoomIn={() => zoomAt(1.2)}
            onZoomOut={() => zoomAt(1 / 1.2)}
            onZoomFit={zoomToFit}
            gridSize={gridSize}
            setGridSize={setGridSize}
            showGrid={showGrid}
            setShowGrid={setShowGrid}
            snapEnabled={snapEnabled}
            setSnapEnabled={setSnapEnabled}
            orthoEnabled={orthoEnabled}
            setOrthoEnabled={setOrthoEnabled}
          />
        </div>

        {panelOpen && (
          <aside className="side-panel">
            <RightPanel
              selected={selected}
              selectedObjs={selectedObjs}
              onAlign={align}
              onGroup={group}
              onUngroup={ungroup}
              objects={objects}
              onChange={updateSelected}
              onAddObject={addObject}
              getCenter={getCenter}
              screenshotMode={screenshotMode}
              setScreenshotMode={setScreenshotMode}
              onScreenshot={screenshot}
              tab={panelTab}
              setTab={setPanelTab}
              placingProfileCode={tool === 'profile' ? placeProfile : null}
              onPickProfile={code => {
                setPlaceProfile(code)
                setTool('profile')
              }}
            />
          </aside>
        )}
      </div>
    </div>
  )
}
