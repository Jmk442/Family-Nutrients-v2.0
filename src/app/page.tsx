"use client";

import { useState } from "react";
import WelcomeScreen from "@/components/WelcomeScreen";
import OnboardingFlow from "@/components/OnboardingFlow";
import MealPlanView from "@/components/MealPlanView";

export type AppScreen = "welcome" | "onboarding" | "mealplan";

export type FamilyMember = {
  id: string;
  name: string;
  role: "adult" | "child" | "grandparent" | "other";
  age?: string;
  needs: string[];
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
        <MealPlanView profile={profile} onBack={() => setScreen("welcome")} />
      )}
    </main>
  );
}
