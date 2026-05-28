import React from "react";
import { BlockList } from "../renderers/BlockRenderer.jsx";

export default function StorySection({ section }) {
  return (
    <div className="stack gap-6" style={{ maxWidth: 980, marginInline: "auto" }}>
      <BlockList blocks={section.blocks} section={section} className="stack gap-6" />
    </div>
  );
}
