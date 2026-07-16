/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useEscapeToClose } from '../useEscapeToClose'

function pressEscape() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
}

describe('useEscapeToClose', () => {
  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    renderHook(() => useEscapeToClose(onClose))
    pressEscape()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ignores other keys', () => {
    const onClose = vi.fn()
    renderHook(() => useEscapeToClose(onClose))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('does nothing when enabled is false', () => {
    const onClose = vi.fn()
    renderHook(() => useEscapeToClose(onClose, false))
    pressEscape()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('stops listening after unmount', () => {
    const onClose = vi.fn()
    const { unmount } = renderHook(() => useEscapeToClose(onClose))
    unmount()
    pressEscape()
    expect(onClose).not.toHaveBeenCalled()
  })
})
