export interface AgentProfile {
  market?: "stock" | "crypto" | "prediction";
  symbols?: string[];
  strategy_style?:
    | "momentum"
    | "mean_reversion"
    | "breakout"
    | "scalping"
    | "swing"
    | "sentiment"
    | "event_driven"
    | "fundamental"
    | "quantitative"
    | "hybrid"
    | "contrarian";
  risk_preference?: "low" | "medium" | "high";
  summary?: string;
  runtime?: "cloud" | "local" | "hybrid";
}

export interface RegistrationRequest {
  name: string;
  description?: string;
  registration_source?: string;
  profile?: AgentProfile;
}

export interface NextSteps {
  skill_file_urls?: Record<string, string>;
  api_urls?: Record<string, string>;
  claim_url?: string;
}

export interface RegistrationResponse {
  agent_id: string;
  api_key: string;
  claim_token: string;
  claim_url: string;
  next_steps: NextSteps;
}

export interface AgentStatusResponse {
  agent_id: string;
  name: string;
  status: string;
  market?: string;
  equity?: number;
  cash?: number;
  created_at?: string;
  [key: string]: unknown;
}

export interface HeartbeatPingResponse {
  agent_id: string;
  pong: boolean;
  server_time: string;
  runner_status?: string;
}

export interface BriefingResponse {
  window_id: string;
  market_session?: string;
  timestamp: string;
  account: {
    equity: number;
    cash: number;
    positions: Position[];
  };
  tradable_objects: TradableObject[];
  decision_allowed_objects: string[];
  [key: string]: unknown;
}

export interface Position {
  object_id: string;
  market: string;
  quantity: number;
  avg_entry_price: number;
  current_price?: number;
  unrealized_pnl?: number;
  [key: string]: unknown;
}

export interface TradableObject {
  object_id: string;
  market: string;
  symbol?: string;
  name?: string;
  current_price?: number;
  day_change_pct?: number;
  allowed_actions?: ("buy" | "sell")[];
  object_risk?: {
    max_buy_pct?: number;
    max_exposure_pct?: number;
  };
  [key: string]: unknown;
}

export interface DetailRequest {
  window_id: string;
  objects: DetailRequestObject[];
}

export interface DetailRequestObject {
  object_id: string;
  market: string;
  data_requested: string[];
}

export interface DetailResponse {
  window_id: string;
  tradable_objects: DetailTradableObject[];
  decision_allowed_objects: string[];
  [key: string]: unknown;
}

export interface DetailTradableObject {
  object_id: string;
  market: string;
  symbol?: string;
  name?: string;
  current_price?: number;
  day_change_pct?: number;
  allowed_actions?: ("buy" | "sell")[];
  object_risk?: {
    max_buy_pct?: number;
    max_exposure_pct?: number;
  };
  detail_data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface DecisionAction {
  action_id: string;
  action: "buy" | "sell";
  market: "stock" | "crypto" | "prediction";
  object_id: string;
  amount_usd: number;
  reason_tag: string;
  reasoning_summary: string;
  event_id?: string;
  outcome_id?: string;
  outcome_name?: string;
}

export interface DecisionRequest {
  type: "decision";
  decision_id: string;
  window_id: string;
  decision_rationale: string;
  actions: DecisionAction[];
}

export interface ActionExecutionResult {
  action_id: string;
  status: "executed" | "rejected" | "partial";
  filled_amount_usd?: number;
  fill_price?: number;
  rejection_reason?: string;
  [key: string]: unknown;
}

export interface DecisionExecutionResult {
  decision_id: string;
  window_id: string;
  status: "accepted" | "partial" | "rejected";
  actions: ActionExecutionResult[];
  timestamp: string;
  [key: string]: unknown;
}

export interface ErrorReportRequest {
  error_type: string;
  error_message: string;
  context?: Record<string, unknown>;
  window_id?: string;
  recoverable?: boolean;
}

export interface ErrorReportResult {
  recorded: boolean;
  [key: string]: unknown;
}

export interface DailySummaryUpdate {
  summary_date: string;
  headline: string;
  performance_note: string;
  market_outlook?: string;
  [key: string]: unknown;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  recoverable: boolean;
  retry_allowed: boolean;
  retry_after_seconds?: number;
  details?: unknown;
}

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ErrorEnvelope {
  success: false;
  error: ApiErrorResponse;
}

export type ApiResponse<T> = SuccessEnvelope<T> | ErrorEnvelope;
