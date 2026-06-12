/**
 * Format a numeric string with Indonesian thousand separators:
 * "500000" → "500.000". Strips every non-digit (and leading zeros) first,
 * so it is safe to re-run on every keystroke of a controlled input.
 */
export function formatThousands(value) {
  const digits = String(value ?? '')
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '')
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
