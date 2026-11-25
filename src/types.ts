export type BaseObject = {
  id: string
  type: 'rect' | 'circle' | 'text' | 'profile' | 'image' | 'symbol' | 'arrow' | 'bolt' | 'quote' | 'polyline' | 'cable' | 'deck' | 'weld' | 'envelope' | 'seam' | 'screw'
  x: number
  y: number
  stroke?: string
  strokeWidth?: number // Using this for thickness
  fillColor?: string
  fillEnabled?: boolean
  rotation?: number // Degrees
  strokeDash?: StrokeDash
  /** Bloccato: non si sposta, ridimensiona o elimina finché non viene sbloccato */
  locked?: boolean
  /** Oggetti con lo stesso groupId si selezionano e si muovono insieme */
  groupId?: string
  /** Opacità dell'intero oggetto, 0–1 (assente = 1) */
  opacity?: number
  /** Opacità del solo riempimento, 0–1 (assente = 1) */
  fillOpacity?: number
  /** Retino del materiale (forme chiuse) */
  pattern?: HatchId
  patternScale?: number
  /** Angolo del retino in gradi */
  patternAngle?: number
}

export type StrokeDash = 'solid' | 'dashed' | 'dotted'

/** Retini dei materiali da costruzione (catalogo in utils/hatchUtils) */
export type HatchId =
  | 'concrete' | 'rc' | 'steel' | 'timber' | 'timberEnd'
  | 'brick' | 'hollowBrick' | 'block' | 'stone'
  | 'soil' | 'gravel' | 'sand' | 'lean' | 'fill'
  | 'xps' | 'wool' | 'plaster' | 'board' | 'glass' | 'membrane' | 'water'

export type QuoteObject = BaseObject & {
  type: 'quote'
  x1: number
  y1: number
  x2: number
  y2: number
  text?: string // Custom text override
  textColor?: string
  /** Terminali alle estremità: frecce (predefinite) o trattini obliqui */
  ends?: 'arrow' | 'tick'
}

export type RectObject = BaseObject & {
  type: 'rect'
  width: number
  height: number
}

export type CircleObject = BaseObject & {
  type: 'circle'
  radius: number
}

export type TextObject = BaseObject & {
  type: 'text'
  text: string
  fontSize: number
  textColor?: string
  boxEnabled: boolean
  boxPadding: number
  width?: number // Optional manual sizing
  height?: number
  /** Punta della linea di richiamo (coordinate mondo); assente = senza richiamo */
  leader?: Point
  /** Terminale della linea di richiamo */
  leaderEnd?: 'arrow' | 'dot' | 'none'
  /** Spessore della linea di richiamo (mm); assente = proporzionale all'altezza del testo */
  leaderWidth?: number
}

export type ProfileObject = BaseObject & {
  type: 'profile'
  /** Serie del catalogo (es. HEA, IPE, RHS/SHS caldo) */
  profileType: string
  profileName: string
  scale: number
  viewType: 'front' | 'side' | 'top'
  length: number
  /** Etichetta sul disegno */
  label?: 'none' | 'name' | 'code' | 'tekla'
  /** Specchiato rispetto all'asse verticale del proprio centro */
  flipX?: boolean
}

export type PolylineObject = {
  id: string
  type: 'polyline'
  points: Point[]
  closed: boolean
  /** Pressione della penna per ogni punto (mano libera): spessore variabile */
  pressures?: number[]
  stroke: string
  strokeWidth?: number
  fillEnabled: boolean
  fillColor?: string
  rotation?: number
  strokeDash?: StrokeDash
  locked?: boolean
  groupId?: string
  opacity?: number
  fillOpacity?: number
  /** Retino del materiale (forme chiuse) */
  pattern?: HatchId
  patternScale?: number
  /** Angolo del retino in gradi */
  patternAngle?: number
}

export type ImageObject = BaseObject & {
  type: 'image'
  src: string
  width: number
  height: number
  opacity: number
  clipPoints?: Point[]
  /** Specchiata rispetto all'asse verticale del proprio centro */
  flipX?: boolean
}

export type ArrowObject = BaseObject & {
  type: 'arrow'
  x1: number
  y1: number
  x2: number
  y2: number
}

export type BoltView = 'head' | 'nut' | 'hole' | 'section'
export type BoltGrade = '4.6' | '5.6' | '6.8' | '8.8' | '10.9'

/**
 * Bullone (o gruppo di bulloni uguali disposti a griglia).
 * x, y = centro del primo bullone; in sezione = asse sulla faccia superiore del pacco.
 */
export type BoltObject = BaseObject & {
  type: 'bolt'
  diameter: number
  grade: BoltGrade
  view: BoltView
  /** Spessore del pacco serrato (mm), usato in sezione e per la lunghezza */
  grip: number
  cols: number
  pitchX: number
  rows: number
  pitchY: number
  showLabel?: boolean
}

/**
 * Fune spiroidale chiusa FLC con forcelle TTF (catalogo Redaelli).
 * (x1, y1) = estremità A, (x2, y2) = estremità B: centro del perno se c'è la forcella,
 * altrimenti l'estremità della fune.
 */
export type CableObject = BaseObject & {
  type: 'cable'
  x1: number
  y1: number
  x2: number
  y2: number
  /** Diametro nominale FLC (mm) */
  size: number
  /** Forcella all'estremità A */
  startSocket: boolean
  /** Forcella all'estremità B */
  endSocket: boolean
  showLabel?: boolean
}

/**
 * Lamiera grecata (es. ComFlor 46) disegnata con una linea.
 * Sezione e vista dall'alto: la linea è la larghezza, sul piano d'appoggio (fondo delle gole).
 * Vista laterale (lungo le greche): la linea è la lunghezza della lamiera.
 */
export type DeckObject = BaseObject & {
  type: 'deck'
  x1: number
  y1: number
  x2: number
  y2: number
  /** Codice del profilo nel catalogo lamiere (es. CF46) */
  profile: string
  /** Spessore nominale (mm) */
  thickness: number
  view: 'section' | 'top' | 'side'
  /** Larghezza (mm), usata quando la linea è la lunghezza (vista laterale) */
  width: number
  /** Lunghezza della lamiera / campata (mm), usata quando la linea è la larghezza */
  length: number
  /** Spessore totale della soletta dal fondo delle gole (mm); 0 o assente = senza getto */
  slab?: number
  /** Retino del calcestruzzo (tipo AR-CONC) sul getto */
  hatch?: boolean
  /** Pioli saldati attraverso la lamiera (connettori a taglio) */
  studs?: boolean
  /** Diametro del gambo (mm) */
  studD?: number
  /** Altezza dopo la saldatura (mm) */
  studH?: number
  /** Pioli per gola (1 o 2) */
  studsPerTrough?: number
  /** Interasse delle travi intermedie (mm); 0 o assente = solo le travi d'estremità */
  beamSpacing?: number
  showLabel?: boolean
}

/**
 * Simbolo di saldatura (ISO 2553 sistema A o AWS A2.4) con cordone in sezione opzionale.
 * (x1, y1) = punta della freccia sul giunto; (x2, y2) = inizio della linea di riferimento.
 */
export type WeldObject = BaseObject & {
  type: 'weld'
  x1: number
  y1: number
  x2: number
  y2: number
  standard: 'iso' | 'aws'
  /** Simbolo elementare; sui due lati V → X, mezza V → K */
  kind: 'fillet' | 'I' | 'V' | 'bevel' | 'Y' | 'bevelY' | 'U' | 'J'
  side: 'arrow' | 'other' | 'both'
  /** ISO angolo: a (gola) o z (lato); testa a testa: s (penetrazione); AWS: lato o profondità. 0 = non indicata */
  size: number
  sizeRef?: 'a' | 'z'
  /** Lunghezza del cordone (mm); 0 = non indicata */
  length?: number
  /** Cordone a tratti: numero di tratti (n) e distanza tra i tratti (e) */
  count?: number
  gap?: number
  staggered?: boolean
  allAround?: boolean
  field?: boolean
  contour?: 'none' | 'flat' | 'convex' | 'concave'
  /** Procedimento nella coda (ISO 4063 o sigla AWS) */
  process?: string
  /** Testo libero nella coda (es. livello di qualità, posizione, rimando a un dettaglio), dopo il procedimento */
  tailText?: string
  /** Disegna il cordone in sezione sulla punta della freccia, in scala reale */
  showBead?: boolean
  /** Spessore della lamiera (testa a testa) o dell'anima (angolo su due lati), mm */
  plate?: number
  /** Orientamento del cordone: quarti di giro in senso orario e specchiatura */
  beadRot?: number
  beadFlip?: boolean
  /** Altezza del testo del simbolo (mm sulla tela) */
  textSize?: number
}

/**
 * Elemento d'involucro in sezione: isolante, pannello sandwich o vetrata.
 * La linea è la faccia d'appoggio; lo spessore cresce verso l'alto dello schermo (o dall'altra parte con flip).
 */
export type EnvelopeObject = BaseObject & {
  type: 'envelope'
  x1: number
  y1: number
  x2: number
  y2: number
  kind: 'insulation' | 'sandwich' | 'glass' | 'aquapanel'
  /** Spessore (isolante, pannello) in mm */
  thickness: number
  /** Dall'altra parte della linea */
  flip?: boolean
  /** Sandwich: faccia esterna piana (parete) o grecata (copertura) */
  ribs?: 'flat' | 'roof'
  ribHeight?: number
  ribPitch?: number
  /** Sandwich: spessore delle lamiere e larghezza utile del pannello (giunti); 0 = senza giunti */
  skin?: number
  module?: number
  /** Vetro: composizione, es. 6/16/6 o 33.1/16/6 */
  glazing?: string
  /**
   * Parete Knauf Aquapanel Outdoor, dall'esterno (lato linea): rasatura con rete, lastra 12,5,
   * Tyvek StuccoWrap, montanti C MgZ con isolante, eventuale seconda orditura, lastre interne.
   */
  aqRender?: number
  aqStud?: number
  aqSpacing?: number
  aqFrames?: 1 | 2
  aqInnerStud?: number
  aqGap?: number
  aqBoards?: number
  aqInsulation?: boolean
  showLabel?: boolean
}

/** Copertura a giunti aggraffati (standing seam) in sezione: la linea è il piano di posa */
export type SeamObject = BaseObject & {
  type: 'seam'
  x1: number
  y1: number
  x2: number
  y2: number
  seam: 'double' | 'angle' | 'snap'
  /** Altezza della nervatura (mm) */
  height: number
  /** Passo di posa = larghezza utile della lastra (mm) */
  pitch: number
  /** Spessore della lamiera (mm), per l'etichetta */
  thickness: number
  flip?: boolean
  showLabel?: boolean
}

/**
 * Vite (acciaio, lamiera, legno, cartongesso, Aquapanel, calcestruzzo), in vista laterale o dalla testa.
 * x, y = centro della superficie d'appoggio; la vite scende lungo +y (prima della rotazione).
 */
export type ScrewObject = BaseObject & {
  type: 'screw'
  kind: 'drill' | 'tapping' | 'wood' | 'lag' | 'plaster' | 'aquapanel' | 'concrete'
  view: 'side' | 'head'
  diameter: number
  /** Lunghezza nominale (mm): sotto la testa, o totale per le teste a filo */
  length: number
  head: 'hexWasher' | 'hex' | 'pan' | 'countersunk' | 'bugle'
  point: 'drill' | 'cone' | 'blunt' | 'gimlet' | 'needle'
  drive: 'PH' | 'TX' | 'none'
  /** Legno: filetto totale o lunghezza filettata */
  fullThread?: boolean
  threadLength?: number
  /** Rondella con guarnizione EPDM (lamiere) */
  washer?: boolean
  washerD?: number
  showLabel?: boolean
}

export type SymbolType = 'bubble'

export type SymbolObject = BaseObject & {
  type: 'symbol'
  symbolType: SymbolType
  points?: Point[] // For polylines/multi-point symbols
  value?: number   // For bubbles
}

export type Point = { x: number; y: number }

export type CanvasObject = RectObject | CircleObject | TextObject | ProfileObject | PolylineObject | ImageObject | SymbolObject | ArrowObject | BoltObject | QuoteObject | CableObject | DeckObject | WeldObject | EnvelopeObject | SeamObject | ScrewObject
