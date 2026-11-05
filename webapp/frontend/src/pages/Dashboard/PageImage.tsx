import type { TranscriptionLine } from '../../api/transcription'
import { confidenceLevel, levelColors } from './transcriptionLines'

type Props = {
  src: string
  alt: string
  size: [number, number] | null
  lines: TranscriptionLine[]
  activeIndex: number | null
  onHover: (index: number | null) => void
  onOpen: (index: number) => void
}

// Marge à gauche de l'image pour les barres de qualité, en part de la largeur de l'image.
const GUTTER_RATIO = 0.03

type Bar = { line: TranscriptionLine; top: number; bottom: number }

// Les cadres BLLA se chevauchent un peu : on coupe chaque barre au milieu du chevauchement
// avec ses voisines pour que les barres restent séparées.
function qualityBars(lines: TranscriptionLine[], height: number): Bar[] {
  // 1. Le haut et le bas de chaque ligne qui a un cadre.
  const boxes: Bar[] = []
  for (const line of lines) {
    if (line.bbox !== null) {
      boxes.push({ line, top: line.bbox[1], bottom: line.bbox[3] })
    }
  }
  // 2. Triées de haut en bas.
  boxes.sort((a, b) => a.top - b.top)

  // 3. Si deux voisines se chevauchent, chacune s'arrête au milieu du chevauchement.
  const gap = height * 0.004
  const bars: Bar[] = []
  for (let i = 0; i < boxes.length; i++) {
    let start = boxes[i].top
    let end = boxes[i].bottom
    if (i > 0 && boxes[i - 1].bottom > start) {
      start = (boxes[i - 1].bottom + boxes[i].top) / 2
    }
    if (i < boxes.length - 1 && boxes[i + 1].top < end) {
      end = (boxes[i].bottom + boxes[i + 1].top) / 2
    }
    bars.push({
      line: boxes[i].line,
      top: start + gap,
      bottom: Math.max(end - gap, start + gap),
    })
  }
  return bars
}

// L'image, le cadre de chaque ligne et, dans une marge à gauche, une barre colorée selon
// la qualité de la ligne. Tout est dessiné dans le même SVG, donc tout reste aligné.
export default function PageImage({ src, alt, size, lines, activeIndex, onHover, onOpen }: Props) {
  let annotated = false
  if (size !== null) {
    for (const line of lines) {
      if (line.bbox !== null) annotated = true
    }
  }

  return (
    <div className="relative h-full w-full">
      {/* Sans cadres (pas encore de transcription), l'image seule. */}
      <img className={annotated ? 'hidden' : 'h-full w-full object-contain'} src={src} alt={alt} />
      {annotated && size !== null && (
        <PageOverlay
          src={src}
          alt={alt}
          size={size}
          lines={lines}
          activeIndex={activeIndex}
          onHover={onHover}
          onOpen={onOpen}
        />
      )}
    </div>
  )
}

function PageOverlay({
  src,
  alt,
  size: [width, height],
  lines,
  activeIndex,
  onHover,
  onOpen,
}: Omit<Props, 'size'> & { size: [number, number] }) {
  const gutter = width * GUTTER_RATIO
  const barWidth = gutter * 0.45

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox={`${-gutter} 0 ${width + gutter} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={alt}
    >
      <image href={src} x={0} y={0} width={width} height={height} />
      {qualityBars(lines, height).map(({ line, top, bottom }) => {
        const active = line.index === activeIndex
        return (
          <rect
            key={`bar-${line.index}`}
            className="cursor-pointer transition-opacity duration-100"
            x={-gutter + (active ? 0 : (gutter - barWidth) / 4)}
            y={top}
            width={active ? barWidth * 1.5 : barWidth}
            height={bottom - top}
            rx={barWidth / 2}
            fill={levelColors[confidenceLevel(line.confidence)].stroke}
            opacity={activeIndex === null || active ? 1 : 0.35}
            onMouseEnter={() => onHover(line.index)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onOpen(line.index)}
          />
        )
      })}
      {lines.map((line) => {
        if (!line.bbox) return null
        const [left, top, right, bottom] = line.bbox
        const active = line.index === activeIndex
        const stroke = levelColors[confidenceLevel(line.confidence)].stroke
        return (
          <rect
            key={line.index}
            className="cursor-pointer transition-[fill,stroke-opacity] duration-100"
            x={left}
            y={top}
            width={right - left}
            height={bottom - top}
            rx={6}
            fill={active ? stroke : 'transparent'}
            fillOpacity={active ? 0.14 : 0}
            stroke={active ? stroke : '#4f46e5'}
            strokeOpacity={active ? 1 : activeIndex === null ? 0.18 : 0.08}
            strokeWidth={active ? 2 : 1}
            vectorEffect="non-scaling-stroke"
            pointerEvents="all"
            onMouseEnter={() => onHover(line.index)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onOpen(line.index)}
          />
        )
      })}
    </svg>
  )
}
