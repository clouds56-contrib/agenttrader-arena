import { createRequire } from 'node:module';

import postgres, { type Sql } from 'postgres';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type {
  AgentStatusResponse,
  AgentTraderClient as AgentTraderClientType,
  BriefingResponse,
  DailySummaryUpdate,
  DecisionExecutionResult,
  DecisionRequest,
  DetailRequest,
  DetailResponse,
  ErrorReportRequest,
  ErrorReportResult,
  HeartbeatPingResponse,
  RegistrationRequest,
  RegistrationResponse,
} from '../src';
import {
  agentStatusResponseSchema,
  briefingResponseSchema,
  dailySummaryUpdateResultSchema,
  dailySummaryUpdateSchema,
  decisionExecutionResultSchema,
  decisionRequestSchema,
  detailRequestSchema,
  detailResponseSchema,
  errorReportRequestSchema,
  errorReportResultSchema,
  heartbeatPingResponseSchema,
  registrationRequestSchema,
  registrationResponseSchema,
} from '../src';

const require = createRequire(import.meta.url);
const {
  AgentTraderApiError,
  AgentTraderAuthError,
  AgentTraderClient,
}: {
  AgentTraderApiError: typeof import('../src').AgentTraderApiError;
  AgentTraderAuthError: typeof import('../src').AgentTraderAuthError;
  AgentTraderClient: typeof AgentTraderClientType;
} = require('../dist');

const baseUrl = (process.env.AGENTTRADER_SDK_BASE_URL || 'http://127.0.0.1:3100').replace(
  /\/+$/,
  ''
);
const databaseUrl = process.env.DATABASE_URL || '';

function buildRunToken(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildRecentIso(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString();
}

function buildPredictionDepthSnapshot(bid: number, ask: number, size = 10_000) {
  return JSON.stringify({
    bids: [{ price: Number(bid.toFixed(4)), size }],
    asks: [{ price: Number(ask.toFixed(4)), size }],
    snapshot_at: new Date().toISOString(),
  });
}

async function waitForServer(url: string, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/api/public/stats`);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until timeout.
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`Timed out waiting for web-new server at ${url}`);
}

async function markAgentClaimed(sql: Sql, agentId: string, heartbeatAt: string) {
  await sql`
    update agents
    set
      claim_status = 'claimed',
      status = 'active',
      runner_status = 'ready',
      last_heartbeat_at = ${heartbeatAt},
      updated_at = now()
    where id = ${agentId}
  `;
  await sql`
    update runtime_configs
    set
      verified_at = ${heartbeatAt},
      last_heartbeat_at = ${heartbeatAt}
    where agent_id = ${agentId}
  `;
  await sql`
    update agent_claims
    set
      status = 'claimed',
      claimed_at = ${heartbeatAt}
    where agent_id = ${agentId}
  `;
}

async function seedPredictionInstrumentAndMarketData(
  sql: Sql,
  input: {
    symbol: string;
    title: string;
    yesOutcomeId: string;
    noOutcomeId: string;
    yesPrice: number;
    noPrice: number;
  }
) {
  const quoteTs = buildRecentIso(-5_000);
  const candleOpen = buildRecentIso(-3_600_000);
  const candleClose = buildRecentIso(-1_800_000);
  const latestCandleOpen = buildRecentIso(-1_800_000);
  const latestCandleClose = buildRecentIso(-60_000);
  const yesBid = Number((input.yesPrice - 0.01).toFixed(4));
  const yesAsk = Number(input.yesPrice.toFixed(4));
  const noBid = Number((input.noPrice - 0.01).toFixed(4));
  const noAsk = Number(input.noPrice.toFixed(4));
  const metadata = JSON.stringify({
    active: true,
    closed: false,
    acceptingOrders: true,
    marketStatus: 'active',
    resolvesAt: buildRecentIso(7 * 24 * 60 * 60 * 1000),
    resolvedOutcomeId: null,
    outcomes: [
      {
        id: input.yesOutcomeId,
        name: 'Yes',
        price: input.yesPrice,
      },
      {
        id: input.noOutcomeId,
        name: 'No',
        price: input.noPrice,
      },
    ],
    title: input.title,
    description: 'SDK integration-test prediction market.',
    eventTitle: input.title,
    category: 'Economy',
    archived: false,
    liquidity: 500_000,
    volume24h: 125_000,
    rules: 'Resolves to the matching outcome for the SDK integration test.',
    resolutionSource: 'sdk-integration-test',
    clobTokenIds: [input.yesOutcomeId, input.noOutcomeId],
  });

  await sql`
    insert into market_instruments (
      id,
      symbol,
      market,
      provider,
      provider_market_id,
      display_name,
      metadata,
      is_active
    ) values (
      ${input.symbol},
      ${input.symbol},
      ${'prediction'},
      ${'sdk-integration-feed'},
      ${`${input.symbol}_condition`},
      ${input.title},
      ${metadata},
      ${true}
    )
    on conflict (id) do update set
      symbol = excluded.symbol,
      market = excluded.market,
      provider = excluded.provider,
      provider_market_id = excluded.provider_market_id,
      display_name = excluded.display_name,
      metadata = excluded.metadata,
      is_active = excluded.is_active
  `;

  await sql`
    insert into market_data_snapshots (
      id,
      instrument_id,
      provider,
      quote_ts,
      last_price,
      bid,
      ask,
      midpoint,
      spread,
      bid_size,
      ask_size,
      depth_snapshot,
      raw_payload
    ) values
    (
      ${`${input.symbol}_yes_quote`},
      ${`${input.symbol}::${input.yesOutcomeId}`},
      ${'sdk-integration-feed'},
      ${quoteTs},
      ${input.yesPrice},
      ${yesBid},
      ${yesAsk},
      ${Number(((yesBid + yesAsk) / 2).toFixed(4))},
      ${Number((yesAsk - yesBid).toFixed(4))},
      ${10_000},
      ${10_000},
      ${buildPredictionDepthSnapshot(yesBid, yesAsk)},
      ${null}
    ),
    (
      ${`${input.symbol}_no_quote`},
      ${`${input.symbol}::${input.noOutcomeId}`},
      ${'sdk-integration-feed'},
      ${quoteTs},
      ${input.noPrice},
      ${noBid},
      ${noAsk},
      ${Number(((noBid + noAsk) / 2).toFixed(4))},
      ${Number((noAsk - noBid).toFixed(4))},
      ${10_000},
      ${10_000},
      ${buildPredictionDepthSnapshot(noBid, noAsk)},
      ${null}
    )
    on conflict (id) do update set
      instrument_id = excluded.instrument_id,
      quote_ts = excluded.quote_ts,
      last_price = excluded.last_price,
      bid = excluded.bid,
      ask = excluded.ask,
      midpoint = excluded.midpoint,
      spread = excluded.spread,
      bid_size = excluded.bid_size,
      ask_size = excluded.ask_size,
      depth_snapshot = excluded.depth_snapshot
  `;

  await sql`
    insert into market_candles (
      id,
      instrument_id,
      interval,
      open_time,
      close_time,
      open,
      high,
      low,
      close,
      volume,
      trade_count,
      vwap,
      outcome_id
    ) values
    (
      ${`${input.symbol}_candle_1`},
      ${input.symbol},
      ${'1h'},
      ${candleOpen},
      ${candleClose},
      ${0.39},
      ${0.42},
      ${0.37},
      ${0.41},
      ${25_000},
      ${null},
      ${0.4025},
      ${null}
    ),
    (
      ${`${input.symbol}_candle_2`},
      ${input.symbol},
      ${'1h'},
      ${latestCandleOpen},
      ${latestCandleClose},
      ${0.41},
      ${0.44},
      ${0.4},
      ${0.43},
      ${31_000},
      ${null},
      ${0.425},
      ${null}
    )
    on conflict (id) do update set
      instrument_id = excluded.instrument_id,
      open_time = excluded.open_time,
      close_time = excluded.close_time,
      open = excluded.open,
      high = excluded.high,
      low = excluded.low,
      close = excluded.close,
      volume = excluded.volume,
      vwap = excluded.vwap,
      outcome_id = excluded.outcome_id
  `;
}

async function cleanupScenario(
  sql: Sql,
  input: {
    agentId: string;
    symbols: string[];
  }
) {
  await sql`delete from trade_executions where action_id in (select da.id from decision_actions da inner join decision_submissions ds on ds.id = da.submission_id where ds.agent_id = ${input.agentId})`;
  await sql`delete from live_trade_events where agent_id = ${input.agentId}`;
  await sql`delete from risk_events where agent_id = ${input.agentId}`;
  await sql`delete from decision_actions where submission_id in (select id from decision_submissions where agent_id = ${input.agentId})`;
  await sql`delete from decision_window_consumptions where agent_id = ${input.agentId}`;
  await sql`delete from decision_submissions where agent_id = ${input.agentId}`;
  await sql`delete from detail_requests where agent_id = ${input.agentId}`;
  await sql`delete from agent_briefings where agent_id = ${input.agentId}`;
  await sql`delete from agent_protocol_events where agent_id = ${input.agentId}`;
  await sql`delete from agent_error_reports where agent_id = ${input.agentId}`;
  await sql`delete from agent_daily_summaries where agent_id = ${input.agentId}`;
  await sql`delete from account_snapshots where agent_id = ${input.agentId}`;
  await sql`delete from leaderboard_snapshots where agent_id = ${input.agentId}`;
  await sql`delete from positions where agent_id = ${input.agentId}`;
  await sql`delete from agent_accounts where agent_id = ${input.agentId}`;
  await sql`delete from runtime_configs where agent_id = ${input.agentId}`;
  await sql`delete from agent_claims where agent_id = ${input.agentId}`;
  await sql`delete from agent_api_keys where agent_id = ${input.agentId}`;
  await sql`delete from audit_logs where agent_id = ${input.agentId}`;
  await sql`delete from agents where id = ${input.agentId}`;

  for (const symbol of input.symbols) {
    await sql`delete from market_candles where instrument_id = ${symbol} or instrument_id like ${`${symbol}::%`}`;
    await sql`delete from market_data_snapshots where instrument_id = ${symbol} or instrument_id like ${`${symbol}::%`}`;
    await sql`delete from market_instruments where id = ${symbol} or symbol = ${symbol}`;
  }
}

function sanitizeForSnapshot(
  value: unknown,
  input: {
    replacements?: Record<string, string>;
  } = {}
): unknown {
  const replacements = Object.entries(input.replacements ?? {}).sort(
    (left, right) => right[0].length - left[0].length
  );

  const redactValue = (current: string) => {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(current)) {
      return '<iso_timestamp>';
    }

    let next = current;
    next = next.replace(
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g,
      '<iso_timestamp>'
    );
    for (const [from, to] of replacements) {
      next = next.split(from).join(to);
    }
    return next;
  };

  const visit = (current: unknown): unknown => {
    if (Array.isArray(current)) {
      return current.map(visit);
    }

    if (current && typeof current === 'object') {
      return Object.fromEntries(
        Object.entries(current as Record<string, unknown>).map(([key, entry]) => {
          if (
            [
              'agent_id',
              'api_key',
              'claim_token',
              'claim_url',
              'request_id',
              'decision_id',
              'submission_id',
              'report_id',
              'window_id',
              'generated_at',
              'created_at',
              'server_time',
              'timestamp',
              'cache_age_ms',
            ].includes(key)
          ) {
            return [key, `<${key}>`];
          }

          return [key, visit(entry)];
        })
      );
    }

    if (typeof current === 'string') {
      return redactValue(current);
    }

    return current;
  };

  return visit(value);
}

describe.sequential('live sdk integration', () => {
  let sql: Sql;

  beforeAll(async () => {
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required for sdk integration tests');
    }

    await waitForServer(baseUrl);
    sql = postgres(databaseUrl, { prepare: false, max: 1 });
  }, 120_000);

  afterAll(async () => {
    await sql.end({ timeout: 1 });
  });

  test(
    'sdk client completes a full live prediction workflow against web-new',
    async () => {
      const token = buildRunToken('sdk');
      const symbol = `sdk_prediction_${token}`;
      const yesOutcomeId = `${symbol}_yes`;
      const noOutcomeId = `${symbol}_no`;
      const summaryDate = new Date().toISOString().slice(0, 10);
      const heartbeatAt = buildRecentIso(-10_000);
      const requestId = `req_${token}`;
      const decisionId = `dec_${token}`;
      let agentId = `agt_${token}`;

      await cleanupScenario(sql, { agentId, symbols: [symbol] });

      try {
        const unauthenticatedClient = new AgentTraderClient({ baseUrl });
        await expect(unauthenticatedClient.me()).rejects.toBeInstanceOf(AgentTraderAuthError);

        const client = new AgentTraderClient({ baseUrl });
        const registrationInput: RegistrationRequest = registrationRequestSchema.parse({
          name: `SDK ${token}`,
          description: 'Live SDK integration test agent',
          registration_source: 'sdk-integration-test',
          profile: {
            model_provider: 'openai',
            model_name: 'gpt-test',
            runtime_environment: 'integration',
            primary_market: 'prediction',
            familiar_symbols_or_event_types: [symbol],
            strategy_style: 'event-driven',
            risk_preference: 'balanced',
            market_preferences: ['prediction'],
          },
        });
        const registration: RegistrationResponse = registrationResponseSchema.parse(
          await client.register(registrationInput)
        );

        agentId = registration.agent_id;
        expect(registration.api_key).toMatch(/^at_/);
        expect(typeof registration.claim_token).toBe('string');
        expect(registration.claim_token.length).toBeGreaterThanOrEqual(6);
        expect(registration.next_steps.claim_status_url).toBe(`${baseUrl}/api/agent/me`);

        const meBeforeClaim: AgentStatusResponse = agentStatusResponseSchema.parse(await client.me());
        expect(meBeforeClaim.agent_id).toBe(agentId);
        expect(meBeforeClaim.status).toBe('registered');

        await expect(client.heartbeatPing()).rejects.toMatchObject({
          code: 'FORBIDDEN',
          statusCode: 403,
        } satisfies Partial<InstanceType<typeof AgentTraderApiError>>);

        await markAgentClaimed(sql, agentId, heartbeatAt);
        await seedPredictionInstrumentAndMarketData(sql, {
          symbol,
          title: 'Will the SDK integration trade execute?',
          yesOutcomeId,
          noOutcomeId,
          yesPrice: 0.43,
          noPrice: 0.57,
        });

        const meAfterClaim: AgentStatusResponse = agentStatusResponseSchema.parse(await client.me());
        expect(meAfterClaim.agent_id).toBe(agentId);
        expect(meAfterClaim.status).toBe('active');

        const pong: HeartbeatPingResponse = heartbeatPingResponseSchema.parse(
          await client.heartbeatPing()
        );
        expect(pong.agent_id).toBe(agentId);
        expect(pong.pong).toBe(true);
        expect(pong.runner_status).toBe('ready');

        const briefing: BriefingResponse = briefingResponseSchema.parse(await client.getBriefing());
        const windowId = briefing.risk_status?.decision_window?.id;
        expect(typeof windowId).toBe('string');
        expect(Array.isArray(briefing.market_signal_summary?.prediction?.top_markets)).toBe(true);

        const detailInput: DetailRequest = detailRequestSchema.parse({
          type: 'detail_request',
          request_id: requestId,
          window_id: windowId,
          market: 'prediction',
          scope: 'market',
          reason:
            'Need the current outcome-level quote quality and execution whitelist before placing a prediction trade in this window.',
          objects: [`pm:${symbol}`],
        });
        const detail: DetailResponse = detailResponseSchema.parse(
          await client.requestDetail(detailInput)
        );

        expect(detail.type).toBe('detail_response');
        expect(detail.request_id).toBe(requestId);
        expect(detail.window_id).toBe(windowId);
        expect(detail.objects).toHaveLength(1);
        expect(detail.objects[0].market).toBe('prediction');
        expect(detail.objects[0].blocked_reason).toBe('SELECT_TRADABLE_OUTCOME_REQUIRED');
        expect(
          detail.objects[0].decision_allowed_objects.some(
            (candidate) =>
              candidate.object_id === `pm:${symbol}:YES` && candidate.outcome_id === yesOutcomeId
          )
        ).toBe(true);

        const decisionInput: DecisionRequest = decisionRequestSchema.parse({
          type: 'decision',
          decision_id: decisionId,
          window_id: windowId,
          decision_rationale:
            'The stored detail response confirms that the YES outcome is currently decision-allowed with reliable top-of-book data, so a small starter position is acceptable in this window.',
          actions: [
            {
              action_id: `act_${token}`,
              action: 'buy',
              market: 'prediction',
              object_id: `pm:${symbol}:YES`,
              amount_usd: 1_000,
              reason_tag: 'policy repricing',
              reasoning_summary:
                'The current detail payload whitelists the YES outcome, top-of-book is internally consistent, and the position size remains small versus available cash and concentration limits.',
              },
            ],
        });
        const decision: DecisionExecutionResult = decisionExecutionResultSchema.parse(
          await client.submitDecision(decisionInput)
        );

        expect(decision.type).toBe('decision_execution_result');
        expect(decision.decision_id).toBe(decisionId);
        expect(decision.window_id).toBe(windowId);
        expect(decision.execution_status).toBe('executed');
        expect(decision.actions).toHaveLength(1);
        expect(decision.actions[0].status).toBe('filled');
        expect(decision.actions[0].object_id).toBe(`pm:${symbol}:YES`);
        expect(decision.actions[0].external_token_id).toBe(yesOutcomeId);
        expect(decision.actions[0].fill_price).toBe(0.43);

        await expect(
          client.submitDecision(
            decisionRequestSchema.parse({
            type: 'decision',
            decision_id: `dec_duplicate_${token}`,
            window_id: windowId,
            decision_rationale:
              'A second decision in the same window should be rejected because the first one already consumed the briefing window.',
            actions: [
              {
                action_id: `act_duplicate_${token}`,
                action: 'buy',
                market: 'prediction',
                object_id: `pm:${symbol}:YES`,
                amount_usd: 100,
                reason_tag: 'duplicate window',
                reasoning_summary:
                  'This call intentionally verifies that the server surfaces a structured briefing-window conflict after a successful first decision.',
              },
            ],
            })
          )
        ).rejects.toMatchObject({
          code: 'DECISION_WINDOW_LIMIT',
          statusCode: 409,
          details: { window_id: windowId },
        } satisfies Partial<InstanceType<typeof AgentTraderApiError>>);

        const errorReportInput: ErrorReportRequest = errorReportRequestSchema.parse({
          type: 'error_report',
          report_type: 'runtime_exception',
          source_endpoint: '/sdk/live-integration',
          http_method: 'POST',
          request_id: requestId,
          decision_id: decisionId,
          window_id: windowId,
          error_code: 'SDK_INTEGRATION_NOTE',
          status_code: 200,
          summary:
            'Recorded a synthetic runtime note after the live prediction trade to verify error-report persistence.',
          runtime_context: {
            symbol,
            outcome: 'YES',
          },
        });
        const errorReport: ErrorReportResult = errorReportResultSchema.parse(
          await client.reportError(errorReportInput)
        );

        expect(errorReport.type).toBe('error_report_result');
        expect(errorReport.report_type).toBe('runtime_exception');
        expect(errorReport.summary.includes('synthetic runtime note')).toBe(true);

        const dailySummaryInput: DailySummaryUpdate = dailySummaryUpdateSchema.parse({
          type: 'daily_summary_update',
          summary_date: summaryDate,
          summary:
            'Captured one successful prediction trade during the SDK integration workflow and verified the reporting routes after execution.',
        });
        const dailySummary = dailySummaryUpdateResultSchema.parse(
          await client.updateDailySummary(dailySummaryInput)
        );

        expect(dailySummary.type).toBe('daily_summary_update_result');
        expect(dailySummary.agent_id).toBe(agentId);
        expect(dailySummary.summary_date).toBe(summaryDate);
        expect(dailySummary.status).toBe('created');

        const replacements = {
          [token]: '<run_token>',
          [agentId]: '<agent_id>',
          [symbol]: '<symbol>',
          [yesOutcomeId]: '<yes_outcome_id>',
          [noOutcomeId]: '<no_outcome_id>',
          [requestId]: '<request_id>',
          [decisionId]: '<decision_id>',
          [summaryDate]: '<summary_date>',
          [windowId]: '<window_id>',
        };

        expect(sanitizeForSnapshot(registration, { replacements })).toMatchSnapshot(
          'registration response'
        );
        expect(sanitizeForSnapshot(meBeforeClaim, { replacements })).toMatchSnapshot(
          'me before claim response'
        );
        expect(sanitizeForSnapshot(meAfterClaim, { replacements })).toMatchSnapshot(
          'me after claim response'
        );
        expect(sanitizeForSnapshot(pong, { replacements })).toMatchSnapshot(
          'heartbeat response'
        );
        expect(sanitizeForSnapshot(briefing, { replacements })).toMatchSnapshot(
          'briefing response'
        );
        expect(sanitizeForSnapshot(detail, { replacements })).toMatchSnapshot(
          'detail response'
        );
        expect(sanitizeForSnapshot(decision, { replacements })).toMatchSnapshot(
          'decision response'
        );
        expect(sanitizeForSnapshot(errorReport, { replacements })).toMatchSnapshot(
          'error report response'
        );
        expect(sanitizeForSnapshot(dailySummary, { replacements })).toMatchSnapshot(
          'daily summary response'
        );

        const [detailRows, submissionRows, executionRows, positionRows, errorRows, summaryRows] =
          await Promise.all([
            sql`select count(*)::int as total from detail_requests where agent_id = ${agentId}`,
            sql`select count(*)::int as total from decision_submissions where agent_id = ${agentId}`,
            sql`select count(*)::int as total from trade_executions where action_id in (select da.id from decision_actions da inner join decision_submissions ds on ds.id = da.submission_id where ds.agent_id = ${agentId})`,
            sql`select count(*)::int as total from positions where agent_id = ${agentId} and symbol = ${symbol}`,
            sql`select count(*)::int as total from agent_error_reports where agent_id = ${agentId}`,
            sql`select count(*)::int as total from agent_daily_summaries where agent_id = ${agentId} and summary_date = ${summaryDate}`,
          ]);

        expect(Number(detailRows[0].total)).toBe(1);
        expect(Number(submissionRows[0].total)).toBe(1);
        expect(Number(executionRows[0].total)).toBe(1);
        expect(Number(positionRows[0].total)).toBe(1);
        expect(Number(errorRows[0].total)).toBe(1);
        expect(Number(summaryRows[0].total)).toBe(1);
      } finally {
        await cleanupScenario(sql, { agentId, symbols: [symbol] });
      }
    },
    120_000
  );
});
