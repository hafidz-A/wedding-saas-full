/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import React from 'react'
import { FeedbackProvider, useFeedback } from '../FeedbackProvider'

afterEach(() => cleanup())

function Trigger() {
  const fb = useFeedback()
  return (
    <>
      <button onClick={() => fb.ok('Tersimpan')}>ok</button>
      <button onClick={() => fb.fail()}>fail</button>
    </>
  )
}

describe('<FeedbackProvider> (ui)', () => {
  it('shows a polite status toast with the given message', () => {
    render(<FeedbackProvider><Trigger /></FeedbackProvider>)
    fireEvent.click(screen.getByText('ok'))
    const toast = screen.getByRole('status')
    expect(toast.textContent).toContain('Tersimpan')
  })

  it('fail toast is an assertive alert and uses the default copy', () => {
    render(<FeedbackProvider defaults={{ ok: 'Beres', fail: 'Gagal, coba lagi' }}><Trigger /></FeedbackProvider>)
    fireEvent.click(screen.getByText('fail'))
    const alert = screen.getByRole('alert')
    expect(alert.getAttribute('aria-live')).toBe('assertive')
    expect(alert.textContent).toContain('Gagal, coba lagi')
  })
})
