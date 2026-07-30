"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface AdvancedModeContextType {
  isAdvancedMode: boolean;
  setAdvancedMode: (val: boolean) => void;
  toggleAdvancedMode: () => void;
}

const AdvancedModeContext = createContext<AdvancedModeContextType>({
  isAdvancedMode: false,
  setAdvancedMode: () => {},
  toggleAdvancedMode: () => {},
});

export function AdvancedModeProvider({ children }: { children: ReactNode }) {
  const [isAdvancedMode, setIsAdvancedMode] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("taqdeer_advanced_mode");
      if (stored !== null) {
        setIsAdvancedMode(stored === "true");
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const setAdvancedMode = (val: boolean) => {
    setIsAdvancedMode(val);
    try {
      localStorage.setItem("taqdeer_advanced_mode", String(val));
    } catch {
      // Ignore localStorage errors
    }
  };

  const toggleAdvancedMode = () => {
    setAdvancedMode(!isAdvancedMode);
  };

  return (
    <AdvancedModeContext.Provider
      value={{ isAdvancedMode, setAdvancedMode, toggleAdvancedMode }}
    >
      {children}
    </AdvancedModeContext.Provider>
  );
}

export function useAdvancedMode() {
  return useContext(AdvancedModeContext);
}
