import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { round1 } from '../utils/mathUtils';
function computeWand(s) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.width;
            c.height = img.height;
            const ctx = c.getContext('2d');
            if (!ctx)
                return reject(new Error('canvas 2d non disponibile'));
            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, c.width, c.height);
            const data = imgData.data;
            const { r: tr, g: tg, b: tb } = s.targetColor;
            // soglia 0-100% della distanza massima nello spazio RGB (≈441)
            const maxD2 = (s.threshold * 4.416) ** 2;
            const match = (i) => (data[i] - tr) ** 2 + (data[i + 1] - tg) ** 2 + (data[i + 2] - tb) ** 2 <= maxD2;
            if (s.contiguous) {
                const w = c.width;
                const h = c.height;
                const visited = new Uint8Array(w * h);
                const stack = [s.targetPixel.y * w + s.targetPixel.x];
                while (stack.length) {
                    const idx = stack.pop();
                    if (visited[idx])
                        continue;
                    visited[idx] = 1;
                    if (!match(idx * 4))
                        continue;
                    data[idx * 4 + 3] = 0;
                    const x = idx % w;
                    if (x > 0)
                        stack.push(idx - 1);
                    if (x < w - 1)
                        stack.push(idx + 1);
                    if (idx >= w)
                        stack.push(idx - w);
                    if (idx < w * (h - 1))
                        stack.push(idx + w);
                }
            }
            else {
                for (let i = 0; i < data.length; i += 4)
                    if (match(i))
                        data[i + 3] = 0;
            }
            ctx.putImageData(imgData, 0, 0);
            resolve(c.toDataURL());
        };
        img.onerror = reject;
        img.src = s.originalSrc;
    });
}
export function WandPanel({ state, setState, onApply }) {
    const { threshold, contiguous, originalSrc, targetPixel } = state;
    useEffect(() => {
        let cancelled = false;
        const t = setTimeout(() => {
            computeWand(state).then(src => {
                if (!cancelled)
                    setState(prev => (prev ? { ...prev, previewSrc: src } : null));
            }).catch(() => { });
        }, 60);
        return () => { cancelled = true; clearTimeout(t); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [threshold, contiguous, originalSrc, targetPixel.x, targetPixel.y]);
    const { r, g, b } = state.targetColor;
    return (_jsxs("div", { className: "floating-card", style: { top: 72, left: 16, width: 250 }, children: [_jsxs("div", { className: "floating-card-title", children: [_jsx("span", { children: "Bacchetta magica" }), _jsx("span", { className: "swatch-preview", style: { background: `rgb(${r},${g},${b})` }, title: "Colore selezionato" })] }), _jsxs("label", { className: "range-label", children: [_jsx("span", { children: "Tolleranza" }), _jsxs("span", { children: [threshold, "%"] })] }), _jsx("input", { type: "range", min: 0, max: 100, value: threshold, onChange: e => setState(p => (p ? { ...p, threshold: Number(e.target.value) } : null)) }), _jsxs("label", { className: "check-label", children: [_jsx("input", { type: "checkbox", checked: contiguous, onChange: e => setState(p => (p ? { ...p, contiguous: e.target.checked } : null)) }), "Solo pixel contigui"] }), _jsx("p", { className: "floating-card-hint", children: "Clic su un altro punto dell'immagine per cambiare colore." }), _jsxs("div", { className: "floating-card-actions", children: [_jsx("button", { className: "btn-primary", onClick: onApply, children: "Applica" }), _jsx("button", { className: "btn-secondary", onClick: () => setState(null), children: "Annulla" })] })] }));
}
/* ====================================================== */
export function MeasurePanel({ distance, onClose }) {
    return (_jsxs("div", { className: "floating-card floating-card-row", style: { top: 72, left: '50%', transform: 'translateX(-50%)' }, children: [_jsxs("div", { children: [_jsx("div", { className: "floating-card-label", children: "Distanza" }), _jsxs("div", { className: "floating-card-value", children: [round1(distance), " mm"] })] }), _jsx("button", { className: "icon-btn", onClick: onClose, title: "Chiudi", children: _jsx(X, { size: 16 }) })] }));
}
/* ====================================================== */
export function ScalePanel({ current, onApply, onCancel }) {
    const [value, setValue] = useState('');
    const ref = useRef(null);
    useEffect(() => { ref.current?.focus(); }, []);
    const target = parseFloat(value.replace(',', '.'));
    const valid = isFinite(target) && target > 0;
    return (_jsxs("form", { className: "floating-card", style: { top: 72, left: '50%', transform: 'translateX(-50%)', width: 280 }, onSubmit: e => { e.preventDefault(); if (valid)
            onApply(target); }, children: [_jsx("div", { className: "floating-card-title", children: "Scala con riferimento" }), _jsxs("div", { className: "floating-card-label", children: ["Distanza attuale: ", _jsx("b", { children: round1(current) })] }), _jsx("label", { className: "floating-card-label", htmlFor: "scale-target", children: "Distanza reale (mm)" }), _jsx("input", { id: "scale-target", ref: ref, value: value, inputMode: "decimal", onChange: e => setValue(e.target.value), onKeyDown: e => { if (e.key === 'Escape')
                    onCancel(); }, placeholder: "es. 200" }), valid && _jsxs("p", { className: "floating-card-hint", children: ["Fattore di scala: ", (target / current).toFixed(3)] }), _jsxs("div", { className: "floating-card-actions", children: [_jsx("button", { type: "submit", className: "btn-primary", disabled: !valid, children: "Applica" }), _jsx("button", { type: "button", className: "btn-secondary", onClick: onCancel, children: "Annulla" })] })] }));
}
