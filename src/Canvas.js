import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TOOLS, isCreationTool } from './tools';
import { dashArray } from './style';
import { round1 } from './utils/mathUtils';
import { applyOrtho, dist, getObjectBounds, getObjectCenter, getSnapPoint, rotatePoint, scaleObject, translateObject, worldBounds, expandGroups, rotateObjectAround, } from './canvas/geometry';
import { ObjectView } from './canvas/ObjectView';
import { MultiSelectionOverlay, SelectionOverlay } from './canvas/SelectionOverlay';
import { WandPanel, MeasurePanel, ScalePanel } from './canvas/Overlays';
import { TextEditor } from './canvas/TextEditor';
import { findProfile } from './profiles';
import { DEFAULT_CABLE_SIZE } from './utils/cableUtils';
/** Distanze in pixel schermo (convertite in unità mondo dividendo per lo zoom) */
const SNAP_PX = 12;
const DRAG_THRESHOLD_PX = 3;
const ACCENT = '#6366f1';
export function Canvas({ objects, setObjects, selectedIds, setSelectedIds, view, setView, zoom, setZoom, gridSize, showGrid, snapEnabled, orthoEnabled, tool, setTool, drawStyle, onCursorMove, notify, placeProfileCode, nextBubbleNumber, onBubblePlaced, }) {
    const svgRef = useRef(null);
    const action = useRef(null);
    const [size, setSize] = useState({ w: 1200, h: 800 });
    // Bozze degli strumenti
    const [segment, setSegment] = useState(null);
    const [polyPoints, setPolyPoints] = useState(null);
    const [freehand, setFreehand] = useState(null);
    const [cropPoints, setCropPoints] = useState(null);
    const [hover, setHover] = useState(null);
    const [measure, setMeasure] = useState(null);
    const [scalePending, setScalePending] = useState(null);
    const [wand, setWand] = useState(null);
    /** Testo in modifica direttamente sulla tela */
    const [editingId, setEditingId] = useState(null);
    /** Oggetto da scalare con lo strumento "scala con due punti" */
    const [scaleTargetId, setScaleTargetId] = useState(null);
    /** Selezione singola (maniglie, strumenti immagine); con più oggetti è null */
    const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;
    const setSelectedId = (id) => setSelectedIds(id ? [id] : []);
    const selected = objects.find(o => o.id === selectedId) ?? null;
    const selectedObjs = selectedIds.length > 1 ? objects.filter(o => selectedIds.includes(o.id)) : [];
    /** Riquadro di selezione in corso */
    const [marquee, setMarquee] = useState(null);
    // Cambiando strumento si azzerano le bozze
    useEffect(() => {
        setSegment(null);
        setPolyPoints(null);
        setFreehand(null);
        setCropPoints(null);
        setMeasure(null);
        setScalePending(null);
        setScaleTargetId(null);
        setHover(null);
        if (tool !== 'wand')
            setWand(null);
    }, [tool]);
    // se il testo in modifica viene eliminato (es. annulla) chiude l'editor
    useEffect(() => {
        if (editingId && !objects.some(o => o.id === editingId))
            setEditingId(null);
    }, [objects, editingId]);
    useLayoutEffect(() => {
        const svg = svgRef.current;
        if (!svg)
            return;
        const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
        ro.observe(svg);
        return () => ro.disconnect();
    }, []);
    /* ---------- coordinate ---------- */
    const toWorld = (e) => {
        const rect = svgRef.current.getBoundingClientRect();
        return { x: (e.clientX - rect.left) / zoom + view.x, y: (e.clientY - rect.top) / zoom + view.y };
    };
    const snapOn = (e) => snapEnabled || e.ctrlKey || e.metaKey;
    const orthoOn = (e) => orthoEnabled || e.shiftKey;
    /** Punto mondo con snap e (opzionale) vincolo ortogonale rispetto a `ref` */
    const pick = (e, ref, excludeId) => {
        const w = toWorld(e);
        let p = snapOn(e) ? getSnapPoint(objects, w, gridSize, SNAP_PX / zoom, excludeId) : w;
        if (ref && orthoOn(e))
            p = applyOrtho(p, ref);
        return p;
    };
    const updateObject = (id, fn) => setObjects(objs => objs.map(o => (o.id === id ? fn(o) : o)));
    const addObject = (o) => {
        setObjects(prev => [...prev, o]);
        if (!TOOLS[tool].sticky) {
            setTool('select');
            setSelectedId(o.id);
        }
    };
    const makeBubble = (value, p) => ({
        id: crypto.randomUUID(), type: 'symbol', symbolType: 'bubble', x: p.x, y: p.y, value,
        stroke: drawStyle.stroke, strokeWidth: 2, fillEnabled: true, fillColor: '#fde047',
    });
    // un nuovo cavo riprende taglia e forcelle dell'ultimo cavo disegnato
    const makeCable = (p1, p2) => {
        const last = [...objects].reverse().find(o => o.type === 'cable');
        return {
            id: crypto.randomUUID(), type: 'cable', x: 0, y: 0, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
            size: last?.type === 'cable' ? last.size : DEFAULT_CABLE_SIZE,
            startSocket: last?.type === 'cable' ? last.startSocket : true,
            endSocket: last?.type === 'cable' ? last.endSocket : true,
            showLabel: true,
            stroke: drawStyle.stroke, strokeWidth: 1.5, fillEnabled: true, fillColor: '#cbd5e1',
        };
    };
    const makeProfile = (code, series, p) => ({
        id: crypto.randomUUID(), type: 'profile', profileType: series, profileName: code,
        x: p.x, y: p.y, scale: 1, viewType: 'front', length: 1000,
        stroke: drawStyle.stroke, strokeWidth: 1.5, fillEnabled: true, fillColor: '#94a3b8',
    });
    const strokeProps = () => ({
        stroke: drawStyle.stroke,
        strokeWidth: drawStyle.strokeWidth,
        strokeDash: drawStyle.strokeDash,
    });
    /* ---------- zoom ---------- */
    const onWheel = (e) => {
        const rect = svgRef.current.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const factor = Math.exp(-e.deltaY * 0.0015);
        const newZoom = Math.min(Math.max(zoom * factor, 0.05), 20);
        setZoom(newZoom);
        setView(v => ({ x: v.x + mx / zoom - mx / newZoom, y: v.y + my / zoom - my / newZoom }));
    };
    /* ---------- pressione sugli oggetti ---------- */
    const onObjectMouseDown = (e, o) => {
        if (e.button !== 0)
            return;
        e.stopPropagation();
        if (editingId && o.id !== editingId)
            finishEditing();
        if (tool === 'wand') {
            if (o.type === 'image')
                startWand(e, o);
            return;
        }
        // Alt+clic: solo l'oggetto, anche se fa parte di un gruppo
        const ids = e.altKey ? [o.id] : expandGroups(objects, [o.id]);
        // Ctrl+clic: aggiunge o toglie dalla selezione
        if (e.ctrlKey || e.metaKey) {
            const allIn = ids.every(id => selectedIds.includes(id));
            setSelectedIds(allIn ? selectedIds.filter(id => !ids.includes(id)) : [...new Set([...selectedIds, ...ids])]);
            return;
        }
        if (o.locked) {
            // oggetto bloccato (es. screenshot di sfondo): trascinando si traccia un riquadro, con un clic si seleziona
            action.current = { kind: 'marquee', sx: e.clientX, sy: e.clientY, start: toWorld(e), additive: false, clickId: o.id };
            return;
        }
        // clic su un oggetto già selezionato: si sposta tutta la selezione
        const sel = !e.altKey && selectedIds.includes(o.id) ? selectedIds : ids;
        if (sel !== selectedIds)
            setSelectedIds(sel);
        const starts = objects.filter(x => sel.includes(x.id) && !x.locked);
        action.current = {
            kind: 'move', ids: new Set(starts.map(x => x.id)), sx: e.clientX, sy: e.clientY,
            startWorld: toWorld(e), starts, moved: false,
        };
    };
    /** Rotazione di più oggetti attorno al centro della selezione */
    const onMultiRotate = (e, center) => {
        const w = toWorld(e);
        action.current = {
            kind: 'rotateMulti', cx: center.x, cy: center.y,
            startAngle: (Math.atan2(w.y - center.y, w.x - center.x) * 180) / Math.PI,
            starts: selectedObjs.filter(o => !o.locked),
        };
    };
    const startWand = (e, o) => {
        const local = rotatePoint(toWorld(e), getObjectCenter(o), -(o.rotation || 0));
        const lx = local.x - o.x;
        const ly = local.y - o.y;
        if (lx < 0 || ly < 0 || lx > o.width || ly > o.height)
            return;
        setSelectedId(o.id);
        const img = new Image();
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.width;
            c.height = img.height;
            const ctx = c.getContext('2d');
            if (!ctx)
                return;
            ctx.drawImage(img, 0, 0);
            const px = Math.floor((lx * img.width) / o.width);
            const py = Math.floor((ly * img.height) / o.height);
            const [r, g, b] = ctx.getImageData(px, py, 1, 1).data;
            setWand({
                id: o.id, originalSrc: o.src, targetColor: { r, g, b }, targetPixel: { x: px, y: py },
                threshold: wand?.threshold ?? 30, contiguous: wand?.contiguous ?? true, previewSrc: null,
            });
        };
        img.src = o.src;
    };
    /** Chiude l'editor del testo; un testo lasciato vuoto viene eliminato */
    const finishEditing = () => {
        if (!editingId)
            return;
        const t = objects.find(o => o.id === editingId);
        setEditingId(null);
        if (t?.type === 'text' && !t.text.trim()) {
            setObjects(objs => objs.filter(o => o.id !== t.id));
            setSelectedId(null);
        }
    };
    const onObjectDoubleClick = (o) => {
        if (tool === 'select' && o.type === 'text' && !o.locked)
            setEditingId(o.id);
    };
    const onGrip = (e, g) => {
        if (!selected || selected.locked)
            return;
        const id = selected.id;
        if (g.kind === 'resize')
            action.current = { kind: 'resize', id, corner: g.corner, start: selected };
        else if (g.kind === 'vertex')
            action.current = { kind: 'vertex', id, index: g.index };
        else if (g.kind === 'end')
            action.current = { kind: 'end', id, end: g.end };
        else {
            const c = getObjectCenter(selected);
            const w = toWorld(e);
            action.current = {
                kind: 'rotate', id, cx: c.x, cy: c.y,
                startAngle: (Math.atan2(w.y - c.y, w.x - c.x) * 180) / Math.PI,
                initial: selected.rotation || 0,
            };
        }
    };
    /* ---------- pressione sullo sfondo / strumenti ---------- */
    const onMouseDown = (e) => {
        if (editingId)
            finishEditing();
        // Tasto centrale: pan con qualsiasi strumento
        if (e.button === 1) {
            e.preventDefault();
            action.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
            return;
        }
        if (e.button !== 0)
            return;
        switch (tool) {
            case 'text': {
                // senza questo il browser, finito il clic, toglie il focus all'editor appena aperto
                e.preventDefault();
                const p = pick(e);
                const id = crypto.randomUUID();
                setObjects(prev => [...prev, {
                        id, type: 'text', x: p.x, y: p.y - 14, text: '', fontSize: 16, boxEnabled: false, boxPadding: 6,
                        stroke: drawStyle.stroke, textColor: drawStyle.stroke, strokeWidth: 1, fillEnabled: false, fillColor: '#ffffff',
                    }]);
                setTool('select');
                setSelectedId(id);
                setEditingId(id);
                return;
            }
            case 'bubble': {
                // resta attivo: ogni clic aggiunge il bollino successivo
                addObject(makeBubble(nextBubbleNumber, pick(e)));
                onBubblePlaced();
                return;
            }
            case 'profile': {
                const prof = findProfile(placeProfileCode);
                if (!prof) {
                    notify?.('Scegli prima un profilo nel catalogo');
                    return;
                }
                addObject(makeProfile(prof.code, prof.series, pick(e)));
                return;
            }
            case 'bolt': {
                // un clic = un bullone (snap su vertici/punti medi)
                const p = pick(e);
                addObject({
                    id: crypto.randomUUID(), type: 'bolt', x: p.x, y: p.y,
                    diameter: 20, grade: '8.8', view: 'head', grip: 20,
                    cols: 1, pitchX: 70, rows: 1, pitchY: 70, stroke: drawStyle.stroke, strokeWidth: 1,
                });
                return;
            }
            case 'line':
            case 'arrow':
            case 'rect':
            case 'circle': {
                const p = pick(e);
                setSegment({ p1: p, p2: p });
                action.current = { kind: 'segment' };
                return;
            }
            case 'freehand':
                setFreehand([toWorld(e)]);
                action.current = { kind: 'freehand' };
                return;
            case 'quote':
            case 'cable':
            case 'measure':
            case 'scale': {
                const p = pick(e, segment?.p1);
                if (tool === 'measure' && measure)
                    setMeasure(null);
                if (!segment && tool === 'scale') {
                    // bersaglio: oggetto selezionato, altrimenti l'immagine (o l'oggetto) sotto il primo clic
                    const hit = findTopObjectAt(objects, p);
                    const target = (hit?.type === 'image' ? hit : null) ?? selected ?? hit;
                    if (!target) {
                        notify?.('Fai clic su un\'immagine: nessun oggetto sotto il punto');
                        return;
                    }
                    setScaleTargetId(target.id);
                    setSelectedId(target.id);
                }
                if (!segment) {
                    setSegment({ p1: p, p2: p });
                    return;
                }
                finishClickSegment({ p1: segment.p1, p2: p });
                setSegment(null);
                return;
            }
            case 'polyline': {
                const last = polyPoints?.[polyPoints.length - 1];
                const p = pick(e, last);
                if (!polyPoints) {
                    setPolyPoints([p]);
                    return;
                }
                if (e.detail >= 2) {
                    finishPolyline(false);
                    return;
                }
                // clic sul primo punto: chiude la forma
                if (polyPoints.length >= 3 && dist(p, polyPoints[0]) < SNAP_PX / zoom) {
                    finishPolyline(true);
                    return;
                }
                setPolyPoints([...polyPoints, p]);
                return;
            }
            case 'crop': {
                if (!selected || selected.type !== 'image')
                    return;
                if (e.detail >= 2) {
                    applyCrop();
                    return;
                }
                const w = rotatePoint(pick(e), getObjectCenter(selected), -(selected.rotation || 0));
                setCropPoints(prev => [...(prev ?? []), { x: w.x - selected.x, y: w.y - selected.y }]);
                return;
            }
            case 'select':
                // trascinando si traccia il riquadro di selezione; un clic sul vuoto deseleziona
                action.current = { kind: 'marquee', sx: e.clientX, sy: e.clientY, start: toWorld(e), additive: e.ctrlKey || e.metaKey };
                return;
            default:
                return;
        }
    };
    const finishClickSegment = (s) => {
        if (dist(s.p1, s.p2) < 1)
            return;
        if (tool === 'quote') {
            addObject({
                id: crypto.randomUUID(), type: 'quote', x: 0, y: 0,
                x1: s.p1.x, y1: s.p1.y, x2: s.p2.x, y2: s.p2.y,
                stroke: drawStyle.stroke, textColor: drawStyle.stroke, strokeWidth: 1,
            });
        }
        else if (tool === 'cable') {
            addObject(makeCable(s.p1, s.p2));
        }
        else if (tool === 'measure') {
            setMeasure(s);
        }
        else if (tool === 'scale') {
            setScalePending(s);
        }
    };
    const finishPolyline = (closed) => {
        const pts = polyPoints ?? [];
        setPolyPoints(null);
        if (pts.length < 2)
            return;
        addObject({
            id: crypto.randomUUID(), type: 'polyline',
            points: closed ? [...pts, pts[0]] : pts, closed,
            ...strokeProps(),
            fillEnabled: closed && drawStyle.fillEnabled, fillColor: drawStyle.fillColor,
        });
    };
    const applyCrop = () => {
        if (selected?.type === 'image' && cropPoints && cropPoints.length > 2) {
            updateObject(selected.id, o => ({ ...o, clipPoints: cropPoints }));
        }
        setCropPoints(null);
        setTool('select');
    };
    // Invio termina polilinea/scontorno
    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== 'Enter')
                return;
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
                return;
            if (polyPoints)
                finishPolyline(false);
            else if (cropPoints)
                applyCrop();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });
    /* ---------- movimento ---------- */
    const onMouseMove = (e) => {
        const w = toWorld(e);
        onCursorMove?.(w);
        const a = action.current;
        // Anteprime degli strumenti a clic
        if (!a) {
            if (segment && (tool === 'quote' || tool === 'cable' || tool === 'measure' || tool === 'scale')) {
                setSegment({ ...segment, p2: pick(e, segment.p1) });
            }
            else if (tool === 'profile' || tool === 'bubble') {
                setHover(pick(e));
            }
            else if (polyPoints) {
                setHover(pick(e, polyPoints[polyPoints.length - 1]));
            }
            else if (cropPoints) {
                setHover(pick(e));
            }
            return;
        }
        switch (a.kind) {
            case 'pan':
                setView({ x: a.vx - (e.clientX - a.sx) / zoom, y: a.vy - (e.clientY - a.sy) / zoom });
                return;
            case 'segment':
                setSegment(s => {
                    if (!s)
                        return s;
                    if (tool === 'rect' || tool === 'circle') {
                        let p = pick(e);
                        if (tool === 'rect' && e.shiftKey) {
                            const d = Math.max(Math.abs(p.x - s.p1.x), Math.abs(p.y - s.p1.y));
                            p = { x: s.p1.x + Math.sign(p.x - s.p1.x || 1) * d, y: s.p1.y + Math.sign(p.y - s.p1.y || 1) * d };
                        }
                        return { ...s, p2: p };
                    }
                    return { ...s, p2: pick(e, s.p1) };
                });
                return;
            case 'freehand':
                setFreehand(prev => {
                    if (!prev)
                        return prev;
                    return dist(prev[prev.length - 1], w) > 1.5 / zoom ? [...prev, w] : prev;
                });
                return;
            case 'move': {
                if (!a.moved && Math.hypot(e.clientX - a.sx, e.clientY - a.sy) < DRAG_THRESHOLD_PX)
                    return;
                a.moved = true;
                // si aggancia il punto di presa, poi si traslano gli oggetti della stessa quantità
                const snapped = snapOn(e) ? getSnapPoint(objects, w, gridSize, SNAP_PX / zoom, a.ids) : w;
                let dx = snapped.x - a.startWorld.x;
                let dy = snapped.y - a.startWorld.y;
                if (orthoOn(e)) {
                    if (Math.abs(dx) > Math.abs(dy))
                        dy = 0;
                    else
                        dx = 0;
                }
                const moved = new Map(a.starts.map(o => [o.id, translateObject(o, dx, dy)]));
                setObjects(objs => objs.map(o => moved.get(o.id) ?? o));
                return;
            }
            case 'marquee':
                if (Math.hypot(e.clientX - a.sx, e.clientY - a.sy) < DRAG_THRESHOLD_PX)
                    return;
                setMarquee({ a: a.start, b: w });
                return;
            case 'rotateMulti': {
                let deg = (Math.atan2(w.y - a.cy, w.x - a.cx) * 180) / Math.PI - a.startAngle;
                if (e.shiftKey)
                    deg = Math.round(deg / 15) * 15;
                const c = { x: a.cx, y: a.cy };
                const rotated = new Map(a.starts.map(o => [o.id, rotateObjectAround(o, c, deg)]));
                setObjects(objs => objs.map(o => rotated.get(o.id) ?? o));
                return;
            }
            case 'resize': {
                const p = pick(e, null, a.id);
                updateObject(a.id, () => resizeObject(a.start, a.corner, p, !e.shiftKey));
                return;
            }
            case 'vertex':
                updateObject(a.id, o => {
                    if (o.type !== 'polyline')
                        return o;
                    const ref = a.index > 0 ? o.points[a.index - 1] : o.points[1];
                    const p = pick(e, ref, a.id);
                    const last = o.points.length - 1;
                    const points = o.points.map((pt, i) => i === a.index || (o.closed && ((a.index === 0 && i === last) || (a.index === last && i === 0))) ? p : pt);
                    return { ...o, points };
                });
                return;
            case 'end':
                updateObject(a.id, o => {
                    if (o.type === 'arrow' || o.type === 'quote' || o.type === 'cable') {
                        const other = a.end === 'p1' ? { x: o.x2, y: o.y2 } : { x: o.x1, y: o.y1 };
                        const p = pick(e, other, a.id);
                        return a.end === 'p1' ? { ...o, x1: p.x, y1: p.y } : { ...o, x2: p.x, y2: p.y };
                    }
                    return o;
                });
                return;
            case 'rotate': {
                const angle = (Math.atan2(w.y - a.cy, w.x - a.cx) * 180) / Math.PI;
                let rot = a.initial + angle - a.startAngle;
                if (e.shiftKey)
                    rot = Math.round(rot / 15) * 15;
                rot = ((rot % 360) + 540) % 360 - 180;
                updateObject(a.id, o => ({ ...o, rotation: rot }));
                return;
            }
        }
    };
    const onMouseUp = (e) => {
        const a = action.current;
        action.current = null;
        if (!a)
            return;
        if (a.kind === 'marquee') {
            setMarquee(null);
            const dragged = Math.hypot(e.clientX - a.sx, e.clientY - a.sy) >= DRAG_THRESHOLD_PX;
            if (!dragged) {
                // semplice clic: sull'oggetto bloccato lo seleziona, sul vuoto deseleziona
                if (a.clickId)
                    setSelectedIds(expandGroups(objects, [a.clickId]));
                else if (!a.additive)
                    setSelectedIds([]);
                return;
            }
            const end = toWorld(e);
            const box = {
                minX: Math.min(a.start.x, end.x), maxX: Math.max(a.start.x, end.x),
                minY: Math.min(a.start.y, end.y), maxY: Math.max(a.start.y, end.y),
            };
            // da sinistra a destra: solo oggetti interamente dentro; da destra a sinistra: anche quelli toccati
            const crossing = end.x < a.start.x;
            const hits = objects.filter(o => {
                if (o.locked)
                    return false;
                const b = worldBounds(o);
                return crossing
                    ? b.minX <= box.maxX && b.maxX >= box.minX && b.minY <= box.maxY && b.maxY >= box.minY
                    : b.minX >= box.minX && b.maxX <= box.maxX && b.minY >= box.minY && b.maxY <= box.maxY;
            }).map(o => o.id);
            const ids = expandGroups(objects, hits);
            setSelectedIds(a.additive ? [...new Set([...selectedIds, ...ids])] : ids);
            return;
        }
        if (a.kind === 'segment' && segment) {
            const { p1, p2 } = segment;
            setSegment(null);
            const fill = { fillEnabled: drawStyle.fillEnabled, fillColor: drawStyle.fillColor };
            const clickOnly = dist(p1, p2) < 3 / zoom;
            if (tool === 'rect') {
                const r = clickOnly
                    ? { x: p1.x - 60, y: p1.y - 40, width: 120, height: 80 }
                    : { x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y), width: Math.abs(p2.x - p1.x), height: Math.abs(p2.y - p1.y) };
                addObject({ id: crypto.randomUUID(), type: 'rect', ...r, ...strokeProps(), ...fill });
                return;
            }
            if (tool === 'circle') {
                addObject({ id: crypto.randomUUID(), type: 'circle', x: p1.x, y: p1.y, radius: clickOnly ? 40 : dist(p1, p2), ...strokeProps(), ...fill });
                return;
            }
            if (clickOnly)
                return;
            if (tool === 'line') {
                addObject({
                    id: crypto.randomUUID(), type: 'polyline', points: [p1, p2], closed: false,
                    ...strokeProps(), fillEnabled: false,
                });
            }
            else if (tool === 'arrow') {
                addObject({
                    id: crypto.randomUUID(), type: 'arrow', x: 0, y: 0,
                    x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, ...strokeProps(),
                });
            }
        }
        if (a.kind === 'freehand' && freehand) {
            if (freehand.length > 2) {
                addObject({
                    id: crypto.randomUUID(), type: 'polyline', points: freehand, closed: false,
                    ...strokeProps(), fillEnabled: false,
                });
            }
            setFreehand(null);
        }
    };
    // rilascio fuori dalla tela (o sopra la barra stili) mentre si traccia il riquadro
    const mouseUpRef = useRef(onMouseUp);
    mouseUpRef.current = onMouseUp;
    useEffect(() => {
        const up = (e) => { if (action.current?.kind === 'marquee')
            mouseUpRef.current(e); };
        window.addEventListener('mouseup', up);
        return () => window.removeEventListener('mouseup', up);
    }, []);
    /* ---------- rendering ---------- */
    const interactiveObjects = tool === 'select' || tool === 'wand';
    const cursor = tool === 'select' ? 'default' : tool === 'wand' ? 'crosshair' : isCreationTool(tool) || tool === 'crop' ? 'crosshair' : 'default';
    const k = 1 / zoom;
    const draftStroke = { stroke: ACCENT, strokeWidth: 1.5 * k, strokeDasharray: `${5 * k} ${4 * k}`, fill: 'none', pointerEvents: 'none' };
    const visible = { x: view.x, y: view.y, w: size.w / zoom, h: size.h / zoom };
    // Griglia: linee minori + maggiori ogni 5 passi. Nascosta se troppo fitta.
    const minorPx = gridSize * zoom;
    const showMinor = minorPx >= 8;
    return (_jsxs(_Fragment, { children: [_jsxs("svg", { ref: svgRef, className: "canvas", width: "100%", height: "100%", style: { cursor, display: 'block', background: 'white' }, onMouseDown: onMouseDown, onMouseMove: onMouseMove, onMouseUp: onMouseUp, onMouseLeave: e => { if (action.current?.kind !== 'marquee')
                    onMouseUp(e); }, onWheel: onWheel, onContextMenu: e => e.preventDefault(), children: [_jsxs("defs", { children: [_jsx("pattern", { id: "grid-minor", width: gridSize, height: gridSize, patternUnits: "userSpaceOnUse", children: _jsx("path", { d: `M ${gridSize} 0 L 0 0 0 ${gridSize}`, fill: "none", stroke: "#e2e8f0", strokeWidth: 1 * k }) }), _jsx("pattern", { id: "grid-major", width: gridSize * 5, height: gridSize * 5, patternUnits: "userSpaceOnUse", children: _jsx("path", { d: `M ${gridSize * 5} 0 L 0 0 0 ${gridSize * 5}`, fill: "none", stroke: "#cbd5e1", strokeWidth: 1 * k }) }), objects.map(o => o.type === 'image' && o.clipPoints && o.clipPoints.length > 2 ? (_jsx("clipPath", { id: `clip-${o.id}`, clipPathUnits: "userSpaceOnUse", children: _jsx("polygon", { points: o.clipPoints.map(p => `${p.x + o.x},${p.y + o.y}`).join(' ') }) }, o.id)) : null)] }), _jsxs("g", { transform: `scale(${zoom}) translate(${-view.x}, ${-view.y})`, children: [showGrid && (_jsxs("g", { id: "grid-layer", pointerEvents: "none", children: [showMinor && _jsx("rect", { x: visible.x, y: visible.y, width: visible.w, height: visible.h, fill: "url(#grid-minor)" }), _jsx("rect", { x: visible.x, y: visible.y, width: visible.w, height: visible.h, fill: "url(#grid-major)" })] })), objects.map(o => (_jsx(ObjectView, { o: o, interactive: interactiveObjects, onMouseDown: onObjectMouseDown, onDoubleClick: onObjectDoubleClick, hideText: o.id === editingId, imageSrcOverride: wand?.id === o.id && wand.previewSrc ? wand.previewSrc : undefined }, o.id))), _jsxs("g", { id: "ui-layer", children: [selected && tool === 'select' && selected.id !== editingId && _jsx(SelectionOverlay, { o: selected, zoom: zoom, onGrip: onGrip }), selectedObjs.length > 1 && tool === 'select' && (_jsx(MultiSelectionOverlay, { objs: selectedObjs, zoom: zoom, onRotateStart: onMultiRotate })), marquee && (() => {
                                        const crossing = marquee.b.x < marquee.a.x;
                                        return (_jsx("rect", { x: Math.min(marquee.a.x, marquee.b.x), y: Math.min(marquee.a.y, marquee.b.y), width: Math.abs(marquee.b.x - marquee.a.x), height: Math.abs(marquee.b.y - marquee.a.y), fill: crossing ? 'rgba(22, 163, 74, 0.08)' : 'rgba(99, 102, 241, 0.08)', stroke: crossing ? '#16a34a' : ACCENT, strokeWidth: 1 * k, strokeDasharray: crossing ? `${5 * k} ${3 * k}` : undefined, pointerEvents: "none" }));
                                    })(), selected && (tool === 'crop' || tool === 'wand' || (tool === 'scale' && scaleTargetId)) && (() => {
                                        const b = getObjectBounds(selected);
                                        return _jsx("rect", { x: b.x, y: b.y, width: b.w, height: b.h, ...draftStroke });
                                    })(), tool === 'profile' && hover && (() => {
                                        const prof = findProfile(placeProfileCode);
                                        if (!prof)
                                            return null;
                                        return (_jsx("g", { opacity: 0.45, pointerEvents: "none", children: _jsx(ObjectView, { o: makeProfile(prof.code, prof.series, hover), interactive: false, onMouseDown: () => { } }) }));
                                    })(), tool === 'bubble' && hover && (_jsx("g", { opacity: 0.45, pointerEvents: "none", children: _jsx(ObjectView, { o: makeBubble(nextBubbleNumber, hover), interactive: false, onMouseDown: () => { } }) })), segment && tool === 'line' && (_jsx("line", { x1: segment.p1.x, y1: segment.p1.y, x2: segment.p2.x, y2: segment.p2.y, stroke: drawStyle.stroke, strokeWidth: drawStyle.strokeWidth, strokeDasharray: dashArray(drawStyle.strokeDash, drawStyle.strokeWidth), pointerEvents: "none" })), segment && tool === 'rect' && (_jsx("rect", { x: Math.min(segment.p1.x, segment.p2.x), y: Math.min(segment.p1.y, segment.p2.y), width: Math.abs(segment.p2.x - segment.p1.x), height: Math.abs(segment.p2.y - segment.p1.y), fill: drawStyle.fillEnabled ? drawStyle.fillColor : 'none', stroke: drawStyle.stroke, strokeWidth: drawStyle.strokeWidth, strokeDasharray: dashArray(drawStyle.strokeDash, drawStyle.strokeWidth), pointerEvents: "none" })), segment && tool === 'circle' && (_jsx("circle", { cx: segment.p1.x, cy: segment.p1.y, r: dist(segment.p1, segment.p2), fill: drawStyle.fillEnabled ? drawStyle.fillColor : 'none', stroke: drawStyle.stroke, strokeWidth: drawStyle.strokeWidth, strokeDasharray: dashArray(drawStyle.strokeDash, drawStyle.strokeWidth), pointerEvents: "none" })), segment && tool === 'cable' && dist(segment.p1, segment.p2) > 0 && (_jsx("g", { opacity: 0.55, pointerEvents: "none", children: _jsx(ObjectView, { o: makeCable(segment.p1, segment.p2), interactive: false, onMouseDown: () => { } }) })), segment && tool !== 'line' && tool !== 'rect' && tool !== 'circle' && (_jsxs("g", { pointerEvents: "none", children: [_jsx("line", { x1: segment.p1.x, y1: segment.p1.y, x2: segment.p2.x, y2: segment.p2.y, ...draftStroke, stroke: tool === 'measure' ? '#dc2626' : tool === 'scale' ? '#f59e0b' : ACCENT }), _jsx("circle", { cx: segment.p1.x, cy: segment.p1.y, r: 3 * k, fill: ACCENT }), _jsx("text", { x: segment.p2.x + 10 * k, y: segment.p2.y - 10 * k, fontSize: 12 * k, fill: "#0f172a", style: { userSelect: 'none' }, children: round1(dist(segment.p1, segment.p2)) })] })), measure && (_jsxs("g", { pointerEvents: "none", children: [_jsx("line", { x1: measure.p1.x, y1: measure.p1.y, x2: measure.p2.x, y2: measure.p2.y, stroke: "#dc2626", strokeWidth: 1.5 * k }), _jsx("circle", { cx: measure.p1.x, cy: measure.p1.y, r: 3 * k, fill: "#dc2626" }), _jsx("circle", { cx: measure.p2.x, cy: measure.p2.y, r: 3 * k, fill: "#dc2626" })] })), polyPoints && (_jsxs("g", { pointerEvents: "none", children: [_jsx("polyline", { points: [...polyPoints, ...(hover ? [hover] : [])].map(p => `${p.x},${p.y}`).join(' '), fill: "none", stroke: drawStyle.stroke, strokeWidth: drawStyle.strokeWidth, strokeDasharray: dashArray(drawStyle.strokeDash, drawStyle.strokeWidth) }), polyPoints.map((p, i) => (_jsx("circle", { cx: p.x, cy: p.y, r: (i === 0 ? 5 : 3) * k, fill: "white", stroke: ACCENT, strokeWidth: 1.5 * k }, i)))] })), freehand && (_jsx("polyline", { points: freehand.map(p => `${p.x},${p.y}`).join(' '), fill: "none", stroke: drawStyle.stroke, strokeWidth: drawStyle.strokeWidth, strokeDasharray: dashArray(drawStyle.strokeDash, drawStyle.strokeWidth), strokeLinejoin: "round", strokeLinecap: "round", pointerEvents: "none" })), cropPoints && selected?.type === 'image' && (_jsx("g", { transform: selected.rotation ? `rotate(${selected.rotation}, ${getObjectCenter(selected).x}, ${getObjectCenter(selected).y})` : undefined, children: _jsx("polyline", { points: cropPoints.map(p => `${p.x + selected.x},${p.y + selected.y}`).join(' '), ...draftStroke, stroke: "#f59e0b" }) }))] })] })] }), wand && (_jsx(WandPanel, { state: wand, setState: setWand, onApply: () => {
                    if (wand.previewSrc)
                        updateObject(wand.id, o => ({ ...o, src: wand.previewSrc }));
                    setWand(null);
                } })), editingId && (() => {
                const t = objects.find(o => o.id === editingId);
                if (!t || t.type !== 'text')
                    return null;
                return (_jsx(TextEditor, { o: t, zoom: zoom, view: view, onChange: text => updateObject(t.id, o => ({ ...o, text })), onDone: finishEditing }));
            })(), measure && _jsx(MeasurePanel, { distance: dist(measure.p1, measure.p2), onClose: () => setMeasure(null) }), scalePending && (_jsx(ScalePanel, { current: dist(scalePending.p1, scalePending.p2), onApply: target => {
                    const sf = target / dist(scalePending.p1, scalePending.p2);
                    const targetId = scaleTargetId ?? selectedId;
                    if (targetId && isFinite(sf) && sf > 0)
                        updateObject(targetId, o => scaleObject(o, scalePending.p1, sf));
                    setScalePending(null);
                    setTool('select');
                }, onCancel: () => setScalePending(null) }))] }));
}
/** Oggetto più in alto il cui ingombro contiene il punto (le immagini hanno la precedenza) */
function findTopObjectAt(objects, p) {
    const inside = (o) => {
        const q = rotatePoint(p, getObjectCenter(o), -(o.rotation || 0));
        const b = getObjectBounds(o);
        return q.x >= b.x && q.x <= b.x + b.w && q.y >= b.y && q.y <= b.y + b.h;
    };
    const hits = [...objects].reverse().filter(inside);
    return hits.find(o => o.type === 'image') ?? hits[0] ?? null;
}
/** Ridimensiona rettangolo/immagine/testo tenendo fisso l'angolo opposto */
function resizeObject(start, corner, p, keepRatio) {
    if (start.type !== 'rect' && start.type !== 'image' && start.type !== 'text')
        return start;
    const b = getObjectBounds(start);
    const left = corner === 'tl' || corner === 'bl';
    const top = corner === 'tl' || corner === 'tr';
    const fx = left ? b.x + b.w : b.x;
    const fy = top ? b.y + b.h : b.y;
    let w = Math.max(5, left ? fx - p.x : p.x - fx);
    let h = Math.max(5, top ? fy - p.y : p.y - fy);
    // le immagini mantengono le proporzioni (Shift per deformare)
    if (keepRatio && start.type === 'image' && b.w > 0 && b.h > 0) {
        const ratio = b.w / b.h;
        if (w / h > ratio)
            h = w / ratio;
        else
            w = h * ratio;
    }
    const x = left ? fx - w : fx;
    const y = top ? fy - h : fy;
    if (start.type === 'image') {
        const sx = w / b.w;
        const sy = h / b.h;
        return {
            ...start, x, y, width: w, height: h,
            clipPoints: start.clipPoints?.map(c => ({ x: c.x * sx, y: c.y * sy })),
        };
    }
    return { ...start, x, y, width: w, height: h };
}
