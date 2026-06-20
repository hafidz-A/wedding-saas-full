import React, { forwardRef } from "react";

/* Timeline rail — bertindak sebagai filmstrip stack.
   Items dirender semua (tidak di-scroll/virtualisasi); parent translate
   strip ini supaya dot item aktif jatuh di tengah rail viewport.

   Setiap item punya slot height yang konsisten supaya parent bisa
   menghitung translateY dengan akurat. */

const SLOT_MIN_HEIGHT = 160; /* px — cukup untuk year + label + 2 baris desc */

function distanceOpacity(distance) {
  if (distance === 0) return 1;
  if (distance === 1) return 0.5;
  if (distance === 2) return 0.22;
  return 0.1;
}
function distanceScale(distance) {
  if (distance === 0) return 1;
  if (distance === 1) return 0.96;
  return 0.92;
}

const TimelineRail = forwardRef(function TimelineRail(
  { items = [], activeIndex = 0, itemRefs },
  ref
) {
  return (
    <ol
      ref={ref}
      className="timeline timeline--rail"
      style={{ listStyle: "none", margin: 0, padding: 0 }}
    >
      {items.map((it, i) => {
        const isActive = i === activeIndex;
        const distance = Math.abs(i - activeIndex);
        const hasPhotos = !!(it.photo || (Array.isArray(it.photos) && it.photos[0]));
        return (
          <li
            key={`${it.year}-${i}`}
            ref={(el) => {
              if (itemRefs) itemRefs.current[i] = el;
            }}
            data-active={isActive ? "true" : "false"}
            data-distance={distance}
            className="timeline-item"
            style={{
              position: "relative",
              minHeight: SLOT_MIN_HEIGHT,
              paddingTop: "0.4rem",
              paddingBottom: "0.4rem",
              opacity: distanceOpacity(distance),
              transform: `translate3d(0, 0, 0) scale(${distanceScale(distance)})`,
              transformOrigin: "left center",
              transition:
                "opacity 700ms cubic-bezier(0.32, 0.72, 0, 1), transform 700ms cubic-bezier(0.32, 0.72, 0, 1)",
            }}
          >
            <span
              className={`timeline-dot ${isActive ? "timeline-dot--active" : ""}`}
              aria-hidden="true"
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(64px, 88px) 1fr",
                gap: "clamp(0.75rem, 2vw, 1.5rem)",
                alignItems: "baseline",
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--color-accent-text)",
                }}
              >
                {it.year}
              </div>
              <div>
                <h3
                  className="h-3"
                  style={{
                    marginBottom: 4,
                    fontSize: isActive ? "1.4rem" : "1.2rem",
                    transition: "font-size 700ms cubic-bezier(0.32, 0.72, 0, 1)",
                  }}
                >
                  {it.label}
                  {!hasPhotos && (
                    <span
                      className="mono"
                      style={{
                        marginLeft: 10,
                        fontSize: 9,
                        letterSpacing: "0.24em",
                        opacity: 0.4,
                        color: "var(--color-fg-mute)",
                        fontWeight: "normal",
                      }}
                      aria-hidden="true"
                    >
                      · no photo
                    </span>
                  )}
                </h3>
                <p className="p-body" style={{ marginTop: 6 }}>{it.desc}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
});

export default TimelineRail;
