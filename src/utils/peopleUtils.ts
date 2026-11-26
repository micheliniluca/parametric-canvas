import type { PersonId, PersonObject, Point } from '../types'

/**
 * Sagome di persone in scala: operai, pubblico, tifosi, frontali e di profilo.
 * Ogni figura è disegnata per una statura di 1800 mm e costruita come un manichino:
 * busto e testa con contorni a spline, arti con il profilo dei muscoli (coscia, polpaccio, deltoide,
 * avambraccio), mani, scarpe, abiti e attrezzi. I pezzi si sovrappongono: riempiti insieme danno la silhouette.
 * Coordinate locali in mm con l'origine a terra, al centro dei piedi; y verso il basso come sulla tela.
 */

export const REF_STATURE = 1800

export type PersonDef = { id: PersonId; label: string; group: 'Operai' | 'Pubblico' | 'Tifosi'; view: 'front' | 'side'; stature?: number }

export const PEOPLE: PersonDef[] = [
  { id: 'workerStand', label: 'Operaio con casco', group: 'Operai', view: 'front' },
  { id: 'workerShovel', label: 'Operaio con pala', group: 'Operai', view: 'front' },
  { id: 'workerPoint', label: 'Operaio che indica', group: 'Operai', view: 'front' },
  { id: 'workerLoad', label: 'Operaio con sacco in spalla', group: 'Operai', view: 'front' },
  { id: 'workerKneel', label: 'Operaio in ginocchio', group: 'Operai', view: 'front' },
  { id: 'workerWalkSide', label: 'Operaio che cammina (profilo)', group: 'Operai', view: 'side' },
  { id: 'workerLadderSide', label: 'Operaio con scala in spalla (profilo)', group: 'Operai', view: 'side' },
  { id: 'man', label: 'Uomo', group: 'Pubblico', view: 'front' },
  { id: 'woman', label: 'Donna', group: 'Pubblico', view: 'front', stature: 1650 },
  { id: 'manBag', label: 'Uomo con borsa', group: 'Pubblico', view: 'front' },
  { id: 'child', label: 'Bambino', group: 'Pubblico', view: 'front', stature: 1200 },
  { id: 'elderCane', label: 'Anziano con bastone', group: 'Pubblico', view: 'front', stature: 1700 },
  { id: 'wheelchair', label: 'Persona in carrozzina', group: 'Pubblico', view: 'front' },
  { id: 'manWalkSide', label: 'Uomo che cammina (profilo)', group: 'Pubblico', view: 'side' },
  { id: 'womanWalkSide', label: 'Donna che cammina (profilo)', group: 'Pubblico', view: 'side', stature: 1650 },
  { id: 'stairsSide', label: 'Persona che sale le scale (profilo)', group: 'Pubblico', view: 'side' },
  { id: 'fanArms', label: 'Tifoso a braccia alzate', group: 'Tifosi', view: 'front' },
  { id: 'fanScarf', label: 'Tifoso con sciarpa tesa', group: 'Tifosi', view: 'front' },
  { id: 'fanFlag', label: 'Tifoso con bandiera', group: 'Tifosi', view: 'front' },
  { id: 'fanSeated', label: 'Tifoso seduto che applaude', group: 'Tifosi', view: 'front' },
  { id: 'fanJumpSide', label: 'Tifoso che esulta (profilo)', group: 'Tifosi', view: 'side' },
]

export const personDef = (id: PersonId) => PEOPLE.find(p => p.id === id) ?? PEOPLE[0]

/* ---------- primitive (y verso l'alto, poi ribaltate) ---------- */

type V = [number, number]
type Prof = [number, number][]
const P = (x: number, y: number): Point => ({ x, y })
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]]
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]]
const mul = (a: V, k: number): V => [a[0] * k, a[1] * k]
const len = (a: V) => Math.hypot(a[0], a[1]) || 1e-6
const unit = (a: V): V => mul(a, 1 / len(a))
/** normale a sinistra */
const nrm = (u: V): V => [-u[1], u[0]]

/** spline di Catmull–Rom per i punti dati (chiusa o aperta), n campioni per tratto */
function spline(pts: V[], closed = true, n = 6): Point[] {
  const m = pts.length
  const at = (i: number) => (closed ? pts[(i + m) % m] : pts[Math.max(0, Math.min(m - 1, i))])
  const out: Point[] = []
  const last = closed ? m : m - 1
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2)
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push(P(f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])))
    }
  }
  if (!closed) out.push(P(...pts[m - 1]))
  return out
}

/** contorno simmetrico: metà destra dall'alto in basso, specchiata per la sinistra */
const mirrored = (right: V[]): V[] => [...right, ...right.slice().reverse().map(([x, y]) => [-x, y] as V)]

/** raggio lungo il segmento, interpolato (coseno) sui punti del profilo [t, r] */
const radiusAt = (prof: Prof, t: number) => {
  for (let i = 0; i < prof.length - 1; i++) {
    const [t0, r0] = prof[i], [t1, r1] = prof[i + 1]
    if (t <= t1) {
      const s = (t - t0) / (t1 - t0 || 1)
      return r0 + (r1 - r0) * (1 - Math.cos(Math.PI * s)) / 2
    }
  }
  return prof[prof.length - 1][1]
}

/** segmento di arto con profilo muscolare e estremità arrotondate */
function seg(a: V, b: V, prof: Prof, k = 1, n = 14): Point[] {
  const d = sub(b, a), u = unit(d), v = nrm(u)
  const left: Point[] = [], right: Point[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n, r = radiusAt(prof, t) * k
    const c = add(a, mul(d, t))
    left.push(P(...add(c, mul(v, r))))
    right.push(P(...add(c, mul(v, -r))))
  }
  const cap = (c: V, r: number, from: number) => Array.from({ length: 7 }, (_, i) => {
    const ang = from - (Math.PI * (i + 1)) / 8
    return P(c[0] + r * Math.cos(ang), c[1] + r * Math.sin(ang))
  })
  const ang = Math.atan2(u[1], u[0])
  return [
    ...left,
    ...cap(b, radiusAt(prof, 1) * k, ang + Math.PI / 2),
    ...right.reverse(),
    ...cap(a, radiusAt(prof, 0) * k, ang - Math.PI / 2),
  ]
}

const ellipse = (cx: number, cy: number, rx: number, ry: number, rot = 0, n = 28): Point[] => {
  const c = Math.cos(rot), s = Math.sin(rot)
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    const x = rx * Math.cos(a), y = ry * Math.sin(a)
    return P(cx + x * c - y * s, cy + x * s + y * c)
  })
}

/** asta di spessore costante (bastone, manico, pennone, montante della scala) */
const rod = (a: V, b: V, w: number) => seg(a, b, [[0, w / 2], [1, w / 2]], 1, 2)

/** asta curva lungo una spline aperta */
const pathRod = (pts: V[], w: number) => {
  const c = spline(pts, false, 4)
  return c.slice(1).map((p, i) => rod([c[i].x, c[i].y], [p.x, p.y], w))
}

/** rettangolo con angoli arrotondati */
const roundRect = (x0: number, y0: number, x1: number, y1: number, r: number): Point[] =>
  spline([[x0 + r, y0], [x1 - r, y0], [x1, y0 + r], [x1, y1 - r], [x1 - r, y1], [x0 + r, y1], [x0, y1 - r], [x0, y0 + r]], true, 3)

/* ---------- profili degli arti (raggi in mm, statura 1800) ---------- */

const THIGH: Prof = [[0, 92], [0.35, 84], [0.8, 64], [1, 58]]
const SHIN: Prof = [[0, 54], [0.28, 62], [0.65, 46], [1, 36]]
const UPPER_ARM: Prof = [[0, 60], [0.22, 56], [0.65, 45], [1, 40]]
const FOREARM: Prof = [[0, 42], [0.3, 45], [1, 30]]
const HAND: Prof = [[0, 30], [0.4, 44], [0.8, 38], [1, 26]]
const FIST: Prof = [[0, 34], [0.45, 52], [1, 44]]
const NECK: Prof = [[0, 62], [0.5, 54], [1, 52]]

type BodyType = 'man' | 'woman' | 'child'

const BODY = {
  man: {
    head: [0, 1683] as V, headR: [80, 118] as V, shoulder: [192, 1440] as V, hip: [95, 915] as V, limb: 1,
    torso: [[52, 1560], [62, 1525], [118, 1508], [172, 1488], [206, 1455], [214, 1400], [194, 1330], [180, 1270], [168, 1180], [150, 1090], [158, 1000], [178, 930], [174, 870], [120, 838], [40, 822]] as V[],
  },
  woman: {
    head: [0, 1686] as V, headR: [74, 112] as V, shoulder: [170, 1440] as V, hip: [88, 905] as V, limb: 0.86,
    torso: [[46, 1556], [56, 1520], [104, 1500], [152, 1482], [180, 1450], [184, 1400], [168, 1340], [170, 1270], [150, 1200], [122, 1110], [128, 1040], [165, 960], [180, 900], [170, 850], [110, 830], [35, 815]] as V[],
  },
  child: {
    head: [0, 1638] as V, headR: [118, 162] as V, shoulder: [168, 1395] as V, hip: [80, 820] as V, limb: 0.98,
    torso: [[52, 1480], [60, 1450], [110, 1436], [160, 1418], [186, 1385], [190, 1330], [176, 1260], [172, 1150], [168, 1050], [172, 960], [172, 880], [160, 820], [100, 792], [30, 780]] as V[],
  },
}

/* ---------- testa, mani, scarpe ---------- */

function headFront(c: V, r: V): Point[] {
  const [cx, cy] = c, [rx, ry] = r
  return spline([
    [0, ry], [0.62 * rx, 0.88 * ry], [rx, 0.38 * ry], [rx * 1.02, 0], [rx + 12, -0.1 * ry], [rx + 8, -0.32 * ry],
    [0.9 * rx, -0.42 * ry], [0.72 * rx, -0.72 * ry], [0.38 * rx, -0.96 * ry], [0, -ry],
    [-0.38 * rx, -0.96 * ry], [-0.72 * rx, -0.72 * ry], [-0.9 * rx, -0.42 * ry], [-rx - 8, -0.32 * ry], [-rx - 12, -0.1 * ry],
    [-rx * 1.02, 0], [-rx, 0.38 * ry], [-0.62 * rx, 0.88 * ry],
  ].map(([x, y]) => [cx + x, cy + y] as V), true, 4)
}

/** testa di profilo, rivolta a destra: nuca, fronte, naso, labbra, mento */
function headSide(c: V, k = 1): Point[] {
  const H: V[] = [
    [-96, 10], [-88, 62], [-58, 104], [0, 120], [52, 108], [84, 74], [94, 30], [97, 4], [108, -16], [120, -36],
    [104, -46], [104, -58], [98, -66], [100, -78], [92, -92], [72, -112], [36, -120], [8, -110], [-28, -82], [-62, -58], [-88, -26],
  ]
  return spline(H.map(([x, y]) => [c[0] + x * k, c[1] + y * k] as V), true, 4)
}

/** mano lungo la direzione dell'avambraccio (aperta o a pugno) */
function hand(e: V, w: V, fist = false, k = 1): Point[] {
  const u = unit(sub(w, e))
  return seg(w, add(w, mul(u, (fist ? 105 : 175) * k)), fist ? FIST : HAND, k)
}

/** scarpa vista di fronte, appoggiata a terra sotto la caviglia */
function shoeFront(a: V, k = 1): Point[] {
  const [ax, ay] = a
  const o = Math.sign(ax) * 10
  const base = Math.max(0, ay - 85)
  return spline([
    [ax - 52 * k + o, base], [ax + 56 * k + o, base], [ax + 62 * k + o, base + 32], [ax + 38 * k, base + 82],
    [ax - 34 * k, base + 82], [ax - 56 * k + o, base + 32],
  ], true, 4)
}

/** scarpa di profilo, dalla caviglia alla punta */
function shoeSide(a: V, toe: V, k = 1): Point[] {
  const u = unit(sub(toe, a)), v = nrm(u)
  const pt = (s: number, t: number): V => add(add(a, mul(u, s)), mul(v, t))
  const L = len(sub(toe, a))
  // v punta in alto per un piede rivolto a destra
  return spline([
    pt(-70 * k, 10 * k), pt(-66 * k, -40 * k), pt(-30 * k, -62 * k), pt(L * 0.55, -56 * k), pt(L - 10, -40 * k), pt(L + 4, -18 * k),
    pt(L - 20, 14 * k), pt(L * 0.5, 34 * k), pt(30 * k, 52 * k), pt(-30 * k, 52 * k),
  ], true, 4)
}

/* ---------- corpo frontale ---------- */

type Arm = { e: V; w: V; fist?: boolean; noHand?: boolean }
type Leg = { h?: V; k: V; a: V; shoe?: boolean; noShin?: boolean }

type Front = {
  body?: BodyType
  arms: [Arm, Arm]
  legs: [Leg, Leg]
  /** abbassamento di busto, testa e spalle (seduto, in ginocchio) */
  drop?: number
  helmet?: boolean
  hair?: 'bob'
  skirt?: boolean
}

function frontFigure(f: Front): Point[][] {
  const B = BODY[f.body ?? 'man']
  const d = f.drop ?? 0
  const up = (p: V): V => [p[0], p[1] - d]
  const k = B.limb
  const out: Point[][] = []
  // gambe
  f.legs.forEach((l, i) => {
    const side = i === 0 ? -1 : 1
    const h = l.h ?? up([side * B.hip[0], B.hip[1]])
    out.push(seg(h, l.k, THIGH, k))
    if (!l.noShin) out.push(seg(l.k, l.a, SHIN, k))
    if (l.shoe !== false && !l.noShin) out.push(shoeFront(l.a, k))
  })
  if (f.skirt) {
    // gonna svasata: fianchi a spline, orlo dritto
    const side = spline([[130, 1070], [168, 960], [200, 800], [232, 600]], false, 5)
    out.push([...side, ...side.slice().reverse().map(p => P(-p.x, p.y))].map(p => P(...up([p.x, p.y]))))
  }
  // busto, collo, testa
  out.push(spline(mirrored(B.torso).map(up), true, 4))
  const [hx, hy] = up(B.head)
  const [rx, ry] = B.headR
  out.push(seg(up([0, B.shoulder[1] + 40]), [hx, hy - ry * 0.7], NECK, k))
  out.push(headFront([hx, hy], [rx, ry]))
  if (f.hair === 'bob') {
    out.push(spline([
      [0, ry + 16], [0.78 * rx, 0.88 * ry], [rx + 18, 0.3 * ry], [rx + 24, -0.45 * ry], [rx + 28, -ry - 30], [rx - 6, -ry - 36],
      [rx - 26, -0.45 * ry], [0, -0.3 * ry], [-rx + 26, -0.45 * ry], [-rx + 6, -ry - 36], [-rx - 28, -ry - 30],
      [-rx - 24, -0.45 * ry], [-rx - 18, 0.3 * ry], [-0.78 * rx, 0.88 * ry],
    ].map(([x, y]) => [hx + x, hy + y] as V), true, 4))
  }
  if (f.helmet) {
    out.push(spline([
      [-rx - 20, 0.3 * ry], [-rx - 14, 0.72 * ry], [-0.62 * rx, ry + 26], [0, ry + 40], [0.62 * rx, ry + 26], [rx + 14, 0.72 * ry], [rx + 20, 0.3 * ry],
    ].map(([x, y]) => [hx + x, hy + y] as V), true, 5))
    out.push(seg([hx - rx - 44, hy + 0.3 * ry], [hx + rx + 44, hy + 0.3 * ry], [[0, 11], [0.5, 15], [1, 11]]))
  }
  // braccia
  f.arms.forEach((a, i) => {
    const side = i === 0 ? -1 : 1
    const s = up([side * B.shoulder[0], B.shoulder[1]])
    const e = up(a.e), w = up(a.w)
    out.push(seg(s, e, UPPER_ARM, k), seg(e, w, FOREARM, k))
    if (!a.noHand) out.push(hand(e, w, a.fist, k))
  })
  return out
}

/* ---------- corpo di profilo (rivolto a destra) ---------- */

type SideArm = { e: V; w: V; fist?: boolean }
type SideLeg = { k: V; a: V; toe: V }

type Side = {
  body?: 'man' | 'woman'
  /** inclinazione del busto in avanti (rad) */
  lean?: number
  arms: SideArm[]
  legs: SideLeg[]
  helmet?: boolean
  skirt?: boolean
  bun?: boolean
}

const SIDE_TORSO = {
  man: [[42, 1550], [72, 1482], [122, 1380], [128, 1300], [116, 1220], [104, 1120], [110, 1010], [92, 900], [40, 845],
    [-50, 838], [-118, 870], [-138, 950], [-118, 1040], [-90, 1110], [-100, 1240], [-122, 1370], [-108, 1470], [-56, 1550]] as V[],
  woman: [[40, 1545], [66, 1478], [132, 1360], [130, 1300], [100, 1240], [86, 1130], [96, 1020], [92, 900], [40, 840],
    [-50, 832], [-128, 870], [-146, 960], [-112, 1060], [-80, 1120], [-92, 1240], [-112, 1370], [-100, 1465], [-52, 1545]] as V[],
}

function sideFigure(f: Side): Point[][] {
  const body = f.body ?? 'man'
  const k = body === 'woman' ? 0.86 : 1
  const lean = f.lean ?? 0
  // rotazione del busto intorno al bacino
  const piv: V = [0, 950]
  const tilt = (p: V): V => {
    if (p[1] <= piv[1]) return p
    const s = Math.min(1, (p[1] - piv[1]) / 500)
    const a = -lean * s
    const dx = p[0] - piv[0], dy = p[1] - piv[1]
    return [piv[0] + dx * Math.cos(a) - dy * Math.sin(a), piv[1] + dx * Math.sin(a) + dy * Math.cos(a)]
  }
  const out: Point[][] = []
  const hip: V = [-8, 925]
  for (const l of f.legs) {
    out.push(seg(hip, l.k, THIGH, k), seg(l.k, l.a, SHIN, k), shoeSide(l.a, l.toe, k))
  }
  if (f.skirt) {
    const front = spline([[95, 1070], [128, 940], [170, 780], [215, 600]], false, 5)
    const back = spline([[-200, 600], [-160, 790], [-150, 950], [-120, 1070]], false, 5)
    out.push([...front, ...back])
  }
  out.push(spline(SIDE_TORSO[body].map(tilt), true, 4))
  const head = tilt([20, 1688])
  out.push(seg(tilt([-8, 1470]), add(head, [-12, -78]), NECK, k))
  out.push(headSide(head, body === 'woman' ? 0.94 : 1))
  if (f.bun) out.push(ellipse(head[0] - 98, head[1] + 38, 50, 44))
  if (f.helmet) {
    out.push(spline([[-112, 32], [-104, 90], [-40, 138], [30, 140], [92, 104], [112, 46]].map(([x, y]) => [head[0] + x, head[1] + y] as V), true, 5))
    out.push(seg(add(head, [-114, 36]), add(head, [168, 36]), [[0, 12], [0.7, 14], [1, 9]]))
  }
  const s = tilt([-8, 1440])
  for (const a of f.arms) {
    out.push(seg(s, a.e, UPPER_ARM, k), seg(a.e, a.w, FOREARM, k), hand(a.e, a.w, a.fist, k))
  }
  return out
}

const shift = (shapes: Point[][], dx: number, dy: number) => shapes.map(pl => pl.map(p => P(p.x + dx, p.y + dy)))

/* ---------- catalogo ---------- */

const WALK_LEGS: SideLeg[] = [
  { k: [-58, 520], a: [-190, 128], toe: [-10, 8] },
  { k: [92, 528], a: [168, 88], toe: [370, 52] },
]

function build(id: PersonId): Point[][] {
  const down: [Arm, Arm] = [{ e: [-236, 1110], w: [-266, 856] }, { e: [236, 1110], w: [266, 856] }]
  const stand: [Leg, Leg] = [{ k: [-100, 512], a: [-94, 86] }, { k: [100, 512], a: [94, 86] }]
  const wide: [Leg, Leg] = [{ k: [-128, 512], a: [-142, 86] }, { k: [128, 512], a: [142, 86] }]
  switch (id) {
    case 'man':
      return frontFigure({ arms: down, legs: stand })
    case 'workerStand':
      // mani sui fianchi
      return frontFigure({ helmet: true, arms: [{ e: [-335, 1170], w: [-190, 1010] }, { e: [335, 1170], w: [190, 1010] }], legs: wide })
    case 'workerShovel':
      return [
        ...frontFigure({
          helmet: true,
          arms: [{ e: [-140, 1150], w: [215, 1235] }, { e: [300, 1170], w: [312, 1000] }],
          legs: [stand[0], wide[1]],
        }),
        rod([318, 1300], [318, 300], 34),
        seg([270, 1330], [366, 1330], [[0, 16], [1, 16]]),
        rod([282, 1300], [282, 1330], 20), rod([354, 1300], [354, 1330], 20),
        spline([[240, 310], [396, 310], [392, 120], [318, 0], [244, 120]], true, 4),
      ]
    case 'workerPoint':
      return frontFigure({ helmet: true, arms: [down[0], { e: [470, 1462], w: [730, 1492], noHand: true }], legs: stand })
        .concat([seg([730, 1492], [850, 1506], [[0, 34], [0.5, 40], [1, 30]]), seg([840, 1505], [950, 1518], [[0, 14], [1, 11]])])
    case 'workerLoad':
      return [
        ...frontFigure({ helmet: true, arms: [down[0], { e: [372, 1360], w: [300, 1600] }], legs: stand }),
        spline([[20, 1560], [120, 1690], [320, 1720], [440, 1640], [420, 1520], [250, 1500], [100, 1505]], true, 5),
      ]
    case 'workerKneel':
      // ginocchio sinistro a terra (gamba in scorcio), destro piegato in avanti
      return frontFigure({
        helmet: true, drop: 470,
        arms: [{ e: [-250, 1110], w: [-150, 880] }, { e: [262, 1130], w: [168, 960] }],
        legs: [
          { k: [-118, 62], a: [-118, 62], noShin: true },
          { k: [158, 470], a: [154, 86] },
        ],
      })
    case 'woman':
      return frontFigure({
        body: 'woman', hair: 'bob', skirt: true,
        arms: [{ e: [-198, 1112], w: [-210, 866] }, { e: [198, 1112], w: [210, 866] }],
        legs: [{ k: [-80, 512], a: [-74, 86] }, { k: [80, 512], a: [74, 86] }],
      })
    case 'manBag':
      return [
        ...frontFigure({ arms: [down[0], { e: [232, 1110], w: [262, 852] }], legs: stand }),
        roundRect(180, 470, 450, 760, 26),
        seg([262, 760], [262, 838], [[0, 12], [1, 12]]), seg([368, 760], [368, 838], [[0, 12], [1, 12]]), seg([262, 838], [368, 838], [[0, 12], [1, 12]]),
      ]
    case 'child':
      return frontFigure({
        body: 'child',
        arms: [{ e: [-212, 1100], w: [-236, 862] }, { e: [212, 1100], w: [236, 862] }],
        legs: [{ k: [-84, 450], a: [-80, 86] }, { k: [84, 450], a: [80, 86] }],
      })
    case 'elderCane':
      return [
        ...frontFigure({ arms: [down[0], { e: [282, 1108], w: [330, 870] }], legs: stand }),
        rod([368, 850], [392, 0], 28),
        // manico ricurvo
        ...pathRod([[368, 850], [362, 900], [325, 918], [284, 892]], 26),
      ]
    case 'wheelchair':
      return [
        // ruote viste di scorcio, corrimano, telaio, maniglie di spinta, pedane
        ellipse(-338, 318, 48, 318), ellipse(338, 318, 48, 318),
        ellipse(-396, 318, 14, 268), ellipse(396, 318, 14, 268),
        rod([-396, 318], [-338, 318], 18), rod([396, 318], [338, 318], 18),
        rod([-338, 500], [338, 500], 34),
        rod([-318, 500], [-300, 1080], 26), rod([318, 500], [300, 1080], 26),
        rod([-300, 1080], [-345, 1060], 34), rod([300, 1080], [345, 1060], 34),
        rod([-300, 700], [-300, 720], 60), rod([300, 700], [300, 720], 60),
        roundRect(-280, 46, -60, 84, 8), roundRect(60, 46, 280, 84, 8),
        rod([-170, 84], [-200, 470], 22), rod([170, 84], [200, 470], 22),
        ...frontFigure({
          drop: 445,
          arms: [{ e: [-290, 1100], w: [-372, 975], fist: true }, { e: [290, 1100], w: [372, 975], fist: true }],
          legs: [
            { h: [-95, 500], k: [-122, 488], a: [-150, 170] },
            { h: [95, 500], k: [122, 488], a: [150, 170] },
          ],
        }),
      ]
    case 'fanArms':
      return frontFigure({
        arms: [{ e: [-350, 1720], w: [-460, 1985], fist: true }, { e: [350, 1720], w: [460, 1985], fist: true }],
        legs: wide,
      })
    case 'fanScarf':
      return [
        ...frontFigure({
          arms: [{ e: [-375, 1690], w: [-455, 1950], fist: true }, { e: [375, 1690], w: [455, 1950], fist: true }],
          legs: stand,
        }),
        [...spline([[-560, 2075], [0, 2052], [560, 2075]], false, 8), ...spline([[560, 1975], [0, 1952], [-560, 1975]], false, 8)],
        ...[-1, 1].flatMap(s => [0, 1, 2, 3].map(i => rod([s * (548 - i * 26), 1985], [s * (548 - i * 26), 1880], 12))),
      ]
    case 'fanFlag':
      return [
        ...frontFigure({ arms: [down[0], { e: [322, 1735], w: [352, 1990], fist: true }], legs: stand }),
        rod([370, 1720], [392, 2760], 26),
        spline([[392, 2740], [560, 2770], [720, 2700], [880, 2730], [990, 2700], [985, 2290], [880, 2320], [720, 2290], [560, 2360], [392, 2330]], true, 5),
      ]
    case 'fanSeated':
      return frontFigure({
        drop: 450,
        arms: [{ e: [-300, 1140], w: [-70, 1300], noHand: true }, { e: [300, 1140], w: [70, 1300], noHand: true }],
        legs: [
          { h: [-95, 500], k: [-140, 488], a: [-150, 86] },
          { h: [95, 500], k: [140, 488], a: [150, 86] },
        ],
      }).concat([
        seg([-70, 850], [-20, 1010], HAND), seg([70, 850], [20, 1010], HAND),
      ])
    case 'manWalkSide':
      return sideFigure({
        arms: [{ e: [-72, 1170], w: [-160, 925] }, { e: [80, 1168], w: [196, 948] }],
        legs: WALK_LEGS,
      })
    case 'womanWalkSide':
      return sideFigure({
        body: 'woman', skirt: true, bun: true,
        arms: [{ e: [-64, 1172], w: [-140, 935] }, { e: [70, 1170], w: [178, 955] }],
        legs: [
          { k: [-52, 522], a: [-168, 128], toe: [-8, 8] },
          { k: [82, 528], a: [148, 88], toe: [330, 50] },
        ],
      })
    case 'stairsSide':
      // piede avanti sul gradino (alzata 170), mano sul corrimano
      return sideFigure({
        lean: 0.12,
        arms: [{ e: [-58, 1165], w: [-96, 915] }, { e: [128, 1190], w: [292, 1070] }],
        legs: [
          { k: [-36, 505], a: [-170, 125], toe: [18, 8] },
          { k: [214, 650], a: [192, 262], toe: [400, 222] },
        ],
      })
    case 'workerWalkSide':
      return sideFigure({
        helmet: true,
        arms: [{ e: [-72, 1170], w: [-160, 925] }, { e: [80, 1168], w: [196, 948] }],
        legs: WALK_LEGS,
      })
    case 'workerLadderSide':
      // scala portata in spalla
      return [
        ...sideFigure({
          helmet: true,
          arms: [{ e: [-72, 1170], w: [-160, 925] }, { e: [130, 1330], w: [70, 1555] }],
          legs: WALK_LEGS,
        }),
        rod([-1450, 1200], [1500, 1700], 40),
        rod([-1450, 1270], [1500, 1770], 40),
        ...Array.from({ length: 10 }, (_, i) => {
          const t = (i + 0.5) / 10
          const x = -1450 + 2950 * t, y = 1200 + 500 * t
          return rod([x, y], [x, y + 70], 26)
        }),
      ]
    case 'fanJumpSide':
      // salto con le braccia al cielo
      return shift(sideFigure({
        arms: [{ e: [-20, 1760], w: [-8, 2040], fist: true }, { e: [92, 1750], w: [160, 2030], fist: true }],
        legs: [
          { k: [-20, 548], a: [-190, 300], toe: [-30, 222] },
          { k: [150, 600], a: [30, 270], toe: [210, 250] },
        ],
      }), 0, 200)
  }
}

const cache = new Map<PersonId, Point[][]>()

/** poligoni della figura a statura 1800, y verso il basso, orientati tutti nello stesso verso */
export function personShapes(id: PersonId): Point[][] {
  let s = cache.get(id)
  if (!s) {
    s = build(id).map(pl => {
      const q = pl.map(p => P(+p.x.toFixed(1), -p.y.toFixed(1)))
      const area = q.reduce((a, p, i) => { const r = q[(i + 1) % q.length]; return a + p.x * r.y - r.x * p.y }, 0)
      return area < 0 ? q.reverse() : q
    })
    cache.set(id, s)
  }
  return s
}

/** poligoni in coordinate della tela (prima della rotazione) */
export function personPolygons(o: PersonObject): Point[][] {
  const k = o.height / REF_STATURE
  const fx = o.flipX ? -1 : 1
  return personShapes(o.person).map(pl => pl.map(p => P(o.x + fx * p.x * k, o.y + p.y * k)))
}

export function personPath(o: PersonObject): string {
  return personPolygons(o).map(pl => 'M ' + pl.map(p => `${+p.x.toFixed(2)} ${+p.y.toFixed(2)}`).join(' L ') + ' Z').join(' ')
}

export function personBounds(o: PersonObject) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const pl of personPolygons(o)) for (const p of pl) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

export const personLabel = (o: PersonObject) =>
  `${personDef(o.person).label} · h ${String(+(o.height / 1000).toFixed(2)).replace('.', ',')} m`
