import type { PlanDay } from "@/types/database";
import { formatDateLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MealPlanDaySection({ day }: { day: PlanDay }) {
  return (
    <Card className="bg-card/90">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{formatDateLabel(day.date)}</CardTitle>
          <Badge variant="outline">{day.date}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-muted/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Lunch
          </p>
          <p className="mt-1 text-base font-semibold">{day.lunch?.name ?? "Not set"}</p>
        </div>
        <div className="rounded-2xl bg-muted/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Dinner
          </p>
          <p className="mt-1 text-base font-semibold">{day.dinner?.name ?? "Not set"}</p>
        </div>
      </CardContent>
    </Card>
  );
}
