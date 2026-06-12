import React, { useState, useEffect, useRef, useMemo } from "react";

/* Decoupled timings: page scroll is short so the LAYOUT lands quickly
   (no sluggish feel reading content), while the 3D camera takes a
   longer, slower arc through space for the cinematic transit. */
const PAGE_SCROLL_DURATION = 1.4;        // Lenis page scroll
const CAMERA_ADJACENT_DURATION = 2.6;    // arrow / adjacent menu camera arc
const CAMERA_DISTANT_DURATION  = 3.2;    // distant menu camera arc

/* Cubic ease-in-out: gentle start, peak in middle, gentle landing.
   Lenis sees this for the page; GSAP uses "power3.inOut" for camera
   (same shape, different lib syntax). */
const EASE_IN_OUT_CUBIC = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function lenisScrollTo(target, duration, onComplete) {
  const lenis = window.__lenis;
  const el = typeof target === "string" ? document.getElementById(target) : target;
  if (!el) return;
  // Center the section in the viewport instead of pinning its top there.
  // Sections taller than 100vh (Saturn at 130vh, content-heavy stages) would
  // otherwise land with the GlassCard below the 3D camera's framed planet.
  const offset = Math.max(0, (el.offsetHeight - window.innerHeight) / 2);
  if (lenis?.scrollTo) {
    lenis.scrollTo(el, { duration, easing: EASE_IN_OUT_CUBIC, offset, onComplete });
  } else {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (onComplete) setTimeout(onComplete, duration * 1000);
  }
}

export default function FloatingNavbar({ logo = "Galactic", allSections = [] }) {
  const [activeId, setActiveId] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  /* Links = navigable sections (filter out hidden ones like #intro). */
  const links = useMemo(
    () => allSections.filter((s) => !s.navHidden).map((s) => ({
      label: s.navLabel, to: s.id, planetKey: s.planetKey, planetName: s.planetName,
    })),
    [allSections]
  );

  useEffect(() => {
    const onScroll = () => {
      setRevealed(window.scrollY > window.innerHeight * 0.6);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    /* Primary signal: the rhythm's `solary:section` event. The old
       IntersectionObserver-only tracking used ratio thresholds (0.25+)
       that tall sections (Story = N×100vh, max ratio ~1/N) can NEVER
       reach, so the active item silently stuck on a previous section
       and the prev/next arrows navigated from the wrong index. */
    let gotSignal = false;
    const onSection = (e) => {
      gotSignal = true;
      if (e.detail?.id) setActiveId(e.detail.id);
    };
    window.addEventListener("solary:section", onSection);
    if (typeof window !== "undefined" && window.__activeSolarySectionId != null) {
      gotSignal = true;
      setActiveId(window.__activeSolarySectionId);
    }

    /* Fallback for when the scene/rhythm isn't running (reduced setups). */
    const sections = allSections.map((s) => document.getElementById(s.id)).filter(Boolean);
    const io = sections.length
      ? new IntersectionObserver(
          (entries) => {
            if (gotSignal) return;
            const visible = entries.filter((e) => e.isIntersecting)
              .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
            if (visible) setActiveId(visible.target.id);
          },
          { threshold: [0.25, 0.5, 0.75] }
        )
      : null;
    sections.forEach((s) => io.observe(s));
    return () => {
      window.removeEventListener("solary:section", onSection);
      io?.disconnect();
    };
  }, [allSections]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  /* Find current section index in allSections (full order including
     hidden ones). Falls back to 0 if nothing matches. */
  const currentIdx = () => {
    const idx = allSections.findIndex((s) => s.id === activeId);
    return idx >= 0 ? idx : 0;
  };

  /* Programmatic jump shared by arrow + menu. Page scroll runs fast
     via Lenis (~1.4s); camera takes a slower, GSAP-driven cinematic
     arc to the destination planet in parallel. Both finish at their
     own pace and the user sees content land quickly while the 3D
     transit continues to play out behind it. */
  const programmaticJump = (toIdx, cameraDuration) => {
    const fromIdx = currentIdx();
    if (toIdx === fromIdx) return;
    const targetSection = allSections[toIdx];
    if (!targetSection) return;
    const targetEl = document.getElementById(targetSection.id);
    if (!targetEl) return;

    const fromSection = allSections[fromIdx];
    const destKey = targetSection.planetKey || targetSection.id;
    const destName = targetSection.planetName || targetSection.id;
    const fromKey = fromSection?.planetKey || fromSection?.id || "andromeda";

    /* Suspend rhythm so scroll passing through intermediate transition
       stages doesn't fight the GSAP camera arc. Token-based: only the
       LATEST jump's timeout may release, so rapid clicks can't un-suspend
       a jump still in flight. */
    const token = Symbol("jump");
    window.__rhythmSuspended = true;
    window.__rhythmSuspendToken = token;
    window.dispatchEvent(new CustomEvent("galactic:travel:start", {
      detail: { from: fromKey, to: destKey, planetName: destName },
    }));

    /* Camera: GSAP cinematic arc. */
    window.galacticScene?.travelCameraTo?.(destKey, cameraDuration);

    /* Page: short Lenis scroll, runs in parallel with camera. */
    lenisScrollTo(targetEl, PAGE_SCROLL_DURATION);

    /* Cleanup after the slower of the two animations completes.
       +200 ms buffer for any tail lerp. */
    const totalMs = Math.max(PAGE_SCROLL_DURATION, cameraDuration) * 1000 + 200;
    setTimeout(() => {
      if (window.__rhythmSuspendToken !== token) return; // a newer jump owns the suspend
      window.__rhythmSuspended = false;
      delete window.__rhythmSuspendToken;
      /* Rhythm was suspended during the arc, so announce the destination
         section ourselves — this reveals the destination card on arrival. */
      window.__activeSolarySectionId = targetSection.id;
      window.dispatchEvent(new CustomEvent("solary:section", { detail: { id: targetSection.id, key: destKey } }));
      window.dispatchEvent(new CustomEvent("galactic:travel:end"));
    }, totalMs);
  };

  const jump = (dir) => {
    const idx = currentIdx();
    const next = Math.max(0, Math.min(allSections.length - 1, idx + dir));
    if (next === idx) return;
    programmaticJump(next, CAMERA_ADJACENT_DURATION);
  };

  const goToSection = (link) => {
    setMenuOpen(false);
    const targetId = link.to;
    const fromIdx = currentIdx();
    const toIdx = allSections.findIndex((s) => s.id === targetId);
    if (toIdx < 0) return;
    const distance = Math.abs(toIdx - fromIdx);
    const cameraDuration = distance <= 1 ? CAMERA_ADJACENT_DURATION : CAMERA_DISTANT_DURATION;
    programmaticJump(toIdx, cameraDuration);
  };

  const iconBtnStyle = {
    width: 32, height: 32,
    display: "grid", placeItems: "center",
    borderRadius: "50%",
    background: "var(--nav-arrow-bg)",
    border: "var(--nav-arrow-border)",
    color: "var(--nav-arrow-color)",
    cursor: "pointer",
    transition: "transform 200ms var(--ease-spring), background 200ms",
    fontWeight: 700,
  };

  return (
    <nav
      aria-label="Section navigation"
      data-revealed={revealed}
      style={{
        position: "fixed", top: 16, left: 16, right: 16,
        zIndex: "var(--z-nav)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: "var(--navbar-h)", padding: "0 18px",
        borderRadius: "var(--r-pill)",
        border: "var(--nav-border)",
        background: "var(--nav-bg)",
        backdropFilter: "blur(12px) saturate(140%)",
        WebkitBackdropFilter: "blur(12px) saturate(140%)",
        boxShadow: "var(--nav-shadow)",
        color: "var(--color-fg)",
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(-12px)",
        pointerEvents: revealed ? "auto" : "none",
        transition: "opacity 700ms var(--ease-glide), transform 700ms var(--ease-glide)",
        gap: 12, overflow: "visible",
      }}
    >
      <a href={`#${allSections[0]?.id || "intro"}`} style={{
        // Couple-name brand in Great Vibes — script needs a larger size to
        // read at navbar scale, and zero tracking (it breaks cursive joins).
        fontFamily: "var(--font-script)", fontSize: 24, fontWeight: 400, letterSpacing: "normal",
        display: "inline-flex", alignItems: "center", gap: 10, flex: "0 0 auto",
      }}>
        <span aria-hidden="true" style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "var(--color-accent)",
          boxShadow: "0 0 12px rgba(var(--color-glow)/0.8)",
        }} />
        <span style={{ whiteSpace: "nowrap" }}>{logo}</span>
      </a>

      <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }} ref={menuRef}>
        <button onClick={() => jump(-1)} aria-label="Previous section" title="Previous section" style={iconBtnStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 15l6-6 6 6" /></svg>
        </button>
        <button onClick={() => jump(1)} aria-label="Next section" title="Next section" style={iconBtnStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle section menu"
          aria-expanded={menuOpen}
          title="Sections"
          style={{ ...iconBtnStyle, background: menuOpen ? "rgba(255,255,255,0.14)" : iconBtnStyle.background }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        {menuOpen && (
          <ul
            role="menu"
            style={{
              position: "absolute",
              top: "calc(100% + 14px)", right: 0,
              minWidth: 240,
              listStyle: "none", margin: 0, padding: 8,
              borderRadius: "var(--r-2)",
              border: "var(--nav-border)",
              background: "var(--nav-bg)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "var(--nav-shadow)",
              display: "flex", flexDirection: "column", gap: 2,
            }}
          >
            {links.map((l) => {
              const active = activeId === l.to;
              return (
                <li key={l.to} role="none">
                  <button
                    role="menuitem"
                    onClick={() => goToSection(l)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 14px",
                      background: active ? "rgba(255,255,255,0.08)" : "transparent",
                      border: "none",
                      borderRadius: 10,
                      color: active ? "var(--color-accent)" : "var(--color-fg)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      transition: "background 160ms, color 160ms",
                    }}
                  >
                    {l.label}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </nav>
  );
}
