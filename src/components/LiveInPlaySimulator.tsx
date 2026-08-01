"use client";

import React, { useState, useEffect } from "react";
import { ProbBar } from "./ProbBar";

interface LiveInPlaySimulatorProps {
  initialLambdaHome?: number;
  initialLambdaAway?: number;
  homeNameAr?: string;
  awayNameAr?: string;
  isFinished?: boolean;
}

export function LiveInPlaySimulator({
  initialLambdaHome = 1.45,
  initialLambdaAway = 1.15,
  homeNameAr = "صاحب الأرض",
  awayNameAr = "الضيف",
  isFinished = false,
}: LiveInPlaySimulatorProps) {
  const [minute, setMinute] = useState(0);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [homeRedCards, setHomeRedCards] = useState(0);
  const [awayRedCards, setAwayRedCards] = useState(0);

  const [probs, setProbs] = useState({
    p_home: 0.45,
    p_draw: 0.28,
    p_away: 0.27,
    p_btts_yes: 0.52,
    p_over25: 0.48,
  });

  const [topScores, setTopScores] = useState<
    { score: string; probability: number }[]
  >([]);

  useEffect(() => {
    async function calculateLive() {
      try {
        const res = await fetch("/api/v1/live-inplay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lambda_home: initialLambdaHome,
            lambda_away: initialLambdaAway,
            minute,
            home_score: homeScore,
            away_score: awayScore,
            home_red_cards: homeRedCards,
            away_red_cards: awayRedCards,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setProbs(data.probabilities);
          setTopScores(data.top_scores || []);
        }
      } catch (err) {
        console.error("Live calculation failed:", err);
      }
    }

    calculateLive();
  }, [
    minute,
    homeScore,
    awayScore,
    homeRedCards,
    awayRedCards,
    initialLambdaHome,
    initialLambdaAway,
  ]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 shadow-lg dir-rtl text-right">
      <div className="flex flex-wrap items-center justify-between border-b border-zinc-800/80 pb-3 mb-4 gap-2">
        <div className="flex items-center gap-2">
          {isFinished ? (
            <span className="inline-flex items-center justify-center h-5 px-2 rounded-full bg-raised text-[10px] font-bold text-zinc-300 border border-zinc-700">
              أداة محاكاة
            </span>
          ) : (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
            </span>
          )}
          <div>
            <h3 className="font-semibold text-zinc-100 text-base">
              {isFinished
                ? "محاكي السيناريوهات التفاعلي (In-Play Scenario Simulator)"
                : "محاكي الأحداث الحية أثناء المباراة (Live In-Play Engine)"}
            </h3>
            {isFinished && (
              <p className="text-[11px] text-zinc-400 font-normal">
                اختبر تغير الاحتمالات سيناريوهياً حسب الدقيقة والأهداف والبطاقات
              </p>
            )}
          </div>
        </div>
        <span className="text-xs font-mono text-success bg-success-dim border border-success/40 px-2.5 py-1 rounded-full">
          الدقيقة {minute}&apos;
        </span>
      </div>

      {/* Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Minute Slider */}
        <div className="bg-zinc-900/60 p-3.5 rounded-lg border border-zinc-800/60">
          <label className="text-xs text-zinc-400 font-medium block mb-2">
            دقيقة المباراة: <span className="text-zinc-200 font-mono">{minute}&apos;</span>
          </label>
          <input
            type="range"
            min="0"
            max="90"
            value={minute}
            onChange={(e) => setMinute(parseInt(e.target.value, 10))}
            className="w-full accent-[var(--success)] cursor-pointer bg-raised h-2 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
            <span>0&apos;</span>
            <span>45&apos;</span>
            <span>90&apos;</span>
          </div>
        </div>

        {/* Home Controls */}
        <div className="bg-zinc-900/60 p-3.5 rounded-lg border border-zinc-800/60 space-y-2">
          <div className="text-xs font-medium text-zinc-300 truncate">
            {homeNameAr}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">الأهداف:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setHomeScore(Math.max(0, homeScore - 1))}
                className="w-7 h-7 rounded bg-raised hover:bg-zinc-700 text-zinc-200 font-mono text-sm font-bold transition"
              >
                -
              </button>
              <span className="font-mono text-sm font-bold text-success w-4 text-center">
                {homeScore}
              </span>
              <button
                onClick={() => setHomeScore(homeScore + 1)}
                className="w-7 h-7 rounded bg-raised hover:bg-zinc-700 text-zinc-200 font-mono text-sm font-bold transition"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-zinc-800/40">
            <span className="text-xs text-danger">بطاقات حمراء:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setHomeRedCards(Math.max(0, homeRedCards - 1))}
                className="w-7 h-7 rounded bg-raised hover:bg-zinc-700 text-zinc-200 font-mono text-sm font-bold transition"
              >
                -
              </button>
              <span className="font-mono text-sm font-bold text-danger w-4 text-center">
                {homeRedCards}
              </span>
              <button
                onClick={() => setHomeRedCards(Math.min(2, homeRedCards + 1))}
                className="w-7 h-7 rounded bg-raised hover:bg-zinc-700 text-zinc-200 font-mono text-sm font-bold transition"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Away Controls */}
        <div className="bg-zinc-900/60 p-3.5 rounded-lg border border-zinc-800/60 space-y-2">
          <div className="text-xs font-medium text-zinc-300 truncate">
            {awayNameAr}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">الأهداف:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAwayScore(Math.max(0, awayScore - 1))}
                className="w-7 h-7 rounded bg-raised hover:bg-zinc-700 text-zinc-200 font-mono text-sm font-bold transition"
              >
                -
              </button>
              <span className="font-mono text-sm font-bold text-success w-4 text-center">
                {awayScore}
              </span>
              <button
                onClick={() => setAwayScore(awayScore + 1)}
                className="w-7 h-7 rounded bg-raised hover:bg-zinc-700 text-zinc-200 font-mono text-sm font-bold transition"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-zinc-800/40">
            <span className="text-xs text-danger">بطاقات حمراء:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAwayRedCards(Math.max(0, awayRedCards - 1))}
                className="w-7 h-7 rounded bg-raised hover:bg-zinc-700 text-zinc-200 font-mono text-sm font-bold transition"
              >
                -
              </button>
              <span className="font-mono text-sm font-bold text-danger w-4 text-center">
                {awayRedCards}
              </span>
              <button
                onClick={() => setAwayRedCards(Math.min(2, awayRedCards + 1))}
                className="w-7 h-7 rounded bg-raised hover:bg-zinc-700 text-zinc-200 font-mono text-sm font-bold transition"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Probabilities Output */}
      <div className="space-y-4">
        <div>
          <div className="text-xs text-zinc-400 mb-2 flex justify-between">
            <span>الاحتمالات الحية المتوقعة للنهاية:</span>
            <span className="text-success font-mono text-[11px]">
              تحديث رياضي مباشر
            </span>
          </div>
          <ProbBar
            pHome={probs.p_home}
            pDraw={probs.p_draw}
            pAway={probs.p_away}
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="bg-zinc-900/40 border border-zinc-800/60 p-2.5 rounded-lg text-center">
            <span className="text-[11px] text-zinc-400 block">شباك متبادلة (BTTS)</span>
            <span className="font-mono text-sm font-bold text-zinc-100">
              {(probs.p_btts_yes * 100).toFixed(1)}%
            </span>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/60 p-2.5 rounded-lg text-center">
            <span className="text-[11px] text-zinc-400 block">أكثر من 2.5 هدف</span>
            <span className="font-mono text-sm font-bold text-zinc-100">
              {(probs.p_over25 * 100).toFixed(1)}%
            </span>
          </div>

          {topScores.slice(0, 2).map((s, idx) => (
            <div
              key={idx}
              className="bg-zinc-900/40 border border-zinc-800/60 p-2.5 rounded-lg text-center"
            >
              <span className="text-[11px] text-zinc-400 block">
                نتيجة متوقعة #{idx + 1}
              </span>
              <span className="font-mono text-sm font-bold text-success">
                {s.score} <span className="text-[10px] text-zinc-500 font-normal">({(s.probability * 100).toFixed(0)}%)</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
