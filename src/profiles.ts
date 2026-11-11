import { useEffect, useState } from 'react'

/**
 * Catalogo profili dal database Maffeis (src/data/profiles.json, generato con
 * `node scripts/import-profiles.mjs <csv>`). Il file viene caricato a parte,
 * dopo l'avvio, per non rallentare l'apertura del sito.
 */
export type ProfileShape = 'I' | 'U' | 'L' | 'T' | 'RHS' | 'CHS'
export type ProfileRegion = 'EU' | 'US'

export type SteelProfile = {
  /** Codice Maffeis, univoco (es. SI_IPE200) */
  code: string
  /** Nome nel catalogo Tekla (es. IPE200) */
  tekla: string
  /** Nome commerciale (es. IPE 200) */
  name: string
  region: ProfileRegion
  shape: ProfileShape
  series: string
  h: number
  b: number
  tw: number
  tf: number
  /** raggio di raccordo (per i tubolari: raggio esterno) */
  r?: number
  r2?: number
  /** peso kg/m */
  g?: number
}

export const SHAPE_GROUPS: { shape: ProfileShape; label: string }[] = [
  { shape: 'I', label: 'Travi e colonne' },
  { shape: 'U', label: 'Canali' },
  { shape: 'L', label: 'Angolari' },
  { shape: 'T', label: 'Profili a T' },
  { shape: 'RHS', label: 'Tubolari rettangolari' },
  { shape: 'CHS', label: 'Tubolari tondi' },
]

export const REGION_LABEL: Record<ProfileRegion, string> = { EU: 'Europa', US: 'USA / Canada' }

export const DEFAULT_PROFILE_CODE = 'SI_IPE200'

/* ---------- archivio in memoria ---------- */

let profiles: SteelProfile[] = []
const byCode = new Map<string, SteelProfile>()
const byAlias = new Map<string, SteelProfile>()
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()

/** Normalizza un nome per il confronto: "HEA 200", "HEA200", "L 100 x 100 x 10", "L100*100*10" */
const norm = (s: string) =>
  s.toUpperCase().replace(/\*/g, 'X').replace(/\s+/g, '').replace(/(\d)\.0+(?=\D|$)/g, '$1')

type Raw = { columns: string[]; rows: (string | number)[][] }

export function loadCatalog(): Promise<void> {
  if (!loading) {
    loading = import('./data/profiles.json').then(mod => {
      const data = (mod as unknown as { default: Raw }).default
      profiles = data.rows.map(r => ({
        code: r[0] as string, tekla: r[1] as string, name: r[2] as string,
        region: r[3] as ProfileRegion, shape: r[4] as ProfileShape, series: r[5] as string,
        h: r[6] as number, b: r[7] as number, tw: r[8] as number, tf: r[9] as number,
        r: (r[10] as number) || undefined, r2: (r[11] as number) || undefined, g: (r[12] as number) || undefined,
      }))
      for (const p of profiles) {
        byCode.set(p.code, p)
        // il primo con lo stesso nome vince (i laminati a caldo precedono i formati a freddo)
        for (const k of [norm(p.name), norm(p.tekla)]) if (!byAlias.has(k)) byAlias.set(k, p)
      }
      listeners.forEach(l => l())
    })
  }
  return loading
}

export const catalogLoaded = () => profiles.length > 0
export const allProfiles = () => profiles

/** Hook: si aggiorna quando il catalogo è disponibile */
export function useCatalog(): SteelProfile[] {
  const [, setTick] = useState(0)
  useEffect(() => {
    const l = () => setTick(t => t + 1)
    listeners.add(l)
    loadCatalog()
    return () => { listeners.delete(l) }
  }, [])
  return profiles
}

/**
 * Trova un profilo per codice Maffeis o per nome (anche dai disegni salvati con le versioni
 * precedenti, es. "HEA 200", "L 100x100x10"). I tubolari non in catalogo vengono ricavati dal nome.
 */
export function findProfile(key: string): SteelProfile | undefined {
  const direct = byCode.get(key)
  if (direct) return direct
  const k = norm(key)
  const alias = byAlias.get(k) ?? byAlias.get(k.replace(/^SHS/, 'RHS'))
  if (alias) return alias
  return synthesizeTube(key)
}

const synthCache = new Map<string, SteelProfile>()
function synthesizeTube(key: string): SteelProfile | undefined {
  const m = key.replace(/\*/g, 'x').match(/^(RHS|SHS|CHS)\s*([\d.]+)x([\d.]+)(?:x([\d.]+))?$/i)
  if (!m) return undefined
  if (synthCache.has(key)) return synthCache.get(key)
  const kind = m[1].toUpperCase()
  const a = parseFloat(m[2]), b = parseFloat(m[3]), c = m[4] ? parseFloat(m[4]) : undefined
  const p: SteelProfile = kind === 'CHS'
    ? { code: key, tekla: key, name: key, region: 'EU', shape: 'CHS', series: 'CHS', h: a, b: a, tw: b, tf: b }
    : { code: key, tekla: key, name: key, region: 'EU', shape: 'RHS', series: 'RHS', h: a, b, tw: c ?? 3, tf: c ?? 3, r: (c ?? 3) * 2 }
  synthCache.set(key, p)
  return p
}

/** Serie più usate per prime; le altre seguono in ordine alfabetico */
const SERIES_PRIORITY = [
  'IPE', 'HEA', 'HEB', 'HEM', 'IPN', 'HEAA', 'HEC', 'HE x peso', 'HL', 'HLZ', 'HD', 'HP', 'UB', 'UC', 'UBP', 'J',
  'W', 'S', 'M',
  'UPN', 'UPE', 'PFC', 'C', 'MC',
  'L', 'L disuguali',
  '½ HE', 'WT', 'MT', 'ST',
  'RHS/SHS caldo', 'RHS/SHS freddo', 'HSS rettangolari',
  'CHS caldo', 'CHS freddo', 'HSS tondi', 'PIPE',
]
const rank = (s: string) => {
  const i = SERIES_PRIORITY.indexOf(s)
  return i < 0 ? SERIES_PRIORITY.length : i
}

/** Serie disponibili per regione, raggruppate per forma */
export function seriesByShape(region: ProfileRegion): { shape: ProfileShape; label: string; series: string[] }[] {
  return SHAPE_GROUPS.map(g => {
    const set = new Set<string>()
    for (const p of profiles) if (p.region === region && p.shape === g.shape) set.add(p.series)
    return { ...g, series: [...set].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)) }
  }).filter(g => g.series.length > 0)
}

export const profilesOfSeries = (region: ProfileRegion, series: string) =>
  profiles.filter(p => p.region === region && p.series === series)
