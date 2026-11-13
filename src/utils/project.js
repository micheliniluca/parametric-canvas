import { migrateObjects } from './boltUtils';
export const PROJECT_VERSION = 1;
// con "?sandbox" nell'indirizzo si usa un autosalvataggio separato (prove senza toccare il disegno reale)
const AUTOSAVE_KEY = typeof location !== 'undefined' && new URLSearchParams(location.search).has('sandbox')
    ? 'parametric-canvas:autosave:sandbox'
    : 'parametric-canvas:autosave';
export const serializeProject = (p) => JSON.stringify({ app: 'parametric-canvas', version: PROJECT_VERSION, ...p });
export const parseProject = (text) => {
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.objects))
        throw new Error('File non valido: manca l\'elenco degli oggetti');
    return {
        app: 'parametric-canvas',
        version: data.version ?? 1,
        objects: migrateObjects(data.objects),
        view: data.view ?? { x: 0, y: 0 },
        zoom: data.zoom ?? 1,
        gridSize: data.gridSize ?? 50,
        nextBubbleNumber: data.nextBubbleNumber ?? 1,
        style: data.style,
    };
};
let currentHandle = null;
export const resetFileHandle = () => { currentHandle = null; };
/** Salva su file. Usa la File System Access API se disponibile (Chrome/Edge), altrimenti scarica. */
export async function saveProjectFile(content, saveAs = false) {
    const w = window;
    if (w.showSaveFilePicker) {
        try {
            if (!currentHandle || saveAs) {
                currentHandle = await w.showSaveFilePicker({
                    suggestedName: 'disegno.pcanvas.json',
                    types: [{ description: 'Progetto Parametric Canvas', accept: { 'application/json': ['.json'] } }],
                });
            }
            const writable = await currentHandle.createWritable();
            await writable.write(content);
            await writable.close();
            return currentHandle.name;
        }
        catch (err) {
            if (err.name === 'AbortError')
                return null;
            throw err;
        }
    }
    downloadText(content, 'disegno.pcanvas.json', 'application/json');
    return 'disegno.pcanvas.json';
}
export function openProjectFile() {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = () => {
            const file = input.files?.[0];
            if (!file)
                return resolve(null);
            file.text().then(t => {
                currentHandle = null;
                resolve(parseProject(t));
            }).catch(reject);
        };
        input.click();
    });
}
export function downloadText(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/* ---------- Autosalvataggio nel browser (IndexedDB: regge anche molte immagini) ---------- */
const DB_NAME = 'parametric-canvas';
const STORE = 'kv';
function openDb() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
export async function loadAutosave() {
    try {
        const db = await openDb();
        const raw = await new Promise((resolve, reject) => {
            const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(AUTOSAVE_KEY);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        db.close();
        return raw ? parseProject(raw) : null;
    }
    catch {
        return null;
    }
}
export async function writeAutosave(content) {
    try {
        const db = await openDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put(content, AUTOSAVE_KEY);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        db.close();
        return true;
    }
    catch {
        return false;
    }
}
