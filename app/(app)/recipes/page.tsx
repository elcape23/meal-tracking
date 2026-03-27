import { buildIngredientCatalog } from "@/lib/ingredients";
import Link from "next/link";

import { archiveRecipeAction } from "@/lib/actions/app";
import { getRecipeLibrary } from "@/lib/supabase/queries";
import { RecipeForm } from "@/components/recipes/recipe-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants, Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default async function RecipesPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; mealType?: string; edit?: string }>;
}) {
  const [recipes, params] = await Promise.all([
    getRecipeLibrary(),
    searchParams ??
      Promise.resolve({} as { q?: string; mealType?: string; edit?: string })
  ]);
  const query = params.q?.toLowerCase().trim() ?? "";
  const mealTypeFilter = params.mealType ?? "all";
  const editId = params.edit;
  const filteredRecipes = recipes.filter((recipe) => {
    const matchesQuery =
      !query ||
      recipe.name.toLowerCase().includes(query) ||
      recipe.description?.toLowerCase().includes(query);
    const matchesMealType =
      mealTypeFilter === "all" ||
      recipe.meal_type === mealTypeFilter ||
      (mealTypeFilter !== "both" && recipe.meal_type === "both");
    return matchesQuery && matchesMealType;
  });
  const recipeToEdit = recipes.find((recipe) => recipe.id === editId);
  const ingredientOptions = buildIngredientCatalog(recipes);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <SectionHeader
            eyebrow="Recipe Library"
            title="All recipes"
            description="Search-ready structure with lunch, dinner, and both-type recipes. Archive instead of deleting."
          />
          <Link className={cn(buttonVariants({ variant: "default" }))} href="/recipes/import">
            Import recipe PDF
          </Link>
        </div>
        <form className="grid gap-3 rounded-2xl border border-border/70 bg-card/80 p-4 md:grid-cols-[1fr_180px_auto]">
          <Input defaultValue={params.q ?? ""} name="q" placeholder="Search recipes" />
          <select
            className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
            defaultValue={mealTypeFilter}
            name="mealType"
          >
            <option value="all">All meal types</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="both">Both</option>
          </select>
          <Button type="submit" variant="outline">
            Apply
          </Button>
        </form>

        {filteredRecipes.length ? (
          <div className="space-y-4">
            {filteredRecipes.map((recipe) => (
              <Card className="bg-card/90" key={recipe.id}>
                <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold">{recipe.name}</p>
                      <Badge variant="outline">{recipe.meal_type}</Badge>
                      <Badge>{recipe.source}</Badge>
                      {recipe.is_archived ? <Badge variant="warning">Archived</Badge> : null}
                    </div>
                    {recipe.description ? (
                      <p className="text-sm text-muted-foreground">{recipe.description}</p>
                    ) : null}
                  </div>

                  <div className="flex gap-2">
                    <Link
                      className={cn(buttonVariants({ variant: "outline" }))}
                      href={`/recipes?${new URLSearchParams({
                        q: params.q ?? "",
                        mealType: mealTypeFilter,
                        edit: recipe.id
                      }).toString()}`}
                    >
                      Edit
                    </Link>
                    <form action={archiveRecipeAction}>
                      <input name="recipeId" type="hidden" value={recipe.id} />
                      <input name="archived" type="hidden" value={recipe.is_archived ? "false" : "true"} />
                      <Button type="submit" variant="outline">
                        {recipe.is_archived ? "Restore" : "Archive"}
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No recipes yet"
            description="Create a recipe manually or import a meal plan PDF to populate the library."
          />
        )}
      </section>

      <section>
        <RecipeForm ingredientOptions={ingredientOptions} recipe={recipeToEdit} />
      </section>
    </div>
  );
}
