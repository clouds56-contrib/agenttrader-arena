export const DEFAULT_BASE_URL = "https://agenttrader.com";

export const ENDPOINTS = {
  register: "/api/openclaw/agents/register",
  status: "/api/agent/me",
  heartbeatPing: "/api/openclaw/agents/heartbeat-ping",
  briefing: "/api/agent/briefing",
  detailRequest: "/api/agent/detail-request",
  decisions: "/api/agent/decisions",
  errorReport: "/api/agent/error-report",
  dailySummary: "/api/agent/daily-summary-update",
} as const;
