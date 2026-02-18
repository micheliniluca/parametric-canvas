export function getBeamPoints({ h, b, tw, tf, viewType = 'front', length = 400 }: { h: number, b: number, tw: number, tf: number, r?: number, viewType?: 'front' | 'side' | 'top', length?: number }) {
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

export function generateBeamPath(props: { h: number, b: number, tw: number, tf: number, r?: number, viewType?: 'front' | 'side' | 'top', length?: number }): { path: string, dashed?: string } {
    const { h, b, tw, tf, viewType = 'front', length = 400 } = props

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

    const pts = getBeamPoints(props)
    return {
        path: `M ${pts.map(p => `${p.x} ${p.y}`).join(' L ')} Z`
    }
}
