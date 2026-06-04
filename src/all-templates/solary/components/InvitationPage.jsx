import React, { useMemo } from "react";
import SectionRenderer from "../renderers/SectionRenderer.jsx";
import FloatingNavbar from "./FloatingNavbar.jsx";
import TravellingOverlay from "./TravellingOverlay.jsx";
import PaletteSwitcher from "./PaletteSwitcher.jsx";
import MuteButton from "./MuteButton.jsx";
import SectionArrows from "./SectionArrows.jsx";

import { ThemeProvider } from "../contexts/ThemeContext.jsx";
import { AudioProvider } from "../contexts/AudioContext.jsx";
import { GuestProvider } from "../contexts/GuestContext.jsx";
import { JourneyProvider } from "../contexts/JourneyContext.jsx";

export default function InvitationPage({ config }) {
  const visible = useMemo(
    () => config.sections.filter((s) => s.enabled !== false),
    [config]
  );
  const allSections = useMemo(
    () => visible.map((s) => ({
      id: s.id,
      planetKey: s.props?.planetKey || s.planet?.key || null,
      planetName: s.props?.planetName || s.planet?.name || s.id,
      navLabel: s.navLabel || s.id,
      navHidden: !!s.navHidden,
    })),
    [visible]
  );
  const slug = config.meta?.slug || "demo";
  const sectionIds = visible.map((s) => s.id);
  // Gate photos double as the floating "photo-stars" scattered behind every
  // non-photo section (see SectionRenderer's PHOTO_BACKED_TYPES).
  const gatePhotos = useMemo(() => {
    const gate = config.sections.find((s) => s.type === "openingGate");
    const photos = gate?.props?.gatePhotos;
    return Array.isArray(photos) ? photos.filter(Boolean) : [];
  }, [config]);

  return (
    <ThemeProvider
      defaultPalette={config.theme?.defaultPalette}
      options={config.theme?.paletteOptions}
    >
      <AudioProvider src={config.audio?.src} defaultVolume={config.audio?.volume ?? 0.5}>
        <GuestProvider>
          <JourneyProvider>
            <FloatingNavbar
              logo={config.meta?.title?.split("—")[0]?.trim() || "Galactic"}
              allSections={allSections}
            />
            <main>
              {visible.map((s) => (
                <SectionRenderer key={s.id} section={s} slug={slug} gatePhotos={gatePhotos} />
              ))}
            </main>
            <TravellingOverlay />
            <PaletteSwitcher />
            <MuteButton />
            <SectionArrows sectionIds={sectionIds} />
          </JourneyProvider>
        </GuestProvider>
      </AudioProvider>
    </ThemeProvider>
  );
}
