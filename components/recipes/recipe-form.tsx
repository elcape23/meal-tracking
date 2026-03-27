"use client";

import * as React from "react";

import type { Recipe } from "@/types/database";
import type { IngredientOption, RecipeIngredient } from "@/types/database";
import { saveRecipeAction } from "@/lib/actions/app";
import { coerceRecipeIngredients, serializeRecipeIngredients } from "@/lib/ingredients";
import { IngredientFieldArray } from "@/components/recipes/ingredient-field-array";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";

export function RecipeForm({
  recipe,
  ingredientOptions
}: {
  recipe?: Recipe;
  ingredientOptions: IngredientOption[];
}) {
  const [ingredients, setIngredients] = React.useState<RecipeIngredient[]>(
    coerceRecipeIngredients(recipe?.ingredients)
  );

  return (
    <Card className="bg-card/90">
      <CardHeader>
        <CardTitle>{recipe ? "Edit recipe" : "Add recipe"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={saveRecipeAction} className="grid gap-4">
          <input name="recipeId" type="hidden" value={recipe?.id ?? ""} />
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Name</label>
            <Input defaultValue={recipe?.name} name="name" placeholder="Grilled chicken bowl" required />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Meal type</label>
            <select
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              defaultValue={recipe?.meal_type ?? "both"}
              name="mealType"
            >
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Description</label>
            <Input defaultValue={recipe?.description ?? ""} name="description" placeholder="Optional short summary" />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Instructions</label>
            <Textarea defaultValue={recipe?.instructions ?? ""} name="instructions" placeholder="Optional preparation notes" />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Ingredients</label>
            <input name="ingredients" type="hidden" value={serializeRecipeIngredients(ingredients)} />
            <IngredientFieldArray
              ingredientOptions={ingredientOptions}
              ingredients={ingredients}
              onChange={setIngredients}
            />
          </div>
          <div className="flex items-center gap-3">
            <SubmitButton pendingLabel="Saving recipe...">
              {recipe ? "Update recipe" : "Create recipe"}
            </SubmitButton>
            <Button type="reset" variant="ghost">
              Reset
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
