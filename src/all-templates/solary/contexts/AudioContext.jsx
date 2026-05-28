import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";

const Ctx = createContext(null);

export function AudioProvider({ src, defaultVolume = 0.45, children }) {
  const ref = useRef(null);
  const [enabled, setEnabled] = useState(null); // null = undecided; true/false after popup
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!src) return;
    const el = new Audio(src);
    el.loop = true;
    el.volume = defaultVolume;
    el.preload = "auto";
    ref.current = el;
    return () => { try { el.pause(); } catch {} ref.current = null; };
  }, [src, defaultVolume]);

  const play = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = muted;
    el.play().catch(() => { /* autoplay blocked — must come from a user gesture */ });
  }, [muted]);

  const stop = useCallback(() => {
    const el = ref.current;
    if (el) try { el.pause(); } catch {}
  }, []);

  const acceptMusic = useCallback(() => {
    setEnabled(true);
    setMuted(false);
    setTimeout(play, 0);
  }, [play]);

  const declineMusic = useCallback(() => {
    setEnabled(false);
    stop();
  }, [stop]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      const el = ref.current;
      if (el) el.muted = next;
      if (!next && enabled) play();
      return next;
    });
  }, [enabled, play]);

  const value = { enabled, muted, acceptMusic, declineMusic, toggleMute, hasAudio: !!src };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAudio = () => useContext(Ctx);
