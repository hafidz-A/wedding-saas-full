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

  it('stacked dialogs: Escape only closes the most recently mounted one', () => {
    const first = vi.fn()
    const second = vi.fn()
    renderHook(() => useEscapeToClose(first))
    renderHook(() => useEscapeToClose(second))
    pressEscape()
    expect(second).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()
  })

  it('after the top dialog unmounts, Escape falls through to the next one', () => {
    const first = vi.fn()
    const second = vi.fn()
    renderHook(() => useEscapeToClose(first))
    const { unmount: unmountSecond } = renderHook(() => useEscapeToClose(second))
    unmountSecond()
    pressEscape()
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).not.toHaveBeenCalled()
  })
})
