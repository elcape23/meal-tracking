;(async () => {
  const CLIPBOARD_PREFIX = "__MEAL_TRACKING_RECIPE__";
  const HEADING_SELECTOR = "h1,h2,h3,h4,h5,h6";
  const INGREDIENT_KEYWORDS = /\b(ingredientes?|ingredient|cantidad|unidad|medida)\b/i;
  const INSTRUCTION_KEYWORDS = /\b(instrucciones?|instructions?|procedimiento|preparaci[oó]n|m[eé]todo|pasos?)\b/i;
  const HEADER_CELL_PATTERN = /^(ingrediente|cantidad|qty|unit|unidad|unidades|crudo|cocido|medida casera|acciones?|nota|notas?)$/i;
  const GENERIC_TITLE_PATTERNS = [
    /power nutrition/i,
    /rediseño de legibilidad/i,
    /diseño de receta saludable/i,
    /consentimiento/i,
    /asistente ia/i,
    /cerrar sesión/i,
    /mis planes/i,
    /inicio servicios/i,
    /^mi espacio$/i,
    /^panel del paciente$/i,
    /^informaci[oó]n nutricional$/i,
    /^ingredientes?$/i,
    /^procedimiento$/i,
    /^preparaci[oó]n$/i
  ];

  function normalizeText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function splitLines(value) {
    return (value || "")
      .split(/\n+/)
      .map(normalizeText)
      .filter(Boolean);
  }

  function isLikelyVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function isGenericTitle(value) {
    return GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(value));
  }

  function rectsOverlapHorizontally(a, b) {
    const overlap = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const minWidth = Math.max(1, Math.min(a.width, b.width));
    return overlap / minWidth;
  }

  function getVisibleRoot() {
    return document.querySelector("main") || document.body;
  }

  function getRootText() {
    return getVisibleRoot().innerText || document.body.innerText || "";
  }

  function parseAmount(value) {
    const normalized = normalizeText(value);
    if (!normalized) {
      return { quantity: "", unit: "", note: "" };
    }

    const amountMatch = normalized.match(/^(\d+[.,]?\d*)\s*(kg|g|mg|ml|l|cc|unidad(?:es)?|u\.?)\b(.*)$/i);
    if (amountMatch) {
      return {
        quantity: amountMatch[1].replace(",", "."),
        unit: amountMatch[2].toLowerCase(),
        note: normalizeText(amountMatch[3])
      };
    }

    return {
      quantity: "",
      unit: "",
      note: normalized
    };
  }

  function findIngredientTable() {
    return Array.from(document.querySelectorAll("table"))
      .filter((element) => isLikelyVisible(element))
      .find((table) => INGREDIENT_KEYWORDS.test(normalizeText(table.textContent)));
  }

  function collectTitleCandidates() {
    return Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6,div,p,span"))
      .filter((element) => isLikelyVisible(element))
      .filter((element) => element.matches(HEADING_SELECTOR) || element.children.length === 0)
      .map((element) => ({
        element,
        text: normalizeText(element.textContent),
        rect: element.getBoundingClientRect()
      }))
      .filter((entry) => entry.text.length > 6 && entry.text.length < 140)
      .filter((entry) => !isGenericTitle(entry.text))
      .filter((entry) => !INGREDIENT_KEYWORDS.test(entry.text))
      .filter((entry) => !INSTRUCTION_KEYWORDS.test(entry.text));
  }

  function extractTitle(referenceNode) {
    const candidates = collectTitleCandidates();

    if (referenceNode) {
      const tableRect = referenceNode.getBoundingClientRect();
      const beforeTable = candidates.filter((entry) =>
        Boolean(entry.element.compareDocumentPosition(referenceNode) & Node.DOCUMENT_POSITION_FOLLOWING)
      );

      const sameColumn = beforeTable
        .filter((entry) => rectsOverlapHorizontally(entry.rect, tableRect) > 0.2)
        .filter((entry) => entry.rect.bottom <= tableRect.top + 40)
        .filter((entry) => entry.rect.width > 160)
        .sort((a, b) => b.rect.bottom - a.rect.bottom);

      if (sameColumn[0]?.text) {
        return sameColumn[0].text;
      }

      const nearest = beforeTable.at(-1);
      if (nearest?.text) {
        return nearest.text;
      }
    }

    if (candidates.length) {
      return candidates
        .sort((a, b) => (b.rect.width + b.rect.height) - (a.rect.width + a.rect.height))[0]
        .text;
    }

    const pageText = getRootText();
    const textLines = pageText
      .split(/\n+/)
      .map(normalizeText)
      .filter(Boolean)
      .filter((value) => value.length > 4 && !isGenericTitle(value));

    return textLines[0] || "Imported recipe";
  }

  function extractSectionText(keywordPattern, scope) {
    const searchRoot = scope || getVisibleRoot();
    const heading = Array.from(searchRoot.querySelectorAll(`${HEADING_SELECTOR},button,summary`))
      .find((element) => keywordPattern.test(normalizeText(element.textContent)));

    if (!heading) {
      return "";
    }

    const blocks = [];
    let current = heading.nextElementSibling;

    while (current) {
      const tag = current.tagName.toLowerCase();
      const text = normalizeText(current.textContent);

      if (
        tag.match(/^h[1-6]$/) ||
        (keywordPattern === INSTRUCTION_KEYWORDS && INGREDIENT_KEYWORDS.test(text)) ||
        (keywordPattern === INGREDIENT_KEYWORDS && INSTRUCTION_KEYWORDS.test(text))
      ) {
        break;
      }

      if (text) {
        blocks.push(text);
      }

      current = current.nextElementSibling;
    }

    const siblingText = blocks.join("\n").trim();
    if (siblingText) {
      return siblingText;
    }

    const container = heading.closest("details,section,article,div");
    if (container) {
      const containerText = splitLines(container.innerText || container.textContent || "")
        .filter((line) => !keywordPattern.test(line))
        .join("\n")
        .trim();

      if (containerText) {
        return containerText;
      }
    }

    return "";
  }

  function extractDescription(title) {
    const metadataLine = splitLines(getRootText()).find(
      (line) =>
        line !== title &&
        !isGenericTitle(line) &&
        /\b(rinde|kcal|tiempo|min)\b/i.test(line) &&
        line.length < 140
    );

    return metadataLine || "";
  }

  function parseColumnAmount(value) {
    const text = normalizeText(value).replace(/\s+/g, "");
    const match = text.match(/^(\d+[.,]?\d*)(kg|g|mg|ml|l|cc)$/i);
    if (!match) {
      return { quantity: "", unit: "" };
    }

    return {
      quantity: match[1].replace(",", "."),
      unit: match[2].toLowerCase()
    };
  }

  function extractIngredientsFromStructuredTable(table) {
    const rows = Array.from(table.querySelectorAll("tr"));
    const parsed = [];

    rows.forEach((row) => {
      const cells = Array.from(row.querySelectorAll("th,td"))
        .map((cell) => cell.innerText || cell.textContent || "")
        .map((cell) => cell.replace(/\u00a0/g, " ").trim())
        .filter(Boolean);

      if (!cells.length) {
        return;
      }

      const normalizedCells = cells.map(normalizeText);
      const headerLike = normalizedCells.every((cell) => HEADER_CELL_PATTERN.test(cell));
      if (headerLike) {
        return;
      }

      const [rawName = "", rawCrudo = "", rawCocido = "", rawMedidaCasera = ""] = cells;
      const nameLines = splitLines(rawName);
      const name = nameLines[0] || "";
      const firstNote = nameLines.slice(1).join(" ");

      if (!name || HEADER_CELL_PATTERN.test(name)) {
        return;
      }

      const crudo = parseColumnAmount(rawCrudo);
      const cocido = parseColumnAmount(rawCocido);
      const quantity = crudo.quantity || cocido.quantity;
      const unit = crudo.unit || cocido.unit;
      const medidaCasera = normalizeText(rawMedidaCasera).replace(/^[-—–]+$/, "");
      const note = normalizeText([firstNote, medidaCasera].filter(Boolean).join(" | "));

      parsed.push({
        name,
        quantity,
        unit,
        note
      });
    });

    return parsed.filter((ingredient) => ingredient.name);
  }

  function extractIngredientsFromTables(table) {
    const tables = table ? [table] : Array.from(document.querySelectorAll("table"));
    const parsed = [];

    tables.forEach((table) => {
      const tableText = normalizeText(table.textContent);
      if (!tableText || !INGREDIENT_KEYWORDS.test(tableText)) {
        return;
      }

      if (/\bcrudo\b/i.test(tableText) && /\bcocido\b/i.test(tableText) && /\bmedida casera\b/i.test(tableText)) {
        parsed.push(...extractIngredientsFromStructuredTable(table));
        return;
      }

      const rows = Array.from(table.querySelectorAll("tr"));
      rows.forEach((row) => {
        const cells = Array.from(row.querySelectorAll("th,td"))
          .map((cell) => normalizeText(cell.textContent))
          .filter(Boolean);

        if (!cells.length) {
          return;
        }

        const rowText = cells.join(" ");
        const isHeaderRow =
          cells.every((cell) => HEADER_CELL_PATTERN.test(cell)) ||
          /^ingrediente\s*cantidad$/i.test(rowText) ||
          /^ingredientes?$/i.test(rowText);

        if (isHeaderRow) {
          return;
        }

        const [firstCell = "", ...restCells] = cells;
        const firstCellAmount = parseAmount(firstCell);
        const name = firstCellAmount.quantity ? "" : firstCell;
        const remainingJoined = restCells.join(" ");
        const trailingAmount = parseAmount(remainingJoined);
        const quantity = firstCellAmount.quantity || trailingAmount.quantity;
        const unit = firstCellAmount.unit || trailingAmount.unit;
        const cleanedRest = restCells
          .filter((cell) => !HEADER_CELL_PATTERN.test(cell))
          .join(" ");
        const note = normalizeText(
          [
            firstCellAmount.note,
            trailingAmount.note,
            quantity || unit ? cleanedRest.replace(remainingJoined, "").trim() : cleanedRest
          ]
            .filter(Boolean)
            .join(" ")
        );

        parsed.push({
          name,
          quantity,
          unit,
          note
        });
      });
    });

    return parsed.filter((ingredient) => ingredient.name && !HEADER_CELL_PATTERN.test(ingredient.name));
  }

  function extractIngredientsFromLists() {
    const heading = Array.from(document.querySelectorAll(HEADING_SELECTOR))
      .find((element) => INGREDIENT_KEYWORDS.test(normalizeText(element.textContent)));

    if (!heading) {
      return [];
    }

    const list = heading.parentElement?.querySelector("ul,ol") || heading.nextElementSibling;
    const items = list ? Array.from(list.querySelectorAll("li")) : [];

    return items
      .map((item) => normalizeText(item.textContent))
      .filter(Boolean)
      .map((name) => ({ name, quantity: "", unit: "", note: "" }));
  }

  function extractIngredients() {
    const ingredientTable = findIngredientTable();
    const tableIngredients = extractIngredientsFromTables(ingredientTable);
    if (tableIngredients.length) {
      return tableIngredients;
    }

    const listIngredients = extractIngredientsFromLists();
    if (listIngredients.length) {
      return listIngredients;
    }

    return [];
  }

  async function copyToClipboard(value) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      const area = document.createElement("textarea");
      area.value = value;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      return true;
    }
  }

  async function expandInstructionSection(scope) {
    const searchRoot = scope || getVisibleRoot();
    const trigger = Array.from(
      searchRoot.querySelectorAll(`${HEADING_SELECTOR},button,summary,[role='button'],div,span`)
    ).find((element) => {
      if (!isLikelyVisible(element)) {
        return false;
      }

      const text = normalizeText(element.textContent);
      return INSTRUCTION_KEYWORDS.test(text) && text.length < 80;
    });

    if (!trigger) {
      return;
    }

    const expanded = trigger.getAttribute("aria-expanded");
    if (expanded === "true") {
      return;
    }

    if (
      trigger.matches("button,summary,[role='button']") ||
      trigger.onclick ||
      trigger.closest("button,summary,[role='button']")
    ) {
      const clickable = trigger.matches("button,summary,[role='button']")
        ? trigger
        : trigger.closest("button,summary,[role='button']");

      if (clickable instanceof HTMLElement) {
        clickable.click();
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  }

  const ingredientTable = findIngredientTable();
  const recipeScope = getVisibleRoot();
  await expandInstructionSection(recipeScope);
  const title = extractTitle(ingredientTable);
  const instructions = extractSectionText(INSTRUCTION_KEYWORDS, recipeScope);
  const payload = {
    title,
    mealType: "both",
    description: extractDescription(title),
    ingredients: extractIngredients(),
    instructions,
    rawText: getRootText()
  };

  const serialized = `${CLIPBOARD_PREFIX}${JSON.stringify(payload)}`;
  copyToClipboard(serialized).then(() => {
    alert("Structured recipe data copied. Go to /recipes/import and use Paste recipe text.");
  });
})();
