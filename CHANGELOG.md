# Changelog

All notable changes to the Elaichi Agent Skills are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Skills are content artifacts, not code, so versioning tracks **observable changes
to the guidance an agent receives** — added skills and references, restructured
content, corrected facts, breaking removals.

Dates are `YYYY-MM-DD`.

## [Unreleased]

## [0.2.0] — 2026-10-10

Every skill re-checked against the product as it runs today, and two new
skills for features that had no guidance at all.

### Added

- `skills/elaichi-automations` — automations (workflows): checking they are on
  for the organization, choosing between an automation, a synthetic tool or a
  plain tool call, whose access a run uses, the draft → validate → dry run →
  publish → enable loop over MCP, the seven trigger types and every step type,
  runs, approvals, sessions, settings and run input, webhooks and samples,
  usage limits, and who can see, run and manage. References: **Writing a
  definition**, **Operating automations**, **Worked example**.
- `skills/elaichi-data` — collections (shared tables), dashboards and public
  links, and knowledge bases: when to use each, building them over MCP, draft
  and publish, why a widget runs as its viewer, what a public link shows,
  reviewed versus unreviewed knowledge and the search `gate`. References:
  **Collections**, **Dashboards**, **Knowledge**.
- `elaichi-toolboxes`: a **Toolbox skills** reference — when to write one (in
  the same `toolbox.create` call, whenever the toolbox is for a specific job),
  what goes in it, naming tools by catalog `tool_name`, the 10,000-character
  limit, staleness and `skill_tool_issues`, and reading a skill before using a
  toolbox.
- `elaichi-governance`: **People and identity** (app-only actions, joining,
  domains, SSO, SCIM, group mappings, offboarding, support access) and
  **Oversight** (audit log scopes, logging destinations, notifications,
  approvals, web access, spend) references.
- `elaichi-mcp`: Code Mode (`run_code`); the full `search_tools` result
  (`toolbox` filter, `detail: "summary"`, `skills`, restricted rows,
  `blocked_connections`); files in and out of tools; MCP Apps cards; the five
  kinds of refusal and filing an access request with `request_access.arguments`.
- `elaichi-connections`: bring-your-own OAuth apps, remote MCP connectors, the
  blocked and app-unavailable states, repair actions, and connecting from an
  agent.
- `elaichi-api`: published, internal and invite-only route groups, rebuilt from
  the live OpenAPI schema.
- `elaichi-clients`: setup for any MCP client, the consent screen's org and
  toolbox steps, and a longer no-tools troubleshooting ladder.
- `elaichi` and `elaichi-conventions`: words, app-map entries, id prefixes and
  error codes for the automation platform, the Elaichi Agent, files and spend.

### Changed

- Automations, collections, dashboards and knowledge are described as early
  access by invitation, switched on in Settings → Organization → Automations —
  not "not available", and never with a date.
- Inviting, changing roles, removing members, and deleting roles or teams are
  marked "Only in the Elaichi app": they need a fresh sign-in and are refused on
  every AI surface. Access requests are approved in the app only.
- Offboarding deletes every connection a leaving member owns; admins pick
  replacements to keep tools working, and transferring before they leave is the
  only way to keep a connection.
- Restrictions layer: a person's own rule only narrows what their role allows,
  and teams are not a restriction target. Restricted tools are named in
  `search_tools` with a `restricted` flag, not invisible.
- The permission catalog is rebuilt: 58 permissions, with the automation, data,
  apps, spend and `team:create` families. Team admins can delete their team and
  appoint admins.
- MCP calls are audited as the person (surface `mcp`); `ai_assistant` marks the
  in-app Agent only.
- `search_tools` ranking is described as BM25F with stemming, synonyms and typo
  tolerance, and it includes synthetic tools that are toolbox entries.
- The consent screen pre-ticks every requested scope except Delete; adding a
  scope means connecting the client again. A connected tool that deletes needs
  `mcp:destructive` as well as `mcp:tools`.
- API tokens cannot use the API-token routes, and browser-only actions answer
  `403`, not `428`.
- Frozen values are visible to the model but cannot be changed — never freeze
  secrets. Synthetic tools are owner-only.
### Changed

- **All my tools** now covers every toolbox shared with the user at `use` or
  above, not only the connections they own or were shared. `elaichi-mcp`'s
  scopes and connections references and `elaichi`'s concepts say so, and the
  missing-tool ladder now checks for a shared toolbox before calling a missing
  connection a setup problem: a toolbox's pinned connection never appears in
  the recipient's connection list.

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
