import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import '../../i18n'
import EntitiesToggle from './EntitiesToggle'

// Une pastille de couleur par type d'entité dans la légende.
const legendDots = (container: HTMLElement) => container.querySelectorAll('i').length

describe('EntitiesToggle', () => {
  it('hides the legend and turns on when clicked', () => {
    const onChange = vi.fn()
    const { container } = render(<EntitiesToggle checked={false} onChange={onChange} />)

    const toggle = screen.getByRole('switch')
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    expect(legendDots(container)).toBe(0)

    fireEvent.click(toggle)
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('shows the legend of the three entity types when on', () => {
    const { container } = render(<EntitiesToggle checked onChange={() => {}} />)

    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    expect(legendDots(container)).toBe(3)
  })
})
