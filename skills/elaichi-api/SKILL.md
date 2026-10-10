---
name: elaichi-api
description: Write code against the Elaichi REST API at api.elaichi.ai — API tokens and what they cannot do, the organization header, the cursor list envelope and server-side search, error codes, can_* capability fields, URL conventions, rate limits, and the OpenAPI schema. Use for scripts, integrations, provisioning, or a UI over Elaichi.
whenToUse: Writing or reviewing code that calls api.elaichi.ai — scripts, integrations, provisioning, or a UI over Elaichi. Read before constructing the first request.
---

# The Elaichi API

```
https://api.elaichi.ai
```

A machine-readable description is served live, unauthenticated:

```
GET https://api.elaichi.ai/openapi.json        (also /openapi.yaml)
GET https://api.elaichi.ai/schema/openapi.json (also /schema/openapi.yml)
```

**Treat that schema as the contract.** Every route the server mounts falls in
one of three groups:

| Group | In the schema? | Build on it? |
|---|---|---|
| **Published** | Yes | Yes. This is the API. |
| **Internal** — the console's own screens, browser redirects, inbound webhooks, staff tools | No | No. Its URLs can change without notice. |
| **Invite-only** — automations, approvals, collections, dashboards and public links, knowledge, web access, apps, spend | No, not yet | Only if the organization has the feature, and expect changes. See [Endpoints](./references/endpoints.md#invite-only-families-not-in-the-schema). |

Paths are unversioned — `/connection`, not `/v1/connection`. An unknown path
asked for with `Accept: text/markdown` answers a short Markdown page that
points at the schema, instead of JSON.

## Authentication

```
Authorization: Bearer elch_{org_id}_{64 hex}
```

A person creates a token at **Settings → API tokens** in
[app.elaichi.ai](https://app.elaichi.ai). It needs `api_token:create` (the
built-in Member role has it) and a fresh re-verification (passkey, two-factor
code or emailed code) at that moment. **The raw value is shown exactly once.**

What a token is:

- **It has no scopes.** It acts *as the person who created it*, with their
  live permissions. Change their role and the token changes at once. Remove
  them and it stops working.
- **It is bound to one organization.** The org id is inside the token.
- **It cannot manage tokens.** Every `/api-token` route refuses a token with
  `403`. Listing, minting, renaming and revoking tokens happen in the app.

### Things only a person in the browser can do

Some actions refuse any token with `403 forbidden` ("This action needs an
interactive browser session"). The right answer is to tell the person to do it
in the app. Do not look for a way around it.

- Anything under `/api-token` and `/scim-token`.
- Resolving an access request (`POST /access-request/:id/resolve`).
- Scheduling the organization's deletion (`DELETE /organization/:id`), and
  changing whether the organization requires two-factor sign-in.
- Approving an AI client on the consent screen.
- Changing payment settings (invite-only spend controls).

A token never gets `428 step_up_required`. That code goes to a browser session
that must re-verify first. Some routes ask the browser to re-verify but let a
token through: invites, changing a member's role, deleting a role or team,
org domains, group mappings, creating or editing an SSO connection. That is
deliberate — getting a token already cost a re-verification.

There is no supported way to get a browser session outside the browser. Do not
try to mint, borrow or replay one.

## The organization header

```
X-Organization-Id: org_…
```

With an API token the header is **optional** — the token already names the
organization. If you send it, it must match, or you get `403`.
`/organization/:id/*` routes take the org from the path instead.

An organization without an active plan answers `403 subscription_required` on
its product routes. A feature the plan does not include answers
`403 feature_not_available`, with `feature` and `plan` in the error.

## The list envelope

**Every endpoint returning an array uses the same shape.**

```json
{
  "result": [ /* … */ ],
  "next_cursor": "opaque-or-null",
  "prev_cursor": "opaque-or-null"
}
```

| Parameter | Behavior |
|---|---|
| `limit` | Default **50**, maximum **200**. Above 200 is clamped, not rejected. Zero, negative or not a number is a `400`. |
| `cursor` | Opaque. Round-trip it untouched. An empty string means "first page". |
| `q` | Free-text search, up to 200 characters. Whitespace-only is ignored. |

**Page until `next_cursor` is null.** That is the only stop condition. A short
page, or an empty one, is not the last page.

How `q` matches, on every route that takes it: each word must appear somewhere
in the searched fields, in any order. If that finds nothing at all, a second
pass also accepts one typo in words of five letters or more. So `slakc` finds
Slack.

Two rules that prevent the most common bugs:

- **Never search, filter, sort or count in your code over a paginated list.**
  You would see only the pages you fetched. `q` and filters go to the server,
  which applies them before paging. Counts come from server fields, never
  `result.length`.
- **Changing `q` or a filter starts a new result set.** Drop the cursor and ask
  for page one. Some cursors are bound to the query they came from and answer
  `400` if replayed under another one.

Most cursors are keyed on id, so they stay stable as rows are added. A few
lists the server builds in memory use an offset cursor, which can shift by one
row if the set changes between pages.

## Errors

```json
{
  "error": {
    "message": "You need the “Manage teams” permission (team:manage) to manage this team.",
    "code": "permission_required",
    "details": {
      "required_permissions": ["team:manage"],
      "action": "manage this team"
    }
  }
}
```

| Code | HTTP | Meaning |
|---|---|---|
| `validation_error` | 400 | A field failed validation — including a bad `limit`, a long `q`, or a malformed `cursor` |
| `bad_request` | 400 | Malformed request |
| `missing_organization_header` | 400 | No `X-Organization-Id` on an org-scoped route (browser sessions only) |
| `unauthorized` | 401 | Missing or invalid credential |
| `permission_required` | 403 | Role denial. `details.required_permissions` lists every permission that would do — **any one** is enough |
| `forbidden` | 403 | Not allowed — including "needs an interactive browser session" |
| `subscription_required` | 403 | The organization has no active plan |
| `feature_not_available` | 403 | The plan does not include this feature |
| `not_found` | 404 | No such resource — **or one deliberately hidden from you** |
| `conflict` | 409 | Clashes with current state. Many routes use a more specific 409 code |
| `payload_too_large` | 413 | Body too big |
| `step_up_required` | 428 | Browser sessions only: re-verify first |
| `rate_limited` | 429 | Over the limit. See `Retry-After` |
| `internal_error` | 500 | Server failure |
| `platform_*_stopped` | 503 | Elaichi paused sign-ups, new connections or MCP platform-wide |
| `clove_timeout`, `saffron_timeout` | 504 | An internal service did not answer in time. Nothing changed. Retry |

Two habits:

- **Show `error.message` unchanged.** It is written for a person and names the
  permission in their words. Do not rewrite it as "403 Forbidden".
- **Treat a `404` on something you believe exists as "not yours".** Elaichi
  hides resources you hold no grant on rather than confirming they exist.

Every response carries `X-Request-Id` (`req_…`). Log it — support will ask for
it.

## Capability fields

**The server computes what the caller may do and ships it as a field.** Read
it. Never rebuild it from `owner_user_id` and a permission list. A guess is
either too loose (a button that 403s) or too strict (a hidden action the
person was allowed to take), and it cannot see server-only facts.

| Field | Answers |
|---|---|
| `can_use` | May the caller use it — run a toolbox's tools, pin a connection, stamp a template, connect through a custom connector |
| `can_share` | May the caller add grantees |
| `can_manage` | May the caller change this resource's own settings |
| `can_transfer` | May the caller give it away. Usually also "may delete" — both are owner-only |
| `can_revoke_share` | May the caller remove an existing grant |
| `can_see_shares` | May the caller be told *who* it is shared with |

`can_manage` is the one name for "may change its settings" on every resource.
There is no `can_edit` or `can_update`.

Some resources add fields for questions only they have. Same rule: read them.
Connections carry `can_reconnect`, `can_refresh_credentials` and (on the
detail) `can_run_post_install`. Connectors carry `can_delete`,
`can_configure_oauth_app` and `can_fork`. Roles carry `can_grant`. Toolbox
entries carry `can_repin`.

Beside them, not instead of them:

- `access_via` says **how** the caller reaches a row — `owner`, `direct`,
  `team` or `org` (broadest wins), with `access_via_team` for a team. It is
  **omitted** when nothing reaches the caller. Absence means "no source to
  name", never "not permitted".
- `restricted` / `restricted_by` (`role`, `user` or `null`) say an admin's
  restriction blocks this for the caller. That is a different gate from
  `can_use`, with a different fix (an access request).
- A `shares` array being present is not permission to show it. Use
  `can_see_shares`.

Command responses (create, update, transfer, reconnect) carry the same `can_*`
fields as list rows, so a freshly changed row keeps its actions.

## URL conventions

| Kind | Pattern | Examples |
|---|---|---|
| CRUD | `GET/POST /resource`, `GET/PATCH/DELETE /resource/:id` | `/role`, `/sso-connection` |
| Action | `POST /resource/:id/<verb>` | `verify`, `reconnect`, `execute`, `transfer`, `test` |
| Nested collection | `/resource/:id/<collection>[/:childId]` | `/team/:id/member`, `/toolbox/:id/share` |

- **Ordinary fields update through `PATCH /resource/:id`.** Every field is
  optional. `null` clears a nullable field. There are **no attribute
  subpaths** — no `PATCH /org-domain/:id/default-role`.
- **`POST /:id/<verb>` is only for things that *do* something**, not for
  editing a field.
- **No row embeds an unbounded child list.** A row carries a count and a small
  preview. The full set has its own paginated, searchable endpoint — a team
  row has counts and a preview, the roster is `GET /team/:id/member`.
- **Every `POST /…/share` takes one grantee or many.** Send `grantees` (up to
  50) with one `level` to share with several at once. Refused grantees come
  back in `rejected`; the rest are granted.

## Rate limits

| Surface | Limit | Keyed on |
|---|---|---|
| REST API | **600 requests / 60s** | The API token |
| MCP endpoint | **120 requests / 60s** | The OAuth access token |

Over the limit: `429`, code `rate_limited`, and `Retry-After` in seconds.
Honor it.

The published API has no idempotency key. Design writes so a retry after a
timeout is safe to reason about — re-read before you repeat a write.

## Ids

TypeIDs: `{prefix}_{26 characters}`. Opaque to you, but sortable by time
within a prefix, which is why cursors use them.

Common prefixes: `org`, `usr`, `team`, `role`, `conn` (connection), `tbx`
(toolbox), `tpl` (template), `syn` (synthetic tool), `acl` (a grant), `rstr`
(restriction), `inv` (invite), `atok` (API token), `aud` (audit event), `areq`
(access request), `file`. Invite-only resources add `auto` (automation),
`coll` (collection), `dash` (dashboard), `kbs` (knowledge base) and `bndl`
(app). The full table is in [Conventions](../elaichi-conventions/SKILL.md).

Connectors are named by **slug** (`hubspot`), not an id.

Three id-shaped things are **not** TypeIDs, because they carry an org id:
`elch_…` (API token), `einv_…` (invite), `escim_…` (SCIM token). All three are
`{prefix}_{orgId}_{secret}`.

The automatic toolboxes have computed ids — `global:{userId}` (listed as "All
tools") and one `connection:{connectionId}` per active connection. They are
read-only, and every change, share or transfer call refuses them.

## References

| Document | Topics |
|---|---|
| [Endpoints](./references/endpoints.md) | Every published route by area, with the permission each needs, plus the invite-only families |
| [Patterns](./references/patterns.md) | Paging, server-side search, capability fields, error handling, retries, and tokens in code |

## Companion skills

- **elaichi-conventions** — the same base facts, condensed, for always-on
  context.
- **elaichi-governance** — what each permission in an error means.
- **elaichi-connections** — the connect flow behind `POST /connection`.
- **elaichi-mcp** — the same operations reached as MCP tools instead.
