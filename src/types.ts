export type BaseObject = {
  id: string
  type: 'rect' | 'circle' | 'text' | 'profile' | 'image' | 'symbol' | 'arrow' | 'bolt' | 'quote'
  x: number
  y: number
  stroke?: string
  strokeWidth?: number // Using this for thickness
  fillColor?: string
  fillEnabled?: boolean
  rotation?: number // Degrees
}

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
  profileType: 'IPE' | 'HEA' | 'HEB' | 'RHS' | 'CHS'
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
}

export type ImageObject = BaseObject & {
  type: 'image'
  src: string
  width: number
  height: number
  opacity: number
}

export type ArrowObject = BaseObject & {
  type: 'arrow'
  x1: number
  y1: number
  x2: number
  y2: number
}

export type BoltObject = BaseObject & {
  type: 'bolt'
  p1: Point
  p2: Point
  diameter: number
  spacingX: string // Tekla style: "100 2*80"
  spacingY: string
  offsetX: number // Shift from start along X
  offsetY: number // Shift from axis along Y
  viewType: 'top' | 'side'
  length: number
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
