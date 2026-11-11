#!/usr/bin/env node
/**
 * Importa il database profili (CSV Maffeis) in un file JSON compatto per il sito.
 *
 * Uso:  node scripts/import-profiles.mjs "C:\percorso\profiles.csv"
 *
 * Si tengono solo codici, forma, dimensioni per il disegno e peso (kg/m):
 * le caratteristiche d'inerzia non servono al sito e lo appesantirebbero.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const src = process.argv[2]
if (!src) {
  console.error('Specificare il percorso del CSV, es.: node scripts/import-profiles.mjs profiles.csv')
  process.exit(1)
}
const out = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/profiles.json')

/* ---------- lettura CSV (virgola, campi eventualmente tra virgolette) ---------- */
function parseCsv(text) {
  const rows = []
  let row = [], field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
    } else field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows
}

const [header, ...data] = parseCsv(readFileSync(src, 'utf8').replace(/^\uFEFF/, ''))
const col = name => {
  const i = header.indexOf(name)
  if (i < 0) throw new Error(`Colonna mancante nel CSV: ${name}`)
  return i
}
const C = Object.fromEntries(
  ['MaffeisName', 'TeklaName', 'Name', 'StandardNames', 'Shape', 'ShapeSubType', 'UnitSystem',
    'G', 'Height', 'Width', 'WebThickness', 'FlangeThickness', 'Fillet1', 'Fillet2'].map(n => [n, col(n)]),
)

/* ---------- classificazione ---------- */
const SHAPE = { I: 'I', C: 'U', L: 'L', T: 'T', RHS: 'RHS', CHS: 'CHS' }

const region = r => {
  const std = r[C.StandardNames]
  if (/^(EN|DIN)/.test(std)) return 'EU'
  if (/^(AISC|ASTM|CISC)/.test(std)) return 'US'
  if (r[C.UnitSystem] === 'Imperial') return 'US'
  return r[C.ShapeSubType] === 'W' ? 'US' : 'EU'
}

/** Serie mostrata nel catalogo */
const series = (r, reg) => {
  const sub = r[C.ShapeSubType]
  const name = r[C.Name]
  if (sub === 'HL') return 'HL'
  if (sub === 'HE') {
    // HE 100 A → HEA, HE 100 AA → HEAA…; le serie pesanti "HE 1000 x 249" restano in "HE x peso"
    const last = name.trim().split(/\s+/).pop()
    return /^[A-Z]+$/.test(last) ? sub + last : `${sub} x peso`
  }
  if (sub.includes('\uFFFD') || /^1\/2/.test(name)) return '½ HE'
  if (sub === 'LU') return 'L disuguali'
  if (sub === 'HR' && r[C.Shape] === 'L') return 'L'
  if (sub === 'RHS_HR' || sub === 'SHS_HR' || sub === 'SHS_HF') return 'RHS/SHS caldo'
  if (sub === 'RHS_CF' || sub === 'SHS_CF') return reg === 'US' ? 'HSS rettangolari' : 'RHS/SHS freddo'
  if (sub === 'CHS_HR') return 'CHS caldo'
  if (sub === 'CHS_CF') return 'CHS freddo'
  if (sub === 'HSS_CF') return 'HSS tondi'
  return sub
}

const num = s => {
  const v = parseFloat(s)
  return Number.isFinite(v) ? Math.round(v * 1000) / 1000 : 0
}

const rows = []
const skipped = []
for (const r of data) {
  if (r.length < header.length - 1) continue
  const shape = SHAPE[r[C.Shape]]
  const h = num(r[C.Height])
  if (!shape || !h) { skipped.push(r[C.MaffeisName]); continue }
  const reg = region(r)
  const tf = num(r[C.FlangeThickness])
  // tubolari: un solo spessore; tondi: larghezza = diametro
  const tw = num(r[C.WebThickness]) || tf
  const b = num(r[C.Width]) || h
  rows.push([
    r[C.MaffeisName],
    r[C.TeklaName].replace(/\uFFFD/g, '½'),
    r[C.Name],
    reg,
    shape,
    series(r, reg),
    h, b, tw, tf,
    num(r[C.Fillet1]),
    num(r[C.Fillet2]),
    num(r[C.G]),
  ])
}

// ordinamento naturale per serie e nome (es. HE 100 A < HE 120 A < HE 1000 A)
const collator = new Intl.Collator('it', { numeric: true, sensitivity: 'base' })
rows.sort((a, b) => collator.compare(a[5], b[5]) || collator.compare(a[2], b[2]) || collator.compare(a[0], b[0]))

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify({
  source: 'Database profili Maffeis (CSV)',
  generated: new Date().toISOString().slice(0, 10),
  columns: ['code', 'tekla', 'name', 'region', 'shape', 'series', 'h', 'b', 'tw', 'tf', 'r1', 'r2', 'g'],
  rows,
}))
console.log(`Profili importati: ${rows.length} → ${out}`)
if (skipped.length) console.log(`Saltati (forma o altezza mancante): ${skipped.length}`, skipped.slice(0, 10))
