export function getBeamPoints({ h, b, tw, tf }: { h: number, b: number, tw: number, tf: number, r?: number }) {
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

export function generateBeamPath(props: { h: number, b: number, tw: number, tf: number, r?: number }) {
    const pts = getBeamPoints(props)
    return `M ${pts.map(p => `${p.x} ${p.y}`).join(' L ')} Z`
}
