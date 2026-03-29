import fs from "fs";
import path from "path";
import { OfficeItem } from "./types";

type Prefix = "P" | "H" | "R" | "T" | "S" | "RO" | "F";

const CATEGORY_BY_PREFIX: Record<Prefix, OfficeItem["category"]> = {
  P: "physical",
  H: "behavior",
  R: "ritual",
  T: "tool",
  S: "signal",
  RO: "role",
  F: "failure",
};

const TYPE_BY_PREFIX: Record<Prefix, OfficeItem["type"]> = {
  P: "physical",
  H: "behavior",
  R: "ritual",
  T: "tool",
  S: "signal",
  RO: "role",
  F: "failure",
};

/**
 * Parse the office-immersive-300.md backlog into structured items.
 * This keeps the markdown as the single source of truth while giving
 * the UI a typed list.
 */
export function loadOfficeItems(): OfficeItem[] {
  const jsonPath = path.join(process.cwd(), "content", "office-items.json");
  if (fs.existsSync(jsonPath)) {
    try {
      const raw = fs.readFileSync(jsonPath, "utf8");
      const parsed = JSON.parse(raw) as OfficeItem[];
      return parsed;
    } catch (err) {
      // fall through to markdown parse
    }
  }

  const filePath = path.join(process.cwd(), "office-immersive-300.md");
  if (!fs.existsSync(filePath)) return [];

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const items: OfficeItem[] = [];

  const lineRegex = /^-\s+\[(?<id>[A-Z]+[0-9]+)\]\s+(?<title>.+)$/;

  for (const raw of lines) {
    const match = raw.match(lineRegex);
    if (!match || !match.groups) continue;
    const id = match.groups.id;
    const title = match.groups.title.trim();

    const prefix = (id.startsWith("RO") ? "RO" : id[0]) as Prefix;
    const category = CATEGORY_BY_PREFIX[prefix];
    const type = TYPE_BY_PREFIX[prefix];

    if (!category || !type) continue;

    items.push({
      id,
      title,
      category,
      type,
      status: "backlog",
    });
  }

  return items;
}

export function groupOfficeItemsByCategory(items: OfficeItem[]): Record<OfficeItem["category"], OfficeItem[]> {
  const grouped: Record<OfficeItem["category"], OfficeItem[]> = {
    physical: [],
    behavior: [],
    ritual: [],
    tool: [],
    signal: [],
    role: [],
    failure: [],
  };
  items.forEach((item) => {
    grouped[item.category].push(item);
  });
  return grouped;
}
