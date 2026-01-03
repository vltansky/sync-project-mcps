# sync-project-mcps

**Zero-config project-level MCP synchronization across AI coding assistants.**

One command. All your project MCP servers. Every editor.

```bash
npx -y sync-project-mcps@latest
```

---

## The Problem

You use multiple AI coding assistants - Cursor, Claude Code, Windsurf, Cline. Each has its own MCP configuration file in a different location. Adding a new MCP server means updating 3-5 config files manually. Forgetting one means inconsistent tooling across editors.

## The Solution

`sync-project-mcps` finds all your project MCP configurations, merges them, and writes the unified config back to all clients. **No setup required.**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   .cursor/mcp.json ──┐                                      │
│                      │                                      │
│   .mcp.json ─────────┼──► MERGE ──► Write to ALL clients    │
│                      │                                      │
│   .windsurf/... ─────┘                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Run Once (npx)

```bash
npx -y sync-project-mcps@latest
```

### Preview Changes

```bash
npx -y sync-project-mcps@latest --dry-run
```

### Verbose Output

```bash
npx -y sync-project-mcps@latest -v
```

---

## Supported Clients

| Client | Config Location | Status |
|--------|-----------------|--------|
| **Cursor** | `.cursor/mcp.json` | Project |
| **Claude Code** | `.mcp.json` | Project |
| **Windsurf** | `.windsurf/mcp.json` | Project |
| **Cline** | VS Code globalStorage | Global |
| **Roo Code** | `.roo/mcp.json` | Project |

---

## Installation

### Option 1: Run with npx (Recommended)

No installation needed:

```bash
npx -y sync-project-mcps@latest
```

### Option 2: Install Globally

```bash
npm install -g sync-project-mcps
sync-project-mcps
```

---

## Adding MCP Servers

### For Cursor

Click to install an MCP server directly:

[![Add to Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=example&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyJleGFtcGxlLW1jcCJdfQ==)

Or add manually to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "example": {
      "command": "npx",
      "args": ["example-mcp"]
    }
  }
}
```

### For Claude Code

Install globally with the Claude CLI:

```bash
claude mcp add example -s user -- npx example-mcp
```

Or add to project-level `.mcp.json`:

```json
{
  "mcpServers": {
    "example": {
      "command": "npx",
      "args": ["example-mcp"]
    }
  }
}
```

### Then Sync

```bash
npx -y sync-project-mcps@latest
```

Your MCP server is now available in **all** your AI coding assistants.

---

## How It Works

1. **Discovers** MCP configs from all supported clients
2. **Merges** all `mcpServers` entries (dedupes by name)
3. **Writes** the unified config to every client location

```
$ npx -y sync-project-mcps@latest

Sync MCP Configurations

Found configurations:
  + Cursor: 3 server(s)
  + Claude Code: 2 server(s)

Merged result: 4 unique server(s)
  - context7
  - filesystem
  - github
  - playwright

Syncing to clients...
  [update] Cursor (no changes)
  [update] Claude Code (+1)
  [create] Windsurf (+4)
  [create] Cline (+4)
  [create] Roo Code (+4)

Done!
```

---

## CLI Options

```
sync-project-mcps [options]

Options:
  --dry-run     Show what would be synced without writing files
  -v, --verbose Show detailed information about each server
  -h, --help    Show help message
  --version     Show version
```

---

## FAQ

### Does it delete servers?

No. It only adds missing servers. If a server exists in Cursor but not Claude Code, it gets added to Claude Code. Servers are never removed.

### What if the same server has different configs?

First occurrence wins. If `github` is configured differently in Cursor vs Claude Code, the Cursor config is used (it's checked first).

### Does it support environment variables?

Yes. Environment variables in configs are preserved as-is.

### What about global vs project configs?

Currently syncs project-level configs. Global config support is planned.

---

## Comparison

| Feature | sync-project-mcps | sync-mcp | mcpm.sh |
|---------|-------------------|----------|---------|
| Scope | Project-level | Global/user | Global |
| Zero config | Yes | No | No |
| npx support | Yes | Yes | No |
| Direction | Merge all | One-to-one | Manual |

**sync-project-mcps** is for developers who want project MCP configs synced across all editors with zero friction.

---

## Development

```bash
git clone https://github.com/user/sync-project-mcps
cd sync-project-mcps
npm install
npm run build
node dist/index.js
```

---

## License

MIT
