/**
 * Icone tecniche disegnate nello stesso stile di lucide-react (griglia 24×24, tratto 2).
 */
type Props = { size?: number | string }

const Svg = ({ size = 24, children }: Props & { children: React.ReactNode }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
)

/** Bullone visto dal lato testa: esagono, rondella, assi */
export const IconBolt = ({ size }: Props) => (
  <Svg size={size}>
    <path d="M 20.5 12 L 16.25 19.36 L 7.75 19.36 L 3.5 12 L 7.75 4.64 L 16.25 4.64 Z" />
    <circle cx="12" cy="12" r="3.6" />
    <path d="M 12 1.5 V 4 M 12 20 V 22.5 M 1 12 H 2.5 M 21.5 12 H 23" strokeWidth={1.25} />
  </Svg>
)

/** Sezione di una trave IPE con raccordi */
export const IconIPE = ({ size }: Props) => (
  <Svg size={size}>
    <path d="M 5 3 H 19 V 6 H 14 Q 13 6 13 7 V 17 Q 13 18 14 18 H 19 V 21 H 5 V 18 H 10 Q 11 18 11 17 V 7 Q 11 6 10 6 H 5 Z" />
  </Svg>
)

/** Quota secondo ISO 129: linee di riferimento, linea di misura con frecce piene, valore */
export const IconDimension = ({ size }: Props) => (
  <Svg size={size}>
    <path d="M 3 6 V 20 M 21 6 V 20" strokeWidth={1.5} />
    <path d="M 3 16 H 21" strokeWidth={1.5} />
    <path d="M 3 16 L 7.5 14 V 18 Z M 21 16 L 16.5 14 V 18 Z" fill="currentColor" strokeWidth={1} />
    <path d="M 9 11 H 15" strokeWidth={2} />
  </Svg>
)
