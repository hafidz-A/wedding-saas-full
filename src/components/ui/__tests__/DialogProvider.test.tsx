/** @vitest-environment jsdom */
import React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { DialogProvider, useConfirm, useForm } from '../DialogProvider'

function Confirmer({ onResult }: { onResult: (v: boolean) => void }) {
  const confirm = useConfirm()
  return (
    <button onClick={async () => onResult(await confirm({ message: 'Yakin?' }))}>go</button>
  )
}

describe('<DialogProvider>', () => {
  afterEach(() => cleanup())

  it('confirm resolves true on primary click and renders role=dialog', async () => {
    let result: boolean | null = null
    render(
      <DialogProvider>
        <Confirmer onResult={(v) => (result = v)} />
      </DialogProvider>,
    )
    fireEvent.click(screen.getByText('go'))
    expect(await screen.findByRole('dialog')).toBeTruthy()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ya' }))
    })
    expect(result).toBe(true)
  })

  it('Escape cancels (resolves false)', async () => {
    let result: boolean | null = null
    render(
      <DialogProvider>
        <Confirmer onResult={(v) => (result = v)} />
      </DialogProvider>,
    )
    fireEvent.click(screen.getByText('go'))
    await screen.findByRole('dialog')
    await act(async () => {
      fireEvent.keyDown(window, { key: 'Escape' })
    })
    expect(result).toBe(false)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('form mustEqual gates submit until the exact text is typed', async () => {
    let result: Record<string, string> | null | undefined
    function Former() {
      const form = useForm()
      return (
        <button
          onClick={async () =>
            (result = await form({
              title: 'Hapus?',
              fields: [{ name: 'c', label: 'Ketik HAPUS', mustEqual: 'HAPUS' }],
            }))
          }
        >
          go
        </button>
      )
    }
    render(
      <DialogProvider>
        <Former />
      </DialogProvider>,
    )
    fireEvent.click(screen.getByText('go'))
    const submit = (await screen.findByRole('button', { name: 'Simpan' })) as HTMLButtonElement
    expect(submit.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText(/Ketik HAPUS/), { target: { value: 'HAPUS' } })
    expect(submit.disabled).toBe(false)
    await act(async () => {
      fireEvent.click(submit)
    })
    expect(result).toEqual({ c: 'HAPUS' })
  })
})
