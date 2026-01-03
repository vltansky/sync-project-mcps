type TomlValue = string | string[] | Record<string, string>;
type TomlSection = Record<string, TomlValue>;

export function parseToml(content: string): Record<string, TomlSection> {
  const result: Record<string, TomlSection> = {};
  let currentSection = "";

  const lines = content.split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const sectionMatch = line.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      result[currentSection] = {};
      continue;
    }

    if (!currentSection) continue;

    const keyValueMatch = line.match(/^(\w+)\s*=\s*(.+)$/);
    if (!keyValueMatch) continue;

    const [, key, rawValue] = keyValueMatch;
    result[currentSection][key] = parseValue(rawValue.trim());
  }

  return result;
}

function parseValue(value: string): TomlValue {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }

  if (value.startsWith("[") && value.endsWith("]")) {
    return parseArray(value);
  }

  if (value.startsWith("{") && value.endsWith("}")) {
    return parseInlineTable(value);
  }

  return value;
}

function parseArray(value: string): string[] {
  const inner = value.slice(1, -1).trim();
  if (!inner) return [];

  const result: string[] = [];
  let current = "";
  let inString = false;

  for (let i = 0; i < inner.length; i++) {
    const char = inner[i];
    if (char === '"' && inner[i - 1] !== "\\") {
      inString = !inString;
      continue;
    }
    if (char === "," && !inString) {
      if (current.trim()) result.push(current.trim());
      current = "";
      continue;
    }
    if (!inString && (char === " " || char === "\t")) continue;
    current += char;
  }
  if (current.trim()) result.push(current.trim());

  return result;
}

function parseInlineTable(value: string): Record<string, string> {
  const inner = value.slice(1, -1).trim();
  if (!inner) return {};

  const result: Record<string, string> = {};
  const pairs = inner.split(",");

  for (const pair of pairs) {
    const match = pair.trim().match(/^"?(\w+)"?\s*=\s*"([^"]*)"$/);
    if (match) {
      result[match[1]] = match[2];
    }
  }

  return result;
}

export function stringifyToml(data: Record<string, TomlSection>): string {
  const lines: string[] = [];

  for (const [section, values] of Object.entries(data)) {
    lines.push(`[${section}]`);
    for (const [key, value] of Object.entries(values)) {
      lines.push(`${key} = ${stringifyValue(value)}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function stringifyValue(value: TomlValue): string {
  if (typeof value === "string") {
    return `"${value}"`;
  }

  if (Array.isArray(value)) {
    return `[${value.map((v) => `"${v}"`).join(", ")}]`;
  }

  const pairs = Object.entries(value)
    .map(([k, v]) => `"${k}" = "${v}"`)
    .join(", ");
  return `{ ${pairs} }`;
}
