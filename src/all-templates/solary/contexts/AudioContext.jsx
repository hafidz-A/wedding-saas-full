import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useYouTubePlayer } from "@/lib/music/useYouTubePlayer";

const Ctx = createContext(null);

/**
 * Background-audio provider. Plays either a plain audio URL (upload / direct
 * url / library track) via <Audio>, or a YouTube video via a hidden IFrame
 * player when `youtubeId` is set. Same accept/decline/mute surface either way.
 */
export function AudioProvider({ src, youtubeId, defaultVolume = 0.45, children }) {
  const ref = useRef(null);
  const [enabled, setEnabled] = useState(null); // null = undecided; true/false after popup
  const [muted, setMuted] = useState(false);

  const isYouTube = !!youtubeId;
  const yt = useYouTubePlayer({
    youtubeId: isYouTube ? youtubeId : null,
    loop: true,
    volume: Math.round(defaultVolume * 100),
  });

  useEffect(() => {
    if (isYouTube || !src) return;
    const el = new Audio(src);
    el.loop = true;
    el.volume = defaultVolume;
    el.preload = "auto";
    ref.current = el;
    return () => { try { el.pause(); } catch {} ref.current = null; };
  }, [src, defaultVolume, isYouTube]);

  const play = useCallback(() => {
    if (isYouTube) { yt.unmute(); yt.play(); return; }
    const el = ref.current;
    if (!el) return;
    el.muted = false;
    el.play().catch(() => { /* autoplay blocked — must come from a user gesture */ });
  }, [isYouTube, yt]);

  const stop = useCallback(() => {
    if (isYouTube) { yt.pause(); return; }
    const el = ref.current;
    if (el) try { el.pause(); } catch {}
  }, [isYouTube, yt]);

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
      if (isYouTube) {
        // Pause on mute so the track freezes; resume (unmuted) on unmute.
        if (next) yt.pause();
        else { yt.unmute(); yt.play(); }
        return next;
      }
      const el = ref.current;
      if (el) {
        // "Mute" pauses so currentTime freezes; "unmute" resumes from that exact
        // point (the browser keeps currentTime across pause). Fixes the old bug
        // where play() re-applied a stale muted flag and the track went silent.
        if (next) el.pause();
        else { el.muted = false; el.play().catch(() => {}); }
      }
      return next;
    });
  }, [isYouTube, yt]);

  const value = {
    enabled,
    muted,
    acceptMusic,
    declineMusic,
    toggleMute,
    hasAudio: isYouTube ? !!youtubeId : !!src,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAudio = () => useContext(Ctx);
