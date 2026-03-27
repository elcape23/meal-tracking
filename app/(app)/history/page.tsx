import { HistoryLogItem } from "@/components/history/history-log-item";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { getHistoryLogs } from "@/lib/supabase/queries";

export default async function HistoryPage() {
  const logs = await getHistoryLogs();
  const adherence =
    logs.length > 0
      ? Math.round((logs.filter((log) => log.followed_plan).length / logs.length) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="History"
        title="Planned vs eaten"
        description={`Adherence so far: ${adherence}% across lunch and dinner logs.`}
      />

      {logs.length ? (
        <div className="space-y-4">
          {logs.map((log) => (
            <HistoryLogItem key={log.id} log={log} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No meal history yet"
          description="Once meals are logged, you’ll see the planned recipe, what you actually ate, and whether you followed the plan."
        />
      )}
    </div>
  );
}
