/**
 * Shim — unified into src/components/ui/DialogProvider (2026-07 design-system
 * hardening). Dashboard callers keep their imports; the dashboard still passes
 * i18n labels via the `labels` prop (now Partial — extra `submit` key optional).
 */
export { DialogProvider, useConfirm, useAlert } from '@/components/ui/DialogProvider'
