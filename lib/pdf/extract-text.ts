import pdf from "pdf-parse";

async function extractWithPdfJs(buffer: Buffer) {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer)
  });
  const pdfDocument = await loadingTask.promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .trim();

    if (text) {
      pages.push(text);
    }
  }

  return pages.join("\n\n").trim();
}

export async function extractPdfText(buffer: Buffer) {
  const header = buffer.subarray(0, 8).toString("latin1");
  if (!header.includes("%PDF")) {
    throw new Error("The uploaded file does not look like a valid PDF.");
  }

  let pdfParseError = "";
  try {
    const parsed = await pdf(buffer);
    const text = parsed.text?.trim() ?? "";

    if (text) {
      return text;
    }
  } catch (error) {
    pdfParseError = error instanceof Error ? error.message : String(error);
  }

  try {
    const text = await extractWithPdfJs(buffer);
    if (text) {
      return text;
    }
  } catch (error) {
    const pdfJsError = error instanceof Error ? error.message : String(error);
    throw new Error(
      `PDF extraction failed with both parsers. pdf-parse: ${pdfParseError || "no message"}. pdfjs: ${pdfJsError}`
    );
  }

  throw new Error(
    "The PDF was read, but no selectable text was found. It may be scanned or image-based."
  );
}
