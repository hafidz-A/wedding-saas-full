import React, { createContext, useContext, useMemo } from "react";
import { readGuestName, readPreviewMode } from "../utils/guestName.js";

const Ctx = createContext({ name: null, preview: false });

export function GuestProvider({ children }) {
  const value = useMemo(
    () => ({ name: readGuestName(), preview: readPreviewMode() }),
    []
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useGuest = () => useContext(Ctx);
