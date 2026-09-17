# Changelog

All notable changes to the Elaichi Agent Skills are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Skills are content artifacts, not code, so versioning tracks **observable changes
to the guidance an agent receives** — added skills and references, restructured
content, corrected facts, breaking removals.

Dates are `YYYY-MM-DD`.

## [0.1.0] — 2026-09-17

First release. Eight skills, a Claude Code plugin, and a Cursor rule.

### Added

- `skills/elaichi` — the umbrella. What Elaichi is, the vocabulary
  (connector, connection, tool, toolbox, template, synthetic tool, MCP
  endpoint, role, restriction, team), the three-step path to a working agent,
  where every area lives in the app, and the routing table to the other
  skills. References: **Concepts**, **App map**, **First hour**.
- `skills/elaichi-mcp` — the flagship. Why `tools/list` never lists connected
  tools, how `search_tools` ranks lexically and what that means for phrasing,
  the two-namespace cost model, the `connection` argument, the five-rung
  missing-tool ladder, scopes and refusals, and the caps that truncate a
  result silently. References: **Tool discovery**, **Connections and
  accounts**, **Diagnosing a missing tool**, **Scopes and refusals**,
  **Control-plane operations**.
- `skills/elaichi-clients` — connecting Claude, ChatGPT and Cursor: the one-connection model, what each consent scope covers, the
  first prompt to paste, and a troubleshooting table for the "no tools
  appeared" cases. Reference: **Setting up each client**.
- `skills/elaichi-connections` — the connect flow, owner versus access, the
  five connection statuses and why only `active` contributes tools,
  transfer and the delegation it breaks, the offboarding decision table, and
  authoring or forking a custom connector. Reference: **Connection
  lifecycle**.
- `skills/elaichi-toolboxes` — toolbox versus template, stamping, per-entry
  renaming and frozen parameters with their precedence, what sharing at `use`
  actually delegates, and building synthetic tools. References: **Curating a
  toolbox**, **Synthetic tools**.
- `skills/elaichi-governance` — the eight built-in roles and the full
  permission catalog, restrictions including the empty-allow-rule trap and
  the four enforcement points, access requests, the audit log with
  `actor_kind`, and SSO/SCIM. References: **Roles and permissions**,
  **Restrictions**.
- `skills/elaichi-api` — writing code against `api.elaichi.ai`: token format
  and the organization header, the cursor list envelope, error codes, the
  `can_*` capability fields and why never to re-derive them, strict-CRUD URL
  conventions, rate limits and id prefixes. References: **Endpoints**,
  **Patterns**.
- `skills/elaichi-conventions` — the same base facts condensed to one page,
  for agents that want them always in context.
- `rules/elaichi.mdc` — the Cursor always-applied rule, carrying the
  conventions content.
- `manifest/skills.json` plus `scripts/generate-manifest.mjs`, and
  `scripts/generate-rule.mjs`, which derives the Cursor rule from the
  `elaichi-conventions` skill so the two cannot drift.
- `scripts/check-links.mjs` — fails on a relative link or `#anchor` that does
  not resolve, because a dead link in a References table silently removes
  content rather than erroring.
- `scripts/check-endpoints.mjs` — diffs `elaichi-api/references/endpoints.md`
  against the live OpenAPI description at `api.elaichi.ai`, in both
  directions. The endpoint list is the one page here that goes stale when
  Elaichi ships rather than when anybody edits, so the published spec is the
  referee. It runs weekly and on demand, not on pull requests, because it
  needs the network.
- CI that fails on a stale manifest, a stale rule, or a broken link.
