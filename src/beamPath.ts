export function getBeamPoints(props: { type?: string, h: number, b: number, tw: number, tf: number, r?: number, viewType?: 'front' | 'side' | 'top', length?: number }) {
    const { type = 'IPE', h, b, tw, tf, viewType = 'front', length = 400 } = props

    if (type === 'CHS') {
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

    if (type === 'RHS') {
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

    if (type === 'CHS') {
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

    if (type === 'RHS') {
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
    const fillR = props.r ?? Math.max(tw, tf) * 1.2

    if (fillR <= 0) {
        const pts = getBeamPoints(props)
        return {
            path: `M ${pts.map(p => `${p.x} ${p.y}`).join(' L ')} Z`
        }
    }

    const path = `M -${b / 2} ${yTop} L ${b / 2} ${yTop} L ${b / 2} ${yTop + tf} L ${tw / 2 + fillR} ${yTop + tf} A ${fillR} ${fillR} 0 0 0 ${tw / 2} ${yTop + tf + fillR} L ${tw / 2} ${yBot - tf - fillR} A ${fillR} ${fillR} 0 0 0 ${tw / 2 + fillR} ${yBot - tf} L ${b / 2} ${yBot - tf} L ${b / 2} ${yBot} L -${b / 2} ${yBot} L -${b / 2} ${yBot - tf} L -${tw / 2 + fillR} ${yBot - tf} A ${fillR} ${fillR} 0 0 0 -${tw / 2} ${yBot - tf - fillR} L -${tw / 2} ${yTop + tf + fillR} A ${fillR} ${fillR} 0 0 0 -${tw / 2 + fillR} ${yTop + tf} L -${b / 2} ${yTop + tf} Z`
    
    return { path }
}
