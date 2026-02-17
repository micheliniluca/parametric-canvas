export function generateIPEPath({ h, b, tw, tf }: any) {
  const yTop = -h / 2
  const yBot = h / 2

  return `
    M ${-b/2} ${yTop}
    H ${b/2}
    V ${yTop + tf}
    H ${tw/2}
    V ${yBot - tf}
    H ${b/2}
    V ${yBot}
    H ${-b/2}
    V ${yBot - tf}
    H ${-tw/2}
    V ${yTop + tf}
    H ${-b/2}
    Z
  `
}
