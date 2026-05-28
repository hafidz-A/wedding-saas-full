import React from "react";
import { BlockList } from "../renderers/BlockRenderer.jsx";

export default function FooterSection({ section }) {
  return (
    <div
      className="stack gap-5"
      style={{
        alignItems: "center",
        textAlign: "center",
        minHeight: "60vh",
        justifyContent: "center",
      }}
    >
      <BlockList blocks={section.blocks} section={section} className="stack gap-5" />
    </div>
  );
}
