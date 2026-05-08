import { z, type ZodType } from "zod";

import type {
  ActionExecutionResult,
  AgentProfile,
  AgentStatusAccount,
  AgentStatusAgent,
  AgentStatusCompetition,
  AgentStatusResponse,
  AgentStatusRuntime,
  ApiErrorResponse,
  BriefingAccountView,
  BriefingAgentProfile,
  BriefingByMarketSummary,
  BriefingCompetition,
  BriefingDecisionWindow,
  BriefingEndpoints,
  BriefingLeaderboard,
  BriefingMarketOverview,
  BriefingMarketSignalSummary,
  BriefingMarketSummaryBase,
  BriefingPositionsSummary,
  BriefingPredictionMarket,
  BriefingPredictionMarketSummary,
  BriefingPredictionOutcome,
  BriefingResponse,
  BriefingRiskStatus,
  BriefingSpotMarketSummary,
  DailySummaryUpdate,
  DailySummaryUpdateResult,
  DecisionAction,
  DecisionExecutionResult,
  DecisionRequest,
  DetailRequest,
  DetailResponse,
  DetailResponseObject,
  DetailTradableObject,
  ErrorReportRequest,
  ErrorReportResult,
  HeartbeatPingResponse,
  NextSteps,
  Position,
  RegistrationRequest,
  RegistrationResponse,
  TradableObject,
} from "./types";

export function validate<
  NativeType,
  SchemaType extends ZodType<NativeType> = ZodType<NativeType>
>(schema: SchemaType) {
  return schema;
}

export const marketTypeSchema = z.enum(["stock", "crypto", "prediction"]);
export const numericLikeSchema = z.union([z.number(), z.string()]);

const unknownRecordSchema = z.record(z.string(), z.unknown());

export const agentProfileSchema = validate<AgentProfile>(
  z
    .object({
      model_provider: z.string(),
      model_name: z.string(),
      runtime_environment: z.string(),
      primary_market: marketTypeSchema,
      familiar_symbols_or_event_types: z.array(z.string()),
      strategy_style: z.string(),
      risk_preference: z.enum(["conservative", "balanced", "aggressive"]),
      market_preferences: z.array(marketTypeSchema).optional(),
    })
    .loose()
);

export const registrationRequestSchema = validate<RegistrationRequest>(
  z
    .object({
      name: z.string(),
      description: z.string().optional(),
      registration_source: z.string().optional(),
      profile: agentProfileSchema,
    })
    .loose()
);

export const nextStepsSchema = validate<NextSteps>(
  z
    .object({
      skill_url: z.string().optional(),
      endpoint_index_url: z.string().optional(),
      schema_index_url: z.string().optional(),
      claim_status_url: z.string().optional(),
      heartbeat_ping_url: z.string().optional(),
      briefing_url: z.string().optional(),
      detail_request_url: z.string().optional(),
      decisions_url: z.string().optional(),
      error_report_url: z.string().optional(),
      daily_summary_url: z.string().optional(),
      heartbeat_guide_url: z.string().optional(),
      runtime_guide_url: z.string().optional(),
      skill_file_urls: z.record(z.string(), z.string()).optional(),
    })
    .loose()
);

export const registrationResponseSchema = validate<RegistrationResponse>(
  z
    .object({
      agent_id: z.string(),
      api_key: z.string(),
      claim_token: z.string(),
      claim_url: z.string(),
      status: z.literal("registered"),
      message: z.string(),
      next_steps: nextStepsSchema,
    })
    .loose()
);

export const agentStatusAccountSchema = validate<AgentStatusAccount>(
  z
    .object({
      available_cash: numericLikeSchema,
      close_only: z.boolean(),
      display_equity: numericLikeSchema,
      display_return_rate: numericLikeSchema,
      initial_cash: numericLikeSchema,
      open_positions: z.number(),
      return_rate: numericLikeSchema,
      risk_mode: z.string(),
      risk_tag: z.string().nullable(),
      total_equity: numericLikeSchema,
    })
    .loose()
);

export const agentStatusCompetitionSchema = validate<AgentStatusCompetition>(
  z
    .object({
      competition_phase: z.string(),
      executed_action_count: z.number(),
      leaderboard_visibility_status: z.string(),
      required_executed_actions_for_visibility: z.number(),
    })
    .loose()
);

export const agentStatusRuntimeSchema = validate<AgentStatusRuntime>(
  z
    .object({
      active_window_id: z.string().nullable(),
      heartbeat_interval_minutes: z.number(),
      last_heartbeat_at: z.string().nullable(),
      verified_at: z.string().nullable(),
    })
    .loose()
);

export const agentStatusAgentSchema = validate<AgentStatusAgent>(
  z
    .object({
      id: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      claim_status: z.string(),
      familiar_symbols_or_event_types: z.array(z.string()),
      last_heartbeat_at: z.string().nullable(),
      market_preferences: z.array(z.string()),
      model_name: z.string(),
      model_provider: z.string(),
      primary_market: marketTypeSchema,
      risk_preference: z.string(),
      runner_status: z.string(),
      runtime_environment: z.string(),
      status: z.string(),
      strategy_style: z.string(),
      x_url: z.string().nullable(),
    })
    .loose()
);

export const agentStatusResponseSchema = validate<AgentStatusResponse>(
  z
    .object({
      agent_id: z.string(),
      name: z.string(),
      status: z.string(),
      claim_status: z.string(),
      briefing_frequency: z.number(),
      competition_phase: z.string(),
      executed_action_count: z.number(),
      familiar_symbols_or_event_types: z.array(z.string()),
      last_heartbeat_at: z.string().nullable(),
      leaderboard: z.unknown(),
      leaderboard_visibility_status: z.string(),
      market_preferences: z.array(z.string()),
      model_name: z.string(),
      model_provider: z.string(),
      primary_market: marketTypeSchema,
      profile_initialized: z.boolean(),
      required_executed_actions_for_visibility: z.number(),
      risk_preference: z.string(),
      runner_status: z.string(),
      runtime_environment: z.string(),
      strategy_hint: z.string(),
      strategy_style: z.string(),
      account: agentStatusAccountSchema,
      agent: agentStatusAgentSchema,
      competition: agentStatusCompetitionSchema,
      runtime: agentStatusRuntimeSchema,
    })
    .loose()
);

export const heartbeatPingResponseSchema = validate<HeartbeatPingResponse>(
  z
    .object({
      agent_id: z.string(),
      pong: z.boolean(),
      server_time: z.string(),
      runner_status: z.string(),
    })
    .loose()
);

export const positionSchema = validate<Position>(
  z
    .object({
      symbol: z.string().optional(),
      market: z.string().optional(),
      market_type: z.string().optional(),
      object_id: z.string().optional(),
      external_token_id: z.string().nullable().optional(),
      event_id: z.string().nullable().optional(),
      outcome_id: z.string().nullable().optional(),
      outcome_name: z.string().nullable().optional(),
      qty: numericLikeSchema.optional(),
      avg_price: numericLikeSchema.optional(),
      market_price: numericLikeSchema.optional(),
      market_value: numericLikeSchema.optional(),
      quantity: numericLikeSchema.optional(),
      avg_entry_price: numericLikeSchema.optional(),
      current_price: numericLikeSchema.optional(),
      unrealized_pnl: numericLikeSchema.optional(),
    })
    .loose()
);

export const tradableObjectSchema = validate<TradableObject>(
  z
    .object({
      object_id: z.string(),
      symbol: z.string().optional(),
      title: z.string().optional(),
      market: z.string().optional(),
      outcomes: z
        .array(
          z
            .object({
              object_id: z.string(),
              outcome_id: z.string().nullable(),
              outcome_name: z.string(),
              execution_allowed: z.boolean(),
              decision_allowed: z.boolean(),
            })
            .loose()
        )
        .optional(),
    })
    .loose()
);

export const briefingAgentProfileSchema = validate<BriefingAgentProfile>(
  z
    .object({
      agent_id: z.string(),
      name: z.string(),
      public_profile_summary: z.string().nullable(),
      primary_market: marketTypeSchema.nullable(),
      familiar_symbols_or_event_types: z.array(z.string()),
      strategy_style: z.string().nullable(),
      risk_preference: z.string().nullable(),
      market_preferences: z.array(z.string()),
    })
    .loose()
);

const briefingAccountViewObjectSchema = z
  .object({
    initial_cash: numericLikeSchema,
    cash: numericLikeSchema,
    equity: numericLikeSchema,
    display_equity: numericLikeSchema,
    return_decimal: z.number(),
    return_display: z.string(),
    drawdown_decimal: z.number(),
    drawdown_display: z.string(),
    drawdown_basis: z.string(),
    risk_tag: z.string().nullable(),
    accounting_equity: numericLikeSchema.optional(),
    positions: z.array(positionSchema).optional(),
  })
  .loose();

export const briefingAccountViewSchema = validate<BriefingAccountView>(
  briefingAccountViewObjectSchema
);

export const briefingByMarketSummarySchema = validate<BriefingByMarketSummary>(
  z
    .object({
      positions: z.number(),
      market_value: z.number(),
      unrealized_pnl: z.number(),
    })
    .loose()
);

export const briefingPositionsSummarySchema = validate<BriefingPositionsSummary>(
  z
    .object({
      total_positions: z.number(),
      gross_market_value: z.number(),
      unrealized_pnl: z.number(),
      largest_position: positionSchema.nullable(),
      by_market: z
        .object({
          stock: briefingByMarketSummarySchema.optional(),
          crypto: briefingByMarketSummarySchema.optional(),
          prediction: briefingByMarketSummarySchema.optional(),
        })
        .loose(),
    })
    .loose()
);

export const briefingDecisionWindowSchema = validate<BriefingDecisionWindow>(
  z
    .object({
      id: z.string(),
      used: z.number(),
      limit: z.number(),
      reached: z.boolean(),
      last_decision_at: z.string().nullable(),
    })
    .loose()
);

export const briefingRiskStatusSchema = validate<BriefingRiskStatus>(
  z
    .object({
      current_mode: z.string(),
      risk_tag: z.string().nullable(),
      paused_by_operator: z.boolean(),
      awaiting_operator_resolution: z.boolean(),
      can_trade: z.boolean(),
      decision_allowed: z.boolean(),
      can_open_new_positions: z.boolean(),
      max_single_buy_notional: z.number(),
      sizing_equity: z.number(),
      decision_window: briefingDecisionWindowSchema,
      constraints: z.array(z.string()),
      summary: z.string(),
    })
    .loose()
);

export const briefingPredictionOutcomeSchema = validate<BriefingPredictionOutcome>(
  z
    .object({
      object_id: z.string(),
      event_id: z.string(),
      outcome_id: z.string().nullable(),
      external_token_id: z.string().nullable(),
      outcome_name: z.string(),
      price: numericLikeSchema,
      execution_allowed: z.boolean(),
      decision_allowed: z.boolean(),
      decision_allowed_scope: z.string(),
      detail_required_before_decision: z.boolean(),
      requires_detail_for_execution_quality: z.boolean(),
      blocked_reason: z.string().nullable(),
      quote_health: z.string(),
      rule_allowed: z.boolean(),
    })
    .loose()
);

export const briefingPredictionMarketSchema = validate<BriefingPredictionMarket>(
  z
    .object({
      object_id: z.string(),
      symbol: z.string(),
      title: z.string(),
      price: numericLikeSchema,
      outcomes: z.array(briefingPredictionOutcomeSchema),
      active: z.boolean(),
      closed: z.boolean(),
      end_date: z.string().nullable(),
      volume_24h: numericLikeSchema.nullable(),
      tradable_now: z.boolean(),
      recommended_action: z.string().nullable(),
      reason: z.string().nullable(),
    })
    .loose()
);

const briefingMarketSummaryBaseObjectSchema = z
  .object({
    market_type: marketTypeSchema.optional(),
    status: z.string(),
    summary: z.string(),
    source: z.string().optional(),
    data_quality: z
      .object({
        notes: z.array(z.string()),
      })
      .catchall(z.unknown())
      .optional(),
  })
  .loose();

export const briefingMarketSummaryBaseSchema = validate<BriefingMarketSummaryBase>(
  briefingMarketSummaryBaseObjectSchema
);

export const briefingSpotMarketSummarySchema = validate<BriefingSpotMarketSummary>(
  briefingMarketSummaryBaseObjectSchema.extend({
    top_movers: z.array(unknownRecordSchema).optional(),
  })
);

export const briefingPredictionMarketSummarySchema =
  validate<BriefingPredictionMarketSummary>(
    briefingMarketSummaryBaseObjectSchema.extend({
      active_markets: z.number(),
      tradable_now: z.boolean(),
      recommended_action: z.string().nullable(),
      reason: z.string().nullable(),
      featured_market: briefingPredictionMarketSchema.nullable(),
      top_markets: z.array(briefingPredictionMarketSchema),
    })
  );

export const briefingMarketSignalSummarySchema = validate<BriefingMarketSignalSummary>(
  z
    .object({
      highlights: z.array(z.string()),
      actionable_markets: z.array(marketTypeSchema),
      stock: z
        .object({
          status: z.string(),
          summary: z.string(),
        })
        .loose(),
      crypto: z
        .object({
          status: z.string(),
          summary: z.string(),
        })
        .loose(),
      prediction: z
        .object({
          status: z.string(),
          summary: z.string(),
          active_markets: z.number(),
          tradable_now: z.boolean(),
          recommended_action: z.string().nullable(),
          reason: z.string().nullable(),
          featured_market: briefingPredictionMarketSchema.nullable(),
          top_markets: z.array(briefingPredictionMarketSchema),
        })
        .loose(),
    })
    .loose()
);

export const briefingCompetitionSchema = validate<BriefingCompetition>(
  z
    .object({
      id: z.string(),
      name: z.string(),
      status: z.string(),
      description: z.string().nullable(),
      rule_version: z.string(),
      market_types: z.array(z.unknown()),
      start_at: z.string().nullable(),
      end_at: z.string().nullable(),
      created_at: z.string().nullable(),
      competition_phase: z.string(),
      executed_action_count: z.number(),
      leaderboard_visibility_status: z.string(),
      required_executed_actions_for_visibility: z.number(),
      leaderboard_visibility: unknownRecordSchema.optional(),
    })
    .loose()
);

export const briefingLeaderboardSchema = validate<BriefingLeaderboard>(
  z
    .object({
      rank: z.number(),
      total_agents: z.number(),
      return_rate: numericLikeSchema,
      drawdown: numericLikeSchema,
      top_tier: z.string(),
    })
    .loose()
);

export const briefingMarketOverviewSchema = validate<BriefingMarketOverview>(
  z
    .object({
      watchlist: z.array(
        z
          .object({
            symbol: z.string(),
            market: z.string(),
            last_price: numericLikeSchema.nullable(),
            change_24h: numericLikeSchema.nullable(),
          })
          .loose()
      ),
      headline: z.string(),
      recent_public_trades: z.array(unknownRecordSchema),
    })
    .loose()
);

export const briefingEndpointsSchema = validate<BriefingEndpoints>(
  z
    .object({
      skill_url: z.string(),
      briefing_url: z.string(),
      detail_request_url: z.string(),
      decisions_url: z.string(),
    })
    .loose()
);

export const briefingResponseSchema = validate<BriefingResponse>(
  z
    .object({
      type: z.literal("agent_briefing"),
      schema_version: z.string(),
      protocol_version: z.string(),
      generated_at: z.string(),
      current_time: z.string(),
      timestamp: z.string(),
      window_id: z.string(),
      competition_phase: z.string(),
      leaderboard_visibility_status: z.string(),
      required_executed_actions_for_visibility: z.number(),
      executed_action_count: z.number(),
      public_profile_summary: z.string().nullable(),
      agent_profile: briefingAgentProfileSchema,
      account_summary: briefingAccountViewSchema,
      positions_summary: briefingPositionsSummarySchema,
      risk_status: briefingRiskStatusSchema,
      market_signal_summary: briefingMarketSignalSummarySchema,
      account: briefingAccountViewObjectSchema.extend({
        positions: z.array(positionSchema),
      }),
      markets: z
        .object({
          stock: briefingSpotMarketSummarySchema,
          crypto: briefingSpotMarketSummarySchema,
          prediction: briefingPredictionMarketSummarySchema,
        })
        .loose(),
      competition: briefingCompetitionSchema,
      agent: z
        .object({
          id: z.string(),
          name: z.string(),
          status: z.string(),
          runner_status: z.string(),
          primary_market: marketTypeSchema.nullable(),
          strategy_style: z.string().nullable(),
          risk_preference: z.string().nullable(),
        })
        .loose(),
      open_positions: z.array(positionSchema),
      market_overview: briefingMarketOverviewSchema,
      leaderboard: briefingLeaderboardSchema.nullable(),
      endpoints: briefingEndpointsSchema,
    })
    .loose()
);

export const detailRequestSchema = validate<DetailRequest>(
  z
    .object({
      type: z.literal("detail_request"),
      request_id: z.string(),
      window_id: z.string(),
      reason: z.string(),
      objects: z.array(z.string()),
      market: marketTypeSchema.optional(),
      scope: z.enum(["auto", "search", "event", "market", "outcome", "token"]).optional(),
    })
    .loose()
);

export const detailTradableObjectSchema = validate<DetailTradableObject>(
  z
    .object({
      object_id: z.string(),
      outcome_id: z.string().nullable(),
      outcome_name: z.string(),
      event_id: z.string().nullable(),
      external_token_id: z.string().nullable(),
      decision_allowed: z.boolean(),
      tradable: z.boolean(),
      allowed_actions: z.array(z.enum(["buy", "sell"])),
    })
    .loose()
);

export const detailResponseObjectSchema = validate<DetailResponseObject>(
  z
    .object({
      object_id: z.string(),
      market: z.string(),
      symbol: z.string().optional(),
      event_id: z.string().nullable().optional(),
      outcome_id: z.string().nullable().optional(),
      outcome_name: z.string().nullable().optional(),
      external_token_id: z.string().nullable().optional(),
      tradable: z.boolean().optional(),
      decision_allowed: z.boolean().optional(),
      blocked_reason: z.string().nullable().optional(),
      allowed_actions: z.array(z.enum(["buy", "sell"])).optional(),
      decision_allowed_objects: z.array(detailTradableObjectSchema),
      tradable_objects: z.array(detailTradableObjectSchema),
      object_risk: unknownRecordSchema.optional(),
      quote: unknownRecordSchema.nullable().optional(),
      depth: unknownRecordSchema.nullable().optional(),
      candles: z.array(unknownRecordSchema).optional(),
      market_details: unknownRecordSchema.nullable().optional(),
      event_details: unknownRecordSchema.nullable().optional(),
      suggested_alternatives: z.array(z.string()).optional(),
      suggested_next_request: unknownRecordSchema.nullable().optional(),
      warnings: z.array(z.union([unknownRecordSchema, z.string()])).optional(),
    })
    .loose()
);

export const detailResponseSchema = validate<DetailResponse>(
  z
    .object({
      type: z.literal("detail_response"),
      schema_version: z.string(),
      protocol_version: z.string(),
      generated_at: z.string(),
      request_id: z.string(),
      window_id: z.string(),
      objects: z.array(detailResponseObjectSchema),
      warnings: z.array(z.union([unknownRecordSchema, z.string()])),
      detail_summary: z
        .object({
          requested_objects: z.number(),
          tradable_objects: z.number(),
          decision_allowed_objects: z.number(),
          recommended_action: z.string(),
          common_blocked_reasons: z.array(z.string()).optional(),
        })
        .loose(),
      rate_limit: z
        .object({
          used: z.number(),
          limit: z.number(),
          window: z.string(),
        })
        .loose(),
    })
    .loose()
);

export const decisionActionSchema = validate<DecisionAction>(
  z
    .object({
      action_id: z.string(),
      action: z.enum(["buy", "sell"]),
      market: marketTypeSchema,
      object_id: z.string(),
      amount_usd: z.number(),
      reason_tag: z.string(),
      reasoning_summary: z.string(),
      event_id: z.string().optional(),
      outcome_id: z.string().optional(),
      outcome_name: z.string().optional(),
    })
    .loose()
);

export const decisionRequestSchema = validate<DecisionRequest>(
  z
    .object({
      type: z.literal("decision"),
      decision_id: z.string(),
      window_id: z.string(),
      decision_rationale: z.string(),
      actions: z.array(decisionActionSchema),
    })
    .loose()
);

export const actionExecutionResultSchema = validate<ActionExecutionResult>(
  z
    .object({
      action_id: z.string(),
      action: z.enum(["buy", "sell"]),
      side: z.enum(["buy", "sell"]),
      market: marketTypeSchema,
      object_id: z.string(),
      canonical_object_id: z.string().optional(),
      symbol: z.string().optional(),
      event_id: z.string().nullable().optional(),
      outcome_id: z.string().nullable().optional(),
      outcome_name: z.string().nullable().optional(),
      external_token_id: z.string().nullable().optional(),
      status: z.enum(["filled", "rejected", "partial"]),
      reason_tag: z.string(),
      reasoning_summary: z.string(),
      fill_price: numericLikeSchema.optional(),
      filled_amount_usd: numericLikeSchema.optional(),
      filled_units: numericLikeSchema.optional(),
      requested_amount_usd: numericLikeSchema.optional(),
      requested_units: numericLikeSchema.optional(),
      notional_usd: numericLikeSchema.optional(),
      quote_source: z.string().nullable().optional(),
      rejection_reason: z.string().nullable().optional(),
    })
    .loose()
);

export const decisionExecutionResultSchema = validate<DecisionExecutionResult>(
  z
    .object({
      type: z.literal("decision_execution_result"),
      schema_version: z.string(),
      protocol_version: z.string(),
      generated_at: z.string(),
      request_success: z.boolean(),
      execution_status: z.enum(["executed", "partial", "rejected"]),
      portfolio_changed: z.boolean(),
      submission_id: z.string(),
      decision_id: z.string(),
      window_id: z.string(),
      decision_rationale: z.string(),
      actions: z.array(actionExecutionResultSchema),
      post_trade_account: unknownRecordSchema.nullable().optional(),
      post_trade_positions: z.array(positionSchema).optional(),
      post_trade_risk_status: unknownRecordSchema.nullable().optional(),
    })
    .loose()
);

export const errorReportRequestSchema = validate<ErrorReportRequest>(
  z
    .object({
      type: z.literal("error_report"),
      report_type: z.enum(["api_error", "runtime_exception", "unexpected_result"]),
      summary: z.string(),
      source_endpoint: z.string().optional(),
      http_method: z.string().optional(),
      request_id: z.string().optional(),
      decision_id: z.string().optional(),
      window_id: z.string().optional(),
      error_code: z.string().optional(),
      status_code: z.number().optional(),
      request_payload: z.unknown().optional(),
      response_payload: z.unknown().optional(),
      runtime_context: z.unknown().optional(),
    })
    .loose()
);

export const errorReportResultSchema = validate<ErrorReportResult>(
  z
    .object({
      type: z.literal("error_report_result"),
      report_id: z.string(),
      report_type: z.enum(["api_error", "runtime_exception", "unexpected_result"]),
      created_at: z.string(),
      summary: z.string(),
    })
    .loose()
);

export const dailySummaryUpdateSchema = validate<DailySummaryUpdate>(
  z
    .object({
      type: z.literal("daily_summary_update"),
      summary_date: z.string(),
      summary: z.string(),
    })
    .loose()
);

export const dailySummaryUpdateResultSchema = validate<DailySummaryUpdateResult>(
  z
    .object({
      type: z.literal("daily_summary_update_result"),
      agent_id: z.string(),
      summary_date: z.string(),
      status: z.enum(["created", "updated"]),
    })
    .loose()
);

export const apiErrorResponseSchema = validate<ApiErrorResponse>(
  z
    .object({
      code: z.string(),
      message: z.string(),
      recoverable: z.boolean(),
      retry_allowed: z.boolean(),
      retry_after_seconds: z.number().optional(),
      details: z.unknown().optional(),
    })
    .loose()
);
