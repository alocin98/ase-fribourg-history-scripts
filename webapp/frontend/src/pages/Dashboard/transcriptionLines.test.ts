import { describe, expect, it } from 'vitest'

import { confidencePercent } from './transcriptionLines'

describe('confidencePercent', () => {
  it('converts a normalized probability to a percentage', () => {
    expect(confidencePercent(0.873)).toBe(87)
  })

  it('keeps the displayed value inside zero to one hundred percent', () => {
    expect(confidencePercent(-0.1)).toBe(0)
    expect(confidencePercent(1.1)).toBe(100)
  })
})
