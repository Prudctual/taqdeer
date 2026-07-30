"use client";

import React, { useState } from "react";
import { useTheme, ColorPreset, RadiusValue } from "./ThemeContext";

export function StudioCustomizer() {
  const {
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
  } = useTheme();

  const [copied, setCopied] = useState(false);

  if (!customizerOpen) return null;

  const presets: { id: ColorPreset; label: string; bg: string }[] = [
    { id: "rose", label: "Rose", bg: "bg-rose-600" },
    { id: "zinc", label: "Zinc", bg: "bg-zinc-800" },
    { id: "emerald", label: "Emerald", bg: "bg-emerald-600" },
    { id: "blue", label: "Blue", bg: "bg-blue-600" },
    { id: "violet", label: "Violet", bg: "bg-violet-600" },
  ];

  const radii: { id: RadiusValue; label: string }[] = [
    { id: "0.3", label: "0.3" },
    { id: "0.5", label: "0.5" },
    { id: "0.75", label: "0.75" },
    { id: "1.0", label: "1.0" },
  ];

  const handleCopyCode = () => {
    const config = `{
  "theme": "${mode}",
  "preset": "${preset}",
  "radius": "${radius}rem",
  "density": "${density}"
}`;
    navigator.clipboard.writeText(config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed top-20 start-4 z-40 w-72 sm:w-80 rounded-2xl border border-line bg-surface p-4 shadow-2xl modal-enter">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <span className="text-accent text-lg">🎛️</span>
          <div>
            <h3 className="text-sm font-black text-ink">مُخصّص المظهر (Theme Studio)</h3>
            <p className="text-[11px] text-muted">تعديل الألوان والأنماط حياً</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCustomizerOpen(false)}
          className="rounded-lg p-1 text-muted hover:bg-panel hover:text-ink active:scale-95 transition-transform duration-140 cursor-pointer"
        >
          ✕
        </button>
      </div>

      <div className="mt-4 space-y-4 text-xs">
        {/* Color Presets */}
        <div>
          <label className="type-label block mb-2 font-bold text-ink">
            الألوان المستهدفة (Primary Preset)
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className={`flex flex-col items-center gap-1 rounded-xl p-1.5 border transition-transform duration-140 active:scale-95 cursor-pointer ${
                  preset === p.id
                    ? "border-accent bg-panel/70 shadow-xs font-bold"
                    : "border-line bg-surface hover:border-line-strong"
                }`}
              >
                <span className={`h-4 w-4 rounded-full ${p.bg}`} />
                <span className="text-[10px] text-ink">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dark / Light Mode */}
        <div>
          <label className="type-label block mb-2 font-bold text-ink">
            نمط الشاشة (Theme Mode)
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(["light", "dark", "system"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-xl border py-1.5 text-center font-bold transition-transform duration-140 active:scale-95 cursor-pointer ${
                  mode === m
                    ? "border-accent bg-accent text-white shadow-xs"
                    : "border-line bg-panel/50 text-muted hover:text-ink"
                }`}
              >
                {m === "light" ? "☀️ فاتح" : m === "dark" ? "🌙 داكن" : "💻 تلقائي"}
              </button>
            ))}
          </div>
        </div>

        {/* Radius control */}
        <div>
          <label className="type-label block mb-2 font-bold text-ink">
            انحناء الحواف (Border Radius)
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {radii.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRadius(r.id)}
                className={`rounded-xl border py-1 text-center font-semibold transition-transform duration-140 active:scale-95 cursor-pointer ${
                  radius === r.id
                    ? "border-accent bg-panel font-bold text-accent"
                    : "border-line bg-surface text-muted hover:text-ink"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Density control */}
        <div>
          <label className="type-label block mb-2 font-bold text-ink">
            كثافة البيانات (Density)
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {(["compact", "comfortable"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDensity(d)}
                className={`rounded-xl border py-1.5 text-center font-bold transition-transform duration-140 active:scale-95 cursor-pointer ${
                  density === d
                    ? "border-accent bg-panel text-accent"
                    : "border-line bg-surface text-muted hover:text-ink"
                }`}
              >
                {d === "compact" ? "مكثفة (Opta)" : "مريحة (Visual)"}
              </button>
            ))}
          </div>
        </div>

        {/* Code Export Action */}
        <div className="pt-2 border-t border-line">
          <button
            type="button"
            onClick={handleCopyCode}
            className="w-full rounded-xl bg-ink py-2 text-xs font-bold text-white hover:bg-accent active:scale-[0.98] transition-all duration-140 shadow-xs cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{copied ? "✓ تم نسخ التكوين" : "📋 نسخ إعدادات المظهر"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
