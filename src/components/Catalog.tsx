import { useMemo, useState } from 'react'
import { CATALOG_BY_SERIES, SERIES_GROUPS, SERIES_LABEL } from '../profiles'
import type { ProfileSeries, SteelProfile } from '../profiles'

type Props = {
  onSelect: (profile: SteelProfile) => void
  /** Serie del profilo selezionato, se presente */
  current?: ProfileSeries
}

/** Catalogo profili per serie, con ricerca per nome o dimensione */
export function Catalog({ onSelect, current }: Props) {
  const [series, setSeries] = useState<ProfileSeries>(current ?? 'IPE')
  const [query, setQuery] = useState('')

  const list = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, '')
    if (!q) return CATALOG_BY_SERIES[series]
    // con una ricerca si cerca in tutte le serie
    return Object.values(CATALOG_BY_SERIES).flat().filter(p => p.name.toLowerCase().replace(/\s+/g, '').includes(q))
  }, [series, query])

  return (
    <div className="catalog">
      <input
        className="catalog-search"
        type="search"
        placeholder="Cerca (es. HEB 300, UPN 200, 80x8)…"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      {!query &&
        SERIES_GROUPS.map(g => (
          <div key={g.label} className="catalog-group">
            <span className="catalog-group-label">{g.label}</span>
            <div className="catalog-tabs">
              {g.series.map(t => (
                <button key={t} className={series === t ? 'active' : ''} onClick={() => setSeries(t)} title={SERIES_LABEL[t]}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        ))}
      <div className="catalog-list">
        {list.map(p => (
          <div key={p.name} className="catalog-item" onClick={() => onSelect(p)}>
            <div className="catalog-name">{p.name}</div>
            <div className="catalog-meta">
              {p.h}×{p.b} · {p.type === 'CHS' || p.type === 'RHS' || p.type === 'L' ? `t ${p.tw}` : `${p.tw}/${p.tf}`}
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="catalog-empty">Nessun profilo trovato</div>}
      </div>
      <p className="muted" style={{ margin: 0 }}>
        Dimensioni nominali EN 10365 (catalogo ArcelorMittal). Per IPN/UPN l'ala è disegnata a spessore medio.
      </p>
    </div>
  )
}
