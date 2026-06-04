import React from "react";
import { sectionRegistry } from "../config/sectionRegistry.js";
import SectionPhotoStars from "../components/SectionPhotoStars.jsx";

/* Section types that already show their own photos — these do NOT get the
   floating gate photo-stars. Every other type (including the optional sections
   a user can enable from the editor: quote, schedule, liveStream, faq) gets
   the stars by default. Because the rule is "exclude by type", a section that
   is currently hidden still classifies correctly the moment it is enabled. */
const PHOTO_BACKED_TYPES = new Set([
  "openingGate",   // has its own gate photo-stars (the source of these photos)
  "welcomePlanet", // portrait(s)
  "storyPlanet",   // timeline photos
  "saturnRing",    // gallery ring
]);

/* Props-based renderer. Each section is rendered as
       <section id={id} data-section={id}>
         <Component {...section.props} slug={meta.slug} />
       </section>
   Hidden sections (`enabled === false`) render nothing.
   Unknown types log a warning and render a tiny placeholder. */
export default function SectionRenderer({ section, slug = "demo", gatePhotos = [] }) {
  if (!section || section.enabled === false) return null;
  const Component = sectionRegistry[section.type];
  if (!Component) {
    console.warn(`[engine] No section component for type="${section.type}" (id=${section.id})`);
    return (
      <section id={section.id} data-section={section.id} style={{ minHeight: "60vh", opacity: 0.5, display: "grid", placeItems: "center" }}>
        <p className="mono faint">⟁ unregistered section type: "{section.type}"</p>
      </section>
    );
  }

  const showPhotoStars = !PHOTO_BACKED_TYPES.has(section.type) && gatePhotos.length > 0;
  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  return (
    <section
      id={section.id}
      data-section={section.id}
      data-section-type={section.type}
      style={{ position: "relative", minHeight: "100vh" }}
    >
      {showPhotoStars && <SectionPhotoStars photos={gatePhotos} reducedMotion={reducedMotion} />}
      <div style={{ position: "relative", zIndex: 1 }}>
        <Component {...(section.props || {})} slug={slug} />
      </div>
    </section>
  );
}
