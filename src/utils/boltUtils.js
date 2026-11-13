const TABLE = {
    12: { s: 18, k: 7.5, m: 10.8, dw: 24, hw: 2.5, d0: 13, p: 1.75 },
    14: { s: 21, k: 8.8, m: 12.8, dw: 28, hw: 2.5, d0: 15, p: 2 },
    16: { s: 24, k: 10, m: 14.8, dw: 30, hw: 3, d0: 18, p: 2 },
    20: { s: 30, k: 12.5, m: 18, dw: 37, hw: 3, d0: 22, p: 2.5 },
    22: { s: 34, k: 14, m: 19.4, dw: 39, hw: 3, d0: 24, p: 2.5 },
    24: { s: 36, k: 15, m: 21.5, dw: 44, hw: 4, d0: 26, p: 3 },
    27: { s: 41, k: 17, m: 23.8, dw: 50, hw: 4, d0: 30, p: 3 },
    30: { s: 46, k: 18.7, m: 25.6, dw: 56, hw: 4, d0: 33, p: 3.5 },
    36: { s: 55, k: 22.5, m: 31, dw: 66, hw: 5, d0: 39, p: 4 },
};
export const BOLT_DIAMETERS = Object.keys(TABLE).map(Number);
export const BOLT_GRADES = ['4.6', '5.6', '6.8', '8.8', '10.9'];
export const boltDims = (d) => {
    const row = TABLE[d];
    if (row)
        return { d, ...row };
    // diametri fuori tabella: proporzioni approssimate
    return { d, s: d * 1.5, k: d * 0.62, m: d * 0.85, dw: d * 1.85, hw: d * 0.15, d0: d + 2, p: d * 0.125 };
};
/** Lunghezza commerciale: pacco + 2 rondelle + dado + sporgenza di almeno 2 passi, arrotondata a 5 mm */
export const boltLength = (o) => {
    const t = boltDims(o.diameter);
    return Math.ceil((o.grip + 2 * t.hw + t.m + 2 * t.p) / 5) * 5;
};
export const boltLabel = (o) => {
    const n = o.view === 'section' ? Math.max(1, o.cols) : Math.max(1, o.cols) * Math.max(1, o.rows);
    return `${n > 1 ? `${n} ` : ''}M${o.diameter}×${boltLength(o)} cl. ${o.grade}`;
};
/** Centri dei bulloni (in sezione solo la fila lungo X) */
export const boltCenters = (o) => {
    const cols = Math.max(1, Math.round(o.cols));
    const rows = o.view === 'section' ? 1 : Math.max(1, Math.round(o.rows));
    const pts = [];
    for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++)
            pts.push({ x: o.x + i * o.pitchX, y: o.y + j * o.pitchY });
    return pts;
};
/** Ingombro non ruotato */
export const boltBounds = (o) => {
    const t = boltDims(o.diameter);
    const centers = boltCenters(o);
    const xs = centers.map(c => c.x);
    const ys = centers.map(c => c.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    if (o.view === 'section') {
        const e = t.s * 1.1547;
        const half = Math.max(e, t.dw) / 2;
        const top = -(t.k + t.hw);
        const bottom = o.grip + t.hw + t.m + 2 * t.p;
        return { x: minX - half, y: minY + top, w: maxX - minX + half * 2, h: bottom - top };
    }
    const r = o.view === 'hole' ? t.d0 / 2 + t.d * 0.4 : Math.max(t.dw, t.s * 1.1547) / 2;
    return { x: minX - r, y: minY - r, w: maxX - minX + 2 * r, h: maxY - minY + 2 * r };
};
/** Esagono con apertura chiave s, lati piani in alto e in basso */
export const hexPath = (cx, cy, s) => {
    const R = s / Math.sqrt(3);
    let d = '';
    for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        d += `${i ? 'L' : 'M'} ${cx + R * Math.cos(a)} ${cy + R * Math.sin(a)} `;
    }
    return d + 'Z';
};
/** Geometria di un singolo bullone centrato in (cx, cy) secondo la vista */
export const boltDrawing = (o, c) => {
    const t = boltDims(o.diameter);
    const circle = (r) => `M ${c.x - r} ${c.y} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0 `;
    const cross = (r) => `M ${c.x - r} ${c.y} L ${c.x + r} ${c.y} M ${c.x} ${c.y - r} L ${c.x} ${c.y + r} `;
    switch (o.view) {
        case 'head':
            return { outline: hexPath(c.x, c.y, t.s) + circle(t.dw / 2), thin: circle(t.s * 0.95 / 2), axis: cross(t.dw / 2 + 3) };
        case 'nut': {
            // estremità filettata: diametro nominale pieno, nocciolo con arco di 3/4 (ISO 6410)
            const rr = (t.d * 0.85) / 2;
            const arc = `M ${c.x + rr} ${c.y} A ${rr} ${rr} 0 1 1 ${c.x} ${c.y - rr} `;
            return { outline: hexPath(c.x, c.y, t.s) + circle(t.dw / 2) + circle(t.d / 2), thin: arc, axis: cross(t.dw / 2 + 3) };
        }
        case 'hole':
            return { outline: circle(t.d0 / 2), thin: '', axis: cross(t.d0 / 2 + t.d * 0.4) };
        case 'section': {
            // asse verticale; y = 0 sulla faccia superiore del pacco, testa sopra, dado sotto
            const e = t.s * 1.1547;
            const x = c.x;
            const y = c.y;
            const rect = (w, y0, h) => `M ${x - w / 2} ${y0} h ${w} v ${h} h ${-w} Z `;
            const yHead = y - t.hw - t.k;
            const yNutW = y + o.grip;
            const yNut = yNutW + t.hw;
            const yEnd = yNut + t.m + 2 * t.p;
            const outline = rect(e, yHead, t.k) + // testa (vista sugli spigoli)
                rect(t.dw, y - t.hw, t.hw) + // rondella sotto testa
                `M ${x - t.d / 2} ${y} V ${yNutW} M ${x + t.d / 2} ${y} V ${yNutW} ` + // gambo nel pacco
                rect(t.dw, yNutW, t.hw) + // rondella lato dado
                rect(e, yNut, t.m) + // dado
                `M ${x - t.d / 2} ${yNut + t.m} V ${yEnd - t.p * 0.5} L ${x - t.d / 2 + t.p * 0.5} ${yEnd} H ${x + t.d / 2 - t.p * 0.5} L ${x + t.d / 2} ${yEnd - t.p * 0.5} V ${yNut + t.m} `; // sporgenza con smusso
            const rr = (t.d * 0.85) / 2;
            const thin = `M ${x - e / 4} ${yHead} V ${yHead + t.k} M ${x + e / 4} ${yHead} V ${yHead + t.k} ` + // spigoli testa
                `M ${x - e / 4} ${yNut} V ${yNut + t.m} M ${x + e / 4} ${yNut} V ${yNut + t.m} ` + // spigoli dado
                `M ${x - rr} ${yNut + t.m} V ${yEnd} M ${x + rr} ${yNut + t.m} V ${yEnd} `; // nocciolo filetto
            const axis = `M ${x} ${yHead - 4} V ${yEnd + 4} `;
            return { outline, thin, axis };
        }
    }
};
const parseSpacing = (spacing) => {
    const out = [];
    for (const part of (spacing || '').trim().split(/\s+/)) {
        if (!part)
            continue;
        if (part.includes('*')) {
            const [n, v] = part.split('*');
            for (let i = 0; i < parseInt(n); i++)
                out.push(parseFloat(v));
        }
        else if (!isNaN(parseFloat(part)))
            out.push(parseFloat(part));
    }
    return out.filter(v => !isNaN(v));
};
const uniformStep = (gaps) => (gaps.length && gaps.every(g => Math.abs(g - gaps[0]) < 1e-6) ? gaps[0] : null);
function migrateLegacyBolt(o) {
    const xs = [o.offsetX || 0];
    for (const g of parseSpacing(o.spacingX))
        xs.push(xs[xs.length - 1] + g);
    const yGaps = parseSpacing(o.spacingY);
    const total = yGaps.reduce((a, b) => a + b, 0);
    const ys = [-total / 2 + (o.offsetY || 0)];
    for (const g of yGaps)
        ys.push(ys[ys.length - 1] + g);
    const angleRad = Math.atan2(o.p2.y - o.p1.y, o.p2.x - o.p1.x);
    const angle = (angleRad * 180) / Math.PI;
    const view = o.viewType === 'side' ? 'section' : 'head';
    const base = {
        type: 'bolt', diameter: o.diameter, grade: '8.8', view: view,
        grip: Math.max(10, (o.length ?? 60) - 30), stroke: o.stroke, showLabel: false,
    };
    const toWorld = (lx, ly) => ({
        x: o.p1.x + lx * Math.cos(angleRad) - ly * Math.sin(angleRad),
        y: o.p1.y + lx * Math.sin(angleRad) + ly * Math.cos(angleRad),
    });
    const sx = xs.length > 1 ? uniformStep(xs.slice(1).map((v, i) => v - xs[i])) : 0;
    const sy = ys.length > 1 ? uniformStep(ys.slice(1).map((v, i) => v - ys[i])) : 0;
    if (sx !== null && sy !== null) {
        // griglia regolare: un solo oggetto ruotato attorno al centro della griglia
        const cols = xs.length, rows = ys.length;
        const center = toWorld((xs[0] + xs[cols - 1]) / 2, (ys[0] + ys[rows - 1]) / 2);
        const w = (cols - 1) * (sx || 0), h = (rows - 1) * (sy || 0);
        return [{
                ...base, id: o.id, x: center.x - w / 2, y: center.y - h / 2, rotation: angle,
                cols, pitchX: sx || 70, rows, pitchY: sy || 70,
            }];
    }
    // griglia irregolare: bulloni singoli
    const out = [];
    for (const ly of ys)
        for (const lx of xs) {
            const p = toWorld(lx, ly);
            out.push({ ...base, id: crypto.randomUUID(), x: p.x, y: p.y, rotation: angle, cols: 1, pitchX: 70, rows: 1, pitchY: 70 });
        }
    return out;
}
/** Converte gli oggetti salvati con formati precedenti */
export function migrateObjects(objects) {
    return objects.flatMap(o => {
        const legacy = o;
        if (o.type === 'bolt' && legacy.p1 && legacy.p2)
            return migrateLegacyBolt(legacy);
        return [o];
    });
}
