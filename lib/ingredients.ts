import type { IngredientOption, Json, Recipe, RecipeIngredient } from "@/types/database";

export function normalizeIngredientName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function coerceRecipeIngredients(value: Json | null | undefined): RecipeIngredient[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((ingredient) => {
      if (!ingredient || typeof ingredient !== "object") {
        return null;
      }

      return {
        name: "name" in ingredient ? String(ingredient.name ?? "").trim() : "",
        quantity: "quantity" in ingredient ? String(ingredient.quantity ?? "").trim() : "",
        unit: "unit" in ingredient ? String(ingredient.unit ?? "").trim() : "",
        note: "note" in ingredient ? String(ingredient.note ?? "").trim() || null : null
      };
    })
    .filter(
      (ingredient): ingredient is {
        name: string;
        quantity: string;
        unit: string;
        note: string | null;
      } => Boolean(ingredient?.name)
    )
    .map((ingredient) => ({
      ...ingredient,
      note: ingredient.note ?? null
    }));
}

export function buildIngredientCatalog(recipes: Recipe[]): IngredientOption[] {
  const options = new Map<string, IngredientOption>();

  recipes.forEach((recipe) => {
    coerceRecipeIngredients(recipe.ingredients).forEach((ingredient) => {
      const normalized = normalizeIngredientName(ingredient.name);
      if (!normalized || options.has(normalized)) {
        return;
      }

      options.set(normalized, {
        label: ingredient.name.trim(),
        normalized
      });
    });
  });

  return [...options.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function canonicalizeIngredientName(name: string, options: IngredientOption[]) {
  const normalized = normalizeIngredientName(name);
  const existing = options.find((option) => option.normalized === normalized);
  return existing?.label ?? name.trim();
}

export function canonicalizeIngredients(
  ingredients: RecipeIngredient[],
  options: IngredientOption[]
): RecipeIngredient[] {
  return ingredients
    .map((ingredient) => ({
      ...ingredient,
      name: canonicalizeIngredientName(ingredient.name, options)
    }))
    .filter((ingredient) => ingredient.name);
}

export function serializeRecipeIngredients(ingredients: RecipeIngredient[]) {
  return ingredients
    .filter((ingredient) => ingredient.name.trim())
    .map((ingredient) =>
      [
        ingredient.name.trim(),
        ingredient.quantity.trim(),
        ingredient.unit.trim(),
        ingredient.note?.trim() ?? ""
      ].join(" | ")
    )
    .join("\n");
}
