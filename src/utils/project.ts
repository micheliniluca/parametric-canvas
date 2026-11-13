import type { CanvasObject } from '../types'
import type { DrawStyle } from '../style'
import { migrateObjects } from './boltUtils'

export const PROJECT_VERSION = 1
// con "?sandbox" nell'indirizzo si usa un autosalvataggio separato (prove senza toccare il disegno reale)
const AUTOSAVE_KEY = typeof location !== 'undefined' && new URLSearchParams(location.search).has('sandbox')
  ? 'parametric-canvas:autosave:sandbox'
  : 'parametric-canvas:autosave'

export type ProjectFile = {
  app: 'parametric-canvas'
  version: number
  objects: CanvasObject[]
  view: { x: number; y: number }
  zoom: number
  gridSize: number
  nextBubbleNumber: number
  style?: DrawStyle
}

export const serializeProject = (p: Omit<ProjectFile, 'app' | 'version'>): string =>
  JSON.stringify({ app: 'parametric-canvas', version: PROJECT_VERSION, ...p } satisfies ProjectFile)

export const parseProject = (text: string): ProjectFile => {
  const data = JSON.parse(text)
  if (!data || !Array.isArray(data.objects)) throw new Error('File non valido: manca l\'elenco degli oggetti')
  return {
    app: 'parametric-canvas',
    version: data.version ?? 1,
    objects: migrateObjects(data.objects),
    view: data.view ?? { x: 0, y: 0 },
    zoom: data.zoom ?? 1,
    gridSize: data.gridSize ?? 50,
    nextBubbleNumber: data.nextBubbleNumber ?? 1,
    style: data.style,
  }
}

/* ---------- Salvataggio su file ---------- */

type FileHandle = { createWritable: () => Promise<{ write: (d: string) => Promise<void>; close: () => Promise<void> }>; name: string }
let currentHandle: FileHandle | null = null

export const resetFileHandle = () => { currentHandle = null }

/** Salva su file. Usa la File System Access API se disponibile (Chrome/Edge), altrimenti scarica. */
export async function saveProjectFile(content: string, saveAs = false): Promise<string | null> {
  const w = window as unknown as { showSaveFilePicker?: (o: unknown) => Promise<FileHandle> }
  if (w.showSaveFilePicker) {
    try {
      if (!currentHandle || saveAs) {
        currentHandle = await w.showSaveFilePicker({
          suggestedName: 'disegno.pcanvas.json',
          types: [{ description: 'Progetto Parametric Canvas', accept: { 'application/json': ['.json'] } }],
        })
      }
      const writable = await currentHandle.createWritable()
      await writable.write(content)
      await writable.close()
      return currentHandle.name
    } catch (err) {
      if ((err as Error).name === 'AbortError') return null
      throw err
    }
  }
  downloadText(content, 'disegno.pcanvas.json', 'application/json')
  return 'disegno.pcanvas.json'
}

export function openProjectFile(): Promise<ProjectFile | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      file.text().then(t => {
        currentHandle = null
        resolve(parseProject(t))
      }).catch(reject)
    }
    input.click()
  })
}

export function downloadText(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* ---------- Autosalvataggio nel browser (IndexedDB: regge anche molte immagini) ---------- */

const DB_NAME = 'parametric-canvas'
const STORE = 'kv'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function loadAutosave(): Promise<ProjectFile | null> {
  try {
    const db = await openDb()
    const raw = await new Promise<string | undefined>((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(AUTOSAVE_KEY)
      req.onsuccess = () => resolve(req.result as string | undefined)
      req.onerror = () => reject(req.error)
    })
    db.close()
    return raw ? parseProject(raw) : null
  } catch {
    return null
  }
}

export async function writeAutosave(content: string): Promise<boolean> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(content, AUTOSAVE_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
    return true
  } catch {
    return false
  }
}
