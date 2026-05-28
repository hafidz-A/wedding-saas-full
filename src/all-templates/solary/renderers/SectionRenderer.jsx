import React from "react";
import { sectionRegistry } from "../config/sectionRegistry.js";

/* Props-based renderer. Each section is rendered as
       <section id={id} data-section={id}>
         <Component {...section.props} slug={meta.slug} />
       </section>
   Hidden sections (`enabled === false`) render nothing.
   Unknown types log a warning and render a tiny placeholder. */
export default function SectionRenderer({ section, slug = "demo" }) {
  if (!section || section.enabled === false) return null;
  const Component = sectionRegistry[section.type];
  if (!Component) {
    console.warn(`[engine] No section component for type="${section.type}" (id=${section.id})`);
    return (
      <section id={section.id} data-section={section.id} style={{ minHeight: "60vh", opacity: 0.5, display: "grid", placeItems: "center" }}>
        <p className="mono faint">⟁ unregistered section type: "{section.type}"</p>
      </section>
    );
  }
  return (
    <section
      id={section.id}
      data-section={section.id}
      data-section-type={section.type}
      style={{ position: "relative", minHeight: "100vh" }}
    >
      <Component {...(section.props || {})} slug={slug} />
    </section>
  );
}
