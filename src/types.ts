export type McpServer = {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  disabled?: boolean;
};

export type McpConfig = {
  mcpServers: Record<string, McpServer>;
};

export type ClientConfig = {
  name: string;
  path: string;
  config: McpConfig | null;
  exists: boolean;
};
