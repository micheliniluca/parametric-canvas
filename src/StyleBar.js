import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { FILL_COLORS, STROKE_COLORS, STROKE_WIDTHS, styleCaps, styleOf } from './style';
import { Ban } from 'lucide-react';
const DASHES = [
    { id: 'solid', label: 'Continua' },
    { id: 'dashed', label: 'Tratteggiata' },
    { id: 'dotted', label: 'Punteggiata' },
];
/**
 * Barra flottante con colori e stili sempre a portata di mano.
 * Senza selezione imposta lo stile dei prossimi oggetti; con selezione modifica l'oggetto.
 */
export function StyleBar({ selected, drawStyle, onChange }) {
    const caps = styleCaps(selected);
    if (!caps.stroke && !caps.fill)
        return null;
    const s = { ...drawStyle, ...(selected ? stripUndefined(styleOf(selected)) : {}) };
    const sw = s.strokeWidth ?? 2;
    return (_jsxs("div", { className: "stylebar", onMouseDown: e => e.stopPropagation(), children: [caps.stroke && (_jsxs("div", { className: "sb-group", title: "Colore linea", children: [_jsx("span", { className: "sb-label", children: "Linea" }), STROKE_COLORS.map(({ c, n }) => (_jsx("button", { className: `sb-swatch ${eq(s.stroke, c) ? 'active' : ''}`, style: { background: c }, title: n, onClick: () => onChange({ stroke: c }) }, c))), _jsx("label", { className: `sb-swatch sb-custom ${isCustom(s.stroke, STROKE_COLORS) ? 'active' : ''}`, title: "Colore personalizzato", style: isCustom(s.stroke, STROKE_COLORS) ? { background: s.stroke } : undefined, children: _jsx("input", { type: "color", value: toHex(s.stroke), onChange: e => onChange({ stroke: e.target.value }) }) })] })), caps.fill && (_jsxs("div", { className: "sb-group", title: "Riempimento", children: [_jsx("span", { className: "sb-label", children: "Riemp." }), _jsx("button", { className: `sb-swatch sb-none ${!s.fillEnabled ? 'active' : ''}`, title: "Nessun riempimento", onClick: () => onChange({ fillEnabled: false }), children: _jsx(Ban, { size: 14 }) }), FILL_COLORS.map(({ c, n }) => (_jsx("button", { className: `sb-swatch ${s.fillEnabled && eq(s.fillColor, c) ? 'active' : ''}`, style: { background: c }, title: n, onClick: () => onChange({ fillEnabled: true, fillColor: c }) }, c))), _jsx("label", { className: `sb-swatch sb-custom ${s.fillEnabled && isCustom(s.fillColor, FILL_COLORS) ? 'active' : ''}`, title: "Riempimento personalizzato", style: s.fillEnabled && isCustom(s.fillColor, FILL_COLORS) ? { background: s.fillColor } : undefined, children: _jsx("input", { type: "color", value: toHex(s.fillColor), onChange: e => onChange({ fillEnabled: true, fillColor: e.target.value }) }) })] })), caps.width && (_jsx("div", { className: "sb-group", title: "Spessore", children: STROKE_WIDTHS.map(w => (_jsx("button", { className: `sb-btn ${sw === w ? 'active' : ''}`, title: `Spessore ${w}`, onClick: () => onChange({ strokeWidth: w }), children: _jsx("svg", { width: "22", height: "16", children: _jsx("line", { x1: "3", y1: "8", x2: "19", y2: "8", stroke: "currentColor", strokeWidth: Math.min(w, 6), strokeLinecap: "round" }) }) }, w))) })), caps.dash && (_jsx("div", { className: "sb-group", title: "Tipo linea", children: DASHES.map(d => (_jsx("button", { className: `sb-btn ${(s.strokeDash ?? 'solid') === d.id ? 'active' : ''}`, title: d.label, onClick: () => onChange({ strokeDash: d.id }), children: _jsx("svg", { width: "22", height: "16", children: _jsx("line", { x1: "2", y1: "8", x2: "20", y2: "8", stroke: "currentColor", strokeWidth: 2, strokeDasharray: d.id === 'dashed' ? '5 3' : d.id === 'dotted' ? '1.5 3' : undefined, strokeLinecap: d.id === 'dotted' ? 'round' : 'butt' }) }) }, d.id))) }))] }));
}
const isCustom = (c, palette) => !!c && !palette.some(p => eq(c, p.c));
const eq = (a, b) => (a ?? '').toLowerCase() === b.toLowerCase();
/** input[type=color] accetta solo #rrggbb */
const toHex = (c) => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : '#000000');
function stripUndefined(o) {
    return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
}
