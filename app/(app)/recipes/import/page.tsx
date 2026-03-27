import { RecipeImportFlow } from "@/components/recipes/import/recipe-import-flow";
import { SectionHeader } from "@/components/ui/section-header";
import { getIngredientCatalog } from "@/lib/supabase/queries";

export default async function RecipeImportPage() {
  const ingredientOptions = await getIngredientCatalog();

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Recipe Import"
        title="Import recipe"
        description="Upload a recipe PDF or paste recipe text, review the parsed title, ingredients, and instructions, then save it into your recipe library."
      />
      <RecipeImportFlow ingredientOptions={ingredientOptions} />
    </div>
  );
}
