"use client";

import * as React from "react";

import type { IngredientOption, RecipeIngredient } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { canonicalizeIngredientName } from "@/lib/ingredients";

export function IngredientFieldArray({
  ingredients,
  ingredientOptions,
  onChange
}: {
  ingredients: RecipeIngredient[];
  ingredientOptions: IngredientOption[];
  onChange: (ingredients: RecipeIngredient[]) => void;
}) {
  const datalistId = React.useId();

  const updateIngredient = (index: number, patch: Partial<RecipeIngredient>) => {
    const nextIngredients = [...ingredients];
    nextIngredients[index] = {
      ...nextIngredients[index],
      ...patch
    };
    onChange(nextIngredients);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 p-4">
      <datalist id={datalistId}>
        {ingredientOptions.map((option) => (
          <option key={option.normalized} value={option.label} />
        ))}
      </datalist>

      {ingredients.map((ingredient, index) => (
        <div
          className="grid gap-3 md:grid-cols-[1.6fr_0.7fr_0.7fr_1fr_auto]"
          key={`${ingredient.name}-${index}`}
        >
          <Input
            list={datalistId}
            onBlur={(event) =>
              updateIngredient(index, {
                name: canonicalizeIngredientName(event.target.value, ingredientOptions)
              })
            }
            onChange={(event) => updateIngredient(index, { name: event.target.value })}
            placeholder="Ingredient name"
            value={ingredient.name}
          />
          <Input
            onChange={(event) => updateIngredient(index, { quantity: event.target.value })}
            placeholder="Qty"
            value={ingredient.quantity}
          />
          <Input
            onChange={(event) => updateIngredient(index, { unit: event.target.value })}
            placeholder="Unit"
            value={ingredient.unit}
          />
          <Input
            onChange={(event) => updateIngredient(index, { note: event.target.value })}
            placeholder="Note"
            value={ingredient.note ?? ""}
          />
          <Button
            onClick={() =>
              onChange(ingredients.filter((_, itemIndex) => itemIndex !== index))
            }
            type="button"
            variant="outline"
          >
            Remove
          </Button>
        </div>
      ))}

      <Button
        onClick={() =>
          onChange([...ingredients, { name: "", quantity: "", unit: "", note: "" }])
        }
        type="button"
        variant="ghost"
      >
        Add ingredient
      </Button>
    </div>
  );
}
