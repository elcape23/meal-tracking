"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { confirmRecipeImportAction } from "@/lib/actions/app";
import type { IngredientOption, MealType, ParsedRecipeImport } from "@/types/database";
import { IngredientFieldArray } from "@/components/recipes/ingredient-field-array";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";

export function RecipeImportPreview({
  importId,
  initialRecipe,
  ingredientOptions
}: {
  importId: string;
  initialRecipe: ParsedRecipeImport;
  ingredientOptions: IngredientOption[];
}) {
  const router = useRouter();
  const [recipe, setRecipe] = React.useState(initialRecipe);
  const [submitting, startTransition] = React.useTransition();

  return (
    <div className="space-y-6">
      {recipe.warnings.length ? (
        <Card className="border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="p-5">
            <p className="mb-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
              Review warnings before confirming
            </p>
            <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-300">
              {recipe.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card className="bg-card/90">
        <CardHeader>
          <CardTitle>Recipe details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Recipe name</label>
            <Input
              onChange={(event) => setRecipe({ ...recipe, title: event.target.value })}
              value={recipe.title}
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Meal type</label>
            <select
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              onChange={(event) =>
                setRecipe({ ...recipe, mealType: event.target.value as MealType })
              }
              value={recipe.mealType}
            >
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              onChange={(event) => setRecipe({ ...recipe, description: event.target.value })}
              value={recipe.description}
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Ingredients</label>
            <IngredientFieldArray
              ingredientOptions={ingredientOptions}
              ingredients={recipe.ingredients}
              onChange={(ingredients) => setRecipe({ ...recipe, ingredients })}
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Instructions</label>
            <Textarea
              className="min-h-[180px]"
              onChange={(event) => setRecipe({ ...recipe, instructions: event.target.value })}
              value={recipe.instructions}
            />
          </div>
        </CardContent>
      </Card>

      <form
        action={() => {
          startTransition(async () => {
            try {
              const formData = new FormData();
              formData.set("importId", importId);
              formData.set("recipe", JSON.stringify(recipe));
              await confirmRecipeImportAction(formData);
              toast.success("Recipe imported");
              router.push("/recipes");
              router.refresh();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Recipe import failed");
            }
          });
        }}
      >
        <SubmitButton className="w-full" disabled={submitting} pendingLabel="Saving recipe...">
          Confirm recipe import
        </SubmitButton>
      </form>
    </div>
  );
}
