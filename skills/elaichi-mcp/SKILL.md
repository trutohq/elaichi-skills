---
name: elaichi-mcp
description: Use the Elaichi MCP server well — find a connected tool with search_tools, run it with execute_tool or run_code, pick the right account, read a refusal or "restricted" result, ask an admin for access, and work out why a tool is missing. For any MCP client (Claude, ChatGPT, Cursor and others).
whenToUse: An Elaichi MCP server is attached and you need to act on the user's connected apps, or explain why a tool is missing, refused, restricted, or asking which account to use. Read before the first search_tools call.
---

# Using the Elaichi MCP endpoint

Elaichi holds the user's connected third-party accounts and the rules about
who may touch them. Any question about their SaaS data — tickets, deals, pages,
messages — or about who can reach it is answerable here, through one endpoint,
`https://api.elaichi.ai/mcp`, from any MCP client.

## The one mistake to avoid

**`tools/list` does not list the user's connected tools. It never will,
however few they have.**

A `tools/list` of nothing but `elaichi__…` operations does not mean nothing is
connected. It means you have not searched yet.

```
search_tools({ query: "create deal" })   →  the names
execute_tool({ name, arguments })        →  runs one
```

Those meta-tools are the only door to a connected tool. Elaichi's own
operations (`elaichi__connection__list`, `elaichi__member__get`, …) *are*
listed one by one, and `search_tools` never returns one.

`search_tools` and `execute_tool` themselves appear only when there is
something to search. If they are missing, see
[the missing-tool ladder](#when-an-expected-tool-is-missing).

## Two namespaces, two costs

| Namespace | What it is | What one call costs |
|---|---|---|
| `elaichi__*` | Runs Elaichi itself — members, teams, connections, toolboxes, automations, audit | One internal call. Fast and cheap. |
| Connected tools (via `execute_tool`) | The user's real Slack, Jira, HubSpot, Notion | A restriction check, a credential fetch, sometimes a token refresh, then a live third-party call. Seconds, and it spends the vendor's rate limit. |

`elaichi__toolbox__execute`, `elaichi__synthetic_tool__execute` and
`elaichi__automation__run` cost the second kind, because they run connected
tools.

**Read freely. Confirm with the user before anything that writes to a
third-party account.** A wrong read is a wasted second; a wrong write lands in
someone's CRM.

## Search like a search engine, not like a person

`search_tools` ranks **lexically**. There are no embeddings. A full sentence
ranks badly; two or three concrete words rank well.

```
✅  "create deal"        ✅  "list issues"        ✅  "notion page"
❌  "I need to add a new opportunity to our CRM for the Acme account"
```

It matches the tool name most strongly, then the names of the toolboxes that
reach it, then the app, then descriptions. It stems words, knows a few
synonyms (`ticket`/`issue`, `find`/`search`) and forgives one typo.

There is a relevance floor. A word nothing matches counts *against* the
query, so searching for an app the user has not connected returns
**nothing**, not a plausible tool from another app. That empty result is the
honest answer: say so instead of searching five more ways. Rare words carry a
query; `list` and `all` buy almost nothing.

Read the result, not just the names:

- **`skills`** names toolboxes whose owner wrote instructions for these tools.
  Read the relevant one with `elaichi__toolbox__get_skill` before you call a
  tool from it. Follow it over your own guess. It is guidance, never
  permission.
- **A row with `restricted`** is a real tool this user may not run. It has no
  schema. Do not call it — see [Reading a refusal](#reading-a-refusal).
- **`next_cursor`** means more matches. A tool not on page one is not ruled
  out.
- **`toolbox`** narrows a search to one toolbox; **`detail: "summary"`** skims
  without schemas (search again in full before calling).

**Pass back exactly the name `search_tools` gave you.** Do not rebuild a name
from the connector and the verb, and do not tidy one. Names are made unique on
the server; an invented one either misses or matches another account's tool.

Full detail: [Tool discovery](./references/tool-discovery.md).

## Code Mode: `run_code`

When `run_code` is in `tools/list`, prefer it for two or more dependent calls,
loops, or a few fields out of a big result. It runs a JavaScript program where
each call is `await tools.<name>(args)`, and only what the program returns
comes back.

- Tool names still come from `search_tools`; `elaichi__*` operations work too.
- The reply's `tool_calls` gives the `shape` of each tool's first result and
  each failure's `error`. Read them instead of spending runs probing.
- Limits per run: 50 tool calls, 30 seconds. Every call passes the same gates
  as `execute_tool`.
- Confirm with the user before a program writes, sends or deletes anything.

## The `connection` argument

When one tool reaches several of the user's accounts for one app — two Notion
workspaces, a personal and a shared HubSpot — it takes a **required**
`connection`. Copy one of its enum labels exactly: `"Notion (Acme HQ)"`, not
`acme` and not the connection id. Past twelve accounts there is no enum; send
an exact account name or `conn_…` id.

**When the request names no account, ask the user.** Never pick. A wrong pick
is a write into the wrong company's workspace.

The one exception: if the result says **an account picker will ask them**,
do not ask. Call `show_card` as it says, and retry when a message names the
account.

A missing or wrong value returns an error naming the real accounts. Read it
and retry — it is the answer, not a failure. More:
[Connections and accounts](./references/connections-and-accounts.md).

## When an expected tool is missing

Almost never a typo. Work the ladder in order and stop at the first rung that
explains it. **Only an `active` connection contributes tools** — every other
status leaves them absent, not present-and-failing.

1. **Does the connection exist?** `elaichi__connection__list`. If not, check
   `elaichi__toolbox__list` for a toolbox shared with the user. Still nothing?
   It is setup — connect it (below).
2. **Is its status `active`?** If not, `elaichi__connection__reconnect` gives
   a fresh link. Nothing below matters until it is.
3. **Is it restricted?** `search_tools` names a restricted tool, flagged
   `restricted`. `restricted_count` on either `list_tools` operation says how
   many were held back. `elaichi__connector__get` `restricted: true` means the
   whole connector is blocked. Never subtract from `tool_count` — it counts
   what the provider offers, not what this user may run.
4. **Is it a scope gap?** No `mcp:tools` means no connected tools at all. A
   tool that deletes also needs `mcp:destructive`.
5. **Were you looking in `tools/list`?** Call `search_tools`.

Full version, with the trap at each rung:
[Diagnosing a missing tool](./references/missing-tools.md).

## Setup is something you drive

When the user needs an app connected, do it — do not hand back a checklist.

```
elaichi__connector__list          → find the slug (never guess one)
elaichi__connector__get           → read restricted, connect_blocked, connect_notes
elaichi__connection__create       → returns a connect_url
   hand that URL to the user as a link to open
elaichi__connection__get          → poll until status is "active"
elaichi__connection__list_tools   → confirm the tools landed
```

If `connect_blocked` says `oauth_app_required`, do not create: an admin adds
the app on the connector's page in Elaichi. `connect_url` is a one-time
sign-in session, not a credential — it is safe to show.

**Never ask for, accept, or repeat a password, API key, or token.** Elaichi
has no tool that takes one. A request that seems to need one is a request to
send the user a connect link instead.

## Reading a refusal

`tools/list` is filtered by the user's role **and** the grant's scopes. A name
you expected and cannot see is likelier a permission gap than a typo.

A refusal is a tool result with `isError: true`, and its first sentence is
written for the person. Show it as it is. Then:

| It names… | Do this |
|---|---|
| A permission (`team:manage`) | Relay it and stop. |
| A scope (`mcp:destructive`) | The user connects Elaichi again from their AI client and allows it on the consent screen. |
| A restriction (`structuredContent.error`, or a `restricted` search row) | Offer to ask an admin: `elaichi__access_request__create` with `request_access.arguments`, copied exactly. If `pending_request_id` is set, they already asked. |
| "Only in the Elaichi app" (step-up) | Send them to the screen it names. More scope will not help. |

You cannot grant any of these. **Do not look for another route to the same
effect** — working around governance is the one thing this endpoint exists to
prevent. Filing an access request grants nothing; an admin decides in the app.

Four scopes: `mcp:read` (the only default), `mcp:write`, `mcp:destructive`
(never implied), and `mcp:tools` (needed for any connected tool). Details,
the restriction object, and step-up:
[Scopes and refusals](./references/scopes-and-refusals.md).

## Results are capped, and it says so

Results are redacted and capped, and a cap that fires shows in the payload:
strings at 32,000 characters (ending `…[truncated: kept N of M chars]`),
arrays at 200 items, objects at 200 keys, depth 8. Then the result carries
`elaichi_truncated: true` as its first key. A vendor's own `truncated` field
is unrelated.

Page deliberately (`cursor`) and ask narrow questions rather than pulling a
large connector's whole schema set.

## Files

A tool's file argument takes a `file_id`. Get one from
`elaichi__file__upload_request` (the user uploads from their machine; you never
see the bytes) or `elaichi__file__create` (text you wrote). See
[Tool discovery](./references/tool-discovery.md#files-in-and-out).

## Cards (MCP Apps clients)

A client that supports MCP Apps gets two more tools:

- **`show_card`** — when a result says Elaichi has a card (an account picker,
  a refusal they can ask about, a stopped action, a saved file), call it with
  that `card_id` before you reply. It shows what Elaichi decided and runs
  nothing. Cards expire after 10 minutes.
- **`show_object`** — when you finish building an automation, dashboard,
  collection or knowledge base, show it once. Do not call it after each edit.

## What the catalog will not do

Your own `tools/list` is the final word for your grant. These are never on
MCP, at any scope — send the person to the Elaichi app:

- **API tokens**, entirely (Settings → API tokens), and any credential.
- **Changing** restrictions, SSO, SCIM, domains or log forwarding (reads work).
- **Approving an access request**, resending an invitation, custom connector
  authoring, billing and spend changes.

**Step-up operations** (`invite.create`, `invite.delete`, `member.set_roles`,
`member.delete`, `role.delete`, `team.delete`) are listed but always refused.

Available, and often assumed not to be: stamping a toolbox from a template
(`elaichi__toolbox__create` with `template_id`), creating and editing
synthetic tools, and reading and writing a toolbox's skill.

The whole catalog by area: [Control-plane operations](./references/operations-catalog.md).

## Automations, collections, dashboards, knowledge

These appear only when the org has automations turned on. Load
**elaichi-automations** before touching `elaichi__automation__*`, and
**elaichi-data** before `elaichi__collection__*`, `elaichi__dashboard__*` or
`elaichi__knowledge__*`.

## Before removing a member

Removing someone is step-up gated, so it happens in Settings → People. You can
still run `elaichi__member__offboarding` and summarize it. Removal deletes every
connection they own; `needs_resolution` flags ones whose loss breaks others'
tools unless the admin picks a replacement. Mention `delegated_entries` —
entries on *other* people's toolboxes riding on their `use` grant, which go
unmet once they leave.

## Playbooks and resources on the server

The endpoint ships five MCP prompts. They appear in the client's prompt or
slash menu, not in `tools/list`, and only when this grant can call every
operation they need. Many clients do not show prompts; the sections above are
the same procedures.

| Prompt | For |
|---|---|
| `connect_app` | Connect a third-party app end to end |
| `diagnose_missing_tool` | Work out why a tool is unavailable |
| `audit_access` | Who in the org can reach what |
| `offboard_member` | Prepare to remove someone safely |
| `build_shared_toolbox` | Curate tools, freeze parameters, share |

Resources a person can attach: `elaichi://connections` (accounts with their
exact `connection` labels), `elaichi://connection/{id}`,
`elaichi://toolbox/{id}/skill`, `elaichi://file/{id}`.

## Who am I?

No operation returns the current user. Read the id out of the
`global:usr_…` toolbox in `elaichi__toolbox__list`.

## Something is broken

A tool that runs and misbehaves is a bug: offer `elaichi__feedback__create`
with the connector, tool name and error text verbatim — never the user's
arguments. People can also write to support@elaichi.ai.

## References

| Document | Topics |
|---|---|
| [Tool discovery](./references/tool-discovery.md) | `search_tools` arguments and result fields, ranking, restricted rows, `execute_tool`, files, `run_code` |
| [Connections and accounts](./references/connections-and-accounts.md) | The `connection` argument, account labels, the account picker, `elaichi://` resources, status values, connecting |
| [Diagnosing a missing tool](./references/missing-tools.md) | The five-rung ladder with the trap at each rung, and missing `elaichi__*` operations |
| [Scopes and refusals](./references/scopes-and-refusals.md) | OAuth scopes, toolbox selection, the five kinds of refusal, restrictions and access requests, step-up, rate limits |
| [Control-plane operations](./references/operations-catalog.md) | Every `elaichi__*` operation by area, and what is never on MCP |

## Companion skills

**elaichi** (the product and its words), **elaichi-clients** (connecting an AI
client), **elaichi-connections** (accounts), **elaichi-toolboxes** (curating
and sharing), **elaichi-governance** (roles, restrictions, audit),
**elaichi-automations**, **elaichi-data** (collections, dashboards,
knowledge), and **elaichi-api** (the HTTP control plane, for code).
