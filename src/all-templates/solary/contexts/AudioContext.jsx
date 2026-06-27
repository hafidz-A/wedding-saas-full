import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";

const Ctx = createContext(null);

/**
 * Background-audio provider. Plays an uploaded MP3 via <Audio>.
 *
 * CRITICAL: acceptMusic calls el.play() SYNCHRONOUSLY inside the user click
 * handler call-stack. Using setTimeout/useEffect to defer play() loses the
 * user-gesture context on iOS/Android, causing the browser to reject playback.
 */
export function AudioProvider({ src, youtubeId: _youtubeId, defaultVolume = 0.45, children }) {
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

  // Called directly from MusicPopup's onClick — stays in user gesture stack.
  const acceptMusic = useCallback(() => {
    setEnabled(true);
    setMuted(false);
    const el = ref.current;
    if (!el) return;
    el.muted = false;
    el.play().catch(() => { /* autoplay blocked */ });
  }, []);

  const declineMusic = useCallback(() => {
    setEnabled(false);
    const el = ref.current;
    if (el) try { el.pause(); } catch {}
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      const el = ref.current;
      if (el) {
        // "Mute" pauses so currentTime freezes; "unmute" resumes from that exact
        // point (the browser keeps currentTime across pause).
        if (next) el.pause();
        else { el.muted = false; el.play().catch(() => {}); }
      }
      return next;
    });
  }, []);

  const value = {
    enabled,
    muted,
    acceptMusic,
    declineMusic,
    toggleMute,
    hasAudio: !!src,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAudio = () => useContext(Ctx);

