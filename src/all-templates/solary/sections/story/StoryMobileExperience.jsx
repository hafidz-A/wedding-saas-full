import React from "react";
import PolaroidCluster from "./PolaroidCluster.jsx";

/* Mobile Experience — snap carousel.
   Setiap item timeline = satu slide setinggi 100dvh.
   Item dengan foto: cluster di atas, teks di bawah.
   Item tanpa foto: typographic hero (year sangat besar). */

export default function StoryMobileExperience({
  sectionLabel,
  planetName,
  heading,
  items = [],
}) {
  return (
    <div
      className="story-mobile"
      style={{
        position: "relative",
        width: "100%",
        scrollSnapType: "y mandatory",
        scrollBehavior: "smooth",
      }}
    >
      {/* Header lead slide */}
      <div
        className="story-mobile__slide story-mobile__slide--header"
        style={{
          height: "100dvh",
          scrollSnapAlign: "start",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1.25rem",
        }}
      >
        <div className="glass-card" style={{ textAlign: "center" }}>
          <div className="glass-card__title">
            {sectionLabel} Planet{" "}
            <span style={{ opacity: 0.55, padding: "0 8px" }}>·</span>{" "}
            <strong>{planetName}</strong>
          </div>
          <h2 className="h-2" style={{ margin: 0 }}>{heading}</h2>
          <p
            className="mono"
            style={{
              marginTop: "1rem",
              fontSize: 10,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--color-fg-mute)",
              opacity: 0.6,
            }}
            aria-hidden="true"
          >
            Scroll · {items.length} chapters ahead
          </p>
        </div>
      </div>

      {items.map((it, i) => {
        const hasPhotos = Array.isArray(it.photos) && it.photos.length > 0;
        const number = String(i + 1).padStart(2, "0");
        const total = String(items.length).padStart(2, "0");
        return (
          <article
            key={`${it.year}-${i}`}
            className="story-mobile__slide"
            style={{
              position: "relative",
              height: "100dvh",
              scrollSnapAlign: "start",
              display: "flex",
              flexDirection: "column",
              justifyContent: hasPhotos ? "flex-start" : "center",
              alignItems: "center",
              padding: "clamp(2rem, 5vh, 3rem) 1.25rem",
              gap: "clamp(1rem, 3vh, 1.75rem)",
            }}
            data-has-photo={hasPhotos ? "true" : "false"}
          >
            {/* Chapter indicator */}
            <div
              className="mono"
              style={{
                position: "absolute",
                top: "1.25rem",
                left: "1.25rem",
                fontSize: 10,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "var(--color-fg-mute)",
                opacity: 0.55,
              }}
              aria-hidden="true"
            >
              {number} / {total}
            </div>

            {hasPhotos ? (
              <>
                <div
                  style={{
                    flex: "1 1 auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    minHeight: 0,
                  }}
                >
                  <PolaroidCluster photos={it.photos} size="sm" />
                </div>
                <div
                  style={{
                    flex: "0 0 auto",
                    textAlign: "center",
                    maxWidth: 480,
                    paddingTop: "0.5rem",
                  }}
                >
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.28em",
                      textTransform: "uppercase",
                      color: "var(--color-accent)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {it.year}
                  </div>
                  <h3 className="h-3" style={{ margin: 0, marginBottom: "0.5rem" }}>
                    {it.label}
                  </h3>
                  <p className="p-body" style={{ margin: 0 }}>{it.desc}</p>
                </div>
              </>
            ) : (
              /* Typographic hero — year sangat besar, label & desc di bawah */
              <div style={{ textAlign: "center", maxWidth: 480 }}>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(5rem, 26vw, 9rem)",
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                    color: "var(--color-fg)",
                    opacity: 0.94,
                    textShadow: "0 4px 40px rgba(var(--color-glow)/0.25)",
                    marginBottom: "1.25rem",
                  }}
                >
                  {it.year}
                </div>
                <h3
                  className="h-3"
                  style={{
                    margin: 0,
                    marginBottom: "0.75rem",
                    color: "var(--color-accent)",
                  }}
                >
                  {it.label}
                </h3>
                <p className="p-body" style={{ margin: 0, opacity: 0.85 }}>{it.desc}</p>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
