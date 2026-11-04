import OpenSeadragon from 'openseadragon'
import { useEffect, useRef, useState } from 'react'

import type { TranscriptionLine } from '../../api/transcription'
import { confidenceLevel, levelColors } from './transcriptionLines'

type Props = {
  tileSource: string
  alt: string
  size: [number, number] | null
  lines: TranscriptionLine[]
  activeIndex: number | null
  onHover: (index: number | null) => void
  onOpen: (index: number) => void
  zoomInLabel: string
  zoomOutLabel: string
  resetZoomLabel: string
}

const GUTTER_RATIO = 0.03

type Bar = { line: TranscriptionLine; top: number; bottom: number }
type ImageBounds = { left: number; top: number; width: number; height: number }

function qualityBars(lines: TranscriptionLine[], height: number): Bar[] {
  const boxes: Bar[] = []
  for (const line of lines) {
    if (line.bbox !== null) boxes.push({ line, top: line.bbox[1], bottom: line.bbox[3] })
  }
  boxes.sort((a, b) => a.top - b.top)

  const gap = height * 0.004
  return boxes.map((box, index) => {
    let start = box.top
    let end = box.bottom
    if (index > 0 && boxes[index - 1].bottom > start) {
      start = (boxes[index - 1].bottom + box.top) / 2
    }
    if (index < boxes.length - 1 && boxes[index + 1].top < end) {
      end = (box.bottom + boxes[index + 1].top) / 2
    }
    return {
      line: box.line,
      top: start + gap,
      bottom: Math.max(end - gap, start + gap),
    }
  })
}

export default function PageImage({
  tileSource,
  alt,
  size,
  lines,
  activeIndex,
  onHover,
  onOpen,
  zoomInLabel,
  zoomOutLabel,
  resetZoomLabel,
}: Props) {
  const viewerElement = useRef<HTMLDivElement>(null)
  const viewer = useRef<OpenSeadragon.Viewer | null>(null)
  const [imageBounds, setImageBounds] = useState<ImageBounds | null>(null)
  const hasBoxes = size !== null && lines.some((line) => line.bbox !== null)

  useEffect(() => {
    if (!viewerElement.current) return
    const instance = OpenSeadragon({
      element: viewerElement.current,
      tileSources: tileSource,
      showNavigationControl: false,
      showHomeControl: false,
      showZoomControl: false,
      showFullPageControl: false,
      showRotationControl: false,
      visibilityRatio: 1,
      constrainDuringPan: true,
      animationTime: 0.25,
      gestureSettingsMouse: { clickToZoom: false, scrollToZoom: true },
    })
    viewer.current = instance

    const updateBounds = () => {
      if (!instance.world.getItemAt(0)) return
      const topLeft = instance.viewport.imageToViewerElementCoordinates(
        new OpenSeadragon.Point(0, 0),
      )
      const bottomRight = instance.viewport.imageToViewerElementCoordinates(
        instance.world.getItemAt(0).getContentSize(),
      )
      setImageBounds({
        left: topLeft.x,
        top: topLeft.y,
        width: bottomRight.x - topLeft.x,
        height: bottomRight.y - topLeft.y,
      })
    }

    instance.addHandler('open', updateBounds)
    instance.addHandler('animation', updateBounds)
    instance.addHandler('resize', updateBounds)
    instance.addHandler('pan', updateBounds)
    instance.addHandler('zoom', updateBounds)

    return () => {
      instance.destroy()
      viewer.current = null
    }
  }, [tileSource])

  const zoomBy = (factor: number) => {
    const currentViewer = viewer.current
    if (!currentViewer) return
    currentViewer.viewport.zoomBy(factor)
    currentViewer.viewport.applyConstraints()
  }

  const resetZoom = () => {
    viewer.current?.viewport.goHome()
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-[#f8f8fb]">
      <div ref={viewerElement} className="absolute inset-0" aria-label={alt} />
      {hasBoxes && imageBounds && size !== null && (
        <PageOverlay
          bounds={imageBounds}
          size={size}
          lines={lines}
          activeIndex={activeIndex}
          onHover={onHover}
          onOpen={onOpen}
        />
      )}
      <div className="absolute right-3 bottom-3 z-10 flex overflow-hidden rounded-lg bg-white/95 shadow-[0_2px_8px_rgba(23,28,51,0.18)]">
        <button
          type="button"
          className="grid size-9 place-items-center border-r border-[#e4e4e7] text-lg text-[#27272a] hover:bg-[#f4f4f5]"
          onClick={() => zoomBy(1.5)}
          aria-label={zoomInLabel}
        >
          +
        </button>
        <button
          type="button"
          className="grid size-9 place-items-center border-r border-[#e4e4e7] text-lg text-[#27272a] hover:bg-[#f4f4f5]"
          onClick={() => zoomBy(1 / 1.5)}
          aria-label={zoomOutLabel}
        >
          −
        </button>
        <button
          type="button"
          className="grid size-9 place-items-center text-xs font-semibold text-[#27272a] hover:bg-[#f4f4f5]"
          onClick={resetZoom}
          aria-label={resetZoomLabel}
        >
          1:1
        </button>
      </div>
    </div>
  )
}

function PageOverlay({
  bounds,
  size: [width, height],
  lines,
  activeIndex,
  onHover,
  onOpen,
}: {
  bounds: ImageBounds
  size: [number, number]
  lines: TranscriptionLine[]
  activeIndex: number | null
  onHover: (index: number | null) => void
  onOpen: (index: number) => void
}) {
  const gutter = width * GUTTER_RATIO
  const barWidth = gutter * 0.45

  return (
    <svg
      className="pointer-events-none absolute"
      style={{
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
      }}
      viewBox={`${-gutter} 0 ${width + gutter} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Transcription line annotations"
    >
      <g className="pointer-events-auto">
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
              onMouseEnter={() => onHover(line.index)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onOpen(line.index)}
            />
          )
        })}
      </g>
    </svg>
  )
}
