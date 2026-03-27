"use client";

import * as React from "react";
import { toast } from "sonner";

import { parseImportAction } from "@/lib/actions/app";
import { ImportPreview } from "@/components/plan/import/import-preview";
import { UploadDropzone } from "@/components/plan/import/upload-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";

export function ImportFlow() {
  const [file, setFile] = React.useState<File | null>(null);
  const [state, setState] = React.useState<Awaited<ReturnType<typeof parseImportAction>>>();
  const [pending, startTransition] = React.useTransition();
  const inputKey = file?.name ?? "empty";

  return (
    <div className="space-y-6">
      {!state?.parsed ? (
        <Card className="bg-card/90">
          <CardContent className="space-y-5 p-6">
            <form
              action={() => {
                startTransition(async () => {
                  if (!file) {
                    setState({ error: "Choose a PDF file to continue." });
                    toast.error("Choose a PDF file to continue.");
                    return;
                  }

                  const formData = new FormData();
                  formData.set("file", file);
                  const result = await parseImportAction(undefined, formData);
                  setState(result);
                  if (result.error) {
                    toast.error(result.error);
                  }
                });
              }}
              className="space-y-5"
            >
              <UploadDropzone fileName={file?.name ?? null} onFileChange={setFile} />
              <input
                key={inputKey}
                accept="application/pdf"
                className="block text-sm"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                type="file"
              />
              {state?.error ? (
                <p className="text-sm font-medium text-destructive">{state.error}</p>
              ) : null}
              <div className="flex gap-3">
                <SubmitButton disabled={pending} pendingLabel="Parsing PDF...">
                  Parse meal plan
                </SubmitButton>
                <Button onClick={() => setFile(null)} type="button" variant="ghost">
                  Clear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <ImportPreview
          importId={state.importId!}
          initialEntries={state.parsed.entries}
          initialTitle={state.parsed.title}
          warnings={state.parsed.warnings}
        />
      )}
    </div>
  );
}
