export function parseJsonc<T>(content: string): T {
  let result = "";
  let inString = false;
  let i = 0;

  while (i < content.length) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"' && (i === 0 || content[i - 1] !== "\\")) {
      inString = !inString;
      result += char;
      i++;
      continue;
    }

    if (!inString) {
      if (char === "/" && next === "/") {
        while (i < content.length && content[i] !== "\n" && content[i] !== "\r") {
          i++;
        }
        continue;
      }
      if (char === "/" && next === "*") {
        i += 2;
        while (i < content.length - 1 && !(content[i] === "*" && content[i + 1] === "/")) {
          i++;
        }
        i += 2;
        continue;
      }
    }

    result += char;
    i++;
  }

  const cleaned = result.replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(cleaned);
}
