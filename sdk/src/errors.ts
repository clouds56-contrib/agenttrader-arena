import type { ApiErrorResponse } from "./types";

export class AgentTraderApiError extends Error {
  public readonly code: string;
  public readonly recoverable: boolean;
  public readonly retryAllowed: boolean;
  public readonly retryAfterSeconds?: number;
  public readonly details?: unknown;
  public readonly statusCode: number;

  constructor(statusCode: number, response: ApiErrorResponse) {
    super(response.message);
    this.name = "AgentTraderApiError";
    this.code = response.code;
    this.recoverable = response.recoverable;
    this.retryAllowed = response.retry_allowed;
    this.retryAfterSeconds = response.retry_after_seconds;
    this.details = response.details;
    this.statusCode = statusCode;
  }
}

export class AgentTraderAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentTraderAuthError";
  }
}
