"use client";

const STORAGE_KEY = "familynourish:feedback";

export type FeedbackEntry = {
  rating: "up" | "down";
  suggestion?: string;
  savedAt: string;
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function saveFeedback(rating: "up" | "down", suggestion?: string): void {
  if (!canUseStorage()) return;
  const entry: FeedbackEntry = {
    rating,
    suggestion: suggestion?.trim() || undefined,
    savedAt: new Date().toISOString(),
  };
  try {
    const existing = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    const list = Array.isArray(existing) ? existing : [];
    list.push(entry);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-20)));
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([entry]));
  }
}
