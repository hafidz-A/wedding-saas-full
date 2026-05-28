import TextBlock           from "../blocks/TextBlock.jsx";
import ImageBlock          from "../blocks/ImageBlock.jsx";
import CTAButtonBlock      from "../blocks/CTAButtonBlock.jsx";
import QuoteBlock          from "../blocks/QuoteBlock.jsx";
import SpacerBlock         from "../blocks/SpacerBlock.jsx";
import TimelineBlock       from "../blocks/TimelineBlock.jsx";
import DetailCardsBlock    from "../blocks/DetailCardsBlock.jsx";
import CountdownTimerBlock from "../blocks/CountdownTimerBlock.jsx";
import MasonryGalleryBlock from "../blocks/MasonryGalleryBlock.jsx";
import RSVPFormBlock       from "../blocks/RSVPFormBlock.jsx";
import TeamGridBlock       from "../blocks/TeamGridBlock.jsx";
import GiftInfoBlock       from "../blocks/GiftInfoBlock.jsx";

export const blockRegistry = {
  text:           TextBlock,
  image:          ImageBlock,
  masonryGallery: MasonryGalleryBlock,
  countdownTimer: CountdownTimerBlock,
  rsvpForm:       RSVPFormBlock,
  giftInfo:       GiftInfoBlock,
  teamGrid:       TeamGridBlock,
  timeline:       TimelineBlock,
  detailCards:    DetailCardsBlock,
  cta:            CTAButtonBlock,
  quote:          QuoteBlock,
  spacer:         SpacerBlock,
};
