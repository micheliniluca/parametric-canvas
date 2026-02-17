import { CanvasObject } from '../types'
import { ALL_PROFILES } from '../profiles'
import { getBeamPoints } from '../beamPath'

/* =========================================
   SVG EXPORT
   ========================================= */
export function exportToSVG(objects: CanvasObject[]): string {
    // Calculate bounding box for viewBox
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    if (objects.length === 0) return '<svg></svg>'

    objects.forEach(o => {
        // Simplified bbox logic
        if (o.type === 'rect' || o.type === 'image') {
            minX = Math.min(minX, o.x)
            minY = Math.min(minY, o.y)
            maxX = Math.max(maxX, o.x + o.width)
            maxY = Math.max(maxY, o.y + o.height)
        } else if (o.type === 'circle') {
            minX = Math.min(minX, o.x - o.radius)
            minY = Math.min(minY, o.y - o.radius)
            maxX = Math.max(maxX, o.x + o.radius)
            maxY = Math.max(maxY, o.y + o.radius)
        } else if (o.type === 'polyline') {
            o.points.forEach(p => {
                minX = Math.min(minX, p.x)
                minY = Math.min(minY, p.y)
                maxX = Math.max(maxX, p.x)
                maxY = Math.max(maxY, p.y)
            })
        } else if (o.type === 'profile') {
            // rough approx
            minX = Math.min(minX, o.x - 100)
            minY = Math.min(minY, o.y - 100)
            maxX = Math.max(maxX, o.x + 100)
            maxY = Math.max(maxY, o.y + 100)
        }
    })

    // Add padding
    minX -= 50; minY -= 50; maxX += 50; maxY += 50
    const w = maxX - minX
    const h = maxY - minY

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${w} ${h}">\n`

    objects.forEach(o => {
        let stroke = o.stroke || 'black'
        let fill = o.fillEnabled ? o.fillColor || 'none' : 'none'

        if (o.type === 'rect') {
            svg += `  <rect x="${o.x}" y="${o.y}" width="${o.width}" height="${o.height}" stroke="${stroke}" fill="${fill}" />\n`
        } else if (o.type === 'circle') {
            svg += `  <circle cx="${o.x}" cy="${o.y}" r="${o.radius}" stroke="${stroke}" fill="${fill}" />\n`
        } else if (o.type === 'polyline') {
            const ptr = o.points.map(p => `${p.x},${p.y}`).join(' ')
            svg += `  <polyline points="${ptr}" stroke="${stroke}" fill="${fill}" />\n`
        } else if (o.type === 'profile') {
            const profile = ALL_PROFILES.find(p => p.name === o.profileName)
            if (profile) {
                const pts = getBeamPoints(profile)
                const d = `M ${pts.map(p => `${p.x} ${p.y}`).join(' L ')} Z`
                svg += `  <g transform="translate(${o.x}, ${o.y}) scale(${o.scale})"><path d="${d}" stroke="${stroke}" fill="${fill}" vector-effect="non-scaling-stroke" /></g>\n`
            }
        } else if (o.type === 'image') {
            // Embed image? For now just link or placeholders, embedding data uri makes file huge but works.
            // o.src is data uri already
            svg += `  <image href="${o.src}" x="${o.x}" y="${o.y}" width="${o.width}" height="${o.height}" opacity="${o.opacity}" />\n`
        }
    })

    svg += '</svg>'
    return svg
}

/* =========================================
   DXF EXPORT (Minimal)
   ========================================= */
export function exportToDXF(objects: CanvasObject[]): string {
    let dxf = `0
SECTION
2
HEADER
0
ENDSEC
0
SECTION
2
ENTITIES
`
    const addLine = (x1: number, y1: number, x2: number, y2: number, layer = '0') => {
        dxf += `0
LINE
8
${layer}
10
${x1}
20
${-y1}
11
${x2}
21
${-y2}
`
    } // Note: Y inverted for DXF typically

    const addPolyline = (pts: { x: number, y: number }[], closed: boolean, layer = '0') => {
        dxf += `0
LWPOLYLINE
8
${layer}
90
${pts.length}
70
${closed ? 1 : 0}
`
        pts.forEach(p => {
            dxf += `10
${p.x}
20
${-p.y}
`
        })
    }

    objects.forEach(o => {
        if (o.type === 'rect') {
            const pts = [
                { x: o.x, y: o.y },
                { x: o.x + o.width, y: o.y },
                { x: o.x + o.width, y: o.y + o.height },
                { x: o.x, y: o.y + o.height }
            ]
            addPolyline(pts, true)
        } else if (o.type === 'polyline') {
            addPolyline(o.points, o.closed) // Assuming closed property exists or handled
        } else if (o.type === 'profile') {
            const profile = ALL_PROFILES.find(p => p.name === o.profileName)
            if (profile) {
                const rawPts = getBeamPoints(profile)
                const s = o.scale
                const pts = rawPts.map(p => ({
                    x: o.x + p.x * s,
                    y: o.y + p.y * s
                }))
                addPolyline(pts, true)
            }
        } else if (o.type === 'circle') {
            dxf += `0
CIRCLE
8
0
10
${o.x}
20
${-o.y}
40
${o.radius}
`
        }
    })

    dxf += `0
ENDSEC
0
EOF
`
    return dxf
}

/* =========================================
   STL EXPORT (ASCII)
   ========================================= */
type Vec3 = { x: number, y: number, z: number }

function triToSTL(v1: Vec3, v2: Vec3, v3: Vec3): string {
    // Normal calculation needed for valid STL, but 0,0,0 usually accepted by some viewers, 
    // better to calc cross product
    const u = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z }
    const v = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z }
    let nx = u.y * v.z - u.z * v.y
    let ny = u.z * v.x - u.x * v.z
    let nz = u.x * v.y - u.y * v.x
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz)
    if (len > 0) { nx /= len; ny /= len; nz /= len }

    return `facet normal ${nx.toFixed(5)} ${ny.toFixed(5)} ${nz.toFixed(5)}
  outer loop
    vertex ${v1.x.toFixed(5)} ${-v1.y.toFixed(5)} ${v1.z.toFixed(5)}
    vertex ${v2.x.toFixed(5)} ${-v2.y.toFixed(5)} ${v2.z.toFixed(5)}
    vertex ${v3.x.toFixed(5)} ${-v3.y.toFixed(5)} ${v3.z.toFixed(5)}
  endloop
endfacet
`
}

// Extrude a polygon
function extrudePolygon(points: { x: number, y: number }[], zHeight: number, triangles?: number[][]): string {
    let stl = ''
    const z0 = 0
    const z1 = zHeight

    // 1. Bottom Cap (z0) - usually needs reverse winding if looking from bottom, 
    // but STL expects normal pointing out.
    // If standard winding is CCW, then bottom should be CW (so normal points down).
    // top should be CCW (normal points up).

    // We assume input points are CCW.

    // Top Cap
    if (triangles) {
        triangles.forEach(t => {
            const v1 = points[t[0]]; const v2 = points[t[1]]; const v3 = points[t[2]];
            stl += triToSTL({ x: v1.x, y: v1.y, z: z1 }, { x: v2.x, y: v2.y, z: z1 }, { x: v3.x, y: v3.y, z: z1 })
        })
        // Bottom Cap (reverse order)
        triangles.forEach(t => {
            const v1 = points[t[0]]; const v2 = points[t[1]]; const v3 = points[t[2]];
            stl += triToSTL({ x: v3.x, y: v3.y, z: z0 }, { x: v2.x, y: v2.y, z: z0 }, { x: v1.x, y: v1.y, z: z0 })
        })
    }

    // Walls
    for (let i = 0; i < points.length; i++) {
        const p1 = points[i]
        const p2 = points[(i + 1) % points.length]

        // Quad p1-p2 extruded
        // v1_bot, v2_bot, v2_top, v1_top
        // Triangle 1: p1_bot, p2_bot, p2_top
        // Triangle 2: p1_bot, p2_top, p1_top

        stl += triToSTL({ x: p1.x, y: p1.y, z: z0 }, { x: p2.x, y: p2.y, z: z0 }, { x: p2.x, y: p2.y, z: z1 })
        stl += triToSTL({ x: p1.x, y: p1.y, z: z0 }, { x: p2.x, y: p2.y, z: z1 }, { x: p1.x, y: p1.y, z: z1 })
    }

    return stl
}

export function exportToSTL(objects: CanvasObject[]): string {
    let stl = 'solid exported\n'

    objects.forEach(o => {
        if (o.type === 'rect') {
            const pts = [
                { x: o.x, y: o.y },
                { x: o.x + o.width, y: o.y },
                { x: o.x + o.width, y: o.y + o.height },
                { x: o.x, y: o.y + o.height }
            ]
            // Standard rect triangulation is 2 tris: 0-1-2, 0-2-3
            const tris = [[0, 1, 2], [0, 2, 3]]
            stl += extrudePolygon(pts, 10, tris) // Default 10 extrusion
        } else if (o.type === 'profile') {
            const profile = ALL_PROFILES.find(p => p.name === o.profileName)
            if (profile) {
                const rawPts = getBeamPoints(profile)
                const s = o.scale
                const pts = rawPts.map(p => ({
                    x: o.x + p.x * s,
                    y: o.y + p.y * s
                }))

                // Triangulation for I-beam points (12 points) decomposed into 3 rects
                // Rect 1 (Top Flange): 0-1-2-11
                // Rect 2 (Web): 10-3-4-9
                // Rect 3 (Bottom Flange): 8-5-6-7
                // Indices map to rawPts array indices

                const tris = [
                    // Top rect
                    [0, 1, 2], [0, 2, 11],
                    // Web rect
                    [10, 3, 4], [10, 4, 9],
                    // Bot rect
                    [8, 5, 6], [8, 6, 7]
                ]

                stl += extrudePolygon(pts, 100 * s, tris) // Extrude more for profile (e.g. 1m scaled)
            }
        }
    })

    stl += 'endsolid exported\n'
    return stl
}
