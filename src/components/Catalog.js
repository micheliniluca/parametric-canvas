import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { REGION_LABEL, profilesOfSeries, seriesByShape, useCatalog } from '../profiles';
const MAX_RESULTS = 200;
/** Catalogo profili: regione, serie raggruppate per forma, ricerca su nome / codice Maffeis / nome Tekla */
export function Catalog({ onSelect, current }) {
    const all = useCatalog();
    const [region, setRegion] = useState(current?.region ?? 'EU');
    const [series, setSeries] = useState(current?.series ?? 'IPE');
    const [query, setQuery] = useState('');
    const groups = useMemo(() => seriesByShape(region), [region, all.length]);
    const activeSeries = groups.some(g => g.series.includes(series)) ? series : groups[0]?.series[0] ?? '';
    const list = useMemo(() => {
        // "L 100 x 100", "L100*100" e "l100x100" sono equivalenti
        const n = (s) => s.toUpperCase().replace(/\s+/g, '').replace(/\*/g, 'X');
        const q = n(query.trim());
        if (!q)
            return profilesOfSeries(region, activeSeries);
        return all.filter(p => p.region === region && (n(p.name).includes(q) || n(p.code).includes(q) || n(p.tekla).includes(q)));
    }, [region, activeSeries, query, all]);
    if (all.length === 0)
        return _jsx("div", { className: "catalog-empty", children: "Caricamento catalogo\u2026" });
    return (_jsxs("div", { className: "catalog", children: [_jsx("div", { className: "segmented", children: ['EU', 'US'].map(r => (_jsx("button", { className: region === r ? 'active' : '', onClick: () => setRegion(r), children: REGION_LABEL[r] }, r))) }), _jsx("input", { className: "catalog-search", type: "search", placeholder: "Cerca nome o codice (es. HEB 300, SI_IPE200, L100*100*10)\u2026", value: query, onChange: e => setQuery(e.target.value) }), !query &&
                groups.map(g => (_jsxs("div", { className: "catalog-group", children: [_jsx("span", { className: "catalog-group-label", children: g.label }), _jsx("div", { className: "catalog-tabs", children: g.series.map(t => (_jsx("button", { className: activeSeries === t ? 'active' : '', onClick: () => setSeries(t), children: t }, t))) })] }, g.shape))), _jsxs("div", { className: "catalog-list", children: [list.slice(0, MAX_RESULTS).map(p => (_jsxs("div", { className: `catalog-item ${current?.code === p.code ? 'current' : ''}`, onClick: () => onSelect(p), title: `Maffeis: ${p.code}\nTekla: ${p.tekla}`, children: [_jsxs("div", { children: [_jsx("div", { className: "catalog-name", children: p.name }), _jsxs("div", { className: "catalog-code", children: [p.code, " \u00B7 ", p.tekla] })] }), _jsxs("div", { className: "catalog-meta", children: [p.h, "\u00D7", p.b, p.g ? _jsxs(_Fragment, { children: [_jsx("br", {}), p.g, " kg/m"] }) : null] })] }, p.code))), list.length > MAX_RESULTS && _jsxs("div", { className: "catalog-empty", children: ["Altri ", list.length - MAX_RESULTS, " risultati: affina la ricerca"] }), list.length === 0 && _jsx("div", { className: "catalog-empty", children: "Nessun profilo trovato" })] }), _jsxs("p", { className: "muted", style: { margin: 0 }, children: [all.length.toLocaleString('it-IT'), " profili dal database Maffeis. Ali rastremate (IPN, UPN\u2026) disegnate a spessore medio."] })] }));
}
