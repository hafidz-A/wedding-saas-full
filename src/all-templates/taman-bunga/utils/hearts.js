/* A playful press: the control springs back and a few small hearts float up
   from it. Web Animations only (no stylesheet), drawn in a fixed layer on
   <body> so React never sees the extra nodes. Off for reduced motion. */

const HEART =
  '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.4 5c2 0 3.5 1.1 4.3 2.6h2.6C14.1 6.1 15.6 5 17.6 5 21 5 23.1 8.4 21.6 11.8 19.5 16.4 12 21 12 21z"/></svg>'

let layer = null

export function popHearts(el, count = 7) {
  if (!el || typeof window === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  el.animate?.(
    [{ transform: 'scale(0.9)' }, { transform: 'scale(1.08) rotate(1.5deg)', offset: 0.55 }, { transform: 'none' }],
    { duration: 550, easing: 'cubic-bezier(0.34, 1.8, 0.64, 1)' },
  )
  if (!layer || !layer.isConnected) {
    layer = document.createElement('div')
    layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:60;overflow:hidden'
    document.body.appendChild(layer)
  }
  const r = el.getBoundingClientRect()
  const color = getComputedStyle(el).getPropertyValue('--tb-blush').trim() || '#f6c4c4'
  for (let i = 0; i < count; i++) {
    const h = document.createElement('span')
    h.innerHTML = HEART
    h.style.cssText = `position:absolute;left:${r.left + r.width / 2 - 7}px;top:${r.top + r.height / 2 - 7}px;color:${color};width:14px;height:14px`
    layer.appendChild(h)
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2
    const d = 34 + Math.random() * 34
    const anim = h.animate(
      [
        { transform: 'scale(0.4)', opacity: 1 },
        { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) scale(1) rotate(${(Math.random() - 0.5) * 60}deg)`, opacity: 0 },
      ],
      { duration: 900, easing: 'ease-out' },
    )
    anim.onfinish = () => h.remove()
  }
}
