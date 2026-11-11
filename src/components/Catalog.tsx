import { useMemo, useState } from 'react'
import { REGION_LABEL, profilesOfSeries, seriesByShape, useCatalog } from '../profiles'
import type { ProfileRegion, SteelProfile } from '../profiles'

type Props = {
  onSelect: (profile: SteelProfile) => void
  /** Profilo selezionato sul disegno, se presente */
  current?: SteelProfile
}

const MAX_RESULTS = 200

/** Catalogo profili: regione, serie raggruppate per forma, ricerca su nome / codice Maffeis / nome Tekla */
export function Catalog({ onSelect, current }: Props) {
  const all = useCatalog()
  const [region, setRegion] = useState<ProfileRegion>(current?.region ?? 'EU')
  const [series, setSeries] = useState<string>(current?.series ?? 'IPE')
  const [query, setQuery] = useState('')

  const groups = useMemo(() => seriesByShape(region), [region, all.length])
  const activeSeries = groups.some(g => g.series.includes(series)) ? series : groups[0]?.series[0] ?? ''

  const list = useMemo(() => {
    // "L 100 x 100", "L100*100" e "l100x100" sono equivalenti
    const n = (s: string) => s.toUpperCase().replace(/\s+/g, '').replace(/\*/g, 'X')
    const q = n(query.trim())
    if (!q) return profilesOfSeries(region, activeSeries)
    return all.filter(p => p.region === region && (n(p.name).includes(q) || n(p.code).includes(q) || n(p.tekla).includes(q)))
  }, [region, activeSeries, query, all])

  if (all.length === 0) return <div className="catalog-empty">Caricamento catalogo…</div>

  return (
    <div className="catalog">
      <div className="segmented">
        {(['EU', 'US'] as const).map(r => (
          <button key={r} className={region === r ? 'active' : ''} onClick={() => setRegion(r)}>{REGION_LABEL[r]}</button>
        ))}
      </div>
      <input
        className="catalog-search"
        type="search"
        placeholder="Cerca nome o codice (es. HEB 300, SI_IPE200, L100*100*10)…"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      {!query &&
        groups.map(g => (
          <div key={g.shape} className="catalog-group">
            <span className="catalog-group-label">{g.label}</span>
            <div className="catalog-tabs">
              {g.series.map(t => (
                <button key={t} className={activeSeries === t ? 'active' : ''} onClick={() => setSeries(t)}>{t}</button>
              ))}
            </div>
          </div>
        ))}
      <div className="catalog-list">
        {list.slice(0, MAX_RESULTS).map(p => (
          <div
            key={p.code}
            className={`catalog-item ${current?.code === p.code ? 'current' : ''}`}
            onClick={() => onSelect(p)}
            title={`Maffeis: ${p.code}\nTekla: ${p.tekla}`}
          >
            <div>
              <div className="catalog-name">{p.name}</div>
              <div className="catalog-code">{p.code} · {p.tekla}</div>
            </div>
            <div className="catalog-meta">
              {p.h}×{p.b}
              {p.g ? <><br />{p.g} kg/m</> : null}
            </div>
          </div>
        ))}
        {list.length > MAX_RESULTS && <div className="catalog-empty">Altri {list.length - MAX_RESULTS} risultati: affina la ricerca</div>}
        {list.length === 0 && <div className="catalog-empty">Nessun profilo trovato</div>}
      </div>
      <p className="muted" style={{ margin: 0 }}>
        {all.length.toLocaleString('it-IT')} profili dal database Maffeis. Ali rastremate (IPN, UPN…) disegnate a spessore medio.
      </p>
    </div>
  )
}
