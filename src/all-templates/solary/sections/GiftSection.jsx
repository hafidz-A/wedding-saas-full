import React from "react";
import { BlockList } from "../renderers/BlockRenderer.jsx";

export default function GiftSection({ section }) {
  return (
    <div className="stack gap-6" style={{ alignItems: "center", textAlign: "center" }}>
      <BlockList blocks={section.blocks} section={section} className="stack gap-6" />
    </div>
  );
}
