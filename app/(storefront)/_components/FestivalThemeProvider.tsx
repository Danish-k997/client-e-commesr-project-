"use client";

import React, { createContext, useContext } from "react";
import { useActiveFestivalTheme } from "../../lib/api/festivals";
import type { ActiveFestivalThemePayload } from "../../lib/festivals/resolver";

const FestivalThemeContext = createContext<ActiveFestivalThemePayload | null>(null);

export function useFestivalTheme() {
  return useContext(FestivalThemeContext);
}

export default function FestivalThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: theme } = useActiveFestivalTheme();

  const isFestivalActive = Boolean(theme?.isActive && theme.preset !== "DEFAULT");
  const presetKey = isFestivalActive && theme ? theme.preset.toLowerCase() : "default";
  const intensity = theme?.intensity || "balanced";
  const enableDecorations = isFestivalActive ? Boolean(theme?.enableDecorations) : false;
  const enableAnimations = isFestivalActive ? Boolean(theme?.enableAnimations) : false;
  const cssVariables = (theme?.cssVariables || {}) as React.CSSProperties;

  return (
    <FestivalThemeContext.Provider value={theme || null}>
      <div
        data-festival-theme={presetKey}
        data-festival-intensity={intensity}
        data-festival-decorations={enableDecorations ? "true" : "false"}
        data-festival-animations={enableAnimations ? "true" : "false"}
        data-festival-active={isFestivalActive ? "true" : "false"}
        style={cssVariables}
        className="festival-root-provider contents"
      >
        {children}
      </div>
    </FestivalThemeContext.Provider>
  );
}
