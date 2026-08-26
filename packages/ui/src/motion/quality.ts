"use client";

import { createContext, useContext } from "react";

export const QualityContext = createContext({ degrade: false });
export function useQuality() {
  return useContext(QualityContext);
}
