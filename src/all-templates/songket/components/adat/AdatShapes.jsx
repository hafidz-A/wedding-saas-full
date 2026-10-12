'use client'

/* ============================================================================
   Songket adat illustrations — hand-drawn inline SVG placeholders.

   Every shape paints with `currentColor` (and `var(--sk-bg)` for cut-outs), so
   the active palette recolours the whole set with no extra assets. These are
   deliberately stylised stand-ins until an illustrator delivers final art (see
   docs/superpowers/specs/2026-10-12-template-adat-palembang-design.md §3, §7):
   swap a component's markup and every section picks up the new drawing.

   Cultural references (verify with a Palembang adat source before final art):
   - RumahLimas  → stilt house, tiered floors (kekijing), limas roof + simbar (hero)
   - AmperaNight → Jembatan Ampera over the Musi at night (footer), + Perahu
   - TepakSirih  → betel box offered to honoured guests (verse section)
   - Tenong      → lacquered seserahan box (gift section)
   Cut-outs paint with var(--sk-bg); each consumer sets it to its surface colour.
   The Aesan Gede couple silhouettes live as standalone demo portraits in
   public/songket/demo/*.svg.
   ============================================================================ */
import React from 'react'

const svgProps = (className, label) => ({
  className,
  xmlns: 'http://www.w3.org/2000/svg',
  ...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: 'false' }),
})

export function RumahLimas({ className }) {
  const posts = [64, 96, 128, 160, 192, 224, 256, 288, 320, 336]
  const planks = Array.from({ length: 23 }, (_, i) => 88 + i * 10)
  return (
    <svg {...svgProps(className, 'Rumah Limas')} viewBox="0 0 400 230" fill="currentColor">
      {/* roof: limas (hip) + ridge with simbar horns */}
      <path d="M48 104 L352 104 L292 44 L108 44Z" />
      <path d="M118 46 L282 46 L262 24 L138 24Z" />
      <path d="M134 24c-6-10-2-18 6-20c-2 6 0 12 4 16Z" />
      <path d="M266 24c6-10 2-18-6-20c2 6 0 12-4 16Z" />
      <path d="M196 24c-3-9 0-15 4-17c4 2 7 8 4 17Z" />
      <path d="M48 104 L352 104 L356 110 L44 110Z" opacity="0.85" />
      {/* tiered floors (kekijing) */}
      <rect x="80" y="110" width="240" height="56" opacity="0.92" />
      <rect x="70" y="164" width="260" height="8" />
      <rect x="58" y="172" width="284" height="6" opacity="0.8" />
      <g stroke="var(--sk-bg)" strokeWidth="1" opacity="0.35">
        {planks.map((x) => <path key={x} d={`M${x} 114V162`} />)}
      </g>
      {/* doors + windows cut out */}
      <g fill="var(--sk-bg)" opacity="0.75">
        <path d="M184 166V132c0-8 7-14 16-14s16 6 16 14v34Z" />
        <rect x="104" y="124" width="26" height="28" rx="2" />
        <rect x="140" y="124" width="26" height="28" rx="2" />
        <rect x="234" y="124" width="26" height="28" rx="2" />
        <rect x="270" y="124" width="26" height="28" rx="2" />
      </g>
      {/* stilts */}
      {posts.map((x) => <rect key={x} x={x} y="178" width="6" height="40" opacity="0.85" />)}
      {/* twin front stairs */}
      <path d="M150 178 L172 178 L150 218 L128 218Z" opacity="0.9" />
      <path d="M250 178 L228 178 L250 218 L272 218Z" opacity="0.9" />
      <rect x="20" y="218" width="360" height="4" opacity="0.6" />
    </svg>
  )
}

export function AmperaNight({ className }) {
  const cablesL = [80, 120, 160, 240, 280, 320]
  const cablesR = cablesL.map((x) => 600 - x)
  return (
    <svg {...svgProps(className, 'Jembatan Ampera di Sungai Musi')} viewBox="0 0 600 240" fill="currentColor">
      <circle cx="500" cy="42" r="16" opacity="0.9" />
      <circle cx="507" cy="37" r="14" fill="var(--sk-bg)" />
      {/* towers */}
      {[200, 400].map((cx) => (
        <g key={cx}>
          <rect x={cx - 22} y="38" width="12" height="118" />
          <rect x={cx + 10} y="38" width="12" height="118" />
          <path d={`M${cx - 26} 40 L${cx + 26} 40 L${cx + 20} 26 L${cx - 20} 26Z`} />
          <rect x={cx - 22} y="70" width="44" height="6" />
          <rect x={cx - 22} y="104" width="44" height="6" />
        </g>
      ))}
      {/* lift span between the towers */}
      <rect x="222" y="44" width="156" height="8" />
      <rect x="222" y="60" width="156" height="3" opacity="0.7" />
      {/* cables */}
      <g stroke="currentColor" strokeWidth="1.4" fill="none" opacity="0.8">
        {cablesL.map((x) => <path key={`l${x}`} d={`M${x < 200 ? 180 : 220} 42 L${x} 148`} />)}
        {cablesR.map((x) => <path key={`r${x}`} d={`M${x > 400 ? 420 : 380} 42 L${x} 148`} />)}
      </g>
      {/* deck + piers */}
      <rect x="0" y="148" width="600" height="10" />
      {[180, 220, 380, 420].map((x) => <rect key={x} x={x - 6} y="158" width="12" height="30" opacity="0.85" />)}
      {/* river */}
      <g fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.55">
        <path d="M0 196c25-6 50 6 75 0s50 6 75 0 50 6 75 0 50 6 75 0 50 6 75 0 50 6 75 0 50 6 75 0 50 6 75 0" />
        <path d="M20 214c25-6 50 6 75 0s50 6 75 0 50 6 75 0 50 6 75 0 50 6 75 0 50 6 75 0 50 6 75 0" opacity="0.6" />
      </g>
    </svg>
  )
}

export function Perahu({ className }) {
  return (
    <svg {...svgProps(className)} viewBox="0 0 80 30" fill="currentColor">
      <path d="M2 18 L78 18 L68 28 L12 28Z" />
      <path d="M26 18 L34 6 L50 6 L56 18Z" opacity="0.8" />
      <rect x="39" y="0" width="2" height="8" />
    </svg>
  )
}

export function TepakSirih({ className }) {
  return (
    <svg {...svgProps(className)} viewBox="0 0 160 110" fill="currentColor">
      <path d="M50 30c0-10 8-14 12-14s12 4 12 14Z" />
      <path d="M86 30c0-10 8-14 12-14s12 4 12 14Z" opacity="0.85" />
      <rect x="62" y="8" width="2" height="8" /><rect x="96" y="8" width="2" height="8" />
      <path d="M24 32 L136 32 L130 44 L30 44Z" />
      <path d="M30 44 L130 44 L124 92 L36 92Z" />
      <g fill="none" stroke="var(--sk-bg)" strokeWidth="1.2" opacity="0.55">
        <rect x="46" y="54" width="68" height="28" />
        <path d="M80 54V82M46 68H114" />
      </g>
      <path d="M36 92 L44 92 L42 104 L34 104Z" /><path d="M124 92 L116 92 L118 104 L126 104Z" />
    </svg>
  )
}

export function Tenong({ className, open = false }) {
  return (
    <svg {...svgProps(className)} viewBox="0 0 160 190" fill="currentColor">
      <g
        style={{
          transform: open ? 'translateY(-34px) rotate(-8deg)' : 'none',
          transformOrigin: '80px 70px',
          transition: 'transform 900ms cubic-bezier(.2,.8,.2,1)',
        }}
      >
        <circle cx="80" cy="22" r="7" />
        <path d="M30 70 Q80 18 130 70Z" />
        <ellipse cx="80" cy="70" rx="52" ry="10" />
      </g>
      <path d="M28 82 L132 82 L132 112 L28 112Z" />
      <ellipse cx="80" cy="112" rx="52" ry="10" />
      <path d="M32 120 L128 120 L128 148 L32 148Z" opacity="0.9" />
      <ellipse cx="80" cy="148" rx="48" ry="9" opacity="0.9" />
      <path d="M38 156 L122 156 L118 176 L42 176Z" opacity="0.8" />
      <g fill="none" stroke="var(--sk-bg)" strokeWidth="1.2" opacity="0.55">
        <path d="M36 96H124M40 134H120" />
        <path d="M60 86l6 8-6 8M100 86l-6 8 6 8" />
      </g>
    </svg>
  )
}
