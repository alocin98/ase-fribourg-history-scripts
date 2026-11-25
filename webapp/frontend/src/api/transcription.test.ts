import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getPageTranscription } from './transcription'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

const line = { index: 1, text: 'John visited London.', bbox: null, confidence: 0.9, words: [] }
const london = { text: 'London', label: 'location', start: 13, end: 19, score: 0.93 }

describe('getPageTranscription', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('reads the entities stored with the transcription', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ text: line.text, lines: [line], entities: [london] }),
    )

    const transcription = await getPageTranscription('doc', 'page')

    expect(transcription).toMatchObject({ complete: true, entities: [london] })
  })

  it('keeps entities null while they have not been recognized yet', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ text: line.text, lines: [line], entities: null }))

    const transcription = await getPageTranscription('doc', 'page')

    expect(transcription).toMatchObject({ complete: true, entities: null })
  })
})
