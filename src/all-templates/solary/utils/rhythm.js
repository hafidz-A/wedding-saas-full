/* ============================================================
   rhythm.js — Mode Planet ↔ Mode Perjalanan + Travelling overlay
   ------------------------------------------------------------
   • Inserts ~200vh transition stages between sections.
   • On scroll, drives scene.setActive() / setRoute().
   • Fires `galactic:travel:start` / `:end` CustomEvents which
     <TravellingOverlay/> listens for to show "Travelling to X".
   ============================================================ */

export function installRhythm(cfg) {
  if (typeof window === "undefined" || !cfg) return;

  const TRANSITION_VH = cfg.scene?.transitionVh ?? 200;
  const sceneKey = (k) => (!k ? "andromeda" : k);

  let installed = false;
  let boundaries = [];
  let rafScheduled = false;
  let lastTransitionId = null;
  let lastScrollY = 0;
  let scrollDir = 1; /* +1 = scrolling down, -1 = scrolling up */

  function planetKey(section) {
    return section.props?.planetKey || section.planet?.key || null;
  }
  function planetName(section) {
    return section.props?.planetName || section.planet?.name || section.id;
  }

  function insertStages() {
    const main = document.querySelector("main");
    if (!main) return false;
    const sections = cfg.sections.filter((s) => s.enabled !== false);
    if (sections.length < 2) return false;

    for (let i = 0; i < sections.length - 1; i++) {
      const fromCfg = sections[i], toCfg = sections[i + 1];
      const fromEl = document.getElementById(fromCfg.id);
      const toEl = document.getElementById(toCfg.id);
      if (!fromEl || !toEl) continue;
      const next = fromEl.nextElementSibling;
      if (next && next.dataset.role === "transition") continue;

      const stage = document.createElement("div");
      stage.dataset.role = "transition";
      stage.dataset.from = planetKey(fromCfg) || "";
      stage.dataset.to = planetKey(toCfg) || "";
      stage.dataset.fromName = planetName(fromCfg) || "";
      stage.dataset.toName = planetName(toCfg) || "";
      stage.dataset.transitionId = `${fromCfg.id}->${toCfg.id}`;
      stage.setAttribute("aria-hidden", "true");
      stage.style.cssText = `position: relative; height: ${TRANSITION_VH}vh; pointer-events: none;`;
      fromEl.after(stage);
    }
    return true;
  }

  function rebuildBoundaries() {
    const main = document.querySelector("main");
    if (!main) { boundaries = []; return; }
    const list = [];
    for (const child of Array.from(main.children)) {
      const top = child.offsetTop;
      const bottom = top + child.offsetHeight;
      if (child.dataset.role === "transition") {
        list.push({
          type: "transition", el: child, top, bottom,
          from: sceneKey(child.dataset.from || ""),
          to: sceneKey(child.dataset.to || ""),
          fromName: child.dataset.fromName || "previous planet",
          toName: child.dataset.toName || "next planet",
          tid: child.dataset.transitionId,
        });
      } else if (child.id) {
        const cfgSection = cfg.sections.find((s) => s.id === child.id);
        list.push({
          type: "section", el: child, top, bottom,
          key: sceneKey(planetKey(cfgSection)),
          id: child.id,
        });
      }
    }
    boundaries = list;
  }

  function fire(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function applyScroll() {
    rafScheduled = false;
    if (!boundaries.length) return;
    /* Skip while a distant jump is mid-flight (FloatingNavbar sets
       this to true so rapid scroll doesn't trigger transit through
       every intermediate planet). */
    if (window.__rhythmSuspended) return;
    const scene = window.galacticScene;
    if (!scene) return;
    const scrollY = window.scrollY;
    const vh = window.innerHeight;
    const probe = scrollY + vh * 0.45;
    const cur = boundaries.find((b) => probe >= b.top && probe < b.bottom);
    if (!cur) return;

    /* Track scroll direction so the travelling overlay names the
       planet user is actually heading TOWARD (forward = to, back = from). */
    if (scrollY !== lastScrollY) {
      scrollDir = scrollY > lastScrollY ? 1 : -1;
      lastScrollY = scrollY;
    }

    if (cur.type === "transition") {
      const span = cur.bottom - cur.top || 1;
      const raw = (probe - cur.top) / span;
      const t = raw < 0.12 ? 0 : raw > 0.88 ? 1 : (raw - 0.12) / 0.76;
      const destName = scrollDir >= 0 ? cur.toName : cur.fromName;
      const destKey = scrollDir >= 0 ? cur.to : cur.from;
      const origKey = scrollDir >= 0 ? cur.from : cur.to;
      if (lastTransitionId !== cur.tid && t > 0.05 && t < 0.95) {
        lastTransitionId = cur.tid;
        fire("galactic:travel:start", { from: origKey, to: destKey, planetName: destName });
      }
      if (t >= 0.95 || t <= 0.05) {
        if (lastTransitionId) {
          fire("galactic:travel:end", { tid: cur.tid });
          lastTransitionId = null;
        }
      }
      if (t === 0)      scene.setActive(cur.from);
      else if (t === 1) scene.setActive(cur.to);
      else              scene.setRoute(cur.from, cur.to, t);
    } else {
      if (lastTransitionId) {
        fire("galactic:travel:end", { tid: lastTransitionId });
        lastTransitionId = null;
      }
      scene.setActive(cur.key);
      /* Broadcast the active section so each GlassCard can reveal itself
         exactly when the camera frames its planet (and hide during transit),
         keeping card and camera in sync for ANY section arrangement. */
      if (window.__activeSolarySectionId !== cur.id) {
        window.__activeSolarySectionId = cur.id;
        fire("solary:section", { id: cur.id, key: cur.key });
      }
    }
  }
  function onScroll() {
    if (rafScheduled) return;
    rafScheduled = true;
    requestAnimationFrame(applyScroll);
  }

  function boot() {
    if (installed) return;
    if (!window.galacticScene) { setTimeout(boot, 60); return; }
    if (!insertStages()) { setTimeout(boot, 60); return; }
    rebuildBoundaries();
    applyScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => { rebuildBoundaries(); onScroll(); });
    if (window.__lenis?.on) window.__lenis.on("scroll", onScroll);
    setTimeout(() => { rebuildBoundaries(); onScroll(); }, 600);
    setTimeout(() => { rebuildBoundaries(); onScroll(); }, 1800);
    installed = true;
    window.galacticRhythm = { rebuildBoundaries, applyScroll };
  }

  function waitForReact(retries = 100) {
    if (document.querySelector("main")?.children.length > 1) boot();
    else if (retries > 0) setTimeout(() => waitForReact(retries - 1), 50);
  }
  waitForReact();
}
