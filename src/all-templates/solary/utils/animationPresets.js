export const revealVariants = {
  fadeUp:    { from: { opacity: 0, transform: "translateY(24px)" } },
  fadeIn:    { from: { opacity: 0, transform: "none" } },
  fadeLeft:  { from: { opacity: 0, transform: "translateX(-24px)" } },
  fadeRight: { from: { opacity: 0, transform: "translateX(24px)"  } },
  scaleIn:   { from: { opacity: 0, transform: "scale(0.96)" } },
  blurUp:    { from: { opacity: 0, transform: "translateY(16px)", filter: "blur(8px)" } },
};
