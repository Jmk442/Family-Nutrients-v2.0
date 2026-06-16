"use client";

import { useEffect, useState } from "react";
import WelcomeScreen from "@/components/WelcomeScreen";
import OnboardingFlow from "@/components/OnboardingFlow";
import MealPlanView from "@/components/MealPlanView";
import { loadFamilyProfile, saveFamilyProfile } from "@/lib/familyProfile";
import { loadSavedMealPlans, type SavedMealPlan } from "@/lib/savedMealPlans";

export type AppScreen = "welcome" | "onboarding" | "mealplan";

// Plan provenance — who/what created or locked a plan or instruction
export type PlanSource = "ai" | "manual" | "template" | "professional";

// How much authority a plan or field carries
// flexible  → AI suggestion or user choice, freely editable
// safety    → flagged as important but not clinician-locked
// clinicianLocked → set by a professional, display-only in Stage 1
export type AuthorityLevel = "flexible" | "safety" | "clinicianLocked";

// Placeholder for future professional-plan records (Stage 2+)
// In Stage 1 these are display-only / note fields — not enforced by the app
export type SafetyFlag = {
  flagId: string;
  label: string;
  source: PlanSource;
  authorityLevel: AuthorityLevel;
  notes?: string;
  reviewDate?: string;
  requiresProfessionalConfirmation?: boolean;
};

export type FamilyMember = {
  id: string;
  name: string;
  role: "adult" | "child" | "grandparent" | "other";
  age?: string;
  needs: string[];
  // Which days of the week this person eats at home (all 7 if absent)
  attendanceDays?: string[];
  // Locked/display-only placeholders for Stage 1 — not enforced by AI yet
  safetyFlags?: SafetyFlag[];
  professionalNotes?: string;
  // IDDSI texture level 0–7 (International Dysphagia Diet Standardisation Initiative)
  // Stage 1: display/prompt hint only — not clinician-locked
  iddsiLevel?: number;
};

export type FamilyProfile = {
  members: FamilyMember[];
  weeklyBudget: number;
  budgetFlexible: boolean;
  householdName: string;
};

export default function Home() {
  const [screen, setScreen] = useState<AppScreen>("welcome");
  const [profile, setProfile] = useState<FamilyProfile | null>(null);
  const [savedPlans, setSavedPlans] = useState<SavedMealPlan[]>([]);
  const [savedFamilyProfile, setSavedFamilyProfile] = useState<FamilyProfile | null>(null);
  const [selectedSavedPlan, setSelectedSavedPlan] = useState<SavedMealPlan | null>(null);

  useEffect(() => {
    if (screen === "welcome") {
      setSavedPlans(loadSavedMealPlans());
      setSavedFamilyProfile(loadFamilyProfile());
    }
  }, [screen]);

  const goToMealPlan = (p: FamilyProfile, savedPlan: SavedMealPlan | null = null) => {
    setProfile(p);
    setSelectedSavedPlan(savedPlan);
    setScreen("mealplan");
  };

  const continueWithFamily = () => {
    const family = loadFamilyProfile();
    if (!family) return;
    goToMealPlan(family);
  };

  const loadSavedFromHome = (saved: SavedMealPlan) => {
    const family = loadFamilyProfile();
    if (family) {
      goToMealPlan(family, saved);
      return;
    }
    goToMealPlan(
      {
        members: [],
        weeklyBudget: 0,
        budgetFlexible: false,
        householdName: saved.householdLabel || "Saved Plan",
      },
      saved,
    );
  };

  return (
    <main className="min-h-screen" style={{ background: "#faf8f4" }}>
      {screen === "welcome" && (
        <WelcomeScreen
          onStart={() => setScreen("onboarding")}
          familyProfile={savedFamilyProfile}
          onContinueWithFamily={continueWithFamily}
          onEditFamily={() => setScreen("onboarding")}
          savedPlans={savedPlans}
          onLoadSavedPlan={loadSavedFromHome}
        />
      )}
      {screen === "onboarding" && (
        <OnboardingFlow
          initialProfile={savedFamilyProfile ?? profile}
          onComplete={(p) => {
            saveFamilyProfile(p);
            setSavedFamilyProfile(p);
            goToMealPlan(p);
          }}
        />
      )}
      {screen === "mealplan" && profile && (
        <MealPlanView
          profile={profile}
          initialSavedPlan={selectedSavedPlan}
          onBack={() => setScreen("welcome")}
        />
      )}
    </main>
  );
}
