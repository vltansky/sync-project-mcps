import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { ClientConfig } from "../types.js";

// VS Code MCP support is read-only for now
// Writing would require merging into settings.json to avoid overwriting other settings
// TODO: Implement proper merge logic before enabling write support

function getConfigPath(): string {
  const platform = process.platform;
  if (platform === "darwin") {
    return join(homedir(), "Library/Application Support/Code/User/settings.json");
  } else if (platform === "win32") {
    return join(process.env.APPDATA || "", "Code/User/settings.json");
  }
  return join(homedir(), ".config/Code/User/settings.json");
}

export function getVSCodeConfig(_projectRoot: string): ClientConfig {
  const configPath = getConfigPath();
  const exists = existsSync(configPath);

  if (!exists) {
    return {
      name: "VS Code",
      path: configPath,
      config: null,
      exists: false,
    };
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const settings = JSON.parse(content);
    const mcpServers = settings["mcp.servers"] || settings.mcpServers || {};
    return {
      name: "VS Code",
      path: configPath,
      config: { mcpServers },
      exists: true,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`Warning: Failed to parse VS Code settings: ${msg}`);
    return {
      name: "VS Code",
      path: configPath,
      config: null,
      exists: true,
    };
  }
}
