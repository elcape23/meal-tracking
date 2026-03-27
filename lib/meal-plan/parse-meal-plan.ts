import { addDays, format, nextDay, parse } from "date-fns";

import { normalizeImportText } from "@/lib/meal-plan/normalize-import";
import type { ParsedMealPlan, ParsedMealPlanEntry } from "@/types/database";

const dayPattern =
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
const titlePattern = /(?:meal plan|plan|menu)\s*[:\-]\s*(.+)/i;

function inferDateForDayName(dayName: string, baseDate = new Date()) {
  const dayIndex = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday"
  ].indexOf(dayName.toLowerCase());

  if (dayIndex < 0) {
    return null;
  }

  const target = nextDay(addDays(baseDate, -1), dayIndex as 0 | 1 | 2 | 3 | 4 | 5 | 6);
  return format(target, "yyyy-MM-dd");
}

function tryParseDate(text: string) {
  const candidates = ["MMMM d yyyy", "MMMM d", "MMM d", "yyyy-MM-dd", "M/d/yyyy", "M/d"];
  for (const candidate of candidates) {
    const parsed = parse(text.trim(), candidate, new Date());
    if (!Number.isNaN(parsed.valueOf())) {
      return format(parsed, "yyyy-MM-dd");
    }
  }
  return null;
}

export function parseMealPlan(rawText: string): ParsedMealPlan {
  const text = normalizeImportText(rawText);
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const warnings: string[] = [];
  const entries: ParsedMealPlanEntry[] = [];

  let currentDateLabel: string | null = null;
  let currentDate: string | null = null;
  let title = "Imported Meal Plan";

  lines.forEach((line, index) => {
    const titleMatch = line.match(titlePattern);
    if (titleMatch?.[1] && title === "Imported Meal Plan") {
      title = titleMatch[1].trim();
    }

    if (dayPattern.test(line)) {
      const dayMatch = line.match(dayPattern);
      currentDateLabel = line;
      currentDate =
        tryParseDate(line.replace(dayPattern, "").replace(/[-:|]/g, " ").trim()) ??
        inferDateForDayName(dayMatch?.[1] ?? line);
      return;
    }

    const lower = line.toLowerCase();
    const lunchIndex = lower.indexOf("lunch");
    const dinnerIndex = lower.indexOf("dinner");

    const parseEntry = (
      mealType: "lunch" | "dinner",
      content: string,
      confidence: "high" | "medium" | "low"
    ) => {
      const recipeName = content
        .replace(/^[:\-\s]+/, "")
        .replace(/\b(notes?|macros?|snacks?|breakfast)\b.*/i, "")
        .trim();

      if (!recipeName) {
        warnings.push(`Line ${index + 1}: detected ${mealType} but could not extract a recipe.`);
        return;
      }

      entries.push({
        id: `${mealType}-${index}`,
        dateLabel: currentDateLabel ?? `Entry ${index + 1}`,
        date: currentDate,
        mealType,
        recipeName,
        confidence
      });
    };

    if (lunchIndex >= 0) {
      const segment = line.slice(lunchIndex + "lunch".length);
      parseEntry("lunch", segment, currentDate ? "high" : "medium");
      return;
    }

    if (dinnerIndex >= 0) {
      const segment = line.slice(dinnerIndex + "dinner".length);
      parseEntry("dinner", segment, currentDate ? "high" : "medium");
      return;
    }
  });

  if (!entries.length) {
    warnings.push("No lunch or dinner entries were parsed. Check whether the PDF contains selectable text.");
  }

  const datedEntries = entries.filter((entry) => entry.date);
  const startDate = datedEntries[0]?.date ?? null;
  const endDate = datedEntries[datedEntries.length - 1]?.date ?? null;

  return {
    title,
    startDate,
    endDate,
    entries,
    warnings,
    rawText: text
  };
}
