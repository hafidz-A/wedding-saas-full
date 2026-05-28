import React, { useEffect, useRef, useState } from "react";

/* Konektor "pipa cahaya" — SVG path absolut yang menghubungkan
   dot timeline aktif (kiri) ke pusat cluster polaroid (kanan).

   Props:
   - fromPoint: {x, y} koordinat dot aktif (relatif container parent)
   - toPoint:   {x, y} koordinat pusat cluster (relatif container parent)
   - visible:   bool — kalau false (item tanpa foto aktif), fade out

   Animation: stroke-dasharray dianimasi dari 0 → full length saat
   path muncul / index berubah, ease cubic-bezier(0.32, 0.72, 0, 1). */

const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

export default function ConnectorPipe({ fromPoint, toPoint, visible = true }) {
  const pathRef = useRef(null);
  const [pathLen, setPathLen] = useState(0);

  /* Hitung panjang path setiap kali endpoint berubah, lalu replay
     stroke-dasharray animation supaya konektor terasa "menyala ulang". */
  useEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    const len = p.getTotalLength();
    setPathLen(len);
    p.style.transition = "none";
    p.style.strokeDasharray = `${len} ${len}`;
    p.style.strokeDashoffset = `${len}`;
    /* Force reflow → enable transition → animate to 0. */
    // eslint-disable-next-line no-unused-expressions
    p.getBoundingClientRect();
    p.style.transition = `stroke-dashoffset 700ms ${EASE}, opacity 300ms ease-out`;
    p.style.strokeDashoffset = "0";
  }, [fromPoint?.x, fromPoint?.y, toPoint?.x, toPoint?.y]);

  if (!fromPoint || !toPoint) return null;

  /* Bezier control points untuk lengkungan halus. Curve keluar sedikit
     ke kanan dari dot, lalu masuk ke cluster. */
  const dx = toPoint.x - fromPoint.x;
  const c1x = fromPoint.x + dx * 0.55;
  const c1y = fromPoint.y;
  const c2x = fromPoint.x + dx * 0.45;
  const c2y = toPoint.y;
  const d = `M ${fromPoint.x} ${fromPoint.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${toPoint.x} ${toPoint.y}`;

  return (
    <svg
      className="connector-pipe"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: `opacity 300ms ease-out`,
        zIndex: 1,
      }}
      aria-hidden="true"
    >
      <defs>
        <filter id="pipe-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        ref={pathRef}
        d={d}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1"
        strokeLinecap="round"
        filter="url(#pipe-glow)"
        style={{
          strokeDasharray: pathLen ? `${pathLen} ${pathLen}` : undefined,
          strokeDashoffset: pathLen,
        }}
      />
    </svg>
  );
}
