import type { BBox } from '../../api/transcription'

type Props = {
  src: string
  size: [number, number]
  bbox: BBox
  // Hauteur maximale de l'extrait ; la largeur suit le rapport de la ligne.
  maxHeightRem: number
  label: string
}

// Extrait de l'image limité au cadre d'une ligne, par un fond recadré.
export default function LineCrop({ src, size: [width, height], bbox, maxHeightRem, label }: Props) {
  const [left, top, right, bottom] = bbox
  const cropWidth = Math.max(right - left, 1)
  const cropHeight = Math.max(bottom - top, 1)

  // On agrandit l'image entière pour que le cadre remplisse la boîte...
  const zoomX = (width / cropWidth) * 100
  const zoomY = (height / cropHeight) * 100
  // ...puis on la décale pour que le coin du cadre soit dans le coin de la boîte.
  // En CSS, 0 % aligne le bord gauche de l'image, 100 % son bord droit.
  let positionX = 0
  if (width !== cropWidth) positionX = (left / (width - cropWidth)) * 100
  let positionY = 0
  if (height !== cropHeight) positionY = (top / (height - cropHeight)) * 100

  return (
    <div
      className="max-w-full rounded-md bg-white bg-no-repeat shadow-[inset_0_0_0_1px_#e4e4e7]"
      style={{
        width: `min(100%, ${maxHeightRem * (cropWidth / cropHeight)}rem)`,
        aspectRatio: `${cropWidth} / ${cropHeight}`,
        backgroundImage: `url("${src}")`,
        backgroundSize: `${zoomX}% ${zoomY}%`,
        backgroundPosition: `${positionX}% ${positionY}%`,
      }}
      role="img"
      aria-label={label}
    />
  )
}
