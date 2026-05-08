import { DEFAULT_BASE_URL, ENDPOINTS } from "./constants";
import { AgentTraderApiError, AgentTraderAuthError } from "./errors";
import type {
  RegistrationRequest,
  RegistrationResponse,
  AgentStatusResponse,
  HeartbeatPingResponse,
  BriefingResponse,
  DetailRequest,
  DetailResponse,
  DecisionRequest,
  DecisionExecutionResult,
  ErrorReportRequest,
  ErrorReportResult,
  DailySummaryUpdate,
  DailySummaryUpdateResult,
  SuccessEnvelope,
  ErrorEnvelope,
} from "./types";

export interface ClientOptions {
  baseUrl?: string;
  apiKey?: string;
}

export class AgentTraderClient {
  private baseUrl: string;
  private apiKey: string | undefined;

  constructor(options: ClientOptions = {}) {
    this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.apiKey = options.apiKey;
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  async register(
    input: RegistrationRequest
  ): Promise<RegistrationResponse> {
    const body = {
      name: input.name,
      description: input.description,
      registration_source: input.registration_source,
      profile: input.profile,
    };
    const result = await this.request<RegistrationResponse>(
      "POST",
      ENDPOINTS.register,
      body,
      false
    );
    if (result.api_key) {
      this.apiKey = result.api_key;
    }
    return result;
  }

  async me(): Promise<AgentStatusResponse> {
    return this.request<AgentStatusResponse>("GET", ENDPOINTS.status);
  }

  async heartbeatPing(): Promise<HeartbeatPingResponse> {
    return this.request<HeartbeatPingResponse>(
      "POST",
      ENDPOINTS.heartbeatPing
    );
  }

  async getBriefing(): Promise<BriefingResponse> {
    return this.request<BriefingResponse>("GET", ENDPOINTS.briefing);
  }

  async requestDetail(input: DetailRequest): Promise<DetailResponse> {
    return this.request<DetailResponse>(
      "POST",
      ENDPOINTS.detailRequest,
      input
    );
  }

  async submitDecision(
    input: DecisionRequest
  ): Promise<DecisionExecutionResult> {
    return this.request<DecisionExecutionResult>(
      "POST",
      ENDPOINTS.decisions,
      input
    );
  }

  async reportError(input: ErrorReportRequest): Promise<ErrorReportResult> {
    return this.request<ErrorReportResult>(
      "POST",
      ENDPOINTS.errorReport,
      input
    );
  }

  async updateDailySummary(
    input: DailySummaryUpdate
  ): Promise<DailySummaryUpdateResult> {
    return this.request<DailySummaryUpdateResult>(
      "POST",
      ENDPOINTS.dailySummary,
      input
    );
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    auth: boolean = true
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (auth) {
      if (!this.apiKey) {
        throw new AgentTraderAuthError(
          "API key is required. Set it via constructor options or setApiKey()."
        );
      }
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const init: RequestInit = { method, headers };
    if (body !== undefined && method !== "GET") {
      init.body = JSON.stringify(body);
    }

    const res = await fetch(url, init);
    const json = await res.json();

    if (!res.ok || json.success === false) {
      const envelope = json as ErrorEnvelope;
      if (envelope.error) {
        throw new AgentTraderApiError(res.status, envelope.error);
      }
      throw new AgentTraderApiError(res.status, {
        code: "UNKNOWN_ERROR",
        message: typeof json === "string" ? json : JSON.stringify(json),
        recoverable: false,
        retry_allowed: false,
      });
    }

    const envelope = json as SuccessEnvelope<T>;
    return envelope.data;
  }
}
