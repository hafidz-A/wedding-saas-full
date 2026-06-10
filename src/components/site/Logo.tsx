import Link from 'next/link'
import styles from './Logo.module.css'
import { BRAND, BRAND_PARTS } from '@/lib/brand'

type LogoProps = { size?: 'sm' | 'md'; withLink?: boolean }

export function Logo({ size = 'md', withLink = true }: LogoProps) {
  const mark = (
    <span className={`${styles.logo} ${size === 'sm' ? styles.sm : styles.md}`}>
      <span className={styles.fin}>{BRAND_PARTS.lead}</span>
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.wedding}>{BRAND_PARTS.tail}</span>
    </span>
  )
  if (!withLink) return mark
  return (
    <Link href="/" className={styles.link} aria-label={`${BRAND} — beranda`}>
      {mark}
    </Link>
  )
}
