/**
 * Shim — the admin dialog system was unified into src/components/ui/DialogProvider
 * (2026-07 design-system hardening). Kept so ~6 admin consumers' imports and the
 * useAdmin* hook names keep working unchanged.
 */
export {
  DialogProvider as AdminDialogProvider,
  useConfirm as useAdminConfirm,
  useAlert as useAdminAlert,
  useForm as useAdminForm,
  type DialogField,
} from '@/components/ui/DialogProvider'
