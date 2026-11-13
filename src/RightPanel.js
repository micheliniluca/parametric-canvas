import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Catalog } from './components/Catalog';
import { findProfile, profilesOfSeries, seriesByShape, useCatalog } from './profiles';
import { BOLT_DIAMETERS, BOLT_GRADES, boltDims, boltLabel, boltLength } from './utils/boltUtils';
import { FLC_SIZES, cableLabel, cableMass, cableNRd, cableSpan, flcRope, ropeLength, socketCount, ttfSocket, } from './utils/cableUtils';
import { exportToDXF, exportToSTL, exportToSVG } from './utils/export';
import { downloadText } from './utils/project';
import { round1 } from './utils/mathUtils';
import { Database, Download, SlidersHorizontal, MousePointerClick, AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal, AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter, } from 'lucide-react';
const TYPE_LABEL = {
    rect: 'Rettangolo', circle: 'Cerchio', text: 'Testo', profile: 'Profilo', image: 'Immagine',
    symbol: 'Bollino', arrow: 'Freccia', bolt: 'Bullone', quote: 'Quota', polyline: 'Linea', cable: 'Cavo FLC',
};
const Field = ({ label, children, full }) => (_jsxs("label", { className: `prop-field ${full ? 'full-width' : ''}`, children: [_jsx("span", { children: label }), children] }));
/**
 * Campo numerico: mentre si scrive mostra esattamente quello che si digita
 * (es. "1" verso "10") e aggiorna l'oggetto solo con valori validi;
 * il minimo viene applicato quando si esce dal campo o si preme Invio.
 */
function Num({ value, onChange, min, step }) {
    const [draft, setDraft] = useState(null);
    const commit = () => {
        if (draft === null)
            return;
        const v = parseFloat(draft.replace(',', '.'));
        if (!isNaN(v))
            onChange(min !== undefined ? Math.max(min, v) : v);
        setDraft(null);
    };
    return (_jsx("input", { type: "text", inputMode: "decimal", step: step, value: draft ?? String(round1(value)), onFocus: e => e.target.select(), onChange: e => {
            setDraft(e.target.value);
            const v = parseFloat(e.target.value.replace(',', '.'));
            // anteprima immediata solo se il valore è già valido
            if (!isNaN(v) && (min === undefined || v >= min))
                onChange(v);
        }, onBlur: commit, onKeyDown: e => {
            if (e.key === 'Enter')
                commit();
            if (e.key === 'Escape')
                setDraft(null);
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                const d = (step ?? 1) * (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1);
                const next = round1(value + d);
                onChange(min !== undefined ? Math.max(min, next) : next);
                setDraft(null);
            }
        } }));
}
/** Pannello laterale: proprietà dell'oggetto selezionato, catalogo profili ed esportazione */
export function RightPanel({ selected, objects, onChange, screenshotMode, setScreenshotMode, onScreenshot, tab, setTab, placingProfileCode, onPickProfile, selectedObjs, onAlign, onGroup, onUngroup, }) {
    const placing = placingProfileCode ? findProfile(placingProfileCode) : undefined;
    const handleExport = (format) => {
        if (format === 'svg')
            downloadText(exportToSVG(objects), 'disegno.svg', 'image/svg+xml');
        if (format === 'dxf')
            downloadText(exportToDXF(objects), 'disegno.dxf', 'application/dxf');
        if (format === 'stl')
            downloadText(exportToSTL(objects), 'disegno.stl', 'model/stl');
    };
    return (_jsxs("div", { className: "right-panel", children: [_jsxs("div", { className: "rp-tabs", children: [_jsxs("button", { className: tab === 'props' ? 'active' : '', onClick: () => setTab('props'), children: [_jsx(SlidersHorizontal, { size: 15 }), " Propriet\u00E0"] }), _jsxs("button", { className: tab === 'catalog' ? 'active' : '', onClick: () => setTab('catalog'), children: [_jsx(Database, { size: 15 }), " Profili"] }), _jsxs("button", { className: tab === 'export' ? 'active' : '', onClick: () => setTab('export'), children: [_jsx(Download, { size: 15 }), " Esporta"] })] }), _jsxs("div", { className: "rp-content", children: [tab === 'catalog' && (_jsxs(_Fragment, { children: [placing && (_jsxs("div", { className: "placing-banner", children: ["Clic sulla tela per inserire ", _jsx("b", { children: placing.name }), _jsx("span", { children: "Esc per annullare" })] })), selected?.type === 'profile' && !placing && (_jsxs("div", { className: "placing-banner", children: ["La scelta sostituisce il profilo selezionato", _jsx("span", { children: "Esc per deselezionare e inserirne uno nuovo" })] })), _jsx(Catalog, { current: selected?.type === 'profile' ? findProfile(selected.profileName) : placing, onSelect: profile => {
                                    // con un profilo selezionato la scelta lo sostituisce; altrimenti si inserisce con un clic sulla tela
                                    if (selected?.type === 'profile')
                                        onChange({ profileType: profile.series, profileName: profile.code });
                                    else
                                        onPickProfile(profile.code);
                                } })] })), tab === 'export' && (_jsxs("div", { className: "export-panel", children: [_jsxs("section", { children: [_jsx("h4", { children: "Screenshot negli appunti" }), _jsx("div", { className: "segmented", children: ['white', 'grid', 'transparent'].map(m => (_jsx("button", { className: screenshotMode === m ? 'active' : '', onClick: () => setScreenshotMode(m), children: m === 'white' ? 'Bianco' : m === 'grid' ? 'Con griglia' : 'Trasparente' }, m))) }), _jsx("button", { className: "btn-primary wide", onClick: onScreenshot, children: "Copia screenshot" })] }), _jsxs("section", { children: [_jsx("h4", { children: "File" }), _jsx("p", { className: "muted", children: "DXF e SVG sono adatti al taglio laser e all'importazione in CAD." }), _jsx("button", { className: "btn-secondary wide", onClick: () => handleExport('svg'), children: "Esporta SVG" }), _jsx("button", { className: "btn-secondary wide", onClick: () => handleExport('dxf'), children: "Esporta DXF (2D)" }), _jsx("button", { className: "btn-secondary wide", onClick: () => handleExport('stl'), children: "Esporta STL (3D)" })] })] })), tab === 'props' && selectedObjs.length > 1 && (_jsx(MultiProps, { objs: selectedObjs, onAlign: onAlign, onGroup: onGroup, onUngroup: onUngroup })), tab === 'props' && selectedObjs.length === 0 && (_jsxs("div", { className: "no-selection", children: [_jsx(MousePointerClick, { size: 40, strokeWidth: 1.25 }), _jsx("p", { children: "Seleziona un oggetto per modificarne le propriet\u00E0." }), _jsx("p", { className: "muted", children: "Colori e stili sono nella barra sopra il disegno." })] })), tab === 'props' && selected && _jsx(ObjectProps, { o: selected, onChange: onChange })] })] }));
}
/** Identificazione del profilo: nome, codici e peso, copiabili con un clic */
function ProfileHeader({ code, length }) {
    useCatalog();
    const p = findProfile(code);
    if (!p)
        return _jsxs("p", { className: "muted", children: ["Profilo \"", code, "\" non trovato nel catalogo."] });
    const copy = (t) => { navigator.clipboard?.writeText(t).catch(() => { }); };
    return (_jsxs("div", { className: "profile-id", children: [_jsx("div", { className: "profile-id-name", children: p.name }), _jsxs("button", { type: "button", className: "code-chip", title: "Copia codice Maffeis", onClick: () => copy(p.code), children: [_jsx("span", { children: "Maffeis" }), p.code] }), _jsxs("button", { type: "button", className: "code-chip", title: "Copia nome Tekla", onClick: () => copy(p.tekla), children: [_jsx("span", { children: "Tekla" }), p.tekla] }), _jsxs("div", { className: "muted", children: [p.h, " \u00D7 ", p.b, " \u00B7 tw ", p.tw, " \u00B7 tf ", p.tf, p.r ? ` · r ${p.r}` : '', p.g ? _jsxs(_Fragment, { children: [" \u00B7 ", _jsxs("b", { children: [p.g, " kg/m"] }), length > 0 ? ` · ${round1((p.g * length) / 1000)} kg su ${round1(length)} mm` : ''] }) : null] })] }));
}
/** Cavo FLC: taglia, forcelle alle estremità A e B, lunghezze e resistenze */
function CableProps({ o, onChange }) {
    const rope = flcRope(o.size);
    const sock = ttfSocket(o.size);
    const span = cableSpan(o);
    const n = socketCount(o);
    // cambia l'interasse spostando l'estremità B lungo l'asse
    const setSpan = (L) => {
        const u = span > 0 ? { x: (o.x2 - o.x1) / span, y: (o.y2 - o.y1) / span } : { x: 1, y: 0 };
        onChange({ x2: o.x1 + u.x * L, y2: o.y1 + u.y * L });
    };
    const swap = () => onChange({
        x1: o.x2, y1: o.y2, x2: o.x1, y2: o.y1, startSocket: o.endSocket, endSocket: o.startSocket,
    });
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "profile-id", children: [_jsx("div", { className: "profile-id-name", children: cableLabel(o) }), _jsxs("div", { className: "muted", children: ["\u00D8 ", rope.d, " \u00B7 A ", rope.A, " mm\u00B2 \u00B7 EA ", rope.EA, " MN \u00B7 ", _jsxs("b", { children: [rope.mass, " kg/m"] })] })] }), _jsxs("div", { className: "prop-grid", children: [_jsx(Field, { label: "Fune", children: _jsx("select", { value: o.size, onChange: e => onChange({ size: Number(e.target.value) }), children: FLC_SIZES.map(d => _jsxs("option", { value: d, children: ["FLC ", d] }, d)) }) }), _jsx(Field, { label: "Interasse (mm)", children: _jsx(Num, { value: span, min: 1, onChange: setSpan }) })] }), _jsxs("h4", { children: ["Forcelle TTF ", sock.size] }), _jsxs("div", { className: "prop-grid", children: [_jsxs("label", { className: "check-label", children: [_jsx("input", { type: "checkbox", checked: o.startSocket, onChange: e => onChange({ startSocket: e.target.checked }) }), "Estremit\u00E0 A"] }), _jsxs("label", { className: "check-label", children: [_jsx("input", { type: "checkbox", checked: o.endSocket, onChange: e => onChange({ endSocket: e.target.checked }) }), "Estremit\u00E0 B"] }), _jsx("button", { type: "button", className: "btn-secondary full-width", onClick: swap, children: "Inverti A \u2194 B" }), _jsx("p", { className: "muted full-width", style: { margin: 0 }, children: "A \u00E8 il primo punto disegnato, B il secondo: sulla tela li vedi nei cerchietti quando il cavo \u00E8 selezionato." })] }), _jsx("table", { className: "data-table", children: _jsxs("tbody", { children: [_jsxs("tr", { children: [_jsx("th", { children: "Lunghezza fune" }), _jsxs("td", { children: [round1(ropeLength(o)), " mm", n ? ` (interasse − ${n}×F)` : ''] })] }), _jsxs("tr", { children: [_jsx("th", { children: "Peso" }), _jsxs("td", { children: [round1(cableMass(o)), " kg"] })] }), _jsxs("tr", { children: [_jsx("th", { children: "Fuk / FRd fune" }), _jsxs("td", { children: [rope.Fuk, " / ", rope.FRd, " kN"] })] }), n > 0 && _jsxs("tr", { children: [_jsx("th", { children: "Nuk / NRd forcella" }), _jsxs("td", { children: [sock.Nuk, " / ", sock.NRd, " kN"] })] }), _jsxs("tr", { children: [_jsx("th", { children: "NRd tirante" }), _jsx("td", { children: _jsxs("b", { children: [cableNRd(o), " kN"] }) })] }), n > 0 && (_jsxs(_Fragment, { children: [_jsxs("tr", { children: [_jsx("th", { children: "Forcella C \u00B7 F \u00B7 E" }), _jsxs("td", { children: [sock.C, " \u00B7 ", sock.F, " \u00B7 ", sock.E, " mm"] })] }), _jsxs("tr", { children: [_jsx("th", { children: "Foro perno" }), _jsxs("td", { children: ["\u00D8 ", sock.Dhole, " mm"] })] }), _jsxs("tr", { children: [_jsx("th", { children: "Apertura T" }), _jsxs("td", { children: [sock.Tmin, "\u2013", sock.Tmax, " mm (S max ", sock.Smax, ")"] })] }), _jsxs("tr", { children: [_jsx("th", { children: "Massa forcella" }), _jsxs("td", { children: [sock.mass, " kg"] })] })] }))] }) }), _jsx("p", { className: "muted", style: { margin: 0 }, children: "Catalogo Redaelli \u00B7 FRd = Fuk / 1,5 (EN 1993-1-11, \u03B3R = 1,0)." }), _jsx("div", { className: "prop-grid", children: _jsxs("label", { className: "check-label full-width", children: [_jsx("input", { type: "checkbox", checked: o.showLabel !== false, onChange: e => onChange({ showLabel: e.target.checked }) }), "Mostra designazione sul disegno"] }) })] }));
}
/** Più oggetti selezionati: riepilogo, gruppi, allinea e distribuisci */
function MultiProps({ objs, onAlign, onGroup, onUngroup }) {
    useCatalog();
    const counts = new Map();
    for (const o of objs) {
        const label = o.type === 'polyline' && o.closed ? 'Poligono' : TYPE_LABEL[o.type];
        counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    // peso dei profili in vista laterale o dall'alto (la sezione non ha lunghezza)
    let weight = 0;
    let weighed = 0;
    for (const o of objs) {
        if (o.type === 'cable') {
            weight += cableMass(o);
            weighed++;
            continue;
        }
        if (o.type !== 'profile' || o.viewType === 'front')
            continue;
        const g = findProfile(o.profileName)?.g;
        if (g) {
            weight += (g * o.length) / 1000;
            weighed++;
        }
    }
    const groupIds = new Set(objs.map(o => o.groupId).filter(Boolean));
    const singleGroup = groupIds.size === 1 && objs.every(o => o.groupId);
    const locked = objs.filter(o => o.locked).length;
    const btn = (kind, title, icon, disabled = false) => (_jsx("button", { type: "button", className: "align-btn", title: title, "aria-label": title, onClick: () => onAlign(kind), disabled: disabled, children: icon }));
    const units = new Set(objs.filter(o => !o.locked).map(o => o.groupId ?? o.id)).size;
    return (_jsxs("div", { className: "properties-form", children: [_jsxs("div", { className: "object-info", children: [_jsx("span", { className: "badge", children: singleGroup ? 'Gruppo' : 'Selezione multipla' }), _jsxs("span", { className: "muted", children: [objs.length, " oggetti"] })] }), _jsx("div", { className: "multi-summary", children: [...counts].map(([label, n]) => _jsxs("span", { children: [n, " \u00D7 ", label] }, label)) }), weighed > 0 && (_jsxs("p", { className: "muted", style: { margin: 0 }, children: ["Peso (profili in vista laterale/dall'alto, cavi): ", _jsxs("b", { children: [round1(weight), " kg"] })] })), locked > 0 && _jsxs("p", { className: "muted", style: { margin: 0 }, children: [locked, " bloccati: non si spostano."] }), _jsx("h4", { children: "Gruppo" }), _jsxs("div", { className: "multi-actions", children: [singleGroup
                        ? _jsx("button", { type: "button", className: "btn-secondary", onClick: onUngroup, children: "Separa gruppo (Ctrl+Shift+G)" })
                        : _jsx("button", { type: "button", className: "btn-secondary", onClick: onGroup, children: "Raggruppa (Ctrl+G)" }), !singleGroup && groupIds.size > 0 && (_jsx("button", { type: "button", className: "btn-secondary", onClick: onUngroup, children: "Separa i gruppi" }))] }), _jsx("p", { className: "muted", style: { margin: 0 }, children: "Alt+clic seleziona un solo oggetto dentro un gruppo." }), _jsx("h4", { children: "Allinea" }), _jsxs("div", { className: "align-row", children: [btn('left', 'Allinea a sinistra', _jsx(AlignStartVertical, { size: 18 }), units < 2), btn('hcenter', 'Centra orizzontalmente', _jsx(AlignCenterVertical, { size: 18 }), units < 2), btn('right', 'Allinea a destra', _jsx(AlignEndVertical, { size: 18 }), units < 2), _jsx("span", { className: "align-sep" }), btn('top', 'Allinea in alto', _jsx(AlignStartHorizontal, { size: 18 }), units < 2), btn('vcenter', 'Centra verticalmente', _jsx(AlignCenterHorizontal, { size: 18 }), units < 2), btn('bottom', 'Allinea in basso', _jsx(AlignEndHorizontal, { size: 18 }), units < 2)] }), _jsx("h4", { children: "Distribuisci" }), _jsxs("div", { className: "align-row", children: [btn('hdistribute', 'Distribuisci in orizzontale (spazi uguali)', _jsx(AlignHorizontalDistributeCenter, { size: 18 }), units < 3), btn('vdistribute', 'Distribuisci in verticale (spazi uguali)', _jsx(AlignVerticalDistributeCenter, { size: 18 }), units < 3), units < 3 && _jsx("span", { className: "muted", children: "servono almeno 3 elementi" })] })] }));
}
function ObjectProps({ o, onChange }) {
    useCatalog();
    const isEndpoint = o.type === 'arrow' || o.type === 'quote' || o.type === 'cable';
    const hasXY = o.type !== 'polyline' && !isEndpoint;
    const canRotate = !isEndpoint;
    return (_jsxs("div", { className: "properties-form", children: [_jsxs("div", { className: "object-info", children: [_jsx("span", { className: "badge", children: o.type === 'polyline' && o.closed ? 'Poligono' : TYPE_LABEL[o.type] }), o.type === 'polyline' && _jsxs("span", { className: "muted", children: [o.closed ? o.points.length - 1 : o.points.length, " vertici"] })] }), o.type === 'text' && (_jsxs("div", { className: "prop-grid", children: [_jsx(Field, { label: "Testo", full: true, children: _jsx("textarea", { value: o.text, onChange: e => onChange({ text: e.target.value }) }) }), _jsx(Field, { label: "Dimensione", children: _jsx(Num, { value: o.fontSize, min: 1, onChange: v => onChange({ fontSize: v }) }) }), _jsx(Field, { label: "Riquadro", children: _jsxs("select", { value: o.boxEnabled ? 'on' : 'off', onChange: e => onChange({ boxEnabled: e.target.value === 'on' }), children: [_jsx("option", { value: "off", children: "Nessuno" }), _jsx("option", { value: "on", children: "Con bordo" })] }) })] })), o.type === 'quote' && (_jsx("div", { className: "prop-grid", children: _jsx(Field, { label: "Testo quota", full: true, children: _jsx("input", { type: "text", value: o.text || '', placeholder: `${round1(Math.hypot(o.x2 - o.x1, o.y2 - o.y1))} (automatico)`, onChange: e => onChange({ text: e.target.value }) }) }) })), o.type === 'symbol' && (_jsx("div", { className: "prop-grid", children: _jsx(Field, { label: "Numero", children: _jsx(Num, { value: o.value ?? 1, onChange: v => onChange({ value: v }) }) }) })), o.type === 'profile' && _jsx(ProfileHeader, { code: o.profileName, length: o.viewType === 'front' ? 0 : o.length }), o.type === 'profile' && (_jsxs("div", { className: "prop-grid", children: [(() => {
                        const cur = findProfile(o.profileName);
                        const region = cur?.region ?? 'EU';
                        const series = cur?.series ?? o.profileType;
                        return (_jsxs(_Fragment, { children: [_jsx(Field, { label: "Serie", children: _jsx("select", { value: series, onChange: e => {
                                            const first = profilesOfSeries(region, e.target.value)[0];
                                            if (first)
                                                onChange({ profileType: first.series, profileName: first.code });
                                        }, children: seriesByShape(region).map(g => (_jsx("optgroup", { label: g.label, children: g.series.map(t => _jsx("option", { value: t, children: t }, t)) }, g.shape))) }) }), _jsx(Field, { label: "Profilo", children: _jsx("select", { value: cur?.code ?? o.profileName, onChange: e => onChange({ profileName: e.target.value }), children: profilesOfSeries(region, series).map(p => _jsx("option", { value: p.code, children: p.name }, p.code)) }) })] }));
                    })(), _jsx(Field, { label: "Vista", children: _jsxs("select", { value: o.viewType || 'front', onChange: e => onChange({ viewType: e.target.value }), children: [_jsx("option", { value: "front", children: "Sezione" }), _jsx("option", { value: "side", children: "Laterale" }), _jsx("option", { value: "top", children: "Dall'alto" })] }) }), o.viewType !== 'front' && (_jsx(Field, { label: "Lunghezza (mm)", children: _jsx(Num, { value: o.length || 400, min: 1, onChange: v => onChange({ length: v }) }) })), _jsx(Field, { label: "Etichetta", children: _jsxs("select", { value: o.label ?? 'none', onChange: e => onChange({ label: e.target.value }), children: [_jsx("option", { value: "none", children: "Nessuna" }), _jsx("option", { value: "name", children: "Nome" }), _jsx("option", { value: "code", children: "Codice Maffeis" }), _jsx("option", { value: "tekla", children: "Nome Tekla" })] }) }), _jsx(Field, { label: "Scala", children: _jsx(Num, { value: o.scale, min: 0.01, step: 0.1, onChange: v => onChange({ scale: v }) }) })] })), o.type === 'bolt' && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "prop-grid", children: [_jsx(Field, { label: "Diametro", children: _jsx("select", { value: o.diameter, onChange: e => onChange({ diameter: Number(e.target.value) }), children: BOLT_DIAMETERS.map(d => _jsxs("option", { value: d, children: ["M", d] }, d)) }) }), _jsx(Field, { label: "Classe", children: _jsx("select", { value: o.grade, onChange: e => onChange({ grade: e.target.value }), children: BOLT_GRADES.map(g => _jsx("option", { value: g, children: g }, g)) }) }), _jsx(Field, { label: "Vista", full: true, children: _jsx("div", { className: "segmented", children: [['head', 'Testa'], ['nut', 'Dado'], ['hole', 'Foro'], ['section', 'Sezione']].map(([v, l]) => (_jsx("button", { type: "button", className: o.view === v ? 'active' : '', onClick: () => onChange({ view: v }), children: l }, v))) }) }), _jsx(Field, { label: "Pacco serrato (mm)", children: _jsx(Num, { value: o.grip, min: 1, onChange: v => onChange({ grip: v }) }) }), _jsx(Field, { label: "Lunghezza", children: _jsx("input", { value: `${boltLength(o)} mm`, readOnly: true, tabIndex: -1 }) }), _jsxs("label", { className: "check-label full-width", children: [_jsx("input", { type: "checkbox", checked: !!o.showLabel, onChange: e => onChange({ showLabel: e.target.checked }) }), "Mostra designazione (", boltLabel(o), ")"] })] }), _jsx("h4", { children: "Ripetizione" }), _jsxs("div", { className: "prop-grid", children: [_jsx(Field, { label: "Colonne", children: _jsx(Num, { value: o.cols, min: 1, onChange: v => onChange({ cols: Math.round(v) }) }) }), _jsx(Field, { label: "Passo X (mm)", children: _jsx(Num, { value: o.pitchX, min: 1, onChange: v => onChange({ pitchX: v }) }) }), o.view !== 'section' && (_jsxs(_Fragment, { children: [_jsx(Field, { label: "Righe", children: _jsx(Num, { value: o.rows, min: 1, onChange: v => onChange({ rows: Math.round(v) }) }) }), _jsx(Field, { label: "Passo Y (mm)", children: _jsx(Num, { value: o.pitchY, min: 1, onChange: v => onChange({ pitchY: v }) }) })] })), _jsxs("p", { className: "muted full-width", style: { margin: 0 }, children: ["Passi minimi EC3 (prosp. 3.3): p1 \u2265 2,2\u00B7d0 = ", round1(2.2 * boltDims(o.diameter).d0), " mm, p2 \u2265 2,4\u00B7d0 = ", round1(2.4 * boltDims(o.diameter).d0), " mm"] })] })] })), o.type === 'cable' && _jsx(CableProps, { o: o, onChange: onChange }), o.type === 'image' && (_jsxs("div", { className: "prop-grid", children: [_jsx(Field, { label: "Opacit\u00E0", full: true, children: _jsx("input", { type: "range", min: 0.05, max: 1, step: 0.05, value: o.opacity, onChange: e => onChange({ opacity: Number(e.target.value) }) }) }), o.clipPoints && (_jsx("button", { className: "btn-danger full-width", onClick: () => onChange({ clipPoints: undefined }), children: "Rimuovi scontorno" }))] })), _jsx("h4", { children: "Geometria" }), _jsxs("div", { className: "prop-grid", children: [hasXY && (_jsxs(_Fragment, { children: [_jsx(Field, { label: "X", children: _jsx(Num, { value: o.x, onChange: v => onChange({ x: v }) }) }), _jsx(Field, { label: "Y", children: _jsx(Num, { value: o.y, onChange: v => onChange({ y: v }) }) })] })), (o.type === 'rect' || o.type === 'text' || o.type === 'image') && (_jsxs(_Fragment, { children: [_jsx(Field, { label: "Larghezza", children: _jsx(Num, { value: o.width || 0, min: 1, onChange: v => onChange({ width: v }) }) }), _jsx(Field, { label: "Altezza", children: _jsx(Num, { value: o.height || 0, min: 1, onChange: v => onChange({ height: v }) }) })] })), o.type === 'circle' && (_jsx(Field, { label: "Diametro", children: _jsx(Num, { value: o.radius * 2, min: 1, onChange: v => onChange({ radius: v / 2 }) }) })), isEndpoint && (_jsxs(_Fragment, { children: [_jsx(Field, { label: "X1", children: _jsx(Num, { value: o.x1, onChange: v => onChange({ x1: v }) }) }), _jsx(Field, { label: "Y1", children: _jsx(Num, { value: o.y1, onChange: v => onChange({ y1: v }) }) }), _jsx(Field, { label: "X2", children: _jsx(Num, { value: o.x2, onChange: v => onChange({ x2: v }) }) }), _jsx(Field, { label: "Y2", children: _jsx(Num, { value: o.y2, onChange: v => onChange({ y2: v }) }) })] })), canRotate && (_jsx(Field, { label: "Rotazione (\u00B0)", children: _jsx(Num, { value: o.rotation || 0, onChange: v => onChange({ rotation: v }) }) })), (o.type === 'rect' || o.type === 'circle' || o.type === 'polyline' || o.type === 'arrow' || o.type === 'profile' || o.type === 'cable') && (_jsx(Field, { label: "Spessore linea", children: _jsx(Num, { value: o.strokeWidth ?? 2, min: 0.25, step: 0.5, onChange: v => onChange({ strokeWidth: v }) }) }))] })] }));
}
