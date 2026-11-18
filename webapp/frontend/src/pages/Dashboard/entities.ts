import type { RecognizedEntity, TranscriptionLine } from '../../api/transcription'

export type LineEntity = RecognizedEntity & { start: number; end: number }

// Converts offsets in the complete page text to offsets inside each displayed line.
export function entitiesByLine(
  fullText: string,
  lines: TranscriptionLine[],
  entities: RecognizedEntity[],
): Record<number, LineEntity[]> {
  const result: Record<number, LineEntity[]> = {}
  let cursor = 0

  for (const line of lines) {
    const lineStart = fullText.indexOf(line.text, cursor)
    if (lineStart < 0) {
      result[line.index] = []
      continue
    }
    const lineEnd = lineStart + line.text.length
    result[line.index] = entities
      .filter((entity) => entity.start >= lineStart && entity.end <= lineEnd)
      .map((entity) => ({
        ...entity,
        start: entity.start - lineStart,
        end: entity.end - lineStart,
      }))
      .sort((left, right) => left.start - right.start || right.end - left.end)
    cursor = lineEnd
  }

  return result
}
