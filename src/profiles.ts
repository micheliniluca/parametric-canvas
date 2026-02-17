export type SteelProfile = {
  name: string
  h: number   // height
  b: number   // width
  tw: number  // web thickness
  tf: number  // flange thickness
  r?: number  // radius (optional for simplified drawing)
  type: 'IPE' | 'HEA' | 'HEB'
}

export const IPE_CATALOG: SteelProfile[] = [
  { name: 'IPE 80', h: 80, b: 46, tw: 3.8, tf: 5.2, type: 'IPE' },
  { name: 'IPE 100', h: 100, b: 55, tw: 4.1, tf: 5.7, type: 'IPE' },
  { name: 'IPE 120', h: 120, b: 64, tw: 4.4, tf: 6.3, type: 'IPE' },
  { name: 'IPE 140', h: 140, b: 73, tw: 4.7, tf: 6.9, type: 'IPE' },
  { name: 'IPE 160', h: 160, b: 82, tw: 5.0, tf: 7.4, type: 'IPE' },
  { name: 'IPE 180', h: 180, b: 91, tw: 5.3, tf: 8.0, type: 'IPE' },
  { name: 'IPE 200', h: 200, b: 100, tw: 5.6, tf: 8.5, type: 'IPE' },
  { name: 'IPE 220', h: 220, b: 110, tw: 5.9, tf: 9.2, type: 'IPE' },
  { name: 'IPE 240', h: 240, b: 120, tw: 6.2, tf: 9.8, type: 'IPE' },
  { name: 'IPE 270', h: 270, b: 135, tw: 6.6, tf: 10.2, type: 'IPE' },
  { name: 'IPE 300', h: 300, b: 150, tw: 7.1, tf: 10.7, type: 'IPE' },
  { name: 'IPE 330', h: 330, b: 160, tw: 7.5, tf: 11.5, type: 'IPE' },
  { name: 'IPE 360', h: 360, b: 170, tw: 8.0, tf: 12.7, type: 'IPE' },
  { name: 'IPE 400', h: 400, b: 180, tw: 8.6, tf: 13.5, type: 'IPE' },
  { name: 'IPE 450', h: 450, b: 190, tw: 9.4, tf: 14.6, type: 'IPE' },
  { name: 'IPE 500', h: 500, b: 200, tw: 10.2, tf: 16.0, type: 'IPE' },
  { name: 'IPE 550', h: 550, b: 210, tw: 11.1, tf: 17.2, type: 'IPE' },
  { name: 'IPE 600', h: 600, b: 220, tw: 12.0, tf: 19.0, type: 'IPE' },
]

export const HEA_CATALOG: SteelProfile[] = [
  { name: 'HEA 100', h: 96, b: 100, tw: 5, tf: 8, type: 'HEA' },
  { name: 'HEA 120', h: 114, b: 120, tw: 5, tf: 8, type: 'HEA' },
  { name: 'HEA 140', h: 133, b: 140, tw: 5.5, tf: 8.5, type: 'HEA' },
  { name: 'HEA 160', h: 152, b: 160, tw: 6, tf: 9, type: 'HEA' },
  { name: 'HEA 180', h: 171, b: 180, tw: 6, tf: 9.5, type: 'HEA' },
  { name: 'HEA 200', h: 190, b: 200, tw: 6.5, tf: 10, type: 'HEA' },
  { name: 'HEA 220', h: 210, b: 220, tw: 7, tf: 11, type: 'HEA' },
  { name: 'HEA 240', h: 230, b: 240, tw: 7.5, tf: 12, type: 'HEA' },
  { name: 'HEA 260', h: 250, b: 260, tw: 7.5, tf: 12.5, type: 'HEA' },
  { name: 'HEA 280', h: 270, b: 280, tw: 8, tf: 13, type: 'HEA' },
  { name: 'HEA 300', h: 290, b: 300, tw: 8.5, tf: 14, type: 'HEA' },
  { name: 'HEA 320', h: 310, b: 300, tw: 9, tf: 15.5, type: 'HEA' },
  { name: 'HEA 340', h: 330, b: 300, tw: 9.5, tf: 16.5, type: 'HEA' },
  { name: 'HEA 360', h: 350, b: 300, tw: 10, tf: 17.5, type: 'HEA' },
  { name: 'HEA 400', h: 390, b: 300, tw: 11, tf: 19, type: 'HEA' },
]

export const HEB_CATALOG: SteelProfile[] = [
  { name: 'HEB 100', h: 100, b: 100, tw: 6, tf: 10, type: 'HEB' },
  { name: 'HEB 120', h: 120, b: 120, tw: 6.5, tf: 11, type: 'HEB' },
  { name: 'HEB 140', h: 140, b: 140, tw: 7, tf: 12, type: 'HEB' },
  { name: 'HEB 160', h: 160, b: 160, tw: 8, tf: 13, type: 'HEB' },
  { name: 'HEB 180', h: 180, b: 180, tw: 8.5, tf: 14, type: 'HEB' },
  { name: 'HEB 200', h: 200, b: 200, tw: 9, tf: 15, type: 'HEB' },
  { name: 'HEB 220', h: 220, b: 220, tw: 9.5, tf: 16, type: 'HEB' },
  { name: 'HEB 240', h: 240, b: 240, tw: 10, tf: 17, type: 'HEB' },
  { name: 'HEB 260', h: 260, b: 260, tw: 10, tf: 17.5, type: 'HEB' },
  { name: 'HEB 280', h: 280, b: 280, tw: 10.5, tf: 18, type: 'HEB' },
  { name: 'HEB 300', h: 300, b: 300, tw: 11, tf: 19, type: 'HEB' },
  { name: 'HEB 320', h: 320, b: 300, tw: 11.5, tf: 20.5, type: 'HEB' },
  { name: 'HEB 340', h: 340, b: 300, tw: 12, tf: 21.5, type: 'HEB' },
  { name: 'HEB 360', h: 360, b: 300, tw: 12.5, tf: 22.5, type: 'HEB' },
  { name: 'HEB 400', h: 400, b: 300, tw: 13.5, tf: 24, type: 'HEB' },
]

export const ALL_PROFILES = [...IPE_CATALOG, ...HEA_CATALOG, ...HEB_CATALOG]