
import { useState } from 'react'
import type { ReactNode } from 'react'
import type { CableObject, CanvasObject, ClampObject, CushionObject, KederSpec, PolylineObject, DeckObject, EnvelopeObject, PartObject, PersonId, PersonObject, ScrewObject, SeamObject, WeldObject } from './types'
import type { ScreenshotMode } from './App'
import { Catalog } from './components/Catalog'
import { MaffeisLogo } from './components/MaffeisLogo'
import { findProfile, profilesOfSeries, seriesByShape, useCatalog } from './profiles'
import { BOLT_DIAMETERS, BOLT_GRADES, boltDims, boltLabel, boltLength } from './utils/boltUtils'
import {
  FLC_SIZES, cableLabel, cableMass, cableNRd, cableSpan, flcRope, ropeLength, socketCount, ttfSocket,
} from './utils/cableUtils'
import { exportToDXF } from './utils/export'
import {
  DECKS, STUD_SIZES, deckLabel, deckLength, deckProfile, deckSheets, deckSpan, deckSteelMass, deckThickness, deckWidth,
  slabVolume, studCount, studSpec,
} from './utils/deckUtils'
import {
  WELD_KINDS, WELD_PROCESSES, defaultBeadRot, filletLeg, filletThroat, isButt, weldLabel,
} from './utils/weldUtils'
import { HEAD_LABEL, POINT_LABEL, SCREW_TYPES, defaultScrew, screwDims, screwLabel, screwType } from './utils/screwUtils'
import { AQ, ENVELOPE_KINDS, SEAM_TYPES, envelopeLabel, envelopeThickness, seamLabel } from './utils/envelopeUtils'
import { defaultLeaderTip, leaderWidth } from './utils/leaderUtils'
import { downloadText } from './utils/project'
import { styleCaps } from './style'
import { round1 } from './utils/mathUtils'
import { HATCHES, HATCH_GROUPS, hatchDef } from './utils/hatchUtils'
import { PEOPLE, personDef } from './utils/peopleUtils'
import { partDef, partSourceLabel, useParts } from './utils/partsLib'
import { KEDER_DIAMETERS } from './utils/kederUtils'
import { CLAMP_BOLTS, CLAMP_PLATES, clampDims, clampLabel } from './utils/clampUtils'
import { cushionFrame, cushionLabel } from './utils/cushionUtils'
import { INOX_SIZES, inoxFork, inoxRopeLength, inoxTurnbuckle, turnbuckleLength } from './utils/ropeInox'
import { PartCatalog } from './components/PartCatalog'
import { HatchPattern } from './canvas/HatchPattern'
import {
  Ban, Boxes, Database, Download, SlidersHorizontal, MousePointerClick,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
} from 'lucide-react'
import type { AlignKind } from './canvas/geometry'
import { isEndpoint, textSize } from './canvas/geometry'

type Props = {
  selected: CanvasObject | null
  /** Tutti gli oggetti selezionati (anche uno solo) */
  selectedObjs: CanvasObject[]
  onAlign: (kind: AlignKind) => void
  onGroup: () => void
  onUngroup: () => void
  objects: CanvasObject[]
  onChange: (patch: Partial<CanvasObject>) => void
  /** Modifica tutti gli oggetti selezionati */
  onChangeAll: (patch: Partial<CanvasObject>) => void
  onAddObject: (obj: CanvasObject) => void
  getCenter: () => { x: number; y: number }
  screenshotMode: ScreenshotMode
  setScreenshotMode: (m: ScreenshotMode) => void
  onScreenshot: () => void
  tab: PanelTab
  setTab: (t: PanelTab) => void
  /** Profilo in attesa di essere inserito con un clic sulla tela (strumento Profilo attivo) */
  placingProfileCode: string | null
  onPickProfile: (code: string) => void
  /** Componente membrana in attesa di essere inserito (strumento Componente attivo) */
  placingPartId: string | null
  onPickPart: (id: string) => void
  /** Esplode il componente selezionato */
  onExplode: () => void
}

export type PanelTab = 'props' | 'catalog' | 'parts' | 'export'

const TYPE_LABEL: Record<CanvasObject['type'], string> = {
  rect: 'Rettangolo', circle: 'Cerchio', text: 'Testo', profile: 'Profilo', image: 'Immagine',
  symbol: 'Bollino', arrow: 'Freccia', bolt: 'Bullone', quote: 'Quota', polyline: 'Linea', cable: 'Cavo FLC', deck: 'Lamiera grecata', weld: 'Saldatura',
  envelope: 'Involucro', seam: 'Copertura aggraffata', screw: 'Vite', person: 'Persona', part: 'Componente', clamp: 'Morsetto radiale', cushion: 'Cuscino ETFE',
}

const Field = ({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) => (
  <label className={`prop-field ${full ? 'full-width' : ''}`}>
    <span>{label}</span>
    {children}
  </label>
)

/**
 * Campo numerico: mentre si scrive mostra esattamente quello che si digita
 * (es. "1" verso "10") e aggiorna l'oggetto solo con valori validi;
 * il minimo viene applicato quando si esce dal campo o si preme Invio.
 */
function Num({ value, onChange, min, step }: { value: number; onChange: (v: number) => void; min?: number; step?: number }) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    if (draft === null) return
    const v = parseFloat(draft.replace(',', '.'))
    if (!isNaN(v)) onChange(min !== undefined ? Math.max(min, v) : v)
    setDraft(null)
  }
  return (
    <input
      type="text" inputMode="decimal" step={step}
      value={draft ?? String(round1(value))}
      onFocus={e => e.target.select()}
      onChange={e => {
        setDraft(e.target.value)
        const v = parseFloat(e.target.value.replace(',', '.'))
        // anteprima immediata solo se il valore è già valido
        if (!isNaN(v) && (min === undefined || v >= min)) onChange(v)
      }}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setDraft(null)
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault()
          const d = (step ?? 1) * (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1)
          const next = round1(value + d)
          onChange(min !== undefined ? Math.max(min, next) : next)
          setDraft(null)
        }
      }}
    />
  )
}

/** Pannello laterale: proprietà dell'oggetto selezionato, catalogo profili ed esportazione */
export function RightPanel({
  selected, objects, onChange, onChangeAll, screenshotMode, setScreenshotMode, onScreenshot,
  tab, setTab, placingProfileCode, onPickProfile, placingPartId, onPickPart, onExplode, selectedObjs, onAlign, onGroup, onUngroup,
}: Props) {
  const placing = placingProfileCode ? findProfile(placingProfileCode) : undefined

  const handleExport = () => {
    downloadText(exportToDXF(objects), 'disegno.dxf', 'application/dxf')
  }

  return (
    <div className="right-panel">
      <div className="rp-tabs">
        <button className={tab === 'props' ? 'active' : ''} onClick={() => setTab('props')}>
          <SlidersHorizontal size={15} /> Proprietà
        </button>
        <button className={tab === 'catalog' ? 'active' : ''} onClick={() => setTab('catalog')}>
          <Database size={15} /> Profili
        </button>
        <button className={tab === 'parts' ? 'active' : ''} onClick={() => setTab('parts')}>
          <Boxes size={15} /> Componenti
        </button>
        <button className={tab === 'export' ? 'active' : ''} onClick={() => setTab('export')}>
          <Download size={15} /> Esporta
        </button>
      </div>

      <div className="rp-content">
        {tab === 'catalog' && (
          <>
            {placing && (
              <div className="placing-banner">
                Clic sulla tela per inserire <b>{placing.name}</b>
                <span>Esc per annullare</span>
              </div>
            )}
            {selected?.type === 'profile' && !placing && (
              <div className="placing-banner">
                La scelta sostituisce il profilo selezionato
                <span>Esc per deselezionare e inserirne uno nuovo</span>
              </div>
            )}
            <Catalog
              current={selected?.type === 'profile' ? findProfile(selected.profileName) : placing}
              onSelect={profile => {
                // con un profilo selezionato la scelta lo sostituisce; altrimenti si inserisce con un clic sulla tela
                if (selected?.type === 'profile') onChange({ profileType: profile.series, profileName: profile.code })
                else onPickProfile(profile.code)
              }}
            />
          </>
        )}

        {tab === 'parts' && (
          <PartCatalog
            placingId={placingPartId}
            current={selected?.type === 'part' ? selected.part : undefined}
            onSelect={def => {
              // con un componente selezionato la scelta lo sostituisce; altrimenti si inserisce con un clic sulla tela
              if (selected?.type === 'part') onChange({ part: def.id, name: def.n, box: def.b })
              else onPickPart(def.id)
            }}
          />
        )}

        {tab === 'export' && (
          <div className="export-panel">
            <section>
              <h4>Screenshot negli appunti</h4>
              <div className="segmented">
                {(['white', 'grid', 'transparent'] as const).map(m => (
                  <button key={m} className={screenshotMode === m ? 'active' : ''} onClick={() => setScreenshotMode(m)}>
                    {m === 'white' ? 'Bianco' : m === 'grid' ? 'Con griglia' : 'Trasparente'}
                  </button>
                ))}
              </div>
              <button className="btn-primary wide" onClick={onScreenshot}>Copia screenshot</button>
            </section>
            <section>
              <h4>DXF per CAD</h4>
              <p className="muted">
                Tutto il disegno in millimetri, sui layer del template Maffeis (ME_STEEL, ME_ALUMINIUM, ME_BOLT, ME_CABLE,
                ME_ANNO_TEXTS…) con colori e tipi di linea DaLayer. Immagini e riempimenti non vengono esportati.
              </p>
              <button className="btn-secondary wide" onClick={handleExport}>Esporta DXF</button>
            </section>
          </div>
        )}

        {tab === 'props' && selectedObjs.length > 1 && (
          <MultiProps objs={selectedObjs} onAlign={onAlign} onGroup={onGroup} onUngroup={onUngroup} onChangeAll={onChangeAll} />
        )}

        {tab === 'props' && selectedObjs.length === 0 && (
          <div className="no-selection">
            <MousePointerClick size={40} strokeWidth={1.25} />
            <p>Seleziona un oggetto per modificarne le proprietà.</p>
            <p className="muted">Colori e stili sono nella barra sopra il disegno.</p>
          </div>
        )}

        {tab === 'props' && selected && <ObjectProps o={selected} onChange={onChange} onExplode={onExplode} />}
      </div>

      <div className="rp-footer">
        <MaffeisLogo height={20} />
      </div>
    </div>
  )
}

/** Identificazione del profilo: nome, codici e peso, copiabili con un clic */
function ProfileHeader({ code, length }: { code: string; length: number }) {
  useCatalog()
  const p = findProfile(code)
  if (!p) return <p className="muted">Profilo "{code}" non trovato nel catalogo.</p>
  const copy = (t: string) => { navigator.clipboard?.writeText(t).catch(() => {}) }
  return (
    <div className="profile-id">
      <div className="profile-id-name">{p.name}</div>
      <button type="button" className="code-chip" title="Copia codice Maffeis" onClick={() => copy(p.code)}>
        <span>Maffeis</span>{p.code}
      </button>
      <button type="button" className="code-chip" title="Copia nome Tekla" onClick={() => copy(p.tekla)}>
        <span>Tekla</span>{p.tekla}
      </button>
      <div className="muted">
        {p.h} × {p.b} · tw {p.tw} · tf {p.tf}{p.r ? ` · r ${p.r}` : ''}
        {p.g ? <> · <b>{p.g} kg/m</b>{length > 0 ? ` · ${round1((p.g * length) / 1000)} kg su ${round1(length)} mm` : ''}</> : null}
      </div>
    </div>
  )
}

/** Cavo FLC: taglia, forcelle alle estremità A e B, lunghezze e resistenze */
function CableProps({ o, onChange }: { o: CableObject; onChange: (patch: Partial<CanvasObject>) => void }) {
  const rope = flcRope(o.size)
  const sock = ttfSocket(o.size)
  const span = cableSpan(o)
  const n = socketCount(o)
  // cambia l'interasse spostando l'estremità B lungo l'asse
  const setSpan = (L: number) => {
    const u = span > 0 ? { x: (o.x2 - o.x1) / span, y: (o.y2 - o.y1) / span } : { x: 1, y: 0 }
    onChange({ x2: o.x1 + u.x * L, y2: o.y1 + u.y * L })
  }
  const swap = () => onChange({
    x1: o.x2, y1: o.y2, x2: o.x1, y2: o.y1, startSocket: o.endSocket, endSocket: o.startSocket,
  })
  return (
    <>
      <div className="profile-id">
        <div className="profile-id-name">{cableLabel(o)}</div>
        <div className="muted">
          Ø {rope.d} · A {rope.A} mm² · EA {rope.EA} MN · <b>{rope.mass} kg/m</b>
        </div>
      </div>
      <div className="prop-grid">
        <Field label="Fune">
          <select value={o.size} onChange={e => onChange({ size: Number(e.target.value) })}>
            {FLC_SIZES.map(d => <option key={d} value={d}>FLC {d}</option>)}
          </select>
        </Field>
        <Field label="Interasse (mm)">
          <Num value={span} min={1} onChange={setSpan} />
        </Field>
      </div>

      <h4>Forcelle TTF {sock.size}</h4>
      <div className="prop-grid">
        <label className="check-label">
          <input type="checkbox" checked={o.startSocket} onChange={e => onChange({ startSocket: e.target.checked })} />
          Estremità A
        </label>
        <label className="check-label">
          <input type="checkbox" checked={o.endSocket} onChange={e => onChange({ endSocket: e.target.checked })} />
          Estremità B
        </label>
        <button type="button" className="btn-secondary full-width" onClick={swap}>Inverti A ↔ B</button>
        <p className="muted full-width" style={{ margin: 0 }}>
          A è il primo punto disegnato, B il secondo: sulla tela li vedi nei cerchietti quando il cavo è selezionato.
        </p>
      </div>

      <table className="data-table">
        <tbody>
          <tr><th>Lunghezza fune</th><td>{round1(ropeLength(o))} mm{n ? ` (interasse − ${n}×F)` : ''}</td></tr>
          <tr><th>Peso</th><td>{round1(cableMass(o))} kg</td></tr>
          <tr><th>Fuk / FRd fune</th><td>{rope.Fuk} / {rope.FRd} kN</td></tr>
          {n > 0 && <tr><th>Nuk / NRd forcella</th><td>{sock.Nuk} / {sock.NRd} kN</td></tr>}
          <tr><th>NRd tirante</th><td><b>{cableNRd(o)} kN</b></td></tr>
          {n > 0 && (
            <>
              <tr><th>Forcella C · F · E</th><td>{sock.C} · {sock.F} · {sock.E} mm</td></tr>
              <tr><th>Foro perno</th><td>Ø {sock.Dhole} mm</td></tr>
              <tr><th>Apertura T</th><td>{sock.Tmin}–{sock.Tmax} mm (S max {sock.Smax})</td></tr>
              <tr><th>Massa forcella</th><td>{sock.mass} kg</td></tr>
            </>
          )}
        </tbody>
      </table>
      <p className="muted" style={{ margin: 0 }}>Catalogo Redaelli · FRd = Fuk / 1,5 (EN 1993-1-11, γR = 1,0).</p>

      <div className="prop-grid">
        <label className="check-label full-width">
          <input type="checkbox" checked={o.showLabel !== false} onChange={e => onChange({ showLabel: e.target.checked })} />
          Mostra designazione sul disegno
        </label>
      </div>
    </>
  )
}

/** Lamiera grecata: profilo, spessore, vista, larghezza/lunghezza, getto */
function WeldProps({ o, onChange }: { o: WeldObject; onChange: (patch: Partial<CanvasObject>) => void }) {
  const iso = o.standard === 'iso'
  const butt = isButt(o)
  const r05 = (v: number) => Math.round(v * 2) / 2
  // cambiando norma il cordone resta lo stesso: in AWS si indica il lato, in ISO la gola
  const setStandard = (standard: WeldObject['standard']) => {
    if (standard === o.standard) return
    if (butt || !(o.size > 0)) return onChange({ standard })
    onChange(standard === 'aws'
      ? { standard, size: r05(filletLeg(o)) }
      : { standard, sizeRef: 'a', size: r05(filletLeg(o) / Math.SQRT2) })
  }
  // passando tra angolo e testa a testa cambia il significato dell'orientamento
  const setKind = (kind: WeldObject['kind']) => {
    const patch: Partial<WeldObject> = { kind }
    if ((kind === 'fillet') !== (o.kind === 'fillet')) {
      patch.beadRot = defaultBeadRot(kind, { x: o.x1, y: o.y1 }, { x: o.x2, y: o.y2 })
      patch.beadFlip = false
      patch.size = kind === 'fillet' ? 5 : 0
    }
    onChange(patch as Partial<CanvasObject>)
  }
  const setSizeRef = (sizeRef: 'a' | 'z') => {
    if (sizeRef === (o.sizeRef ?? 'a')) return
    const z = filletLeg(o)
    onChange({ sizeRef, size: o.size > 0 ? r05(sizeRef === 'a' ? z / Math.SQRT2 : z) : 0 })
  }
  const n = o.count ?? 0
  const both = o.side === 'both'
  const sizeLabel = butt ? (iso ? 'Penetrazione s (mm)' : 'Profondità (mm)') : iso ? `${o.sizeRef ?? 'a'} (mm)` : 'Lato (mm)'
  return (
    <>
      <div className="profile-id">
        <div className="profile-id-name">{weldLabel(o)}</div>
        <div className="muted">
          {iso ? 'ISO 2553 (sistema A)' : 'AWS A2.4'}
          {!butt && <> · gola a {round1(filletThroat(o))} · lato z {round1(filletLeg(o))} mm</>}
        </div>
      </div>
      <div className="prop-grid">
        <Field label="Norma" full>
          <div className="segmented">
            {([['iso', 'ISO 2553'], ['aws', 'AWS A2.4']] as const).map(([v, l]) => (
              <button key={v} type="button" className={o.standard === v ? 'active' : ''} onClick={() => setStandard(v)}>{l}</button>
            ))}
          </div>
        </Field>
        <Field label="Tipo" full>
          <select value={o.kind} onChange={e => setKind(e.target.value as WeldObject['kind'])}>
            {WELD_KINDS.map(k => <option key={k.id} value={k.id}>{both ? k.both : k.label}</option>)}
          </select>
        </Field>
        <Field label="Lato" full>
          <div className="segmented">
            {([['arrow', 'Lato freccia'], ['other', 'Lato opposto'], ['both', 'Entrambi']] as const).map(([v, l]) => (
              <button key={v} type="button" className={o.side === v ? 'active' : ''} onClick={() => onChange({ side: v })}>{l}</button>
            ))}
          </div>
        </Field>
      </div>

      <h4>Quote</h4>
      <div className="prop-grid">
        {!butt && iso && (
          <Field label="Quota">
            <select value={o.sizeRef ?? 'a'} onChange={e => setSizeRef(e.target.value as 'a' | 'z')}>
              <option value="a">a · gola</option>
              <option value="z">z · lato</option>
            </select>
          </Field>
        )}
        <Field label={sizeLabel}>
          <Num value={o.size} min={0} onChange={v => onChange({ size: v })} />
        </Field>
        <Field label="Lunghezza l (mm)">
          <Num value={o.length ?? 0} min={0} onChange={v => onChange({ length: v })} />
        </Field>
        <Field label="Tratti n">
          <Num value={n} min={0} onChange={v => onChange({ count: Math.round(v) })} />
        </Field>
        {n > 1 && (
          <Field label={iso ? 'Distanza e (mm)' : 'Interspazio (mm)'}>
            <Num value={o.gap ?? 0} min={0} onChange={v => onChange({ gap: v })} />
          </Field>
        )}
        {n > 1 && both && (
          <label className="check-label">
            <input type="checkbox" checked={!!o.staggered} onChange={e => onChange({ staggered: e.target.checked })} />
            Tratti sfalsati
          </label>
        )}
        <p className="muted full-width" style={{ margin: 0 }}>
          0 = quota non indicata. {n > 1
            ? (iso ? 'A tratti: n × l (e).' : 'A tratti: lunghezza-passo.')
            : 'Con 2 o più tratti il cordone diventa a tratti.'}
        </p>
      </div>

      <h4>Simboli</h4>
      <div className="prop-grid">
        <label className="check-label">
          <input type="checkbox" checked={!!o.allAround} onChange={e => onChange({ allAround: e.target.checked })} />
          Tutto intorno
        </label>
        <label className="check-label">
          <input type="checkbox" checked={!!o.field} onChange={e => onChange({ field: e.target.checked })} />
          In opera
        </label>
        <Field label="Finitura">
          <select value={o.contour ?? 'none'} onChange={e => onChange({ contour: e.target.value as WeldObject['contour'] })}>
            <option value="none">—</option>
            <option value="flat">Piana</option>
            <option value="convex">Convessa</option>
            <option value="concave">Concava</option>
          </select>
        </Field>
        <Field label="Procedimento">
          <input list="weld-processes" value={o.process ?? ''} placeholder="135"
            onChange={e => onChange({ process: e.target.value })} />
          <datalist id="weld-processes">
            {WELD_PROCESSES.filter(p => p.code).map(p => <option key={p.code} value={p.code}>{p.label}</option>)}
          </datalist>
        </Field>
        <Field label="Testo nella coda" full>
          <input value={o.tailText ?? ''} placeholder="es. ISO 5817-C, PA, vedi dett. 3"
            onChange={e => onChange({ tailText: e.target.value })} />
        </Field>
      </div>

      <h4>Cordone in sezione</h4>
      <div className="prop-grid">
        <label className="check-label full-width">
          <input type="checkbox" checked={!!o.showBead} onChange={e => onChange({ showBead: e.target.checked })} />
          Mostra il cordone sulla punta della freccia (pieno, in scala)
        </label>
        {o.showBead && (butt || both) && (
          <Field label={butt ? 'Spessore lamiera t (mm)' : 'Spessore anima t (mm)'}>
            <Num value={o.plate ?? 10} min={1} onChange={v => onChange({ plate: v })} />
          </Field>
        )}
        {o.showBead && (
          <div className="full-width" style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn-secondary" style={{ flex: 1 }}
              onClick={() => onChange({ beadRot: ((o.beadRot ?? 0) + 1) % 4 })}>Ruota 90°</button>
            <button type="button" className="btn-secondary" style={{ flex: 1 }}
              onClick={() => onChange({ beadFlip: !o.beadFlip })}>Specchia</button>
          </div>
        )}
        <Field label="Altezza testo">
          <Num value={o.textSize ?? 14} min={1} onChange={v => onChange({ textSize: v })} />
        </Field>
      </div>
    </>
  )
}

/** Lunghezza della linea, con il punto finale spostato lungo la sua direzione */
function LineLength({ o, onChange, label }: { o: { x1: number; y1: number; x2: number; y2: number }; onChange: (patch: Partial<CanvasObject>) => void; label: string }) {
  const L = Math.hypot(o.x2 - o.x1, o.y2 - o.y1)
  const u = L > 0 ? { x: (o.x2 - o.x1) / L, y: (o.y2 - o.y1) / L } : { x: 1, y: 0 }
  return (
    <Field label={label}>
      <Num value={L} min={1} onChange={v => onChange({ x2: o.x1 + u.x * v, y2: o.y1 + u.y * v })} />
    </Field>
  )
}

const GLAZING_PRESETS = ['4/16/4', '6/16/6', '33.1/16/6', '44.2/16/33.1', '6/16/44.2', '4/12/4/12/4', '6/14/4/14/33.1', '10', '44.2']

function EnvelopeProps({ o, onChange }: { o: EnvelopeObject; onChange: (patch: Partial<CanvasObject>) => void }) {
  const setKind = (kind: EnvelopeObject['kind']) => {
    if (kind === o.kind) return
    const was = ENVELOPE_KINDS.find(k => k.id === o.kind)!.fill
    // il riempimento segue il tipo, a meno che non sia stato cambiato a mano
    const patch: Partial<EnvelopeObject> = { kind }
    if (!o.fillColor || o.fillColor === was) patch.fillColor = ENVELOPE_KINDS.find(k => k.id === kind)!.fill
    if (kind === 'sandwich' && o.kind === 'insulation' && o.thickness > 200) patch.thickness = 100
    onChange(patch)
  }
  const glass = o.kind === 'glass'
  return (
    <>
      <div className="profile-id">
        <div className="profile-id-name">{envelopeLabel(o)}</div>
        <div className="muted">Sezione · spessore totale {round1(envelopeThickness(o))} mm</div>
      </div>
      <div className="prop-grid">
        <Field label="Tipo" full>
          <div className="segmented">
            {ENVELOPE_KINDS.map(k => (
              <button key={k.id} type="button" className={o.kind === k.id ? 'active' : ''} onClick={() => setKind(k.id)}>{k.label}</button>
            ))}
          </div>
        </Field>
        {!glass && o.kind !== 'aquapanel' && (
          <Field label="Spessore (mm)"><Num value={o.thickness} min={1} onChange={v => onChange({ thickness: v })} /></Field>
        )}
        {glass && (
          <Field label="Composizione">
            <input list="glazing-presets" value={o.glazing ?? ''} placeholder="6/16/6"
              onChange={e => onChange({ glazing: e.target.value })} />
            <datalist id="glazing-presets">
              {GLAZING_PRESETS.map(g => <option key={g} value={g} />)}
            </datalist>
          </Field>
        )}
        <LineLength o={o} onChange={onChange} label="Lunghezza (mm)" />
        {glass && (
          <p className="muted full-width" style={{ margin: 0 }}>
            Dal lato della linea: lastre e intercapedini separate da «/». 33.1 = stratificato 3+3 con un PVB,
            44.2 = 4+4 con due PVB. Distanziatori alle estremità.
          </p>
        )}
      </div>

      {o.kind === 'aquapanel' && (
        <>
          <h4>Parete Aquapanel Outdoor</h4>
          <div className="prop-grid">
            <p className="muted full-width" style={{ margin: 0 }}>
              Dall'esterno: rasatura con rete, lastra Aquapanel 12,5, Tyvek StuccoWrap, montanti C MgZ con isolante,
              lastre interne 12,5. Viti Maxi Screw HS (profili fino a 0,7) o TEKS (0,8–2 mm) a interasse ≤ 200 mm.
            </p>
            <Field label="Montanti esterni">
              <select value={o.aqStud ?? 75} onChange={e => onChange({ aqStud: +e.target.value })}>
                {AQ.studs.map(d => <option key={d} value={d}>C 50/{d}/50</option>)}
              </select>
            </Field>
            <Field label="Interasse (≤ 600)"><Num value={o.aqSpacing ?? 600} min={100} onChange={v => onChange({ aqSpacing: v })} /></Field>
            <Field label="Orditura" full>
              <div className="segmented">
                {([[1, 'Singola'], [2, 'Doppia']] as const).map(([v, l]) => (
                  <button key={v} type="button" className={(o.aqFrames ?? 1) === v ? 'active' : ''} onClick={() => onChange({ aqFrames: v })}>{l}</button>
                ))}
              </div>
            </Field>
            {(o.aqFrames ?? 1) === 2 && (
              <>
                <Field label="Montanti interni">
                  <select value={o.aqInnerStud ?? 50} onChange={e => onChange({ aqInnerStud: +e.target.value })}>
                    {AQ.studs.map(d => <option key={d} value={d}>C 50/{d}/50</option>)}
                  </select>
                </Field>
                <Field label="Distacco (mm)"><Num value={o.aqGap ?? 10} min={0} onChange={v => onChange({ aqGap: v })} /></Field>
              </>
            )}
            <Field label="Lastre interne">
              <select value={o.aqBoards ?? 1} onChange={e => onChange({ aqBoards: +e.target.value })}>
                {[0, 1, 2].map(n => <option key={n} value={n}>{n === 0 ? 'Nessuna' : `${n} × 12,5`}</option>)}
              </select>
            </Field>
            <Field label="Rasatura (mm)"><Num value={o.aqRender ?? 5} min={1} onChange={v => onChange({ aqRender: v })} /></Field>
            <label className="check-label full-width">
              <input type="checkbox" checked={o.aqInsulation !== false} onChange={e => onChange({ aqInsulation: e.target.checked })} />
              Isolante tra i montanti
            </label>
          </div>
        </>
      )}

      {o.kind === 'sandwich' && (
        <>
          <h4>Pannello</h4>
          <div className="prop-grid">
            <Field label="Faccia esterna" full>
              <div className="segmented">
                {([['flat', 'Piana (parete)'], ['roof', 'Grecata (copertura)']] as const).map(([v, l]) => (
                  <button key={v} type="button" className={(o.ribs ?? 'flat') === v ? 'active' : ''} onClick={() => onChange({ ribs: v })}>{l}</button>
                ))}
              </div>
            </Field>
            {o.ribs === 'roof' && (
              <>
                <Field label="Altezza greca"><Num value={o.ribHeight ?? 40} min={5} onChange={v => onChange({ ribHeight: v })} /></Field>
                <Field label="Passo greche"><Num value={o.ribPitch ?? 250} min={50} onChange={v => onChange({ ribPitch: v })} /></Field>
              </>
            )}
            <Field label="Lamiere (mm)"><Num value={o.skin ?? 0.5} min={0} step={0.1} onChange={v => onChange({ skin: v })} /></Field>
            <Field label="Larghezza utile"><Num value={o.module ?? 1000} min={0} onChange={v => onChange({ module: v })} /></Field>
            <p className="muted full-width" style={{ margin: 0 }}>Larghezza utile 0 = senza giunti tra i pannelli.</p>
          </div>
        </>
      )}

      <div className="prop-grid">
        <button type="button" className="btn-secondary full-width" onClick={() => onChange({ flip: !o.flip })}>
          Inverti lato della linea
        </button>
        <label className="check-label full-width">
          <input type="checkbox" checked={!!o.showLabel} onChange={e => onChange({ showLabel: e.target.checked })} />
          Mostra designazione sul disegno
        </label>
      </div>
    </>
  )
}

function SeamProps({ o, onChange }: { o: SeamObject; onChange: (patch: Partial<CanvasObject>) => void }) {
  return (
    <>
      <div className="profile-id">
        <div className="profile-id-name">{seamLabel(o)}</div>
        <div className="muted">Sezione · lamiera {String(o.thickness).replace('.', ',')} mm</div>
      </div>
      <div className="prop-grid">
        <Field label="Aggraffatura" full>
          <div className="segmented">
            {SEAM_TYPES.map(s => (
              <button key={s.id} type="button" className={o.seam === s.id ? 'active' : ''} onClick={() => onChange({ seam: s.id })}>{s.label}</button>
            ))}
          </div>
        </Field>
        <Field label="Altezza nervatura">
          <input list="seam-heights" value={o.height} onChange={e => {
            const v = parseFloat(e.target.value.replace(',', '.'))
            if (v > 0) onChange({ height: v })
          }} />
          <datalist id="seam-heights">{[25, 32, 38, 50, 65].map(h => <option key={h} value={h} />)}</datalist>
        </Field>
        <Field label="Passo di posa"><Num value={o.pitch} min={100} onChange={v => onChange({ pitch: v })} /></Field>
        <Field label="Spessore lamiera"><Num value={o.thickness} min={0.1} step={0.1} onChange={v => onChange({ thickness: v })} /></Field>
        <LineLength o={o} onChange={onChange} label="Lunghezza (mm)" />
        <button type="button" className="btn-secondary full-width" onClick={() => onChange({ flip: !o.flip })}>
          Inverti lato della linea
        </button>
        <label className="check-label full-width">
          <input type="checkbox" checked={!!o.showLabel} onChange={e => onChange({ showLabel: e.target.checked })} />
          Mostra designazione sul disegno
        </label>
      </div>
    </>
  )
}

function ScrewProps({ o, onChange }: { o: ScrewObject; onChange: (patch: Partial<CanvasObject>) => void }) {
  const t = screwType(o.kind)
  const D = screwDims(o)
  const hexHead = o.head === 'hexWasher' || o.head === 'hex'
  const sheet = o.kind === 'drill' || o.kind === 'tapping'
  const partial = o.kind === 'wood' || o.kind === 'lag'
  const metric = o.kind === 'machine' || o.kind === 'hammer' || o.kind === 'anchor'
  const nf = (v: number) => String(round1(v)).replace('.', ',')
  return (
    <>
      <div className="profile-id">
        <div className="profile-id-name">{screwLabel(o)}</div>
        <div className="muted">
          Per {t.use} · testa {nf(D.head.dk)}{D.head.dc ? ` (${o.kind === 'anchor' ? 'rondella' : 'flangia'} ${nf(D.head.dc)})` : ''} × {nf(D.head.k)} · passo {nf(D.p)} · nucleo {nf(D.core)} mm
        </div>
      </div>
      <div className="prop-grid">
        <Field label="Tipo" full>
          <select value={o.kind} onChange={e => onChange(defaultScrew(e.target.value as ScrewObject['kind']))}>
            {SCREW_TYPES.map(s => <option key={s.id} value={s.id}>{s.label} ({s.use})</option>)}
          </select>
        </Field>
        <Field label="Vista" full>
          <div className="segmented">
            {([['side', 'Laterale'], ['head', 'Dalla testa']] as const).map(([v, l]) => (
              <button key={v} type="button" className={o.view === v ? 'active' : ''} onClick={() => onChange({ view: v })}>{l}</button>
            ))}
          </div>
        </Field>
        <Field label="Diametro">
          <select value={o.diameter} onChange={e => onChange({ diameter: +e.target.value })}>
            {t.diameters.map(d => <option key={d} value={d}>{sheet ? `ST${nf(d)}` : metric ? `M${d}` : `Ø ${nf(d)}`}</option>)}
          </select>
        </Field>
        <Field label="Lunghezza">
          <input list={`screw-lengths-${o.kind}`} value={o.length} onChange={e => {
            const v = parseFloat(e.target.value.replace(',', '.'))
            if (v > 0) onChange({ length: v })
          }} />
          <datalist id={`screw-lengths-${o.kind}`}>{t.lengths.map(l => <option key={l} value={l} />)}</datalist>
        </Field>
        <Field label="Testa">
          <select value={o.head} onChange={e => onChange({ head: e.target.value as ScrewObject['head'] })}>
            {t.heads.map(h => <option key={h} value={h}>{HEAD_LABEL[h]}{t.std[h] ? ` · ${t.std[h]}` : ''}</option>)}
          </select>
        </Field>
        {o.kind === 'anchor' && (
          <Field label="Pezzo fissato">
            <Num value={o.fixture ?? 10} min={0} step={1} onChange={v => onChange({ fixture: v })} />
          </Field>
        )}
        {t.points.length > 1 && <Field label="Punta">
          <select value={o.point} onChange={e => onChange({ point: e.target.value as ScrewObject['point'] })}>
            {t.points.map(p => <option key={p} value={p}>{POINT_LABEL[p]}</option>)}
          </select>
        </Field>}
        {!hexHead && !metric && (
          <Field label="Impronta">
            <select value={o.drive} onChange={e => onChange({ drive: e.target.value as ScrewObject['drive'] })}>
              <option value="PH">Croce (PH)</option>
              <option value="TX">Torx (TX)</option>
              <option value="none">—</option>
            </select>
          </Field>
        )}
        {partial && (
          <>
            <label className="check-label">
              <input type="checkbox" checked={!!o.fullThread} onChange={e => onChange({ fullThread: e.target.checked })} />
              Filetto totale
            </label>
            {!o.fullThread && (
              <Field label="Lungh. filetto"><Num value={D.thread} min={1} onChange={v => onChange({ threadLength: v })} /></Field>
            )}
          </>
        )}
        {sheet && hexHead && (
          <>
            <label className="check-label">
              <input type="checkbox" checked={!!o.washer} onChange={e => onChange({ washer: e.target.checked })} />
              Rondella EPDM
            </label>
            {o.washer && (
              <Field label="Ø rondella">
                <select value={o.washerD ?? 16} onChange={e => onChange({ washerD: +e.target.value })}>
                  {[14, 16, 19, 22].map(d => <option key={d} value={d}>Ø {d}</option>)}
                </select>
              </Field>
            )}
          </>
        )}
        {o.kind === 'aquapanel' && (
          <p className="muted full-width" style={{ margin: 0 }}>
            Maxi Screw HS per profili fino a 0,7 mm, TEKS da 0,8 a 2 mm; interasse ≤ 200 mm. Misure indicative.
          </p>
        )}
        <label className="check-label full-width">
          <input type="checkbox" checked={!!o.showLabel} onChange={e => onChange({ showLabel: e.target.checked })} />
          Mostra designazione sul disegno
        </label>
      </div>
    </>
  )
}

/** Retino del materiale per rettangoli, cerchi e poligoni */
function HatchProps({ o, onChange }: { o: CanvasObject; onChange: (patch: Partial<CanvasObject>) => void }) {
  const cur = hatchDef(o.pattern)
  return (
    <>
      <h4>Retino{cur ? <span className="muted hatch-current"> · {cur.label}</span> : null}</h4>
      <div className="hatch-picker">
        {HATCH_GROUPS.map((g, gi) => (
          <div key={g} className="hatch-group">
            <span className="hatch-group-label">{g}</span>
            <div className="hatch-grid">
              {gi === 0 && (
                <button type="button" title="Nessun retino" className={`hatch-swatch hatch-none ${!cur ? 'active' : ''}`}
                  onClick={() => onChange({ pattern: undefined })}>
                  <Ban size={14} />
                </button>
              )}
              {HATCHES.filter(h => h.group === g).map(h => (
                <button key={h.id} type="button" title={h.label} className={`hatch-swatch ${o.pattern === h.id ? 'active' : ''}`}
                  onClick={() => onChange({ pattern: h.id })}>
                  <svg width="30" height="30">
                    <HatchPattern id={`hatch-swatch-${h.id}`} def={h} color="currentColor" lineWidth={0.6} />
                    <rect width="30" height="30" fill={`url(#hatch-swatch-${h.id})`} />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {cur && (
        <div className="prop-grid">
          <Field label="Scala"><Num value={o.patternScale ?? 1} min={0.05} step={0.25} onChange={v => onChange({ patternScale: v })} /></Field>
          <Field label="Angolo (°)"><Num value={o.patternAngle ?? 0} step={15} onChange={v => onChange({ patternAngle: v })} /></Field>
        </div>
      )}
    </>
  )
}

function PersonProps({ o, onChange }: { o: PersonObject; onChange: (patch: Partial<CanvasObject>) => void }) {
  const def = personDef(o.person)
  return (
    <div className="prop-grid">
      <Field label="Figura" full>
        <select value={o.person} onChange={e => {
          const next = personDef(e.target.value as PersonId)
          // se l'altezza è ancora quella tipica della figura, prende quella della nuova (es. bambino 1,20 m)
          const patch: Partial<PersonObject> = { person: next.id }
          if (Math.abs(o.height - (def.stature ?? 1800)) < 1) patch.height = next.stature ?? 1800
          onChange(patch)
        }}>
          {(['Operai', 'Pubblico', 'Tifosi'] as const).map(g => (
            <optgroup key={g} label={g}>
              {PEOPLE.filter(p => p.group === g).map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </optgroup>
          ))}
        </select>
      </Field>
      <Field label="Altezza (m)">
        <Num value={o.height / 1000} min={0.3} step={0.05} onChange={v => onChange({ height: v * 1000 })} />
      </Field>
      <Field label="Verso">
        <button type="button" className="btn-secondary" onClick={() => onChange({ flipX: !o.flipX })}>
          {def.view === 'side' ? (o.flipX ? 'Guarda a sinistra' : 'Guarda a destra') : (o.flipX ? 'Specchiata' : 'Normale')}
        </button>
      </Field>
      <label className="check-label full-width">
        <input type="checkbox" checked={!!o.showLabel} onChange={e => onChange({ showLabel: e.target.checked })} />
        Mostra descrizione sul disegno
      </label>
    </div>
  )
}

function PartProps({ o, onChange, onExplode }: { o: PartObject; onChange: (patch: Partial<CanvasObject>) => void; onExplode?: () => void }) {
  useParts()
  const def = partDef(o.part)
  const k = o.scale ?? 1
  return (
    <div className="prop-grid">
      <div className="full-width part-head">
        <b>{o.name}</b>
        {def && <span className="muted"> · {def.g} · {partSourceLabel(def.s)}</span>}
      </div>
      <Field label="Scala">
        <select value={SCALES.includes(k) ? String(k) : 'custom'} onChange={e => e.target.value !== 'custom' && onChange({ scale: +e.target.value })}>
          {SCALES.map(s => <option key={s} value={s}>{s >= 1 ? `${s}:1` : `1:${Math.round(1 / s)}`}</option>)}
          {!SCALES.includes(k) && <option value="custom">{+k.toFixed(4)}</option>}
        </select>
      </Field>
      <Field label="Verso">
        <button type="button" className="btn-secondary" onClick={() => onChange({ flipX: !o.flipX })}>
          {o.flipX ? 'Specchiato' : 'Normale'}
        </button>
      </Field>
      <button type="button" className="btn-secondary full-width" disabled={!def} onClick={onExplode}
        title="Sostituisce il componente con le sue linee e i suoi testi, raggruppati">
        Esplodi in linee modificabili
      </button>
    </div>
  )
}

const SCALES = [1, 0.5, 0.2, 0.1, 2, 5]

function KederProps({ o, onChange }: { o: PolylineObject; onChange: (patch: Partial<CanvasObject>) => void }) {
  const k = o.keder!
  const set = (patch: Partial<KederSpec>) => onChange({ keder: { ...k, ...patch } })
  return (
    <div className="prop-grid">
      <Field label="Ø keder">
        <select value={k.d} onChange={e => set({ d: +e.target.value })}>
          {(KEDER_DIAMETERS.includes(k.d) ? KEDER_DIAMETERS : [...KEDER_DIAMETERS, k.d]).map(d => <option key={d} value={d}>Ø {d}</option>)}
        </select>
      </Field>
      <Field label="Spessore membrana">
        <Num value={k.t} min={0.1} step={0.1} onChange={v => set({ t: v })} />
      </Field>
      <Field label="Doppio strato (mm)">
        <Num value={k.weld} min={0} step={5} onChange={v => set({ weld: v })} />
      </Field>
      <div />
      <label className="check-label">
        <input type="checkbox" checked={k.start} onChange={e => set({ start: e.target.checked })} />
        Keder all'inizio
      </label>
      <label className="check-label">
        <input type="checkbox" checked={k.end} onChange={e => set({ end: e.target.checked })} />
        Keder alla fine
      </label>
    </div>
  )
}

function ClampProps({ o, onChange }: { o: ClampObject; onChange: (patch: Partial<CanvasObject>) => void }) {
  const K = clampDims(o)
  const setL = (L: number) => {
    // L si misura dall'asse del bullone: si sposta il centro della fune lungo la stessa direzione
    const l = K.L || 1
    onChange({ x2: o.x1 + ((o.x2 - o.x1) / l) * L, y2: o.y1 + ((o.y2 - o.y1) / l) * L })
  }
  return (
    <>
      <div className="profile-id">
        <div className="profile-id-name">{clampLabel(o)}</div>
        <div className="muted">Guaina {String(K.ti).replace('.', ',')} mm · interasse piatti al bullone {Math.round(K.g)} mm{K.L < K.Lmin ? ` · L minima ${Math.ceil(K.Lmin)}` : ''}</div>
      </div>
      <div className="prop-grid">
        <Field label="Ø fune">
          <Num value={o.cableD} min={8} step={2} onChange={v => onChange({ cableD: v })} />
        </Field>
        <Field label="L (bullone–fune)">
          <Num value={Math.round(K.L * 10) / 10} min={1} step={5} onChange={setL} />
        </Field>
        <Field label="Spessore piatti">
          <select value={o.plate} onChange={e => onChange({ plate: +e.target.value })}>
            {(CLAMP_PLATES.includes(o.plate) ? CLAMP_PLATES : [...CLAMP_PLATES, o.plate]).map(t => <option key={t} value={t}>{t} mm</option>)}
          </select>
        </Field>
        <Field label="Bullone">
          <select value={o.bolt} onChange={e => onChange({ bolt: +e.target.value })}>
            {CLAMP_BOLTS.map(d => <option key={d} value={d}>M{d}</option>)}
          </select>
        </Field>
        <Field label="Keder nelle ganasce">
          <select value={o.kederD ?? 12} onChange={e => onChange({ kederD: +e.target.value })}>
            {KEDER_DIAMETERS.map(d => <option key={d} value={d}>Ø {d}</option>)}
          </select>
        </Field>
        <div />
        <label className="check-label">
          <input type="checkbox" checked={o.showCable !== false} onChange={e => onChange({ showCable: e.target.checked })} />
          Disegna la fune
        </label>
        <label className="check-label">
          <input type="checkbox" checked={o.showMembrane !== false} onChange={e => onChange({ showMembrane: e.target.checked })} />
          Membrana tra le ganasce
        </label>
        <label className="check-label">
          <input type="checkbox" checked={!!o.showLabel} onChange={e => onChange({ showLabel: e.target.checked })} />
          Designazione sul disegno
        </label>
      </div>
    </>
  )
}

/** Freccia come frazione della campata: L / n, con il valore in mm */
function Ratio({ L, label, value, onSet }: { L: number; label: string; value: number; onSet: (n: number) => void }) {
  return (
    <Field label={label}>
      <div className="ratio-field">
        <span>L /</span>
        <Num value={value} min={2} step={1} onChange={v => v >= 2 && onSet(v)} />
        <span className="muted">{Math.round(L / value).toLocaleString('it-IT')} mm</span>
      </div>
    </Field>
  )
}

function CushionProps({ o, onChange }: { o: CushionObject; onChange: (patch: Partial<CanvasObject>) => void }) {
  const { L } = cushionFrame(o)
  return (
    <>
      <div className="profile-id">
        <div className="profile-id-name">{cushionLabel(o)}</div>
        <div className="muted">Campata L {Math.round(L).toLocaleString('it-IT')} mm · frecce come frazione di L</div>
      </div>
      <div className="prop-grid">
        <Field label="Strati" full>
          <div className="segmented">
            {([2, 3] as const).map(n => (
              <button key={n} type="button" className={o.layers === n ? 'active' : ''} onClick={() => onChange({ layers: n })}>{n} strati</button>
            ))}
          </div>
        </Field>
        <Ratio L={L} label="Strato superiore ↑" value={o.topN} onSet={v => onChange({ topN: v })} />
        <Ratio L={L} label="Strato inferiore ↓" value={o.bottomN} onSet={v => onChange({ bottomN: v })} />
        {o.layers === 3 && <Ratio L={L} label="3° strato ↑" value={o.thirdN} onSet={v => onChange({ thirdN: v })} />}
        {o.layers === 3 && <div />}
        <label className="check-label">
          <input type="checkbox" checked={!!o.flip} onChange={e => onChange({ flip: e.target.checked })} />
          Inverti alto / basso
        </label>
        <label className="check-label">
          <input type="checkbox" checked={!!o.showLabel} onChange={e => onChange({ showLabel: e.target.checked })} />
          Designazione sul disegno
        </label>
      </div>
    </>
  )
}

function RopeProps({ o, onChange }: { o: CableObject; onChange: (patch: Partial<CanvasObject>) => void }) {
  const fk = inoxFork(o.size)
  const tb = inoxTurnbuckle(o.size)
  const span = cableSpan(o)
  const setSpan = (L: number) => {
    const u = span > 0 ? { x: (o.x2 - o.x1) / span, y: (o.y2 - o.y1) / span } : { x: 1, y: 0 }
    onChange({ x2: o.x1 + u.x * L, y2: o.y1 + u.y * L })
  }
  const tbEnd = tb ? (o.turnbuckle ?? 'none') : 'none'
  const swap = () => onChange({
    x1: o.x2, y1: o.y2, x2: o.x1, y2: o.y1, startSocket: o.endSocket, endSocket: o.startSocket,
    turnbuckle: o.turnbuckle === 'start' ? 'end' : o.turnbuckle === 'end' ? 'start' : o.turnbuckle,
  })
  const open = o.tbOpen ?? 0.5
  return (
    <>
      <div className="profile-id">
        <div className="profile-id-name">{cableLabel(o)}</div>
        <div className="muted">Lunghezza fune tra i terminali ≈ {Math.round(inoxRopeLength(o))} mm</div>
      </div>
      <div className="prop-grid">
        <Field label="Fune">
          <select value={o.size} onChange={e => onChange({ size: Number(e.target.value) })}>
            {INOX_SIZES.map(d => <option key={d} value={d}>Ø {String(d).replace('.', ',')}</option>)}
          </select>
        </Field>
        <Field label="Interasse perni (mm)">
          <Num value={span} min={1} onChange={setSpan} />
        </Field>
      </div>

      <h4>Terminali</h4>
      <div className="prop-grid">
        <label className="check-label">
          <input type="checkbox" checked={o.startSocket} disabled={tbEnd === 'start'} onChange={e => onChange({ startSocket: e.target.checked })} />
          Forcella in A
        </label>
        <label className="check-label">
          <input type="checkbox" checked={o.endSocket} disabled={tbEnd === 'end'} onChange={e => onChange({ endSocket: e.target.checked })} />
          Forcella in B
        </label>
        <Field label="Tenditore" full>
          <div className="segmented">
            {([['none', 'Nessuno'], ['start', 'In A'], ['end', 'In B']] as const).map(([k, l]) => (
              <button key={k} type="button" disabled={!tb && k !== 'none'} className={tbEnd === k ? 'active' : ''}
                onClick={() => onChange({ turnbuckle: k })}>{l}</button>
            ))}
          </div>
        </Field>
        {tb && tbEnd !== 'none' && (
          <Field label={`Regolazione: ${Math.round(turnbuckleLength(tb, open))} mm (L ${tb.L} – L¹ ${tb.L1})`} full>
            <input type="range" min={0} max={1} step={0.05} value={open} onChange={e => onChange({ tbOpen: +e.target.value })} />
          </Field>
        )}
        {!tb && <p className="muted full-width" style={{ margin: 0 }}>Tenditore non disponibile per la fune Ø {o.size} (da Ø 2,5 a Ø 22).</p>}
        <button type="button" className="btn-secondary full-width" onClick={swap}>Inverti A ↔ B</button>
      </div>

      <table className="data-table">
        <tbody>
          <tr><th>Forcella</th><td>art. {fk.art} · apertura C {fk.C} · perno Ø {fk.B} · corpo Ø {fk.D} · E {fk.E} mm</td></tr>
          {tb && <tr><th>Tenditore</th><td>art. {tb.art} · M{tb.A} · perno Ø {tb.B} · apertura C {tb.C} · E {tb.E} mm</td></tr>}
          {tb && <tr><th>Lunghezza L – L¹</th><td>{tb.L} – {tb.L1} mm</td></tr>}
          {tb && <tr><th>Carico di rottura tenditore</th><td>{tb.load.toLocaleString('it-IT')} (catalogo)</td></tr>}
        </tbody>
      </table>
      <p className="muted" style={{ margin: 0 }}>Inox AISI 316. Lunghezza del corpo a pressare stimata (non in catalogo).</p>

      <div className="prop-grid">
        <label className="check-label full-width">
          <input type="checkbox" checked={o.showLabel !== false} onChange={e => onChange({ showLabel: e.target.checked })} />
          Mostra designazione sul disegno
        </label>
      </div>
    </>
  )
}

function DeckProps({ o, onChange }: { o: DeckObject; onChange: (patch: Partial<CanvasObject>) => void }) {
  const p = deckProfile(o.profile)
  const t = deckThickness(o)
  const W = deckWidth(o)
  const Lg = deckLength(o)
  const sh = deckSheets(o)
  const vol = slabVolume(o)
  const span = deckSpan(o)
  const u = span > 0 ? { x: (o.x2 - o.x1) / span, y: (o.y2 - o.y1) / span } : { x: 1, y: 0 }
  /** porta la linea alla misura data, spostando il punto finale lungo la sua direzione */
  const lineTo = (len: number) => ({ x2: o.x1 + u.x * len, y2: o.y1 + u.y * len })
  const setWidth = (v: number) => onChange(o.view === 'side' ? { width: v } : lineTo(v))
  const setLength = (v: number) => onChange(o.view === 'side' ? lineTo(v) : { length: v })
  // cambiando vista la linea passa da larghezza a lunghezza (e viceversa): le misure restano quelle
  const setView = (view: DeckObject['view']) => {
    if (view === o.view) return
    const lineIsWidth = (vw: DeckObject['view']) => vw !== 'side'
    if (lineIsWidth(view) === lineIsWidth(o.view)) return onChange({ view })
    onChange(view === 'side'
      ? { view, width: W, ...lineTo(Lg) }
      : { view, length: Lg, ...lineTo(W) })
  }
  const nf = (v: number, d = 2) => v.toFixed(d).replace('.', ',')
  return (
    <>
      <div className="profile-id">
        <div className="profile-id-name">{deckLabel(o)}</div>
        <div className="muted">
          {p.maker} · {p.steel} · H {p.depth} · passo {p.pitch} · larghezza utile {p.cover} mm
        </div>
      </div>
      <div className="prop-grid">
        <Field label="Profilo">
          <select
            value={o.profile}
            onChange={e => {
              const np = deckProfile(e.target.value)
              // spessore e altezza dei pioli tornano ai valori del nuovo profilo
              onChange({ profile: np.code, thickness: np.thicknesses[0].t, studH: np.studH })
            }}
          >
            {DECKS.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Spessore">
          <select value={t.t} onChange={e => onChange({ thickness: Number(e.target.value) })}>
            {p.thicknesses.map(x => <option key={x.t} value={x.t}>{nf(x.t)} mm</option>)}
          </select>
        </Field>
        <Field label="Vista" full>
          <div className="segmented">
            {([['section', 'Sezione'], ['top', "Dall'alto"], ['side', 'Laterale']] as const).map(([v, l]) => (
              <button key={v} type="button" className={o.view === v ? 'active' : ''} onClick={() => setView(v)}>{l}</button>
            ))}
          </div>
        </Field>
        <Field label={`Larghezza (mm)${o.view !== 'side' ? ' · linea' : ''}`}>
          <Num value={W} min={1} onChange={setWidth} />
        </Field>
        <Field label={`Lunghezza (mm)${o.view === 'side' ? ' · linea' : ''}`}>
          <Num value={Lg} min={1} onChange={setLength} />
        </Field>
      </div>

      <h4>Getto</h4>
      <div className="prop-grid">
        <label className="check-label">
          <input type="checkbox" checked={!!o.slab} onChange={e => onChange({ slab: e.target.checked ? Math.max(120, p.minSlab) : 0, hatch: o.hatch ?? true })} />
          Soletta
        </label>
        {!!o.slab && (
          <Field label="Spessore totale (mm)">
            <Num value={o.slab} min={p.depth + 1} onChange={v => onChange({ slab: v })} />
          </Field>
        )}
        {!!o.slab && (
          <label className="check-label full-width">
            <input type="checkbox" checked={!!o.hatch} onChange={e => onChange({ hatch: e.target.checked })} />
            Retino calcestruzzo
          </label>
        )}
      </div>

      <h4>Pioli</h4>
      <div className="prop-grid">
        <label className="check-label full-width">
          <input type="checkbox" checked={!!o.studs} onChange={e => onChange({ studs: e.target.checked })} />
          Mostra i pioli (al centro delle gole, sulle travi)
        </label>
        {o.studs && (() => {
          const s = studSpec(o)
          const n = studCount(o)
          const minH = p.depth + 2 * s.d
          return (
            <>
              <Field label="Diametro">
                <select value={s.d} onChange={e => onChange({ studD: Number(e.target.value) })}>
                  {STUD_SIZES.map(x => <option key={x.d} value={x.d}>Ø{x.d}</option>)}
                </select>
              </Field>
              <Field label="Altezza saldato (mm)">
                <Num value={s.h} min={p.depth + 1} onChange={v => onChange({ studH: v })} />
              </Field>
              <Field label="Per gola">
                <select value={s.per} onChange={e => onChange({ studsPerTrough: Number(e.target.value) })}>
                  <option value={1}>1</option>
                  <option value={2}>2 (a 4d = {4 * s.d} mm)</option>
                </select>
              </Field>
              <Field label="Interasse travi (mm)">
                <Num value={o.beamSpacing ?? 0} min={0} onChange={v => onChange({ beamSpacing: v })} />
              </Field>
              <p className="muted full-width" style={{ margin: 0 }}>
                {n.perBeam} per trave{o.view !== 'section' ? ` × ${n.beams} travi = ${n.total} pioli` : ''}.
                Interasse 0 = solo le travi alle estremità (asse a 76 mm dal bordo).
              </p>
              {!p.weldThroughStuds && (
                <p className="full-width warn-text" style={{ margin: 0 }}>
                  Il manuale non prevede pioli saldati attraverso la lamiera per {p.name}.
                </p>
              )}
              {s.h < minH && (
                <p className="full-width warn-text" style={{ margin: 0 }}>
                  Il piolo deve sporgere almeno 2d sopra la greca: altezza minima {minH} mm.
                </p>
              )}
              {!!o.slab && s.h > o.slab - 15 && (
                <p className="full-width warn-text" style={{ margin: 0 }}>
                  Il piolo arriva a meno di 15 mm dall'estradosso della soletta ({o.slab} mm).
                </p>
              )}
            </>
          )
        })()}
      </div>

      <table className="data-table">
        <tbody>
          <tr><th>Lamiere</th><td>{sh.full} intere{sh.cut ? ` + 1 tagliata a ${Math.round(sh.cut)} mm` : ''}</td></tr>
          <tr><th>Superficie</th><td>{nf((W * Lg) / 1e6)} m²</td></tr>
          <tr><th>Peso lamiera</th><td><b>{nf(deckSteelMass(o), 1)} kg</b> ({nf(t.weight * 1000 / 9.81, 1)} kg/m²)</td></tr>
          <tr><th>Area</th><td>{t.area} mm²/m · asse neutro {nf(t.yna)} mm</td></tr>
          <tr><th>J + / −</th><td>{nf(t.I)}{t.Ihog ? ` / ${nf(t.Ihog)}` : ''} cm⁴/m</td></tr>
          <tr><th>M ult. + / −</th><td>{nf(t.Msag)} / {nf(t.Mhog)} kNm/m</td></tr>
          {!!o.slab && (
            <>
              <tr><th>Calcestruzzo</th><td>{nf(vol.perM2, 3)} m³/m² · <b>{nf(vol.total)} m³</b></td></tr>
              <tr><th>Peso getto (NW)</th><td>{nf(vol.perM2 * p.concrete.wet)} kN/m² fresco · {nf(vol.perM2 * p.concrete.dry)} kN/m² indurito</td></tr>
            </>
          )}
        </tbody>
      </table>
      {!!o.slab && o.slab < p.minSlab && (
        <p className="muted" style={{ margin: 0 }}>Il manuale parte da {p.minSlab} mm di soletta.</p>
      )}
      <p className="muted" style={{ margin: 0 }}>Dati Tata Steel ComFlor ({p.standard}), per metro di larghezza.</p>

      <div className="prop-grid">
        <label className="check-label full-width">
          <input type="checkbox" checked={o.showLabel !== false} onChange={e => onChange({ showLabel: e.target.checked })} />
          Mostra designazione sul disegno
        </label>
      </div>
    </>
  )
}

/**
 * Trasparenza del riempimento e dell'intero oggetto (0 % = opaco).
 * Con più oggetti e valori diversi lo indica come "misto"; spostando il cursore li uniforma.
 */
function Transparency({ objs, onChange }: { objs: CanvasObject[]; onChange: (patch: Partial<CanvasObject>) => void }) {
  const withFill = objs.filter(o => styleCaps(o).fill)
  const anyFilled = withFill.some(o => o.fillEnabled)
  const row = (label: string, key: 'fillOpacity' | 'opacity', list: CanvasObject[], max: number, hint?: string) => {
    const values = list.map(o => o[key] ?? 1)
    const mixed = values.some(v => Math.abs(v - values[0]) > 1e-6)
    // il cursore indica la trasparenza (inverso dell'opacità)
    const t = Math.round((1 - values[0]) * 100)
    return (
      <div className="opacity-row">
        <span className="opacity-label">{label}</span>
        <input
          type="range" min={0} max={max} step={5} value={t}
          aria-label={`Trasparenza ${label.toLowerCase()}`}
          onChange={e => onChange({ [key]: 1 - Number(e.target.value) / 100 })}
        />
        <span className="opacity-value">{mixed ? 'misto' : `${t} %`}</span>
        {hint && <span className="muted opacity-hint">{hint}</span>}
      </div>
    )
  }
  return (
    <>
      <h4>Trasparenza</h4>
      <div className="opacity-group">
        {withFill.length > 0 && row('Riempimento', 'fillOpacity', withFill, 100,
          anyFilled ? undefined : 'Nessun riempimento attivo: sceglilo dalla barra stili.')}
        {row('Oggetto', 'opacity', objs, 95)}
      </div>
    </>
  )
}

/** Più oggetti selezionati: riepilogo, gruppi, allinea e distribuisci */
function MultiProps({ objs, onAlign, onGroup, onUngroup, onChangeAll }: {
  objs: CanvasObject[]
  onChangeAll: (patch: Partial<CanvasObject>) => void
  onAlign: (kind: AlignKind) => void
  onGroup: () => void
  onUngroup: () => void
}) {
  useCatalog()
  const counts = new Map<string, number>()
  for (const o of objs) {
    const label = o.type === 'polyline' && o.keder ? 'Membrana con keder' : o.type === 'polyline' && o.closed ? 'Poligono' : o.type === 'cable' && o.system === 'inox' ? 'Fune inox' : TYPE_LABEL[o.type]
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  // peso dei profili in vista laterale o dall'alto (la sezione non ha lunghezza)
  let weight = 0
  let weighed = 0
  for (const o of objs) {
    if (o.type === 'cable') { weight += cableMass(o); weighed++; continue }
    if (o.type === 'deck') { weight += deckSteelMass(o); weighed++; continue }
    if (o.type !== 'profile' || o.viewType === 'front') continue
    const g = findProfile(o.profileName)?.g
    if (g) { weight += (g * o.length) / 1000; weighed++ }
  }
  const groupIds = new Set(objs.map(o => o.groupId).filter(Boolean))
  const singleGroup = groupIds.size === 1 && objs.every(o => o.groupId)
  const locked = objs.filter(o => o.locked).length
  const btn = (kind: AlignKind, title: string, icon: ReactNode, disabled = false) => (
    <button type="button" className="align-btn" title={title} aria-label={title} onClick={() => onAlign(kind)} disabled={disabled}>{icon}</button>
  )
  const units = new Set(objs.filter(o => !o.locked).map(o => o.groupId ?? o.id)).size

  return (
    <div className="properties-form">
      <div className="object-info">
        <span className="badge">{singleGroup ? 'Gruppo' : 'Selezione multipla'}</span>
        <span className="muted">{objs.length} oggetti</span>
      </div>
      <div className="multi-summary">
        {[...counts].map(([label, n]) => <span key={label}>{n} × {label}</span>)}
      </div>
      {weighed > 0 && (
        <p className="muted" style={{ margin: 0 }}>Peso acciaio (profili in vista laterale/dall'alto, cavi, lamiere): <b>{round1(weight)} kg</b></p>
      )}
      {locked > 0 && <p className="muted" style={{ margin: 0 }}>{locked} bloccati: non si spostano.</p>}

      <Transparency objs={objs} onChange={onChangeAll} />

      <h4>Gruppo</h4>
      <div className="multi-actions">
        {singleGroup
          ? <button type="button" className="btn-secondary" onClick={onUngroup}>Separa gruppo (Ctrl+Shift+G)</button>
          : <button type="button" className="btn-secondary" onClick={onGroup}>Raggruppa (Ctrl+G)</button>}
        {!singleGroup && groupIds.size > 0 && (
          <button type="button" className="btn-secondary" onClick={onUngroup}>Separa i gruppi</button>
        )}
      </div>
      <p className="muted" style={{ margin: 0 }}>Alt+clic seleziona un solo oggetto dentro un gruppo.</p>

      <h4>Allinea</h4>
      <div className="align-row">
        {btn('left', 'Allinea a sinistra', <AlignStartVertical size={18} />, units < 2)}
        {btn('hcenter', 'Centra orizzontalmente', <AlignCenterVertical size={18} />, units < 2)}
        {btn('right', 'Allinea a destra', <AlignEndVertical size={18} />, units < 2)}
        <span className="align-sep" />
        {btn('top', 'Allinea in alto', <AlignStartHorizontal size={18} />, units < 2)}
        {btn('vcenter', 'Centra verticalmente', <AlignCenterHorizontal size={18} />, units < 2)}
        {btn('bottom', 'Allinea in basso', <AlignEndHorizontal size={18} />, units < 2)}
      </div>
      <h4>Distribuisci</h4>
      <div className="align-row">
        {btn('hdistribute', 'Distribuisci in orizzontale (spazi uguali)', <AlignHorizontalDistributeCenter size={18} />, units < 3)}
        {btn('vdistribute', 'Distribuisci in verticale (spazi uguali)', <AlignVerticalDistributeCenter size={18} />, units < 3)}
        {units < 3 && <span className="muted">servono almeno 3 elementi</span>}
      </div>
    </div>
  )
}

function ObjectProps({ o, onChange, onExplode }: { o: CanvasObject; onChange: (patch: Partial<CanvasObject>) => void; onExplode?: () => void }) {
  useCatalog()
  const endpoint = isEndpoint(o)
  const hasXY = o.type !== 'polyline' && !endpoint
  const canRotate = !endpoint

  return (
    <div className="properties-form">
      <div className="object-info">
        <span className="badge">{o.type === 'polyline' && o.keder ? 'Membrana con keder' : o.type === 'polyline' && o.closed ? 'Poligono' : o.type === 'cable' && o.system === 'inox' ? 'Fune inox' : TYPE_LABEL[o.type]}</span>
        {o.type === 'polyline' && <span className="muted">{o.closed ? o.points.length - 1 : o.points.length} vertici</span>}
      </div>

      {/* ---------- specifiche del tipo (prima, sono le più usate) ---------- */}

      {o.type === 'text' && (
        <div className="prop-grid">
          <Field label="Testo" full>
            <textarea value={o.text} onChange={e => onChange({ text: e.target.value })} />
          </Field>
          <Field label="Dimensione">
            <Num value={o.fontSize} min={1} onChange={v => onChange({ fontSize: v })} />
          </Field>
          <Field label="Bordo">
            <select value={o.boxEnabled ? 'on' : 'off'} onChange={e => onChange({ boxEnabled: e.target.value === 'on' })}>
              <option value="off">Nessuno</option>
              <option value="on">Con bordo</option>
            </select>
          </Field>
          <label className="check-label">
            <input type="checkbox" checked={!!o.leader}
              onChange={e => onChange({ leader: e.target.checked ? defaultLeaderTip(o) : undefined })} />
            Linea di richiamo
          </label>
          {o.leader && (
            <Field label="Terminale">
              <select value={o.leaderEnd ?? 'arrow'} onChange={e => onChange({ leaderEnd: e.target.value as 'arrow' | 'dot' | 'none' })}>
                <option value="arrow">Freccia</option>
                <option value="dot">Punto</option>
                <option value="none">Nessuno</option>
              </select>
            </Field>
          )}
          {o.leader && (
            <Field label="Spessore richiamo">
              <Num value={leaderWidth(o)} min={0.1} step={0.1} onChange={v => onChange({ leaderWidth: v })} />
            </Field>
          )}
          {o.leader && (
            <p className="muted full-width" style={{ margin: 0 }}>Trascina la maniglia sulla punta per spostarla.</p>
          )}
        </div>
      )}

      {o.type === 'quote' && (
        <div className="prop-grid">
          <Field label="Testo quota" full>
            <input
              type="text" value={o.text || ''} placeholder={`${round1(Math.hypot(o.x2 - o.x1, o.y2 - o.y1))} (automatico)`}
              onChange={e => onChange({ text: e.target.value })}
            />
          </Field>
          <Field label="Estremità" full>
            <div className="segmented">
              {([['arrow', 'Frecce'], ['tick', 'Trattino obliquo']] as const).map(([v, l]) => (
                <button key={v} type="button" className={(o.ends ?? 'arrow') === v ? 'active' : ''}
                  onClick={() => onChange({ ends: v })}>{l}</button>
              ))}
            </div>
          </Field>
        </div>
      )}

      {o.type === 'symbol' && (
        <div className="prop-grid">
          <Field label="Numero">
            <Num value={o.value ?? 1} onChange={v => onChange({ value: v })} />
          </Field>
        </div>
      )}

      {o.type === 'profile' && <ProfileHeader code={o.profileName} length={o.viewType === 'front' ? 0 : o.length} />}

      {o.type === 'profile' && (
        <div className="prop-grid">
          {(() => {
            const cur = findProfile(o.profileName)
            const region = cur?.region ?? 'EU'
            const series = cur?.series ?? o.profileType
            return (
              <>
                <Field label="Serie">
                  <select
                    value={series}
                    onChange={e => {
                      const first = profilesOfSeries(region, e.target.value)[0]
                      if (first) onChange({ profileType: first.series, profileName: first.code })
                    }}
                  >
                    {seriesByShape(region).map(g => (
                      <optgroup key={g.shape} label={g.label}>
                        {g.series.map(t => <option key={t} value={t}>{t}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </Field>
                <Field label="Profilo">
                  <select value={cur?.code ?? o.profileName} onChange={e => onChange({ profileName: e.target.value })}>
                    {profilesOfSeries(region, series).map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                  </select>
                </Field>
              </>
            )
          })()}
          <Field label="Vista">
            <select value={o.viewType || 'front'} onChange={e => onChange({ viewType: e.target.value as typeof o.viewType })}>
              <option value="front">Sezione</option>
              <option value="side">Laterale</option>
              <option value="top">Dall'alto</option>
            </select>
          </Field>
          {o.viewType !== 'front' && (
            <Field label="Lunghezza (mm)">
              <Num value={o.length || 400} min={1} onChange={v => onChange({ length: v })} />
            </Field>
          )}
          <Field label="Etichetta">
            <select value={o.label ?? 'none'} onChange={e => onChange({ label: e.target.value as typeof o.label })}>
              <option value="none">Nessuna</option>
              <option value="name">Nome</option>
              <option value="code">Codice Maffeis</option>
              <option value="tekla">Nome Tekla</option>
            </select>
          </Field>
          <Field label="Scala">
            <Num value={o.scale} min={0.01} step={0.1} onChange={v => onChange({ scale: v })} />
          </Field>
        </div>
      )}

      {o.type === 'bolt' && (
        <>
          <div className="prop-grid">
            <Field label="Diametro">
              <select value={o.diameter} onChange={e => onChange({ diameter: Number(e.target.value) })}>
                {BOLT_DIAMETERS.map(d => <option key={d} value={d}>M{d}</option>)}
              </select>
            </Field>
            <Field label="Classe">
              <select value={o.grade} onChange={e => onChange({ grade: e.target.value as typeof o.grade })}>
                {BOLT_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Vista" full>
              <div className="segmented">
                {([['head', 'Testa'], ['nut', 'Dado'], ['hole', 'Foro'], ['section', 'Sezione']] as const).map(([v, l]) => (
                  <button key={v} type="button" className={o.view === v ? 'active' : ''} onClick={() => onChange({ view: v })}>{l}</button>
                ))}
              </div>
            </Field>
            <Field label="Pacco serrato (mm)">
              <Num value={o.grip} min={1} onChange={v => onChange({ grip: v })} />
            </Field>
            <Field label="Lunghezza">
              <input value={`${boltLength(o)} mm`} readOnly tabIndex={-1} />
            </Field>
            <label className="check-label full-width">
              <input type="checkbox" checked={!!o.showLabel} onChange={e => onChange({ showLabel: e.target.checked })} />
              Mostra designazione ({boltLabel(o)})
            </label>
          </div>
          <h4>Ripetizione</h4>
          <div className="prop-grid">
            <Field label="Colonne"><Num value={o.cols} min={1} onChange={v => onChange({ cols: Math.round(v) })} /></Field>
            <Field label="Passo X (mm)"><Num value={o.pitchX} min={1} onChange={v => onChange({ pitchX: v })} /></Field>
            {o.view !== 'section' && (
              <>
                <Field label="Righe"><Num value={o.rows} min={1} onChange={v => onChange({ rows: Math.round(v) })} /></Field>
                <Field label="Passo Y (mm)"><Num value={o.pitchY} min={1} onChange={v => onChange({ pitchY: v })} /></Field>
              </>
            )}
            <p className="muted full-width" style={{ margin: 0 }}>
              Passi minimi EC3 (prosp. 3.3): p1 ≥ 2,2·d0 = {round1(2.2 * boltDims(o.diameter).d0)} mm,
              p2 ≥ 2,4·d0 = {round1(2.4 * boltDims(o.diameter).d0)} mm
            </p>
          </div>
        </>
      )}

      {o.type === 'cable' && (o.system === 'inox' ? <RopeProps o={o} onChange={onChange} /> : <CableProps o={o} onChange={onChange} />)}
      {o.type === 'deck' && <DeckProps o={o} onChange={onChange} />}
      {o.type === 'weld' && <WeldProps o={o} onChange={onChange} />}
      {o.type === 'cushion' && <CushionProps o={o} onChange={onChange} />}
      {o.type === 'clamp' && <ClampProps o={o} onChange={onChange} />}
      {o.type === 'polyline' && o.keder && <KederProps o={o} onChange={onChange} />}
      {o.type === 'part' && <PartProps o={o} onChange={onChange} onExplode={onExplode} />}
      {o.type === 'person' && <PersonProps o={o} onChange={onChange} />}
      {o.type === 'screw' && <ScrewProps o={o} onChange={onChange} />}
      {o.type === 'envelope' && <EnvelopeProps o={o} onChange={onChange} />}
      {o.type === 'seam' && <SeamProps o={o} onChange={onChange} />}

      {o.type === 'image' && o.clipPoints && (
        <div className="prop-grid">
          <button className="btn-danger full-width" onClick={() => onChange({ clipPoints: undefined })}>
            Rimuovi scontorno
          </button>
        </div>
      )}

      {(o.type === 'rect' || o.type === 'circle' || (o.type === 'polyline' && o.closed)) && <HatchProps o={o} onChange={onChange} />}

      <Transparency objs={[o]} onChange={onChange} />

      {/* ---------- geometria ---------- */}
      <h4>Geometria</h4>
      <div className="prop-grid">
        {hasXY && (
          <>
            <Field label="X"><Num value={o.x} onChange={v => onChange({ x: v })} /></Field>
            <Field label="Y"><Num value={o.y} onChange={v => onChange({ y: v })} /></Field>
          </>
        )}
        {(o.type === 'rect' || o.type === 'text' || o.type === 'image') && (
          <>
            {/* il testo senza misure manuali si adatta al contenuto: si mostra la misura reale */}
            <Field label="Larghezza"><Num value={o.type === 'text' ? textSize(o).w : o.width} min={1} onChange={v => onChange({ width: v })} /></Field>
            <Field label="Altezza"><Num value={o.type === 'text' ? textSize(o).h : o.height} min={1} onChange={v => onChange({ height: v })} /></Field>
          </>
        )}
        {o.type === 'circle' && (
          <Field label="Diametro"><Num value={o.radius * 2} min={1} onChange={v => onChange({ radius: v / 2 })} /></Field>
        )}
        {endpoint && (
          <>
            <Field label="X1"><Num value={o.x1} onChange={v => onChange({ x1: v })} /></Field>
            <Field label="Y1"><Num value={o.y1} onChange={v => onChange({ y1: v })} /></Field>
            <Field label="X2"><Num value={o.x2} onChange={v => onChange({ x2: v })} /></Field>
            <Field label="Y2"><Num value={o.y2} onChange={v => onChange({ y2: v })} /></Field>
          </>
        )}
        {canRotate && (
          <Field label="Rotazione (°)"><Num value={o.rotation || 0} onChange={v => onChange({ rotation: v })} /></Field>
        )}
        {(o.type === 'rect' || o.type === 'circle' || o.type === 'polyline' || o.type === 'arrow' || o.type === 'profile' || o.type === 'cable' || o.type === 'deck' || o.type === 'envelope' || o.type === 'seam' || o.type === 'screw') && (
          <Field label="Spessore linea"><Num value={o.strokeWidth ?? 2} min={0.25} step={0.5} onChange={v => onChange({ strokeWidth: v })} /></Field>
        )}
      </div>
    </div>
  )
}
