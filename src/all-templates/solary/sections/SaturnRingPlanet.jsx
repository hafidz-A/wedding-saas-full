import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lightbox from "../components/Lightbox.jsx";

/* Saturn Gallery — the cards are NOT HTML. They are billboard
   sprites parented to Saturn inside the three.js scene, so they
   share Saturn's tilt, follow the planet, and are depth-tested
   against the planet mesh (cards behind Saturn are really occluded).

   This component is just three things:
   1. Title (HTML, normal scroll flow)
   2. ScrollTrigger anchor → drives the scene's `setSaturnAssemblyProgress`
      so the sprites assemble/disperse as the user scrolls into/out of
      this section. Scrub keeps it perfectly reversible.
   3. Lightbox + click event listener for `galactic:photoclick`
      dispatched by the scene's raycaster when a sprite is hit. */

gsap.registerPlugin(ScrollTrigger);

export default function SaturnRingPlanet({ sectionLabel, planetName, heading, photos = [] }) {
  const [active, setActive] = useState(null);
  const sectionAnchorRef = useRef(null);

  /* Inject photos + set up ScrollTrigger + listen for clicks. */
  useEffect(() => {
    let trigger = null;
    let cancelled = false;
    let fallbackTimer = null;

    const setup = (retries = 60) => {
      if (cancelled) return;
      const scene = window.galacticScene;
      if (!scene?.setSaturnPhotos || !scene?.setSaturnAssemblyProgress) {
        if (retries > 0) setTimeout(() => setup(retries - 1), 80);
        else console.warn("[saturn] scene API never became available");
        return;
      }
      scene.setSaturnPhotos(photos);

      const section = sectionAnchorRef.current?.closest("[data-section]");
      if (!section) {
        console.warn("[saturn] no [data-section] anchor found");
        return;
      }

      /* ScrollTrigger anchored to the section. start = section top
         enters viewport bottom-ish; end = section top reaches near top.
         scrub: 0.5 gives smooth following of Lenis (synced in main.jsx). */
      trigger = ScrollTrigger.create({
        trigger: section,
        start: "top 80%",
        end: "top 20%",
        scrub: 0.5,
        onUpdate: (self) => {
          window.galacticScene?.setSaturnAssemblyProgress?.(self.progress);
        },
        onRefresh: (self) => {
          console.log("[saturn] ScrollTrigger refresh, progress:", self.progress.toFixed(3));
          window.galacticScene?.setSaturnAssemblyProgress?.(self.progress);
        },
      });

      /* Force ScrollTrigger to recompute now that scene + DOM are ready. */
      setTimeout(() => {
        try {
          ScrollTrigger.refresh();
          console.log("[saturn] post-refresh progress:", trigger?.progress?.toFixed(3));
        } catch (e) { console.error("[saturn] refresh failed:", e); }
      }, 50);

      /* Safety fallback: if 2 seconds pass and progress is still 0
         AND the section is in view, force-assemble (guards against
         a quiet ScrollTrigger that never fires). */
      fallbackTimer = setTimeout(() => {
        if (cancelled) return;
        const p = trigger?.progress ?? 0;
        const rect = section.getBoundingClientRect();
        const inView = rect.top < window.innerHeight && rect.bottom > 0;
        if (p < 0.01 && inView) {
          console.warn("[saturn] ScrollTrigger inactive — force-assembling");
          window.galacticScene?.setSaturnAssemblyProgress?.(1);
        }
      }, 2000);
    };

    const onPhotoClick = (e) => setActive(e.detail);
    window.addEventListener("galactic:photoclick", onPhotoClick);

    setup();

    return () => {
      cancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      window.removeEventListener("galactic:photoclick", onPhotoClick);
      try { trigger?.kill(); } catch {}
      try { window.galacticScene?.setSaturnPhotos?.([]); } catch {}
      try { window.galacticScene?.setSaturnAssemblyProgress?.(0); } catch {}
    };
  }, [photos]);

  return (
    <div className="section-stage saturn-section-stage" ref={sectionAnchorRef}>
      <div style={{ width: "100%", textAlign: "center" }}>
        <p className="eyebrow">
          {sectionLabel} Planet
          <span style={{ opacity: 0.5, padding: "0 6px" }}>·</span>
          <strong style={{ color: "var(--color-fg)", fontWeight: 500, letterSpacing: "0.18em" }}>{planetName}</strong>
        </p>
        <h2 className="h-2" style={{ marginTop: 8 }}>{heading}</h2>
        <p className="mono faint" style={{ marginTop: 18, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase" }}>
          {photos.length} memories orbiting Saturn · tap any to enlarge
        </p>
      </div>

      {/* Cards live in the three.js scene, not here. */}

      {active && <Lightbox src={active.src} caption={active.caption} onClose={() => setActive(null)} />}
    </div>
  );
}
