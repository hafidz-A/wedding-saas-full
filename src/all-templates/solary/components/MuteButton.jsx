import React from "react";
import { useAudio } from "../contexts/AudioContext.jsx";

export default function MuteButton() {
  const audio = useAudio();
  if (!audio?.hasAudio) return null;

  const isPlaying = audio.enabled === true && !audio.muted;
  const muted = !isPlaying;

  return (
    <button
      className="mute-button"
      aria-label={muted ? "Unmute" : "Mute"}
      onClick={() => (audio.enabled === true ? audio.toggleMute() : audio.acceptMusic())}
      title={muted ? "Unmute music" : "Mute music"}
    >
      {muted
        ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M11 5L6 9H3v6h3l5 4V5Z"/><path d="M16 9l5 6M21 9l-5 6"/></svg>
        : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M11 5L6 9H3v6h3l5 4V5Z"/><path d="M15 9a4 4 0 0 1 0 6"/><path d="M18 7a7 7 0 0 1 0 10"/></svg>}
    </button>
  );
}
