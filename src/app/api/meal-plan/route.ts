import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { FamilyProfile } from "@/app/page";

export const maxDuration = 120; // seconds — override Next.js default 30s limit

const client = new Anthropic();

const MOCK_PLAN = {
  days: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map((day) => ({
    day,
    breakfast: { name: "Rolled oats with banana", note: "Low GI, filling", cost: 2, memberNotes: {} },
    lunch: { name: "Chicken & salad wrap", note: "Wholegrain wrap", cost: 5, memberNotes: {} },
    dinner: { name: "Beef stir-fry with rice", note: "Lean beef, plenty of veg", cost: 7, memberNotes: {} },
  })),
  shopping: [
    { store: "Woolworths", items: 22, est: 65, savings: 18, keyItems: ["oats", "chicken", "rice", "salad"] },
    { store: "ALDI", items: 14, est: 38, savings: 12, keyItems: ["beef mince", "frozen veg", "wraps"] },
  ],
  weeklyTotal: 103,
  nutritionHighlight: "Mock plan — set MOCK_MEAL_PLAN= (empty) in .env.local to use real AI.",
};

export async function POST(req: NextRequest) {
  const profile: FamilyProfile = await req.json();

  const memberSummaries = profile.members.map((m) => {
    const needsStr = m.needs.length > 0 && !m.needs.includes("none")
      ? m.needs.join(", ")
      : "no specific dietary needs";
    return `- ${m.name} (${m.role}${m.age ? `, age ${m.age}` : ""}): ${needsStr}`;
  }).join("\n");

  const prompt = `You are a professional family nutritionist creating a real, practical 7-day meal plan for an Australian family.

Family: ${profile.householdName || "the family"}
Weekly budget: AUD $${profile.weeklyBudget}${profile.budgetFlexible ? " (flexible)" : ""}

Family members and their dietary needs:
${memberSummaries}

Generate a complete 7-day meal plan. For EACH day (Monday through Sunday), provide breakfast, lunch, and dinner.

CRITICAL dietary rules — these are MEDICAL requirements, not preferences:
- IDDSI/texture-modified: Food must be pureed or at the correct IDDSI level. Note this on every meal for that person.
- PEG feeding/nutrition drinks: Include the feeding schedule alongside regular meals for others.
- Diabetic-friendly: Low GI, controlled carbs, no added sugar.
- FODMAP: No onion, garlic, wheat, most dairy, high-fructose fruits.
- Vegan: Absolutely no animal products.
- Vegetarian: No meat or fish.
- Gluten-free: No wheat, barley, rye — note GF alternatives.
- Halal/Kosher: Follow requirements strictly.
- High calcium/osteoporosis: Include calcium-rich foods at each meal.
- Low-sensory: Plain, mild flavours, consistent textures, no strong smells.

COST: Estimate realistic AUD per-serve costs. Budget of $${profile.weeklyBudget}/week feeds ${profile.members.length} person(s).

For the shopping list, split across:
1. Woolworths (pantry staples, produce, dairy)
2. ALDI (bulk items, frozen, cheaper alternatives)
3. Local butcher (if meat-eaters)
4. Specialty/health food (if FODMAP, gluten-free, nutrition drinks etc.)

For each member with IDDSI or complex needs, add a short "preparation note" on their meals.

Respond ONLY with a valid JSON object in this exact structure (no markdown, no explanation):
{
  "days": [
    {
      "day": "Monday",
      "breakfast": {
        "name": "string",
        "note": "string or null",
        "cost": number,
        "memberNotes": {"MemberName": "preparation note or null"}
      },
      "lunch": { same structure },
      "dinner": { same structure }
    }
  ],
  "shopping": [
    {
      "store": "string",
      "items": number,
      "est": number,
      "savings": number,
      "keyItems": ["string", "string", "string"]
    }
  ],
  "weeklyTotal": number,
  "nutritionHighlight": "string — one sentence summarising how the plan meets all dietary needs"
}`;

  if (process.env.MOCK_MEAL_PLAN === "true") {
    return NextResponse.json(MOCK_PLAN);
  }

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Strip any accidental markdown fences
    const raw = textBlock.text.trim().replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

    let plan;
    try {
      plan = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid AI response format", raw }, { status: 500 });
    }

    return NextResponse.json(plan);
  } catch (err) {
    console.error("Meal plan API error:", err);
    return NextResponse.json({ error: "Failed to generate meal plan" }, { status: 500 });
  }
}
