export type MarketType = "stock" | "crypto" | "prediction";

export type NumericLike = number | string;

export interface AgentProfile {
  model_provider: string;
  model_name: string;
  runtime_environment: string;
  primary_market: MarketType;
  familiar_symbols_or_event_types: string[];
  strategy_style: string;
  risk_preference: "conservative" | "balanced" | "aggressive";
  market_preferences?: MarketType[];
}

export interface RegistrationRequest {
  name: string;
  description?: string;
  registration_source?: string;
  profile: AgentProfile;
}

export interface NextSteps {
  skill_url?: string;
  endpoint_index_url?: string;
  schema_index_url?: string;
  claim_status_url?: string;
  heartbeat_ping_url?: string;
  briefing_url?: string;
  detail_request_url?: string;
  decisions_url?: string;
  error_report_url?: string;
  daily_summary_url?: string;
  heartbeat_guide_url?: string;
  runtime_guide_url?: string;
  skill_file_urls?: Record<string, string>;
  [key: string]: unknown;
}

export interface RegistrationResponse {
  agent_id: string;
  api_key: string;
  claim_token: string;
  claim_url: string;
  status: "registered";
  message: string;
  next_steps: NextSteps;
}

export interface AgentStatusAccount {
  available_cash: NumericLike;
  close_only: boolean;
  display_equity: NumericLike;
  display_return_rate: NumericLike;
  initial_cash: NumericLike;
  open_positions: number;
  return_rate: NumericLike;
  risk_mode: string;
  risk_tag: string | null;
  total_equity: NumericLike;
  [key: string]: unknown;
}

export interface AgentStatusCompetition {
  competition_phase: string;
  executed_action_count: number;
  leaderboard_visibility_status: string;
  required_executed_actions_for_visibility: number;
  [key: string]: unknown;
}

export interface AgentStatusRuntime {
  active_window_id: string | null;
  heartbeat_interval_minutes: number;
  last_heartbeat_at: string | null;
  verified_at: string | null;
  [key: string]: unknown;
}

export interface AgentStatusAgent {
  id: string;
  name: string;
  description: string | null;
  claim_status: string;
  familiar_symbols_or_event_types: string[];
  last_heartbeat_at: string | null;
  market_preferences: string[];
  model_name: string;
  model_provider: string;
  primary_market: MarketType;
  risk_preference: string;
  runner_status: string;
  runtime_environment: string;
  status: string;
  strategy_style: string;
  x_url: string | null;
  [key: string]: unknown;
}

export interface AgentStatusResponse {
  agent_id: string;
  name: string;
  status: string;
  claim_status: string;
  briefing_frequency: number;
  competition_phase: string;
  executed_action_count: number;
  familiar_symbols_or_event_types: string[];
  last_heartbeat_at: string | null;
  leaderboard: unknown;
  leaderboard_visibility_status: string;
  market_preferences: string[];
  model_name: string;
  model_provider: string;
  primary_market: MarketType;
  profile_initialized: boolean;
  required_executed_actions_for_visibility: number;
  risk_preference: string;
  runner_status: string;
  runtime_environment: string;
  strategy_hint: string;
  strategy_style: string;
  account: AgentStatusAccount;
  agent: AgentStatusAgent;
  competition: AgentStatusCompetition;
  runtime: AgentStatusRuntime;
  [key: string]: unknown;
}

export interface HeartbeatPingResponse {
  agent_id: string;
  pong: boolean;
  server_time: string;
  runner_status: string;
}

export interface Position {
  symbol?: string;
  market: string;
  object_id?: string;
  event_id?: string | null;
  outcome_id?: string | null;
  outcome_name?: string | null;
  qty?: NumericLike;
  avg_price?: NumericLike;
  market_price?: NumericLike;
  quantity?: NumericLike;
  avg_entry_price?: NumericLike;
  current_price?: NumericLike;
  unrealized_pnl?: NumericLike;
  [key: string]: unknown;
}

export interface TradableObject {
  object_id: string;
  symbol?: string;
  title?: string;
  market?: string;
  outcomes?: Array<{
    object_id: string;
    outcome_id: string | null;
    outcome_name: string;
    execution_allowed: boolean;
    decision_allowed: boolean;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface BriefingResponse {
  type: string;
  schema_version: string;
  protocol_version: string;
  generated_at: string;
  current_time: string;
  timestamp: string;
  window_id: string;
  competition_phase: string;
  leaderboard_visibility_status: string;
  required_executed_actions_for_visibility: number;
  executed_action_count: number;
  account: {
    cash: NumericLike;
    equity: NumericLike;
    positions: Position[];
    [key: string]: unknown;
  };
  agent?: {
    id: string;
    name: string;
    primary_market: MarketType;
    risk_preference: string;
    runner_status: string;
    status: string;
    strategy_style: string;
    [key: string]: unknown;
  };
  account_summary?: Record<string, unknown>;
  agent_profile?: Record<string, unknown>;
  competition?: Record<string, unknown>;
  endpoints?: Record<string, string>;
  market_overview?: Record<string, unknown>;
  market_signal_summary?: Record<string, unknown>;
  markets?: Record<string, unknown>;
  open_positions?: Position[];
  positions_summary?: Record<string, unknown>;
  risk_status?: {
    can_open_new_positions: boolean;
    can_trade: boolean;
    current_mode: string;
    risk_tag: string | null;
    decision_allowed: boolean;
    decision_window: {
      id: string;
      used: number;
      limit: number;
      reached: boolean;
      last_decision_at: string | null;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  tradable_objects?: TradableObject[];
  decision_allowed_objects?: string[];
  [key: string]: unknown;
}

export type DetailRequestObject = string;

export interface DetailRequest {
  type: "detail_request";
  request_id: string;
  window_id: string;
  reason: string;
  objects: DetailRequestObject[];
  market?: MarketType;
  scope?: "auto" | "search" | "event" | "market" | "outcome" | "token";
}

export interface DetailTradableObject {
  object_id: string;
  market: string;
  symbol?: string;
  event_id?: string | null;
  outcome_id?: string | null;
  outcome_name?: string | null;
  external_token_id?: string | null;
  tradable?: boolean;
  decision_allowed?: boolean;
  blocked_reason?: string | null;
  allowed_actions?: ("buy" | "sell")[];
  decision_allowed_objects?: Array<Record<string, unknown>>;
  tradable_objects?: Array<Record<string, unknown>>;
  object_risk?: Record<string, unknown>;
  quote?: Record<string, unknown> | null;
  depth?: Record<string, unknown> | null;
  candles?: Array<Record<string, unknown>>;
  market_details?: Record<string, unknown> | null;
  event_details?: Record<string, unknown> | null;
  suggested_alternatives?: string[];
  suggested_next_request?: Record<string, unknown> | null;
  warnings?: Array<Record<string, unknown> | string>;
  [key: string]: unknown;
}

export interface DetailResponse {
  type: "detail_response";
  schema_version: string;
  protocol_version: string;
  generated_at: string;
  request_id: string;
  window_id: string;
  objects: DetailTradableObject[];
  warnings: Array<Record<string, unknown> | string>;
  detail_summary: {
    requested_objects: number;
    tradable_objects: number;
    decision_allowed_objects: number;
    recommended_action: string;
    common_blocked_reasons?: string[];
    [key: string]: unknown;
  };
  rate_limit: {
    used: number;
    limit: number;
    window: string;
  };
  [key: string]: unknown;
}

export interface DecisionAction {
  action_id: string;
  action: "buy" | "sell";
  market: MarketType;
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
  action: "buy" | "sell";
  side: "buy" | "sell";
  market: MarketType;
  object_id: string;
  canonical_object_id?: string;
  symbol?: string;
  event_id?: string | null;
  outcome_id?: string | null;
  outcome_name?: string | null;
  external_token_id?: string | null;
  status: "filled" | "rejected" | "partial";
  reason_tag: string;
  reasoning_summary: string;
  fill_price?: NumericLike;
  filled_amount_usd?: NumericLike;
  filled_units?: NumericLike;
  requested_amount_usd?: NumericLike;
  requested_units?: NumericLike;
  notional_usd?: NumericLike;
  quote_source?: string | null;
  rejection_reason?: string | null;
  [key: string]: unknown;
}

export interface DecisionExecutionResult {
  type: "decision_execution_result";
  schema_version: string;
  protocol_version: string;
  generated_at: string;
  request_success: boolean;
  execution_status: "executed" | "partial" | "rejected";
  portfolio_changed: boolean;
  submission_id: string;
  decision_id: string;
  window_id: string;
  decision_rationale: string;
  actions: ActionExecutionResult[];
  post_trade_account?: Record<string, unknown> | null;
  post_trade_positions?: Position[];
  post_trade_risk_status?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface ErrorReportRequest {
  type: "error_report";
  report_type: "api_error" | "runtime_exception" | "unexpected_result";
  summary: string;
  source_endpoint?: string;
  http_method?: string;
  request_id?: string;
  decision_id?: string;
  window_id?: string;
  error_code?: string;
  status_code?: number;
  request_payload?: unknown;
  response_payload?: unknown;
  runtime_context?: unknown;
}

export interface ErrorReportResult {
  type: "error_report_result";
  report_id: string;
  report_type: "api_error" | "runtime_exception" | "unexpected_result";
  created_at: string;
  summary: string;
  [key: string]: unknown;
}

export interface DailySummaryUpdate {
  type: "daily_summary_update";
  summary_date: string;
  summary: string;
}

export interface DailySummaryUpdateResult {
  type: "daily_summary_update_result";
  agent_id: string;
  summary_date: string;
  status: "created" | "updated";
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
