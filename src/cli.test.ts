import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const CLI_PATH = join(import.meta.dirname, "../dist/index.js");

function createTempDir(): string {
  const dir = join(tmpdir(), `sync-mcps-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function runCli(cwd: string, args: string[] = []): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`node ${CLI_PATH} ${args.join(" ")}`, {
      cwd,
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
    });
    return { stdout, stderr: "", exitCode: 0 };
  } catch (error: unknown) {
    const e = error as { stdout?: string; stderr?: string; status?: number };
    return { stdout: e.stdout ?? "", stderr: e.stderr ?? "", exitCode: e.status ?? 1 };
  }
}

function writeConfig(dir: string, relativePath: string, config: object): void {
  const fullPath = join(dir, relativePath);
  const parentDir = join(fullPath, "..");
  mkdirSync(parentDir, { recursive: true });
  writeFileSync(fullPath, JSON.stringify(config, null, 2));
}

function readConfig(dir: string, relativePath: string): object | null {
  const fullPath = join(dir, relativePath);
  if (!existsSync(fullPath)) return null;
  return JSON.parse(readFileSync(fullPath, "utf-8"));
}

describe("CLI E2E", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("should exit with error when no configs found", () => {
    const { stdout, exitCode } = runCli(tempDir);
    assert.strictEqual(exitCode, 1);
    assert.ok(stdout.includes("No MCP configurations found"));
  });

  it("should show help with --help flag", () => {
    const { stdout, exitCode } = runCli(tempDir, ["--help"]);
    assert.strictEqual(exitCode, 0);
    assert.ok(stdout.includes("sync-project-mcps"));
    assert.ok(stdout.includes("--dry-run"));
    assert.ok(stdout.includes("SUPPORTED CLIENTS"));
  });

  it("should sync from Cursor to Claude Code", () => {
    writeConfig(tempDir, ".cursor/mcp.json", {
      mcpServers: {
        server1: { command: "npx", args: ["server1"] },
      },
    });
    writeConfig(tempDir, ".mcp.json", {
      mcpServers: {},
    });

    const { stdout, exitCode } = runCli(tempDir);
    assert.strictEqual(exitCode, 0);
    assert.ok(stdout.includes("Found configurations"));
    assert.ok(stdout.includes("Cursor: 1 server"));

    const claudeConfig = readConfig(tempDir, ".mcp.json") as { mcpServers: Record<string, unknown> };
    assert.ok(claudeConfig.mcpServers.server1);
  });

  it("should sync from Claude Code to Cursor", () => {
    writeConfig(tempDir, ".cursor/mcp.json", {
      mcpServers: {},
    });
    writeConfig(tempDir, ".mcp.json", {
      mcpServers: {
        server1: { command: "npx", args: ["server1"] },
      },
    });

    const { stdout, exitCode } = runCli(tempDir);
    assert.strictEqual(exitCode, 0);

    const cursorConfig = readConfig(tempDir, ".cursor/mcp.json") as { mcpServers: Record<string, unknown> };
    assert.ok(cursorConfig.mcpServers.server1);
  });

  it("should merge servers from multiple clients", () => {
    writeConfig(tempDir, ".cursor/mcp.json", {
      mcpServers: {
        server1: { command: "npx", args: ["server1"] },
      },
    });
    writeConfig(tempDir, ".mcp.json", {
      mcpServers: {
        server2: { command: "npx", args: ["server2"] },
      },
    });

    const { exitCode } = runCli(tempDir);
    assert.strictEqual(exitCode, 0);

    const cursorConfig = readConfig(tempDir, ".cursor/mcp.json") as { mcpServers: Record<string, unknown> };
    const claudeConfig = readConfig(tempDir, ".mcp.json") as { mcpServers: Record<string, unknown> };

    assert.ok(cursorConfig.mcpServers.server1);
    assert.ok(cursorConfig.mcpServers.server2);
    assert.ok(claudeConfig.mcpServers.server1);
    assert.ok(claudeConfig.mcpServers.server2);
  });

  it("should NOT create new client configs", () => {
    writeConfig(tempDir, ".cursor/mcp.json", {
      mcpServers: {
        server1: { command: "npx", args: ["server1"] },
      },
    });

    const { exitCode } = runCli(tempDir);
    assert.strictEqual(exitCode, 0);

    assert.strictEqual(existsSync(join(tempDir, ".mcp.json")), false);
    assert.strictEqual(existsSync(join(tempDir, ".windsurf/mcp.json")), false);
    assert.strictEqual(existsSync(join(tempDir, ".cline/mcp.json")), false);
    assert.strictEqual(existsSync(join(tempDir, ".roo/mcp.json")), false);
  });

  it("should NOT modify file when no changes needed", () => {
    const config = {
      mcpServers: {
        server1: { command: "npx", args: ["server1"] },
      },
    };
    writeConfig(tempDir, ".cursor/mcp.json", config);

    const originalContent = readFileSync(join(tempDir, ".cursor/mcp.json"), "utf-8");

    const { stdout, exitCode } = runCli(tempDir);
    assert.strictEqual(exitCode, 0);
    assert.ok(stdout.includes("[skip]") || stdout.includes("skip"));

    const newContent = readFileSync(join(tempDir, ".cursor/mcp.json"), "utf-8");
    assert.strictEqual(originalContent, newContent);
  });

  it("should respect --dry-run flag", () => {
    writeConfig(tempDir, ".cursor/mcp.json", {
      mcpServers: {
        server1: { command: "npx", args: ["server1"] },
      },
    });
    writeConfig(tempDir, ".mcp.json", {
      mcpServers: {},
    });

    const { stdout, exitCode } = runCli(tempDir, ["--dry-run"]);
    assert.strictEqual(exitCode, 0);
    assert.ok(stdout.includes("DRY RUN"));

    const claudeConfig = readConfig(tempDir, ".mcp.json") as { mcpServers: Record<string, unknown> };
    assert.strictEqual(Object.keys(claudeConfig.mcpServers).length, 0);
  });

  it("should preserve env variables during sync", () => {
    writeConfig(tempDir, ".cursor/mcp.json", {
      mcpServers: {
        server1: {
          command: "npx",
          args: ["server1"],
          env: { API_KEY: "secret123" },
        },
      },
    });
    writeConfig(tempDir, ".mcp.json", {
      mcpServers: {},
    });

    runCli(tempDir);

    const claudeConfig = readConfig(tempDir, ".mcp.json") as {
      mcpServers: { server1: { env: { API_KEY: string } } };
    };
    assert.strictEqual(claudeConfig.mcpServers.server1.env.API_KEY, "secret123");
  });

  it("should handle all supported clients", () => {
    writeConfig(tempDir, ".cursor/mcp.json", { mcpServers: { s1: { command: "a" } } });
    writeConfig(tempDir, ".mcp.json", { mcpServers: { s2: { command: "b" } } });
    writeConfig(tempDir, ".windsurf/mcp.json", { mcpServers: { s3: { command: "c" } } });
    writeConfig(tempDir, ".cline/mcp.json", { mcpServers: { s4: { command: "d" } } });
    writeConfig(tempDir, ".roo/mcp.json", { mcpServers: { s5: { command: "e" } } });

    const { stdout, exitCode } = runCli(tempDir);
    assert.strictEqual(exitCode, 0);
    assert.ok(stdout.includes("5 unique server"));

    for (const path of [".cursor/mcp.json", ".mcp.json", ".windsurf/mcp.json", ".cline/mcp.json", ".roo/mcp.json"]) {
      const config = readConfig(tempDir, path) as { mcpServers: Record<string, unknown> };
      assert.strictEqual(Object.keys(config.mcpServers).length, 5);
    }
  });

  it("should use --source flag to sync from specific client", () => {
    writeConfig(tempDir, ".cursor/mcp.json", {
      mcpServers: {
        server1: { command: "npx", args: ["server1"] },
      },
    });
    writeConfig(tempDir, ".mcp.json", {
      mcpServers: {
        server1: { command: "npx", args: ["server1"] },
        server2: { command: "npx", args: ["server2"] },
        server3: { command: "npx", args: ["server3"] },
      },
    });

    const { stdout, exitCode } = runCli(tempDir, ["-s", "cursor"]);
    assert.strictEqual(exitCode, 0);
    assert.ok(stdout.includes("Source: Cursor"));

    const claudeConfig = readConfig(tempDir, ".mcp.json") as { mcpServers: Record<string, unknown> };
    assert.strictEqual(Object.keys(claudeConfig.mcpServers).length, 1);
    assert.ok(claudeConfig.mcpServers.server1);
  });

  it("should show removed servers when using --source with verbose", () => {
    writeConfig(tempDir, ".cursor/mcp.json", {
      mcpServers: { keep: { command: "a" } },
    });
    writeConfig(tempDir, ".mcp.json", {
      mcpServers: { keep: { command: "a" }, remove: { command: "b" } },
    });

    const { stdout, exitCode } = runCli(tempDir, ["-s", "cursor", "-v"]);
    assert.strictEqual(exitCode, 0);
    assert.ok(stdout.includes("-1") || stdout.includes("- remove"));
  });

  it("should support Gemini CLI", () => {
    writeConfig(tempDir, ".cursor/mcp.json", {
      mcpServers: { server1: { command: "npx", args: ["server1"] } },
    });
    writeConfig(tempDir, ".gemini/settings.json", {
      theme: "dark",
      mcpServers: {},
    });

    const { exitCode } = runCli(tempDir);
    assert.strictEqual(exitCode, 0);

    const geminiConfig = readConfig(tempDir, ".gemini/settings.json") as {
      theme: string;
      mcpServers: Record<string, unknown>;
    };
    assert.strictEqual(geminiConfig.theme, "dark");
    assert.ok(geminiConfig.mcpServers.server1);
  });

  it("should error on invalid --source value", () => {
    writeConfig(tempDir, ".cursor/mcp.json", { mcpServers: {} });

    const { stderr, exitCode } = runCli(tempDir, ["-s", "invalid"]);
    assert.strictEqual(exitCode, 1);
    assert.ok(stderr.includes("Unknown source"));
  });

  it("should sync to Codex TOML format", () => {
    writeConfig(tempDir, ".cursor/mcp.json", {
      mcpServers: {
        server1: { command: "npx", args: ["server1"], env: { KEY: "value" } },
      },
    });
    const codexPath = join(tempDir, ".codex/config.toml");
    mkdirSync(join(tempDir, ".codex"), { recursive: true });
    writeFileSync(codexPath, "[mcp_servers.existing]\ncommand = \"old\"\n");

    const { exitCode } = runCli(tempDir);
    assert.strictEqual(exitCode, 0);

    const content = readFileSync(codexPath, "utf-8");
    assert.ok(content.includes("[mcp_servers.server1]"));
    assert.ok(content.includes('command = "npx"'));
    assert.ok(content.includes('args = ["server1"]'));
    assert.ok(content.includes('"KEY" = "value"'));
  });

  it("should read from Codex TOML format", () => {
    const codexPath = join(tempDir, ".codex/config.toml");
    mkdirSync(join(tempDir, ".codex"), { recursive: true });
    writeFileSync(
      codexPath,
      '[mcp_servers.toml_server]\ncommand = "npx"\nargs = ["toml-mcp"]\nenv = { "API_KEY" = "secret" }\n'
    );
    writeConfig(tempDir, ".mcp.json", { mcpServers: {} });

    const { stdout, exitCode } = runCli(tempDir);
    assert.strictEqual(exitCode, 0);
    assert.ok(stdout.includes("Codex: 1 server"));

    const claudeConfig = readConfig(tempDir, ".mcp.json") as {
      mcpServers: { toml_server: { command: string; args: string[]; env: { API_KEY: string } } };
    };
    assert.strictEqual(claudeConfig.mcpServers.toml_server.command, "npx");
    assert.deepStrictEqual(claudeConfig.mcpServers.toml_server.args, ["toml-mcp"]);
    assert.strictEqual(claudeConfig.mcpServers.toml_server.env.API_KEY, "secret");
  });

  it("should sync to OpenCode JSONC format", () => {
    writeConfig(tempDir, ".cursor/mcp.json", {
      mcpServers: {
        server1: { command: "npx", args: ["server1"], env: { KEY: "value" } },
      },
    });
    const opencodePath = join(tempDir, ".opencode/opencode.jsonc");
    mkdirSync(join(tempDir, ".opencode"), { recursive: true });
    writeFileSync(opencodePath, '// comment\n{ "mcp": {} }');

    const { exitCode } = runCli(tempDir);
    assert.strictEqual(exitCode, 0);

    const content = readFileSync(opencodePath, "utf-8");
    const parsed = JSON.parse(content);
    assert.strictEqual(parsed.mcp.server1.type, "local");
    assert.deepStrictEqual(parsed.mcp.server1.command, ["npx", "server1"]);
    assert.deepStrictEqual(parsed.mcp.server1.environment, { KEY: "value" });
  });

  it("should read from OpenCode JSONC format", () => {
    const opencodePath = join(tempDir, ".opencode/opencode.jsonc");
    mkdirSync(join(tempDir, ".opencode"), { recursive: true });
    const opencodeContent = JSON.stringify({
      mcp: {
        opencode_server: {
          type: "local",
          command: ["npx", "opencode-mcp", "--flag"],
          environment: { TOKEN: "abc123" },
        },
      },
    });
    writeFileSync(opencodePath, opencodeContent);
    writeConfig(tempDir, ".mcp.json", { mcpServers: {} });

    const { stdout, exitCode } = runCli(tempDir);
    assert.strictEqual(exitCode, 0);
    assert.ok(stdout.includes("OpenCode: 1 server"));

    const claudeConfig = readConfig(tempDir, ".mcp.json") as {
      mcpServers: { opencode_server: { command: string; args: string[]; env: { TOKEN: string } } };
    };
    assert.strictEqual(claudeConfig.mcpServers.opencode_server.command, "npx");
    assert.deepStrictEqual(claudeConfig.mcpServers.opencode_server.args, ["opencode-mcp", "--flag"]);
    assert.strictEqual(claudeConfig.mcpServers.opencode_server.env.TOKEN, "abc123");
  });

  it("should preserve OpenCode remote MCP servers", () => {
    const opencodePath = join(tempDir, ".opencode/opencode.jsonc");
    mkdirSync(join(tempDir, ".opencode"), { recursive: true });
    const opencodeContent = JSON.stringify({
      mcp: {
        remote_server: { type: "remote", url: "https://example.com/mcp" },
        local_server: { type: "local", command: ["old"] },
      },
    });
    writeFileSync(opencodePath, opencodeContent);
    writeConfig(tempDir, ".cursor/mcp.json", {
      mcpServers: { new_server: { command: "npx", args: ["new"] } },
    });

    const { exitCode } = runCli(tempDir);
    assert.strictEqual(exitCode, 0);

    const content = readFileSync(opencodePath, "utf-8");
    const parsed = JSON.parse(content);
    assert.strictEqual(parsed.mcp.remote_server.type, "remote");
    assert.strictEqual(parsed.mcp.remote_server.url, "https://example.com/mcp");
    assert.ok(parsed.mcp.new_server);
  });

  it("should use Codex as source with --source flag", () => {
    const codexPath = join(tempDir, ".codex/config.toml");
    mkdirSync(join(tempDir, ".codex"), { recursive: true });
    writeFileSync(codexPath, '[mcp_servers.keep]\ncommand = "keep"\n');
    writeConfig(tempDir, ".mcp.json", {
      mcpServers: { keep: { command: "keep" }, remove: { command: "remove" } },
    });

    const { stdout, exitCode } = runCli(tempDir, ["-s", "codex"]);
    assert.strictEqual(exitCode, 0);
    assert.ok(stdout.includes("Source: Codex"));

    const claudeConfig = readConfig(tempDir, ".mcp.json") as { mcpServers: Record<string, unknown> };
    assert.strictEqual(Object.keys(claudeConfig.mcpServers).length, 1);
    assert.ok(claudeConfig.mcpServers.keep);
  });
});
