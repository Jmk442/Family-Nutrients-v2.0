import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { FamilyProfile } from "@/app/page";

export const maxDuration = 120; // override Next.js default 30s limit

const client = new Anthropic();

// Typed to match MealServingMode in MealPlanView
type MealServingMode =
  | "shared"
  | "shared-base-split-protein"
  | "split-components"
  | "parallel"
  | "separate";

type MemberVariant = {
  memberName: string;
  variant: string;
  preparationNote?: string | null;
};

type MockMeal = {
  name: string;
  note: string;
  cost: number;
  mealServingMode: MealServingMode;
  memberVariants: MemberVariant[];
};

type MockDay = {
  day: string;
  breakfast: MockMeal;
  lunch: MockMeal;
  dinner: MockMeal;
};

const MOCK_PLAN = {
  days: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map((day): MockDay => ({
    day,
    breakfast: {
      name: "Rolled oats with banana and honey",
      note: "Low GI, filling — suits most dietary needs",
      cost: 2,
      mealServingMode: "shared",
      memberVariants: [],
    },
    lunch: {
      name: "Chicken & salad wrap (GF wrap available)",
      note: "Wholegrain or gluten-free wrap depending on needs",
      cost: 5,
      mealServingMode: "split-components",
      memberVariants: [],
    },
    dinner: {
      name: "Roast vegetables with protein of choice",
      note: "Shared roast veg base — protein split per household needs",
      cost: 7,
      mealServingMode: "shared-base-split-protein",
      memberVariants: [],
    },
  })),
  shopping: [
    { store: "Woolworths", items: 22, est: 65, savings: 18, keyItems: ["oats", "chicken", "salad", "honey"] },
    { store: "ALDI", items: 14, est: 38, savings: 12, keyItems: ["frozen veg", "wraps", "rice"] },
  ],
  weeklyTotal: 103,
  nutritionHighlight: "Mock plan — set MOCK_MEAL_PLAN=true in .env.local to enable this mode, or leave unset for live AI.",
  planMeta: {
    planSource: "ai" as const,
    authorityLevel: "flexible" as const,
    generatedAt: new Date().toISOString(),
    auditTrail: ["Mock mode active — no real AI call was made"],
  },
};

async function callWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      const isTransient = status !== undefined && [500, 502, 503, 529].includes(status);
      if (attempt === retries - 1 || !isTransient) throw err;
      await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, attempt)));
    }
  }
  throw new Error("Max retries exceeded");
}

function extractJsonObject(text: string): string {
  let cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }
  return cleaned;
}

function parseMealPlanResponse(text: string): unknown {
  const candidates = [
    text,
    extractJsonObject(text),
  ];

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try next extraction strategy
    }
  }

  throw new Error("JSON parse failed");
}

export async function POST(req: NextRequest) {
  const profile: FamilyProfile = await req.json();

  if (process.env.MOCK_MEAL_PLAN === "true" || !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(MOCK_PLAN);
  }

  if (!profile.members?.length) {
    return NextResponse.json(
      { error: "Add at least one family member in your profile before generating a meal plan." },
      { status: 400 }
    );
  }

  // Build per-member context including which dietary rules are safety-level
  const memberSummaries = profile.members.map((m) => {
    const needsStr = m.needs.length > 0 && !m.needs.includes("none")
      ? m.needs.join(", ")
      : "no specific dietary needs";
    const days = m.attendanceDays && m.attendanceDays.length > 0
      ? ` — eats at home on: ${m.attendanceDays.join(", ")}`
      : "";
    const profNotes = m.professionalNotes ? ` | Professional note: ${m.professionalNotes}` : "";
    const iddsi = m.iddsiLevel !== undefined
      ? ` | IDDSI Level ${m.iddsiLevel} texture-modified meals required`
      : "";
    return `- ${m.name} (${m.role}${m.age ? `, age ${m.age}` : ""}): ${needsStr}${days}${iddsi}${profNotes}`;
  }).join("\n");

  // Identify which members have meat-free requirements (for split logic)
  const vegetarianMembers = profile.members
    .filter((m) => m.needs.includes("vegetarian") || m.needs.includes("vegan"))
    .map((m) => m.name);

  const hasVegetarianAndNonVegetarian =
    vegetarianMembers.length > 0 &&
    vegetarianMembers.length < profile.members.length;

  const splitNote = hasVegetarianAndNonVegetarian
    ? `\nIMPORTANT: This household has both vegetarian/vegan members (${vegetarianMembers.join(", ")}) AND members who eat meat. Do NOT plan meat-free dinners for everyone just because some members are vegetarian. Instead, use mealServingMode "shared-base-split-protein" or "split-components" — e.g. shared roast vegetables, with meat cooked separately for those who eat it, and a vegetarian protein (legumes, tofu, halloumi, eggs) cooked separately for ${vegetarianMembers.join(", ")}. Plate guidance must ensure ${vegetarianMembers.join(", ")} never receives meat or meat-based gravy/stock.`
    : "";

  const prompt = `You are a professional family nutritionist and meal planning specialist.
Create a real, practical 7-day meal plan for an Australian household.

HOUSEHOLD: ${profile.householdName || "the family"}
Weekly food budget: AUD $${profile.weeklyBudget}${profile.budgetFlexible ? " (flexible)" : " (strict)"}

HOUSEHOLD MEMBERS:
${memberSummaries}
${splitNote}

CORE PLANNING PRINCIPLE:
Plan at household level — find the most practical shared approach — but serve at person/plate level.
For each meal, choose the most appropriate serving mode:
- "shared" — everyone eats the same thing (use when safe and practical)
- "shared-base-split-protein" — shared base (e.g. roast veg, pasta, rice) with different protein for different people
- "split-components" — same ingredients, plated/prepared differently (e.g. texture-modified, deconstructed)
- "parallel" — different dishes cooked in parallel (use when needs genuinely cannot be combined)
- "separate" — fully separate meals (only when there is no practical shared component)

Do not default every meal to "separate" — find shared components wherever safe and practical.
Do not apply one person's restriction to the whole household unless it is a genuine household choice.

DIETARY SAFETY RULES — these are non-negotiable:
- IDDSI/texture-modified: Food MUST be at the correct IDDSI level for that person. Note in memberVariants.
- PEG feeding/nutrition drinks: Include feeding schedule alongside regular meals for others.
- Diabetic-friendly: Low GI, controlled carbs, no added sugar.
- FODMAP: No onion, garlic, wheat, most dairy, high-fructose fruits.
- Vegan: Absolutely no animal products — not even stock, gelatin, or dairy.
- Vegetarian: No meat or fish.
- Gluten-free: No wheat, barley, or rye — note GF alternatives.
- Halal/Kosher: Follow requirements strictly.
- High calcium/osteoporosis: Include calcium-rich foods at each meal for that person.
- Low-sensory: Plain, mild flavours, consistent textures, no strong smells.
- Food allergies: Treat as safety-level constraints.

COST: Estimate realistic AUD per-serve costs. Budget: $${profile.weeklyBudget}/week for ${profile.members.length} person(s).
Cost must not override allergies, safety needs, clinician-set instructions, cultural/religious requirements,
vegetarian/vegan requirements, sensory needs, or IDDSI/texture needs.

SHOPPING LIST: Split intelligently across:
1. Woolworths (pantry staples, produce, dairy, specialty items)
2. ALDI (bulk items, frozen, cheaper alternatives)
3. Local butcher (if any members eat meat)
4. Specialty/health food (if FODMAP, GF, nutrition drinks, etc.)

MEMBER VARIANTS: For each member who needs a plate adaptation (different preparation, different protein,
texture-modified version, supplement alongside, etc.), include a memberVariants entry.
If a member eats the same as everyone else without adaptation, do not include them in memberVariants.

AUDIT TRAIL: Include 3–6 short sentences describing the main decisions you made in planning this week
(e.g. which needs drove which choices, how you handled conflicts, which meals use split proteins).

Respond ONLY with a valid JSON object in this exact structure (no markdown, no code fences, no explanation):
{
  "days": [
    {
      "day": "Monday",
      "breakfast": {
        "name": "string",
        "note": "string or null",
        "cost": number,
        "mealServingMode": "shared|shared-base-split-protein|split-components|parallel|separate",
        "memberVariants": [
          {
            "memberName": "string",
            "variant": "string — what is different for this person",
            "preparationNote": "string or null — specific prep instruction"
          }
        ]
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
      "keyItems": ["string"]
    }
  ],
  "weeklyTotal": number,
  "nutritionHighlight": "One sentence summarising how this plan meets every person's needs",
  "planMeta": {
    "planSource": "ai",
    "authorityLevel": "flexible",
    "generatedAt": "ISO 8601 date string",
    "auditTrail": ["string", "string", "string"]
  }
}`;

  try {
    let lastRaw = "";
    let plan: unknown;
    const tokenLimits = [16000, 24000];

    for (let attempt = 0; attempt < tokenLimits.length; attempt++) {
      const maxTokens = tokenLimits[attempt];
      const message = await callWithRetry(() =>
        client.messages.create({
          model: "claude-opus-4-8",
          max_tokens: maxTokens,
          thinking: { type: "adaptive" },
          output_config: { effort: "medium" },
          messages: [{ role: "user", content: prompt }],
        })
      );

      const wasTruncated = message.stop_reason === "max_tokens";
      if (wasTruncated) {
        console.error(
          "Meal plan response truncated at max_tokens",
          maxTokens,
          "on attempt",
          attempt + 1
        );
      }

      const textBlock = message.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        if (attempt === tokenLimits.length - 1) {
          return NextResponse.json({ error: "No text response from AI" }, { status: 500 });
        }
        continue;
      }

      lastRaw = textBlock.text;
      try {
        plan = parseMealPlanResponse(lastRaw);
        break;
      } catch {
        console.error(
          "Meal plan JSON parse error on attempt",
          attempt + 1,
          wasTruncated ? "(truncated)" : "",
          "tail:",
          lastRaw.slice(-200)
        );
        if (attempt === tokenLimits.length - 1) {
          return NextResponse.json(
            {
              error: wasTruncated
                ? "Meal plan was too long and got cut off — please try again"
                : "AI returned an unreadable format — please try again",
            },
            { status: 500 }
          );
        }
      }
    }

    if (!plan) {
      return NextResponse.json(
        { error: "AI returned an unreadable format — please try again" },
        { status: 500 }
      );
    }

    return NextResponse.json(plan);
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Meal plan API error:", status, message);
    return NextResponse.json({ error: "Failed to generate meal plan. Please try again." }, { status: 500 });
  }
}
