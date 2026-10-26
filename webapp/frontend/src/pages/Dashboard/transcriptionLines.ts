import type { PageTranscription, TranscriptionLine } from '../../api/transcription'

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown'

// Confiance d'une ligne, en % arrondi : moyenne des probabilités p que TrOCR donne
// à chacun des tokens qu'il a choisis.
export function confidencePercent(confidence: number): number {
  return Math.round(confidence * 100)
}

// Bornes des couleurs sur le pourcentage affiché : vert ≥ 90, orange 70–89, rouge < 70.
export const CONFIDENCE_BANDS = { high: 90, medium: 70 }

export function confidenceLevel(confidence: number | null): ConfidenceLevel {
  if (confidence === null) return 'unknown'
  const percent = confidencePercent(confidence)
  if (percent >= CONFIDENCE_BANDS.high) return 'high'
  if (percent >= CONFIDENCE_BANDS.medium) return 'medium'
  return 'low'
}

// Couleurs partagées par la ligne de texte et son cadre sur l'image.
export const levelColors: Record<ConfidenceLevel, { chip: string; stroke: string }> = {
  high: { chip: 'bg-[#ecfdf5] text-[#047857]', stroke: '#10b981' },
  medium: { chip: 'bg-[#fffbeb] text-[#b45309]', stroke: '#f59e0b' },
  low: { chip: 'bg-[#fef2f2] text-[#b91c1c]', stroke: '#ef4444' },
  unknown: { chip: 'bg-[#f4f4f5] text-[#71717a]', stroke: '#71717a' },
}

// Lignes à afficher : celles du modèle, sinon le texte seul découpé en lignes
// (ancienne transcription), sans cadre ni confiance.
export function linesOf(transcription: PageTranscription): TranscriptionLine[] {
  if (transcription.complete) return transcription.lines
  if (transcription.text === '') return []

  const lines: TranscriptionLine[] = []
  const rows = transcription.text.split('\n')
  for (let i = 0; i < rows.length; i++) {
    lines.push({ index: i + 1, text: rows[i], bbox: null, confidence: null, words: [] })
  }
  return lines
}

// Note d'une page ou du document : la moyenne sur toutes les lignes, colorée selon les
// mêmes bornes qu'une ligne, et le nombre de lignes dans chaque bande.
export type Rating = {
  level: ConfidenceLevel
  average: number
  counts: Record<ConfidenceLevel, number>
}

export function pageRating(lines: TranscriptionLine[]): Rating | null {
  const average = averageConfidence(lines)
  if (average === null) return null

  const counts = { high: 0, medium: 0, low: 0, unknown: 0 }
  for (const line of lines) {
    const level = confidenceLevel(line.confidence)
    counts[level] = counts[level] + 1
  }
  return { level: confidenceLevel(average), average, counts }
}

// Moyenne des confiances des lignes ; les lignes sans confiance sont ignorées.
export function averageConfidence(lines: TranscriptionLine[]): number | null {
  let sum = 0
  let count = 0
  for (const line of lines) {
    if (line.confidence !== null) {
      sum = sum + line.confidence
      count = count + 1
    }
  }
  if (count === 0) return null
  return sum / count
}
