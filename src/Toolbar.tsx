import type { ReactNode } from 'react'
import type { CanvasObject } from './types'
import type { ToolId } from './tools'
import { TOOLS } from './tools'
import {
  Camera, Undo2, Redo2, FilePlus2, FolderOpen, Save, ClipboardPaste, Lock, LockOpen,
  ChevronsUp, ChevronsDown, Trash2, Copy, PanelRightOpen, PanelRightClose, Group, Ungroup,
} from 'lucide-react'


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

export function Toolbar(p: Props) {
  const toolBtn = (id: ToolId) => {
    const t = TOOLS[id]
    const Icon = t.icon
    const disabled = t.needs === 'image' && p.selected?.type !== 'image'
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
        {toolBtn('freehand')}
        {toolBtn('line')}
        {toolBtn('polyline')}
        {toolBtn('arrow')}
        {toolBtn('rect')}
        {toolBtn('circle')}
        {toolBtn('text')}
        <Sep />
        {toolBtn('profile')}
        {toolBtn('bolt')}
        {toolBtn('quote')}
        {toolBtn('bubble')}
        {toolBtn('measure')}
        <Sep />
        {toolBtn('scale')}
        {toolBtn('wand')}
        {toolBtn('crop')}
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
