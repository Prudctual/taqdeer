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

type PresetColors = {
  accent: string;
  accentHover: string;
  accentDim: string;
};

/** قيم مختلفة للفاتح/الداكن حتى لا يختفي accent (مثل zinc الأسود على خلفية داكنة) */
const PRESET_COLORS: Record<
  ColorPreset,
  { light: PresetColors; dark: PresetColors }
> = {
  rose: {
    light: {
      accent: "oklch(0.55 0.18 15)",
      accentHover: "oklch(0.48 0.18 15)",
      accentDim: "oklch(0.55 0.18 15 / 0.12)",
    },
    dark: {
      accent: "oklch(0.72 0.14 15)",
      accentHover: "oklch(0.78 0.12 15)",
      accentDim: "oklch(0.72 0.14 15 / 0.16)",
    },
  },
  zinc: {
    light: {
      accent: "oklch(0.28 0.01 250)",
      accentHover: "oklch(0.2 0.01 250)",
      accentDim: "oklch(0.28 0.01 250 / 0.1)",
    },
    dark: {
      accent: "oklch(0.92 0.01 250)",
      accentHover: "oklch(0.98 0.005 250)",
      accentDim: "oklch(0.92 0.01 250 / 0.14)",
    },
  },
  emerald: {
    light: {
      accent: "oklch(0.52 0.12 155)",
      accentHover: "oklch(0.45 0.12 155)",
      accentDim: "oklch(0.52 0.12 155 / 0.12)",
    },
    dark: {
      accent: "oklch(0.74 0.12 155)",
      accentHover: "oklch(0.8 0.1 155)",
      accentDim: "oklch(0.74 0.12 155 / 0.14)",
    },
  },
  blue: {
    light: {
      accent: "oklch(0.55 0.12 245)",
      accentHover: "oklch(0.48 0.13 245)",
      accentDim: "oklch(0.55 0.12 245 / 0.12)",
    },
    dark: {
      accent: "oklch(0.72 0.11 245)",
      accentHover: "oklch(0.78 0.1 245)",
      accentDim: "oklch(0.72 0.11 245 / 0.16)",
    },
  },
  violet: {
    light: {
      accent: "oklch(0.5 0.16 295)",
      accentHover: "oklch(0.44 0.16 295)",
      accentDim: "oklch(0.5 0.16 295 / 0.12)",
    },
    dark: {
      accent: "oklch(0.72 0.12 295)",
      accentHover: "oklch(0.78 0.1 295)",
      accentDim: "oklch(0.72 0.12 295 / 0.16)",
    },
  },
};

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [preset, setPresetState] = useState<ColorPreset>("blue");
  const [radius, setRadiusState] = useState<RadiusValue>("0.75");
  const [density, setDensityState] = useState<DensityValue>("comfortable");
  const [customizerOpen, setCustomizerOpen] = useState<boolean>(false);
  const [commandOpen, setCommandOpen] = useState<boolean>(false);

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

  useEffect(() => {
    const root = document.documentElement;
    const isDark = resolveIsDark(mode);

    if (isDark) {
      root.classList.add("dark");
      root.classList.remove("light");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }

    const colors = PRESET_COLORS[preset]?.[isDark ? "dark" : "light"] ?? PRESET_COLORS.blue.light;
    root.style.setProperty("--accent", colors.accent);
    root.style.setProperty("--accent-hover", colors.accentHover);
    root.style.setProperty("--accent-dim", colors.accentDim);
    root.setAttribute("data-preset", preset);

    root.style.setProperty("--radius", `${radius}rem`);
    root.setAttribute("data-radius", radius);
    root.setAttribute("data-density", density);
  }, [mode, preset, radius, density]);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const root = document.documentElement;
      const isDark = mq.matches;
      root.classList.toggle("dark", isDark);
      root.classList.toggle("light", !isDark);
      root.setAttribute("data-theme", isDark ? "dark" : "light");
      const colors = PRESET_COLORS[preset][isDark ? "dark" : "light"];
      root.style.setProperty("--accent", colors.accent);
      root.style.setProperty("--accent-hover", colors.accentHover);
      root.style.setProperty("--accent-dim", colors.accentDim);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode, preset]);

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
