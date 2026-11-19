import logoUrl from '../assets/maffeis-logo.svg'

/**
 * Logo Maffeis monocromatico: il disegno fa da maschera e prende il colore del testo (currentColor),
 * così è bianco sulla barra navy e scuro sul pannello chiaro.
 */
export function MaffeisLogo({ height = 22, className }: { height?: number; className?: string }) {
  // proporzioni del file originale: 104,88 × 34,04
  const width = (height * 104.88) / 34.04
  return (
    <span
      role="img"
      aria-label="Maffeis"
      className={className}
      style={{
        display: 'inline-block', flexShrink: 0, width, height, backgroundColor: 'currentColor',
        WebkitMask: `url(${logoUrl}) center / contain no-repeat`, mask: `url(${logoUrl}) center / contain no-repeat`,
      }}
    />
  )
}
