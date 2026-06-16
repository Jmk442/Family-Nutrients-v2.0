"use client";

import type { FamilyProfile } from "@/app/page";

const STORAGE_KEY = "familynourish:family-profile";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isFamilyProfile(value: unknown): value is FamilyProfile {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<FamilyProfile>;
  return (
    typeof record.householdName === "string" &&
    Array.isArray(record.members) &&
    typeof record.weeklyBudget === "number" &&
    typeof record.budgetFlexible === "boolean"
  );
}

export function loadFamilyProfile(): FamilyProfile | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isFamilyProfile(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveFamilyProfile(profile: FamilyProfile): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function clearFamilyProfile(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
