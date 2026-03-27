import { ImportFlow } from "@/components/plan/import/import-flow";
import { SectionHeader } from "@/components/ui/section-header";

export default function PlanImportPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="PDF Import"
        title="Import meal plan"
        description="Upload a PDF, parse lunch and dinner into structured entries, review the result, then confirm the import."
      />
      <ImportFlow />
    </div>
  );
}
