import type { ComponentType } from 'react'
import { IconBolt, IconCable, IconDeck, IconDimension, IconEnvelope, IconIPE, IconClamp, IconCushion, IconKeder, IconPart, IconPerson, IconScrew, IconSeam, IconWeld } from './icons'
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
  | 'screw'
  | 'person'
  | 'part'
  | 'keder'
  | 'clamp'
  | 'cushion'
  | 'cable'
  | 'deck'
  | 'weld'
  | 'envelope'
  | 'seam'
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
  rect: { id: 'rect', label: 'Rettangolo', icon: Square, shortcut: 'R', hint: 'Clic su un vertice e clic sul vertice opposto (o trascina); Shift = quadrato' },
  circle: { id: 'circle', label: 'Cerchio', icon: Circle, shortcut: 'C', hint: 'Trascina dal centro verso il bordo, clic per dimensione standard' },
  text: { id: 'text', label: 'Testo', icon: Type, shortcut: 'T', hint: 'Clic dove inserire il testo e scrivi. Ctrl+Invio o Esc per terminare' },
  profile: { id: 'profile', label: 'Profilo', icon: IconIPE, shortcut: 'I', hint: 'Clic sulla tela per inserire il profilo scelto nel catalogo (Ctrl = snap)' },
  bubble: { id: 'bubble', label: 'Bollino numerato', icon: Hash, shortcut: 'N', sticky: true, hint: 'Clic sulla tela per inserire i bollini in sequenza (1, 2, 3…). Esc per terminare' },
  arrow: { id: 'arrow', label: 'Freccia', icon: ArrowUpRight, shortcut: 'A', hint: 'Trascina dalla coda alla punta' },
  bolt: { id: 'bolt', label: 'Bullone', icon: IconBolt, shortcut: 'B', hint: 'Clic per inserire un bullone (Ctrl = snap). Diametro, vista e ripetizione nel pannello' },
  screw: { id: 'screw', label: 'Vite', icon: IconScrew, shortcut: 'J', hint: 'Clic dove la vite entra nel materiale (Ctrl = snap). Tipo, diametro, lunghezza, testa e punta nel pannello; ruota con la maniglia' },
  keder: { id: 'keder', label: 'Membrana con keder', icon: IconKeder, shortcut: 'X', hint: 'Clic per i vertici dell\'asse della membrana: l\'ultimo punto è il centro del keder · doppio clic o Invio per terminare. Keder all\'inizio/alla fine, Ø e spessore nel pannello' },
  cushion: { id: 'cushion', label: 'Cuscino ETFE', icon: IconCushion, shortcut: 'S', hint: 'Clic sulle due estremità della campata. 2 strati a L/10 verso l\'alto e il basso; 3° strato (L/20) e frecce nel pannello' },
  clamp: { id: 'clamp', label: 'Morsetto radiale per fune', icon: IconClamp, shortcut: 'O', hint: 'Clic sull\'asse del bullone, poi sull\'asse della fune (L = distanza). Ø fune, piatti e bullone nel pannello' },
  part: { id: 'part', label: 'Componente membrana (ETFE / tessuto)', icon: IconPart, shortcut: 'G', hint: 'Scegli il componente nella scheda Componenti, poi clic per inserirlo (Ctrl = snap). Esplodi nel pannello per modificarne le linee' },
  person: { id: 'person', label: 'Persona (sagoma in scala)', icon: IconPerson, shortcut: 'Y', hint: 'Clic dove la persona poggia i piedi (Ctrl = snap). Figura e altezza nel pannello: operai, pubblico, tifosi, frontali o di profilo' },
  cable: { id: 'cable', label: 'Cavo FLC con forcelle', icon: IconCable, shortcut: 'F', hint: 'Clic sul primo perno (estremità A), clic sul secondo (B). Ctrl = snap. Taglia e forcelle nel pannello' },
  deck: { id: 'deck', label: 'Lamiera grecata', icon: IconDeck, shortcut: 'H', hint: 'Clic sul punto iniziale e sul punto finale dell\'appoggio: la linea è la larghezza della lamiera. Profilo, vista e getto nel pannello' },
  envelope: { id: 'envelope', label: 'Involucro: isolante, pannello sandwich, vetro', icon: IconEnvelope, shortcut: 'E', hint: 'Clic sul punto iniziale e sul punto finale della faccia d\'appoggio. Tipo, spessore e composizione nel pannello' },
  seam: { id: 'seam', label: 'Copertura aggraffata (standing seam)', icon: IconSeam, shortcut: 'U', hint: 'Clic sul punto iniziale e sul punto finale del piano di posa. Aggraffatura, altezza e passo nel pannello' },
  weld: { id: 'weld', label: 'Saldatura', icon: IconWeld, shortcut: 'W', hint: 'Clic sul giunto (punta della freccia), poi dove va la linea di riferimento. Norma, tipo, quote e cordone nel pannello' },
  quote: { id: 'quote', label: 'Quota', icon: IconDimension, shortcut: 'Q', hint: 'Clic sul primo punto, clic sul secondo' },
  measure: { id: 'measure', label: 'Misura', icon: Ruler, shortcut: 'M', hint: 'Clic su due punti per misurare la distanza' },
  scale: { id: 'scale', label: 'Scala con due punti', icon: Maximize, shortcut: 'K', keepSelection: true, hint: 'Clic su due punti di distanza nota dell\'immagine (o dell\'oggetto selezionato), poi inserisci la misura reale' },
  wand: { id: 'wand', label: 'Bacchetta magica', icon: Wand2, needs: 'image', keepSelection: true, hint: 'Clic su un colore dell\'immagine per renderlo trasparente' },
  crop: { id: 'crop', label: 'Scontorna', icon: Scissors, needs: 'image', keepSelection: true, hint: 'Clic sui vertici del contorno, doppio clic per applicare' },
}

/** Strumenti di creazione: disattivano la selezione degli oggetti sotto il cursore */
export const isCreationTool = (t: ToolId) =>
  t === 'line' || t === 'polyline' || t === 'freehand' || t === 'arrow' ||
  t === 'bolt' || t === 'screw' || t === 'person' || t === 'part' || t === 'clamp' || t === 'cushion' || t === 'cable' || t === 'deck' || t === 'weld' || t === 'envelope' || t === 'seam' || t === 'quote' || t === 'measure' || t === 'scale' ||
  t === 'rect' || t === 'circle' || t === 'text' || t === 'profile' || t === 'bubble'
