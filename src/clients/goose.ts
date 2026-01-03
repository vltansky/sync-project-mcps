import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { ClientConfig } from "../types.js";

// Goose uses YAML config - disabled to avoid adding yaml dependency
// TODO: Enable when yaml parsing is added

function getConfigPath(): string {
  const platform = process.platform;
  if (platform === "win32") {
    return join(process.env.USERPROFILE || "", ".config/goose/config.yaml");
  }
  return join(homedir(), ".config/goose/config.yaml");
}

export function getGooseConfig(_projectRoot: string): ClientConfig {
  const configPath = getConfigPath();
  return {
    name: "Goose",
    path: configPath,
    config: null,
    exists: existsSync(configPath),
  };
}
