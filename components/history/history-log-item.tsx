import type { HistoryLog } from "@/types/database";
import { formatDateLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function HistoryLogItem({ log }: { log: HistoryLog }) {
  return (
    <Card className="bg-card/90">
      <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Badge variant={log.followed_plan ? "success" : "warning"}>
              {log.followed_plan ? "Followed plan" : "Adjusted"}
            </Badge>
            <span className="text-sm text-muted-foreground">{formatDateLabel(log.date)}</span>
          </div>
          <p className="text-base font-semibold capitalize">{log.meal_type}</p>
        </div>

        <div className="grid gap-1 text-sm md:text-right">
          <p>
            Planned: <span className="font-medium">{log.planned_recipe?.name ?? "None"}</span>
          </p>
          <p>
            Ate: <span className="font-medium">{log.eaten_recipe.name}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
