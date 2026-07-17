/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import React from 'react'
import { ButtonLink } from '../Button'

afterEach(() => cleanup())

describe('<ButtonLink>', () => {
  it('renders an anchor with href and button classes', () => {
    render(<ButtonLink href="/reset-password">Lanjut</ButtonLink>)
    const a = screen.getByRole('link', { name: 'Lanjut' })
    expect(a.getAttribute('href')).toBe('/reset-password')
    expect(a.className).toContain('btn')
    expect(a.className).toContain('primary')
    expect(a.className).toContain('md')
  })

  it('applies ghost/sm variant classes and passes target/rel through', () => {
    render(<ButtonLink href="/x" variant="ghost" size="sm" target="_blank" rel="noreferrer">Lihat</ButtonLink>)
    const a = screen.getByRole('link', { name: 'Lihat' })
    expect(a.className).toContain('ghost')
    expect(a.className).toContain('sm')
    expect(a.getAttribute('target')).toBe('_blank')
    expect(a.getAttribute('rel')).toBe('noreferrer')
  })
})
