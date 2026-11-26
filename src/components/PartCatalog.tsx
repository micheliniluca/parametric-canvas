import { useMemo, useState } from 'react'
import { PART_GROUPS, partDef, useParts } from '../utils/partsLib'
import type { PartDef, PartGroup } from '../utils/partsLib'

type Source = 'all' | 'etfe' | 'ptfe'

type Props = {
  onSelect: (def: PartDef) => void
  /** componente in attesa di inserimento */
  placingId: string | null
  /** componente selezionato sul disegno */
  current?: string
}

/** Libreria dei componenti per membrane: filtro ETFE / tessuto, gruppi, ricerca, anteprime */
export function PartCatalog({ onSelect, placingId, current }: Props) {
  const all = useParts()
  const [source, setSource] = useState<Source>('all')
  const [group, setGroup] = useState<PartGroup>('Profili in alluminio')
  const [query, setQuery] = useState('')

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter(p =>
      (source === 'all' || p.s.includes(source)) &&
      (q ? p.n.toLowerCase().includes(q) || p.g.toLowerCase().includes(q) : p.g === group))
  }, [all, source, group, query])

  if (all.length === 0) return <div className="catalog-empty">Caricamento componenti…</div>

  const placing = partDef(placingId ?? undefined)
  const selected = partDef(current)
  return (
    <div className="catalog parts-catalog">
      {placing && !selected && (
        <div className="placing-banner">
          Clic sulla tela per inserire <b>{placing.n}</b>
          <span>Esc per annullare</span>
        </div>
      )}
      {selected && (
        <div className="placing-banner">
          La scelta sostituisce <b>{selected.n}</b>
          <span>Esc per deselezionare e inserirne uno nuovo</span>
        </div>
      )}
      <div className="segmented">
        {([['all', 'Tutti'], ['etfe', 'ETFE'], ['ptfe', 'Tessuto PTFE']] as const).map(([k, l]) => (
          <button key={k} className={source === k ? 'active' : ''} onClick={() => setSource(k)}>{l}</button>
        ))}
      </div>
      <input
        className="catalog-search"
        type="search"
        placeholder="Cerca (es. keder, TE 33x44, tenditore, M12)…"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      {!query && (
        <div className="catalog-tabs">
          {PART_GROUPS.map(g => {
            const n = all.filter(p => p.g === g && (source === 'all' || p.s.includes(source))).length
            return n ? (
              <button key={g} className={group === g ? 'active' : ''} onClick={() => setGroup(g)}>{g} <span className="muted">{n}</span></button>
            ) : null
          })}
        </div>
      )}
      <div className="parts-grid">
        {list.map(p => (
          <button
            key={p.id}
            type="button"
            className={`part-card ${p.id === (current ?? placingId) ? 'current' : ''}`}
            title={`${p.n}\n${p.g} · ${(p.b[2] - p.b[0]).toFixed(0)}×${(p.b[3] - p.b[1]).toFixed(0)} mm`}
            onClick={() => onSelect(p)}
          >
            <PartThumb def={p} />
            <span className="part-name">{p.n}</span>
          </button>
        ))}
        {list.length === 0 && <div className="catalog-empty">Nessun componente trovato</div>}
      </div>
      <p className="muted" style={{ margin: 0 }}>
        {all.length} componenti dai dettagli tipici Maffeis per ETFE e tessuto, in grandezza reale (mm).
      </p>
    </div>
  )
}

function PartThumb({ def }: { def: PartDef }) {
  const [x0, y0, x1, y1] = def.b
  const w = Math.max(x1 - x0, 1e-3), h = Math.max(y1 - y0, 1e-3)
  const pad = Math.max(w, h) * 0.06
  // linee di circa 1 px nell'anteprima
  const sw = (Math.max(w, h) + 2 * pad) / 80
  return (
    <svg viewBox={`${x0 - pad} ${y0 - pad} ${w + 2 * pad} ${h + 2 * pad}`} preserveAspectRatio="xMidYMid meet">
      {def.f && <path d={def.f} fill="currentColor" />}
      <path d={def.d} fill="none" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" />
    </svg>
  )
}
