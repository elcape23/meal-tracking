import { MealCard } from "@/components/today/meal-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { getTodayMeals } from "@/lib/supabase/queries";

export default async function TodayPage() {
  const meals = await getTodayMeals();

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Dashboard"
        title="Today"
        description="See today’s lunch and dinner, log the planned meal in one tap, or switch to another recipe."
      />

      {meals.length ? (
        <div className="grid gap-6 xl:grid-cols-2">
          {meals.map((meal) => (
            <MealCard key={meal.mealType} meal={meal} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No active plan found"
          description="Import your meal plan or seed the database so today can show lunch and dinner."
        />
      )}
    </div>
  );
}
