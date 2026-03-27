"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { confirmImportAction } from "@/lib/actions/app";
import type { ParsedMealPlanEntry } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

export function ImportPreview({
  importId,
  initialTitle,
  initialEntries,
  warnings
}: {
  importId: string;
  initialTitle: string;
  initialEntries: ParsedMealPlanEntry[];
  warnings: string[];
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState(initialTitle);
  const [entries, setEntries] = React.useState(initialEntries);
  const [submitting, startTransition] = React.useTransition();

  return (
    <div className="space-y-6">
      {warnings.length ? (
        <Card className="border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="p-5">
            <p className="mb-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
              Review warnings before confirming
            </p>
            <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-300">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card className="bg-card/90">
        <CardHeader>
          <CardTitle>Import details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Meal plan title</label>
            <Input onChange={(event) => setTitle(event.target.value)} value={title} />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {entries.map((entry, index) => (
          <Card className="bg-card/90" key={entry.id}>
            <CardContent className="grid gap-4 p-5 md:grid-cols-[180px_1fr_auto] md:items-center">
              <div>
                <p className="text-sm font-semibold">{entry.dateLabel}</p>
                <p className="text-sm text-muted-foreground">{entry.date ?? "Missing date"}</p>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium capitalize">{entry.mealType}</label>
                <Input
                  onChange={(event) => {
                    const next = [...entries];
                    next[index] = { ...entry, recipeName: event.target.value };
                    setEntries(next);
                  }}
                  value={entry.recipeName}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Badge variant={entry.confidence === "low" ? "warning" : "outline"}>
                  {entry.confidence}
                </Badge>
                <button
                  className="text-sm font-medium text-destructive"
                  onClick={() => setEntries(entries.filter((candidate) => candidate.id !== entry.id))}
                  type="button"
                >
                  Remove
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <form
        action={() => {
          startTransition(async () => {
            try {
              const formData = new FormData();
              formData.set("importId", importId);
              formData.set("title", title);
              formData.set("entries", JSON.stringify(entries));
              await confirmImportAction(formData);
              toast.success("Meal plan imported");
              router.push("/plan");
              router.refresh();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Import failed");
            }
          });
        }}
      >
        <SubmitButton className="w-full" disabled={submitting} pendingLabel="Confirming import...">
          Confirm import
        </SubmitButton>
      </form>
    </div>
  );
}
