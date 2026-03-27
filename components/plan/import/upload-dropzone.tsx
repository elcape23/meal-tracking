"use client";

import * as React from "react";
import { UploadCloud } from "lucide-react";

import { cn } from "@/lib/utils";

export function UploadDropzone({
  fileName,
  onFileChange,
  title = "Drop a meal plan PDF here",
  description = "Text-based PDFs work best. We’ll extract lunch and dinner, show warnings for low-confidence rows, and let you review everything before saving."
}: {
  fileName: string | null;
  onFileChange: (file: File | null) => void;
  title?: string;
  description?: string;
}) {
  const [dragging, setDragging] = React.useState(false);

  return (
    <label
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-border bg-card/70 p-10 text-center transition",
        dragging && "border-primary bg-primary/5"
      )}
      onDragLeave={() => setDragging(false)}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        onFileChange(event.dataTransfer.files[0] ?? null);
      }}
    >
      <UploadCloud className="mb-4 h-10 w-10 text-primary" />
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      <span className="mt-4 rounded-full bg-secondary px-4 py-2 text-sm font-medium">
        {fileName ?? "Choose PDF"}
      </span>
    </label>
  );
}
