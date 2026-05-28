import React from "react";
import OpeningGate from "../components/OpeningGate.jsx";

export default function OpeningGatePlaceholder(props) {
  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <OpeningGate {...props} />
    </div>
  );
}
