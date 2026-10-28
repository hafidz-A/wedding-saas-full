/** @vitest-environment jsdom */
import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

import { TemporaryErrorView } from '../TemporaryErrorView'

describe('<TemporaryErrorView>', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks() })

  it('says it is a temporary problem, not a missing page', () => {
    render(<TemporaryErrorView />)
    expect(screen.getByRole('alert').textContent).toContain('Sedang ada gangguan')
    expect(screen.getByRole('alert').textContent).not.toMatch(/tidak ditemukan|not found/i)
  })

  it('retry refreshes server data and resets the error boundary', () => {
    const reset = vi.fn()
    render(<TemporaryErrorView onRetry={reset} />)
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }))
    expect(refresh).toHaveBeenCalled()
    expect(reset).toHaveBeenCalled()
  })
})
