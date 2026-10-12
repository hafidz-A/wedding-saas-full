'use client'

/* ============================================================================
   Songket ornament set — hand-drawn inline SVG placeholders.

   Every shape paints with `currentColor` (and `var(--sk-bg)` for cut-outs), so
   the active palette recolours the whole set with no extra assets. These are
   deliberately stylised stand-ins until an illustrator delivers final art (see
   docs/superpowers/specs/2026-10-12-template-adat-palembang-design.md §3, §7):
   swap a component's markup and every section picks up the new drawing.

   Cultural references (verify with a Palembang adat source before final art):
   - UkiranCorner   → ukiran Palembang, sulur "simbar" (fern curl)
   - NampanPerak    → songket medallion motif "nampan perak"
   - BintangBerantai→ songket motif "bintang berantai" (linked stars)
   - LawangDoor     → carved door of a Rumah Limas
   - RumahLimas     → stilt house, tiered floors (kekijing), limas roof + simbar
   - AmperaNight    → Jembatan Ampera over the Musi at night
   - CoupleAesanGede→ bride in Karsuhun crown + groom in kopiah cuplak, both
                      with the "teratai" collar of Aesan Gede
   - TepakSirih / Tenong / PayungPengantin → ceremony objects
   ============================================================================ */
import React from 'react'

const svgProps = (className, label) => ({
  className,
  xmlns: 'http://www.w3.org/2000/svg',
  ...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: 'false' }),
})

/** Corner carving, drawn for the TOP-LEFT corner; mirror it with CSS for the rest. */
export function UkiranCorner({ className }) {
  return (
    <svg {...svgProps(className)} viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeLinecap="round">
      <path d="M4 4H112M4 4V112" strokeWidth="1.6" />
      <path d="M11 11H92M11 11V92" strokeWidth="0.8" />
      <path d="M15 15C42 15 60 27 63 45C65 58 55 66 47 60C41 55 45 47 51 50" strokeWidth="1.6" />
      <path d="M15 15C15 42 27 60 45 63C58 65 66 55 60 47C55 41 47 45 50 51" strokeWidth="1.6" />
      <path d="M15 15C27 25 33 33 36 41" strokeWidth="1.2" />
      <path d="M36 41c-2 6 2 10 6 8" strokeWidth="1.1" />
      <g fill="currentColor" stroke="none">
        <path d="M70 11c6-6 14-6 20 0c-6 6-14 6-20 0Z" />
        <path d="M11 70c-6 6-6 14 0 20c6-6 6-14 0-20Z" />
        <circle cx="98" cy="11" r="2.4" />
        <circle cx="11" cy="98" r="2.4" />
        <circle cx="28" cy="28" r="2.2" />
      </g>
    </svg>
  )
}

/** Linked-star divider (bintang berantai). */
export function BintangBerantai({ className }) {
  const small = [30, 60, 90, 210, 240, 270]
  return (
    <svg {...svgProps(className)} viewBox="0 0 300 28" fill="currentColor">
      <path d="M8 14H128M172 14H292" stroke="currentColor" strokeWidth="1" />
      {small.map((x) => (
        <path key={x} d={`M${x} 8 L${x + 2} 12 L${x + 6} 14 L${x + 2} 16 L${x} 20 L${x - 2} 16 L${x - 6} 14 L${x - 2} 12Z`} />
      ))}
      <path d="M150 1 L154 10 L163 14 L154 18 L150 27 L146 18 L137 14 L146 10Z" />
      <path d="M150 6 L157 7 L156 14 L157 21 L150 22 L143 21 L144 14 L143 7Z" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

/** Medallion frame (nampan perak). Children render clipped inside the disc. */
export function NampanPerak({ className, children }) {
  const scallops = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2
    return [110 + Math.cos(a) * 101, 110 + Math.sin(a) * 101]
  })
  const petals = Array.from({ length: 14 }, (_, i) => (i / 14) * 360)
  return (
    <div className={className} style={{ position: 'relative', aspectRatio: '1 / 1' }}>
      <div
        style={{
          position: 'absolute', inset: '15%', borderRadius: 'var(--radius-round)', overflow: 'hidden',
          display: 'grid', placeItems: 'center',
        }}
      >
        {children}
      </div>
      <svg {...svgProps(undefined)} viewBox="0 0 220 220" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <g fill="currentColor">
          {scallops.map(([x, y], i) => <circle key={i} cx={x.toFixed(2)} cy={y.toFixed(2)} r="4.2" />)}
        </g>
        <circle cx="110" cy="110" r="96" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="110" cy="110" r="84" fill="none" stroke="currentColor" strokeWidth="1" />
        <g fill="currentColor">
          {petals.map((deg) => (
            <path key={deg} transform={`rotate(${deg} 110 110)`} d="M110 13c3 4 3 8 0 11c-3-3-3-7 0-11Z" />
          ))}
        </g>
      </svg>
    </div>
  )
}

/** One leaf of the carved Rumah Limas door. The right leaf is this, mirrored. */
export function LawangDoor({ className }) {
  return (
    <svg {...svgProps(className)} viewBox="0 0 200 400" preserveAspectRatio="none">
      <rect x="0" y="0" width="200" height="400" fill="var(--sk-door, #4A0C17)" />
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <rect x="10" y="10" width="180" height="380" strokeWidth="3" />
        <rect x="22" y="22" width="156" height="356" strokeWidth="1.2" />
        {/* arched top panel with a lotus (teratai) */}
        <path d="M36 150V86C36 52 66 36 100 36C134 36 164 52 164 86V150Z" strokeWidth="1.6" />
        <path d="M100 128c-14-10-14-30 0-44c14 14 14 34 0 44Z" strokeWidth="1.4" />
        <path d="M100 128c-24-2-34-18-30-34c16 2 26 14 30 34Z" strokeWidth="1.2" />
        <path d="M100 128c24-2 34-18 30-34c-16 2-26 14-30 34Z" strokeWidth="1.2" />
        <path d="M60 136H140" strokeWidth="1" />
        {/* middle diamond panel */}
        <rect x="36" y="166" width="128" height="96" strokeWidth="1.6" />
        <path d="M100 176 150 214 100 252 50 214Z" strokeWidth="1.2" />
        <path d="M100 194 124 214 100 234 76 214Z" strokeWidth="1" />
        {/* lower panel with simbar curls */}
        <rect x="36" y="278" width="128" height="88" strokeWidth="1.6" />
        <path d="M48 354C48 316 74 298 100 300C126 298 152 316 152 354" strokeWidth="1.2" />
        <path d="M70 352c0-16 10-24 20-22c8 2 8 12 0 13" strokeWidth="1.1" />
        <path d="M130 352c0-16-10-24-20-22c-8 2-8 12 0 13" strokeWidth="1.1" />
      </g>
      <g fill="currentColor">
        <circle cx="100" cy="214" r="4" />
        <circle cx="178" cy="214" r="6" />
        <circle cx="36" cy="166" r="2.5" /><circle cx="164" cy="166" r="2.5" />
        <circle cx="36" cy="262" r="2.5" /><circle cx="164" cy="262" r="2.5" />
      </g>
    </svg>
  )
}

/** Rumah Limas silhouette on stilts. */
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

/** Jembatan Ampera over the Musi, night. */
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

/** Small river boat (perahu) — floats across the footer scene. */
export function Perahu({ className }) {
  return (
    <svg {...svgProps(className)} viewBox="0 0 80 30" fill="currentColor">
      <path d="M2 18 L78 18 L68 28 L12 28Z" />
      <path d="M26 18 L34 6 L50 6 L56 18Z" opacity="0.8" />
      <rect x="39" y="0" width="2" height="8" />
    </svg>
  )
}

/**
 * Couple in Aesan Gede — stylised silhouette (placeholder for the illustrated
 * pair). `who` = 'both' | 'bride' | 'groom'.
 */
export function CoupleAesanGede({ className, who = 'both' }) {
  const kembangGoyang = Array.from({ length: 9 }, (_, i) => {
    const a = Math.PI + (i / 8) * Math.PI
    return [75 + Math.cos(a) * 34, 66 + Math.sin(a) * 34]
  })
  const bride = (
    <g key="bride">
      {/* Karsuhun crown + kembang goyang on wire stems */}
      <g stroke="currentColor" strokeWidth="1.1">
        {kembangGoyang.map(([x, y], i) => <path key={i} d={`M75 64L${x.toFixed(1)} ${y.toFixed(1)}`} />)}
      </g>
      {kembangGoyang.map(([x, y], i) => <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3.2" />)}
      <path d="M56 68 L58 46 L65 56 L69 36 L75 52 L81 36 L85 56 L92 46 L94 68Z" />
      <circle cx="75" cy="80" r="12" />
      <rect x="71" y="88" width="8" height="10" />
      {/* teratai collar */}
      <path d="M43 104 Q75 92 107 104 Q100 124 75 128 Q50 124 43 104Z" />
      <g fill="var(--sk-bg)" opacity="0.55">
        <circle cx="57" cy="116" r="2" /><circle cx="66" cy="121" r="2" /><circle cx="75" cy="123" r="2" />
        <circle cx="84" cy="121" r="2" /><circle cx="93" cy="116" r="2" />
      </g>
      {/* bodice + arms */}
      <path d="M53 110 L97 110 L93 172 L57 172Z" />
      <path d="M47 108 Q36 146 46 184 L55 182 Q50 150 57 116Z" />
      <path d="M103 108 Q114 146 104 184 L95 182 Q100 150 93 116Z" />
      {/* songket skirt with woven bands */}
      <path d="M56 170 L94 170 L108 288 L42 288Z" />
      <g stroke="var(--sk-bg)" strokeWidth="1.4" opacity="0.5">
        <path d="M54 196H96M52 214H98M49 240H101M46 264H104" />
      </g>
    </g>
  )
  const groom = (
    <g key="groom">
      {/* kopiah cuplak (tall gold cap) with front ornament */}
      <path d="M151 72 L151 50 Q165 38 179 50 L179 72Z" />
      <path d="M165 26 L171 48 L159 48Z" />
      <circle cx="165" cy="24" r="3" />
      <rect x="149" y="66" width="32" height="5" fill="var(--sk-bg)" opacity="0.4" />
      <circle cx="165" cy="82" r="12" />
      <rect x="161" y="90" width="8" height="10" />
      <path d="M131 106 Q165 94 199 106 Q192 126 165 130 Q138 126 131 106Z" />
      <g fill="var(--sk-bg)" opacity="0.55">
        <circle cx="146" cy="118" r="2" /><circle cx="155" cy="123" r="2" /><circle cx="165" cy="125" r="2" />
        <circle cx="175" cy="123" r="2" /><circle cx="184" cy="118" r="2" />
      </g>
      <path d="M140 112 L190 112 L187 182 L143 182Z" />
      <path d="M135 110 Q126 148 136 188 L145 186 Q140 150 146 118Z" />
      <path d="M195 110 Q204 148 194 188 L185 186 Q190 150 184 118Z" />
      {/* pending (belt buckle) + keris */}
      <rect x="143" y="168" width="44" height="6" fill="var(--sk-bg)" opacity="0.45" />
      <ellipse cx="165" cy="171" rx="7" ry="5" />
      <path d="M182 150 L198 138 L200 141 L185 154Z" />
      {/* trousers under a knee-length songket sarong */}
      <path d="M145 182 L185 182 L190 288 L140 288Z" />
      <path d="M141 180 L189 180 L194 238 L136 238Z" />
      <g stroke="var(--sk-bg)" strokeWidth="1.4" opacity="0.5">
        <path d="M140 204H190M138 222H192M165 238V288" />
      </g>
    </g>
  )
  const viewBox = who === 'bride' ? '30 0 90 300' : who === 'groom' ? '120 0 90 300' : '20 0 200 300'
  const label = who === 'bride' ? 'Siluet mempelai wanita berbusana Aesan Gede'
    : who === 'groom' ? 'Siluet mempelai pria berbusana Aesan Gede'
      : 'Siluet pasangan pengantin berbusana Aesan Gede'
  return (
    <svg {...svgProps(className, label)} viewBox={viewBox} fill="currentColor">
      {who !== 'groom' && bride}
      {who !== 'bride' && groom}
    </svg>
  )
}

/** Tepak sirih — the betel box offered to honoured guests. */
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

/** Tenong — round lacquered box. `open` lifts the lid. */
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

/** Payung pengantin — ceremonial umbrella of the procession. */
export function PayungPengantin({ className }) {
  const fringe = Array.from({ length: 11 }, (_, i) => 14 + i * 9.2)
  return (
    <svg {...svgProps(className)} viewBox="0 0 120 150" fill="currentColor">
      <circle cx="60" cy="8" r="4" />
      <path d="M10 52 Q60 -6 110 52Z" />
      {fringe.map((x) => <path key={x} d={`M${x - 4} 52 L${x + 4} 52 L${x} 62Z`} />)}
      <rect x="58" y="52" width="4" height="92" />
      <path d="M58 144c0 6 10 6 10 0" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  )
}

/** Five-petal jasmine (melati) — used by the falling-petals ornament. */
export function Melati({ className }) {
  return (
    <svg {...svgProps(className)} viewBox="0 0 24 24" fill="currentColor">
      {[0, 72, 144, 216, 288].map((d) => (
        <ellipse key={d} cx="12" cy="6.5" rx="3.2" ry="5.2" transform={`rotate(${d} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="2.4" fill="var(--sk-gold, #D4AF37)" />
    </svg>
  )
}
