import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { getObjectCenter, textSize } from './geometry';
/**
 * Editor del testo sovrapposto alla tela, nella stessa posizione e scala dell'oggetto.
 * Invio = a capo, Ctrl+Invio / Esc / clic fuori = conferma.
 */
export function TextEditor({ o, zoom, view, onChange, onDone }) {
    const ref = useRef(null);
    const openedAt = useRef(0);
    useEffect(() => {
        openedAt.current = Date.now();
        const el = ref.current;
        if (!el)
            return;
        el.focus();
        el.select();
        // seconda chiamata dopo il ciclo del clic, nel caso il browser abbia spostato il focus
        const t = window.setTimeout(() => { if (document.activeElement !== el)
            el.focus(); }, 0);
        return () => window.clearTimeout(t);
    }, [o.id]);
    const fontSize = o.fontSize || 20;
    const { w, h } = textSize({ ...o, text: o.text || 'M' });
    const c = getObjectCenter(o);
    // larghezza minima per scrivere comodamente mentre il testo è corto
    const width = Math.max(w, fontSize * 4) * zoom;
    const height = h * zoom;
    return (_jsx("textarea", { ref: ref, className: "text-editor", value: o.text, spellCheck: false, onChange: e => onChange(e.target.value), onBlur: () => {
            // una perdita di focus subito dopo l'apertura è un effetto del clic che l'ha aperto: si ignora
            if (Date.now() - openedAt.current < 300) {
                window.setTimeout(() => ref.current?.focus(), 0);
                return;
            }
            onDone();
        }, onMouseDown: e => e.stopPropagation(), onKeyDown: e => {
            if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
                e.preventDefault();
                onDone();
            }
        }, style: {
            left: (c.x - view.x) * zoom - width / 2,
            top: (c.y - view.y) * zoom - height / 2,
            width,
            height,
            fontSize: fontSize * zoom,
            lineHeight: 1.2,
            padding: `${(o.boxPadding || 10) * zoom}px 0`,
            color: o.textColor || '#0f172a',
            transform: o.rotation ? `rotate(${o.rotation}deg)` : undefined,
        } }));
}
