import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { getObjectBounds, getObjectCenter, rotatePoint, textSize, unionBounds, worldBounds } from './geometry';
import { round1 } from '../utils/mathUtils';
import { ttfSocket } from '../utils/cableUtils';
const ACCENT = '#6366f1';
/** Oltre questo numero di vertici (es. mano libera) non si mostrano le maniglie dei vertici */
const MAX_VERTEX_GRIPS = 40;
/** Riquadro di selezione e maniglie, con dimensioni costanti a schermo. */
export function SelectionOverlay({ o, zoom, onGrip }) {
    const k = 1 / zoom;
    const r = 5 * k;
    const center = getObjectCenter(o);
    const rotation = o.rotation || 0;
    const transform = rotation ? `rotate(${rotation}, ${center.x}, ${center.y})` : undefined;
    const grip = (key, cx, cy, g, cursor) => (_jsx("rect", { x: cx - r, y: cy - r, width: r * 2, height: r * 2, rx: 1.5 * k, fill: "white", stroke: ACCENT, strokeWidth: 1.5 * k, style: { cursor }, onMouseDown: e => { e.stopPropagation(); onGrip(e, g); } }, key));
    const locked = !!o.locked;
    const isEndpointType = o.type === 'arrow' || o.type === 'quote' || o.type === 'cable';
    const showVertices = !locked && o.type === 'polyline' && o.points.length <= MAX_VERTEX_GRIPS;
    const showBox = locked || (!isEndpointType && !showVertices);
    const b = getObjectBounds(o);
    const pad = 4 * k;
    let resizeBox = null;
    if (!locked && (o.type === 'rect' || o.type === 'image'))
        resizeBox = { x: o.x, y: o.y, w: o.width, h: o.height };
    if (!locked && o.type === 'text')
        resizeBox = { x: o.x, y: o.y, ...textSize(o) };
    // Lunghezza/dimensioni mostrate accanto alla selezione
    const parts = [];
    if (o.type === 'rect' || o.type === 'image')
        parts.push(`${round1(o.width)} × ${round1(o.height)}`);
    else if (o.type === 'circle')
        parts.push(`Ø ${round1(o.radius * 2)}`);
    else if (o.type === 'bolt')
        parts.push(`M${o.diameter}${o.cols * (o.view === 'section' ? 1 : o.rows) > 1 ? ` · ${o.cols}×${o.view === 'section' ? 1 : o.rows}` : ''}`);
    else if (o.type === 'cable')
        parts.push(`FLC ${o.size} · L ${round1(Math.hypot(o.x2 - o.x1, o.y2 - o.y1))}`);
    else if (o.type === 'arrow' || o.type === 'quote')
        parts.push(`${round1(Math.hypot(o.x2 - o.x1, o.y2 - o.y1))}`);
    if (rotation)
        parts.push(`${round1(rotation)}°`);
    const label = parts.join('  ·  ');
    // l'etichetta va sotto l'ingombro reale (anche se l'oggetto è ruotato)
    const labelY = Math.max(...[[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]]
        .map(([x, y]) => rotatePoint({ x, y }, center, rotation).y)) + 18 * k;
    const rotR = Math.max(b.w, b.h) / 2 + 28 * k;
    const hAngle = ((rotation - 90) * Math.PI) / 180;
    const canRotate = !isEndpointType && !locked;
    return (_jsxs("g", { children: [_jsxs("g", { transform: transform, children: [showBox && (_jsx("rect", { x: b.x - pad, y: b.y - pad, width: b.w + pad * 2, height: b.h + pad * 2, fill: "none", stroke: locked ? '#94a3b8' : ACCENT, strokeWidth: 1 * k, strokeDasharray: `${4 * k} ${3 * k}`, pointerEvents: "none" })), locked && (
                    // icona lucchetto nell'angolo in alto a destra
                    _jsxs("g", { transform: `translate(${b.x + b.w + pad}, ${b.y - pad}) scale(${k})`, pointerEvents: "none", children: [_jsx("circle", { r: 11, fill: "white", stroke: "#94a3b8", strokeWidth: 1 }), _jsx("rect", { x: -5, y: -1.5, width: 10, height: 7.5, rx: 1.5, fill: "#64748b" }), _jsx("path", { d: "M -3 -1.5 V -4 A 3 3 0 0 1 3 -4 V -1.5", fill: "none", stroke: "#64748b", strokeWidth: 1.6 })] })), resizeBox && ['tl', 'tr', 'bl', 'br'].map(c => grip(c, c === 'tl' || c === 'bl' ? resizeBox.x : resizeBox.x + resizeBox.w, c === 'tl' || c === 'tr' ? resizeBox.y : resizeBox.y + resizeBox.h, { kind: 'resize', corner: c }, c === 'tl' || c === 'br' ? 'nwse-resize' : 'nesw-resize')), showVertices && o.type === 'polyline' && o.points.map((p, i) => 
                    // nelle polilinee chiuse l'ultimo punto coincide col primo
                    o.closed && i === o.points.length - 1 && o.points.length > 1 ? null : grip(i, p.x, p.y, { kind: 'vertex', index: i }, 'move')), o.type === 'cable' && (() => {
                        // lettere A e B oltre le estremità, per riconoscerle nel pannello
                        const L = Math.hypot(o.x2 - o.x1, o.y2 - o.y1) || 1;
                        const ux = (o.x2 - o.x1) / L, uy = (o.y2 - o.y1) / L;
                        const C = ttfSocket(o.size).C;
                        const offA = (o.startSocket ? C : 0) + 16 * k;
                        const offB = (o.endSocket ? C : 0) + 16 * k;
                        return [['A', o.x1 - ux * offA, o.y1 - uy * offA, o.startSocket], ['B', o.x2 + ux * offB, o.y2 + uy * offB, o.endSocket]]
                            .map(([t, x, y, on]) => (_jsxs("g", { pointerEvents: "none", children: [_jsx("circle", { cx: x, cy: y, r: 9 * k, fill: on ? ACCENT : 'white', stroke: ACCENT, strokeWidth: 1.5 * k }), _jsx("text", { x: x, y: y, fontSize: 11 * k, fontWeight: "bold", fill: on ? 'white' : ACCENT, textAnchor: "middle", dominantBaseline: "central", style: { userSelect: 'none' }, children: t })] }, t)));
                    })(), !locked && isEndpointType && (_jsxs(_Fragment, { children: [grip('p1', o.x1, o.y1, { kind: 'end', end: 'p1' }, 'move'), grip('p2', o.x2, o.y2, { kind: 'end', end: 'p2' }, 'move')] }))] }), canRotate && (_jsxs("g", { children: [_jsx("line", { x1: center.x + (rotR - 22 * k) * Math.cos(hAngle), y1: center.y + (rotR - 22 * k) * Math.sin(hAngle), x2: center.x + rotR * Math.cos(hAngle), y2: center.y + rotR * Math.sin(hAngle), stroke: ACCENT, strokeOpacity: 0.35, strokeWidth: 1 * k, pointerEvents: "none" }), _jsx("circle", { cx: center.x + rotR * Math.cos(hAngle), cy: center.y + rotR * Math.sin(hAngle), r: 6 * k, fill: "white", stroke: ACCENT, strokeWidth: 2 * k, style: { cursor: 'grab' }, onMouseDown: e => { e.stopPropagation(); onGrip(e, { kind: 'rotate' }); }, children: _jsx("title", { children: "Ruota (Shift = passi di 15\u00B0)" }) })] })), label && (_jsx("text", { x: center.x, y: labelY, fontSize: 11 * k, fill: ACCENT, textAnchor: "middle", pointerEvents: "none", style: { userSelect: 'none' }, children: label }))] }));
}
/** Più oggetti selezionati: contorno di ciascuno, riquadro complessivo e maniglia di rotazione */
export function MultiSelectionOverlay({ objs, zoom, onRotateStart }) {
    const k = 1 / zoom;
    const u = unionBounds(objs);
    if (!u)
        return null;
    const pad = 6 * k;
    const c = { x: (u.minX + u.maxX) / 2, y: (u.minY + u.maxY) / 2 };
    const hy = u.minY - pad - 26 * k;
    const allLocked = objs.every(o => o.locked);
    return (_jsxs("g", { children: [objs.map(o => {
                const b = worldBounds(o);
                return (_jsx("rect", { x: b.minX, y: b.minY, width: b.maxX - b.minX, height: b.maxY - b.minY, fill: "none", stroke: o.locked ? '#94a3b8' : ACCENT, strokeOpacity: 0.55, strokeWidth: 1 * k, pointerEvents: "none" }, o.id));
            }), _jsx("rect", { x: u.minX - pad, y: u.minY - pad, width: u.maxX - u.minX + pad * 2, height: u.maxY - u.minY + pad * 2, fill: "none", stroke: ACCENT, strokeWidth: 1 * k, strokeDasharray: `${4 * k} ${3 * k}`, pointerEvents: "none" }), !allLocked && (_jsxs(_Fragment, { children: [_jsx("line", { x1: c.x, y1: u.minY - pad, x2: c.x, y2: hy, stroke: ACCENT, strokeOpacity: 0.35, strokeWidth: 1 * k, pointerEvents: "none" }), _jsx("circle", { cx: c.x, cy: hy, r: 6 * k, fill: "white", stroke: ACCENT, strokeWidth: 2 * k, style: { cursor: 'grab' }, onMouseDown: e => { e.stopPropagation(); onRotateStart(e, c); }, children: _jsx("title", { children: "Ruota la selezione (Shift = passi di 15\u00B0)" }) })] })), _jsxs("text", { x: c.x, y: u.maxY + pad + 16 * k, fontSize: 11 * k, fill: ACCENT, textAnchor: "middle", pointerEvents: "none", style: { userSelect: 'none' }, children: [objs.length, " oggetti"] })] }));
}
