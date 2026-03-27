"use client";

import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { logMealAction } from "@/lib/actions/app";
import type { TodayMealCard } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";

export function LogMealDialog({
  meal,
  triggerLabel
}: {
  meal: TodayMealCard;
  triggerLabel: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = React.useState(meal.plannedRecipe?.id ?? "");
  const [newRecipeName, setNewRecipeName] = React.useState("");
  const [state, formAction] = useActionState(
    async (_state: { success?: boolean } | undefined, formData: FormData) => {
      await logMealAction(formData);
      return { success: true };
    },
    undefined
  );

  React.useEffect(() => {
    if (state?.success) {
      toast.success("Meal logged");
      setOpen(false);
      setNewRecipeName("");
    }
  }, [state]);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button>{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Log {meal.mealType}</DialogTitle>
            <DialogDescription>
              Keep the flow quick: confirm the planned meal, choose another recipe, or add a new one.
            </DialogDescription>
          </DialogHeader>

          <input name="date" type="hidden" value={meal.date} />
          <input name="mealType" type="hidden" value={meal.mealType} />
          <input name="plannedRecipeId" type="hidden" value={meal.plannedRecipe?.id ?? ""} />
          <input name="recipeId" type="hidden" value={newRecipeName ? "" : selectedRecipeId} />
          <input name="newRecipeName" type="hidden" value={newRecipeName} />

          <div className="rounded-2xl bg-muted/70 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline">Planned</Badge>
              <span className="text-sm font-medium">
                {meal.plannedRecipe?.name ?? "No planned recipe for this slot"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              One tap logs adherence when you ate what was planned.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Choose an existing recipe</label>
              <select
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                onChange={(event) => {
                  setSelectedRecipeId(event.target.value);
                  if (event.target.value) {
                    setNewRecipeName("");
                  }
                }}
                value={selectedRecipeId}
              >
                <option value="">Select a suggestion</option>
                {meal.suggestions.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Or add something else</label>
              <Input
                onChange={(event) => {
                  setNewRecipeName(event.target.value);
                  if (event.target.value) {
                    setSelectedRecipeId("");
                  }
                }}
                placeholder="Quick new recipe name"
                value={newRecipeName}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Notes</label>
              <Textarea name="notes" placeholder="Optional details for later" />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <SubmitButton pendingLabel="Logging meal...">Save meal</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
