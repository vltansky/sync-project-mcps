import { describe, it } from "node:test";
import assert from "node:assert";
import { mergeConfigs, getChanges } from "./merge.ts";
import type { ClientConfig } from "./types.ts";

describe("mergeConfigs", () => {
  it("should return empty mcpServers when no clients provided", () => {
    const result = mergeConfigs([]);
    assert.deepStrictEqual(result, { mcpServers: {} });
  });

  it("should return empty mcpServers when clients have no config", () => {
    const clients: ClientConfig[] = [
      { name: "Test", path: "/test", config: null, exists: false },
    ];
    const result = mergeConfigs(clients);
    assert.deepStrictEqual(result, { mcpServers: {} });
  });

  it("should merge servers from single client", () => {
    const clients: ClientConfig[] = [
      {
        name: "Cursor",
        path: ".cursor/mcp.json",
        exists: true,
        config: {
          mcpServers: {
            server1: { command: "npx", args: ["server1"] },
          },
        },
      },
    ];
    const result = mergeConfigs(clients);
    assert.deepStrictEqual(result, {
      mcpServers: {
        server1: { command: "npx", args: ["server1"] },
      },
    });
  });

  it("should merge servers from multiple clients", () => {
    const clients: ClientConfig[] = [
      {
        name: "Cursor",
        path: ".cursor/mcp.json",
        exists: true,
        config: {
          mcpServers: {
            server1: { command: "npx", args: ["server1"] },
          },
        },
      },
      {
        name: "Claude",
        path: ".mcp.json",
        exists: true,
        config: {
          mcpServers: {
            server2: { command: "npx", args: ["server2"] },
          },
        },
      },
    ];
    const result = mergeConfigs(clients);
    assert.deepStrictEqual(result, {
      mcpServers: {
        server1: { command: "npx", args: ["server1"] },
        server2: { command: "npx", args: ["server2"] },
      },
    });
  });

  it("should dedupe identical servers by name", () => {
    const clients: ClientConfig[] = [
      {
        name: "Cursor",
        path: ".cursor/mcp.json",
        exists: true,
        config: {
          mcpServers: {
            server1: { command: "npx", args: ["server1"] },
          },
        },
      },
      {
        name: "Claude",
        path: ".mcp.json",
        exists: true,
        config: {
          mcpServers: {
            server1: { command: "npx", args: ["server1"] },
          },
        },
      },
    ];
    const result = mergeConfigs(clients);
    assert.strictEqual(Object.keys(result.mcpServers).length, 1);
    assert.deepStrictEqual(result.mcpServers.server1, {
      command: "npx",
      args: ["server1"],
    });
  });

  it("should keep first occurrence when servers differ", () => {
    const clients: ClientConfig[] = [
      {
        name: "Cursor",
        path: ".cursor/mcp.json",
        exists: true,
        config: {
          mcpServers: {
            server1: { command: "npx", args: ["v1"] },
          },
        },
      },
      {
        name: "Claude",
        path: ".mcp.json",
        exists: true,
        config: {
          mcpServers: {
            server1: { command: "npx", args: ["v2"] },
          },
        },
      },
    ];
    const result = mergeConfigs(clients);
    assert.deepStrictEqual(result.mcpServers.server1, {
      command: "npx",
      args: ["v1"],
    });
  });

  it("should preserve env variables", () => {
    const clients: ClientConfig[] = [
      {
        name: "Cursor",
        path: ".cursor/mcp.json",
        exists: true,
        config: {
          mcpServers: {
            server1: {
              command: "npx",
              args: ["server1"],
              env: { API_KEY: "secret" },
            },
          },
        },
      },
    ];
    const result = mergeConfigs(clients);
    assert.deepStrictEqual(result.mcpServers.server1.env, { API_KEY: "secret" });
  });
});

describe("getChanges", () => {
  it("should return empty arrays when no changes", () => {
    const client: ClientConfig = {
      name: "Cursor",
      path: ".cursor/mcp.json",
      exists: true,
      config: {
        mcpServers: {
          server1: { command: "npx", args: ["server1"] },
        },
      },
    };
    const merged = {
      mcpServers: {
        server1: { command: "npx", args: ["server1"] },
      },
    };
    const result = getChanges(client, merged);
    assert.deepStrictEqual(result, { added: [], removed: [] });
  });

  it("should detect added servers", () => {
    const client: ClientConfig = {
      name: "Cursor",
      path: ".cursor/mcp.json",
      exists: true,
      config: {
        mcpServers: {
          server1: { command: "npx", args: ["server1"] },
        },
      },
    };
    const merged = {
      mcpServers: {
        server1: { command: "npx", args: ["server1"] },
        server2: { command: "npx", args: ["server2"] },
      },
    };
    const result = getChanges(client, merged);
    assert.deepStrictEqual(result.added, ["server2"]);
    assert.deepStrictEqual(result.removed, []);
  });

  it("should detect removed servers", () => {
    const client: ClientConfig = {
      name: "Cursor",
      path: ".cursor/mcp.json",
      exists: true,
      config: {
        mcpServers: {
          server1: { command: "npx", args: ["server1"] },
          server2: { command: "npx", args: ["server2"] },
        },
      },
    };
    const merged = {
      mcpServers: {
        server1: { command: "npx", args: ["server1"] },
      },
    };
    const result = getChanges(client, merged);
    assert.deepStrictEqual(result.added, []);
    assert.deepStrictEqual(result.removed, ["server2"]);
  });

  it("should handle client with no config", () => {
    const client: ClientConfig = {
      name: "Cursor",
      path: ".cursor/mcp.json",
      exists: false,
      config: null,
    };
    const merged = {
      mcpServers: {
        server1: { command: "npx", args: ["server1"] },
      },
    };
    const result = getChanges(client, merged);
    assert.deepStrictEqual(result.added, ["server1"]);
    assert.deepStrictEqual(result.removed, []);
  });
});
