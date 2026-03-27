import Link from "next/link";

import { MealPlanDaySection } from "@/components/plan/meal-plan-day-section";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { getActiveMealPlan } from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";

export default async function PlanPage() {
  const plan = await getActiveMealPlan();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <SectionHeader
          eyebrow="Meal Plan"
          title={plan?.title ?? "Current active plan"}
          description="The active plan drives today’s logging and PDF imports replace the plan cleanly."
        />
        <Link className={cn(buttonVariants({ variant: "default" }))} href="/plan/import">
          Import PDF plan
        </Link>
      </div>

      {plan ? (
        <div className="space-y-4">
          {plan.days.map((day) => (
            <MealPlanDaySection day={day} key={day.date} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No active plan"
          description="Use the import flow to parse your PDF meal plan and create lunch and dinner entries."
        />
      )}
    </div>
  );
}
