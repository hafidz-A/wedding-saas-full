import React from "react";
import AnimatedReveal from "../components/AnimatedReveal.jsx";
import { blockRegistry } from "../config/blockRegistry.js";

export default function BlockRenderer({ block, index = 0, section }) {
  if (!block || block.enabled === false) return null;
  const Component = blockRegistry[block.type];
  if (!Component) {
    console.warn(`[engine] No block component for type="${block.type}"`);
    return (
      <div className="mono faint" style={{ opacity: 0.5, fontSize: 12 }}>
        ⟁ unregistered block type: "{block.type}"
      </div>
    );
  }
  const revealVariant = block.reveal === false ? null : block.revealVariant || "fadeUp";
  const inner = <Component block={block} section={section} index={index} />;
  return revealVariant ? (
    <AnimatedReveal variant={revealVariant} delayIndex={index}>
      {inner}
    </AnimatedReveal>
  ) : (
    inner
  );
}

export function BlockList({ blocks = [], section, className }) {
  return (
    <div className={className}>
      {blocks.map((block, i) => (
        <BlockRenderer
          key={`${block.type}-${i}`}
          block={block}
          index={i}
          section={section}
        />
      ))}
    </div>
  );
}
