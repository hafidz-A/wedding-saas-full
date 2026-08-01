/** @vitest-environment jsdom */
import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import Switch from '../Switch'

describe('<Switch>', () => {
  afterEach(() => cleanup())

  it('exposes role=switch with aria-checked reflecting `checked`', () => {
    const { rerender } = render(<Switch checked={false} onChange={() => {}} label="Tampilkan" />)
    const el = screen.getByRole('switch', { name: 'Tampilkan' })
    expect(el.tagName).toBe('BUTTON')
    expect(el.getAttribute('type')).toBe('button')
    expect(el.getAttribute('aria-checked')).toBe('false')

    rerender(<Switch checked onChange={() => {}} label="Tampilkan" />)
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true')
  })

  it('emits the INVERSE of the current state, not a raw toggle', () => {
    const onChange = vi.fn()
    const { rerender } = render(<Switch checked={false} onChange={onChange} label="s" />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)

    onChange.mockClear()
    rerender(<Switch checked onChange={onChange} label="s" />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('does not emit while disabled, and still renders the checked state', () => {
    const onChange = vi.fn()
    render(<Switch checked disabled onChange={onChange} label="terkunci" />)
    const el = screen.getByRole('switch', { name: 'terkunci' }) as HTMLButtonElement
    expect(el.disabled).toBe(true)
    expect(el.getAttribute('aria-checked')).toBe('true')
    fireEvent.click(el)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('runs the caller onClick before onChange so a row can stopPropagation', () => {
    const order: string[] = []
    render(
      <Switch
        checked={false}
        onClick={() => order.push('click')}
        onChange={() => order.push('change')}
        label="s"
      />,
    )
    fireEvent.click(screen.getByRole('switch'))
    expect(order).toEqual(['click', 'change'])
  })
})
