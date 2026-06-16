"use client";

const STORAGE_KEY = "familynourish:saved-meal-plans";

export type SavedDayNames = {
  day: string;
  breakfast: string;
  lunch: string;
  dinner: string;
};

export type SavedMealPlan = {
  id: string;
  name: string;
  householdLabel: string;
  savedAt: string;
  days: SavedDayNames[];
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function parseSavedMealPlans(raw: string | null): SavedMealPlan[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is SavedMealPlan => {
      if (!entry || typeof entry !== "object") return false;
      const record = entry as Partial<SavedMealPlan>;
      return (
        typeof record.id === "string" &&
        typeof record.name === "string" &&
        typeof record.householdLabel === "string" &&
        typeof record.savedAt === "string" &&
        Array.isArray(record.days)
      );
    });
  } catch {
    return [];
  }
}

export function loadSavedMealPlans(): SavedMealPlan[] {
  if (!canUseStorage()) return [];
  return parseSavedMealPlans(window.localStorage.getItem(STORAGE_KEY));
}

export function saveMealPlan(record: SavedMealPlan): SavedMealPlan[] {
  if (!canUseStorage()) return [];
  const current = loadSavedMealPlans();
  const next = [record, ...current.filter((item) => item.id !== record.id)];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function deleteSavedMealPlan(id: string): SavedMealPlan[] {
  if (!canUseStorage()) return [];
  const next = loadSavedMealPlans().filter((item) => item.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
