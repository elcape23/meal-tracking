import { cache } from "react";

import { buildIngredientCatalog } from "@/lib/ingredients";
import { normalizeRecipeName } from "@/lib/utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  HistoryLog,
  IngredientOption,
  ParsedMealPlan,
  ParsedRecipeImport,
  PlanDay,
  Recipe,
  TodayMealCard
} from "@/types/database";

async function getAuthedClient() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export const getCurrentUser = cache(async () => {
  const { supabase } = await getAuthedClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user;
});

export const getTodayMeals = cache(async (): Promise<TodayMealCard[]> => {
  const { supabase, user } = await getAuthedClient();
  if (!user) {
    return [];
  }

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: plannedRows }, { data: logRows }, { data: activePlanRecipes }, { data: recentRecipes }] =
    await Promise.all([
      supabase
        .from("meal_plan_entries")
        .select("date, meal_type, recipe:recipes(id, name, source)")
        .eq("date", today)
        .order("meal_type"),
      supabase
        .from("food_logs")
        .select("id, date, meal_type, followed_plan, eaten_recipe:recipes!food_logs_eaten_recipe_id_fkey(id, name)")
        .eq("date", today)
        .order("meal_type"),
      supabase
        .from("meal_plan_entries")
        .select("meal_type, recipe:recipes(id, name, meal_type, source), meal_plan:meal_plans!inner(user_id, is_active)")
        .eq("meal_plan.user_id", user.id)
        .eq("meal_plan.is_active", true),
      supabase
        .from("food_logs")
        .select("eaten_recipe:recipes!food_logs_eaten_recipe_id_fkey(id, name, meal_type, source), created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12)
    ]);

  const plannedEntries = (plannedRows ?? []) as any[];
  const logs = (logRows ?? []) as any[];
  const planRecipes = (activePlanRecipes ?? []) as any[];
  const recent = (recentRecipes ?? []) as any[];

  const suggestionMap = new Map<string, Pick<Recipe, "id" | "name" | "meal_type" | "source">>();
  planRecipes.forEach((row) => {
    if (row.recipe) {
      suggestionMap.set(row.recipe.id, row.recipe);
    }
  });
  recent.forEach((row) => {
    if (row.eaten_recipe) {
      suggestionMap.set(row.eaten_recipe.id, row.eaten_recipe);
    }
  });

  return (["lunch", "dinner"] as const).map((mealType) => {
    const planned = plannedEntries.find((row) => row.meal_type === mealType)?.recipe ?? null;
    const log = logs.find((row) => row.meal_type === mealType);

    const suggestions = [...suggestionMap.values()].filter((recipe) => {
      if (recipe.meal_type === "both") {
        return true;
      }
      return recipe.meal_type === mealType;
    });

    if (planned) {
      suggestions.unshift({
        id: planned.id,
        name: planned.name,
        meal_type: mealType,
        source: planned.source
      });
    }

    const uniqueSuggestions = Array.from(
      new Map(suggestions.map((recipe) => [recipe.id, recipe])).values()
    ).slice(0, 8);

    return {
      mealType,
      date: today,
      plannedRecipe: planned,
      loggedRecipe: log?.eaten_recipe ?? null,
      logId: log?.id ?? null,
      followedPlan: log?.followed_plan ?? null,
      suggestions: uniqueSuggestions
    };
  });
});

export const getRecipeLibrary = cache(async (): Promise<Recipe[]> => {
  const { supabase, user } = await getAuthedClient();
  if (!user) {
    return [];
  }

  const { data } = await supabase
    .from("recipes")
    .select("*")
    .eq("user_id", user.id)
    .order("is_archived")
    .order("updated_at", { ascending: false });

  return (data ?? []) as Recipe[];
});

export const getIngredientCatalog = cache(async (): Promise<IngredientOption[]> => {
  const recipes = await getRecipeLibrary();
  return buildIngredientCatalog(recipes);
});

export const getActiveMealPlan = cache(async (): Promise<{ title: string; days: PlanDay[] } | null> => {
  const { supabase, user } = await getAuthedClient();
  if (!user) {
    return null;
  }

  const { data: plan } = await supabase
    .from("meal_plans")
    .select("id, title")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!plan) {
    return null;
  }

  const { data: entries } = await supabase
    .from("meal_plan_entries")
    .select("date, meal_type, recipe:recipes(id, name, source)")
    .eq("meal_plan_id", plan.id)
    .order("date", { ascending: true });

  const dayMap = new Map<string, PlanDay>();

  ((entries ?? []) as any[]).forEach((entry) => {
    const existing = dayMap.get(entry.date) ?? {
      date: entry.date,
      lunch: null,
      dinner: null
    };
    const slot = entry.meal_type as "lunch" | "dinner";
    existing[slot] = entry.recipe;
    dayMap.set(entry.date, existing);
  });

  return {
    title: plan.title,
    days: [...dayMap.values()]
  };
});

export const getHistoryLogs = cache(async (): Promise<HistoryLog[]> => {
  const { supabase, user } = await getAuthedClient();
  if (!user) {
    return [];
  }

  const { data } = await supabase
    .from("food_logs")
    .select(
      "*, planned_recipe:recipes!food_logs_planned_recipe_id_fkey(id, name), eaten_recipe:recipes!food_logs_eaten_recipe_id_fkey(id, name)"
    )
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("meal_type");

  return (data as HistoryLog[] | null) ?? [];
});

export async function findOrCreateRecipe({
  userId,
  name,
  mealType,
  source,
  description,
  instructions
}: {
  userId: string;
  name: string;
  mealType: Recipe["meal_type"];
  source: Recipe["source"];
  description?: string;
  instructions?: string;
}) {
  const supabase = await createSupabaseServerClient();
  const normalizedName = normalizeRecipeName(name);

  const { data: existing } = await supabase
    .from("recipes")
    .select("*")
    .eq("user_id", userId)
    .eq("normalized_name", normalizedName)
    .maybeSingle();

  if (existing) {
    return existing as Recipe;
  }

  const { data, error } = await supabase
    .from("recipes")
    .insert({
      user_id: userId,
      name,
      normalized_name: normalizedName,
      meal_type: mealType,
      source,
      description: description ?? null,
      instructions: instructions ?? null
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Recipe;
}

export async function storeImportRecord({
  userId,
  fileName,
  parsed
}: {
  userId: string;
  fileName: string;
  parsed: ParsedMealPlan;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("meal_plan_imports")
    .insert({
      user_id: userId,
      file_name: fileName,
      raw_text: parsed.rawText,
      parsed_payload: parsed,
      warnings: parsed.warnings,
      status: "parsed"
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as { id: string };
}

export async function storeRecipeImportRecord({
  userId,
  fileName,
  parsed
}: {
  userId: string;
  fileName: string;
  parsed: ParsedRecipeImport;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("recipe_imports")
    .insert({
      user_id: userId,
      file_name: fileName,
      raw_text: parsed.rawText,
      parsed_payload: parsed,
      warnings: parsed.warnings,
      status: "parsed"
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as { id: string };
}
