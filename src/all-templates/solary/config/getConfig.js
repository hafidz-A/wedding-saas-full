/* ============================================================
   getConfig.js — SINGLE ENTRY POINT for invitation config.
   Standalone-first: returns the local pageConfig.
   To make this SaaS-backed later, swap the body of getConfig()
   with: `return fetch(\`/api/invitations/\${slug}\`).then(r=>r.json())`.
   ============================================================ */
import { pageConfig } from "./pageConfig.js";

export async function getConfig(_slug = "demo") {
  return pageConfig;
}

/* For places that need a synchronous read at startup
   (the Three.js scene boots before React renders). */
export function getConfigSync(_slug = "demo") {
  return pageConfig;
}
