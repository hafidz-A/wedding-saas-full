import Link from 'next/link'
import styles from './Logo.module.css'

type LogoProps = { size?: 'sm' | 'md'; withLink?: boolean }

export function Logo({ size = 'md', withLink = true }: LogoProps) {
  const mark = (
    <span className={`${styles.logo} ${size === 'sm' ? styles.sm : styles.md}`}>
      <span className={styles.fin}>fin</span>
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.wedding}>Wedding</span>
    </span>
  )
  if (!withLink) return mark
  return (
    <Link href="/" className={styles.link} aria-label="finWedding — beranda">
      {mark}
    </Link>
  )
}
