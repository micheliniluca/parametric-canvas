import { BoltObject, Point } from '../types'

export const parseSpacing = (spacing: string): number[] => {
    if (!spacing.trim()) return [0]

    const parts = spacing.trim().split(/\s+/)
    const offsets: number[] = []

    parts.forEach(part => {
        if (part.includes('*')) {
            const [countStr, valStr] = part.split('*')
            const count = parseInt(countStr)
            const val = parseFloat(valStr)
            if (!isNaN(count) && !isNaN(val)) {
                for (let i = 0; i < count; i++) offsets.push(val)
            }
        } else {
            const val = parseFloat(part)
            if (!isNaN(val)) offsets.push(val)
        }
    })

    if (offsets.length === 0) return [0]
    return offsets
}

export const getBoltPositions = (bolt: BoltObject): Point[] => {
    const { p1, p2, spacingX, spacingY, offsetX, offsetY } = bolt

    // 1. Calculate direction and angle
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const angle = Math.atan2(dy, dx)
    const length = Math.sqrt(dx * dx + dy * dy) // Current visual length, though logic depends on spacing

    // 2. Parse Spacings
    // X spacing defines relative positions along the line
    // e.g. "100 80" means: first bolt at 100, second at 100+80
    const xOffsetsRaw = parseSpacing(spacingX)
    const xPositions: number[] = []

    // Accumulate X offsets
    let currentX = offsetX
    // Note: Tekla logic varies. Usually specific values are absolute or relative.
    // "100 2*80" usually means:
    // Bolt 1 at 0? No, usually Start Point is origin.
    // In Tekla: Spacing "100 80" creates bolts at distances from start.
    // Let's assume the string defines the GAPS.
    // Bolt 1 is usually at Start + Offset.
    // Bolt 2 is at Bolt 1 + 100.
    // Bolt 3 is at Bolt 2 + 80.

    // Actually, let's treat it as: First bolt at `offsetX`.
    // Then subsequent bolts at `offsetX + spacing[i]`.
    // Wait, "100 2*80" means gaps of 100, 80, 80.
    // So:
    // B1: offsetX
    // B2: offsetX + 100
    // B3: offsetX + 100 + 80
    // B4: offsetX + 100 + 80 + 80

    xPositions.push(currentX) // First bolt at origin + offset
    xOffsetsRaw.forEach(gap => {
        currentX += gap
        xPositions.push(currentX)
    })
    // If string was empty/zero, we just have one bolt at offsetX.

    // Y Spacing
    // "50 50" -> Centers? Or from centerline?
    // Usually symmetric or specified.
    // Let's assume spacingY string defines GAPS between rows, centered around axis?
    // Or just offsets from axis?
    // Let's implement simple: "0" is on axis. "50" means one row at 50?
    // Let's mimic Tekla: Spacing Y is distance list.
    // If we have "80", is it two bolts at +/- 40? Or just one at 80?
    // Tekla "Bolt dist Y" usually implies pattern.
    // Let's simplify: Spacing Y is visual list of offsets from centerline.
    // e.g. "0" -> one row on line.
    // "-40 40" -> two rows.
    // "80" -> Maybe treated as one gap, implying two bolts?
    // Let's stick to explicit offsets list logic for Y too, but centered?
    // No, let's stick to the same logic: gaps.
    // But where does it start?
    // Let's just say spacingY are ABSOLUTE offsets from centerline for now to be flexible?
    // Or gaps starting from -width/2?
    // Let's try: SpacingY defines gaps between bolts in Y direction.
    // We center the whole group in Y.

    const yGaps = parseSpacing(spacingY)
    // Calculate total width to center
    const totalY = yGaps.reduce((a, b) => a + b, 0)
    let startY = -totalY / 2

    const yPositions: number[] = [startY + offsetY]
    let currentY = startY + offsetY
    yGaps.forEach(gap => {
        currentY += gap
        yPositions.push(currentY)
    })

    // 3. Generate Grid Points
    const points: Point[] = []

    xPositions.forEach(lx => {
        yPositions.forEach(ly => {
            // Rotate coordinates
            // Global X = p1.x + lx * cos - ly * sin
            // Global Y = p1.y + lx * sin + ly * cos

            const gx = p1.x + lx * Math.cos(angle) - ly * Math.sin(angle)
            const gy = p1.y + lx * Math.sin(angle) + ly * Math.cos(angle)

            points.push({ x: gx, y: gy })
        })
    })

    return points
}

export const getBoltHeadPath = (diameter: number): string => {
    // Hexagon width across flats (W) is roughly 1.6 * d
    // Standard M12 -> 19mm (~1.58)
    // M16 -> 24mm (1.5)
    // M20 -> 30mm (1.5)
    // M24 -> 36mm (1.5)
    // M30 -> 46mm (1.53) - user request 45, standard is 46. Let's use ~1.55 multiplier or lookup.

    // Lookup table for standard metric bolts (ISO 4014)
    const hexSizes: Record<number, number> = {
        12: 19,
        14: 22,
        16: 24,
        20: 30,
        22: 32,
        24: 36,
        27: 41,
        30: 46, // User mentioned 45, but 46 is standard. Let's use 46 or map 30->45 if strictly requested.
        36: 55
    }

    const W = hexSizes[diameter] || (diameter * 1.6)
    const R = W / Math.sqrt(3) // Radius of circumcircle (center to corner)

    // Generate 6 points
    // Point 0 is usually at angle 0 or 30?
    // Pointy top? or Flat top?
    // Bolt heads in drawings usually have flat top/bottom or pointy.
    // Let's do pointy top (angle 30 offset) to look like a standard hex nut orientation

    // Angles: 0, 60, 120, 180, 240, 300 -> Flat sides on left/right
    // Angles: 30, 90, 150, 210, 270, 330 -> Pointy top/bottom, flat sides on left/right? No.
    // 0 deg is typically Right.
    // Let's generate points: x = R * cos(a), y = R * sin(a)

    let d = ""
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i // 0, 60, 120...
        const x = R * Math.cos(angle)
        const y = R * Math.sin(angle)
        d += (i === 0 ? "M " : "L ") + `${x} ${y} `
    }
    d += "Z"
    return d
}
