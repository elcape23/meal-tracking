"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import { canonicalizeIngredients } from "@/lib/ingredients";
import { parseMealPlan } from "@/lib/meal-plan/parse-meal-plan";
import { extractPdfText } from "@/lib/pdf/extract-text";
import { parseRecipePdf } from "@/lib/recipes/parse-recipe-pdf";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  findOrCreateRecipe,
  getIngredientCatalog,
  getCurrentUser,
  storeImportRecord,
  storeRecipeImportRecord
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeRecipeName } from "@/lib/utils";
import type { ParsedMealPlanEntry, ParsedRecipeImport, Recipe } from "@/types/database";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error && typeof error === "object") {
    const maybeMessage = "message" in error ? error.message : undefined;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }

    const maybeDigest = "digest" in error ? error.digest : undefined;
    if (typeof maybeDigest === "string" && maybeDigest.trim()) {
      return `${fallback} (digest: ${maybeDigest})`;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return fallback;
    }
  }

  return fallback;
}

function parseIngredientsInput(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = "", quantity = "", unit = "", note = ""] = line.split("|").map((part) => part.trim());
      return {
        name,
        quantity,
        unit,
        note: note || null
      };
    })
    .filter((ingredient) => ingredient.name);
}

export async function requestMagicLinkAction(
  _: { message?: string } | undefined,
  formData: FormData
) {
  const email = String(formData.get("email") ?? "").trim();
  const origin =
    String(formData.get("origin") ?? "").trim() ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  if (!email) {
    return { message: "Email is required." };
  }

  try {
    const { url, anonKey } = getSupabaseEnv();
    if (!url || !anonKey) {
      return { message: "Supabase is not configured. Check the environment variables." };
    }

    // Sending a magic link does not depend on request cookies, so a plain client
    // is more reliable here than the SSR client.
    const supabase = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/api/auth/callback`
      }
    });

    if (error) {
      return { message: error.message };
    }
  } catch (error) {
    return {
      message: getErrorMessage(error, "Could not send the magic link.")
    };
  }

  return { message: "Magic link sent. Check your email to continue." };
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function logMealAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  const date = String(formData.get("date"));
  const mealType = String(formData.get("mealType")) as "lunch" | "dinner";
  const plannedRecipeId = String(formData.get("plannedRecipeId") ?? "") || null;
  const existingRecipeId = String(formData.get("recipeId") ?? "") || null;
  const newRecipeName = String(formData.get("newRecipeName") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  let eatenRecipeId = existingRecipeId;
  if (!eatenRecipeId && newRecipeName) {
    const created = await findOrCreateRecipe({
      userId: user.id,
      name: newRecipeName,
      mealType,
      source: "custom"
    });
    eatenRecipeId = created.id;
  }

  if (!eatenRecipeId) {
    throw new Error("Choose a recipe or create a new one before logging.");
  }

  const followedPlan = plannedRecipeId ? plannedRecipeId === eatenRecipeId : false;

  const { error } = await supabase.from("food_logs").upsert(
    {
      user_id: user.id,
      date,
      meal_type: mealType,
      planned_recipe_id: plannedRecipeId,
      eaten_recipe_id: eatenRecipeId,
      followed_plan: followedPlan,
      notes
    },
    {
      onConflict: "user_id,date,meal_type"
    }
  );

  if (error) {
    throw error;
  }

  revalidatePath("/today");
  revalidatePath("/history");
}

export async function saveRecipeAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  const recipeId = String(formData.get("recipeId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const mealType = String(formData.get("mealType") ?? "both") as Recipe["meal_type"];
  const description = String(formData.get("description") ?? "").trim() || null;
  const instructions = String(formData.get("instructions") ?? "").trim() || null;
  const ingredients = parseIngredientsInput(String(formData.get("ingredients") ?? ""));
  const ingredientOptions = await getIngredientCatalog();
  const normalizedName = normalizeRecipeName(name);

  if (!name) {
    throw new Error("Recipe name is required.");
  }

  const payload = {
    user_id: user.id,
    name,
    normalized_name: normalizedName,
    meal_type: mealType,
    description,
    instructions,
    ingredients: canonicalizeIngredients(ingredients, ingredientOptions)
  };

  const query = recipeId
    ? supabase.from("recipes").update(payload).eq("id", recipeId).eq("user_id", user.id)
    : supabase.from("recipes").insert({ ...payload, source: "custom" });

  const { error } = await query;
  if (error) {
    throw error;
  }

  revalidatePath("/recipes");
  revalidatePath("/today");
}

export async function archiveRecipeAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  const recipeId = String(formData.get("recipeId"));
  const archived = String(formData.get("archived")) === "true";

  const { error } = await supabase
    .from("recipes")
    .update({ is_archived: archived })
    .eq("id", recipeId)
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }

  revalidatePath("/recipes");
}

type ParseImportState = {
  error?: string;
  importId?: string;
  parsed?: {
    title: string;
    startDate: string | null;
    endDate: string | null;
    entries: ParsedMealPlanEntry[];
    warnings: string[];
  };
};

type ParseRecipeImportState = {
  error?: string;
  importId?: string;
  parsed?: ParsedRecipeImport;
};

export async function parseImportAction(
  _: ParseImportState | undefined,
  formData: FormData
): Promise<ParseImportState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be signed in to import a plan." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "Choose a PDF file to continue." };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await extractPdfText(buffer);
    const parsed = parseMealPlan(rawText);
    const importRecord = await storeImportRecord({
      userId: user.id,
      fileName: file.name,
      parsed
    });

    return {
      importId: importRecord.id,
      parsed: {
        title: parsed.title,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        entries: parsed.entries,
        warnings: parsed.warnings
      }
    };
  } catch (error) {
    console.error("Meal plan PDF parse failed:", error);
    return {
      error: getErrorMessage(error, "The PDF could not be parsed.")
    };
  }
}

export async function parseRecipeImportAction(
  _: ParseRecipeImportState | undefined,
  formData: FormData
): Promise<ParseRecipeImportState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be signed in to import a recipe." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "Choose a PDF file to continue." };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await extractPdfText(buffer);
    const parsed = parseRecipePdf(rawText);
    const importRecord = await storeRecipeImportRecord({
      userId: user.id,
      fileName: file.name,
      parsed
    });

    return {
      importId: importRecord.id,
      parsed
    };
  } catch (error) {
    console.error("Recipe PDF parse failed:", error);
    return {
      error: getErrorMessage(error, "The recipe PDF could not be parsed.")
    };
  }
}

export async function parseRecipeTextImportAction(
  _: ParseRecipeImportState | undefined,
  formData: FormData
): Promise<ParseRecipeImportState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be signed in to import a recipe." };
  }

  const rawText = String(formData.get("rawText") ?? "").trim();
  const sourceName = String(formData.get("sourceName") ?? "pasted-recipe.txt").trim();

  if (!rawText) {
    return { error: "Paste recipe text to continue." };
  }

  try {
    const parsed = parseRecipePdf(rawText);
    const importRecord = await storeRecipeImportRecord({
      userId: user.id,
      fileName: sourceName || "pasted-recipe.txt",
      parsed
    });

    return {
      importId: importRecord.id,
      parsed
    };
  } catch (error) {
    console.error("Recipe text parse failed:", error);
    return {
      error: getErrorMessage(error, "The pasted recipe text could not be parsed.")
    };
  }
}

export async function confirmImportAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  const importId = String(formData.get("importId") ?? "");
  const title = String(formData.get("title") ?? "Imported Meal Plan").trim();
  const entries = JSON.parse(String(formData.get("entries") ?? "[]")) as ParsedMealPlanEntry[];
  const validEntries = entries.filter((entry) => entry.recipeName.trim() && entry.date);

  if (!validEntries.length) {
    throw new Error("At least one dated lunch or dinner entry is required.");
  }

  const dates = validEntries.map((entry) => entry.date!).sort();

  await supabase
    .from("meal_plans")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("is_active", true);

  const { data: plan, error: planError } = await supabase
    .from("meal_plans")
    .insert({
      user_id: user.id,
      title,
      start_date: dates[0],
      end_date: dates[dates.length - 1],
      is_active: true
    })
    .select("id")
    .single();

  if (planError || !plan) {
    throw planError ?? new Error("Could not create meal plan.");
  }

  const recipeIds = new Map<string, string>();
  for (const entry of validEntries) {
    const normalized = normalizeRecipeName(entry.recipeName);
    if (!recipeIds.has(normalized)) {
      const recipe = await findOrCreateRecipe({
        userId: user.id,
        name: entry.recipeName,
        mealType: entry.mealType,
        source: "imported"
      });
      recipeIds.set(normalized, recipe.id);
    }
  }

  const { error: entriesError } = await supabase.from("meal_plan_entries").insert(
    validEntries.map((entry) => ({
      meal_plan_id: plan.id,
      date: entry.date!,
      meal_type: entry.mealType,
      recipe_id: recipeIds.get(normalizeRecipeName(entry.recipeName))!,
      notes: entry.notes ?? null
    }))
  );

  if (entriesError) {
    throw entriesError;
  }

  await supabase
    .from("meal_plan_imports")
    .update({
      status: "confirmed",
      parsed_payload: { title, entries: validEntries }
    })
    .eq("id", importId)
    .eq("user_id", user.id);

  revalidatePath("/plan");
  revalidatePath("/today");
  revalidatePath("/recipes");
}

export async function confirmRecipeImportAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  const importId = String(formData.get("importId") ?? "");
  const recipe = JSON.parse(String(formData.get("recipe") ?? "{}")) as ParsedRecipeImport;
  const ingredientOptions = await getIngredientCatalog();

  if (!recipe.title.trim()) {
    throw new Error("Recipe name is required.");
  }

  const savedRecipe = await findOrCreateRecipe({
    userId: user.id,
    name: recipe.title.trim(),
    mealType: recipe.mealType,
    source: "imported",
    description: recipe.description.trim(),
    instructions: recipe.instructions.trim()
  });

  const { error } = await supabase
    .from("recipes")
    .update({
      description: recipe.description.trim() || savedRecipe.description,
      instructions: recipe.instructions.trim() || savedRecipe.instructions,
      ingredients: canonicalizeIngredients(recipe.ingredients, ingredientOptions),
      meal_type: recipe.mealType,
      source: "imported"
    })
    .eq("id", savedRecipe.id)
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }

  await supabase
    .from("recipe_imports")
    .update({
      status: "confirmed",
      parsed_payload: recipe
    })
    .eq("id", importId)
    .eq("user_id", user.id);

  revalidatePath("/recipes");
  revalidatePath("/today");
}
