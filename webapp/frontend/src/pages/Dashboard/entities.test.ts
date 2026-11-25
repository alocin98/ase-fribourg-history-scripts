import { describe, expect, it } from 'vitest'

import type { TranscriptionLine } from '../../api/transcription'
import { entitiesByLine } from './entities'

const lines: TranscriptionLine[] = [
  { index: 1, text: 'John visited London.', bbox: null, confidence: null, words: [] },
  { index: 2, text: 'On 12 May 1890.', bbox: null, confidence: null, words: [] },
]

describe('entitiesByLine', () => {
  it('converts page offsets to line offsets', () => {
    const result = entitiesByLine('John visited London. On 12 May 1890.', lines, [
      { text: 'London', label: 'location', start: 13, end: 19, score: 0.9 },
      { text: '12 May 1890', label: 'date', start: 24, end: 35, score: null },
    ])

    expect(result[1][0]).toMatchObject({ text: 'London', start: 13, end: 19 })
    expect(result[2][0]).toMatchObject({ text: '12 May 1890', start: 3, end: 14 })
  })
})
