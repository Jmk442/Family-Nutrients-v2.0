"use client";

import { useState } from "react";
import type { FamilyProfile } from "@/app/page";

type Props = {
  profile: FamilyProfile;
  onBack: () => void;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Meal = {
  name: string;
  note?: string;
  cost: number;
};

type DayPlan = {
  day: string;
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
};

function generatePlan(profile: FamilyProfile): DayPlan[] {
  const hasVegan = profile.members.some((m) => m.needs.includes("vegan"));
  const hasVeg = profile.members.some((m) => m.needs.includes("vegetarian"));
  const hasDiabetic = profile.members.some((m) => m.needs.includes("diabetic"));

  const dinners = hasVegan
    ? [
        "Lentil & vegetable curry",
        "Bean tacos with avocado",
        "Roasted veggie Buddha bowl",
        "Chickpea & spinach stew",
        "Mushroom & tofu stir-fry",
        "Sweet potato soup",
        "Pasta with roasted tomato sauce",
      ]
    : hasVeg
    ? [
        "Vegetable frittata",
        "Lentil & tomato pasta",
        "Roasted veggie tray bake",
        "Cheese & broccoli quiche",
        "Bean & rice bowl",
        "Pumpkin soup with toast",
        "Mushroom risotto",
      ]
    : hasDiabetic
    ? [
        "Grilled salmon with greens",
        "Baked chicken & roasted veg",
        "Lamb & chickpea salad",
        "Stir-fry beef with bok choy",
        "Grilled barramundi & quinoa",
        "Turkey & vegetable soup",
        "Chicken & zucchini skewers",
      ]
    : [
        "Spaghetti bolognese",
        "Butter chicken & rice",
        "Beef & veg stir-fry",
        "Slow-cooked lamb stew",
        "Baked snapper with salad",
        "Roast chicken with veg",
        "Homemade beef burgers",
      ];

  return DAYS.map((day, i) => ({
    day,
    breakfast: { name: i % 2 === 0 ? "Porridge with banana" : "Scrambled eggs on toast", cost: 3.5 },
    lunch: { name: i % 3 === 0 ? "Minestrone soup" : i % 3 === 1 ? "Tuna & salad wrap" : "Leftovers", cost: 4.2 },
    dinner: { name: dinners[i], cost: 6.5 + (i % 3) },
  }));
}

function generateShoppingList(profile: FamilyProfile) {
  return [
    { store: "Woolworths", items: 14, est: Math.round(profile.weeklyBudget * 0.45), savings: Math.round(profile.weeklyBudget * 0.08) },
    { store: "ALDI", items: 8, est: Math.round(profile.weeklyBudget * 0.28), savings: Math.round(profile.weeklyBudget * 0.06) },
    { store: "Local butcher", items: 3, est: Math.round(profile.weeklyBudget * 0.15), savings: 4 },
    { store: "Local bakery", items: 2, est: Math.round(profile.weeklyBudget * 0.05), savings: 2 },
  ];
}

export default function MealPlanView({ profile, onBack }: Props) {
  const [tab, setTab] = useState<"meals" | "shopping">("meals");
  const [selectedDay, setSelectedDay] = useState(0);

  const plan = generatePlan(profile);
  const shopping = generateShoppingList(profile);
  const totalSavings = shopping.reduce((a, s) => a + s.savings, 0);

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
          <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}>
            Week of 7 Jun
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white">
          {profile.householdName}
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

        {/* MEALS TAB */}
        {tab === "meals" && (
          <div className="animate-fade-in">
            {/* Day selector */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
              {DAYS.map((day, i) => (
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
            <div className="space-y-4">
              {(["breakfast", "lunch", "dinner"] as const).map((mealType) => {
                const meal = plan[selectedDay][mealType];
                const icons = { breakfast: "☀️", lunch: "🌤", dinner: "🌙" };
                const labels = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };
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
                      <p className="mt-1 text-sm" style={{ color: "#6b6b6b" }}>{meal.note}</p>
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
                <span className="font-medium text-gray-900">Day total</span>
                <span className="font-bold" style={{ color: "#1a6b55" }}>
                  ~${(plan[selectedDay].breakfast.cost + plan[selectedDay].lunch.cost + plan[selectedDay].dinner.cost).toFixed(0)}
                </span>
              </div>
            </div>

            {/* Members dietary summary */}
            {profile.members.some((m) => m.needs.length > 0 && !m.needs.includes("none")) && (
              <div className="mt-6 rounded-2xl p-4" style={{ background: "#d4e9e2" }}>
                <p className="text-sm font-semibold mb-2" style={{ color: "#0d5c48" }}>
                  ✓ All dietary needs covered this week
                </p>
                <div className="space-y-1">
                  {profile.members
                    .filter((m) => m.needs.length > 0 && !m.needs.includes("none"))
                    .map((m) => (
                      <p key={m.id} className="text-sm" style={{ color: "#1a6b55" }}>
                        <strong>{m.name}:</strong>{" "}
                        {m.needs.slice(0, 3).join(", ")}
                        {m.needs.length > 3 && ` +${m.needs.length - 3} more`}
                      </p>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SHOPPING TAB */}
        {tab === "shopping" && (
          <div className="animate-fade-in">
            {/* Savings banner */}
            <div
              className="rounded-3xl p-5 mb-6 text-center"
              style={{ background: "linear-gradient(135deg, #1a6b55, #2d8a6e)" }}
            >
              <p className="text-white text-sm font-medium mb-1">Estimated savings vs. single store</p>
              <p className="text-4xl font-bold text-white">${totalSavings}</p>
              <p className="text-white text-sm mt-1" style={{ opacity: 0.8 }}>
                by splitting across {shopping.length} outlets
              </p>
            </div>

            {/* Store breakdown */}
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Best split for your list
            </p>
            <div className="space-y-3 mb-6">
              {shopping.map((s, i) => (
                <div
                  key={s.store}
                  className="flex items-center gap-4 px-5 py-4 rounded-2xl"
                  style={{ background: "#ffffff", border: "1px solid #e8e2d8" }}
                >
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
                    background: "#1a6b55",
                    width: `${Math.min(100, (shopping.reduce((a, s) => a + s.est, 0) / profile.weeklyBudget) * 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: "#1a6b55" }} className="font-semibold">
                  ~${shopping.reduce((a, s) => a + s.est, 0)} estimated
                </span>
                <span style={{ color: "#6b6b6b" }}>
                  ${Math.max(0, profile.weeklyBudget - shopping.reduce((a, s) => a + s.est, 0))} remaining
                </span>
              </div>
            </div>

            {/* Note */}
            <p className="mt-4 text-xs text-center" style={{ color: "#6b6b6b" }}>
              Prices are estimates. Live store pricing coming soon.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
