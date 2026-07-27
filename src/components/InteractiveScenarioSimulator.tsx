"use client";

import { useState } from "react";

interface ScenarioSimulatorProps {
  homeTeam: string;
  awayTeam: string;
  baseHomeP: number;
  baseDrawP: number;
  baseAwayP: number;
  baseLambdaHome: number;
  baseLambdaAway: number;
}

export function InteractiveScenarioSimulator({
  homeTeam,
  awayTeam,
  baseHomeP,
  baseAwayP,
  baseLambdaHome,
  baseLambdaAway,
}: ScenarioSimulatorProps) {
  const [homeAdvantageBonus, setHomeAdvantageBonus] = useState<number>(0);
  const [scenarioGoal, setScenarioGoal] = useState<"neutral" | "home_lead" | "away_lead">("neutral");
  const [weatherCondition, setWeatherCondition] = useState<"dry" | "rain">("dry");

  // Calculate adjusted probabilities based on user interactions
  let deltaHome = homeAdvantageBonus * 0.01;
  let deltaAway = -homeAdvantageBonus * 0.007;

  if (scenarioGoal === "home_lead") {
    deltaHome += 0.15;
    deltaAway -= 0.10;
  } else if (scenarioGoal === "away_lead") {
    deltaAway += 0.16;
    deltaHome -= 0.11;
  }

  if (weatherCondition === "rain") {
    // Wet pitch reduces high-scoring potential and shifts toward draw
    deltaHome -= 0.03;
    deltaAway -= 0.03;
  }

  const rawHome = Math.max(0.05, Math.min(0.90, baseHomeP + deltaHome));
  const rawAway = Math.max(0.05, Math.min(0.90, baseAwayP + deltaAway));
  const rawDraw = Math.max(0.05, 1 - rawHome - rawAway);

  // Normalize
  const total = rawHome + rawDraw + rawAway;
  const pHome = Math.round((rawHome / total) * 100);
  const pAway = Math.round((rawAway / total) * 100);
  const pDraw = 100 - pHome - pAway;

  // Expected goals
  const lambdaHomeSim = Math.max(0.1, Number((baseLambdaHome * (1 + deltaHome)).toFixed(2)));
  const lambdaAwaySim = Math.max(0.1, Number((baseLambdaAway * (1 + deltaAway)).toFixed(2)));

  const topChoice = pHome >= pDraw && pHome >= pAway ? "1" : pDraw >= pHome && pDraw >= pAway ? "X" : "2";

  return (
    <div className="rounded-xl border border-line bg-panel p-4 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
          <h3 className="text-sm font-bold text-ink">محاكي السيناريوهات التفاعلي (Interactive Odds Simulator)</h3>
        </div>
        <span className="text-[11px] font-semibold text-muted bg-zinc-900 px-2.5 py-1 rounded-full border border-zinc-800">
          تعديل ديناميكي مباشر
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Control 1: Home Advantage Slider */}
        <div className="space-y-1.5 rounded-lg border border-line/60 bg-zinc-950/50 p-3">
          <div className="flex justify-between text-xs">
            <span className="font-bold text-zinc-300">تأثير ملحوظ للجمهور</span>
            <span className="font-mono text-blue-400 font-bold">+{homeAdvantageBonus}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="15"
            value={homeAdvantageBonus}
            onChange={(e) => setHomeAdvantageBonus(Number(e.target.value))}
            className="w-full accent-blue-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
          />
          <p className="text-[10px] text-faint">زيادة كفة الضغط الجماهيري لأصحاب الأرض</p>
        </div>

        {/* Control 2: Early Goal Scenario */}
        <div className="space-y-1.5 rounded-lg border border-line/60 bg-zinc-950/50 p-3">
          <span className="block text-xs font-bold text-zinc-300">سيناريو هدف مبكر</span>
          <div className="grid grid-cols-3 gap-1 pt-1">
            <button
              onClick={() => setScenarioGoal("neutral")}
              className={`rounded px-1.5 py-1 text-[11px] font-bold transition-all ${
                scenarioGoal === "neutral"
                  ? "bg-zinc-800 text-white border border-zinc-700 shadow-sm"
                  : "bg-zinc-900/60 text-zinc-400 border border-transparent hover:bg-zinc-800"
              }`}
            >
              متعادل 0-0
            </button>
            <button
              onClick={() => setScenarioGoal("home_lead")}
              className={`rounded px-1.5 py-1 text-[11px] font-bold transition-all ${
                scenarioGoal === "home_lead"
                  ? "bg-blue-600 text-white border border-blue-500 shadow-sm"
                  : "bg-zinc-900/60 text-zinc-400 border border-transparent hover:bg-zinc-800"
              }`}
            >
              هدف {homeTeam}
            </button>
            <button
              onClick={() => setScenarioGoal("away_lead")}
              className={`rounded px-1.5 py-1 text-[11px] font-bold transition-all ${
                scenarioGoal === "away_lead"
                  ? "bg-amber-600 text-white border border-amber-500 shadow-sm"
                  : "bg-zinc-900/60 text-zinc-400 border border-transparent hover:bg-zinc-800"
              }`}
            >
              هدف {awayTeam}
            </button>
          </div>
        </div>

        {/* Control 3: Pitch & Weather Effect */}
        <div className="space-y-1.5 rounded-lg border border-line/60 bg-zinc-950/50 p-3">
          <span className="block text-xs font-bold text-zinc-300">حالة الطقس والأرضية</span>
          <div className="grid grid-cols-2 gap-1 pt-1">
            <button
              onClick={() => setWeatherCondition("dry")}
              className={`rounded px-2 py-1 text-[11px] font-bold transition-all ${
                weatherCondition === "dry"
                  ? "bg-emerald-600 text-white border border-emerald-500 shadow-sm"
                  : "bg-zinc-900/60 text-zinc-400 border border-transparent hover:bg-zinc-800"
              }`}
            >
              🌤️ طقس جاف
            </button>
            <button
              onClick={() => setWeatherCondition("rain")}
              className={`rounded px-2 py-1 text-[11px] font-bold transition-all ${
                weatherCondition === "rain"
                  ? "bg-cyan-600 text-white border border-cyan-500 shadow-sm"
                  : "bg-zinc-900/60 text-zinc-400 border border-transparent hover:bg-zinc-800"
              }`}
            >
              🌧️ أمطار وزلق
            </button>
          </div>
        </div>
      </div>

      {/* Recalculated Output Result */}
      <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between text-xs">
          <span className="font-bold text-blue-300">النتيجة المحاكاة المعدلة ديناميكياً (1X2):</span>
          <span className="font-mono text-zinc-400">
            أهداف متوقعة λ: <strong className="text-white">{homeTeam} {lambdaHomeSim}</strong> - <strong className="text-white">{lambdaAwaySim} {awayTeam}</strong>
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className={`rounded-lg p-2.5 border transition-all ${topChoice === "1" ? "bg-blue-600/20 border-blue-500/60" : "bg-zinc-900/80 border-zinc-800"}`}>
            <span className="block text-[11px] text-muted font-bold">1 · {homeTeam}</span>
            <span className="text-lg font-black text-white">{pHome}%</span>
          </div>

          <div className={`rounded-lg p-2.5 border transition-all ${topChoice === "X" ? "bg-amber-600/20 border-amber-500/60" : "bg-zinc-900/80 border-zinc-800"}`}>
            <span className="block text-[11px] text-muted font-bold">X · التعادل</span>
            <span className="text-lg font-black text-white">{pDraw}%</span>
          </div>

          <div className={`rounded-lg p-2.5 border transition-all ${topChoice === "2" ? "bg-emerald-600/20 border-emerald-500/60" : "bg-zinc-900/80 border-zinc-800"}`}>
            <span className="block text-[11px] text-muted font-bold">2 · {awayTeam}</span>
            <span className="text-lg font-black text-white">{pAway}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
