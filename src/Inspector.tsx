import { CanvasObject } from './types'
import { Dispatch, SetStateAction } from 'react'
import { IPE_CATALOG } from './profiles'

type Props = {
  object: CanvasObject | null
  setObjects: Dispatch<SetStateAction<CanvasObject[]>>
}

/* type Props = {
  drawingPolylineRef: React.MutableRefObject<{
    points: { x: number; y: number }[] 
  } | null>
} */


export function Inspector({ object, setObjects }: Props) {
  if (!object) {
    return (
      <div className="inspector">
        <h3>Nessuna selezione</h3>
      </div>
    )
  }

  const update = <K extends keyof CanvasObject>(key: K, value: CanvasObject[K]) => {
    setObjects(objs =>
      objs.map(o =>
        o.id === object.id
          ? { ...o, [key]: value }
          : o
      )
    )
  }

  return (
    <div className="inspector">
      <h3>Oggetto: {object.type}</h3>

      {/* POSIZIONE */}
      <label>
        X
        <input
          type="number"
          value={object.x}
          onChange={e => update('x', Number(e.target.value))}
        />
      </label>

      <label>
        Y
        <input
          type="number"
          value={object.y}
          onChange={e => update('y', Number(e.target.value))}
        />
      </label>

      <hr />

        {object.type === 'profile' && (
        <>
            <label>
            Profilo
            <select
                value={object.profileName}
                onChange={e => update('profileName', e.target.value)}
            >
                {IPE_CATALOG.map(p => (
                <option key={p.name} value={p.name}>{p.name}</option>
                ))}
            </select>
            </label>

            <label>
            Scala
            <input
                type="number"
                step={0.1}
                value={object.scale}
                onChange={e => update('scale', Number(e.target.value))}
            />
            </label>
        </>
        )}

      {/* BORDO */}
      <label>
        Colore bordo
        <input
          type="color"
          value={object.stroke ?? '#000000'}
          onChange={e => update('stroke', e.target.value)}
        />
      </label>

      <hr />

      {/* RIEMPIMENTO */}
      <label>
        <input
          type="checkbox"
          checked={object.fillEnabled === true}
          onChange={e => update('fillEnabled', e.target.checked)}
        />
        Riempimento attivo
      </label>

      {object.fillEnabled === true && (
        <label>
          Colore riempimento
          <input
            type="color"
            value={object.fillColor ?? '#ff0000'}
            onChange={e => update('fillColor', e.target.value)}
          />
        </label>
      )}

      <hr />

      {/* PARAMETRI SPECIFICI */}
      {'width' in object && (
        <label>
          Larghezza
          <input
            type="number"
            value={object.width}
            onChange={e => update('width', Number(e.target.value))}
          />
        </label>
      )}

      {'height' in object && (
        <label>
          Altezza
          <input
            type="number"
            value={object.height}
            onChange={e => update('height', Number(e.target.value))}
          />
        </label>
      )}

      {'radius' in object && (
        <label>
          Raggio
          <input
            type="number"
            value={object.radius}
            onChange={e => update('radius', Number(e.target.value))}
          />
        </label>
      )}

      {'text' in object && (
        <label>
          Testo
          <input
            type="text"
            value={object.text}
            onChange={e => update('text', e.target.value)}
          />
        </label>
      )}
    </div>
  )
}