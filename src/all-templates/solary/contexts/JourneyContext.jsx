import React, { createContext, useContext } from "react";

const Ctx = createContext(null);

export function JourneyProvider({ children }) {
  return <Ctx.Provider value={{}}>{children}</Ctx.Provider>;
}

export const useJourney = () => useContext(Ctx);
