"use client";

import * as React from "react";
import { toast } from "sonner";

import { parseRecipeImportAction, parseRecipeTextImportAction } from "@/lib/actions/app";
import { UploadDropzone } from "@/components/plan/import/upload-dropzone";
import { RecipeImportPreview } from "@/components/recipes/import/recipe-import-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import type { IngredientOption } from "@/types/database";

export function RecipeImportFlow({ ingredientOptions }: { ingredientOptions: IngredientOption[] }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [state, setState] = React.useState<Awaited<ReturnType<typeof parseRecipeImportAction>>>();
  const [pending, startTransition] = React.useTransition();
  const inputKey = file?.name ?? "empty";
  const [mode, setMode] = React.useState<"pdf" | "text">("pdf");
  const [rawText, setRawText] = React.useState("");
  const [sourceName, setSourceName] = React.useState("solana-recipe.txt");

  return (
    <div className="space-y-6">
      {!state?.parsed ? (
        <Card className="bg-card/90">
          <CardContent className="space-y-5 p-6">
            <div className="flex gap-3">
              <Button
                onClick={() => setMode("pdf")}
                type="button"
                variant={mode === "pdf" ? "default" : "outline"}
              >
                Upload PDF
              </Button>
              <Button
                onClick={() => setMode("text")}
                type="button"
                variant={mode === "text" ? "default" : "outline"}
              >
                Paste recipe text
              </Button>
            </div>

            {mode === "pdf" ? (
              <form
                action={() => {
                  startTransition(async () => {
                    if (!file) {
                      setState({ error: "Choose a recipe PDF to continue." });
                      toast.error("Choose a recipe PDF to continue.");
                      return;
                    }

                    const formData = new FormData();
                    formData.set("file", file);
                    const result = await parseRecipeImportAction(undefined, formData);
                    setState(result);
                    if (result.error) {
                      toast.error(result.error);
                    }
                  });
                }}
                className="space-y-5"
              >
                <UploadDropzone
                  description="Text-based recipe PDFs work best. We'll extract the recipe name, ingredients, and any visible instructions, then let you review before saving."
                  fileName={file?.name ?? null}
                  onFileChange={setFile}
                  title="Drop a recipe PDF here"
                />
                <input
                  key={inputKey}
                  accept="application/pdf"
                  className="block text-sm"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  type="file"
                />
                {state?.error ? <p className="text-sm font-medium text-destructive">{state.error}</p> : null}
                <div className="flex gap-3">
                  <SubmitButton disabled={pending} pendingLabel="Parsing recipe PDF...">
                    Parse recipe PDF
                  </SubmitButton>
                  <Button onClick={() => setFile(null)} type="button" variant="ghost">
                    Clear
                  </Button>
                </div>
              </form>
            ) : (
              <form
                action={() => {
                  startTransition(async () => {
                    if (!rawText.trim()) {
                      setState({ error: "Paste recipe text to continue." });
                      toast.error("Paste recipe text to continue.");
                      return;
                    }

                    const formData = new FormData();
                    formData.set("rawText", rawText);
                    formData.set("sourceName", sourceName);
                    const result = await parseRecipeTextImportAction(undefined, formData);
                    setState(result);
                    if (result.error) {
                      toast.error(result.error);
                    }
                  });
                }}
                className="space-y-5"
              >
                <div className="grid gap-4">
                  <div className="grid gap-1.5">
                    <label className="text-sm font-medium">Source label</label>
                    <Input
                      onChange={(event) => setSourceName(event.target.value)}
                      placeholder="solana-recipe.txt"
                      value={sourceName}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-sm font-medium">Recipe text</label>
                    <Textarea
                      className="min-h-[280px]"
                      onChange={(event) => setRawText(event.target.value)}
                      placeholder="Paste the visible recipe text from the nutrition app here."
                      value={rawText}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tip: while logged into the recipe page, copy the visible content or use the helper script in{" "}
                    <span className="font-medium">public/solana-recipe-copy.js</span>.
                  </p>
                </div>
                {state?.error ? <p className="text-sm font-medium text-destructive">{state.error}</p> : null}
                <div className="flex gap-3">
                  <SubmitButton disabled={pending} pendingLabel="Parsing recipe text...">
                    Parse recipe text
                  </SubmitButton>
                  <Button
                    onClick={() => {
                      setRawText("");
                      setSourceName("solana-recipe.txt");
                    }}
                    type="button"
                    variant="ghost"
                  >
                    Clear
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      ) : (
        <RecipeImportPreview
          importId={state.importId!}
          initialRecipe={state.parsed}
          ingredientOptions={ingredientOptions}
        />
      )}
    </div>
  );
}
