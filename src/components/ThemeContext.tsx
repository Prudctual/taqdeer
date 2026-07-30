"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ColorPreset = "rose" | "zinc" | "emerald" | "blue" | "violet";
export type RadiusValue = "0.3" | "0.5" | "0.75" | "1.0";
export type DensityValue = "compact" | "comfortable";

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  preset: ColorPreset;
  setPreset: (preset: ColorPreset) => void;
  radius: RadiusValue;
  setRadius: (radius: RadiusValue) => void;
  density: DensityValue;
  setDensity: (density: DensityValue) => void;
  customizerOpen: boolean;
  setCustomizerOpen: (open: boolean) => void;
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  toggleCustomizer: () => void;
  toggleCommand: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const PRESET_COLORS: Record<ColorPreset, { accent: string; accentHover: string; accentDim: string }> = {
  rose: { accent: "#e11d48", accentHover: "#be123c", accentDim: "#ffe4e6" },
  zinc: { accent: "#18181b", accentHover: "#09090b", accentDim: "#f4f4f5" },
  emerald: { accent: "#059669", accentHover: "#047857", accentDim: "#d1fae5" },
  blue: { accent: "#2563eb", accentHover: "#1d4ed8", accentDim: "#dbeafe" },
  violet: { accent: "#7c3aed", accentHover: "#6d28d9", accentDim: "#ede9fe" },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [preset, setPresetState] = useState<ColorPreset>("rose");
  const [radius, setRadiusState] = useState<RadiusValue>("0.75");
  const [density, setDensityState] = useState<DensityValue>("comfortable");
  const [customizerOpen, setCustomizerOpen] = useState<boolean>(false);
  const [commandOpen, setCommandOpen] = useState<boolean>(false);

  // Load initial values from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem("taqdeer-theme-mode") as ThemeMode | null;
    const savedPreset = localStorage.getItem("taqdeer-theme-preset") as ColorPreset | null;
    const savedRadius = localStorage.getItem("taqdeer-theme-radius") as RadiusValue | null;
    const savedDensity = localStorage.getItem("taqdeer-theme-density") as DensityValue | null;

    if (savedMode) setModeState(savedMode);
    if (savedPreset) setPresetState(savedPreset);
    if (savedRadius) setRadiusState(savedRadius);
    if (savedDensity) setDensityState(savedDensity);
  }, []);

  // Update HTML class & CSS variables when state changes
  useEffect(() => {
    const root = document.documentElement;

    // Mode (Light / Dark)
    if (mode === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      root.setAttribute("data-theme", "dark");
    } else if (mode === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    } else {
      // System
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (isDark) {
        root.classList.add("dark");
        root.classList.remove("light");
        root.setAttribute("data-theme", "dark");
      } else {
        root.classList.add("light");
        root.classList.remove("dark");
        root.setAttribute("data-theme", "light");
      }
    }

    // Color preset
    const colors = PRESET_COLORS[preset] || PRESET_COLORS.rose;
    root.style.setProperty("--accent", colors.accent);
    root.style.setProperty("--accent-hover", colors.accentHover);
    root.style.setProperty("--accent-dim", colors.accentDim);
    root.setAttribute("data-preset", preset);

    // Radius
    root.style.setProperty("--radius", `${radius}rem`);
    root.setAttribute("data-radius", radius);

    // Density
    root.setAttribute("data-density", density);
  }, [mode, preset, radius, density]);

  // Keybindings (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem("taqdeer-theme-mode", newMode);
  };

  const setPreset = (newPreset: ColorPreset) => {
    setPresetState(newPreset);
    localStorage.setItem("taqdeer-theme-preset", newPreset);
  };

  const setRadius = (newRadius: RadiusValue) => {
    setRadiusState(newRadius);
    localStorage.setItem("taqdeer-theme-radius", newRadius);
  };

  const setDensity = (newDensity: DensityValue) => {
    setDensityState(newDensity);
    localStorage.setItem("taqdeer-theme-density", newDensity);
  };

  const toggleCustomizer = () => setCustomizerOpen((prev) => !prev);
  const toggleCommand = () => setCommandOpen((prev) => !prev);

  return (
    <ThemeContext.Provider
      value={{
        mode,
        setMode,
        preset,
        setPreset,
        radius,
        setRadius,
        density,
        setDensity,
        customizerOpen,
        setCustomizerOpen,
        commandOpen,
        setCommandOpen,
        toggleCustomizer,
        toggleCommand,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
