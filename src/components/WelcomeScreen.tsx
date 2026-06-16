"use client";

import { useState } from "react";
import type { FamilyProfile } from "@/app/page";
import { saveFeedback } from "@/lib/feedbackSurvey";
import type { SavedMealPlan } from "@/lib/savedMealPlans";

type Props = {
  onStart: () => void;
  familyProfile: FamilyProfile | null;
  onContinueWithFamily: () => void;
  onEditFamily: () => void;
  savedPlans: SavedMealPlan[];
  onLoadSavedPlan: (saved: SavedMealPlan) => void;
};

export default function WelcomeScreen({
  onStart,
  familyProfile,
  onContinueWithFamily,
  onEditFamily,
  savedPlans,
  onLoadSavedPlan,
}: Props) {
  const [suggestion, setSuggestion] = useState("");
  const [feedbackThanks, setFeedbackThanks] = useState(false);

  const submitFeedback = (rating: "up" | "down") => {
    saveFeedback(rating, suggestion);
    setFeedbackThanks(true);
    setSuggestion("");
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(160deg, #1a6b55 0%, #0d5c48 55%, #0a4a3a 100%)" }}
    >
      <div className="flex-none h-1" style={{ background: "#c4862a" }} />

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-16 pt-12">
        <div className="animate-fade-in mb-8">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <span className="text-4xl">🌿</span>
          </div>
        </div>

        <div className="animate-fade-in-up delay-100 text-center mb-4">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            FamilyNourish
          </h1>
          <div
            className="mt-2 mx-auto w-16 h-0.5 rounded"
            style={{ background: "#c4862a" }}
          />
        </div>

        <p
          className="animate-fade-in-up delay-200 text-center text-lg leading-relaxed mt-4 max-w-xs"
          style={{ color: "rgba(255,255,255,0.82)" }}
        >
          Feeding your whole family — every need, every week, every budget.
        </p>

        <div className="animate-fade-in-up delay-300 mt-8 w-full max-w-sm">
          <div
            className="rounded-2xl px-4 py-3 mb-4 text-center"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <p className="text-xs font-medium text-white">
              Early preview — Family Profile is not finished yet. More features coming soon.
            </p>
          </div>
        </div>

        <div className="animate-fade-in-up delay-300 mt-4 w-full max-w-sm space-y-3">
          {[
            { icon: "👨‍👩‍👧‍👦", text: "Plans meals for the whole family at once" },
            { icon: "💚", text: "Works around every dietary need" },
            { icon: "🛒", text: "Finds the cheapest basket every week" },
          ].map((item) => (
            <div
              key={item.text}
              className="flex items-center gap-4 px-5 py-4 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              <span className="text-2xl flex-none">{item.icon}</span>
              <span className="text-white text-sm leading-snug">{item.text}</span>
            </div>
          ))}
        </div>

        <div className="animate-fade-in-up delay-400 mt-10 w-full max-w-sm space-y-4">
          {familyProfile ? (
            <div
              className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.12)" }}
            >
              <p className="text-sm font-semibold text-white mb-1">Family profile</p>
              <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.75)" }}>
                {familyProfile.householdName} · {familyProfile.members.length}{" "}
                {familyProfile.members.length === 1 ? "person" : "people"} · $
                {familyProfile.weeklyBudget}/week
              </p>
              <button
                onClick={onContinueWithFamily}
                className="w-full py-4 rounded-2xl text-base font-semibold text-white shadow-lg transition-all active:scale-95 mb-2"
                style={{
                  background: "#c4862a",
                  boxShadow: "0 4px 20px rgba(196,134,42,0.4)",
                }}
              >
                Build this week&apos;s meals
              </button>
              <button
                onClick={onEditFamily}
                className="w-full py-3 rounded-2xl text-sm font-medium text-white"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                Edit family profile
              </button>
            </div>
          ) : (
            <div>
              <button
                onClick={onStart}
                className="w-full py-5 rounded-2xl text-lg font-semibold text-white shadow-lg transition-all active:scale-95"
                style={{
                  background: "#c4862a",
                  boxShadow: "0 4px 20px rgba(196,134,42,0.4)",
                }}
              >
                Set up family profile
              </button>
              <p
                className="text-center mt-4 text-sm"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                One-time setup — your preferences are saved for next week
              </p>
            </div>
          )}

          <div
            className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.12)" }}
          >
            <p className="text-sm font-semibold text-white mb-1">Saved meal plans</p>
            <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.65)" }}>
              Dish names only — separate from your family profile
            </p>
            {savedPlans.length === 0 ? (
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
                No saved meal plans yet.
              </p>
            ) : (
              <div className="space-y-2">
                {savedPlans.slice(0, 4).map((saved) => (
                  <button
                    key={saved.id}
                    onClick={() => onLoadSavedPlan(saved)}
                    className="w-full text-left rounded-xl px-3 py-2 transition-all"
                    style={{ background: "rgba(255,255,255,0.18)" }}
                  >
                    <p className="text-sm font-medium text-white truncate">{saved.name}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
                      {new Date(saved.savedAt).toLocaleDateString()}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div
            className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <p className="text-sm font-semibold text-white mb-2">Quick feedback</p>
            {feedbackThanks ? (
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>
                Thanks — your feedback helps us improve.
              </p>
            ) : (
              <>
                <div className="flex gap-3 mb-3">
                  <button
                    onClick={() => submitFeedback("up")}
                    className="flex-1 py-2 rounded-xl text-sm font-medium"
                    style={{ background: "rgba(255,255,255,0.2)", color: "#ffffff" }}
                  >
                    👍 Helpful
                  </button>
                  <button
                    onClick={() => submitFeedback("down")}
                    className="flex-1 py-2 rounded-xl text-sm font-medium"
                    style={{ background: "rgba(255,255,255,0.2)", color: "#ffffff" }}
                  >
                    👎 Not yet
                  </button>
                </div>
                <textarea
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  placeholder="Any suggestions? (optional)"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl text-sm text-gray-900 resize-none"
                />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-none pb-8 text-center">
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
          Nothing about me without me.
        </p>
      </div>
    </div>
  );
}
