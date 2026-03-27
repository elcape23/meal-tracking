import { CheckCircle2, UtensilsCrossed } from "lucide-react";

import type { TodayMealCard } from "@/types/database";
import { logMealAction } from "@/lib/actions/app";
import { LogMealDialog } from "@/components/today/log-meal-dialog";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MealCard({ meal }: { meal: TodayMealCard }) {
  return (
    <Card className="overflow-hidden bg-card/90">
      <CardHeader className="border-b border-border/60 bg-gradient-to-br from-background via-background to-accent/35">
        <div className="flex items-center justify-between">
          <Badge variant={meal.loggedRecipe ? "success" : "outline"}>
            {meal.loggedRecipe ? "Logged" : "Pending"}
          </Badge>
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <UtensilsCrossed className="h-4 w-4" />
          </div>
        </div>
        <CardTitle className="capitalize">{meal.mealType}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Planned
          </p>
          <p className="mt-1 text-lg font-semibold">
            {meal.plannedRecipe?.name ?? "Nothing planned yet"}
          </p>
        </div>

        {meal.loggedRecipe ? (
          <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
            <div className="mb-1 flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Logged as eaten
            </div>
            <p className="text-base font-semibold">{meal.loggedRecipe.name}</p>
            <p className="mt-1 text-sm opacity-80">
              {meal.followedPlan ? "Followed plan" : "Different from plan"}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {meal.plannedRecipe ? (
              <form action={logMealAction}>
                <input name="date" type="hidden" value={meal.date} />
                <input name="mealType" type="hidden" value={meal.mealType} />
                <input name="plannedRecipeId" type="hidden" value={meal.plannedRecipe.id} />
                <input name="recipeId" type="hidden" value={meal.plannedRecipe.id} />
                <SubmitButton pendingLabel="Logging meal...">Log planned meal</SubmitButton>
              </form>
            ) : null}
            <LogMealDialog meal={meal} triggerLabel="Choose another" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
