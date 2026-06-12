/* ============================================================
   galacticScene.js — Galactic Wedding scene controller
   ------------------------------------------------------------
   v3 upgrades over the bundled engine:
   • Reads palette from themeBus (single source of truth) and
     updates atmosphere/sun/light colors when palette changes.
   • Mobile perf: lowers pixel ratio, reduces particle counts.
   • Warp API: scene.warpToFirstPlanet({duration}) → Promise.
   • Wish stars: scene.addWishStar({text, name}) appends a
     twinkling sprite to the background.
   • Comets: occasional shooting stars across the sky.
   • Sun click: raycaster fires `galactic:sunclick` on click.
   ============================================================ */
import * as THREE from "three";
import gsap from "gsap";
import { themeBus } from "../config/themeTokens.js";

export function mountGalacticScene({ starfieldDensity = 8000 } = {}) {
  if (typeof window === "undefined") return null;
  if (window.galacticScene) return window.galacticScene;

  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const isLowEnd = isMobile || window.devicePixelRatio < 1.5;
  const PERF = {
    // Cap at 3 on every device (was hard-locked to 1 on mobile, which rendered
    // the whole WebGL scene — Saturn + photo sprites — at 1/DPR resolution and
    // let the browser upscale it, so on a DPR-3 phone everything looked blurry).
    // 3 = native on most phones (sharpest); drop to 2 if low-end FPS suffers.
    pixelRatio: Math.min(window.devicePixelRatio, 3),
    starsNear: isMobile ? 250 : 700,
    starsMid: isMobile ? 700 : 1800,
    starsFar: isMobile ? 1800 : Math.min(5000, Math.floor(starfieldDensity * 0.6)),
    asteroidBeltMain: isMobile ? 1500 : 4200,
    asteroidBeltInner: isMobile ? 250 : 700,
    sunProms: isMobile ? 6 : 8,
    cometMaxConcurrent: isMobile ? 1 : 2,
  };

  /* Speed normalization: saat planet jadi fokus, orbit DAN spin di-tween
     halus ke nilai "Neptune-paced" selama ~SETTLE_TIME_S detik. Saat tidak
     fokus, kembali ke angleSpeed/spinSpeed asli per planet.
     NEPTUNE_SPIN_SPEED dipilih agar rotasi tetap visible (tidak diam),
     tapi tenang — sekitar 24% dari Mercury default, 25% dari Neptune default. */
  const NEPTUNE_ORBIT_SPEED = 0.04;
  const NEPTUNE_SPIN_SPEED = 0.15;
  const SETTLE_TIME_S = 0.8;

  const SUN = { radius: 4.6 };

  /* `photo` = real NASA-imagery texture in /public/solary/textures (lazy-loaded,
     swapped over the procedural canvas texture once downloaded — see
     loadAstroTexture below). `bump` = bumpScale derived from the same map so
     craters/cloud bands catch the sunlight; 0/absent = no bump (gas/cloud tops). */
  const PLANETS = [
    { key:"mercury", radius:0.55, orbit:10, angleSpeed:0.34, spinSpeed:0.30, tilt:0.03, phase:0.2,
      base:"#bcae9c", dark:"#5a4d3a", terrain:"craters", photo:"mercury.webp", bump:0.05 },
    { key:"venus",   radius:0.78, orbit:14, angleSpeed:0.26, spinSpeed:0.18, tilt:0.05, phase:1.4,
      base:"#e6c08a", dark:"#a07a40", terrain:"swirl", atmosphere:"#f6d99a", photo:"venus.webp" },
    { key:"earth",   radius:0.82, orbit:18, angleSpeed:0.22, spinSpeed:0.50, tilt:0.41, phase:2.6,
      base:"#2f6b8a", dark:"#143042", land:"#3c8052", terrain:"oceans", atmosphere:"#88d0ee", photo:"earth.webp", bump:0.04 },
    { key:"mars",    radius:0.65, orbit:23, angleSpeed:0.19, spinSpeed:0.46, tilt:0.44, phase:3.7,
      base:"#c45c3a", dark:"#7a2e1a", terrain:"dunes", photo:"mars.webp", bump:0.05 },
    { key:"jupiter", radius:2.0,  orbit:32, angleSpeed:0.11, spinSpeed:0.95, tilt:0.05, phase:4.9,
      base:"#d39a6a", dark:"#5a2f10", band:"#f4d5a8", terrain:"bands", photo:"jupiter.webp", bump:0.015 },
    { key:"saturn",  radius:1.7,  orbit:42, angleSpeed:0.08, spinSpeed:0.88, tilt:0.47, phase:0.8, cameraDistMult: 7.5,
      base:"#e2b97a", dark:"#7a4e1f", band:"#f5dba7", terrain:"bands", photo:"saturn.webp", bump:0.01,
      rings: { inner: 2.2, outer: 3.7, color:"#e8c89a" } },
    { key:"uranus",  radius:1.15, orbit:52, angleSpeed:0.055, spinSpeed:0.65, tilt:1.71, phase:5.5,
      base:"#9ad5db", dark:"#3a6a72", terrain:"smooth", atmosphere:"#c0eff3", photo:"uranus.webp",
      rings: { inner: 1.5, outer: 1.9, color:"#a8d8df", opacity: 0.25 } },
    { key:"neptune", radius:1.05, orbit:62, angleSpeed:0.04, spinSpeed:0.62, tilt:0.49, phase:3.1,
      base:"#2f55c8", dark:"#0a1c5e", band:"#7da6ff", terrain:"bands", atmosphere:"#7da3ff", photo:"neptune.webp", bump:0.01 },
  ];
  const PLANET_MAP = Object.fromEntries(PLANETS.map(p => [p.key, p]));

  const CAMERA = {
    fovPlanet: 45, fovTravel: 78,
    near: 0.1, far: 800,
    distanceMult: 5.0, heightOffset: 1.0,
    intro: { position: [0, 8, 80], lookAt: [0, 8, -180], fov: 55 },
    /* "Andromeda close-up" framing for the opening gate. */
    gate:  { position: [0, 8, 80], lookAt: [0, 8, -180], fov: 55 },
    overview: { position: [0, 35, 70], lookAt: [0, 0, 0], fov: 55 },
  };

  function noise(x, y, seed = 0) {
    const s = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return s - Math.floor(s);
  }

  /* Quick hex→rgba conversion for canvas gradient stops. */
  function hexToRgba(hex, alpha = 1) {
    const h = hex.replace("#", "");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function drawAsymmetricRoundedRect(ctx, x, y, width, height, rTop, rBot) {
    ctx.beginPath();
    ctx.moveTo(x + rTop, y);
    ctx.lineTo(x + width - rTop, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + rTop);
    ctx.lineTo(x + width, y + height - rBot);
    ctx.quadraticCurveTo(x + width, y + height, x + width - rBot, y + height);
    ctx.lineTo(x + rBot, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - rBot);
    ctx.lineTo(x, y + rTop);
    ctx.quadraticCurveTo(x, y, x + rTop, y);
    ctx.closePath();
  }

  function drawCardOnCanvas(canvas, img, caption, tokens) {
    const W = canvas.width, H = canvas.height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);

    const scale = W / 512;
    const cardX = 24 * scale, cardY = 24 * scale;
    const cardW = W - 48 * scale, cardH = H - 48 * scale;
    const isLight = tokens.mode === "light";

    // 1. Draw Shadow
    if (isLight) {
      // Solid offset shadow for neo-brutalism
      ctx.fillStyle = tokens.line || "#1d0f3a";
      drawAsymmetricRoundedRect(ctx, cardX + 12 * scale, cardY + 12 * scale, cardW, cardH, 48 * scale, 20 * scale);
      ctx.fill();
    } else {
      // Soft glow drop shadow for dark mode
      ctx.save();
      ctx.shadowColor = tokens.glow || "#c19bff";
      ctx.shadowBlur = 20 * scale;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4 * scale;
      ctx.fillStyle = tokens.surface || "rgba(14, 12, 36, 0.9)";
      drawAsymmetricRoundedRect(ctx, cardX, cardY, cardW, cardH, 48 * scale, 20 * scale);
      ctx.fill();
      ctx.restore();
    }

    // 2. Draw Card Body
    ctx.fillStyle = tokens.surface || (isLight ? "rgba(255, 255, 255, 0.9)" : "rgba(14, 12, 36, 0.85)");
    drawAsymmetricRoundedRect(ctx, cardX, cardY, cardW, cardH, 48 * scale, 20 * scale);
    ctx.fill();

    // 3. Draw Image (if loaded)
    if (img) {
      ctx.save();
      // Clip image to rounded rect
      const imgX = cardX + 20 * scale, imgY = cardY + 20 * scale;
      const imgW = cardW - 40 * scale, imgH = cardH - 120 * scale;
      drawAsymmetricRoundedRect(ctx, imgX, imgY, imgW, imgH, 32 * scale, 12 * scale);
      ctx.clip();

      // Object-fit: cover logic
      const aspectCanvas = imgW / imgH;
      const aspectImg = img.width / img.height;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (aspectImg > aspectCanvas) {
        sw = img.height * aspectCanvas;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / aspectCanvas;
        sy = (img.height - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, imgX, imgY, imgW, imgH);
      ctx.restore();
    } else {
      // Draw placeholder diagonals
      ctx.save();
      const imgX = cardX + 20 * scale, imgY = cardY + 20 * scale;
      const imgW = cardW - 40 * scale, imgH = cardH - 120 * scale;
      drawAsymmetricRoundedRect(ctx, imgX, imgY, imgW, imgH, 32 * scale, 12 * scale);
      ctx.clip();
      ctx.fillStyle = isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)";
      ctx.fillRect(imgX, imgY, imgW, imgH);
      ctx.strokeStyle = isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
      ctx.lineWidth = 4 * scale;
      for (let i = -imgH; i < imgW; i += 20 * scale) {
        ctx.beginPath();
        ctx.moveTo(imgX + i, imgY);
        ctx.lineTo(imgX + i + imgH, imgY + imgH);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 4. Draw Card Border Outline
    ctx.strokeStyle = tokens.line || (isLight ? "#1d0f3a" : "rgba(255,255,255,0.14)");
    ctx.lineWidth = isLight ? 6 * scale : 2 * scale;
    drawAsymmetricRoundedRect(ctx, cardX, cardY, cardW, cardH, 48 * scale, 20 * scale);
    ctx.stroke();

    // 5. Draw Caption Text at the bottom
    ctx.fillStyle = tokens.fg || (isLight ? "#1d0f3a" : "#ece5f6");
    // Caption size knob: the `22` multiplier sets the on-card font size and
    // (via scale = W/512) applies to both mobile and desktop. Raise/lower it
    // to taste — bigger also reads sharper since larger glyphs survive the
    // texture's mip filtering better.
    // Canvas can't resolve CSS var() — read the next/font Jakarta family
    // (hashed name) off the root element so the caption matches DOM labels.
    const jakartaFamily =
      getComputedStyle(document.documentElement).getPropertyValue('--font-jakarta').trim() || 'system-ui';
    ctx.font = `bold ${Math.round(22 * scale)}px ${jakartaFamily}, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText((caption || "Memory").toUpperCase(), W / 2, H - 48 * scale);
  }

  function makePlanetTexture(p) {
    const W = isMobile ? 512 : 1024, H = isMobile ? 256 : 512;
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = p.base; ctx.fillRect(0, 0, W, H);
    switch (p.terrain) {
      case "bands": {
        /* Render bands as feathered vertical gradients (transparent
           edges → solid middle → transparent edges) so adjacent bands
           smoothly blend instead of forming hard rectangle steps. */
        const bandCount = 26 + Math.floor(noise(p.orbit, 0) * 8);
        for (let i = 0; i < bandCount; i++) {
          const y0 = (i / bandCount) * H;
          const h = H / bandCount * (0.85 + noise(i, 11) * 0.7);
          const colorHex = noise(i, 4) > 0.5 ? p.band : p.dark;
          const peakAlpha = 0.30 + noise(i, 7) * 0.45;
          const g = ctx.createLinearGradient(0, y0, 0, y0 + h);
          g.addColorStop(0, hexToRgba(colorHex, 0));
          g.addColorStop(0.5, hexToRgba(colorHex, peakAlpha));
          g.addColorStop(1, hexToRgba(colorHex, 0));
          ctx.fillStyle = g;
          ctx.fillRect(0, y0, W, h);
        }
        if (p.key === "jupiter") {
          /* Great Red Spot — soft elliptical glow. */
          const cx = W * 0.65, cy = H * 0.62;
          const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 80);
          g.addColorStop(0, "rgba(195,58,29,0.95)");
          g.addColorStop(0.4, "rgba(165,45,22,0.55)");
          g.addColorStop(0.75, "rgba(122,41,19,0.18)");
          g.addColorStop(1, "rgba(122,41,19,0)");
          ctx.fillStyle = g; ctx.beginPath();
          ctx.ellipse(cx, cy, 80, 40, 0, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }
      case "oceans": {
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, "#3a6a82"); grad.addColorStop(0.5, p.base); grad.addColorStop(1, "#264b66");
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = p.land;
        for (let i = 0; i < 40; i++) {
          ctx.globalAlpha = 0.7 + noise(i, 5) * 0.3;
          ctx.beginPath();
          ctx.ellipse(noise(i, 1) * W, noise(i, 2) * H, 30 + noise(i, 3) * 80, 18 + noise(i, 4) * 50, noise(i, 6) * Math.PI, 0, Math.PI*2);
          ctx.fill();
        }
        ctx.fillStyle = "#e6f1f5"; ctx.globalAlpha = 0.85;
        ctx.fillRect(0, 0, W, 22); ctx.fillRect(0, H - 22, W, 22);
        ctx.globalAlpha = 1; break;
      }
      case "swirl": {
        for (let i = 0; i < (isMobile ? 400 : 800); i++) {
          ctx.globalAlpha = 0.06 + noise(i, 31) * 0.18;
          ctx.fillStyle = noise(i, 3) > 0.5 ? p.dark : "#fff2c8";
          ctx.beginPath();
          ctx.ellipse(noise(i, 1) * W, noise(i, 2) * H, 30 + noise(i,4)*40, 8 + noise(i,5)*10, noise(i,6) * Math.PI, 0, Math.PI*2);
          ctx.fill();
        }
        ctx.globalAlpha = 1; break;
      }
      case "dunes": {
        for (let i = 0; i < (isMobile ? 2000 : 4000); i++) {
          const r = noise(i, 3);
          ctx.globalAlpha = 0.4 + r * 0.5;
          ctx.fillStyle = r > 0.7 ? p.dark : (r > 0.4 ? "#8c3e26" : "#e07050");
          ctx.fillRect(noise(i, 1)*W, noise(i, 2)*H, 3 + r * 6, 3 + r * 6);
        }
        ctx.fillStyle = "#f4eee0"; ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.ellipse(W/2, 0, W*0.4, 28, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(W/2, H, W*0.4, 30, 0, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1; break;
      }
      case "craters": {
        for (let i = 0; i < (isMobile ? 1800 : 3500); i++) {
          ctx.globalAlpha = 0.3 + noise(i, 7) * 0.5;
          ctx.fillStyle = noise(i, 8) > 0.5 ? "#8a7c68" : "#3a3328";
          ctx.beginPath(); ctx.arc(noise(i, 1)*W, noise(i, 2)*H, 1 + noise(i, 3) * 5, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1; break;
      }
      case "smooth":
      default: {
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, p.atmosphere || p.base); grad.addColorStop(0.5, p.base); grad.addColorStop(1, p.dark);
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      }
    }
    const tex = new THREE.CanvasTexture(cv);
    if ("SRGBColorSpace" in THREE) tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    return tex;
  }

  /* Soft circular point-sprite used by all Points materials (stars,
     asteroids). Without a map, three.js renders points as flat
     squares — this gives them a feathered round look. */
  let _pointSprite = null;
  function getPointSprite() {
    if (_pointSprite) return _pointSprite;
    const size = 64;
    const cv = document.createElement("canvas");
    cv.width = cv.height = size;
    const ctx = cv.getContext("2d");
    const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    g.addColorStop(0,    "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.85)");
    g.addColorStop(0.55, "rgba(255,255,255,0.35)");
    g.addColorStop(1,    "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    _pointSprite = new THREE.CanvasTexture(cv);
    if ("SRGBColorSpace" in THREE) _pointSprite.colorSpace = THREE.SRGBColorSpace;
    return _pointSprite;
  }

  /* Smooth radial-gradient texture for sun + glows + comets. */
  function makeRadialGlow(innerColor, midColor, outerColor, size = 256) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = size;
    const ctx = cv.getContext("2d");
    const g = ctx.createRadialGradient(size/2, size/2, size*0.02, size/2, size/2, size/2);
    g.addColorStop(0,   innerColor);
    g.addColorStop(0.4, midColor);
    g.addColorStop(0.7, outerColor);
    g.addColorStop(1,   "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(cv);
    if ("SRGBColorSpace" in THREE) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function makeSunTexture(color = "#ffd373") {
    const W = 1024, H = 512;
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#ff9d2a"); grad.addColorStop(0.5, color); grad.addColorStop(1, "#ff8718");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    /* Granules: soft circular glows (radial gradients) instead of
       hard square pixels — gives the surface a fluid plasma look. */
    const count = isMobile ? 1500 : 3500;
    for (let i = 0; i < count; i++) {
      const r = noise(i, 1);
      const x = noise(i, 2) * W;
      const y = noise(i, 3) * H;
      const radius = 4 + r * 9;
      const color = r > 0.6 ? "rgba(255,235,138," : (r > 0.3 ? "rgba(232,101,26," : "rgba(90,26,8,");
      const peak = (0.30 + r * 0.40).toFixed(2);
      const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(0, color + peak + ")");
      g.addColorStop(0.6, color + (peak * 0.45).toFixed(2) + ")");
      g.addColorStop(1, color + "0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    /* Slight blur smooths any residual hard edges. */
    try {
      const tmp = document.createElement("canvas");
      tmp.width = W; tmp.height = H;
      const tctx = tmp.getContext("2d");
      tctx.filter = "blur(1.2px)";
      tctx.drawImage(cv, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(tmp, 0, 0);
    } catch {}
    const tex = new THREE.CanvasTexture(cv);
    if ("SRGBColorSpace" in THREE) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /* Large radial-gradient texture for the sun's outer glow.
     Used as one big camera-facing sprite — no shell boundaries. */
  function makeSunGlowTexture() {
    const size = 1024;
    const cv = document.createElement("canvas");
    cv.width = cv.height = size;
    const ctx = cv.getContext("2d");
    /* Multi-stop radial: core bright orange → mid amber → very faint
       outer haze → fully transparent. Stops chosen so the slope is
       continuous; no visible discontinuities. */
    const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    /* Hotter core: near-white centre reads as incandescent plasma,
       then a long warm falloff so the corona breathes far into space. */
    g.addColorStop(0.00, "rgba(255,248,230,1)");
    g.addColorStop(0.05, "rgba(255,232,170,0.92)");
    g.addColorStop(0.11, "rgba(255,196,100,0.62)");
    g.addColorStop(0.20, "rgba(255,160,60,0.36)");
    g.addColorStop(0.32, "rgba(255,145,55,0.19)");
    g.addColorStop(0.47, "rgba(255,160,80,0.10)");
    g.addColorStop(0.64, "rgba(255,182,112,0.045)");
    g.addColorStop(0.84, "rgba(255,205,145,0.016)");
    g.addColorStop(1.00, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(cv);
    if ("SRGBColorSpace" in THREE) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function makeAndromedaTexture() {
    const W = 1024, H = 1024;
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    const cx = W * 0.55, cy = H * 0.55;
    const halo = ctx.createRadialGradient(cx, cy, 30, cx, cy, W * 0.55);
    halo.addColorStop(0,    "rgba(255,232,210,0.42)");
    halo.addColorStop(0.18, "rgba(220,184,160,0.18)");
    halo.addColorStop(0.45, "rgba(120,90,140,0.08)");
    halo.addColorStop(1,    "rgba(0,0,0,0)");
    ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.35); ctx.scale(1, 0.42);
    const dg = ctx.createRadialGradient(0, 0, 8, 0, 0, 380);
    dg.addColorStop(0, "rgba(255,240,210,1)"); dg.addColorStop(0.15, "rgba(240,200,170,0.7)");
    dg.addColorStop(0.55, "rgba(180,130,150,0.18)"); dg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(0, 0, 380, 0, Math.PI * 2); ctx.fill();
    for (let arm = 0; arm < 2; arm++) {
      const armPhase = arm * Math.PI;
      for (let i = 0; i < (isMobile ? 700 : 1400); i++) {
        const t = i / 1400, r = 40 + t * 360;
        const theta = armPhase + t * Math.PI * 3.2 + (noise(arm, i) - 0.5) * 0.5;
        const sx = Math.cos(theta) * r, sy = Math.sin(theta) * r;
        const star = noise(i, arm+5);
        ctx.fillStyle = star > 0.85 ? "rgba(255,250,235,1)"
                                    : star > 0.6 ? "rgba(255,220,180,0.7)"
                                    : "rgba(220,180,180,0.4)";
        ctx.globalAlpha = 0.5 + noise(i, arm+1) * 0.5;
        const size = star > 0.9 ? 2.5 : (star > 0.6 ? 1.4 : 0.8);
        ctx.fillRect(sx + (noise(i, arm+13) - 0.5)*24, sy + (noise(i, arm+7)-0.5)*16, size, size);
      }
    }
    ctx.restore();
    const nuc = ctx.createRadialGradient(cx, cy, 0, cx, cy, 36);
    nuc.addColorStop(0, "rgba(255,250,228,1)"); nuc.addColorStop(0.4, "rgba(255,224,180,0.95)"); nuc.addColorStop(1, "rgba(255,180,140,0)");
    ctx.fillStyle = nuc; ctx.fillRect(cx - 36, cy - 36, 72, 72);
    const tex = new THREE.CanvasTexture(cv);
    if ("SRGBColorSpace" in THREE) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /* ============================================================
     CANVAS + RENDERER
     ============================================================ */
  const canvas = document.createElement("canvas");
  canvas.id = "galactic-canvas";
  document.body.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: !isMobile, alpha: true,
    powerPreference: isMobile ? "low-power" : "high-performance",
  });
  renderer.setPixelRatio(PERF.pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    CAMERA.gate.fov, window.innerWidth / window.innerHeight, CAMERA.near, CAMERA.far
  );
  camera.position.set(...CAMERA.gate.position);
  camera.lookAt(new THREE.Vector3(...CAMERA.gate.lookAt));

  /* Lights — soft gradient feel. Ambient slightly tinted with palette. */
  const ambient = new THREE.AmbientLight(0x8a90c0, 0.55);
  scene.add(ambient);
  const sunLight = new THREE.PointLight(0xffe7b3, 5.2, 800, 1.4); // distance falloff (decay 1.4 → soft gradient)
  scene.add(sunLight);
  const rim = new THREE.DirectionalLight(0xaaccff, 0.35);
  rim.position.set(-50, 30, 30); scene.add(rim);

  /* Track materials that need to fade when transitioning from/to Andromeda */
  const fadingObjects = [];
  let solarSystemOpacity = 1.0;

  /* ============================================================
     PHOTO TEXTURES — real astro imagery, lazy-loaded
     ------------------------------------------------------------
     The scene mounts instantly with the procedural canvas textures
     above, then upgrades each body to a real photograph once its
     .webp finishes downloading (~30-140KB each, see
     public/solary/textures/README.md for sources + licenses).
     On load failure the procedural texture simply stays — no
     regression offline.
     ============================================================ */
  const TEXTURE_BASE = "/solary/textures/";
  const astroLoader = new THREE.TextureLoader();
  function loadAstroTexture(file, onReady) {
    astroLoader.load(
      TEXTURE_BASE + file,
      (tex) => {
        if ("SRGBColorSpace" in THREE) tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.anisotropy = isMobile ? 4 : 8;
        onReady(tex);
      },
      undefined,
      () => { /* keep procedural fallback */ },
    );
  }

  /* Swap a mesh's map to the loaded photo. Invisible (gate phase) →
     instant; visible → crossfade via an overlay clone so there's no
     visible "pop". `fadeEntry` is the mesh's fadingObjects record. */
  function swapMeshTexture(mesh, fadeEntry, tex, { bumpScale = 0 } = {}) {
    const applyTo = (mat) => {
      mat.map = tex;
      if (bumpScale && mat.isMeshStandardMaterial) {
        mat.bumpMap = tex;
        mat.bumpScale = bumpScale;
      }
      mat.needsUpdate = true;
    };
    const oldMat = mesh.material;
    const oldMap = oldMat.map;
    if (solarSystemOpacity < 0.05) {
      applyTo(oldMat);
      oldMap?.dispose?.();
      return;
    }
    const newMat = oldMat.clone();
    newMat.transparent = true;
    applyTo(newMat);
    const overlay = new THREE.Mesh(mesh.geometry, newMat);
    overlay.scale.setScalar(1.002); // avoid z-fighting with the base mesh
    const tempEntry = { material: newMat, baseOpacity: 0 };
    fadingObjects.push(tempEntry);
    mesh.add(overlay);
    gsap.to(tempEntry, {
      baseOpacity: fadeEntry.baseOpacity,
      duration: 1.4,
      ease: "power2.inOut",
      onComplete: () => {
        mesh.remove(overlay);
        const i = fadingObjects.indexOf(tempEntry);
        if (i >= 0) fadingObjects.splice(i, 1);
        mesh.material = newMat;
        fadeEntry.material = newMat;
        oldMat.dispose();
        oldMap?.dispose?.();
      },
    });
  }

  /* ============================================================
     STARFIELDS
     ============================================================ */
  /* Realistic stellar tints (blue-white O/B → white A → yellow G →
     orange K/M), weighted toward white/yellow like a real night sky.
     Stored as vertex colors → zero per-frame cost. */
  const STAR_TINTS = [
    [0.62, 0.71, 1.0],  // blue-white
    [0.78, 0.84, 1.0],  // pale blue
    [1.0, 1.0, 1.0],    // white
    [1.0, 0.96, 0.86],  // warm white
    [1.0, 0.87, 0.65],  // yellow-orange
    [1.0, 0.72, 0.52],  // orange-red
  ];
  const STAR_TINT_WEIGHTS = [0.08, 0.14, 0.34, 0.26, 0.13, 0.05];
  function pickStarTint() {
    let r = Math.random();
    for (let i = 0; i < STAR_TINTS.length; i++) {
      r -= STAR_TINT_WEIGHTS[i];
      if (r <= 0) return STAR_TINTS[i];
    }
    return STAR_TINTS[2];
  }
  function makeStarfield(count, radius, size, opacity) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = Math.random(), v = Math.random();
      const theta = u * Math.PI * 2, phi = Math.acos(2 * v - 1);
      const r = radius * (0.7 + Math.random() * 0.3);
      positions[i*3+0] = r * Math.sin(phi) * Math.cos(theta);
      positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i*3+2] = r * Math.cos(phi);
      const tint = pickStarTint();
      const lum = 0.7 + Math.random() * 0.3; // brightness variation per star
      colors[i*3+0] = tint[0] * lum;
      colors[i*3+1] = tint[1] * lum;
      colors[i*3+2] = tint[2] * lum;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      map: getPointSprite(),
      color: 0xffffff,
      vertexColors: true,
      size, sizeAttenuation: true,
      transparent: true, opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Points(geo, mat);
  }
  /* Slightly bigger sizes than before — circular sprites with falloff
     visually shrink the apparent dot, so we compensate. */
  const starsFar  = makeStarfield(PERF.starsFar,  260, 1.1, 0.85); scene.add(starsFar);
  const starsMid  = makeStarfield(PERF.starsMid,  160, 1.5, 0.7);  scene.add(starsMid);
  const starsNear = makeStarfield(PERF.starsNear,  90, 2.2, 0.55); scene.add(starsNear);

  /* ============================================================
     SUN — soft gradient corona (no hard edges)
     ============================================================ */
  const sunGroup = new THREE.Group();
  const sunTex = makeSunTexture(themeBus.current.sun);
  const sunMat = new THREE.MeshBasicMaterial({ map: sunTex, transparent: true });
  const sunFadeEntry = { material: sunMat, baseOpacity: 1.0 };
  fadingObjects.push(sunFadeEntry);
  const sunCore = new THREE.Mesh(new THREE.SphereGeometry(SUN.radius, 64, 64), sunMat);
  sunCore.userData.isSun = true;
  sunGroup.add(sunCore);
  /* Real solar-surface photograph (granulation + active regions). */
  loadAstroTexture("sun.webp", (tex) => swapMeshTexture(sunCore, sunFadeEntry, tex));
  /* Corona = ONE big camera-facing sprite with smooth radial-gradient
     alpha. Replaces the old 7 nested shell spheres, which showed
     visible concentric ring boundaries no matter how many we stacked.
     A single 2D radial gradient has truly continuous falloff. */
  const sunGlowTex = makeSunGlowTexture();
  const sunGlowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sunGlowTex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 1,
  }));
  fadingObjects.push({ material: sunGlowSprite.material, baseOpacity: 1.0 });
  sunGlowSprite.scale.setScalar(SUN.radius * 7.2);
  sunGroup.add(sunGlowSprite);
  /* coronaShells kept for the existing animation code (rotates them);
     we leave it empty so the tick loop's loop is a no-op. */
  const coronaShells = [];
  const promTex = makeRadialGlow("rgba(255,200,120,1)", "rgba(255,140,80,0.55)", "rgba(255,90,40,0)", 256);
  const proms = [];
  for (let i = 0; i < PERF.sunProms; i++) {
    const a = (i / PERF.sunProms) * Math.PI * 2;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: promTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6,
    }));
    fadingObjects.push({ material: sprite.material, baseOpacity: 0.6 });
    const dist = SUN.radius * (1.05 + Math.random() * 0.1);
    sprite.position.set(Math.cos(a) * dist, Math.sin(a * 1.2) * 0.7, Math.sin(a) * dist);
    const s = SUN.radius * (1.6 + Math.random() * 1.4);
    sprite.scale.set(s, s, s);
    sprite.userData = { baseAngle: a, baseScale: s };
    sunGroup.add(sprite); proms.push(sprite);
  }
  scene.add(sunGroup);

  // Roll (radians) applied to Saturn's ring + photo orbit so the orbit reads as
  // a diagonal across the screen (top-left ↔ bottom-right) instead of sweeping
  // off the left/right edges. Applied in world space via euler order 'ZYX'.
  // Tunable: flip the sign to mirror the diagonal; ~0.5–0.8 looks good.
  const SATURN_RING_ROLL = -0.6;

  /* ============================================================
     PLANETS + ORBIT LINES
     ============================================================ */
  const planetGroups = {};
  const atmosphereMeshes = {};
  const orbitLines = [];
  PLANETS.forEach(p => {
    const orbitPts = [];
    for (let i = 0; i <= 256; i++) {
      const a = (i / 256) * Math.PI * 2;
      orbitPts.push(new THREE.Vector3(Math.cos(a) * p.orbit, 0, Math.sin(a) * p.orbit));
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
    const orbitMat = new THREE.LineBasicMaterial({ color: 0xa6c0ff, transparent: true, opacity: 0.14 });
    fadingObjects.push({ material: orbitMat, baseOpacity: 0.14 });
    const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat);
    scene.add(orbitLine);
    orbitLines.push(orbitLine);

    const g = new THREE.Group();
    g.rotation.z = p.tilt;
    const tex = makePlanetTexture(p);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(p.radius, isMobile ? 48 : 96, isMobile ? 48 : 96),
      new THREE.MeshStandardMaterial({
        map: tex, roughness: 0.72, metalness: 0.08,
        emissive: new THREE.Color(p.dark), emissiveIntensity: 0.08,
        transparent: true,
      })
    );
    const meshFadeEntry = { material: mesh.material, baseOpacity: 1.0 };
    fadingObjects.push(meshFadeEntry);
    g.add(mesh);

    if (p.photo) {
      loadAstroTexture(p.photo, (photoTex) =>
        swapMeshTexture(mesh, meshFadeEntry, photoTex, { bumpScale: p.bump || 0 }));
    }

    if (p.atmosphere) {
      /* Inner atmosphere — tight halo right against the planet. */
      const atmo = new THREE.Mesh(
        new THREE.SphereGeometry(p.radius * 1.06, 48, 48),
        new THREE.MeshBasicMaterial({
          color: p.atmosphere, transparent: true, opacity: 0.28,
          side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      fadingObjects.push({ material: atmo.material, baseOpacity: 0.28 });
      g.add(atmo);
      atmosphereMeshes[p.key] = atmo;

      /* Outer glow — wider falloff, lower opacity → soft rim "reflection"
         that fades into space. Two-layer combo reads as continuous
         atmospheric scattering, not a hard ring. */
      const atmoOuter = new THREE.Mesh(
        new THREE.SphereGeometry(p.radius * 1.22, 32, 32),
        new THREE.MeshBasicMaterial({
          color: p.atmosphere, transparent: true, opacity: 0.10,
          side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      fadingObjects.push({ material: atmoOuter.material, baseOpacity: 0.10 });
      g.add(atmoOuter);
    }

    if (p.rings) {
      /* Higher segment count + slightly softer alpha for smoother
         ring edge silhouette. */
      const ringGeo = new THREE.RingGeometry(p.rings.inner, p.rings.outer, 160, 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: p.rings.color, transparent: true,
        opacity: (p.rings.opacity ?? 0.65) * 0.92,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const baseOpacity = (p.rings.opacity ?? 0.65) * 0.92;
      const ringFadeEntry = { material: ringMat, baseOpacity };
      fadingObjects.push(ringFadeEntry);
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.order = 'ZYX';
      ring.rotation.set(Math.PI / 2 + 0.08, 0, p.key === 'saturn' ? SATURN_RING_ROLL : 0);
      g.add(ring);

      if (p.key === "saturn") {
        /* Real ring photograph (Cassini division, A/B/C bands + alpha gaps).
           RingGeometry's default UVs are planar — remap u to the radial
           fraction so the 1D strip texture wraps around the annulus. */
        const posAttr = ringGeo.attributes.position;
        const uvAttr = ringGeo.attributes.uv;
        const v3 = new THREE.Vector3();
        for (let i = 0; i < posAttr.count; i++) {
          v3.fromBufferAttribute(posAttr, i);
          const radial = (v3.length() - p.rings.inner) / (p.rings.outer - p.rings.inner);
          uvAttr.setXY(i, radial, 0.5);
        }
        uvAttr.needsUpdate = true;
        loadAstroTexture("saturn-ring.webp", (ringTex) => {
          ringTex.wrapS = THREE.ClampToEdgeWrapping;
          const applyRingTex = () => {
            ringMat.map = ringTex;
            ringMat.color.set("#ffffff");
            ringMat.needsUpdate = true;
            ringFadeEntry.baseOpacity = 1.0;
          };
          if (solarSystemOpacity < 0.05) { applyRingTex(); return; }
          gsap.to(ringFadeEntry, { baseOpacity: 0, duration: 0.4, ease: "power1.in", onComplete: () => {
            applyRingTex();
            gsap.fromTo(ringFadeEntry, { baseOpacity: 0 }, { baseOpacity: 1.0, duration: 0.9, ease: "power1.out" });
          }});
        });
      }
    }

    g.userData = { meshRef: mesh, ...p };
    scene.add(g);
    planetGroups[p.key] = g;

    /* Speed normalization state: planet aktif (fokus) di-tween ke
       Neptune-paced orbit dan spin. angleAccum dipakai sebagai pengganti
       t * angleSpeed agar speed bisa diubah tanpa lompatan posisi. */
    p.angleAccum = p.phase;
    p.currentSpeed = p.angleSpeed;
    p.currentSpin = p.spinSpeed;
  });

  /* Asteroid belts — irregular shaded rock sprites instead of soft
     glowing dots. 3 sprite variants, drawn once each; the belt splits
     its (unchanged) particle budget across them, so the only cost is
     2 extra draw calls per belt. */
  let _rockSprites = null;
  function getRockSprites() {
    if (_rockSprites) return _rockSprites;
    _rockSprites = [0, 1, 2].map((variant) => {
      const size = 64;
      const cv = document.createElement("canvas");
      cv.width = cv.height = size;
      const ctx = cv.getContext("2d");
      const cx = size / 2, cy = size / 2;
      /* Irregular silhouette: jagged polygon with per-vertex noise. */
      const verts = 11;
      ctx.beginPath();
      for (let i = 0; i <= verts; i++) {
        const a = (i % verts / verts) * Math.PI * 2;
        const r = 20 * (0.62 + noise(i % verts, variant * 17 + 3) * 0.55);
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      /* Lit top-left → shadowed bottom-right, like sun-grazed rock. */
      const grad = ctx.createRadialGradient(cx - 8, cy - 8, 2, cx, cy, 27);
      grad.addColorStop(0, "#e9dfcf");
      grad.addColorStop(0.5, "#9d8f7b");
      grad.addColorStop(1, "#372f25");
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.save();
      ctx.clip();
      for (let i = 0; i < 6; i++) {
        const a = noise(i, variant + 31) * Math.PI * 2;
        const d = 4 + noise(i, variant + 9) * 11;
        ctx.fillStyle = `rgba(28,22,16,${(0.22 + noise(i, variant) * 0.3).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.5 + noise(i, variant + 5) * 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      const tex = new THREE.CanvasTexture(cv);
      if ("SRGBColorSpace" in THREE) tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    });
    return _rockSprites;
  }

  function makeAsteroidBelt(orbitMid, width, count, opacity) {
    const group = new THREE.Group();
    const sprites = getRockSprites();
    const per = Math.ceil(count / sprites.length);
    sprites.forEach((sprite, si) => {
      const positions = new Float32Array(per * 3);
      const colors = new Float32Array(per * 3);
      for (let i = 0; i < per; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = orbitMid + (Math.random() - 0.5) * width;
        positions[i*3+0] = Math.cos(a) * r;
        positions[i*3+1] = (Math.random() - 0.5) * 0.6;
        positions[i*3+2] = Math.sin(a) * r;
        /* Rocky grey-browns (C/S-type asteroids) instead of gold. */
        const v = 0.42 + Math.random() * 0.42;
        colors[i*3+0] = Math.min(1, v * (1.0 + Math.random() * 0.18));
        colors[i*3+1] = v * (0.88 + Math.random() * 0.1);
        colors[i*3+2] = v * (0.72 + Math.random() * 0.12);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.PointsMaterial({
        map: sprite,
        size: 0.3 + si * 0.08, sizeAttenuation: true,
        vertexColors: true,
        transparent: true, opacity,
        depthWrite: false,
        alphaTest: 0.06,
      });
      fadingObjects.push({ material: mat, baseOpacity: opacity });
      group.add(new THREE.Points(geo, mat));
    });
    return group;
  }
  const beltMain = makeAsteroidBelt(27.5, 2.0, PERF.asteroidBeltMain, 0.95);
  scene.add(beltMain);
  const beltInner = makeAsteroidBelt(11.8, 0.4, PERF.asteroidBeltInner, 0.55);
  scene.add(beltInner);

  /* ============================================================
     SATURN PHOTO RING — sprites parented to Saturn group, share
     the ring's tilted plane. Real depth occlusion via three.js
     depth buffer: cards with negative Z relative to camera get
     hidden behind Saturn's mesh naturally.
     ============================================================ */
  /* Revisi 2026-05-27 (iteration 2): photos orbit LEBIH JAUH dari ring
     outer (4.8 vs ring outer 3.7) → margin lega supaya tidak overlap
     ring projection. Plus behind-saturn occlusion: opacity → 0 kalau
     foto ada di belakang body planet (bukan dim, benar-benar hilang).

     Sprite size dinaikkan jadi 1.25×1.55 untuk "dipertegass". */
  const SATURN_PHOTO_RING_R = 4.8;      // MINIMUM radius — clearly outside ring outer (3.7)
  const SATURN_PHOTO_ABOVE  = 0;        // sebidang dengan plane ring
  const SATURN_PHOTO_CARD_W = 1.25;     // ~1.9× sebelumnya (0.65)
  const SATURN_PHOTO_CARD_H = 1.55;     // ~1.8× sebelumnya (0.85)
  /* Photo-ring geometry adapts to the photo count so up to 30 cards keep a
     sliver of space between them instead of fusing shut. The radius may only
     grow a little (a wide orbit shoves the front cards into the camera), so
     past ~24 photos the CARDS shrink instead. Recomputed in setSaturnPhotos;
     the animation loop reads these variables. */
  const SATURN_PHOTO_RING_R_MAX = 5.5;
  let photoRingR = SATURN_PHOTO_RING_R;
  let photoCardScale = 1;
  const SATURN_BODY_R        = 1.7;     // saturn sphere radius (for occlusion test)
  const SATURN_PHOTO_MAX_ANISO = Math.min(16, renderer.capabilities?.getMaxAnisotropy?.() ?? 16);
  /* Card texture resolution. The whole card — photo + baked caption — is one
     canvas; the front/centre card renders large on screen, so 1024 left the
     small caption text magnified (upscaled) → blurry. Bump it, but keep mobile
     conservative because every card holds its own texture simultaneously
     (~N cards live at once) and 2048² across 18+ cards would blow the GPU
     memory budget on phones. Aspect MUST stay 0.8 (H = W × 1.25). The card's
     `scale = W/512` makes every proportion (incl. caption font) follow W. */
  const SATURN_CARD_TEX_W = isMobile ? 1280 : 1536;
  const SATURN_CARD_TEX_H = Math.round(SATURN_CARD_TEX_W * 1.25);
  /* When the camera focuses Saturn, aim it this many world-units BELOW the
     planet centre so Saturn — together with its ring + photo cards (both
     children of the planet group) — rides higher in the frame instead of
     sitting dead-centre. Bigger value = Saturn sits higher. */
  const SATURN_FRAME_LIFT = 1.2;
  const SATURN_PHOTO_SPEED = 0.12;      // rad/sec — orbit AFTER assembly
  const STAGGER_TOTAL = 0.35;           // 0..1: portion of progress used for stagger
  const ASSEMBLE_THRESHOLD = 0.95;      // orbit kicks in only above this
  let photoSprites = [];
  let saturnPhotoRotation = 0;
  let saturnAssemblyProgress = 0;       // 0 = gathered, 1 = ring
  let activePhotos = [];

  const photoRingGroup = new THREE.Group();
  /* Match ring orientation: ring mesh has rotation.x = π/2 + 0.08
     inside the saturn group. We mirror that so photo sprites orbit
     on the same plane. Both share rotation.order='ZYX' so that
     SATURN_RING_ROLL (rotation.z) is applied in world space after
     the x-tilt, tilting the ellipse diagonally on screen. */
  photoRingGroup.rotation.order = 'ZYX';
  photoRingGroup.rotation.set(Math.PI / 2 + 0.08, 0, SATURN_RING_ROLL);
  planetGroups.saturn.add(photoRingGroup);

  function loadPhotoTexture(photoObj, tokens) {
    const canvas = document.createElement("canvas");
    canvas.width = SATURN_CARD_TEX_W;
    canvas.height = SATURN_CARD_TEX_H;

    // Draw initial state (loading/placeholder)
    drawCardOnCanvas(canvas, null, photoObj.caption, tokens);

    const tex = new THREE.CanvasTexture(canvas);
    if ("SRGBColorSpace" in THREE) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = SATURN_PHOTO_MAX_ANISO;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      photoObj.img = img;
      drawCardOnCanvas(canvas, img, photoObj.caption, themeBus.current);
      tex.needsUpdate = true;
    };
    img.onerror = () => {
      // Keep placeholder if load fails
    };
    img.src = photoObj.src;

    return { tex, canvas };
  }

  function setSaturnPhotos(allPhotos = []) {
    /* Clear existing sprites + dispose textures. */
    photoSprites.forEach(s => {
      photoRingGroup.remove(s);
      s.material.map?.dispose?.();
      s.material.dispose();
    });
    photoSprites = [];
    activePhotos = [];

    /* Clamp to 30 (matches the editor's saturnRing maxItems) — each card is
       its own large canvas texture, so this is also the GPU-memory ceiling. */
    const photos = allPhotos.slice(0, 30);

    if (!photos.length) return;

    const N = photos.length;
    /* Keep ~15% breathing room between cards: circumference ≥ N × cardW ×
       1.15. First let the orbit grow (up to a modest cap), then shrink the
       cards to absorb the rest — 30 photos = orbit 5.5 + cards at ~80%. */
    const neededR = (N * SATURN_PHOTO_CARD_W * 1.15) / (2 * Math.PI);
    photoRingR = Math.min(SATURN_PHOTO_RING_R_MAX, Math.max(SATURN_PHOTO_RING_R, neededR));
    photoCardScale = Math.min(1, (2 * Math.PI * photoRingR) / (N * SATURN_PHOTO_CARD_W * 1.15));
    const tokens = themeBus.current;

    photos.forEach((p, i) => {
      const angle = (i / N) * Math.PI * 2;
      const photoObj = {
        src: p.src,
        caption: p.caption,
        img: null,
      };

      const { tex, canvas } = loadPhotoTexture(photoObj, tokens);
      photoObj.canvas = canvas;

      const mat = new THREE.SpriteMaterial({
        map: tex, transparent: true, opacity: 1,
        depthTest: true, depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(SATURN_PHOTO_CARD_W * photoCardScale, SATURN_PHOTO_CARD_H * photoCardScale, 1);
      sprite.position.set(
        Math.cos(angle) * photoRingR,
        Math.sin(angle) * photoRingR,
        -SATURN_PHOTO_ABOVE,
      );
      sprite.userData = { baseAngle: angle, src: p.src, caption: p.caption };
      photoRingGroup.add(sprite);
      photoSprites.push(sprite);
      photoObj.sprite = sprite;
      activePhotos.push(photoObj);
    });
  }

  /* Andromeda — large opening backdrop */
  const andromedaTex = makeAndromedaTexture();
  const andromedaMat = new THREE.MeshBasicMaterial({
    map: andromedaTex, transparent: true, opacity: 1.0,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const andromeda = new THREE.Mesh(new THREE.PlaneGeometry(280, 280), andromedaMat);
  andromeda.position.set(0, 12, -200);
  andromeda.rotation.x = 0.35;
  andromeda.rotation.z = -0.2;
  scene.add(andromeda);

  /* ============================================================
     COMETS — occasional shooting stars
     ============================================================ */
  const cometTex = makeRadialGlow("rgba(255,255,240,1)", "rgba(255,210,140,0.6)", "rgba(255,150,80,0)", 128);
  const comets = [];
  function spawnComet() {
    if (comets.length >= PERF.cometMaxConcurrent) return;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: cometTex, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    const startSide = Math.random() > 0.5 ? 1 : -1;
    sprite.position.set(startSide * 90, 30 + Math.random() * 40, -60 - Math.random() * 80);
    sprite.scale.setScalar(3 + Math.random() * 2);
    sprite.userData = {
      velocity: new THREE.Vector3(-startSide * (1.4 + Math.random() * 0.8), -(0.4 + Math.random() * 0.6), 0),
      life: 0, maxLife: 2.5 + Math.random() * 1.5,
    };
    scene.add(sprite); comets.push(sprite);
  }
  const cometInterval = setInterval(() => { if (Math.random() < 0.5) spawnComet(); }, 7000);

  /* ============================================================
     WISH STARS — appended via API
     ============================================================ */
  const wishStarTex = makeRadialGlow("rgba(255,255,255,1)", "rgba(220,200,255,0.7)", "rgba(180,150,255,0)", 128);
  const wishStars = [];
  const wishGroup = new THREE.Group();
  scene.add(wishGroup);
  const maxWishStars = isMobile ? 30 : 150;
  function addWishStar({ text = "", name = "" } = {}) {
    if (wishStars.length >= maxWishStars) {
      const dropped = wishStars.shift();
      wishGroup.remove(dropped);
      dropped.material?.dispose?.();
    }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: wishStarTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    const u = Math.random(), v = Math.random();
    const theta = u * Math.PI * 2, phi = Math.acos(2 * v - 1);
    const r = 110 + Math.random() * 80;
    s.position.set(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
    s.scale.setScalar(0.7 + Math.random() * 0.8);
    s.userData = { text, name, twinkle: Math.random() * Math.PI * 2 };
    wishGroup.add(s);
    wishStars.push(s);
    gsap.to(s.material, { opacity: 0.95, duration: 1.4, ease: "power2.out" });
    return s;
  }

  /* ============================================================
     CAMERA RIG
     ============================================================ */
  let activeKey = "andromeda";
  let mode = "planet";   // planet | travel | overview  (no gate/warping)
  let cameraTravel = null; /* RAF-based travel state, see travelCameraTo */
  let route = null;
  const desiredPos = new THREE.Vector3(...CAMERA.gate.position);
  const desiredLook = new THREE.Vector3(...CAMERA.gate.lookAt);
  const currentLook = new THREE.Vector3(...CAMERA.gate.lookAt);
  const tmpOffsetTarget = new THREE.Vector3();
  const tmpOffsetCurrent = new THREE.Vector3();
  let desiredFov = CAMERA.gate.fov;
  let manualOverride = null;  // set during GSAP warp

  function lockPositionFor(key) {
    if (key === "andromeda" || !key) {
      return { pos: new THREE.Vector3(...CAMERA.intro.position), look: new THREE.Vector3(...CAMERA.intro.lookAt), fov: CAMERA.intro.fov };
    }
    if (key === "sun") {
      return { pos: new THREE.Vector3(SUN.radius * 4.5, SUN.radius * 1.6, SUN.radius * 4.5), look: new THREE.Vector3(0, 0, 0), fov: 50 };
    }
    const g = planetGroups[key], data = PLANET_MAP[key];
    if (!g || !data) {
      return { pos: new THREE.Vector3(...CAMERA.intro.position), look: new THREE.Vector3(...CAMERA.intro.lookAt), fov: CAMERA.intro.fov };
    }
    const p = g.position;
    /* Per-planet camera distance override. Saturn punya photo ring di
       luar ring outer (radius 4.2) — perlu camera lebih jauh supaya
       seluruh photo-orbit + ring + planet fit dalam frame tanpa foto
       depan ter-clip ring. Default planet pakai CAMERA.distanceMult. */
    const distMult = data.cameraDistMult ?? CAMERA.distanceMult;
    let baseDist = data.radius * distMult;
    
    const aspect = window.innerWidth / window.innerHeight;
    const fovRad = (CAMERA.fovPlanet * Math.PI) / 180;
    
    // Determine the target horizontal width we want to fit in the screen
    let targetWidth = data.radius * 2.8;
    if (key === "saturn") {
      if (aspect < 0.7) {
        targetWidth = 4.8; // Mobile portrait - zoom in very close, letting the orbit cut off by screen edges
        baseDist = 9.0;    // Allow closer zoom
      } else if (aspect < 1.3) {
        targetWidth = 6.8; // Tablet - zoom in closer
        baseDist = 9.0;    // Allow closer zoom
      } else {
        targetWidth = 9.5; // Desktop - zoom in closely
        baseDist = 9.5;    // Allow closer zoom
      }
    }
    
    const responsiveDist = targetWidth / (2 * Math.tan(fovRad / 2) * aspect);
    const dist = Math.max(baseDist, responsiveDist);

    const len = Math.hypot(p.x, p.z) || 1;
    const ux = p.x / len, uz = p.z / len;
    // Saturn-only: aim below the planet centre so it (and its ring + cards)
    // rides higher in the frame. Other planets stay centred (offset 0).
    const lookY = key === "saturn" ? p.y - SATURN_FRAME_LIFT : p.y;
    return {
      pos: new THREE.Vector3(p.x + ux * dist, p.y + data.radius * CAMERA.heightOffset, p.z + uz * dist),
      look: new THREE.Vector3(p.x, lookY, p.z),
      fov: CAMERA.fovPlanet,
    };
  }

  function updateCameraTargets() {
    if (manualOverride) return; // GSAP is driving
    if (mode === "gate") {
      desiredPos.set(...CAMERA.gate.position);
      desiredLook.set(...CAMERA.gate.lookAt);
      desiredFov = CAMERA.gate.fov;
      return;
    }
    if (mode === "travel" && route) {
      const { fromKey, toKey, progress } = route;
      const from = lockPositionFor(fromKey), to = lockPositionFor(toKey);
      const t = Math.max(0, Math.min(1, progress));
      const e = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;
      const mid = new THREE.Vector3(
        (from.pos.x + to.pos.x)/2,
        Math.max(from.pos.y, to.pos.y)/2 + 10,
        (from.pos.z + to.pos.z)/2,
      );
      const horizLen = Math.hypot(mid.x, mid.z);
      if (horizLen > 0.1) { mid.x += (mid.x / horizLen) * 6; mid.z += (mid.z / horizLen) * 6; }
      const omt = 1 - e;
      desiredPos.set(
        omt*omt*from.pos.x + 2*omt*e*mid.x + e*e*to.pos.x,
        omt*omt*from.pos.y + 2*omt*e*mid.y + e*e*to.pos.y,
        omt*omt*from.pos.z + 2*omt*e*mid.z + e*e*to.pos.z,
      );
      const origin = new THREE.Vector3(0, 0, 0);
      if (e < 0.5) desiredLook.lerpVectors(from.look, origin, e * 2);
      else desiredLook.lerpVectors(origin, to.look, (e - 0.5) * 2);
      desiredFov = from.fov + (CAMERA.fovTravel - from.fov) * Math.sin(e * Math.PI);
      return;
    }
    const target = lockPositionFor(activeKey);
    desiredPos.copy(target.pos); desiredLook.copy(target.look); desiredFov = target.fov;
  }

  /* ============================================================
     RAYCASTER — Sun click (easter egg)
     ============================================================ */
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  canvas.style.pointerEvents = "auto";  // need to receive clicks
  canvas.style.touchAction = "none";
  canvas.addEventListener("click", (e) => {
    if (solarSystemOpacity < 0.9) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hit = raycaster.intersectObject(sunCore, false);
    if (hit.length) {
      window.dispatchEvent(new CustomEvent("galactic:sunclick"));
    }
  });
  /* Pass scroll events through the canvas (it stays interactive
     only for direct clicks via Three.js — page-level scrolling
     still works because of pointer-events: none on initial styling
     overridden above; but we want both. The fix is to only listen
     for clicks but let other interactions pass.) */
  canvas.style.pointerEvents = "none";
  canvas.addEventListener("pointerdown", () => { /* noop */ }, { passive: true });
  /* Re-enable pointer for the click handler by listening on window
     and doing the raycaster check ourselves. Named so destroy() can
     remove it — otherwise the raycaster keeps firing on other pages. */
  const onWindowClick = (e) => {
    if (solarSystemOpacity < 0.9) return;
    /* Ignore clicks on UI (cards, buttons). Only count clicks on
       the bare canvas area. */
    const path = e.composedPath ? e.composedPath() : [];
    if (path.some((n) => n?.tagName === "BUTTON" || n?.tagName === "A" || n?.tagName === "INPUT" || n?.classList?.contains("glass-card"))) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    /* Saturn photo sprites first — only when assembled, so an
       in-progress assembly's intermediate positions aren't clickable. */
    if (photoSprites.length && saturnAssemblyProgress > 0.85) {
      const photoHits = raycaster.intersectObjects(photoSprites, false);
      if (photoHits.length) {
        const data = photoHits[0].object.userData;
        window.dispatchEvent(new CustomEvent("galactic:photoclick", {
          detail: { src: data.src, caption: data.caption },
        }));
        return;
      }
    }

    const hit = raycaster.intersectObject(sunCore, false);
    if (hit.length) window.dispatchEvent(new CustomEvent("galactic:sunclick"));
  };
  window.addEventListener("click", onWindowClick);

  /* ============================================================
     THEME — react to palette changes
     ============================================================ */
  function applyTheme(tokens) {
    const accent = new THREE.Color(tokens.accent);
    const glow = new THREE.Color(tokens.glow);
    const sun = new THREE.Color(tokens.sun);
    /* Sun light tint blends sun + glow for warm coherence. */
    sunLight.color.copy(sun.clone().lerp(glow, 0.25));
    /* Sun surface + corona: gentle multiply-tint toward the palette's sun
       color so the photo texture stays realistic but follows the theme. */
    sunCore.material.color.set("#ffffff").lerp(sun, 0.3);
    sunGlowSprite.material.color.set("#ffffff").lerp(sun, 0.35);
    ambient.color.set(0x000000).lerpColors(new THREE.Color(0x444a7a), accent, 0.2);
    /* Star colors — stars carry realistic per-vertex tints, so the theme
       only multiplies in subtly to avoid washing out the variety. */
    [starsFar, starsMid, starsNear].forEach((p) => p.material.color.copy(glow).lerp(new THREE.Color(0xffffff), 0.78));
    /* Asteroid belts — groups of rock-sprite Points; keep tint near-neutral
       so the rocks read as grey-brown stone, not theme-colored glitter. */
    [beltMain, beltInner].forEach((b) => {
      b?.children?.forEach((pts) => {
        if (pts.material) pts.material.color.copy(glow).lerp(new THREE.Color(0xffffff), 0.7);
      });
    });
    /* Atmospheres get tinted toward accent */
    Object.entries(atmosphereMeshes).forEach(([key, mesh]) => {
      const base = new THREE.Color(PLANET_MAP[key].atmosphere || tokens.accent);
      mesh.material.color.copy(base.lerp(accent, 0.35));
    });
    /* Planet bodies & rings tinted toward accent */
    Object.entries(planetGroups).forEach(([key, group]) => {
      const mesh = group.userData.meshRef;
      if (mesh && mesh.material) {
        const darkColor = new THREE.Color(PLANET_MAP[key].dark);
        mesh.material.emissive.copy(darkColor).lerp(accent, 0.15);
      }
      group.children.forEach((child) => {
        if (child.geometry instanceof THREE.RingGeometry && child.material) {
          if (child.material.map) {
            /* Photo-textured ring (Saturn): near-white multiply so the real
               ring bands stay visible; just a whisper of theme accent. */
            child.material.color.set("#ffffff").lerp(accent, 0.12);
          } else {
            const baseColor = new THREE.Color(PLANET_MAP[key].rings?.color || tokens.accent);
            child.material.color.copy(baseColor).lerp(accent, 0.4);
          }
        }
      });
    });

    /* Redraw Saturn cards with new theme colors */
    activePhotos.forEach((p) => {
      if (p.canvas) {
        drawCardOnCanvas(p.canvas, p.img, p.caption, tokens);
        if (p.sprite && p.sprite.material && p.sprite.material.map) {
          p.sprite.material.map.needsUpdate = true;
        }
      }
    });
  }
  applyTheme(themeBus.current);
  const unsubscribeTheme = themeBus.subscribe(applyTheme);

  /* ============================================================
     RAF LOOP
     ------------------------------------------------------------
     NOTE: pakai performance.now() per-closure, BUKAN THREE.Clock.
     Alasan: THREE.Clock di-share via module scope dan kalau ada
     tick chain ganda (sisa HMR Vite atau strict-mode), getDelta()
     dari clock yang sama akan habis dibagi antar caller — dt jadi
     microscopic dan planet tampak diam. performance.now() local
     immune ke masalah itu.
     ============================================================ */
  let lastFrameMs = performance.now();
  const startMs = lastFrameMs;
  let raf;
  function tick() {
    const nowMs = performance.now();
    const dt = Math.min(0.05, (nowMs - lastFrameMs) / 1000); // clamp 50ms biar tidak lompat
    const t = (nowMs - startMs) / 1000;
    lastFrameMs = nowMs;

    /* Calculate dynamic solar system opacity based on transitions from/to Andromeda */
    solarSystemOpacity = 1.0;
    if (cameraTravel) {
      const prog = Math.min(1, cameraTravel.elapsed / cameraTravel.duration);
      const isFromAndromeda = (cameraTravel.fromKey === "andromeda");
      const isToAndromeda = (cameraTravel.dest === "andromeda");
      if (isFromAndromeda && isToAndromeda) {
        solarSystemOpacity = 0.0;
      } else if (isFromAndromeda) {
        // Fade in the solar system as we zoom out of Andromeda (between 35% and 80% progress)
        solarSystemOpacity = Math.max(0, Math.min(1, (prog - 0.35) / 0.45));
      } else if (isToAndromeda) {
        // Fade out the solar system as we zoom into Andromeda (between 30% and 80% progress)
        solarSystemOpacity = Math.max(0, Math.min(1, (1 - prog - 0.30) / 0.50));
      }
    } else if (mode === "travel" && route) {
      const { fromKey, toKey, progress } = route;
      const isFromAndromeda = (fromKey === "andromeda");
      const isToAndromeda = (toKey === "andromeda");
      if (isFromAndromeda && isToAndromeda) {
        solarSystemOpacity = 0.0;
      } else if (isFromAndromeda) {
        solarSystemOpacity = Math.max(0, Math.min(1, (progress - 0.35) / 0.45));
      } else if (isToAndromeda) {
        solarSystemOpacity = Math.max(0, Math.min(1, (1 - progress - 0.30) / 0.50));
      }
    } else {
      if (activeKey === "andromeda") {
        solarSystemOpacity = 0.0;
      }
    }

    // Apply solarSystemOpacity to all registered fading materials
    fadingObjects.forEach((item) => {
      if (item.material) {
        item.material.opacity = item.baseOpacity * solarSystemOpacity;
      }
    });

    // Update lights
    sunLight.intensity = 5.2 * solarSystemOpacity;
    rim.intensity = 0.35 * solarSystemOpacity;

    // Toggle visibility for rendering efficiency
    const showSolar = solarSystemOpacity > 0;
    sunGroup.visible = showSolar;
    beltMain.visible = showSolar;
    beltInner.visible = showSolar;
    Object.values(planetGroups).forEach(g => {
      g.visible = showSolar;
    });
    orbitLines.forEach(l => {
      l.visible = showSolar;
    });

    sunCore.rotation.y += dt * 0.04;
    coronaShells.forEach((s, i) => { s.rotation.y += dt * 0.02 * (i % 2 ? -1 : 1); });
    proms.forEach((s, i) => {
      const breath = 1 + Math.sin(t * 1.5 + i) * 0.08;
      s.scale.setScalar(s.userData.baseScale * breath);
    });

    PLANETS.forEach(p => {
      const g = planetGroups[p.key];

      /* Target: orbit DAN spin di-tween ke Neptune-paced kalau planet
         ini sedang difokuskan kamera. Saat travel ke planet ini, juga
         hitung sebagai focused agar tidak ada lonjakan speed mid-travel
         (planet sebelumnya juga harus tetap slow sementara — handled
         by the speed tween's natural easing). */
      const isFocused =
        (mode === "planet" && activeKey === p.key) ||
        (cameraTravel && cameraTravel.dest === p.key);
      // Freeze the orbital revolution while a planet is focused so its centre
      // stays put and the camera (which tracks it exactly) doesn't sway left and
      // right. The planet still spins on its own axis (targetSpin) so it stays
      // alive. Non-focused planets keep orbiting.
      const targetOrbit = isFocused ? 0 : p.angleSpeed;
      const targetSpin = isFocused ? NEPTUNE_SPIN_SPEED : p.spinSpeed;

      /* Frame-rate independent exponential approach.
         tau = SETTLE_TIME_S / 4 → ~98% settle dalam SETTLE_TIME_S detik. */
      const tau = SETTLE_TIME_S / 4;
      const k = 1 - Math.exp(-dt / tau);
      p.currentSpeed += (targetOrbit - p.currentSpeed) * k;
      p.currentSpin += (targetSpin - p.currentSpin) * k;

      /* Accumulate angle pakai currentSpeed (bukan t * angleSpeed).
         Ini penting agar perubahan speed tidak menyebabkan lompatan posisi. */
      p.angleAccum += dt * p.currentSpeed;

      g.position.x = Math.cos(p.angleAccum) * p.orbit;
      g.position.z = Math.sin(p.angleAccum) * p.orbit;
      g.userData.meshRef.rotation.y += dt * p.currentSpin;
    });
    /* Saturn photo ring: cinematic assembly + orbit + depth-cue.
       Sprites are children of Saturn group → inherit Saturn position
       and depth-test against the planet mesh automatically. */
    if (photoSprites.length) {
      const assembled = saturnAssemblyProgress >= ASSEMBLE_THRESHOLD;
      if (assembled) saturnPhotoRotation += dt * SATURN_PHOTO_SPEED;

      /* Gathered point in photoRingGroup local frame. After R_x(π/2+0.08)
         this maps to a point far from the ring along the saturn-local
         +y axis → cards appear arriving from "above" Saturn (off-screen)
         and dive down to assemble on the ring. */
      const gx = 0, gy = 0, gz = 50;

      const camPos = camera.position;
      const saturnPos = new THREE.Vector3();
      planetGroups.saturn.getWorldPosition(saturnPos);
      const saturnDist = camPos.distanceTo(saturnPos);
      const tmpWp = new THREE.Vector3();
      const N = photoSprites.length;

      photoSprites.forEach((sprite, i) => {
        /* Per-card progress with stagger: card i starts assembling at
           progress (i/N)*STAGGER_TOTAL, completes by 1.0. Easing =
           cubic ease-out approximation of cubic-bezier(0.16, 1, 0.3, 1). */
        const delay = (i / N) * STAGGER_TOTAL;
        let pi = (saturnAssemblyProgress - delay) / (1 - STAGGER_TOTAL);
        pi = Math.max(0, Math.min(1, pi));
        const eased = 1 - Math.pow(1 - pi, 4);

        /* Target ring position. Local XY = ring circle, local Z =
           lift above ring. With photoRingGroup rotated π/2 around X,
           local XY ends up as saturn-local XZ (the ring plane), and
           local -Z becomes saturn-local +Y (above the ring). */
        const angle = sprite.userData.baseAngle + saturnPhotoRotation;
        const tx = Math.cos(angle) * photoRingR;
        const ty = Math.sin(angle) * photoRingR;
        const tz = -SATURN_PHOTO_ABOVE;

        /* Lerp from gathered point → ring target. */
        sprite.position.x = gx + (tx - gx) * eased;
        sprite.position.y = gy + (ty - gy) * eased;
        sprite.position.z = gz + (tz - gz) * eased;

        /* Occlusion: foto yang ada di belakang body Saturn → opacity 0
           (benar-benar hilang, bukan dim). Test geometri:
           1. Project sprite ke ray camera→saturn
           2. Kalau projection > saturnDist (behind saturn) DAN perpendicular
              distance dari ray < SATURN_BODY_R → occluded by saturn body
           3. Smooth fade zone 0.4 unit di tepi supaya transisi halus
           Plus eased factor untuk assembly fade-in. */
        sprite.getWorldPosition(tmpWp);
        const spriteDist = camPos.distanceTo(tmpWp);

        /* Vektor dari camera ke sprite */
        const camToSprite = tmpWp.clone().sub(camPos);
        /* Unit vektor dari camera ke saturn center */
        const camToSaturnDir = saturnPos.clone().sub(camPos).normalize();
        /* Projection panjang sprite-vec onto saturn ray */
        const proj = camToSprite.dot(camToSaturnDir);
        /* Perpendicular component (jarak sprite dari sumbu camera-saturn) */
        const perpVec = camToSprite.clone().sub(camToSaturnDir.multiplyScalar(proj));
        const perpDist = perpVec.length();

        /* "Behind saturn body" test:
           - sprite is past saturn center along the camera ray
           - sprite is within saturn body radius from the camera-saturn axis
           Add small smoothing band so the disappear isn't a hard pop. */
        const behindAmount = proj - saturnDist;            // >0 means past saturn
        const lateralRatio = perpDist / (SATURN_BODY_R + 0.3); // 1.0 at body edge + buffer
        let occlusionVisible = 1;
        if (behindAmount > 0 && lateralRatio < 1) {
          /* Inside saturn shadow cylinder. Fade to 0 over small smoothing band. */
          const lateralFade = Math.min(1, Math.max(0, (1 - lateralRatio) * 2.5));
          /* depthFade ramps 0→1 over first 0.4 units behind saturn */
          const depthFade = Math.min(1, behindAmount / 0.4);
          occlusionVisible = 1 - lateralFade * depthFade;
        }

        /* Ringan depth cue tetap dipertahankan supaya foto di belakang
           tampak sedikit lebih dim (depth perception), tapi tidak agresif. */
        const depthDiff = (spriteDist - saturnDist) / photoRingR;
        const zNorm = Math.max(-1, Math.min(1, -depthDiff));
        const subtleDepthDim = 0.75 + 0.25 * zNorm; // range [0.5, 1.0]

        sprite.material.opacity = subtleDepthDim * occlusionVisible * eased * solarSystemOpacity;

        /* renderOrder by camera distance — far first, near last —
           so transparent sprites paint back-to-front correctly.
           For Saturn depth-sorting: sprites in front of Saturn must render
           after the transparent rings (renderOrder = 0) so they are not
           overlaid by the translucent ring mesh. */
        const isBehind = spriteDist >= saturnDist;
        sprite.renderOrder = isBehind ? (-1000 - spriteDist) : (1000 - spriteDist);
      });
    }

    beltMain.rotation.y += dt * 0.012;
    beltInner.rotation.y -= dt * 0.02;
    starsFar.rotation.y += dt * 0.0008;
    starsMid.rotation.y -= dt * 0.0014;
    starsNear.rotation.y += dt * 0.002;
    andromeda.rotation.z += 0.00012;

    /* comets */
    for (let i = comets.length - 1; i >= 0; i--) {
      const c = comets[i]; c.userData.life += dt;
      c.position.addScaledVector(c.userData.velocity, dt * 30);
      c.material.opacity = Math.max(0, 1 - (c.userData.life / c.userData.maxLife));
      if (c.userData.life >= c.userData.maxLife) {
        scene.remove(c); comets.splice(i, 1); c.material.dispose();
      }
    }
    /* wish stars twinkle */
    wishStars.forEach((s) => {
      s.userData.twinkle += dt * 1.5;
      const m = 0.7 + Math.sin(s.userData.twinkle) * 0.3;
      s.material.opacity = Math.min(s.material.opacity, 1) * 0.97 + (0.85 * m) * 0.03;
    });

    /* RAF camera travel — runs while manualOverride is true. Always
       re-evaluates the destination's lockPosition each frame so the
       camera tracks the (still-orbiting) target planet. */
    if (cameraTravel) {
      cameraTravel.elapsed += dt;
      const t = Math.min(1, cameraTravel.elapsed / cameraTravel.duration);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const tgt = lockPositionFor(cameraTravel.dest);
      if (tgt) {
        camera.position.lerpVectors(cameraTravel.fromPos, tgt.pos, eased);
        currentLook.lerpVectors(cameraTravel.fromLook, tgt.look, eased);
        camera.fov = cameraTravel.fromFov + (tgt.fov - cameraTravel.fromFov) * eased;
        camera.lookAt(currentLook);
        camera.updateProjectionMatrix();
      }
      if (t >= 1) {
        /* Seamless handoff: camera is already at lockPositionFor(dest)
           as of THIS frame, so flipping manualOverride off lets the
           rhythm.js/tick lerp continue without any jump. */
        manualOverride = false;
        activeKey = cameraTravel.dest;
        mode = "planet";
        route = null;
        const r = cameraTravel.resolve;
        cameraTravel = null;
        if (r) r();
      }
    } else {
      updateCameraTargets();
      if (!manualOverride) {
        if (mode === "planet") {
          // Track the planet center exactly, and lerp the relative offset to prevent orbital jitter.
          tmpOffsetTarget.subVectors(desiredPos, desiredLook);
          tmpOffsetCurrent.subVectors(camera.position, desiredLook);
          
          tmpOffsetCurrent.lerp(tmpOffsetTarget, 0.08); // smooth the offset adjustment (resize, zoom, transitions)
          camera.position.addVectors(desiredLook, tmpOffsetCurrent);
          
          currentLook.copy(desiredLook); // center lookAt exactly on the planet to eliminate rotation drift jitter
          camera.lookAt(currentLook);
          
          camera.fov += (desiredFov - camera.fov) * 0.08;
          camera.updateProjectionMatrix();
        } else {
          const lerp = mode === "travel" ? 0.12 : mode === "gate" ? 0.04 : 0.05;
          camera.position.lerp(desiredPos, lerp);
          currentLook.lerp(desiredLook, mode === "travel" ? 0.14 : 0.07);
          camera.lookAt(currentLook);
          camera.fov += (desiredFov - camera.fov) * (mode === "travel" ? 0.12 : 0.05);
          camera.updateProjectionMatrix();
        }
      }
    }

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  tick();

  function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", onResize);

  /* ============================================================
     PUBLIC API
     ============================================================ */
  const api = {
    setActive(key) {
      activeKey = key || "andromeda";
      mode = "planet";
      route = null;
    },
    setRoute(fromKey, toKey, progress) {
      if (!fromKey || !toKey || fromKey === toKey) return;
      if (progress <= 0) { this.setActive(fromKey); return; }
      if (progress >= 1) { this.setActive(toKey); return; }
      mode = "travel"; route = { fromKey, toKey, progress };
    },
    setMode(m) { mode = m; if (m !== "travel") route = null; },
    getMode() { return mode; },

    /* RAF-based cinematic camera travel — every frame retargets to
       the planet's CURRENT position (which is still orbiting), so
       when the travel completes the camera lands exactly where the
       rhythm.js / tick-loop lerp expects it. No "PATAH" handoff jolt
       like a fixed-target GSAP tween would cause.

       Decoupled from page scroll: page Lenis runs fast (~1.4 s) while
       this animation runs longer (~2.6–3.2 s) for the cinematic feel. */
    travelCameraTo(key, duration = 3.0) {
      const target = lockPositionFor(key);
      if (!target) return Promise.resolve();
      return new Promise((resolve) => {
        manualOverride = true;
        mode = "travel";
        cameraTravel = {
          fromKey: activeKey,
          dest: key,
          duration,
          elapsed: 0,
          fromPos: camera.position.clone(),
          fromLook: currentLook.clone(),
          fromFov: camera.fov,
          resolve,
        };
      });
    },

    /* Saturn photo ring: inject the photo list (called by
       SaturnRingPlanet on mount). Each photo becomes a billboard
       sprite parented to Saturn group. Empty array clears them. */
    setSaturnPhotos,

    /* Saturn photo ring: ScrollTrigger-driven assembly progress.
       0 = cards gathered at the start point (off-screen behind Saturn).
       1 = cards fully arranged as the orbiting ring.
       Continuous orbit rotation only kicks in when progress >= ASSEMBLE_THRESHOLD. */
    setSaturnAssemblyProgress(p) {
      saturnAssemblyProgress = Math.max(0, Math.min(1, p || 0));
    },

    /* Project a planet's world position to screen pixels + compute
       its apparent radius. Used by HTML overlays (e.g. Saturn ring
       gallery) that need to anchor themselves to the planet visually. */
    getPlanetScreenInfo(key) {
      const g = planetGroups[key];
      const data = PLANET_MAP[key];
      if (!g || !data) return null;
      const tmp = new THREE.Vector3().copy(g.position);
      tmp.project(camera);
      const w = window.innerWidth, h = window.innerHeight;
      const x = (tmp.x * 0.5 + 0.5) * w;
      const y = (-tmp.y * 0.5 + 0.5) * h;
      const dist = camera.position.distanceTo(g.position);
      const fovY = (camera.fov * Math.PI) / 180;
      const heightAtDist = 2 * Math.tan(fovY / 2) * dist;
      const radiusPx = (data.radius / heightAtDist) * h;
      /* tmp.z in [-1, 1] means inside frustum after projection */
      const inFront = tmp.z > -1 && tmp.z < 1;
      return { x, y, radiusPx, inFront };
    },

    addWishStar,

    destroy() {
      cancelAnimationFrame(raf);
      clearInterval(cometInterval);
      unsubscribeTheme();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("click", onWindowClick);
      /* Free GPU memory: every geometry/material/texture in the graph.
         Without this each visit to a Solary route leaks the full scene
         (planet spheres, starfields, card canvases) until context loss. */
      scene.traverse((obj) => {
        obj.geometry?.dispose?.();
        const mats = Array.isArray(obj.material) ? obj.material : (obj.material ? [obj.material] : []);
        mats.forEach((m) => {
          m.map?.dispose?.();
          m.bumpMap?.dispose?.();
          m.dispose?.();
        });
      });
      renderer.dispose();
      canvas.remove();
      delete window.galacticScene;
    },
  };
  window.galacticScene = api;
  return api;
}
