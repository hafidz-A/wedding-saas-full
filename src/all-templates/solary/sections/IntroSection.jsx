import React from "react";
import { BlockList } from "../renderers/BlockRenderer.jsx";

export default function IntroSection({ section }) {
  return (
    <div
      style={{
        minHeight: "calc(100vh - 2 * var(--section-padding-y))",
        display: "grid",
        placeItems: "center",
        textAlign: "center",
      }}
    >
      <BlockList blocks={section.blocks} section={section} className="stack gap-5" />
    </div>
  );
}
