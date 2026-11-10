import { SERIES_SHAPE } from './profiles'
import type { ProfileSeries } from './profiles'

const shapeOf = (type: string) => SERIES_SHAPE[type as ProfileSeries] ?? 'I'

export function getBeamPoints(props: { type?: string, h: number, b: number, tw: number, tf: number, r?: number, viewType?: 'front' | 'side' | 'top', length?: number }) {
    const { type = 'IPE', h, b, tw, tf, viewType = 'front', length = 400 } = props
    const shape = shapeOf(type)

    if (viewType === 'front' && shape === 'U') {
        // canale: anima a sinistra, ali verso destra
        const x0 = -b / 2, x1 = b / 2, y0 = -h / 2, y1 = h / 2
        return [
            { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y0 + tf }, { x: x0 + tw, y: y0 + tf },
            { x: x0 + tw, y: y1 - tf }, { x: x1, y: y1 - tf }, { x: x1, y: y1 }, { x: x0, y: y1 },
        ]
    }
    if (viewType === 'front' && shape === 'L') {
        // angolare: spigolo in basso a sinistra
        const x0 = -b / 2, x1 = b / 2, y0 = -h / 2, y1 = h / 2
        return [
            { x: x0, y: y0 }, { x: x0 + tw, y: y0 }, { x: x0 + tw, y: y1 - tf },
            { x: x1, y: y1 - tf }, { x: x1, y: y1 }, { x: x0, y: y1 },
        ]
    }

    if (shape === 'CHS') {
        if (viewType === 'side' || viewType === 'top') {
            return [
                { x: 0, y: -h / 2 },
                { x: length, y: -h / 2 },
                { x: length, y: h / 2 },
                { x: 0, y: h / 2 }
            ]
        }
        // Front view approximation
        const pts = []
        const sides = 16
        const r = h / 2
        for (let i = 0; i < sides; i++) {
            const a = (i / sides) * Math.PI * 2
            pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r })
        }
        return pts
    }

    if (shape === 'RHS') {
        if (viewType === 'side' || viewType === 'top') {
            const w = viewType === 'side' ? h : b
            return [
                { x: 0, y: -w / 2 },
                { x: length, y: -w / 2 },
                { x: length, y: w / 2 },
                { x: 0, y: w / 2 }
            ]
        }
        // Front view outer rect
        return [
            { x: -b / 2, y: -h / 2 },
            { x: b / 2, y: -h / 2 },
            { x: b / 2, y: h / 2 },
            { x: -b / 2, y: h / 2 }
        ]
    }
    if (viewType === 'side') {
        // Simple rectangle for side view (height x length)
        return [
            { x: 0, y: -h / 2 },
            { x: length, y: -h / 2 },
            { x: length, y: h / 2 },
            { x: 0, y: h / 2 }
        ]
    }

    if (viewType === 'top') {
        // Simple rectangle for top view (width x length)
        return [
            { x: 0, y: -b / 2 },
            { x: length, y: -b / 2 },
            { x: length, y: b / 2 },
            { x: 0, y: b / 2 }
        ]
    }

    const yTop = -h / 2
    const yBot = h / 2

    // Points in counter-clockwise order (standard for shape definition)
    return [
        { x: -b / 2, y: yTop },
        { x: b / 2, y: yTop },
        { x: b / 2, y: yTop + tf },
        { x: tw / 2, y: yTop + tf },
        { x: tw / 2, y: yBot - tf },
        { x: b / 2, y: yBot - tf },
        { x: b / 2, y: yBot },
        { x: -b / 2, y: yBot },
        { x: -b / 2, y: yBot - tf },
        { x: -tw / 2, y: yBot - tf },
        { x: -tw / 2, y: yTop + tf },
        { x: -b / 2, y: yTop + tf }
    ]
}

export function generateBeamPath(props: { type?: string, h: number, b: number, tw: number, tf: number, r?: number, viewType?: 'front' | 'side' | 'top', length?: number }): { path: string, dashed?: string } {
    const { type = 'IPE', h, b, tw, tf, viewType = 'front', length = 400 } = props
    const shape = shapeOf(type)

    if (shape === 'U' || shape === 'L') {
        if (viewType === 'side') {
            // ala inferiore (U) o lato orizzontale (L) visibili come linee
            const lines = shape === 'U'
                ? `M 0 ${-h / 2 + tf} L ${length} ${-h / 2 + tf} M 0 ${h / 2 - tf} L ${length} ${h / 2 - tf}`
                : `M 0 ${h / 2 - tf} L ${length} ${h / 2 - tf}`
            return { path: `M 0 ${-h / 2} L ${length} ${-h / 2} L ${length} ${h / 2} L 0 ${h / 2} Z ${lines}` }
        }
        if (viewType === 'top') {
            return {
                path: `M 0 ${-b / 2} L ${length} ${-b / 2} L ${length} ${b / 2} L 0 ${b / 2} Z`,
                dashed: `M 0 ${-b / 2 + tw} L ${length} ${-b / 2 + tw}`,
            }
        }
        const x0 = -b / 2, x1 = b / 2, y0 = -h / 2, y1 = h / 2
        const r = Math.max(0, Math.min(props.r ?? 0, (b - tw) * 0.8, (h - 2 * tf) / 2))
        if (shape === 'U') {
            return {
                path: `M ${x0} ${y0} L ${x1} ${y0} L ${x1} ${y0 + tf} L ${x0 + tw + r} ${y0 + tf} A ${r} ${r} 0 0 0 ${x0 + tw} ${y0 + tf + r} L ${x0 + tw} ${y1 - tf - r} A ${r} ${r} 0 0 0 ${x0 + tw + r} ${y1 - tf} L ${x1} ${y1 - tf} L ${x1} ${y1} L ${x0} ${y1} Z`,
            }
        }
        return {
            path: `M ${x0} ${y0} L ${x0 + tw} ${y0} L ${x0 + tw} ${y1 - tf - r} A ${r} ${r} 0 0 0 ${x0 + tw + r} ${y1 - tf} L ${x1} ${y1 - tf} L ${x1} ${y1} L ${x0} ${y1} Z`,
        }
    }

    if (shape === 'CHS') {
        if (viewType === 'side' || viewType === 'top') {
            const rOuter = h / 2
            const rInner = h / 2 - tw
            return {
                path: `M 0 -${rOuter} L ${length} -${rOuter} L ${length} ${rOuter} L 0 ${rOuter} Z`,
                dashed: `M 0 -${rInner} L ${length} -${rInner} M 0 ${rInner} L ${length} ${rInner}`
            }
        }
        const ro = h / 2
        const ri = h / 2 - tw
        return {
            path: `M 0 -${ro} A ${ro} ${ro} 0 1 1 0 ${ro} A ${ro} ${ro} 0 1 1 0 -${ro} Z M 0 -${ri} A ${ri} ${ri} 0 1 0 0 ${ri} A ${ri} ${ri} 0 1 0 0 -${ri} Z`
        }
    }

    if (shape === 'RHS') {
        if (viewType === 'side') {
            const yTop = -h / 2
            const yBot = h / 2
            const yInnerTop = yTop + tf
            const yInnerBot = yBot - tf
            return {
                path: `M 0 ${yTop} L ${length} ${yTop} L ${length} ${yBot} L 0 ${yBot} Z`,
                dashed: `M 0 ${yInnerTop} L ${length} ${yInnerTop} M 0 ${yInnerBot} L ${length} ${yInnerBot}`
            }
        }
        if (viewType === 'top') {
            const yTop = -b / 2
            const yBot = b / 2
            const yInnerTop = yTop + tw
            const yInnerBot = yBot - tw
            return {
                path: `M 0 ${yTop} L ${length} ${yTop} L ${length} ${yBot} L 0 ${yBot} Z`,
                dashed: `M 0 ${yInnerTop} L ${length} ${yInnerTop} M 0 ${yInnerBot} L ${length} ${yInnerBot}`
            }
        }

        const xOuter = b / 2
        const yOuter = h / 2
        const xInner = b / 2 - tw
        const yInner = h / 2 - tf
        const ro = props.r ?? tw * 2
        const ri = Math.max(0, ro - tw)

        if (ro <= 0) {
            return {
                path: `M -${xOuter} -${yOuter} L ${xOuter} -${yOuter} L ${xOuter} ${yOuter} L -${xOuter} ${yOuter} Z M -${xInner} -${yInner} L -${xInner} ${yInner} L ${xInner} ${yInner} L ${xInner} -${yInner} Z`
            }
        }

        const outerPath = `M -${xOuter - ro} -${yOuter} L ${xOuter - ro} -${yOuter} A ${ro} ${ro} 0 0 1 ${xOuter} -${yOuter - ro} L ${xOuter} ${yOuter - ro} A ${ro} ${ro} 0 0 1 ${xOuter - ro} ${yOuter} L -${xOuter - ro} ${yOuter} A ${ro} ${ro} 0 0 1 -${xOuter} ${yOuter - ro} L -${xOuter} -${yOuter - ro} A ${ro} ${ro} 0 0 1 -${xOuter - ro} -${yOuter} Z`
        
        let innerPath = `M -${xInner} -${yInner} L -${xInner} ${yInner} L ${xInner} ${yInner} L ${xInner} -${yInner} Z`
        if (ri > 0) {
            innerPath = `M -${xInner - ri} -${yInner} A ${ri} ${ri} 0 0 0 -${xInner} -${yInner - ri} L -${xInner} ${yInner - ri} A ${ri} ${ri} 0 0 0 -${xInner - ri} ${yInner} L ${xInner - ri} ${yInner} A ${ri} ${ri} 0 0 0 ${xInner} ${yInner - ri} L ${xInner} -${yInner - ri} A ${ri} ${ri} 0 0 0 ${xInner - ri} -${yInner} Z`
        }

        return { path: `${outerPath} ${innerPath}` }
    }

    if (viewType === 'side') {
        const yTop = -h / 2
        const yBot = h / 2
        const yInnerTop = yTop + tf
        const yInnerBot = yBot - tf

        return {
            path: `M 0 ${yTop} L ${length} ${yTop} L ${length} ${yBot} L 0 ${yBot} Z M 0 ${yInnerTop} L ${length} ${yInnerTop} M 0 ${yInnerBot} L ${length} ${yInnerBot}`
        }
    }

    if (viewType === 'top') {
        const yTop = -b / 2
        const yBot = b / 2
        const yWebTop = -tw / 2
        const yWebBot = tw / 2

        return {
            path: `M 0 ${yTop} L ${length} ${yTop} L ${length} ${yBot} L 0 ${yBot} Z`, // Outline
            dashed: `M 0 ${yWebTop} L ${length} ${yWebTop} M 0 ${yWebBot} L ${length} ${yWebBot}` // Web lines (dashed as requested)
        }
    }

    // IPE/HEA/HEB front view
    const yTop = -h / 2
    const yBot = h / 2
    const fillR = Math.min(props.r ?? Math.max(tw, tf) * 1.2, (b - tw) / 2)

    if (fillR <= 0) {
        const pts = getBeamPoints(props)
        return {
            path: `M ${pts.map(p => `${p.x} ${p.y}`).join(' L ')} Z`
        }
    }

    const path = `M -${b / 2} ${yTop} L ${b / 2} ${yTop} L ${b / 2} ${yTop + tf} L ${tw / 2 + fillR} ${yTop + tf} A ${fillR} ${fillR} 0 0 0 ${tw / 2} ${yTop + tf + fillR} L ${tw / 2} ${yBot - tf - fillR} A ${fillR} ${fillR} 0 0 0 ${tw / 2 + fillR} ${yBot - tf} L ${b / 2} ${yBot - tf} L ${b / 2} ${yBot} L -${b / 2} ${yBot} L -${b / 2} ${yBot - tf} L -${tw / 2 + fillR} ${yBot - tf} A ${fillR} ${fillR} 0 0 0 -${tw / 2} ${yBot - tf - fillR} L -${tw / 2} ${yTop + tf + fillR} A ${fillR} ${fillR} 0 0 0 -${tw / 2 + fillR} ${yTop + tf} L -${b / 2} ${yTop + tf} Z`
    
    return { path }
}
