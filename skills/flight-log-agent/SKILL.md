---
name: flight-log-agent
description: Fill Flight Log Generator drafts through its local agent API. Use when the user wants an agent such as OpenClaw or Codex to gather flight information, enrich a real flight, write or patch a flight-log draft, run the CA8565 backtest, or prepare a draft for import into the Flight Log Generator web editor.
---

# Flight Log Agent

Use this skill to operate a running Flight Log Generator app through its local REST bridge.
The app must be reachable at a base URL such as `http://localhost:3000`.

## Quick Workflow

1. Read `references/api.md` when you need endpoint details or field paths.
2. Confirm the app is running and note the base URL.
3. If `FLIGHT_LOG_AGENT_TOKEN` is set on the app, pass the same value as `--token` or `FLIGHT_LOG_AGENT_TOKEN`.
4. Run `scripts/fill-flight-log.mjs` to enrich a flight and write a draft.
5. Tell the user to open `/app`, use the agent draft import control, review uncertain fields, and export.

## Common Commands

Fill a draft:

```bash
node skills/flight-log-agent/scripts/fill-flight-log.mjs \
  --base-url http://localhost:3000 \
  --flight CA8565 \
  --date 2026-05-07 \
  --token "$FLIGHT_LOG_AGENT_TOKEN"
```

Run the built-in CA8565 backtest:

```bash
node skills/flight-log-agent/scripts/smoke-test.mjs \
  --base-url http://localhost:3000 \
  --token "$FLIGHT_LOG_AGENT_TOKEN"
```

## Handling Live Source Failures

FlightRadar24 endpoints are unofficial and may return Cloudflare or expired-track errors.
Treat that as a graceful degradation when the schema, baseline/manual fields, airport data,
METAR attempts, draft write/read, editor import, and preview still work.

## Output Expectations

When you finish a user task, report:

- Draft flight number and date.
- Which enrichment sources succeeded or degraded.
- The editor URL to import the draft.
- Any fields the user should manually verify.
