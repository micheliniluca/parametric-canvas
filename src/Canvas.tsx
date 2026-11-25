import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Dispatch, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, SetStateAction } from 'react'
import type { CanvasObject, Point, QuoteObject } from './types'
import { textLeader } from './utils/leaderUtils'
import type { ToolId } from './tools'
import { TOOLS, isCreationTool } from './tools'
import type { DrawStyle } from './style'
import { dashArray } from './style'
import { round1 } from './utils/mathUtils'
import {
  applyOrtho, dist, getObjectBounds, getObjectCenter, getSnapPoint, isEndpoint,
  rotatePoint, scaleObject, translateObject, worldBounds, expandGroups, rotateObjectAround,
} from './canvas/geometry'
import { ObjectView, PressureStroke } from './canvas/ObjectView'
import { MultiSelectionOverlay, SelectionOverlay } from './canvas/SelectionOverlay'
import type { Corner, Grip } from './canvas/SelectionOverlay'
import { WandPanel, MeasurePanel, ScalePanel } from './canvas/Overlays'
import { TextEditor } from './canvas/TextEditor'
import { findProfile } from './profiles'
import { DEFAULT_CABLE_SIZE } from './utils/cableUtils'
import { DEFAULT_DECK, deckProfile } from './utils/deckUtils'
import { defaultBeadRot } from './utils/weldUtils'
import { ENVELOPE_KINDS } from './utils/envelopeUtils'
import type { WandState } from './canvas/Overlays'

/** Distanze in pixel schermo (convertite in unità mondo dividendo per lo zoom) */
const SNAP_PX = 12
/**
 * Soglia tra clic e trascinamento: la punta della penna (e il dito) tremano un po' al contatto,
 * quindi serve più margine che col mouse.
 */
const dragThreshold = (pointerType: string) => (pointerType === 'pen' ? 6 : pointerType === 'touch' ? 10 : 3)
/** Due pressioni entro questo tempo (e vicine) valgono come doppio clic */
const DOUBLE_TAP_MS = 400
const round2 = (v: number) => Math.round(v * 100) / 100
const ACCENT = '#2F6CB0'

type Props = {
  objects: CanvasObject[]
  setObjects: Dispatch<SetStateAction<CanvasObject[]>>
  selectedIds: string[]
  setSelectedIds: (ids: string[]) => void
  view: Point
  setView: Dispatch<SetStateAction<Point>>
  zoom: number
  setZoom: Dispatch<SetStateAction<number>>
  gridSize: number
  showGrid: boolean
  snapEnabled: boolean
  orthoEnabled: boolean
  tool: ToolId
  setTool: (t: ToolId) => void
  drawStyle: DrawStyle
  onCursorMove?: (p: Point) => void
  notify?: (msg: string) => void
  /** Codice del profilo da inserire con lo strumento Profilo */
  placeProfileCode: string
  /** Numero del prossimo bollino e funzione che lo fa avanzare */
  nextBubbleNumber: number
  onBubblePlaced: () => void
}

/** Interazione col puntatore in corso (una sola alla volta) */
type Interaction =
  | { kind: 'pan'; sx: number; sy: number; vx: number; vy: number }
  | { kind: 'move'; ids: Set<string>; sx: number; sy: number; startWorld: Point; starts: CanvasObject[]; moved: boolean }
  | { kind: 'marquee'; sx: number; sy: number; start: Point; additive: boolean; clickId?: string }
  | { kind: 'rotateMulti'; cx: number; cy: number; startAngle: number; starts: CanvasObject[] }
  | { kind: 'resize'; id: string; corner: Corner; start: CanvasObject }
  | { kind: 'vertex'; id: string; index: number }
  | { kind: 'end'; id: string; end: 'p1' | 'p2' }
  | { kind: 'leader'; id: string }
  | { kind: 'leaderText'; id: string; attach: Point; ox: number; oy: number }
  | { kind: 'rotate'; id: string; cx: number; cy: number; startAngle: number; initial: number }
  | { kind: 'freehand' }
  | { kind: 'segment' } // linea / freccia / bulloni: trascina dal primo al secondo punto

/** Disegno in costruzione a due punti */
type Segment = { p1: Point; p2: Point }

export function Canvas({
  objects, setObjects, selectedIds, setSelectedIds,
  view, setView, zoom, setZoom,
  gridSize, showGrid, snapEnabled, orthoEnabled,
  tool, setTool, drawStyle, onCursorMove, notify, placeProfileCode, nextBubbleNumber, onBubblePlaced,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const action = useRef<Interaction | null>(null)
  const [size, setSize] = useState({ w: 1200, h: 800 })

  // Bozze degli strumenti
  const [segment, setSegment] = useState<Segment | null>(null)
  const [polyPoints, setPolyPoints] = useState<Point[] | null>(null)
  const [freehand, setFreehand] = useState<Point[] | null>(null)
  const [cropPoints, setCropPoints] = useState<Point[] | null>(null)
  const [hover, setHover] = useState<Point | null>(null)
  const [measure, setMeasure] = useState<Segment | null>(null)
  const [scalePending, setScalePending] = useState<Segment | null>(null)
  const [wand, setWand] = useState<WandState | null>(null)
  /** Testo in modifica direttamente sulla tela */
  const [editingId, setEditingId] = useState<string | null>(null)
  /** Oggetto da scalare con lo strumento "scala con due punti" */
  const [scaleTargetId, setScaleTargetId] = useState<string | null>(null)

  /** Selezione singola (maniglie, strumenti immagine); con più oggetti è null */
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null
  const setSelectedId = (id: string | null) => setSelectedIds(id ? [id] : [])
  const selected = objects.find(o => o.id === selectedId) ?? null
  const selectedObjs = selectedIds.length > 1 ? objects.filter(o => selectedIds.includes(o.id)) : []
  /** Tipo di puntatore in uso (mouse, pen, touch): regola tolleranze e maniglie */
  const pointerType = useRef('mouse')
  const [coarsePointer, setCoarsePointer] = useState(false)
  const dragPx = () => dragThreshold(pointerType.current)
  const notePointer = (e: ReactPointerEvent) => {
    pointerType.current = e.pointerType || 'mouse'
    const coarse = e.pointerType === 'pen' || e.pointerType === 'touch'
    if (coarse !== coarsePointer) setCoarsePointer(coarse)
  }
  /** Ultima pressione sullo sfondo, per riconoscere il doppio clic/tocco anche con la penna */
  const lastDown = useRef({ t: 0, x: 0, y: 0 })
  /** Spazio tenuto premuto: trascinando si sposta la vista */
  const spaceDown = useRef(false)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const [panning, setPanning] = useState(false)
  /** Pressione della penna per ogni punto della mano libera */
  const pressures = useRef<number[] | null>(null)
  const freehandPts = useRef<Point[] | null>(null)
  /** Riquadro di selezione in corso */
  const [marquee, setMarquee] = useState<{ a: Point; b: Point } | null>(null)

  // Cambiando strumento si azzerano le bozze
  useEffect(() => {
    setSegment(null)
    setPolyPoints(null)
    setFreehand(null)
    setCropPoints(null)
    setMeasure(null)
    setScalePending(null)
    setScaleTargetId(null)
    setHover(null)
    if (tool !== 'wand') setWand(null)
  }, [tool])

  // Spazio + trascina = pan (comodo con la penna, che non ha tasto centrale né rotella)
  useEffect(() => {
    const typing = (t: EventTarget | null) =>
      t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement ||
      (t instanceof HTMLElement && t.isContentEditable)
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || typing(e.target)) return
      e.preventDefault()
      if (!spaceDown.current) { spaceDown.current = true; setSpaceHeld(true) }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      spaceDown.current = false
      setSpaceHeld(false)
    }
    const reset = () => { spaceDown.current = false; setSpaceHeld(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', reset)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', reset)
    }
  }, [])

  // se il testo in modifica viene eliminato (es. annulla) chiude l'editor
  useEffect(() => {
    if (editingId && !objects.some(o => o.id === editingId)) setEditingId(null)
  }, [objects, editingId])

  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }))
    ro.observe(svg)
    return () => ro.disconnect()
  }, [])

  /* ---------- coordinate ---------- */

  const toWorld = (e: { clientX: number; clientY: number }): Point => {
    const rect = svgRef.current!.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / zoom + view.x, y: (e.clientY - rect.top) / zoom + view.y }
  }

  const snapOn = (e: ReactMouseEvent) => snapEnabled || e.ctrlKey || e.metaKey
  const orthoOn = (e: ReactMouseEvent) => orthoEnabled || e.shiftKey

  /** Punto mondo con snap e (opzionale) vincolo ortogonale rispetto a `ref` */
  const pick = (e: ReactMouseEvent, ref?: Point | null, excludeId?: string): Point => {
    const w = toWorld(e)
    let p = snapOn(e) ? getSnapPoint(objects, w, gridSize, SNAP_PX / zoom, excludeId) : w
    if (ref && orthoOn(e)) p = applyOrtho(p, ref)
    return p
  }

  const updateObject = (id: string, fn: (o: CanvasObject) => CanvasObject) =>
    setObjects(objs => objs.map(o => (o.id === id ? fn(o) : o)))

  const addObject = (o: CanvasObject) => {
    setObjects(prev => [...prev, o])
    if (!TOOLS[tool].sticky) {
      setTool('select')
      setSelectedId(o.id)
    }
  }

  const makeBubble = (value: number, p: Point): CanvasObject => ({
    id: crypto.randomUUID(), type: 'symbol', symbolType: 'bubble', x: p.x, y: p.y, value,
    stroke: drawStyle.stroke, strokeWidth: 2, fillEnabled: true, fillColor: '#fde047',
  })

  // un nuovo cavo riprende taglia e forcelle dell'ultimo cavo disegnato
  const makeCable = (p1: Point, p2: Point): CanvasObject => {
    const last = [...objects].reverse().find(o => o.type === 'cable')
    return {
      id: crypto.randomUUID(), type: 'cable', x: 0, y: 0, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
      size: last?.type === 'cable' ? last.size : DEFAULT_CABLE_SIZE,
      startSocket: last?.type === 'cable' ? last.startSocket : true,
      endSocket: last?.type === 'cable' ? last.endSocket : true,
      showLabel: true,
      stroke: drawStyle.stroke, strokeWidth: 1.5, fillEnabled: true, fillColor: '#cbd5e1',
    }
  }

  // una nuova lamiera riprende profilo, spessore, lunghezza e getto dell'ultima disegnata
  const makeDeck = (p1: Point, p2: Point): CanvasObject => {
    const last = [...objects].reverse().find(o => o.type === 'deck')
    const prev = last?.type === 'deck' ? last : null
    return {
      id: crypto.randomUUID(), type: 'deck', x: 0, y: 0, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
      profile: prev?.profile ?? DEFAULT_DECK, thickness: prev?.thickness ?? 0.9, view: 'section',
      width: 2700, length: prev?.length ?? 3000, slab: prev?.slab ?? 0, hatch: prev?.hatch ?? true, showLabel: false,
      studs: prev?.studs ?? false, studD: prev?.studD ?? 19, studH: prev?.studH ?? deckProfile(prev?.profile ?? DEFAULT_DECK).studH,
      studsPerTrough: prev?.studsPerTrough ?? 1, beamSpacing: prev?.beamSpacing ?? 0,
      stroke: drawStyle.stroke, strokeWidth: 1.5, fillEnabled: true, fillColor: '#e2e8f0',
    }
  }

  // involucro e copertura riprendono le impostazioni dell'ultimo elemento dello stesso tipo
  const makeEnvelope = (p1: Point, p2: Point): CanvasObject => {
    const last = [...objects].reverse().find(o => o.type === 'envelope')
    const prev = last?.type === 'envelope' ? last : null
    const kind = prev?.kind ?? 'insulation'
    return {
      id: crypto.randomUUID(), type: 'envelope', x: 0, y: 0, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
      kind, thickness: prev?.thickness ?? 100, ribs: prev?.ribs ?? 'flat', ribHeight: prev?.ribHeight ?? 40,
      ribPitch: prev?.ribPitch ?? 250, skin: prev?.skin ?? 0.5, module: prev?.module ?? 1000,
      glazing: prev?.glazing ?? '6/16/6', showLabel: false,
      stroke: drawStyle.stroke, strokeWidth: 1, fillEnabled: true,
      fillColor: prev?.fillColor ?? ENVELOPE_KINDS.find(k => k.id === kind)!.fill,
    }
  }

  const makeSeam = (p1: Point, p2: Point): CanvasObject => {
    const last = [...objects].reverse().find(o => o.type === 'seam')
    const prev = last?.type === 'seam' ? last : null
    return {
      id: crypto.randomUUID(), type: 'seam', x: 0, y: 0, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
      seam: prev?.seam ?? 'double', height: prev?.height ?? 25, pitch: prev?.pitch ?? 500,
      thickness: prev?.thickness ?? 0.7, showLabel: false, stroke: drawStyle.stroke, strokeWidth: 1.5,
    }
  }

  // una nuova saldatura riprende norma, tipo, lato e quote dell'ultima; il cordone si orienta verso la linea
  const makeWeld = (tip: Point, knee: Point): CanvasObject => {
    const last = [...objects].reverse().find(o => o.type === 'weld')
    const prev = last?.type === 'weld' ? last : null
    const kind = prev?.kind ?? 'fillet'
    return {
      id: crypto.randomUUID(), type: 'weld', x: 0, y: 0, x1: tip.x, y1: tip.y, x2: knee.x, y2: knee.y,
      standard: prev?.standard ?? 'iso', kind, side: prev?.side ?? 'arrow',
      size: prev?.size ?? 5, sizeRef: prev?.sizeRef ?? 'a', length: prev?.length ?? 0,
      count: prev?.count ?? 0, gap: prev?.gap ?? 0, staggered: prev?.staggered ?? false,
      allAround: prev?.allAround ?? false, field: prev?.field ?? false, contour: prev?.contour ?? 'none',
      process: prev?.process ?? '', showBead: prev?.showBead ?? true, plate: prev?.plate ?? 10,
      beadRot: defaultBeadRot(kind, tip, knee), beadFlip: false, textSize: prev?.textSize ?? 14,
      stroke: drawStyle.stroke, strokeWidth: 1,
    }
  }

  const makeProfile = (code: string, series: string, p: Point): CanvasObject => ({
    id: crypto.randomUUID(), type: 'profile', profileType: series, profileName: code,
    x: p.x, y: p.y, scale: 1, viewType: 'front', length: 1000,
    stroke: drawStyle.stroke, strokeWidth: 1.5, fillEnabled: true, fillColor: '#94a3b8',
  })

  const strokeProps = () => ({
    stroke: drawStyle.stroke,
    strokeWidth: drawStyle.strokeWidth,
    strokeDash: drawStyle.strokeDash,
  })

  /* ---------- zoom ---------- */

  const onWheel = (e: React.WheelEvent) => {
    const rect = svgRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const factor = Math.exp(-e.deltaY * 0.0015)
    const newZoom = Math.min(Math.max(zoom * factor, 0.05), 20)
    setZoom(newZoom)
    setView(v => ({ x: v.x + mx / zoom - mx / newZoom, y: v.y + my / zoom - my / newZoom }))
  }

  /* ---------- pressione sugli oggetti ---------- */

  const onObjectMouseDown = (e: ReactMouseEvent, o: CanvasObject) => {
    // con Spazio (o tasto laterale della penna) la pressione passa allo sfondo, che sposta la vista
    if (e.button !== 0 || spaceDown.current) return
    e.stopPropagation()
    if (editingId && o.id !== editingId) finishEditing()

    if (tool === 'wand') {
      if (o.type === 'image') startWand(e, o)
      return
    }

    // Alt+clic: solo l'oggetto, anche se fa parte di un gruppo
    const ids = e.altKey ? [o.id] : expandGroups(objects, [o.id])

    // Ctrl+clic: aggiunge o toglie dalla selezione
    if (e.ctrlKey || e.metaKey) {
      const allIn = ids.every(id => selectedIds.includes(id))
      setSelectedIds(allIn ? selectedIds.filter(id => !ids.includes(id)) : [...new Set([...selectedIds, ...ids])])
      return
    }

    if (o.locked) {
      // oggetto bloccato (es. screenshot di sfondo): trascinando si traccia un riquadro, con un clic si seleziona
      action.current = { kind: 'marquee', sx: e.clientX, sy: e.clientY, start: toWorld(e), additive: false, clickId: o.id }
      return
    }

    // clic su un oggetto già selezionato: si sposta tutta la selezione
    const sel = !e.altKey && selectedIds.includes(o.id) ? selectedIds : ids
    if (sel !== selectedIds) setSelectedIds(sel)
    const starts = objects.filter(x => sel.includes(x.id) && !x.locked)
    action.current = {
      kind: 'move', ids: new Set(starts.map(x => x.id)), sx: e.clientX, sy: e.clientY,
      startWorld: toWorld(e), starts, moved: false,
    }
  }

  /** Rotazione di più oggetti attorno al centro della selezione */
  const onMultiRotate = (e: ReactMouseEvent, center: Point) => {
    const w = toWorld(e)
    action.current = {
      kind: 'rotateMulti', cx: center.x, cy: center.y,
      startAngle: (Math.atan2(w.y - center.y, w.x - center.x) * 180) / Math.PI,
      starts: selectedObjs.filter(o => !o.locked),
    }
  }

  const startWand = (e: ReactMouseEvent, o: Extract<CanvasObject, { type: 'image' }>) => {
    const local = rotatePoint(toWorld(e), getObjectCenter(o), -(o.rotation || 0))
    const lx = local.x - o.x
    const ly = local.y - o.y
    if (lx < 0 || ly < 0 || lx > o.width || ly > o.height) return
    setSelectedId(o.id)
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      const ctx = c.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0)
      const px = Math.floor((lx * img.width) / o.width)
      const py = Math.floor((ly * img.height) / o.height)
      const [r, g, b] = ctx.getImageData(px, py, 1, 1).data
      setWand({
        id: o.id, originalSrc: o.src, targetColor: { r, g, b }, targetPixel: { x: px, y: py },
        threshold: wand?.threshold ?? 30, contiguous: wand?.contiguous ?? true, previewSrc: null,
      })
    }
    img.src = o.src
  }

  /** Chiude l'editor del testo; un testo lasciato vuoto viene eliminato */
  const finishEditing = () => {
    if (!editingId) return
    const t = objects.find(o => o.id === editingId)
    setEditingId(null)
    if (t?.type === 'text' && !t.text.trim()) {
      setObjects(objs => objs.filter(o => o.id !== t.id))
      setSelectedId(null)
    }
  }

  const onObjectDoubleClick = (o: CanvasObject) => {
    if (tool === 'select' && o.type === 'text' && !o.locked) setEditingId(o.id)
  }

  const onGrip = (e: ReactMouseEvent, g: Grip) => {
    if (!selected || selected.locked) return
    const id = selected.id
    if (g.kind === 'resize') action.current = { kind: 'resize', id, corner: g.corner, start: selected }
    else if (g.kind === 'vertex') action.current = { kind: 'vertex', id, index: g.index }
    else if (g.kind === 'end') action.current = { kind: 'end', id, end: g.end }
    else if (g.kind === 'leader') action.current = { kind: 'leader', id }
    else if (g.kind === 'leaderText' && selected.type === 'text') {
      const ld = textLeader(selected)
      if (ld) action.current = { kind: 'leaderText', id, attach: ld.pts[1], ox: selected.x, oy: selected.y }
    }
    else {
      const c = getObjectCenter(selected)
      const w = toWorld(e)
      action.current = {
        kind: 'rotate', id, cx: c.x, cy: c.y,
        startAngle: (Math.atan2(w.y - c.y, w.x - c.x) * 180) / Math.PI,
        initial: selected.rotation || 0,
      }
    }
  }

  /* ---------- pressione sullo sfondo / strumenti ---------- */

  const onMouseDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (editingId) finishEditing()
    // Pan: tasto centrale, tasto laterale della penna, oppure Spazio + trascina
    const penBarrel = e.pointerType === 'pen' && (e.button === 2 || (e.buttons & 2) !== 0)
    if (e.button === 1 || penBarrel || (e.button === 0 && spaceDown.current)) {
      e.preventDefault()
      action.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y }
      setPanning(true)
      return
    }
    if (e.button !== 0) return
    // doppio clic/tocco riconosciuto qui: con gli eventi pointer e.detail non è affidabile
    const now = performance.now()
    const ld = lastDown.current
    const dbl = now - ld.t < DOUBLE_TAP_MS && Math.hypot(e.clientX - ld.x, e.clientY - ld.y) < dragPx() * 3
    lastDown.current = dbl ? { t: 0, x: 0, y: 0 } : { t: now, x: e.clientX, y: e.clientY }

    switch (tool) {
      case 'text': {
        const p = pick(e)
        const id = crypto.randomUUID()
        setObjects(prev => [...prev, {
          id, type: 'text', x: p.x, y: p.y - 14, text: '', fontSize: 16, boxEnabled: false, boxPadding: 6,
          stroke: drawStyle.stroke, textColor: drawStyle.stroke, strokeWidth: 1, fillEnabled: false, fillColor: '#ffffff',
        }])
        setTool('select')
        setSelectedId(id)
        setEditingId(id)
        return
      }
      case 'bubble': {
        // resta attivo: ogni clic aggiunge il bollino successivo
        addObject(makeBubble(nextBubbleNumber, pick(e)))
        onBubblePlaced()
        return
      }
      case 'profile': {
        const prof = findProfile(placeProfileCode)
        if (!prof) {
          notify?.('Scegli prima un profilo nel catalogo')
          return
        }
        addObject(makeProfile(prof.code, prof.series, pick(e)))
        return
      }
      case 'bolt': {
        // un clic = un bullone (snap su vertici/punti medi)
        const p = pick(e)
        addObject({
          id: crypto.randomUUID(), type: 'bolt', x: p.x, y: p.y,
          diameter: 20, grade: '8.8', view: 'head', grip: 20,
          cols: 1, pitchX: 70, rows: 1, pitchY: 70, stroke: drawStyle.stroke, strokeWidth: 1,
        })
        return
      }
      case 'rect': {
        // due clic sui vertici opposti della diagonale (trascinando funziona ancora)
        if (segment) {
          addRect(segment.p1, rectCorner(e, segment.p1))
          setSegment(null)
          return
        }
        const p = pick(e)
        setSegment({ p1: p, p2: p })
        action.current = { kind: 'segment' }
        return
      }
      case 'line':
      case 'arrow':
      case 'circle': {
        const p = pick(e)
        setSegment({ p1: p, p2: p })
        action.current = { kind: 'segment' }
        return
      }
      case 'freehand':
        pressures.current = e.pointerType === 'pen' ? [e.pressure] : null
        freehandPts.current = [toWorld(e)]
        setFreehand([...freehandPts.current])
        action.current = { kind: 'freehand' }
        return
      case 'quote':
      case 'cable':
      case 'deck':
      case 'envelope':
      case 'seam':
      case 'weld':
      case 'measure':
      case 'scale': {
        const p = pick(e, segment?.p1)
        if (tool === 'measure' && measure) setMeasure(null)
        if (!segment && tool === 'scale') {
          // bersaglio: oggetto selezionato, altrimenti l'immagine (o l'oggetto) sotto il primo clic
          const hit = findTopObjectAt(objects, p)
          const target = (hit?.type === 'image' ? hit : null) ?? selected ?? hit
          if (!target) {
            notify?.('Fai clic su un\'immagine: nessun oggetto sotto il punto')
            return
          }
          setScaleTargetId(target.id)
          setSelectedId(target.id)
        }
        if (!segment) {
          setSegment({ p1: p, p2: p })
          return
        }
        finishClickSegment({ p1: segment.p1, p2: p })
        setSegment(null)
        return
      }
      case 'polyline': {
        const last = polyPoints?.[polyPoints.length - 1]
        const p = pick(e, last)
        if (!polyPoints) {
          setPolyPoints([p])
          return
        }
        if (dbl) {
          finishPolyline(false)
          return
        }
        // clic sul primo punto: chiude la forma
        if (polyPoints.length >= 3 && dist(p, polyPoints[0]) < SNAP_PX / zoom) {
          finishPolyline(true)
          return
        }
        setPolyPoints([...polyPoints, p])
        return
      }
      case 'crop': {
        if (!selected || selected.type !== 'image') return
        if (dbl) {
          applyCrop()
          return
        }
        const w = rotatePoint(pick(e), getObjectCenter(selected), -(selected.rotation || 0))
        setCropPoints(prev => [...(prev ?? []), { x: w.x - selected.x, y: w.y - selected.y }])
        return
      }
      case 'select':
        // trascinando si traccia il riquadro di selezione; un clic sul vuoto deseleziona
        action.current = { kind: 'marquee', sx: e.clientX, sy: e.clientY, start: toWorld(e), additive: e.ctrlKey || e.metaKey }
        return
      default:
        return
    }
  }

  /** Secondo vertice del rettangolo: con Shift diventa un quadrato */
  const rectCorner = (e: ReactMouseEvent, p1: Point): Point => {
    const p = pick(e)
    if (!e.shiftKey) return p
    const d = Math.max(Math.abs(p.x - p1.x), Math.abs(p.y - p1.y))
    return { x: p1.x + Math.sign(p.x - p1.x || 1) * d, y: p1.y + Math.sign(p.y - p1.y || 1) * d }
  }

  const addRect = (p1: Point, p2: Point) => {
    const width = Math.abs(p2.x - p1.x), height = Math.abs(p2.y - p1.y)
    if (width < 0.5 || height < 0.5) return
    addObject({
      id: crypto.randomUUID(), type: 'rect', x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y), width, height,
      ...strokeProps(), fillEnabled: drawStyle.fillEnabled, fillColor: drawStyle.fillColor,
    })
  }

  const finishClickSegment = (s: Segment) => {
    if (dist(s.p1, s.p2) < 1) return
    if (tool === 'quote') {
      addObject({
        id: crypto.randomUUID(), type: 'quote', x: 0, y: 0,
        x1: s.p1.x, y1: s.p1.y, x2: s.p2.x, y2: s.p2.y,
        stroke: drawStyle.stroke, textColor: drawStyle.stroke, strokeWidth: 1,
        // le estremità seguono l'ultima quota disegnata (di base le frecce)
        ends: [...objects].reverse().find((q): q is QuoteObject => q.type === 'quote')?.ends ?? 'arrow',
      })
    } else if (tool === 'cable') {
      addObject(makeCable(s.p1, s.p2))
    } else if (tool === 'deck') {
      addObject(makeDeck(s.p1, s.p2))
    } else if (tool === 'weld') {
      addObject(makeWeld(s.p1, s.p2))
    } else if (tool === 'envelope') {
      addObject(makeEnvelope(s.p1, s.p2))
    } else if (tool === 'seam') {
      addObject(makeSeam(s.p1, s.p2))
    } else if (tool === 'measure') {
      setMeasure(s)
    } else if (tool === 'scale') {
      setScalePending(s)
    }
  }

  const finishPolyline = (closed: boolean) => {
    const pts = polyPoints ?? []
    setPolyPoints(null)
    if (pts.length < 2) return
    addObject({
      id: crypto.randomUUID(), type: 'polyline',
      points: closed ? [...pts, pts[0]] : pts, closed,
      ...strokeProps(),
      fillEnabled: closed && drawStyle.fillEnabled, fillColor: drawStyle.fillColor,
    })
  }

  const applyCrop = () => {
    if (selected?.type === 'image' && cropPoints && cropPoints.length > 2) {
      // i punti sono presi sull'immagine come appare: se è specchiata si riportano al file originale
      updateObject(selected.id, o => ({
        ...o,
        clipPoints: o.type === 'image' && o.flipX ? cropPoints.map(p => ({ x: o.width - p.x, y: p.y })) : cropPoints,
      }))
    }
    setCropPoints(null)
    setTool('select')
  }

  // Invio termina polilinea/scontorno
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (polyPoints) finishPolyline(false)
      else if (cropPoints) applyCrop()
      else if (tool === 'select' && selected?.type === 'text' && !selected.locked && !editingId) {
        // alternativa al doppio clic, comoda con la penna
        e.preventDefault()
        setEditingId(selected.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /* ---------- movimento ---------- */

  const onMouseMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    notePointer(e)
    // durante un trascinamento il tratto resta alla tela anche se il puntatore ne esce
    const svg = svgRef.current
    if (action.current && e.buttons && svg && !svg.hasPointerCapture(e.pointerId)) {
      try { svg.setPointerCapture(e.pointerId) } catch { /* puntatore già rilasciato */ }
    }
    const w = toWorld(e)
    onCursorMove?.(w)
    const a = action.current

    // Anteprime degli strumenti a clic
    if (!a) {
      if (segment && tool === 'rect') {
        setSegment({ ...segment, p2: rectCorner(e, segment.p1) })
      } else if (segment && (tool === 'quote' || tool === 'cable' || tool === 'deck' || tool === 'envelope' || tool === 'seam' || tool === 'weld' || tool === 'measure' || tool === 'scale')) {
        setSegment({ ...segment, p2: pick(e, segment.p1) })
      } else if (tool === 'profile' || tool === 'bubble') {
        setHover(pick(e))
      } else if (polyPoints) {
        setHover(pick(e, polyPoints[polyPoints.length - 1]))
      } else if (cropPoints) {
        setHover(pick(e))
      }
      return
    }

    switch (a.kind) {
      case 'pan':
        setView({ x: a.vx - (e.clientX - a.sx) / zoom, y: a.vy - (e.clientY - a.sy) / zoom })
        return

      case 'segment':
        setSegment(s => {
          if (!s) return s
          if (tool === 'rect') return { ...s, p2: rectCorner(e, s.p1) }
          if (tool === 'circle') return { ...s, p2: pick(e) }
          return { ...s, p2: pick(e, s.p1) }
        })
        return

      case 'freehand': {
        // la penna invia più campioni per fotogramma: si usano tutti per un tratto più fluido
        const native = e.nativeEvent
        const coalesced = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : []
        const samples = coalesced.length ? coalesced : [native]
        // punti e pressioni si accumulano fuori dallo stato (React può ripetere gli aggiornamenti)
        const pts = freehandPts.current
        if (!pts) return
        const pr = pressures.current
        let added = false
        for (const sm of samples) {
          const p = toWorld(sm)
          if (dist(pts[pts.length - 1], p) > 1.5 / zoom) {
            pts.push(p)
            pr?.push(sm.pressure)
            added = true
          }
        }
        if (added) setFreehand([...pts])
        return
      }

      case 'move': {
        if (!a.moved && Math.hypot(e.clientX - a.sx, e.clientY - a.sy) < dragPx()) return
        a.moved = true
        // si aggancia il punto di presa, poi si traslano gli oggetti della stessa quantità
        const snapped = snapOn(e) ? getSnapPoint(objects, w, gridSize, SNAP_PX / zoom, a.ids) : w
        let dx = snapped.x - a.startWorld.x
        let dy = snapped.y - a.startWorld.y
        if (orthoOn(e)) {
          if (Math.abs(dx) > Math.abs(dy)) dy = 0
          else dx = 0
        }
        const moved = new Map(a.starts.map(o => [o.id, translateObject(o, dx, dy)]))
        setObjects(objs => objs.map(o => moved.get(o.id) ?? o))
        return
      }

      case 'marquee':
        if (Math.hypot(e.clientX - a.sx, e.clientY - a.sy) < dragPx()) return
        setMarquee({ a: a.start, b: w })
        return

      case 'rotateMulti': {
        let deg = (Math.atan2(w.y - a.cy, w.x - a.cx) * 180) / Math.PI - a.startAngle
        if (e.shiftKey) deg = Math.round(deg / 15) * 15
        const c = { x: a.cx, y: a.cy }
        const rotated = new Map(a.starts.map(o => [o.id, rotateObjectAround(o, c, deg)]))
        setObjects(objs => objs.map(o => rotated.get(o.id) ?? o))
        return
      }

      case 'resize': {
        const p = pick(e, null, a.id)
        updateObject(a.id, () => resizeObject(a.start, a.corner, p, !e.shiftKey))
        return
      }

      case 'vertex':
        updateObject(a.id, o => {
          if (o.type !== 'polyline') return o
          const ref = a.index > 0 ? o.points[a.index - 1] : o.points[1]
          const p = pick(e, ref, a.id)
          const last = o.points.length - 1
          const points = o.points.map((pt, i) =>
            i === a.index || (o.closed && ((a.index === 0 && i === last) || (a.index === last && i === 0))) ? p : pt,
          )
          return { ...o, points }
        })
        return

      case 'end':
        updateObject(a.id, o => {
          if (isEndpoint(o)) {
            const other = a.end === 'p1' ? { x: o.x2, y: o.y2 } : { x: o.x1, y: o.y1 }
            const p = pick(e, other, a.id)
            return a.end === 'p1' ? { ...o, x1: p.x, y1: p.y } : { ...o, x2: p.x, y2: p.y }
          }
          return o
        })
        return

      case 'leader':
        updateObject(a.id, o => (o.type === 'text' ? { ...o, leader: pick(e, undefined, a.id) } : o))
        return

      case 'leaderText': {
        // sposta solo il testo: la punta della freccia resta dov'è
        const p = pick(e, undefined, a.id)
        const dx = p.x - a.attach.x, dy = p.y - a.attach.y
        updateObject(a.id, o => (o.type === 'text' ? { ...o, x: a.ox + dx, y: a.oy + dy } : o))
        return
      }

      case 'rotate': {
        const angle = (Math.atan2(w.y - a.cy, w.x - a.cx) * 180) / Math.PI
        let rot = a.initial + angle - a.startAngle
        if (e.shiftKey) rot = Math.round(rot / 15) * 15
        rot = ((rot % 360) + 540) % 360 - 180
        updateObject(a.id, o => ({ ...o, rotation: rot }))
        return
      }
    }
  }

  const onMouseUp = (e: { clientX: number; clientY: number }) => {
    const a = action.current
    action.current = null
    if (!a) return
    if (a.kind === 'pan') setPanning(false)

    if (a.kind === 'marquee') {
      setMarquee(null)
      const dragged = Math.hypot(e.clientX - a.sx, e.clientY - a.sy) >= dragPx()
      if (!dragged) {
        // semplice clic: sull'oggetto bloccato lo seleziona, sul vuoto deseleziona
        if (a.clickId) setSelectedIds(expandGroups(objects, [a.clickId]))
        else if (!a.additive) setSelectedIds([])
        return
      }
      const end = toWorld(e)
      const box = {
        minX: Math.min(a.start.x, end.x), maxX: Math.max(a.start.x, end.x),
        minY: Math.min(a.start.y, end.y), maxY: Math.max(a.start.y, end.y),
      }
      // da sinistra a destra: solo oggetti interamente dentro; da destra a sinistra: anche quelli toccati
      const crossing = end.x < a.start.x
      const hits = objects.filter(o => {
        if (o.locked) return false
        const b = worldBounds(o)
        return crossing
          ? b.minX <= box.maxX && b.maxX >= box.minX && b.minY <= box.maxY && b.maxY >= box.minY
          : b.minX >= box.minX && b.maxX <= box.maxX && b.minY >= box.minY && b.maxY <= box.maxY
      }).map(o => o.id)
      const ids = expandGroups(objects, hits)
      setSelectedIds(a.additive ? [...new Set([...selectedIds, ...ids])] : ids)
      return
    }

    if (a.kind === 'segment' && segment) {
      const { p1, p2 } = segment
      const clickOnly = dist(p1, p2) < dragPx() / zoom
      // rettangolo: un semplice clic fissa il primo vertice, il secondo clic chiude
      if (tool === 'rect' && clickOnly) return
      setSegment(null)
      const fill = { fillEnabled: drawStyle.fillEnabled, fillColor: drawStyle.fillColor }
      if (tool === 'rect') {
        addRect(p1, p2)
        return
      }
      if (tool === 'circle') {
        addObject({ id: crypto.randomUUID(), type: 'circle', x: p1.x, y: p1.y, radius: clickOnly ? 40 : dist(p1, p2), ...strokeProps(), ...fill })
        return
      }
      if (clickOnly) return
      if (tool === 'line') {
        addObject({
          id: crypto.randomUUID(), type: 'polyline', points: [p1, p2], closed: false,
          ...strokeProps(), fillEnabled: false,
        })
      } else if (tool === 'arrow') {
        addObject({
          id: crypto.randomUUID(), type: 'arrow', x: 0, y: 0,
          x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, ...strokeProps(),
        })
      }
    }

    if (a.kind === 'freehand' && freehand) {
      const pr = pressures.current
      if (freehand.length > 2) {
        // spessore variabile solo se la penna ha dato una pressione reale
        const usePressure = !!pr && pr.length === freehand.length && pr.some(v => v > 0 && v !== 0.5)
        addObject({
          id: crypto.randomUUID(), type: 'polyline', points: freehand, closed: false,
          ...strokeProps(), fillEnabled: false,
          ...(usePressure ? { pressures: pr.map(round2) } : {}),
        })
      }
      pressures.current = null
      freehandPts.current = null
      setFreehand(null)
    }
  }

  // rilascio fuori dalla tela (o sopra la barra stili) mentre si traccia il riquadro
  const mouseUpRef = useRef(onMouseUp)
  mouseUpRef.current = onMouseUp
  useEffect(() => {
    const up = (e: PointerEvent) => { if (action.current?.kind === 'marquee') mouseUpRef.current(e) }
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [])

  /* ---------- rendering ---------- */

  const interactiveObjects = tool === 'select' || tool === 'wand'
  const cursor = panning ? 'grabbing' : spaceHeld ? 'grab' :
    tool === 'select' ? 'default' : tool === 'wand' ? 'crosshair' : isCreationTool(tool) || tool === 'crop' ? 'crosshair' : 'default'

  const k = 1 / zoom
  const draftStroke = { stroke: ACCENT, strokeWidth: 1.5 * k, strokeDasharray: `${5 * k} ${4 * k}`, fill: 'none', pointerEvents: 'none' as const }
  const visible = { x: view.x, y: view.y, w: size.w / zoom, h: size.h / zoom }

  // Griglia: linee minori + maggiori ogni 5 passi. Nascosta se troppo fitta.
  const minorPx = gridSize * zoom
  const showMinor = minorPx >= 8

  return (
    <>
      <svg
        ref={svgRef}
        className="canvas"
        width="100%"
        height="100%"
        // touch-action none: il browser non trasforma i tratti di penna e dita in scorrimenti o gesti
        style={{ cursor, display: 'block', background: 'white', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
        // in cattura: vale anche quando la pressione cade su un oggetto (che ferma la propagazione)
        onPointerDownCapture={notePointer}
        onPointerDown={onMouseDown}
        onPointerMove={onMouseMove}
        onPointerUp={onMouseUp}
        onPointerCancel={onMouseUp}
        // con lo strumento Testo il browser toglierebbe il focus all'editor appena aperto
        onMouseDown={e => { if (tool === 'text') e.preventDefault() }}
        onWheel={onWheel}
        onContextMenu={e => e.preventDefault()}
      >
        <defs>
          <pattern id="grid-minor" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#e2e8f0" strokeWidth={1 * k} />
          </pattern>
          <pattern id="grid-major" width={gridSize * 5} height={gridSize * 5} patternUnits="userSpaceOnUse">
            <path d={`M ${gridSize * 5} 0 L 0 0 0 ${gridSize * 5}`} fill="none" stroke="#cbd5e1" strokeWidth={1 * k} />
          </pattern>
          {objects.map(o =>
            o.type === 'image' && o.clipPoints && o.clipPoints.length > 2 ? (
              <clipPath id={`clip-${o.id}`} key={o.id} clipPathUnits="userSpaceOnUse">
                <polygon points={o.clipPoints.map(p => `${p.x + o.x},${p.y + o.y}`).join(' ')} />
              </clipPath>
            ) : null,
          )}
        </defs>

        <g transform={`scale(${zoom}) translate(${-view.x}, ${-view.y})`}>
          {showGrid && (
            <g id="grid-layer" pointerEvents="none">
              {showMinor && <rect x={visible.x} y={visible.y} width={visible.w} height={visible.h} fill="url(#grid-minor)" />}
              <rect x={visible.x} y={visible.y} width={visible.w} height={visible.h} fill="url(#grid-major)" />
            </g>
          )}

          {objects.map(o => (
            <ObjectView
              key={o.id}
              o={o}
              interactive={interactiveObjects}
              onMouseDown={onObjectMouseDown}
              onDoubleClick={onObjectDoubleClick}
              hideText={o.id === editingId}
              imageSrcOverride={wand?.id === o.id && wand.previewSrc ? wand.previewSrc : undefined}
            />
          ))}

          <g id="ui-layer">
            {selected && tool === 'select' && selected.id !== editingId && <SelectionOverlay o={selected} zoom={zoom} onGrip={onGrip} coarse={coarsePointer} />}
            {selectedObjs.length > 1 && tool === 'select' && (
              <MultiSelectionOverlay objs={selectedObjs} zoom={zoom} onRotateStart={onMultiRotate} coarse={coarsePointer} />
            )}
            {marquee && (() => {
              const crossing = marquee.b.x < marquee.a.x
              return (
                <rect
                  x={Math.min(marquee.a.x, marquee.b.x)} y={Math.min(marquee.a.y, marquee.b.y)}
                  width={Math.abs(marquee.b.x - marquee.a.x)} height={Math.abs(marquee.b.y - marquee.a.y)}
                  fill={crossing ? 'rgba(22, 163, 74, 0.08)' : 'rgba(99, 102, 241, 0.08)'}
                  stroke={crossing ? '#16a34a' : ACCENT} strokeWidth={1 * k}
                  strokeDasharray={crossing ? `${5 * k} ${3 * k}` : undefined}
                  pointerEvents="none"
                />
              )
            })()}

            {/* immagine in scontorno/bacchetta: evidenzia */}
            {selected && (tool === 'crop' || tool === 'wand' || (tool === 'scale' && scaleTargetId)) && (() => {
              const b = getObjectBounds(selected)
              return <rect x={b.x} y={b.y} width={b.w} height={b.h} {...draftStroke} />
            })()}

            {/* anteprima del profilo da inserire */}
            {tool === 'profile' && hover && (() => {
              const prof = findProfile(placeProfileCode)
              if (!prof) return null
              return (
                <g opacity={0.45} pointerEvents="none">
                  <ObjectView o={makeProfile(prof.code, prof.series, hover)} interactive={false} onMouseDown={() => {}} />
                </g>
              )
            })()}

            {/* anteprima del prossimo bollino */}
            {tool === 'bubble' && hover && (
              <g opacity={0.45} pointerEvents="none">
                <ObjectView o={makeBubble(nextBubbleNumber, hover)} interactive={false} onMouseDown={() => {}} />
              </g>
            )}

            {/* bozze */}
            {segment && tool === 'line' && (
              <line x1={segment.p1.x} y1={segment.p1.y} x2={segment.p2.x} y2={segment.p2.y}
                stroke={drawStyle.stroke} strokeWidth={drawStyle.strokeWidth}
                strokeDasharray={dashArray(drawStyle.strokeDash, drawStyle.strokeWidth)} pointerEvents="none" />
            )}
            {segment && tool === 'rect' && (
              <rect
                x={Math.min(segment.p1.x, segment.p2.x)} y={Math.min(segment.p1.y, segment.p2.y)}
                width={Math.abs(segment.p2.x - segment.p1.x)} height={Math.abs(segment.p2.y - segment.p1.y)}
                fill={drawStyle.fillEnabled ? drawStyle.fillColor : 'none'}
                stroke={drawStyle.stroke} strokeWidth={drawStyle.strokeWidth}
                strokeDasharray={dashArray(drawStyle.strokeDash, drawStyle.strokeWidth)} pointerEvents="none"
              />
            )}
            {segment && tool === 'circle' && (
              <circle
                cx={segment.p1.x} cy={segment.p1.y} r={dist(segment.p1, segment.p2)}
                fill={drawStyle.fillEnabled ? drawStyle.fillColor : 'none'}
                stroke={drawStyle.stroke} strokeWidth={drawStyle.strokeWidth}
                strokeDasharray={dashArray(drawStyle.strokeDash, drawStyle.strokeWidth)} pointerEvents="none"
              />
            )}
            {segment && tool === 'cable' && dist(segment.p1, segment.p2) > 0 && (
              <g opacity={0.55} pointerEvents="none">
                <ObjectView o={makeCable(segment.p1, segment.p2)} interactive={false} onMouseDown={() => {}} />
              </g>
            )}
            {segment && tool === 'deck' && dist(segment.p1, segment.p2) > 0 && (
              <g opacity={0.55} pointerEvents="none">
                <ObjectView o={makeDeck(segment.p1, segment.p2)} interactive={false} onMouseDown={() => {}} />
              </g>
            )}
            {segment && (tool === 'envelope' || tool === 'seam') && dist(segment.p1, segment.p2) > 0 && (
              <g opacity={0.55} pointerEvents="none">
                <ObjectView o={tool === 'envelope' ? makeEnvelope(segment.p1, segment.p2) : makeSeam(segment.p1, segment.p2)}
                  interactive={false} onMouseDown={() => {}} />
              </g>
            )}
            {segment && tool === 'weld' && dist(segment.p1, segment.p2) > 0 && (
              <g opacity={0.55} pointerEvents="none">
                <ObjectView o={makeWeld(segment.p1, segment.p2)} interactive={false} onMouseDown={() => {}} />
              </g>
            )}
            {segment && tool !== 'line' && tool !== 'rect' && tool !== 'circle' && tool !== 'weld' && (
              <g pointerEvents="none">
                <line x1={segment.p1.x} y1={segment.p1.y} x2={segment.p2.x} y2={segment.p2.y}
                  {...draftStroke} stroke={tool === 'measure' ? '#dc2626' : tool === 'scale' ? '#f59e0b' : ACCENT} />
                <circle cx={segment.p1.x} cy={segment.p1.y} r={3 * k} fill={ACCENT} />
                <text x={segment.p2.x + 10 * k} y={segment.p2.y - 10 * k} fontSize={12 * k} fill="#0f172a"
                  style={{ userSelect: 'none' }}>
                  {round1(dist(segment.p1, segment.p2))}
                </text>
              </g>
            )}
            {measure && (
              <g pointerEvents="none">
                <line x1={measure.p1.x} y1={measure.p1.y} x2={measure.p2.x} y2={measure.p2.y}
                  stroke="#dc2626" strokeWidth={1.5 * k} />
                <circle cx={measure.p1.x} cy={measure.p1.y} r={3 * k} fill="#dc2626" />
                <circle cx={measure.p2.x} cy={measure.p2.y} r={3 * k} fill="#dc2626" />
              </g>
            )}
            {polyPoints && (
              <g pointerEvents="none">
                <polyline
                  points={[...polyPoints, ...(hover ? [hover] : [])].map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none" stroke={drawStyle.stroke} strokeWidth={drawStyle.strokeWidth}
                  strokeDasharray={dashArray(drawStyle.strokeDash, drawStyle.strokeWidth)}
                />
                {polyPoints.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={(i === 0 ? 5 : 3) * k} fill="white" stroke={ACCENT} strokeWidth={1.5 * k} />
                ))}
              </g>
            )}
            {freehand && pressures.current && pressures.current.length === freehand.length ? (
              <PressureStroke points={freehand} pressures={pressures.current} width={drawStyle.strokeWidth} stroke={drawStyle.stroke} />
            ) : freehand && (
              <polyline
                points={freehand.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none" stroke={drawStyle.stroke} strokeWidth={drawStyle.strokeWidth}
                strokeDasharray={dashArray(drawStyle.strokeDash, drawStyle.strokeWidth)}
                strokeLinejoin="round" strokeLinecap="round" pointerEvents="none"
              />
            )}
            {cropPoints && selected?.type === 'image' && (
              <g transform={selected.rotation ? `rotate(${selected.rotation}, ${getObjectCenter(selected).x}, ${getObjectCenter(selected).y})` : undefined}>
                <polyline
                  points={cropPoints.map(p => `${p.x + selected.x},${p.y + selected.y}`).join(' ')}
                  {...draftStroke} stroke="#f59e0b"
                />
              </g>
            )}
          </g>
        </g>
      </svg>

      {wand && (
        <WandPanel
          state={wand}
          setState={setWand}
          onApply={() => {
            if (wand.previewSrc) updateObject(wand.id, o => ({ ...o, src: wand.previewSrc! }))
            setWand(null)
          }}
        />
      )}

      {editingId && (() => {
        const t = objects.find(o => o.id === editingId)
        if (!t || t.type !== 'text') return null
        return (
          <TextEditor
            o={t}
            zoom={zoom}
            view={view}
            onChange={text => updateObject(t.id, o => ({ ...o, text }))}
            onDone={finishEditing}
          />
        )
      })()}

      {measure && <MeasurePanel distance={dist(measure.p1, measure.p2)} onClose={() => setMeasure(null)} />}

      {scalePending && (
        <ScalePanel
          current={dist(scalePending.p1, scalePending.p2)}
          onApply={target => {
            const sf = target / dist(scalePending.p1, scalePending.p2)
            const targetId = scaleTargetId ?? selectedId
            if (targetId && isFinite(sf) && sf > 0) updateObject(targetId, o => scaleObject(o, scalePending.p1, sf))
            setScalePending(null)
            setTool('select')
          }}
          onCancel={() => setScalePending(null)}
        />
      )}
    </>
  )
}

/** Oggetto più in alto il cui ingombro contiene il punto (le immagini hanno la precedenza) */
function findTopObjectAt(objects: CanvasObject[], p: Point): CanvasObject | null {
  const inside = (o: CanvasObject) => {
    const q = rotatePoint(p, getObjectCenter(o), -(o.rotation || 0))
    const b = getObjectBounds(o)
    return q.x >= b.x && q.x <= b.x + b.w && q.y >= b.y && q.y <= b.y + b.h
  }
  const hits = [...objects].reverse().filter(inside)
  return hits.find(o => o.type === 'image') ?? hits[0] ?? null
}

/** Ridimensiona rettangolo/immagine/testo tenendo fisso l'angolo opposto */
function resizeObject(start: CanvasObject, corner: Corner, p: Point, keepRatio: boolean): CanvasObject {
  if (start.type !== 'rect' && start.type !== 'image' && start.type !== 'text') return start
  const b = getObjectBounds(start)
  const left = corner === 'tl' || corner === 'bl'
  const top = corner === 'tl' || corner === 'tr'
  const fx = left ? b.x + b.w : b.x
  const fy = top ? b.y + b.h : b.y
  let w = Math.max(5, left ? fx - p.x : p.x - fx)
  let h = Math.max(5, top ? fy - p.y : p.y - fy)
  // le immagini mantengono le proporzioni (Shift per deformare)
  if (keepRatio && start.type === 'image' && b.w > 0 && b.h > 0) {
    const ratio = b.w / b.h
    if (w / h > ratio) h = w / ratio
    else w = h * ratio
  }
  const x = left ? fx - w : fx
  const y = top ? fy - h : fy
  if (start.type === 'image') {
    const sx = w / b.w
    const sy = h / b.h
    return {
      ...start, x, y, width: w, height: h,
      clipPoints: start.clipPoints?.map(c => ({ x: c.x * sx, y: c.y * sy })),
    }
  }
  return { ...start, x, y, width: w, height: h }
}

