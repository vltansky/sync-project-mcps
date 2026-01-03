import type { ClientConfig, McpConfig, McpServer } from "./types.js";

function serversEqual(a: McpServer, b: McpServer): boolean {
  return (
    a.command === b.command &&
    JSON.stringify(a.args ?? []) === JSON.stringify(b.args ?? []) &&
    JSON.stringify(a.env ?? {}) === JSON.stringify(b.env ?? {})
  );
}

export function mergeConfigs(clients: ClientConfig[]): McpConfig {
  const merged: Record<string, McpServer> = {};

  for (const client of clients) {
    if (!client.config?.mcpServers) continue;

    for (const [name, server] of Object.entries(client.config.mcpServers)) {
      if (!merged[name]) {
        merged[name] = { ...server };
        continue;
      }

      if (!serversEqual(merged[name], server)) {
        console.log(
          `  Warning: "${name}" differs between configs, keeping first occurrence`
        );
      }
    }
  }

  return { mcpServers: merged };
}

export function getChanges(
  client: ClientConfig,
  merged: McpConfig
): { added: string[]; removed: string[] } {
  const currentServers = new Set(
    Object.keys(client.config?.mcpServers ?? {})
  );
  const mergedServers = new Set(Object.keys(merged.mcpServers));

  const added = [...mergedServers].filter((s) => !currentServers.has(s));
  const removed = [...currentServers].filter((s) => !mergedServers.has(s));

  return { added, removed };
}
