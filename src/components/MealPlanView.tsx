"use client";

import { useState, useEffect } from "react";
import type { FamilyProfile } from "@/app/page";

type Props = {
  profile: FamilyProfile;
  onBack: () => void;
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Meal = {
  name: string;
  note?: string | null;
  cost: number;
  memberNotes?: Record<string, string | null>;
};

type DayPlan = {
  day: string;
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
};

type StoreEntry = {
  store: string;
  items: number;
  est: number;
  savings: number;
  keyItems?: string[];
};

type AIPlan = {
  days: DayPlan[];
  shopping: StoreEntry[];
  weeklyTotal: number;
  nutritionHighlight?: string;
};

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div
        className="w-16 h-16 rounded-full mb-6 flex items-center justify-center"
        style={{ background: "rgba(26,107,85,0.1)" }}
      >
        <span className="text-3xl animate-pulse">🌿</span>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Building your family&apos;s plan
      </h2>
      <p className="text-sm" style={{ color: "#6b6b6b" }}>
        Our AI is thinking through every dietary need…
      </p>
      <div className="mt-6 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{
              background: "#1a6b55",
              animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <span className="text-4xl mb-4">⚠️</span>
      <h2 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h2>
      <p className="text-sm mb-6" style={{ color: "#6b6b6b" }}>{message}</p>
      <button
        onClick={onRetry}
        className="px-6 py-3 rounded-2xl font-semibold text-white text-sm"
        style={{ background: "#1a6b55" }}
      >
        Try again
      </button>
    </div>
  );
}

export default function MealPlanView({ profile, onBack }: Props) {
  const [tab, setTab] = useState<"meals" | "shopping">("meals");
  const [selectedDay, setSelectedDay] = useState(0);
  const [plan, setPlan] = useState<AIPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${res.status})`);
      }
      const data: AIPlan = await res.json();
      setPlan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalSavings = plan?.shopping.reduce((a, s) => a + s.savings, 0) ?? 0;
  const totalSpend = plan?.shopping.reduce((a, s) => a + s.est, 0) ?? plan?.weeklyTotal ?? 0;

  const dayPlan = plan?.days[selectedDay];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#faf8f4" }}>

      {/* Header */}
      <div
        className="px-6 pt-12 pb-6"
        style={{ background: "linear-gradient(160deg, #1a6b55, #0d5c48)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="text-sm font-medium"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            ← Back
          </button>
          <span
            className="text-xs px-3 py-1 rounded-full font-medium"
            style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}
          >
            Week of 7 Jun
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white">
          {profile.householdName || "Your family"}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.72)" }}>
          {profile.members.length} {profile.members.length === 1 ? "person" : "people"} · Budget ${profile.weeklyBudget}/week
        </p>

        {/* Tab switcher */}
        <div
          className="mt-5 flex rounded-xl p-1"
          style={{ background: "rgba(255,255,255,0.12)" }}
        >
          {(["meals", "shopping"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all"
              style={{
                background: tab === t ? "#ffffff" : "transparent",
                color: tab === t ? "#1a6b55" : "rgba(255,255,255,0.8)",
              }}
            >
              {t === "meals" ? "🍽 Meal plan" : "🛒 Shopping"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 max-w-lg mx-auto w-full">

        {loading && <LoadingSpinner />}

        {!loading && error && (
          <ErrorView message={error} onRetry={fetchPlan} />
        )}

        {!loading && plan && (

          <>
            {/* MEALS TAB */}
            {tab === "meals" && (
              <div>
                {/* Nutrition highlight */}
                {plan.nutritionHighlight && (
                  <div
                    className="rounded-2xl px-4 py-3 mb-5 text-sm"
                    style={{ background: "#d4e9e2", color: "#0d5c48" }}
                  >
                    ✓ {plan.nutritionHighlight}
                  </div>
                )}

                {/* Day selector */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
                  {DAY_SHORT.map((day, i) => (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(i)}
                      className="flex-none flex flex-col items-center gap-1 px-4 py-3 rounded-2xl text-sm font-medium transition-all"
                      style={{
                        background: selectedDay === i ? "#1a6b55" : "#ffffff",
                        color: selectedDay === i ? "#ffffff" : "#1a1a1a",
                        border: `1px solid ${selectedDay === i ? "#1a6b55" : "#e8e2d8"}`,
                        minWidth: "60px",
                      }}
                    >
                      <span className="font-semibold">{day}</span>
                    </button>
                  ))}
                </div>

                {/* Day meals */}
                {dayPlan && (
                  <div className="space-y-4">
                    {(["breakfast", "lunch", "dinner"] as const).map((mealType) => {
                      const meal = dayPlan[mealType];
                      const icons = { breakfast: "☀️", lunch: "🌤", dinner: "🌙" };
                      const labels = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };
                      const memberNotesEntries = Object.entries(meal.memberNotes ?? {}).filter(
                        ([, v]) => v
                      );
                      return (
                        <div
                          key={mealType}
                          className="rounded-3xl p-5"
                          style={{ background: "#ffffff", border: "1px solid #e8e2d8" }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span>{icons[mealType]}</span>
                              <span className="text-sm font-medium" style={{ color: "#6b6b6b" }}>
                                {labels[mealType]}
                              </span>
                            </div>
                            <span className="text-sm font-medium" style={{ color: "#1a6b55" }}>
                              ~${meal.cost.toFixed(0)}
                            </span>
                          </div>
                          <p className="text-lg font-semibold text-gray-900">{meal.name}</p>
                          {meal.note && (
                            <p className="mt-1 text-sm" style={{ color: "#6b6b6b" }}>
                              {meal.note}
                            </p>
                          )}

                          {/* Per-member preparation notes for complex dietary needs */}
                          {memberNotesEntries.length > 0 && (
                            <div className="mt-3 space-y-1">
                              {memberNotesEntries.map(([name, note]) => (
                                <p key={name} className="text-xs px-2.5 py-1.5 rounded-xl" style={{ background: "#faf0e0", color: "#7a5500" }}>
                                  <strong>{name}:</strong> {note}
                                </p>
                              ))}
                            </div>
                          )}

                          {/* Member badges */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {profile.members.map((m) => (
                              <span
                                key={m.id}
                                className="text-xs px-2.5 py-1 rounded-full font-medium"
                                style={{ background: "#d4e9e2", color: "#0d5c48" }}
                              >
                                ✓ {m.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Day total */}
                    <div
                      className="flex justify-between items-center px-5 py-4 rounded-2xl"
                      style={{ background: "#f0ebe0" }}
                    >
                      <span className="font-medium text-gray-900">
                        {DAYS[selectedDay]} total
                      </span>
                      <span className="font-bold" style={{ color: "#1a6b55" }}>
                        ~${(dayPlan.breakfast.cost + dayPlan.lunch.cost + dayPlan.dinner.cost).toFixed(0)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SHOPPING TAB */}
            {tab === "shopping" && (
              <div>
                {/* Savings banner */}
                <div
                  className="rounded-3xl p-5 mb-6 text-center"
                  style={{ background: "linear-gradient(135deg, #1a6b55, #2d8a6e)" }}
                >
                  <p className="text-white text-sm font-medium mb-1">Estimated savings vs. single store</p>
                  <p className="text-4xl font-bold text-white">${totalSavings}</p>
                  <p className="text-white text-sm mt-1" style={{ opacity: 0.8 }}>
                    by splitting across {plan.shopping.length} outlets
                  </p>
                </div>

                {/* Store breakdown */}
                <p className="text-sm font-semibold text-gray-700 mb-3">Best split for your list</p>
                <div className="space-y-3 mb-6">
                  {plan.shopping.map((s, i) => (
                    <div
                      key={s.store}
                      className="px-5 py-4 rounded-2xl"
                      style={{ background: "#ffffff", border: "1px solid #e8e2d8" }}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-none"
                          style={{ background: "#d4e9e2", color: "#1a6b55" }}
                        >
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{s.store}</p>
                          <p className="text-sm" style={{ color: "#6b6b6b" }}>
                            {s.items} items · saves ~${s.savings}
                          </p>
                        </div>
                        <div className="text-right flex-none">
                          <p className="font-bold text-gray-900">${s.est}</p>
                          <p className="text-xs" style={{ color: "#6b6b6b" }}>est.</p>
                        </div>
                      </div>
                      {s.keyItems && s.keyItems.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {s.keyItems.slice(0, 4).map((item) => (
                            <span
                              key={item}
                              className="text-xs px-2.5 py-1 rounded-full"
                              style={{ background: "#f0ebe0", color: "#6b5a3e" }}
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Budget tracking */}
                <div
                  className="rounded-3xl p-5"
                  style={{ background: "#ffffff", border: "1px solid #e8e2d8" }}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium text-gray-900">Weekly spend</span>
                    <span className="text-sm" style={{ color: "#6b6b6b" }}>
                      Budget: ${profile.weeklyBudget}
                    </span>
                  </div>
                  <div
                    className="h-3 rounded-full overflow-hidden mb-2"
                    style={{ background: "#e8e2d8" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        background: totalSpend > profile.weeklyBudget ? "#c4862a" : "#1a6b55",
                        width: `${Math.min(100, (totalSpend / profile.weeklyBudget) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span
                      style={{ color: totalSpend > profile.weeklyBudget ? "#c4862a" : "#1a6b55" }}
                      className="font-semibold"
                    >
                      ~${totalSpend} estimated
                    </span>
                    <span style={{ color: "#6b6b6b" }}>
                      {totalSpend <= profile.weeklyBudget
                        ? `$${profile.weeklyBudget - totalSpend} remaining`
                        : `$${totalSpend - profile.weeklyBudget} over budget`}
                    </span>
                  </div>
                </div>

                <p className="mt-4 text-xs text-center" style={{ color: "#6b6b6b" }}>
                  Prices are AI estimates based on current Australian supermarket ranges.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
