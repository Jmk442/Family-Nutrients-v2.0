"use client";

import { useState, useEffect } from "react";
import type { FamilyProfile, PlanSource, AuthorityLevel } from "@/app/page";
import {
  deleteSavedMealPlan,
  loadSavedMealPlans,
  saveMealPlan,
  type SavedDayNames,
  type SavedMealPlan,
} from "@/lib/savedMealPlans";

type Props = {
  profile: FamilyProfile;
  onBack: () => void;
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// How a meal is served across household members
// Used to show appropriate preparation notes and plate instructions
export type MealServingMode =
  | "shared"                    // Everyone eats the same thing
  | "shared-base-split-protein" // Same base (e.g. roast veg), different protein
  | "split-components"          // Same ingredients, plated differently (e.g. texture-modified)
  | "parallel"                  // Different dishes cooked at the same time
  | "separate";                 // Fully separate meals required

// Per-member plate variation — typed replacement for loose memberNotes
type MemberVariant = {
  memberName: string;
  variant: string;
  preparationNote?: string | null;
};

type Meal = {
  name: string;
  note?: string | null;
  cost: number;
  mealServingMode?: MealServingMode;
  memberVariants?: MemberVariant[];
  // Legacy field from Session 2 — still accepted so existing cached plans render
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

// Plan-level provenance metadata
type PlanMeta = {
  planSource: PlanSource;
  authorityLevel: AuthorityLevel;
  generatedAt?: string;
  auditTrail?: string[];
};

type AIPlan = {
  days: DayPlan[];
  shopping: StoreEntry[];
  weeklyTotal: number;
  nutritionHighlight?: string;
  planMeta?: PlanMeta;
};

// Human-readable labels for serving modes
const SERVING_MODE_LABELS: Record<MealServingMode, string> = {
  "shared": "Shared meal",
  "shared-base-split-protein": "Split proteins",
  "split-components": "Split components",
  "parallel": "Parallel dishes",
  "separate": "Separate meals",
};

function ServingModeBadge({ mode }: { mode: MealServingMode }) {
  if (mode === "shared") return null;
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: "#fef3c7", color: "#92400e" }}
    >
      {SERVING_MODE_LABELS[mode]}
    </span>
  );
}

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
        Thinking through every dietary need, every person&hellip;
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

// Merge legacy memberNotes into the typed MemberVariant format so the UI
// only has one code path to render member-level adaptations.
function normaliseMemberVariants(meal: Meal): MemberVariant[] {
  if (meal.memberVariants && meal.memberVariants.length > 0) {
    return meal.memberVariants;
  }
  if (meal.memberNotes) {
    return Object.entries(meal.memberNotes)
      .filter(([, v]) => v)
      .map(([name, note]) => ({ memberName: name, variant: note ?? "" }));
  }
  return [];
}

export default function MealPlanView({ profile, onBack }: Props) {
  const [tab, setTab] = useState<"meals" | "shopping">("meals");
  const [selectedDay, setSelectedDay] = useState(0);
  const [plan, setPlan] = useState<AIPlan | null>(null);
  const [savedPlans, setSavedPlans] = useState<SavedMealPlan[]>([]);
  const [isNamingSave, setIsNamingSave] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
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
        const errData = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(errData.error ?? `Request failed (${res.status})`);
      }
      const data = await res.json() as AIPlan;
      setPlan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Load plan on mount. The IIFE keeps all setState calls inside async callbacks
  // so they never run synchronously within the effect body.
  useEffect(() => {
    void (async () => { await fetchPlan(); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSavedPlans(loadSavedMealPlans());
  }, []);

  const toSavedDayNames = (days: DayPlan[]): SavedDayNames[] =>
    days.map((day) => ({
      day: day.day,
      breakfast: day.breakfast.name,
      lunch: day.lunch.name,
      dinner: day.dinner.name,
    }));

  const startSave = () => {
    if (!plan) return;
    setSaveName(`${profile.householdName || "Family"} plan`);
    setIsNamingSave(true);
    setSaveNotice(null);
  };

  const confirmSave = () => {
    if (!plan) return;
    const trimmedName = saveName.trim();
    if (!trimmedName) return;
    const next = saveMealPlan({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmedName,
      householdLabel: profile.householdName || "Our Family",
      savedAt: new Date().toISOString(),
      days: toSavedDayNames(plan.days),
    });
    setSavedPlans(next);
    setIsNamingSave(false);
    setSaveName("");
    setSaveNotice(`Saved "${trimmedName}"`);
  };

  const loadSavedPlan = (saved: SavedMealPlan) => {
    if (!plan) return;
    const savedMap = new Map(saved.days.map((d) => [d.day, d]));
    const nextDays = plan.days.map((day) => {
      const savedDay = savedMap.get(day.day);
      if (!savedDay) return day;
      return {
        ...day,
        breakfast: { ...day.breakfast, name: savedDay.breakfast },
        lunch: { ...day.lunch, name: savedDay.lunch },
        dinner: { ...day.dinner, name: savedDay.dinner },
      };
    });
    setPlan({ ...plan, days: nextDays });
    setTab("meals");
    setSelectedDay(0);
    setSaveNotice(`Loaded "${saved.name}"`);
  };

  const removeSavedPlan = (id: string) => {
    setSavedPlans(deleteSavedMealPlan(id));
  };

  const totalSavings = plan?.shopping.reduce((acc: number, s: StoreEntry) => acc + s.savings, 0) ?? 0;
  const totalSpend = plan?.shopping.reduce((acc: number, s: StoreEntry) => acc + s.est, 0) ?? plan?.weeklyTotal ?? 0;

  const dayPlan = plan?.days[selectedDay];

  // Members who are attending on the selected day
  const attendingMembers = profile.members.filter((m) => {
    if (!m.attendanceDays || m.attendanceDays.length === 0) return true;
    return m.attendanceDays.includes(DAYS[selectedDay]);
  });

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
            7-day plan
          </span>
        </div>
        {plan && (
          <div className="mb-4">
            {!isNamingSave ? (
              <button
                onClick={startSave}
                className="text-xs px-3 py-1.5 rounded-full font-semibold"
                style={{ background: "rgba(255,255,255,0.2)", color: "#ffffff" }}
              >
                Save plan
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Plan name"
                  className="flex-1 px-3 py-2 rounded-lg text-sm text-gray-900"
                />
                <button
                  onClick={confirmSave}
                  disabled={!saveName.trim()}
                  className="px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-40"
                  style={{ background: "#ffffff", color: "#1a6b55" }}
                >
                  Save
                </button>
                <button
                  onClick={() => setIsNamingSave(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: "rgba(255,255,255,0.15)", color: "#ffffff" }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
        <h1 className="text-2xl font-bold text-white">
          {profile.householdName || "Your family"}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.72)" }}>
          {profile.members.length} {profile.members.length === 1 ? "person" : "people"} · Budget ${profile.weeklyBudget}/week
        </p>

        {/* Plan source indicator */}
        {plan?.planMeta && (
          <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
            {plan.planMeta.planSource === "ai" ? "AI-generated · " : ""}
            {plan.planMeta.authorityLevel === "flexible" ? "Flexible plan" : plan.planMeta.authorityLevel}
          </p>
        )}

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
        {saveNotice && (
          <p className="mt-3 text-xs" style={{ color: "rgba(255,255,255,0.82)" }}>
            {saveNotice}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 max-w-lg mx-auto w-full">

        {loading && <LoadingSpinner />}

        {!loading && error && (
          <ErrorView message={error} onRetry={fetchPlan} />
        )}

        {!loading && plan && (

          <>
            <details className="mb-5 rounded-2xl bg-white border border-[#e8e2d8]">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-800">
                Saved plans ({savedPlans.length})
              </summary>
              <div className="px-4 pb-4 space-y-2">
                {savedPlans.length === 0 ? (
                  <p className="text-xs" style={{ color: "#6b6b6b" }}>
                    No saved plans yet.
                  </p>
                ) : (
                  savedPlans.map((saved) => (
                    <div
                      key={saved.id}
                      className="rounded-xl border px-3 py-2 flex items-center gap-3"
                      style={{ borderColor: "#e8e2d8" }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{saved.name}</p>
                        <p className="text-xs" style={{ color: "#6b6b6b" }}>
                          {new Date(saved.savedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => loadSavedPlan(saved)}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium"
                        style={{ background: "#d4e9e2", color: "#0d5c48" }}
                      >
                        Load
                      </button>
                      <button
                        onClick={() => removeSavedPlan(saved.id)}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium"
                        style={{ background: "#fde8e8", color: "#c0392b" }}
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            </details>
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

                {/* Audit trail — collapsed, for transparency */}
                {plan.planMeta?.auditTrail && plan.planMeta.auditTrail.length > 0 && (
                  <details className="mb-4">
                    <summary
                      className="text-xs cursor-pointer font-medium"
                      style={{ color: "#6b6b6b" }}
                    >
                      How this plan was built ({plan.planMeta.auditTrail.length} decisions)
                    </summary>
                    <ul className="mt-2 space-y-1 pl-3">
                      {plan.planMeta.auditTrail.map((entry, i) => (
                        <li key={i} className="text-xs" style={{ color: "#6b6b6b" }}>
                          · {entry}
                        </li>
                      ))}
                    </ul>
                  </details>
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
                      const variants = normaliseMemberVariants(meal);
                      // Members who have a specific variant listed
                      const variantMemberNames = new Set(variants.map((v) => v.memberName));

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
                              {meal.mealServingMode && (
                                <ServingModeBadge mode={meal.mealServingMode} />
                              )}
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

                          {/* Per-member plate variations */}
                          {variants.length > 0 && (
                            <div className="mt-3 space-y-1.5">
                              {variants.map((v) => (
                                <div
                                  key={v.memberName}
                                  className="text-xs px-3 py-2 rounded-xl"
                                  style={{ background: "#faf0e0", color: "#7a5500" }}
                                >
                                  <span className="font-semibold">{v.memberName}:</span>{" "}
                                  {v.variant}
                                  {v.preparationNote && (
                                    <span className="block mt-0.5 opacity-75">
                                      Prep: {v.preparationNote}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Member attendance badges */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {attendingMembers.map((m) => {
                              const hasVariant = variantMemberNames.has(m.name);
                              return (
                                <span
                                  key={m.id}
                                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                                  style={{
                                    background: hasVariant ? "#fef3c7" : "#d4e9e2",
                                    color: hasVariant ? "#92400e" : "#0d5c48",
                                  }}
                                >
                                  {hasVariant ? "⚑" : "✓"} {m.name}
                                </span>
                              );
                            })}
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

      {/* Safety disclaimer — persistent footer */}
      <div
        className="px-6 py-3 text-center"
        style={{ borderTop: "1px solid #e8e2d8" }}
      >
        <p className="text-xs" style={{ color: "#9b9b9b" }}>
          This app does not diagnose. It does not replace dietitians, clinicians, support coordinators, or plan managers. It supports organisation and documentation of agreed routines.
        </p>
      </div>
    </div>
  );
}
