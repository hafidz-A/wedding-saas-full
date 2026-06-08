import type React from 'react'

export const sub: React.CSSProperties = { margin: '4px 0 0', fontSize: 13, color: 'rgba(42,33,24,0.6)', maxWidth: 540, lineHeight: 1.5 }
export const ghostBtn: React.CSSProperties = { padding: '8px 14px', borderRadius: 999, border: '1px solid rgba(42,33,24,0.2)', background: 'transparent', cursor: 'pointer', fontSize: 12, letterSpacing: '0.1em' }
export const primaryBtn: React.CSSProperties = { padding: '8px 16px', borderRadius: 999, border: 'none', background: '#2A2118', color: '#F5EFE3', cursor: 'pointer', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' }
export const filterBtn: React.CSSProperties = { padding: '8px 12px', borderRadius: 999, border: '1px solid rgba(42,33,24,0.16)', background: 'transparent', cursor: 'pointer', fontSize: 12 }
export const filterBtnActive: React.CSSProperties = { ...filterBtn, background: '#2A2118', color: '#F5EFE3', borderColor: '#2A2118' }
export const statBox: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 14, border: '1px solid rgba(42,33,24,0.06)' }
export const statLabel: React.CSSProperties = { margin: 0, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(42,33,24,0.55)' }
export const statValue: React.CSSProperties = { margin: '6px 0 0', fontFamily: 'var(--font-display, serif)', fontStyle: 'italic', fontSize: 22 }
export const searchInput: React.CSSProperties = { padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(42,33,24,0.16)', fontSize: 14, outline: 'none', background: '#fff' }
export const badgeRsvp: React.CSSProperties = { display: 'inline-block', padding: '3px 9px', borderRadius: 999, fontSize: 11, background: 'rgba(45,140,78,0.12)', color: '#2D8C4E', whiteSpace: 'nowrap' }
export const badgeWalkin: React.CSSProperties = { display: 'inline-block', padding: '3px 9px', borderRadius: 999, fontSize: 11, background: 'rgba(232,85,62,0.12)', color: '#E8553E', whiteSpace: 'nowrap' }
export const deleteBtn: React.CSSProperties = { width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(196,63,42,0.25)', background: 'transparent', color: '#C43F2A', cursor: 'pointer', fontSize: 18, lineHeight: 1, display: 'grid', placeItems: 'center' }
export const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(42,33,24,0.45)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 1000 }
export const modal: React.CSSProperties = { width: 'min(440px, 100%)', background: '#F5EFE3', borderRadius: 18, padding: 24, boxShadow: '0 24px 70px rgba(42,33,24,0.3)', maxHeight: '85vh', overflowY: 'auto' }
export const modalHeader: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }
export const modalClose: React.CSSProperties = { width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(42,33,24,0.2)', background: 'transparent', cursor: 'pointer', fontSize: 20, lineHeight: 1 }
export const dialogHint: React.CSSProperties = { margin: 0, fontSize: 13, color: 'rgba(42,33,24,0.6)', lineHeight: 1.5, padding: '8px 0' }
export const resultList: React.CSSProperties = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 260, overflowY: 'auto' }
export const resultRow: React.CSSProperties = { width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(42,33,24,0.1)', background: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2 }
export const resultMeta: React.CSSProperties = { fontSize: 11, color: 'rgba(42,33,24,0.55)' }
export const pickedCard: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 14px', borderRadius: 12, background: '#fff', border: '1px solid rgba(42,33,24,0.1)', marginBottom: 14 }
export const fieldLabel: React.CSSProperties = { display: 'block', fontSize: 12, color: 'rgba(42,33,24,0.7)', margin: '12px 0 6px', letterSpacing: '0.04em' }
export const errorText: React.CSSProperties = { margin: '12px 0 0', fontSize: 13, color: '#C43F2A' }
