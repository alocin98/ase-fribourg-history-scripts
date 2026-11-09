import OpenSeadragon from 'openseadragon'
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'

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
    if (!viewerElement.current || !tileSource) return

    let cancelled = false
    let instance: OpenSeadragon.Viewer | null = null
    setImageBounds(null)

    // info.json renvoie une URL backend absolue ; on la réécrit vers le même origin
    // (proxy Vite) pour que les tuiles envoient bien le cookie de session.
    const sameOriginId = new URL(
      tileSource.replace(/\/info\.json$/i, ''),
      window.location.origin,
    ).href

    const openViewer = (source: OpenSeadragon.Options['tileSources']) => {
      if (cancelled || !viewerElement.current) return
      instance = OpenSeadragon({
        element: viewerElement.current,
        tileSources: source,
        ajaxWithCredentials: true,
        crossOriginPolicy: 'use-credentials',
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
        if (!instance?.world.getItemAt(0)) return
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
    }

    void fetch(tileSource, { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`IIIF info ${response.status}`)
        const info = (await response.json()) as Record<string, unknown>
        openViewer({
          ...info,
          id: sameOriginId,
          '@id': sameOriginId,
        } as OpenSeadragon.TileSourceOptions)
      })
      .catch(() => {
        openViewer(sameOriginId)
      })

    return () => {
      cancelled = true
      instance?.destroy()
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

  const zoomImage = (event: ReactWheelEvent<SVGGElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const currentViewer = viewer.current
    const element = viewerElement.current
    if (!currentViewer || !element) return
    const bounds = element.getBoundingClientRect()
    const point = currentViewer.viewport.pointFromPixel(
      new OpenSeadragon.Point(event.clientX - bounds.left, event.clientY - bounds.top),
    )
    const factor = Math.pow(1.002, -event.deltaY)
    currentViewer.viewport.zoomBy(factor, point)
  }

  const panImage = (deltaX: number, deltaY: number) => {
    const currentViewer = viewer.current
    if (!currentViewer) return
    const delta = currentViewer.viewport.deltaPointsFromPixels(
      new OpenSeadragon.Point(-deltaX, -deltaY),
    )
    currentViewer.viewport.panBy(delta, true)
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
          onPan={panImage}
          onZoom={zoomImage}
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
  onPan,
  onZoom,
}: {
  bounds: ImageBounds
  size: [number, number]
  lines: TranscriptionLine[]
  activeIndex: number | null
  onHover: (index: number | null) => void
  onOpen: (index: number) => void
  onPan: (deltaX: number, deltaY: number) => void
  onZoom: (event: ReactWheelEvent<SVGGElement>) => void
}) {
  const barWidth = width * 0.0135
  const pointer = useRef<{
    x: number
    y: number
    lastX: number
    lastY: number
    dragged: boolean
  } | null>(null)

  const startPointer = (event: ReactPointerEvent<SVGRectElement>) => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    pointer.current = {
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      dragged: false,
    }
  }

  const movePointer = (event: ReactPointerEvent<SVGRectElement>) => {
    const current = pointer.current
    if (!current) return
    const deltaX = event.clientX - current.lastX
    const deltaY = event.clientY - current.lastY
    if (!current.dragged && Math.hypot(event.clientX - current.x, event.clientY - current.y) > 4) {
      current.dragged = true
    }
    if (current.dragged && (deltaX !== 0 || deltaY !== 0)) onPan(deltaX, deltaY)
    current.lastX = event.clientX
    current.lastY = event.clientY
  }

  const endPointer = (event: ReactPointerEvent<SVGRectElement>, index: number) => {
    const current = pointer.current
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    pointer.current = null
    if (current && !current.dragged) onOpen(index)
  }

  const cancelPointer = (event: ReactPointerEvent<SVGRectElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    pointer.current = null
  }

  return (
    <svg
      className="pointer-events-none absolute"
      style={{
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
      }}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Transcription line annotations"
    >
      <g className="pointer-events-auto" onWheel={onZoom}>
        {qualityBars(lines, height).map(({ line, top, bottom }) => {
          const active = line.index === activeIndex
          return (
            <rect
              key={`bar-${line.index}`}
              className="cursor-pointer transition-opacity duration-100"
              x={0}
              y={top}
              width={active ? barWidth * 1.5 : barWidth}
              height={bottom - top}
              rx={barWidth / 2}
              fill={levelColors[confidenceLevel(line.confidence)].stroke}
              opacity={activeIndex === null || active ? 1 : 0.35}
              onMouseEnter={() => onHover(line.index)}
              onMouseLeave={() => onHover(null)}
              onPointerDown={startPointer}
              onPointerMove={movePointer}
              onPointerUp={(event) => endPointer(event, line.index)}
              onPointerCancel={cancelPointer}
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
              onPointerDown={startPointer}
              onPointerMove={movePointer}
              onPointerUp={(event) => endPointer(event, line.index)}
              onPointerCancel={cancelPointer}
            />
          )
        })}
      </g>
    </svg>
  )
}