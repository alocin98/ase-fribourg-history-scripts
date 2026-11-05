import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import '../i18n'
import Brand from './Brand'

describe('Brand', () => {
  it('renders a link to the home page', () => {
    render(
      <MemoryRouter>
        <Brand />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link')).toHaveAttribute('href', '/')
  })
})
