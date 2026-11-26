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

/** Fune con forcelle alle due estremità */
export const IconCable = ({ size }: Props) => (
  <Svg size={size}>
    <path d="M 8.2 15.8 L 15.8 8.2" strokeWidth={2.5} />
    <path d="M 3.2 20.8 A 3.4 3.4 0 0 1 3.6 15.2 L 6.2 13.4 L 10.6 17.8 L 8.8 20.4 A 3.4 3.4 0 0 1 3.2 20.8 Z" strokeWidth={1.5} />
    <path d="M 20.8 3.2 A 3.4 3.4 0 0 1 20.4 8.8 L 17.8 10.6 L 13.4 6.2 L 15.2 3.6 A 3.4 3.4 0 0 1 20.8 3.2 Z" strokeWidth={1.5} />
    <circle cx="5.2" cy="18.8" r="1" fill="currentColor" strokeWidth={0} />
    <circle cx="18.8" cy="5.2" r="1" fill="currentColor" strokeWidth={0} />
  </Svg>
)

/** Lamiera grecata in sezione */
export const IconDeck = ({ size }: Props) => (
  <Svg size={size}>
    <path d="M 1.5 9 H 4 L 6.5 16 H 10 L 12.5 9 H 15 L 17.5 16 H 21 L 22.5 12" strokeWidth={1.75} />
    <path d="M 1.5 19.5 H 22.5" strokeWidth={1.25} strokeDasharray="3 2" />
  </Svg>
)

/** Vite autoperforante vista di lato */
export const IconScrew = ({ size }: Props) => (
  <Svg size={size}>
    <path d="M 7.5 3 H 16.5 V 6 H 7.5 Z" strokeWidth={1.5} strokeLinejoin="round" />
    <path d="M 10 6 L 14 7.5 L 10 9.5 L 14 11.5 L 10 13.5 L 14 15.5 L 10.6 17.3 L 12 21.5 L 13.4 17.3" strokeWidth={1.4} strokeLinejoin="round" />
  </Svg>
)

/** Fune inox con forcella e tenditore */
export const IconRope = ({ size }: Props) => (
  <Svg size={size}>
    <circle cx="4.5" cy="12" r="1.6" strokeWidth={1.3} />
    <path d="M 2 9.5 H 7 L 9 11 H 10 V 13 H 9 L 7 14.5 H 2 M 10 10 H 16 V 14 H 10 M 16 12 H 22" strokeWidth={1.4} strokeLinejoin="round" />
  </Svg>
)

/** Cuscino ETFE: due strati ad arco */
export const IconCushion = ({ size }: Props) => (
  <Svg size={size}>
    <path d="M 3 13 Q 12 4 21 13 Q 12 22 3 13 Z" strokeWidth={1.5} strokeLinejoin="round" />
    <path d="M 3 13 Q 12 1 21 13" strokeWidth={1} strokeDasharray="2 1.5" />
  </Svg>
)

/** Keder: membrana che avvolge il cordone */
export const IconKeder = ({ size }: Props) => (
  <Svg size={size}>
    <path d="M 2 15 L 13 12.6 M 2 17 L 13 14.6" strokeWidth={1.5} strokeLinecap="round" />
    <circle cx="17" cy="12.6" r="4.2" strokeWidth={1.5} />
    <circle cx="17" cy="12.6" r="2" strokeWidth={1.2} />
  </Svg>
)

/** Morsetto radiale: piatti a U attorno alla fune */
export const IconClamp = ({ size }: Props) => (
  <Svg size={size}>
    <path d="M 4 9 L 14 7 A 5 5 0 0 1 14 17 L 4 15" strokeWidth={1.5} strokeLinejoin="round" />
    <circle cx="15" cy="12" r="2.4" strokeWidth={1.3} />
    <path d="M 5 5.5 V 18.5" strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
)

/** Componente membrana: profilo in alluminio con keder */
export const IconPart = ({ size }: Props) => (
  <Svg size={size}>
    <path d="M 4 9 H 9 V 6 H 15 V 9 H 20 V 13 H 15 V 18 H 9 V 13 H 4 Z" strokeWidth={1.5} strokeLinejoin="round" />
    <circle cx="12" cy="12" r="1.8" strokeWidth={1.5} />
  </Svg>
)

/** Persona: sagoma in piedi */
export const IconPerson = ({ size }: Props) => (
  <Svg size={size}>
    <circle cx="12" cy="4.2" r="2.1" strokeWidth={1.5} />
    <path d="M 8 21 L 9.2 13.5 L 7.6 13 L 8.6 8 Q 12 7 15.4 8 L 16.4 13 L 14.8 13.5 L 16 21 M 12 14 V 21" strokeWidth={1.5} strokeLinejoin="round" />
  </Svg>
)

/** Involucro: pannello con isolante a spirale */
export const IconEnvelope = ({ size }: Props) => (
  <Svg size={size}>
    <path d="M 2 6.5 H 22 M 2 17.5 H 22" strokeWidth={1.6} />
    <path d="M 4 9.5 A 1.6 1.6 0 0 1 7.2 9.5 L 5.6 14.5 A 1.6 1.6 0 0 0 8.8 14.5 L 7.2 9.5 M 10.4 9.5 A 1.6 1.6 0 0 1 13.6 9.5 L 12 14.5 A 1.6 1.6 0 0 0 15.2 14.5 L 13.6 9.5 M 16.8 9.5 A 1.6 1.6 0 0 1 20 9.5 L 18.4 14.5" strokeWidth={1.1} />
  </Svg>
)

/** Copertura a giunti aggraffati */
export const IconSeam = ({ size }: Props) => (
  <Svg size={size}>
    <path d="M 1.5 17 H 6.3 V 8 M 7.7 8 V 17 H 16.3 V 8 M 17.7 8 V 17 H 22.5" strokeWidth={1.5} strokeLinejoin="round" />
    <rect x="5.5" y="6.5" width="3" height="3.2" fill="currentColor" strokeWidth={0.8} />
    <rect x="15.5" y="6.5" width="3" height="3.2" fill="currentColor" strokeWidth={0.8} />
  </Svg>
)

/** Simbolo di saldatura: freccia, linea di riferimento e cordone d'angolo */
export const IconWeld = ({ size }: Props) => (
  <Svg size={size}>
    <path d="M 3 21 L 10 12 H 22" strokeWidth={1.5} />
    <path d="M 3 21 L 3.6 17.4 L 6.2 19.4 Z" fill="currentColor" strokeWidth={1} />
    <path d="M 13.5 12 V 5.5 L 20 12" strokeWidth={1.5} strokeLinejoin="round" />
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
