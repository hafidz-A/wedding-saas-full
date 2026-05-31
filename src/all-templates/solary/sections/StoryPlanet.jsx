import React, { useEffect, useState } from "react";
import StoryDesktopExperience from "./story/StoryDesktopExperience.jsx";
import StoryMobileExperience from "./story/StoryMobileExperience.jsx";

/* StoryPlanet — Uranus.
   Router antara desktop pinned dual-panel vs mobile snap carousel.
   Breakpoint: 768px (matches CSS conventions in project). */

const DESKTOP_MQ = "(min-width: 768px) and (min-height: 600px)";

export default function StoryPlanet({
  sectionLabel,
  planetName,
  heading,
  timeline = [],
}) {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia(DESKTOP_MQ).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(DESKTOP_MQ);
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  const ExperienceComponent = isDesktop ? StoryDesktopExperience : StoryMobileExperience;

  return (
    <div className={`story-planet ${isDesktop ? "is-desktop" : "is-mobile"}`}>
      <ExperienceComponent
        sectionLabel={sectionLabel}
        planetName={planetName}
        heading={heading}
        items={timeline}
      />
    </div>
  );
}
