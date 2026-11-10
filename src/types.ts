import type { ProfileSeries } from './profiles'

export type BaseObject = {
  id: string
  type: 'rect' | 'circle' | 'text' | 'profile' | 'image' | 'symbol' | 'arrow' | 'bolt' | 'quote' | 'polyline'
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
}

export type StrokeDash = 'solid' | 'dashed' | 'dotted'

export type QuoteObject = BaseObject & {
  type: 'quote'
  x1: number
  y1: number
  x2: number
  y2: number
  text?: string // Custom text override
  textColor?: string
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
}

export type ProfileObject = BaseObject & {
  type: 'profile'
  profileType: ProfileSeries
  profileName: string
  scale: number
  viewType: 'front' | 'side' | 'top'
  length: number
}

export type PolylineObject = {
  id: string
  type: 'polyline'
  points: Point[]
  closed: boolean
  stroke: string
  strokeWidth?: number
  fillEnabled: boolean
  fillColor?: string
  rotation?: number
  strokeDash?: StrokeDash
  locked?: boolean
}

export type ImageObject = BaseObject & {
  type: 'image'
  src: string
  width: number
  height: number
  opacity: number
  clipPoints?: Point[]
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

export type SymbolType = 'bubble'

export type SymbolObject = BaseObject & {
  type: 'symbol'
  symbolType: SymbolType
  points?: Point[] // For polylines/multi-point symbols
  value?: number   // For bubbles
}

export type Point = { x: number; y: number }

export type CanvasObject = RectObject | CircleObject | TextObject | ProfileObject | PolylineObject | ImageObject | SymbolObject | ArrowObject | BoltObject | QuoteObject
