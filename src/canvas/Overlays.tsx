import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { X } from 'lucide-react'
import { round1 } from '../utils/mathUtils'

/* ======================================================
   Bacchetta magica: rende trasparenti i pixel del colore scelto
   ====================================================== */

export type WandState = {
  id: string
  originalSrc: string
  targetColor: { r: number; g: number; b: number }
  targetPixel: { x: number; y: number }
  threshold: number
  contiguous: boolean
  previewSrc: string | null
}

function computeWand(s: WandState): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      const ctx = c.getContext('2d')
      if (!ctx) return reject(new Error('canvas 2d non disponibile'))
      ctx.drawImage(img, 0, 0)
      const imgData = ctx.getImageData(0, 0, c.width, c.height)
      const data = imgData.data
      const { r: tr, g: tg, b: tb } = s.targetColor
      // soglia 0-100% della distanza massima nello spazio RGB (≈441)
      const maxD2 = (s.threshold * 4.416) ** 2
      const match = (i: number) => (data[i] - tr) ** 2 + (data[i + 1] - tg) ** 2 + (data[i + 2] - tb) ** 2 <= maxD2

      if (s.contiguous) {
        const w = c.width
        const h = c.height
        const visited = new Uint8Array(w * h)
        const stack = [s.targetPixel.y * w + s.targetPixel.x]
        while (stack.length) {
          const idx = stack.pop()!
          if (visited[idx]) continue
          visited[idx] = 1
          if (!match(idx * 4)) continue
          data[idx * 4 + 3] = 0
          const x = idx % w
          if (x > 0) stack.push(idx - 1)
          if (x < w - 1) stack.push(idx + 1)
          if (idx >= w) stack.push(idx - w)
          if (idx < w * (h - 1)) stack.push(idx + w)
        }
      } else {
        for (let i = 0; i < data.length; i += 4) if (match(i)) data[i + 3] = 0
      }
      ctx.putImageData(imgData, 0, 0)
      resolve(c.toDataURL())
    }
    img.onerror = reject
    img.src = s.originalSrc
  })
}

export function WandPanel({ state, setState, onApply }: {
  state: WandState
  setState: Dispatch<SetStateAction<WandState | null>>
  onApply: () => void
}) {
  const { threshold, contiguous, originalSrc, targetPixel } = state
  useEffect(() => {
    let cancelled = false
    const t = setTimeout(() => {
      computeWand(state).then(src => {
        if (!cancelled) setState(prev => (prev ? { ...prev, previewSrc: src } : null))
      }).catch(() => {})
    }, 60)
    return () => { cancelled = true; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threshold, contiguous, originalSrc, targetPixel.x, targetPixel.y])

  const { r, g, b } = state.targetColor
  return (
    <div className="floating-card" style={{ top: 72, left: 16, width: 250 }}>
      <div className="floating-card-title">
        <span>Bacchetta magica</span>
        <span className="swatch-preview" style={{ background: `rgb(${r},${g},${b})` }} title="Colore selezionato" />
      </div>
      <label className="range-label">
        <span>Tolleranza</span>
        <span>{threshold}%</span>
      </label>
      <input
        type="range" min={0} max={100} value={threshold}
        onChange={e => setState(p => (p ? { ...p, threshold: Number(e.target.value) } : null))}
      />
      <label className="check-label">
        <input
          type="checkbox" checked={contiguous}
          onChange={e => setState(p => (p ? { ...p, contiguous: e.target.checked } : null))}
        />
        Solo pixel contigui
      </label>
      <p className="floating-card-hint">Clic su un altro punto dell'immagine per cambiare colore.</p>
      <div className="floating-card-actions">
        <button className="btn-primary" onClick={onApply}>Applica</button>
        <button className="btn-secondary" onClick={() => setState(null)}>Annulla</button>
      </div>
    </div>
  )
}

/* ====================================================== */

export function MeasurePanel({ distance, onClose }: { distance: number; onClose: () => void }) {
  return (
    <div className="floating-card floating-card-row" style={{ top: 72, left: '50%', transform: 'translateX(-50%)' }}>
      <div>
        <div className="floating-card-label">Distanza</div>
        <div className="floating-card-value">{round1(distance)} mm</div>
      </div>
      <button className="icon-btn" onClick={onClose} title="Chiudi"><X size={16} /></button>
    </div>
  )
}

/* ====================================================== */

export function ScalePanel({ current, onApply, onCancel }: {
  current: number
  onApply: (target: number) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  const target = parseFloat(value.replace(',', '.'))
  const valid = isFinite(target) && target > 0
  return (
    <form
      className="floating-card"
      style={{ top: 72, left: '50%', transform: 'translateX(-50%)', width: 280 }}
      onSubmit={e => { e.preventDefault(); if (valid) onApply(target) }}
    >
      <div className="floating-card-title">Scala con riferimento</div>
      <div className="floating-card-label">Distanza attuale: <b>{round1(current)}</b></div>
      <label className="floating-card-label" htmlFor="scale-target">Distanza reale (mm)</label>
      <input
        id="scale-target" ref={ref} value={value} inputMode="decimal"
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') onCancel() }}
        placeholder="es. 200"
      />
      {valid && <p className="floating-card-hint">Fattore di scala: {(target / current).toFixed(3)}</p>}
      <div className="floating-card-actions">
        <button type="submit" className="btn-primary" disabled={!valid}>Applica</button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Annulla</button>
      </div>
    </form>
  )
}
