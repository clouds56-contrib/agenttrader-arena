const assert = require('node:assert/strict');
const postgres = require('postgres');

const {
  AgentTraderApiError,
  AgentTraderAuthError,
  AgentTraderClient,
} = require('../dist');

const baseUrl = (process.env.AGENTTRADER_SDK_BASE_URL || 'http://127.0.0.1:3100').replace(
  /\/+$/,
  ''
);
const databaseUrl = process.env.DATABASE_URL || '';

let passed = 0;
let failed = 0;

function buildRunToken(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildRecentIso(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString();
}

function buildPredictionDepthSnapshot(bid, ask, size = 10_000) {
  return JSON.stringify({
    bids: [{ price: Number(bid.toFixed(4)), size }],
    asks: [{ price: Number(ask.toFixed(4)), size }],
    snapshot_at: new Date().toISOString(),
  });
}

async function runTest(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`ok - ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`not ok - ${name}`);
    console.error(error);
  }
}

async function waitForServer(url, timeoutMs = 120_000) {
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

async function markAgentClaimed(sql, agentId, heartbeatAt) {
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

async function seedPredictionInstrumentAndMarketData(sql, input) {
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

async function cleanupScenario(sql, input) {
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

async function main() {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for sdk integration tests');
  }

  await waitForServer(baseUrl);
  const sql = postgres(databaseUrl, { prepare: false, max: 1 });

  await runTest('sdk client completes a full live prediction workflow against web-new', async () => {
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
      await assert.rejects(() => unauthenticatedClient.me(), (error) => {
        assert.ok(error instanceof AgentTraderAuthError);
        return true;
      });

      const client = new AgentTraderClient({ baseUrl });
      const registration = await client.register({
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

      agentId = registration.agent_id;
      assert.match(registration.api_key, /^at_/);
      assert.equal(typeof registration.claim_token, 'string');
      assert.ok(registration.claim_token.length >= 6);
      assert.equal(registration.next_steps.claim_status_url, `${baseUrl}/api/agent/me`);

      const meBeforeClaim = await client.me();
      assert.equal(meBeforeClaim.agent_id, agentId);
      assert.equal(meBeforeClaim.status, 'registered');

      await assert.rejects(() => client.heartbeatPing(), (error) => {
        assert.ok(error instanceof AgentTraderApiError);
        assert.equal(error.code, 'FORBIDDEN');
        assert.equal(error.statusCode, 403);
        return true;
      });

      await markAgentClaimed(sql, agentId, heartbeatAt);
      await seedPredictionInstrumentAndMarketData(sql, {
        symbol,
        title: 'Will the SDK integration trade execute?',
        yesOutcomeId,
        noOutcomeId,
        yesPrice: 0.43,
        noPrice: 0.57,
      });

      const meAfterClaim = await client.me();
      assert.equal(meAfterClaim.agent_id, agentId);
      assert.equal(meAfterClaim.status, 'active');

      const pong = await client.heartbeatPing();
      assert.equal(pong.agent_id, agentId);
      assert.equal(pong.pong, true);
      assert.equal(pong.runner_status, 'ready');

      const briefing = await client.getBriefing();
      const windowId = briefing.risk_status?.decision_window?.id;
      assert.equal(typeof windowId, 'string');
      assert.equal(Array.isArray(briefing.market_signal_summary?.prediction?.top_markets), true);

      const detail = await client.requestDetail({
        type: 'detail_request',
        request_id: requestId,
        window_id: windowId,
        market: 'prediction',
        scope: 'market',
        reason:
          'Need the current outcome-level quote quality and execution whitelist before placing a prediction trade in this window.',
        objects: [`pm:${symbol}`],
      });

      assert.equal(detail.type, 'detail_response');
      assert.equal(detail.request_id, requestId);
      assert.equal(detail.window_id, windowId);
      assert.equal(detail.objects.length, 1);
      assert.equal(detail.objects[0].market, 'prediction');
      assert.equal(detail.objects[0].blocked_reason, 'SELECT_TRADABLE_OUTCOME_REQUIRED');
      assert.equal(
        detail.objects[0].decision_allowed_objects.some(
          (candidate) => candidate.object_id === `pm:${symbol}:YES` && candidate.outcome_id === yesOutcomeId
        ),
        true
      );

      const decision = await client.submitDecision({
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

      assert.equal(decision.type, 'decision_execution_result');
      assert.equal(decision.decision_id, decisionId);
      assert.equal(decision.window_id, windowId);
      assert.equal(decision.execution_status, 'executed');
      assert.equal(decision.actions.length, 1);
      assert.equal(decision.actions[0].status, 'filled');
      assert.equal(decision.actions[0].object_id, `pm:${symbol}:YES`);
      assert.equal(decision.actions[0].external_token_id, yesOutcomeId);
      assert.equal(decision.actions[0].fill_price, 0.43);

      await assert.rejects(
        () =>
          client.submitDecision({
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
          }),
        (error) => {
          assert.ok(error instanceof AgentTraderApiError);
          assert.equal(error.code, 'DECISION_WINDOW_LIMIT');
          assert.equal(error.statusCode, 409);
          assert.equal(error.details.window_id, windowId);
          return true;
        }
      );

      const errorReport = await client.reportError({
        type: 'error_report',
        report_type: 'runtime_exception',
        source_endpoint: '/sdk/live-integration',
        http_method: 'POST',
        request_id: requestId,
        decision_id: decisionId,
        window_id: windowId,
        error_code: 'SDK_INTEGRATION_NOTE',
        status_code: 200,
        summary: 'Recorded a synthetic runtime note after the live prediction trade to verify error-report persistence.',
        runtime_context: {
          symbol,
          outcome: 'YES',
        },
      });

      assert.equal(errorReport.type, 'error_report_result');
      assert.equal(errorReport.report_type, 'runtime_exception');
      assert.equal(errorReport.summary.includes('synthetic runtime note'), true);

      const dailySummary = await client.updateDailySummary({
        type: 'daily_summary_update',
        summary_date: summaryDate,
        summary:
          'Captured one successful prediction trade during the SDK integration workflow and verified the reporting routes after execution.',
      });

      assert.equal(dailySummary.type, 'daily_summary_update_result');
      assert.equal(dailySummary.agent_id, agentId);
      assert.equal(dailySummary.summary_date, summaryDate);
      assert.equal(dailySummary.status, 'created');

      const [detailRows, submissionRows, executionRows, positionRows, errorRows, summaryRows] =
        await Promise.all([
          sql`select count(*)::int as total from detail_requests where agent_id = ${agentId}`,
          sql`select count(*)::int as total from decision_submissions where agent_id = ${agentId}`,
          sql`select count(*)::int as total from trade_executions where action_id in (select da.id from decision_actions da inner join decision_submissions ds on ds.id = da.submission_id where ds.agent_id = ${agentId})`,
          sql`select count(*)::int as total from positions where agent_id = ${agentId} and symbol = ${symbol}`,
          sql`select count(*)::int as total from agent_error_reports where agent_id = ${agentId}`,
          sql`select count(*)::int as total from agent_daily_summaries where agent_id = ${agentId} and summary_date = ${summaryDate}`,
        ]);

      assert.equal(Number(detailRows[0].total), 1);
      assert.equal(Number(submissionRows[0].total), 1);
      assert.equal(Number(executionRows[0].total), 1);
      assert.equal(Number(positionRows[0].total), 1);
      assert.equal(Number(errorRows[0].total), 1);
      assert.equal(Number(summaryRows[0].total), 1);
    } finally {
      await cleanupScenario(sql, { agentId, symbols: [symbol] });
    }
  });

  await sql.end({ timeout: 1 });
  console.log(`${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
