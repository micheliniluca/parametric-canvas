/** Stesso foglio di stile importato in index.css */
const FONT_CSS_URL = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap'
const FONT_STACK = "'Plus Jakarta Sans', Inter, Arial, Helvetica, sans-serif"

const toDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(r.result as string)
  r.onerror = reject
  r.readAsDataURL(blob)
})

let fontFacesCache: Promise<string> | null = null

/**
 * @font-face del carattere dell'app con i file incorporati (data URL).
 * Un SVG trasformato in immagine non vede i font della pagina né carica file esterni:
 * senza questo i testi uscirebbero nel carattere predefinito (Times).
 * Si tengono solo i sottoinsiemi latin e latin-ext; se la rete manca resta il ripiego su Arial.
 */
function embeddedFontFaces(): Promise<string> {
  fontFacesCache ??= (async () => {
    const css = await (await fetch(FONT_CSS_URL)).text()
    const blocks = [...css.matchAll(/\/\*\s*(latin(?:-ext)?)\s*\*\/\s*(@font-face\s*{[^}]*})/g)].map(m => m[2])
    const urls = [...new Set(blocks.flatMap(b => [...b.matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1])))]
    const data = new Map(await Promise.all(urls.map(async u => [u, await toDataUrl(await (await fetch(u)).blob())] as const)))
    return blocks.map(b => b.replace(/url\((https:[^)]+)\)/g, (_, u: string) => `url(${data.get(u)})`)).join('\n')
  })().catch(err => {
    console.warn('Carattere non incorporato nello screenshot:', err)
    fontFacesCache = null
    return ''
  })
  return fontFacesCache
}

/** Rasterizza la vista corrente del canvas in PNG (esclude maniglie e bozze, griglia opzionale). */
export async function renderSvgToPng(svgElement: SVGSVGElement, mode: 'grid' | 'white' | 'transparent'): Promise<Blob> {
  const clone = svgElement.cloneNode(true) as SVGSVGElement
  clone.querySelector('#ui-layer')?.remove()
  if (mode !== 'grid') clone.querySelector('#grid-layer')?.remove()

  // il carattere arriva dalla pagina per ereditarietà: nell'immagine va dichiarato e incorporato
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  style.textContent = `${await embeddedFontFaces()}\nsvg, text { font-family: ${FONT_STACK}; }`
  clone.insertBefore(style, clone.firstChild)
  clone.style.fontFamily = FONT_STACK

  const bbox = svgElement.getBoundingClientRect()
  clone.setAttribute('width', String(bbox.width))
  clone.setAttribute('height', String(bbox.height))
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.style.background = 'none'

  const svgData = new XMLSerializer().serializeToString(clone)
  const url = URL.createObjectURL(new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' }))

  // risoluzione almeno doppia per uno screenshot nitido
  const scale = Math.max(2, window.devicePixelRatio || 1)
  const canvas = document.createElement('canvas')
  canvas.width = bbox.width * scale
  canvas.height = bbox.height * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D non disponibile')
  if (mode !== 'transparent') {
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const img = new Image()
  try {
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = url
    })
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  } finally {
    URL.revokeObjectURL(url)
  }

  const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'))
  if (!blob) throw new Error('Conversione PNG non riuscita')
  return blob
}

/**
 * Copia la vista negli appunti come PNG.
 * La scrittura parte subito (con una Promise) per non perdere l'attivazione utente.
 * Se gli appunti non sono disponibili scarica il PNG.
 */
export async function captureSvgToClipboard(
  svgElement: SVGSVGElement,
  mode: 'grid' | 'white' | 'transparent' = 'white',
): Promise<'copied' | 'downloaded' | 'failed'> {
  const pngPromise = renderSvgToPng(svgElement, mode)
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngPromise })])
    return 'copied'
  } catch (error) {
    console.warn('Appunti non disponibili, scarico il PNG:', error)
    try {
      const blob = await pngPromise
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'screenshot.png'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      return 'downloaded'
    } catch (err) {
      console.error('Errore screenshot:', err)
      return 'failed'
    }
  }
}
