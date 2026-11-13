import type { ComponentType } from 'react'
import { IconBolt, IconCable, IconDimension, IconIPE } from './icons'
import {
  MousePointer2,
  Minus,
  Activity,
  PenTool,
  ArrowUpRight,
  Ruler,
  Maximize,
  Wand2,
  Scissors,
  Hash,
  Square,
  Circle,
  Type,
} from 'lucide-react'

/**
 * Strumenti "modali": restano attivi finché l'utente non disegna (o preme Esc).
 * Un solo strumento attivo alla volta: sostituisce i vecchi flag isXxxMode.
 */
export type ToolId =
  | 'select'
  | 'line'
  | 'polyline'
  | 'rect'
  | 'circle'
  | 'text'
  | 'profile'
  | 'bubble'
  | 'freehand'
  | 'arrow'
  | 'bolt'
  | 'cable'
  | 'quote'
  | 'measure'
  | 'scale'
  | 'wand'
  | 'crop'

export type ToolDef = {
  id: ToolId
  label: string
  icon: ComponentType<{ size?: number | string }>
  shortcut?: string
  /** Lo strumento resta attivo dopo aver creato un oggetto */
  sticky?: boolean
  /** Richiede un'immagine selezionata */
  needs?: 'image'
  /** Attivando lo strumento la selezione corrente viene mantenuta */
  keepSelection?: boolean
  hint: string
}

export const TOOLS: Record<ToolId, ToolDef> = {
  select: { id: 'select', label: 'Seleziona', icon: MousePointer2, shortcut: 'V', hint: 'Clic seleziona · Ctrl+clic aggiunge/toglie · trascina per il riquadro (→ dentro, ← toccati) · tasto centrale sposta la vista' },
  line: { id: 'line', label: 'Linea', icon: Minus, shortcut: 'L', hint: 'Trascina per disegnare una linea (Shift = ortogonale)' },
  polyline: { id: 'polyline', label: 'Polilinea', icon: Activity, shortcut: 'P', hint: 'Clic per aggiungere vertici · clic sul primo punto per chiudere · doppio clic o Invio per terminare' },
  freehand: { id: 'freehand', label: 'Mano libera', icon: PenTool, shortcut: 'D', sticky: true, hint: 'Trascina per disegnare. Esc per terminare' },
  rect: { id: 'rect', label: 'Rettangolo', icon: Square, shortcut: 'R', hint: 'Trascina per disegnare (Shift = quadrato), clic per dimensione standard' },
  circle: { id: 'circle', label: 'Cerchio', icon: Circle, shortcut: 'C', hint: 'Trascina dal centro verso il bordo, clic per dimensione standard' },
  text: { id: 'text', label: 'Testo', icon: Type, shortcut: 'T', hint: 'Clic dove inserire il testo e scrivi. Ctrl+Invio o Esc per terminare' },
  profile: { id: 'profile', label: 'Profilo', icon: IconIPE, shortcut: 'I', hint: 'Clic sulla tela per inserire il profilo scelto nel catalogo (Ctrl = snap)' },
  bubble: { id: 'bubble', label: 'Bollino numerato', icon: Hash, shortcut: 'N', sticky: true, hint: 'Clic sulla tela per inserire i bollini in sequenza (1, 2, 3…). Esc per terminare' },
  arrow: { id: 'arrow', label: 'Freccia', icon: ArrowUpRight, shortcut: 'A', hint: 'Trascina dalla coda alla punta' },
  bolt: { id: 'bolt', label: 'Bullone', icon: IconBolt, shortcut: 'B', hint: 'Clic per inserire un bullone (Ctrl = snap). Diametro, vista e ripetizione nel pannello' },
  cable: { id: 'cable', label: 'Cavo FLC con forcelle', icon: IconCable, shortcut: 'F', hint: 'Clic sul primo perno (estremità A), clic sul secondo (B). Ctrl = snap. Taglia e forcelle nel pannello' },
  quote: { id: 'quote', label: 'Quota', icon: IconDimension, shortcut: 'Q', hint: 'Clic sul primo punto, clic sul secondo' },
  measure: { id: 'measure', label: 'Misura', icon: Ruler, shortcut: 'M', hint: 'Clic su due punti per misurare la distanza' },
  scale: { id: 'scale', label: 'Scala con due punti', icon: Maximize, shortcut: 'K', keepSelection: true, hint: 'Clic su due punti di distanza nota dell\'immagine (o dell\'oggetto selezionato), poi inserisci la misura reale' },
  wand: { id: 'wand', label: 'Bacchetta magica', icon: Wand2, needs: 'image', keepSelection: true, hint: 'Clic su un colore dell\'immagine per renderlo trasparente' },
  crop: { id: 'crop', label: 'Scontorna', icon: Scissors, needs: 'image', keepSelection: true, hint: 'Clic sui vertici del contorno, doppio clic per applicare' },
}

/** Strumenti di creazione: disattivano la selezione degli oggetti sotto il cursore */
export const isCreationTool = (t: ToolId) =>
  t === 'line' || t === 'polyline' || t === 'freehand' || t === 'arrow' ||
  t === 'bolt' || t === 'cable' || t === 'quote' || t === 'measure' || t === 'scale' ||
  t === 'rect' || t === 'circle' || t === 'text' || t === 'profile' || t === 'bubble'
