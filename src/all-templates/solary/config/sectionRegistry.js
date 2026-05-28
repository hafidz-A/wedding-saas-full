import OpeningGatePlaceholder from "../sections/OpeningGatePlaceholder.jsx";
import WelcomePlanet        from "../sections/WelcomePlanet.jsx";
import StoryPlanet          from "../sections/StoryPlanet.jsx";
import SaturnRingPlanet     from "../sections/SaturnRingPlanet.jsx";
import CountdownPlanet      from "../sections/CountdownPlanet.jsx";
import DetailsPlanet        from "../sections/DetailsPlanet.jsx";
import RSVPPlanet           from "../sections/RSVPPlanet.jsx";
import TeamPlanet           from "../sections/TeamPlanet.jsx";
import GiftPlanet           from "../sections/GiftPlanet.jsx";
import FooterPlanet         from "../sections/FooterPlanet.jsx";

/* Registry: { type → component }. Add new section types here. */
export const sectionRegistry = {
  openingGate:    OpeningGatePlaceholder,
  welcomePlanet:  WelcomePlanet,
  storyPlanet:    StoryPlanet,
  saturnRing:     SaturnRingPlanet,
  countdownPlanet: CountdownPlanet,
  detailsPlanet:  DetailsPlanet,
  rsvpPlanet:     RSVPPlanet,
  teamPlanet:     TeamPlanet,
  giftPlanet:     GiftPlanet,
  footerPlanet:   FooterPlanet,
};
