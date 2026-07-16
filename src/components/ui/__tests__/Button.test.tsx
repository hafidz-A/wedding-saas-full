/** @vitest-environment jsdom */
import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Button } from '../Button'

describe('<Button>', () => {
  afterEach(() => cleanup())
  it('renders a native button with type=button by default', () => {
    render(<Button>Simpan</Button>)
    const el = screen.getByRole('button', { name: 'Simpan' })
    expect(el.tagName).toBe('BUTTON')
    expect(el.getAttribute('type')).toBe('button')
  })

  it('applies variant + size classes (primary/md defaults)', () => {
    render(<Button>Simpan</Button>)
    const el = screen.getByRole('button', { name: 'Simpan' })
    expect(el.className).toContain('btn')
    expect(el.className).toContain('primary')
    expect(el.className).toContain('md')
  })

  it('applies danger/sm and merges custom className', () => {
    render(<Button variant="danger" size="sm" className="extra">Hapus</Button>)
    const el = screen.getByRole('button', { name: 'Hapus' })
    expect(el.className).toContain('danger')
    expect(el.className).toContain('sm')
    expect(el.className).toContain('extra')
  })

  it('passes through native props (disabled blocks clicks)', () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Hapus</Button>)
    fireEvent.click(screen.getByRole('button', { name: 'Hapus' }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('allows type=submit override', () => {
    render(<Button type="submit">Kirim</Button>)
    expect(screen.getByRole('button', { name: 'Kirim' }).getAttribute('type')).toBe('submit')
  })
})
