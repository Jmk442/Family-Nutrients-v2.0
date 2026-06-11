"use client";

import { useState } from "react";
import WelcomeScreen from "@/components/WelcomeScreen";
import OnboardingFlow from "@/components/OnboardingFlow";
import MealPlanView from "@/components/MealPlanView";

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

  return (
    <main className="min-h-screen" style={{ background: "#faf8f4" }}>
      {screen === "welcome" && (
        <WelcomeScreen onStart={() => setScreen("onboarding")} />
      )}
      {screen === "onboarding" && (
        <OnboardingFlow
          onComplete={(p) => {
            setProfile(p);
            setScreen("mealplan");
          }}
        />
      )}
      {screen === "mealplan" && profile && (
        <MealPlanView profile={profile} onBack={() => setScreen("onboarding")} />
      )}
    </main>
  );
}
