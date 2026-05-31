import React, { useEffect, useState } from "react";
import { useAudio } from "../contexts/AudioContext.jsx";
import styles from "./MusicPopup.module.css";

export default function MusicPopup({
  title = "Putar musik latar?",
  subtitle = "Nikmati pengalaman undangan lebih lengkap",
  acceptLabel = "Putar",
  dismissLabel = "Nanti",
  delayMs = 1500,
}) {
  const audio = useAudio();
  const [phase, setPhase] = useState("hidden"); // hidden | shown | done

  useEffect(() => {
    if (!audio?.hasAudio) return undefined;
    const t = setTimeout(() => setPhase((p) => (p === "hidden" ? "shown" : p)), delayMs);
    return () => clearTimeout(t);
  }, [audio?.hasAudio, delayMs]);

  if (!audio?.hasAudio || phase !== "shown") return null;

  return (
    <div className={styles.popup} role="dialog" aria-label="Music permission">
      <span className={styles.icon} aria-hidden="true">♪</span>
      <div className={styles.text}>
        <p className={styles.title}>{title}</p>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>
      <div className={styles.btns}>
        <button
          type="button"
          className={styles.btnDismiss}
          onClick={() => { audio.declineMusic(); setPhase("done"); }}
        >
          {dismissLabel}
        </button>
        <button
          type="button"
          className={styles.btnAccept}
          onClick={() => { audio.acceptMusic(); setPhase("done"); }}
        >
          {acceptLabel}
        </button>
      </div>
    </div>
  );
}
