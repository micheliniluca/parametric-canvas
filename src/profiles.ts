/**
 * Catalogo profili laminati a caldo (dimensioni nominali EN 10365, come nel catalogo
 * ArcelorMittal "Sections and Merchant Bars"). Valori in mm.
 * h = altezza, b = larghezza, tw = anima, tf = ala (per IPN/UPN: spessore medio), r = raggio di raccordo.
 */
export type ProfileSeries =
  | 'IPE' | 'IPN' | 'HEA' | 'HEB' | 'HEM'
  | 'UPN' | 'UPE'
  | 'L'
  | 'RHS' | 'CHS'

/** Forma geometrica usata per il disegno */
export type ProfileShape = 'I' | 'U' | 'L' | 'RHS' | 'CHS'

export type SteelProfile = {
  name: string
  h: number
  b: number
  tw: number
  tf: number
  r?: number
  type: ProfileSeries
}

export const SERIES_SHAPE: Record<ProfileSeries, ProfileShape> = {
  IPE: 'I', IPN: 'I', HEA: 'I', HEB: 'I', HEM: 'I',
  UPN: 'U', UPE: 'U',
  L: 'L',
  RHS: 'RHS', CHS: 'CHS',
}

export const SERIES_GROUPS: { label: string; series: ProfileSeries[] }[] = [
  { label: 'Travi e colonne', series: ['IPE', 'HEA', 'HEB', 'HEM', 'IPN'] },
  { label: 'Canali', series: ['UPN', 'UPE'] },
  { label: 'Angolari', series: ['L'] },
  { label: 'Tubolari', series: ['RHS', 'CHS'] },
]

export const SERIES_LABEL: Record<ProfileSeries, string> = {
  IPE: 'IPE', IPN: 'IPN', HEA: 'HEA', HEB: 'HEB', HEM: 'HEM',
  UPN: 'UPN', UPE: 'UPE', L: 'L lati uguali', RHS: 'RHS / SHS', CHS: 'CHS',
}

type Row = [size: string, h: number, b: number, tw: number, tf: number, r: number]
const series = (type: ProfileSeries, rows: Row[], name = (s: string) => `${type} ${s}`): SteelProfile[] =>
  rows.map(([s, h, b, tw, tf, r]) => ({ name: name(s), h, b, tw, tf, r, type }))

export const IPE_CATALOG = series('IPE', [
  ['80', 80, 46, 3.8, 5.2, 5],
  ['100', 100, 55, 4.1, 5.7, 7],
  ['120', 120, 64, 4.4, 6.3, 7],
  ['140', 140, 73, 4.7, 6.9, 7],
  ['160', 160, 82, 5.0, 7.4, 9],
  ['180', 180, 91, 5.3, 8.0, 9],
  ['200', 200, 100, 5.6, 8.5, 12],
  ['220', 220, 110, 5.9, 9.2, 12],
  ['240', 240, 120, 6.2, 9.8, 15],
  ['270', 270, 135, 6.6, 10.2, 15],
  ['300', 300, 150, 7.1, 10.7, 15],
  ['330', 330, 160, 7.5, 11.5, 18],
  ['360', 360, 170, 8.0, 12.7, 18],
  ['400', 400, 180, 8.6, 13.5, 21],
  ['450', 450, 190, 9.4, 14.6, 21],
  ['500', 500, 200, 10.2, 16.0, 21],
  ['550', 550, 210, 11.1, 17.2, 24],
  ['600', 600, 220, 12.0, 19.0, 24],
])

export const HEA_CATALOG = series('HEA', [
  ['100', 96, 100, 5, 8, 12],
  ['120', 114, 120, 5, 8, 12],
  ['140', 133, 140, 5.5, 8.5, 12],
  ['160', 152, 160, 6, 9, 15],
  ['180', 171, 180, 6, 9.5, 15],
  ['200', 190, 200, 6.5, 10, 18],
  ['220', 210, 220, 7, 11, 18],
  ['240', 230, 240, 7.5, 12, 21],
  ['260', 250, 260, 7.5, 12.5, 24],
  ['280', 270, 280, 8, 13, 24],
  ['300', 290, 300, 8.5, 14, 27],
  ['320', 310, 300, 9, 15.5, 27],
  ['340', 330, 300, 9.5, 16.5, 27],
  ['360', 350, 300, 10, 17.5, 27],
  ['400', 390, 300, 11, 19, 27],
  ['450', 440, 300, 11.5, 21, 27],
  ['500', 490, 300, 12, 23, 27],
  ['550', 540, 300, 12.5, 24, 27],
  ['600', 590, 300, 13, 25, 27],
  ['650', 640, 300, 13.5, 26, 27],
  ['700', 690, 300, 14.5, 27, 27],
  ['800', 790, 300, 15, 28, 30],
  ['900', 890, 300, 16, 30, 30],
  ['1000', 990, 300, 16.5, 31, 30],
])

export const HEB_CATALOG = series('HEB', [
  ['100', 100, 100, 6, 10, 12],
  ['120', 120, 120, 6.5, 11, 12],
  ['140', 140, 140, 7, 12, 12],
  ['160', 160, 160, 8, 13, 15],
  ['180', 180, 180, 8.5, 14, 15],
  ['200', 200, 200, 9, 15, 18],
  ['220', 220, 220, 9.5, 16, 18],
  ['240', 240, 240, 10, 17, 21],
  ['260', 260, 260, 10, 17.5, 24],
  ['280', 280, 280, 10.5, 18, 24],
  ['300', 300, 300, 11, 19, 27],
  ['320', 320, 300, 11.5, 20.5, 27],
  ['340', 340, 300, 12, 21.5, 27],
  ['360', 360, 300, 12.5, 22.5, 27],
  ['400', 400, 300, 13.5, 24, 27],
  ['450', 450, 300, 14, 26, 27],
  ['500', 500, 300, 14.5, 28, 27],
  ['550', 550, 300, 15, 29, 27],
  ['600', 600, 300, 15.5, 30, 27],
  ['650', 650, 300, 16, 31, 27],
  ['700', 700, 300, 17, 32, 27],
  ['800', 800, 300, 17.5, 33, 30],
  ['900', 900, 300, 18.5, 35, 30],
  ['1000', 1000, 300, 19, 36, 30],
])

export const HEM_CATALOG = series('HEM', [
  ['100', 120, 106, 12, 20, 12],
  ['120', 140, 126, 12.5, 21, 12],
  ['140', 160, 146, 13, 22, 12],
  ['160', 180, 166, 14, 23, 15],
  ['180', 200, 186, 14.5, 24, 15],
  ['200', 220, 206, 15, 25, 18],
  ['220', 240, 226, 15.5, 26, 18],
  ['240', 270, 248, 18, 32, 21],
  ['260', 290, 268, 18, 32.5, 24],
  ['280', 310, 288, 18.5, 33, 24],
  ['300', 340, 310, 21, 39, 27],
  ['320', 359, 309, 21, 40, 27],
  ['340', 377, 309, 21, 40, 27],
  ['360', 395, 308, 21, 40, 27],
  ['400', 432, 307, 21, 40, 27],
  ['450', 478, 307, 21, 40, 27],
  ['500', 524, 306, 21, 40, 27],
  ['550', 572, 306, 21, 40, 27],
  ['600', 620, 305, 21, 40, 27],
  ['650', 668, 305, 21, 40, 27],
  ['700', 716, 304, 21, 40, 27],
  ['800', 814, 303, 21, 40, 30],
  ['900', 910, 302, 21, 40, 30],
  ['1000', 1008, 302, 21, 40, 30],
])

/** IPN: ali rastremate, tf = spessore medio (disegnate parallele) */
export const IPN_CATALOG = series('IPN', [
  ['80', 80, 42, 3.9, 5.9, 3.9],
  ['100', 100, 50, 4.5, 6.8, 4.5],
  ['120', 120, 58, 5.1, 7.7, 5.1],
  ['140', 140, 66, 5.7, 8.6, 5.7],
  ['160', 160, 74, 6.3, 9.5, 6.3],
  ['180', 180, 82, 6.9, 10.4, 6.9],
  ['200', 200, 90, 7.5, 11.3, 7.5],
  ['220', 220, 98, 8.1, 12.2, 8.1],
  ['240', 240, 106, 8.7, 13.1, 8.7],
  ['260', 260, 113, 9.4, 14.1, 9.4],
  ['280', 280, 119, 10.1, 15.2, 10.1],
  ['300', 300, 125, 10.8, 16.2, 10.8],
  ['320', 320, 131, 11.5, 17.3, 11.5],
  ['340', 340, 137, 12.2, 18.3, 12.2],
  ['360', 360, 143, 13, 19.5, 13],
  ['380', 380, 149, 13.7, 20.5, 13.7],
  ['400', 400, 155, 14.4, 21.6, 14.4],
])

/** UPN: ali rastremate, tf = spessore medio (disegnate parallele) */
export const UPN_CATALOG = series('UPN', [
  ['50', 50, 38, 5, 7, 7],
  ['65', 65, 42, 5.5, 7.5, 7.5],
  ['80', 80, 45, 6, 8, 8],
  ['100', 100, 50, 6, 8.5, 8.5],
  ['120', 120, 55, 7, 9, 9],
  ['140', 140, 60, 7, 10, 10],
  ['160', 160, 65, 7.5, 10.5, 10.5],
  ['180', 180, 70, 8, 11, 11],
  ['200', 200, 75, 8.5, 11.5, 11.5],
  ['220', 220, 80, 9, 12.5, 12.5],
  ['240', 240, 85, 9.5, 13, 13],
  ['260', 260, 90, 10, 14, 14],
  ['280', 280, 95, 10, 15, 15],
  ['300', 300, 100, 10, 16, 16],
  ['320', 320, 100, 14, 17.5, 17.5],
  ['350', 350, 100, 14, 16, 16],
  ['380', 380, 102, 13.5, 16, 16],
  ['400', 400, 110, 14, 18, 18],
])

export const UPE_CATALOG = series('UPE', [
  ['80', 80, 50, 4, 7, 10],
  ['100', 100, 55, 4.5, 7.5, 10],
  ['120', 120, 60, 5, 8, 12],
  ['140', 140, 65, 5, 9, 12],
  ['160', 160, 70, 5.5, 9.5, 12],
  ['180', 180, 75, 5.5, 10.5, 12],
  ['200', 200, 80, 6, 11, 13],
  ['220', 220, 85, 6.5, 12, 13],
  ['240', 240, 90, 7, 12.5, 15],
  ['270', 270, 95, 7.5, 13.5, 15],
  ['300', 300, 100, 9.5, 15, 15],
  ['330', 330, 105, 11, 16, 18],
  ['360', 360, 110, 12, 17, 18],
  ['400', 400, 115, 13.5, 18, 18],
])

/** Angolari a lati uguali: h = b = lato, tw = tf = spessore */
const angle = (a: number, t: number, r: number): Row => [`${a}x${a}x${t}`, a, a, t, t, r]
export const L_CATALOG = series('L', [
  angle(30, 3, 5), angle(40, 4, 6), angle(40, 5, 6), angle(45, 5, 7), angle(50, 5, 7), angle(50, 6, 7),
  angle(60, 6, 8), angle(60, 8, 8), angle(70, 7, 9), angle(80, 8, 10), angle(90, 9, 11),
  angle(100, 10, 12), angle(110, 10, 12), angle(120, 10, 13), angle(120, 12, 13), angle(130, 12, 14),
  angle(150, 12, 16), angle(150, 15, 16), angle(160, 15, 17), angle(180, 18, 18), angle(200, 16, 18),
  angle(200, 20, 18), angle(200, 24, 18),
])

export const RHS_CATALOG: SteelProfile[] = [
  ...([[50, 30, 3], [60, 40, 3], [80, 40, 4], [100, 50, 4], [120, 60, 4], [150, 100, 5], [200, 100, 6], [250, 150, 8], [300, 200, 10]] as const)
    .map(([h, b, t]) => ({ name: `RHS ${h}x${b}x${t}`, h, b, tw: t, tf: t, type: 'RHS' as const })),
  ...([[40, 3], [50, 3], [60, 3], [80, 4], [100, 4], [120, 5], [150, 5], [200, 6], [250, 8]] as const)
    .map(([a, t]) => ({ name: `SHS ${a}x${a}x${t}`, h: a, b: a, tw: t, tf: t, type: 'RHS' as const })),
]

export const CHS_CATALOG: SteelProfile[] = ([
  [33.7, 3], [42.4, 3], [48.3, 3], [60.3, 3], [76.1, 4], [88.9, 4], [101.6, 4], [114.3, 4], [139.7, 5],
  [168.3, 5], [193.7, 5], [219.1, 6], [244.5, 6], [273.0, 6], [323.9, 8],
] as const).map(([d, t]) => ({ name: `CHS ${d}x${t}`, h: d, b: d, tw: t, tf: t, type: 'CHS' as const }))

export const CATALOG_BY_SERIES: Record<ProfileSeries, SteelProfile[]> = {
  IPE: IPE_CATALOG, IPN: IPN_CATALOG, HEA: HEA_CATALOG, HEB: HEB_CATALOG, HEM: HEM_CATALOG,
  UPN: UPN_CATALOG, UPE: UPE_CATALOG, L: L_CATALOG, RHS: RHS_CATALOG, CHS: CHS_CATALOG,
}

export const ALL_PROFILES: SteelProfile[] = Object.values(CATALOG_BY_SERIES).flat()

/** Trova un profilo per nome (compatibile con i nomi dei disegni salvati, es. "CHS 273.0x6") */
export const findProfile = (name: string): SteelProfile | undefined => {
  const exact = ALL_PROFILES.find(p => p.name === name)
  if (exact) return exact
  const norm = (s: string) => s.replace(/(\d)\.0(?!\d)/g, '$1')
  return ALL_PROFILES.find(p => norm(p.name) === norm(name))
}
