import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { CanvasObject } from './types'
import type { ToolId } from './tools'
import { TOOLS } from './tools'
import {
  Camera, Undo2, Redo2, FilePlus2, FolderOpen, Save, ClipboardPaste, Lock, LockOpen,
  ChevronDown, ChevronsUp, ChevronsDown, Trash2, Copy, PanelRightOpen, PanelRightClose, Group, Ungroup, FlipHorizontal2,
} from 'lucide-react'
import { MaffeisLogo } from './components/MaffeisLogo'


type Props = {
  tool: ToolId
  setTool: (t: ToolId) => void
  selected: CanvasObject | null
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onScreenshot: () => void
  onBringToFront: () => void
  onSendToBack: () => void
  onDuplicate: () => void
  onDelete: () => void
  onPaste: () => void
  onToggleLock: () => void
  onMirror: () => void
  /** Numero di oggetti selezionati */
  selectionCount: number
  allLocked: boolean
  /** Nella selezione c'è almeno un gruppo */
  grouped: boolean
  onGroup: () => void
  onUngroup: () => void
  panelOpen: boolean
  togglePanel: () => void
}

const Btn = ({ title, onClick, active, disabled, children, className }: {
  title: string; onClick: () => void; active?: boolean; disabled?: boolean; children: ReactNode; className?: string
}) => (
  <button
    className={`tb-btn ${active ? 'active' : ''} ${className ?? ''}`}
    title={title}
    aria-label={title}
    aria-pressed={active}
    disabled={disabled}
    onClick={onClick}
  >
    {children}
  </button>
)

const Sep = () => <div className="tb-sep" />

/** Famiglie di strumenti: un pulsante con l'ultimo strumento usato e un menu con gli altri */
const FAMILIES: { name: string; tools: ToolId[] }[] = [
  { name: 'Disegno', tools: ['freehand', 'line', 'polyline', 'arrow', 'rect', 'circle'] },
  { name: 'Acciaio', tools: ['profile', 'bolt', 'screw', 'weld'] },
  { name: 'Membrane', tools: ['part', 'cushion', 'keder', 'clamp', 'cable'] },
  { name: 'Involucro', tools: ['deck', 'envelope', 'seam'] },
  { name: 'Annotazioni', tools: ['quote', 'bubble', 'measure', 'person'] },
  { name: 'Immagine', tools: ['scale', 'wand', 'crop'] },
]

const shortcutOf = (id: ToolId) => (TOOLS[id].shortcut ? ` (${TOOLS[id].shortcut})` : '')

function ToolFamily({ name, tools, tool, setTool, isDisabled }: {
  name: string
  tools: ToolId[]
  tool: ToolId
  setTool: (t: ToolId) => void
  isDisabled: (t: ToolId) => boolean
}) {
  const [last, setLast] = useState<ToolId>(tools[0])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inFamily = tools.includes(tool)
  // il pulsante mostra l'ultimo strumento della famiglia scelto (anche da tastiera)
  useEffect(() => { if (inFamily) setLast(tool) }, [tool, inFamily])
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', esc)
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', esc) }
  }, [open])

  const shown = inFamily ? tool : last
  const Icon = TOOLS[shown].icon
  const disabled = isDisabled(shown)
  return (
    <div className={`tb-family ${open ? 'open' : ''}`} ref={ref}>
      <button
        className={`tb-btn tb-family-main ${inFamily ? 'active' : ''}`}
        title={`${name}: ${TOOLS[shown].label}${shortcutOf(shown)} — freccia o tasto destro per gli altri`}
        aria-label={`${name}: ${TOOLS[shown].label}`}
        aria-pressed={inFamily}
        onClick={() => (disabled ? setOpen(true) : setTool(tool === shown ? 'select' : shown))}
        onContextMenu={e => { e.preventDefault(); setOpen(o => !o) }}
      >
        <Icon size={18} />
      </button>
      <button className={`tb-family-caret ${inFamily ? 'active' : ''}`} title={`Strumenti ${name.toLowerCase()}`}
        aria-label={`Altri strumenti: ${name}`} aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <ChevronDown size={11} />
      </button>
      {open && (
        <div className="tb-flyout" role="menu">
          <div className="tb-flyout-title">{name}</div>
          {tools.map(id => {
            const T = TOOLS[id]
            const TIcon = T.icon
            const dis = isDisabled(id)
            return (
              <button key={id} role="menuitem" className={`tb-flyout-item ${tool === id ? 'active' : ''}`} disabled={dis}
                title={dis ? "Seleziona prima un'immagine" : T.hint}
                onClick={() => { setTool(id); setOpen(false) }}>
                <TIcon size={17} />
                <span>{T.label}</span>
                {T.shortcut && <kbd>{T.shortcut}</kbd>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function Toolbar(p: Props) {
  const isDisabled = (id: ToolId) => TOOLS[id].needs === 'image' && p.selected?.type !== 'image'
  const toolBtn = (id: ToolId) => {
    const t = TOOLS[id]
    const Icon = t.icon
    const disabled = isDisabled(id)
    const why = disabled ? ' — seleziona prima un\'immagine' : ''
    return (
      <Btn
        key={id}
        title={`${t.label}${t.shortcut ? ` (${t.shortcut})` : ''}${why}`}
        active={p.tool === id}
        disabled={disabled}
        onClick={() => p.setTool(p.tool === id ? 'select' : id)}
      >
        <Icon size={18} />
      </Btn>
    )
  }

  const has = p.selectionCount > 0

  return (
    <header className="toolbar">
      <div className="tb-group">
        <MaffeisLogo height={22} className="tb-logo" />
        <span className="tb-brand">Parametric Canvas</span>
        <Btn title="Nuovo disegno" onClick={p.onNew}><FilePlus2 size={18} /></Btn>
        <Btn title="Apri… (Ctrl+O)" onClick={p.onOpen}><FolderOpen size={18} /></Btn>
        <Btn title="Salva (Ctrl+S)" onClick={p.onSave}><Save size={18} /></Btn>
        <Sep />
        <Btn title="Annulla (Ctrl+Z)" onClick={p.onUndo} disabled={!p.canUndo}><Undo2 size={18} /></Btn>
        <Btn title="Ripeti (Ctrl+Y)" onClick={p.onRedo} disabled={!p.canRedo}><Redo2 size={18} /></Btn>
        <Sep />
        <Btn title="Incolla dagli appunti (Ctrl+V)" onClick={p.onPaste}><ClipboardPaste size={18} /></Btn>
      </div>

      <div className="tb-group tb-center">
        {toolBtn('select')}
        <Sep />
        {FAMILIES.slice(0, 1).map(f => <ToolFamily key={f.name} {...f} tool={p.tool} setTool={p.setTool} isDisabled={isDisabled} />)}
        {toolBtn('text')}
        <Sep />
        {FAMILIES.slice(1, 4).map(f => <ToolFamily key={f.name} {...f} tool={p.tool} setTool={p.setTool} isDisabled={isDisabled} />)}
        <Sep />
        {FAMILIES.slice(4).map(f => <ToolFamily key={f.name} {...f} tool={p.tool} setTool={p.setTool} isDisabled={isDisabled} />)}
      </div>

      <div className="tb-group">
        {p.grouped ? (
          <Btn title="Separa il gruppo (Ctrl+Shift+G)" onClick={p.onUngroup}><Ungroup size={18} /></Btn>
        ) : (
          <Btn title="Raggruppa (Ctrl+G) — seleziona almeno due oggetti" onClick={p.onGroup} disabled={p.selectionCount < 2}><Group size={18} /></Btn>
        )}
        <Btn
          title={p.allLocked ? 'Sblocca (Ctrl+L)' : 'Blocca: non si sposta né si elimina (Ctrl+L)'}
          onClick={p.onToggleLock} disabled={!has} active={p.allLocked}
        >
          {p.allLocked ? <Lock size={18} /> : <LockOpen size={18} />}
        </Btn>
        <Btn title="Duplica (Ctrl+D)" onClick={p.onDuplicate} disabled={!has}><Copy size={18} /></Btn>
        <Btn title="Specchia: sinistra ↔ destra (con la rotazione di 180° si ottiene alto ↔ basso)" onClick={p.onMirror} disabled={!has || p.allLocked}><FlipHorizontal2 size={18} /></Btn>
        <Btn title="Porta in primo piano (Ctrl+])" onClick={p.onBringToFront} disabled={!has}><ChevronsUp size={18} /></Btn>
        <Btn title="Manda in fondo (Ctrl+[)" onClick={p.onSendToBack} disabled={!has}><ChevronsDown size={18} /></Btn>
        <Btn title="Elimina (Canc)" onClick={p.onDelete} disabled={!has || p.allLocked}><Trash2 size={18} /></Btn>
        <Sep />
        <button className="tb-primary" onClick={p.onScreenshot} title="Copia la vista negli appunti come immagine">
          <Camera size={16} />
          <span>Screenshot</span>
        </button>
        <Btn title={p.panelOpen ? 'Nascondi proprietà' : 'Mostra proprietà'} onClick={p.togglePanel} active={p.panelOpen}>
          {p.panelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
        </Btn>
      </div>
    </header>
  )
}
