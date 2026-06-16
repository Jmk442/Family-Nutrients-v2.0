"use client";

import { useState } from "react";
import type { FamilyProfile, FamilyMember } from "@/app/page";

type Props = {
  onComplete: (profile: FamilyProfile) => void;
  initialProfile?: FamilyProfile | null;
};

const DIETARY_NEEDS = [
  { id: "fodmap", label: "FODMAP diet", icon: "🌿" },
  { id: "vegetarian", label: "Vegetarian", icon: "🥦" },
  { id: "vegan", label: "Vegan", icon: "🌱" },
  { id: "highprotein", label: "High protein", icon: "💪" },
  { id: "diabetic", label: "Diabetic-friendly", icon: "🩺" },
  { id: "osteoporosis", label: "High calcium (osteoporosis)", icon: "🦴" },
  { id: "lowsensory", label: "Low-sensory foods", icon: "🤲" },
  { id: "texturemodified", label: "Texture-modified / IDDSI", icon: "🥣" },
  { id: "nutdrinks", label: "Nutrition drinks / PEG", icon: "🧃" },
  { id: "glutenfree", label: "Gluten free", icon: "🌾" },
  { id: "dairyfree", label: "Dairy free", icon: "🥛" },
  { id: "halal", label: "Halal", icon: "☪️" },
  { id: "kosher", label: "Kosher", icon: "✡️" },
  { id: "culturalfoodcalendar", label: "Cultural food calendar", icon: "📅" },
  { id: "allergies", label: "Food allergies", icon: "⚠️" },
  { id: "none", label: "No specific needs", icon: "✅" },
];

const ROLES = [
  { id: "adult", label: "Adult", icon: "🧑" },
  { id: "child", label: "Child", icon: "🧒" },
  { id: "grandparent", label: "Grandparent", icon: "👴" },
  { id: "other", label: "Other", icon: "👤" },
];

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Needs that trigger the attendance question (some members may not eat at home every day)
const COMPLEX_NEEDS = ["texturemodified", "nutdrinks", "fodmap", "diabetic", "allergies"];

// IDDSI levels 0–7 (International Dysphagia Diet Standardisation Initiative)
// Stage 1: display/prompt hint only. Stage 2: clinician-locked enforcement.
const IDDSI_LEVELS = [
  { level: 0, label: "Thin", description: "Normal fluids" },
  { level: 1, label: "Slightly thick", description: "Mildly thickened" },
  { level: 2, label: "Mildly thick", description: "Nectar-like" },
  { level: 3, label: "Moderately thick", description: "Liquidised" },
  { level: 4, label: "Extremely thick / Puréed", description: "Smooth purée" },
  { level: 5, label: "Minced & moist", description: "Small soft lumps" },
  { level: 6, label: "Soft & bite-sized", description: "Tender pieces" },
  { level: 7, label: "Regular / Easy to chew", description: "Normal foods" },
];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

type Step = "household" | "members" | "member-detail" | "budget" | "done";

export default function OnboardingFlow({ onComplete, initialProfile = null }: Props) {
  const [step, setStep] = useState<Step>("household");
  const [householdName, setHouseholdName] = useState(initialProfile?.householdName ?? "");
  const [members, setMembers] = useState<FamilyMember[]>(initialProfile?.members ?? []);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [showAttendance, setShowAttendance] = useState(false);
  const [weeklyBudget, setWeeklyBudget] = useState(initialProfile?.weeklyBudget ?? 200);
  const [budgetFlexible, setBudgetFlexible] = useState(initialProfile?.budgetFlexible ?? false);

  const addMember = () => {
    const m: FamilyMember = {
      id: uid(),
      name: "",
      role: "adult",
      age: "",
      needs: [],
      attendanceDays: [],
    };
    setEditingMember(m);
    setShowAttendance(false);
    setStep("member-detail");
  };

  const saveMember = () => {
    if (!editingMember || !editingMember.name.trim()) return;
    // Empty attendanceDays means "all 7 days" — normalise
    const memberToSave: FamilyMember = {
      ...editingMember,
      attendanceDays: editingMember.attendanceDays?.length === 7
        ? []
        : editingMember.attendanceDays,
    };
    setMembers((prev) => {
      const idx = prev.findIndex((m) => m.id === memberToSave.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = memberToSave;
        return next;
      }
      return [...prev, memberToSave];
    });
    setEditingMember(null);
    setStep("members");
  };

  const editMember = (m: FamilyMember) => {
    setEditingMember({ ...m });
    setShowAttendance((m.attendanceDays?.length ?? 0) > 0 && (m.attendanceDays?.length ?? 7) < 7);
    setStep("member-detail");
  };

  const removeMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const toggleAttendanceDay = (day: string) => {
    if (!editingMember) return;
    const current = editingMember.attendanceDays ?? WEEK_DAYS;
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    setEditingMember({ ...editingMember, attendanceDays: next });
  };

  const finish = () => {
    onComplete({
      householdName: householdName.trim() || "Our Family",
      members,
      weeklyBudget,
      budgetFlexible,
    });
  };

  const hasComplexNeeds = (m: FamilyMember) =>
    m.needs.some((n) => COMPLEX_NEEDS.includes(n));

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#faf8f4" }}>
      {/* Progress bar */}
      <div className="h-1 w-full" style={{ background: "#e8e2d8" }}>
        <div
          className="h-full transition-all duration-500"
          style={{
            background: "#1a6b55",
            width:
              step === "household"
                ? "25%"
                : step === "members" || step === "member-detail"
                ? "60%"
                : "90%",
          }}
        />
      </div>

      <div className="flex-1 px-6 py-8 max-w-lg mx-auto w-full">

        {/* STEP: Household name */}
        {step === "household" && (
          <div className="animate-fade-in-up">
            <div className="mb-8">
              <p className="text-sm font-medium mb-1" style={{ color: "#1a6b55" }}>
                Step 1 of 3
              </p>
              <h2 className="text-3xl font-bold text-gray-900 leading-tight">
                Let&apos;s set up<br />your family.
              </h2>
              <p className="mt-3 text-base" style={{ color: "#6b6b6b" }}>
                This only takes a few minutes. We&apos;ll build a meal plan that works for everyone.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What would you like to call your household?{" "}
                  <span style={{ color: "#6b6b6b" }}>(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. The Williams Family"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  className="w-full px-4 py-4 rounded-2xl border text-gray-900 text-base outline-none focus:ring-2"
                  style={{ background: "#ffffff", borderColor: "#ddd6cc" }}
                  onFocus={(e) => (e.target.style.borderColor = "#1a6b55")}
                  onBlur={(e) => (e.target.style.borderColor = "#ddd6cc")}
                />
              </div>
            </div>

            <button
              onClick={() => setStep("members")}
              className="mt-8 w-full py-5 rounded-2xl text-white font-semibold text-base transition-all active:scale-95"
              style={{ background: "#1a6b55" }}
            >
              Continue →
            </button>
          </div>
        )}

        {/* STEP: Members list */}
        {step === "members" && (
          <div className="animate-fade-in-up">
            <div className="mb-6">
              <p className="text-sm font-medium mb-1" style={{ color: "#1a6b55" }}>
                Step 2 of 3
              </p>
              <h2 className="text-3xl font-bold text-gray-900 leading-tight">
                Who&apos;s eating<br />with you?
              </h2>
              <p className="mt-3 text-base" style={{ color: "#6b6b6b" }}>
                Add each person in your household. You can always change this later.
              </p>
            </div>

            {/* Members list */}
            <div className="space-y-3 mb-6">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-4 px-5 py-4 rounded-2xl border"
                  style={{ background: "#ffffff", borderColor: "#e8e2d8" }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-none"
                    style={{ background: "#d4e9e2" }}
                  >
                    {ROLES.find((r) => r.id === m.role)?.icon ?? "👤"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{m.name}</p>
                    <p className="text-sm" style={{ color: "#6b6b6b" }}>
                      {m.role}
                      {m.needs.filter((n) => n !== "none").length > 0 &&
                        ` · ${m.needs.filter((n) => n !== "none").length} dietary need${m.needs.filter((n) => n !== "none").length !== 1 ? "s" : ""}`}
                      {(m.attendanceDays?.length ?? 0) > 0 && (m.attendanceDays?.length ?? 7) < 7 &&
                        ` · ${m.attendanceDays?.length ?? 0} days/week`}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-none">
                    <button
                      onClick={() => editMember(m)}
                      className="text-sm px-3 py-1.5 rounded-xl font-medium"
                      style={{ color: "#1a6b55", background: "#d4e9e2" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removeMember(m.id)}
                      className="text-sm px-3 py-1.5 rounded-xl font-medium"
                      style={{ color: "#c0392b", background: "#fde8e8" }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add member button */}
            <button
              onClick={addMember}
              className="w-full py-4 rounded-2xl border-2 border-dashed font-medium text-base transition-all"
              style={{
                borderColor: "#1a6b55",
                color: "#1a6b55",
                background: "transparent",
              }}
            >
              + Add a family member
            </button>

            {members.length > 0 ? (
              <button
                onClick={() => setStep("budget")}
                className="mt-6 w-full py-5 rounded-2xl text-white font-semibold text-base transition-all active:scale-95"
                style={{ background: "#1a6b55" }}
              >
                Continue →
              </button>
            ) : (
              <p className="mt-4 text-center text-sm" style={{ color: "#6b6b6b" }}>
                Add at least one person to continue.
              </p>
            )}
          </div>
        )}

        {/* STEP: Member detail */}
        {step === "member-detail" && editingMember && (
          <div className="animate-slide-in">
            <button
              onClick={() => {
                setEditingMember(null);
                setStep("members");
              }}
              className="mb-6 flex items-center gap-2 text-sm font-medium"
              style={{ color: "#1a6b55" }}
            >
              ← Back
            </button>

            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingMember.name ? `About ${editingMember.name}` : "New family member"}
            </h2>

            <div className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First name or nickname
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mum, Jake, Gran"
                  value={editingMember.name}
                  onChange={(e) =>
                    setEditingMember({ ...editingMember, name: e.target.value })
                  }
                  className="w-full px-4 py-4 rounded-2xl border text-gray-900 text-base outline-none"
                  style={{ background: "#ffffff", borderColor: "#ddd6cc" }}
                  onFocus={(e) => (e.target.style.borderColor = "#1a6b55")}
                  onBlur={(e) => (e.target.style.borderColor = "#ddd6cc")}
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Who are they?
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r.id}
                      onClick={() =>
                        setEditingMember({ ...editingMember, role: r.id as FamilyMember["role"] })
                      }
                      className="flex flex-col items-center gap-1 py-3 rounded-2xl border text-sm font-medium transition-all"
                      style={{
                        background: editingMember.role === r.id ? "#1a6b55" : "#ffffff",
                        color: editingMember.role === r.id ? "#ffffff" : "#1a1a1a",
                        borderColor: editingMember.role === r.id ? "#1a6b55" : "#ddd6cc",
                      }}
                    >
                      <span className="text-xl">{r.icon}</span>
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Age (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age <span style={{ color: "#6b6b6b" }}>(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 8, 34, 72"
                  value={editingMember.age ?? ""}
                  onChange={(e) =>
                    setEditingMember({ ...editingMember, age: e.target.value })
                  }
                  className="w-full px-4 py-4 rounded-2xl border text-gray-900 text-base outline-none"
                  style={{ background: "#ffffff", borderColor: "#ddd6cc" }}
                  onFocus={(e) => (e.target.style.borderColor = "#1a6b55")}
                  onBlur={(e) => (e.target.style.borderColor = "#ddd6cc")}
                />
              </div>

              {/* Dietary needs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Any dietary needs?
                </label>
                <p className="text-sm mb-3" style={{ color: "#6b6b6b" }}>
                  Select all that apply. You can update this any time.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {DIETARY_NEEDS.map((need) => {
                    const selected = editingMember.needs.includes(need.id);
                    return (
                      <button
                        key={need.id}
                        onClick={() => {
                          const next = selected
                            ? editingMember.needs.filter((n) => n !== need.id)
                            : [...editingMember.needs, need.id];
                          setEditingMember({ ...editingMember, needs: next });
                        }}
                        className="flex items-center gap-2 px-3 py-3 rounded-xl border text-sm text-left transition-all"
                        style={{
                          background: selected ? "#d4e9e2" : "#ffffff",
                          borderColor: selected ? "#1a6b55" : "#ddd6cc",
                          color: selected ? "#0d5c48" : "#1a1a1a",
                          fontWeight: selected ? 600 : 400,
                        }}
                      >
                        <span>{need.icon}</span>
                        <span className="leading-tight">{need.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* IDDSI level selector — shown when texture-modified is selected */}
              {editingMember.needs.includes("texturemodified") && (
                <div
                  className="rounded-2xl px-4 py-4"
                  style={{ background: "#f0f6ff", border: "1px solid #b3cce8" }}
                >
                  <p className="text-sm font-medium mb-1" style={{ color: "#1a4a7a" }}>
                    IDDSI texture level
                    <span
                      className="ml-2 text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "#b3cce8", color: "#1a4a7a" }}
                    >
                      Display only — Stage 1
                    </span>
                  </p>
                  <p className="text-xs mb-3" style={{ color: "#2a5a8a" }}>
                    Select the level recommended by a speech pathologist or dietitian. This is passed to the AI as a planning hint only &mdash; it does not replace professional assessment.
                  </p>
                  <div className="space-y-2">
                    {IDDSI_LEVELS.map(({ level, label, description }) => {
                      const selected = editingMember.iddsiLevel === level;
                      return (
                        <button
                          key={level}
                          onClick={() =>
                            setEditingMember({
                              ...editingMember,
                              iddsiLevel: selected ? undefined : level,
                            })
                          }
                          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border text-left transition-all"
                          style={{
                            background: selected ? "#1a4a7a" : "#ffffff",
                            borderColor: selected ? "#1a4a7a" : "#b3cce8",
                            color: selected ? "#ffffff" : "#1a1a1a",
                          }}
                        >
                          <span
                            className="text-sm font-bold flex-none w-5 text-center"
                            style={{ color: selected ? "#9ac3e8" : "#1a4a7a" }}
                          >
                            {level}
                          </span>
                          <div>
                            <p className="text-sm font-medium leading-tight">{label}</p>
                            <p
                              className="text-xs leading-tight"
                              style={{ color: selected ? "rgba(255,255,255,0.7)" : "#6b6b6b" }}
                            >
                              {description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Professional notes placeholder — display only in Stage 1 */}
              {hasComplexNeeds(editingMember) && (
                <div
                  className="rounded-2xl px-4 py-4"
                  style={{ background: "#faf0e0", border: "1px solid #e8d5a3" }}
                >
                  <p className="text-sm font-medium mb-1" style={{ color: "#7a5500" }}>
                    Professional or clinician notes
                    <span
                      className="ml-2 text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "#e8d5a3", color: "#7a5500" }}
                    >
                      Display only
                    </span>
                  </p>
                  <p className="text-xs mb-2" style={{ color: "#9a7020" }}>
                    Add any notes from a dietitian, speech pathologist, or other professional.
                    These are shown to the AI to help plan meals — they do not replace professional advice.
                  </p>
                  <textarea
                    placeholder="e.g. IDDSI Level 4 minced & moist per SP review June 2025. Supplement: Fortisip Compact x1 with lunch."
                    value={editingMember.professionalNotes ?? ""}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, professionalNotes: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-3 rounded-xl border text-sm text-gray-900 outline-none resize-none"
                    style={{ background: "#ffffff", borderColor: "#e8d5a3" }}
                    onFocus={(e) => (e.target.style.borderColor = "#c4862a")}
                    onBlur={(e) => (e.target.style.borderColor = "#e8d5a3")}
                  />
                </div>
              )}

              {/* Attendance days — show for complex needs or if user opts in */}
              {(hasComplexNeeds(editingMember) || showAttendance) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Which days does {editingMember.name || "this person"} eat at home?
                  </label>
                  <p className="text-xs mb-3" style={{ color: "#6b6b6b" }}>
                    Leave all selected if they eat at home every day.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {WEEK_DAYS.map((day, i) => {
                      const currentDays = editingMember.attendanceDays ?? WEEK_DAYS;
                      const active = currentDays.length === 0
                        ? true
                        : currentDays.includes(day);
                      return (
                        <button
                          key={day}
                          onClick={() => {
                            // If attendanceDays is empty (all days), expand to full list first
                            if ((editingMember.attendanceDays ?? []).length === 0) {
                              const withoutThis = WEEK_DAYS.filter((d) => d !== day);
                              setEditingMember({ ...editingMember, attendanceDays: withoutThis });
                            } else {
                              toggleAttendanceDay(day);
                            }
                          }}
                          className="px-3 py-2 rounded-xl border text-sm font-medium transition-all"
                          style={{
                            background: active ? "#1a6b55" : "#ffffff",
                            color: active ? "#ffffff" : "#1a1a1a",
                            borderColor: active ? "#1a6b55" : "#ddd6cc",
                          }}
                        >
                          {DAY_SHORT[i]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Show attendance toggle for members without complex needs */}
              {!hasComplexNeeds(editingMember) && !showAttendance && (
                <button
                  onClick={() => {
                    setShowAttendance(true);
                    setEditingMember({ ...editingMember, attendanceDays: [...WEEK_DAYS] });
                  }}
                  className="text-sm font-medium"
                  style={{ color: "#1a6b55" }}
                >
                  + They don&apos;t eat at home every day
                </button>
              )}
            </div>

            <button
              onClick={saveMember}
              disabled={!editingMember.name.trim()}
              className="mt-8 w-full py-5 rounded-2xl text-white font-semibold text-base transition-all active:scale-95 disabled:opacity-40"
              style={{ background: "#1a6b55" }}
            >
              Save {editingMember.name || "member"}
            </button>
          </div>
        )}

        {/* STEP: Budget */}
        {step === "budget" && (
          <div className="animate-fade-in-up">
            <div className="mb-8">
              <p className="text-sm font-medium mb-1" style={{ color: "#1a6b55" }}>
                Step 3 of 3
              </p>
              <h2 className="text-3xl font-bold text-gray-900 leading-tight">
                What&apos;s your<br />weekly food budget?
              </h2>
              <p className="mt-3 text-base" style={{ color: "#6b6b6b" }}>
                We use this to find the best value across stores. It&apos;s a guide — you can adjust anytime.
              </p>
            </div>

            <div
              className="rounded-3xl p-6 mb-6"
              style={{ background: "#ffffff", border: "1px solid #e8e2d8" }}
            >
              <div className="text-center mb-6">
                <span className="text-5xl font-bold" style={{ color: "#1a6b55" }}>
                  ${weeklyBudget}
                </span>
                <span className="text-xl ml-1" style={{ color: "#6b6b6b" }}>
                  / week
                </span>
              </div>

              <input
                type="range"
                min={50}
                max={600}
                step={10}
                value={weeklyBudget}
                onChange={(e) => setWeeklyBudget(Number(e.target.value))}
                className="w-full"
              />

              <div className="flex justify-between mt-2 text-xs" style={{ color: "#6b6b6b" }}>
                <span>$50</span>
                <span>$600+</span>
              </div>
            </div>

            <button
              onClick={() => setBudgetFlexible(!budgetFlexible)}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border mb-6 text-left transition-all"
              style={{
                background: budgetFlexible ? "#d4e9e2" : "#ffffff",
                borderColor: budgetFlexible ? "#1a6b55" : "#ddd6cc",
              }}
            >
              <div
                className="w-5 h-5 rounded flex items-center justify-center flex-none"
                style={{
                  background: budgetFlexible ? "#1a6b55" : "#ffffff",
                  border: `2px solid ${budgetFlexible ? "#1a6b55" : "#ddd6cc"}`,
                }}
              >
                {budgetFlexible && (
                  <span className="text-white text-xs font-bold">✓</span>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">This is flexible</p>
                <p className="text-sm" style={{ color: "#6b6b6b" }}>
                  Show me options outside this range if they&apos;re much better value
                </p>
              </div>
            </button>

            <button
              onClick={finish}
              className="w-full py-5 rounded-2xl text-white font-semibold text-lg transition-all active:scale-95 shadow-lg"
              style={{
                background: "#1a6b55",
                boxShadow: "0 4px 20px rgba(26,107,85,0.3)",
              }}
            >
              Build my family&apos;s meal plan 🌿
            </button>

            <p className="text-center mt-4 text-sm" style={{ color: "#6b6b6b" }}>
              Your first plan is ready in seconds.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
