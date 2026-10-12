export * from "./groweasy.client";
import { GrowEasyMcpClient } from "./groweasy.client";

let mcpClientInstance: GrowEasyMcpClient | null = null;

export function getGrowEasyMcpClient(): GrowEasyMcpClient {
  if (!mcpClientInstance) {
    mcpClientInstance = new GrowEasyMcpClient();
  }
  return mcpClientInstance;
}
