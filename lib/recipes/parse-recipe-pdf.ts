import { normalizeImportText } from "@/lib/meal-plan/normalize-import";
import type { MealType, ParsedRecipeImport, RecipeIngredient } from "@/types/database";

const CLIPBOARD_PREFIX = "__MEAL_TRACKING_RECIPE__";
const SECTION_BREAK = /\b(instructions|method|preparation|directions|steps|procedimiento)\b/i;
const INGREDIENTS_BREAK = /\b(ingredients|ingredient list|ingredientes)\b/i;
const NUTRITION_BREAK = /\b(informaci[oó]n nutricional|resumen nutricional|carbohidratos|prote[ií]nas|grasas|total energético|total)\b/i;
const POWER_NUTRITION_BREAK = /\b(power nutrition|diseño de receta saludable|rediseño de legibilidad|fuente reorganizada para mejorar lectura rápida)/i;

function detectMealType(text: string): MealType {
  const lower = text.toLowerCase();
  const hasLunch = /\blunch\b|almuerzo/.test(lower);
  const hasDinner = /\bdinner\b|cena/.test(lower);

  if (hasLunch && hasDinner) {
    return "both";
  }
  if (hasLunch) {
    return "lunch";
  }
  if (hasDinner) {
    return "dinner";
  }
  return "both";
}

function extractSection(text: string, startPattern: RegExp, endPattern?: RegExp) {
  const startMatch = text.match(startPattern);
  if (!startMatch?.index && startMatch?.index !== 0) {
    return "";
  }

  const startIndex = startMatch.index + startMatch[0].length;
  const remaining = text.slice(startIndex).trim();

  if (!endPattern) {
    return remaining;
  }

  const endMatch = remaining.match(endPattern);
  if (!endMatch?.index && endMatch?.index !== 0) {
    return remaining;
  }

  return remaining.slice(0, endMatch.index).trim();
}

function isMetaLine(line: string) {
  return (
    !line ||
    NUTRITION_BREAK.test(line) ||
    POWER_NUTRITION_BREAK.test(line) ||
    /^(rinde|calor[ií]as|tiempo|notas sobre la fuente)$/i.test(line) ||
    /^\d+\s*(porci[oó]n|porciones)$/i.test(line) ||
    /^\d+[.,]?\d*\s*kcal$/i.test(line) ||
    /^[•●]$/.test(line)
  );
}

function guessTitle(lines: string[]) {
  const redesignIndex = lines.findIndex((line) => /rediseño de legibilidad/i.test(line));
  if (redesignIndex >= 0) {
    const titleParts = lines
      .slice(redesignIndex + 1)
      .filter((line) => !isMetaLine(line))
      .slice(1, 4);
    if (titleParts.length) {
      return titleParts.join(" ");
    }
  }

  const title = lines.find((line) => {
    const lower = line.toLowerCase();
    return (
      line.length > 3 &&
      !INGREDIENTS_BREAK.test(lower) &&
      !SECTION_BREAK.test(lower) &&
      !/^\d+$/.test(line) &&
      !isMetaLine(line) &&
      !/^(ingredientecantidad)$/i.test(line)
    );
  });

  return title ?? "Imported Recipe";
}

function cleanTitle(title: string) {
  return title
    .replace(/\s*\+\s*mitad del plato\s*/i, " + mitad del plato ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanIngredientName(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/[—–-]+\s*$/u, "")
    .replace(/\b(crudo|cocido|medida casera|acciones)\b.*$/i, "")
    .replace(/\s*,\s*/g, ", ")
    .trim()
    .replace(/,\s*(crudo|fresco)$/i, "")
    .trim();
}

function splitCompactIngredientName(value: string) {
  const match = value.match(
    /^(.+?)(?=\d+[.,]?\d*\s*(?:kg|g|mg|ml|l)\b|\d+\s*(?:unidad|unidades|u\.)\b|cantidad necesaria\b|a gusto\b)/i
  );

  return match?.[1]?.trim() || value;
}

function parseIngredientLine(line: string): RecipeIngredient | null {
  const normalized = line.replace(/\s+/g, " ").trim();
  if (!normalized || /^(ingredientecantidad|ingredientes)$/i.test(normalized)) {
    return null;
  }

  const directMatch = normalized.match(/^(.+?)(\d+[.,]?\d*)\s*(kg|g|mg|ml|l)(.*)$/i);
  if (directMatch) {
    return {
      name: cleanIngredientName(directMatch[1]),
      quantity: directMatch[2].replace(",", "."),
      unit: directMatch[3].toLowerCase(),
      note: directMatch[4].trim() || null
    };
  }

  const quantityUnitMatch = normalized.match(/(\d+[.,]?\d*)\s*(kg|g|mg|ml|l)\b/i);
  const quantity = quantityUnitMatch?.[1]?.replace(",", ".") ?? "";
  const unit = quantityUnitMatch?.[2]?.toLowerCase() ?? "";
  const head = splitCompactIngredientName(normalized);
  const name = cleanIngredientName(head);

  let note = normalized
    .replace(head, "")
    .replace(/^\s*[-—–]?\s*/, "")
    .replace(/(\d+[.,]?\d*)\s*(kg|g|mg|ml|l)\b/i, "")
    .trim();

  if (!note) {
    const altUnitMatch = normalized.match(/\b(\d+\s*(unidad|unidades|u\.))\b/i);
    note = altUnitMatch?.[1] ?? "";
  }

  if (/^a gusto$/i.test(note) || /^cantidad necesaria$/i.test(note)) {
    return {
      name,
      quantity: "",
      unit: "",
      note
    };
  }

  return name
    ? {
        name,
        quantity,
        unit,
        note: note || null
      }
    : null;
}

function parsePowerNutritionIngredients(section: string) {
  const normalized = section
    .replace(/Ver:.*$/im, "")
    .replace(/IngredienteCrudoCocidoMedida caseraAcciones/gi, "")
    .replace(//g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  const rawLines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        !/^(ingredientes|ver:|ingredientecrudococidomedida caseraacciones|ingredientecantidad)$/i.test(line) &&
        !POWER_NUTRITION_BREAK.test(line) &&
        !NUTRITION_BREAK.test(line)
    );

  const lineItems = rawLines
    .map(parseIngredientLine)
    .filter((item): item is RecipeIngredient => Boolean(item));

  if (lineItems.length > 1) {
    return lineItems;
  }

  const compactMatches = [
    ...normalized.matchAll(
      /([A-Za-zÁÉÍÓÚÜÑáéíóúüñ,()/+\- ]+?)(\d+[.,]?\d*)\s*(kg|g|mg|ml|l)\b([^.\n]*)/g
    )
  ]
    .map((match) => ({
      name: cleanIngredientName(match[1]),
      quantity: match[2].replace(",", "."),
      unit: match[3].toLowerCase(),
      note: match[4]?.trim() || null
    }))
    .filter((item) => item.name && !/^(ingredientecantidad)$/i.test(item.name));

  return compactMatches;
}

function parseGenericIngredients(section: string) {
  return section
    .split("\n")
    .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const parsed = parseIngredientLine(line);
      return (
        parsed ?? {
          name: line,
          quantity: "",
          unit: "",
          note: null
        }
      );
    })
    .filter((item) => !/^(ingredientecantidad)$/i.test(item.name));
}

function getDescription(lines: string[], title: string) {
  const titleIndex = lines.indexOf(title);
  const candidates = lines
    .slice(Math.max(titleIndex + 1, 1), Math.min(titleIndex + 6, lines.length))
    .filter(
      (line) =>
        !INGREDIENTS_BREAK.test(line) &&
        !SECTION_BREAK.test(line) &&
        !isMetaLine(line) &&
        !/^\d+\s*(porci[oó]n|porciones|min|kcal)$/i.test(line) &&
        !/^(rinde|calor[ií]as|tiempo|\+\s*mitad del plato)/i.test(line)
    );

  return candidates.join(" ").replace(/\s{2,}/g, " ").trim().slice(0, 240);
}

function parseStructuredClipboardImport(rawText: string): ParsedRecipeImport | null {
  if (!rawText.trim().startsWith(CLIPBOARD_PREFIX)) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawText.trim().slice(CLIPBOARD_PREFIX.length)) as Partial<ParsedRecipeImport> & {
      ingredients?: Partial<RecipeIngredient>[];
      rawText?: string;
    };

    return {
      title: String(parsed.title ?? "Imported Recipe").trim() || "Imported Recipe",
      mealType:
        parsed.mealType === "lunch" || parsed.mealType === "dinner" || parsed.mealType === "both"
          ? parsed.mealType
          : "both",
      description: String(parsed.description ?? "").trim(),
      ingredients: Array.isArray(parsed.ingredients)
        ? parsed.ingredients
            .map((ingredient) => ({
              name: String(ingredient?.name ?? "").trim(),
              quantity: String(ingredient?.quantity ?? "").trim(),
              unit: String(ingredient?.unit ?? "").trim(),
              note: String(ingredient?.note ?? "").trim() || null
            }))
            .filter(
              (ingredient) =>
                ingredient.name &&
                !/^(ingrediente|cantidad|qty|unit|unidad|crudo|cocido|medida casera|acciones?)$/i.test(
                  ingredient.name
                )
            )
        : [],
      instructions: String(parsed.instructions ?? "").trim(),
      warnings: [],
      rawText: normalizeImportText(String(parsed.rawText ?? ""))
    };
  } catch {
    return null;
  }
}

export function parseRecipePdf(rawText: string): ParsedRecipeImport {
  const clipboardImport = parseStructuredClipboardImport(rawText);
  if (clipboardImport) {
    const warnings = [...clipboardImport.warnings];

    if (!clipboardImport.ingredients.length) {
      warnings.push("No structured ingredients were detected from the copied page.");
    }

    if (!clipboardImport.instructions.trim()) {
      warnings.push("No structured instructions were detected from the copied page.");
    }

    return {
      ...clipboardImport,
      warnings
    };
  }

  const text = normalizeImportText(rawText);
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const rawTitle = guessTitle(lines);
  const title = cleanTitle(rawTitle);
  const mealType = detectMealType(text);
  const warnings: string[] = [];

  const ingredientsBlock = extractSection(text, INGREDIENTS_BREAK, SECTION_BREAK);
  const instructionsBlock = extractSection(text, SECTION_BREAK);
  const looksLikePowerNutrition = /power nutrition|ingredientes|ingredientecantidad/i.test(text);

  const ingredients = (
    looksLikePowerNutrition
      ? parsePowerNutritionIngredients(ingredientsBlock)
      : parseGenericIngredients(ingredientsBlock)
  ).filter(
    (ingredient) =>
      ingredient.name &&
      !/^(ver:|ingredientes?|procedimiento|informaci[oó]n nutricional|ingredientecantidad)$/i.test(
        ingredient.name
      )
  );

  const description = getDescription(lines, rawTitle);

  if (!ingredients.length) {
    warnings.push("Could not confidently detect an ingredients section.");
  }

  if (!instructionsBlock.trim()) {
    warnings.push("Could not confidently detect instructions or method steps.");
  }

  if (looksLikePowerNutrition && !instructionsBlock.trim()) {
    warnings.push("This Power Nutrition PDF seems to include ingredients but not the full procedure text.");
  }

  return {
    title,
    mealType,
    description,
    ingredients,
    instructions: instructionsBlock
      .replace(/\bNotas sobre la fuente[\s\S]*$/i, "")
      .trim(),
    warnings,
    rawText: text
  };
}
