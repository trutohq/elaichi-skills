---
name: elaichi-mcp
description: Drive the Elaichi MCP endpoint well — find connected tools with search_tools, run them with execute_tool, pick the right account for the connection argument, read a refusal correctly, and diagnose a missing tool instead of guessing.
whenToUse: An Elaichi MCP server is attached and you need to act on the user's connected SaaS accounts, or explain why a tool is missing, refused, or asking which account to use. Read before the first search_tools call.
---

# Using the Elaichi MCP endpoint

Elaichi is where the user's connected third-party accounts live, and where the
rules about who may touch them live too. If an Elaichi server is attached, any
question about the user's SaaS data — their tickets, deals, pages, messages —
is answerable here. So is any question about who in their company can reach it.

One endpoint, `https://api.elaichi.ai/mcp`, carries both.

## The one mistake to avoid

**`tools/list` does not list the user's connected tools. It never will, however
few they have.**

A `tools/list` returning nothing but `elaichi__…` operations does not mean
nothing is connected. It means you have not searched yet.

```
search_tools({ query: "create issue" })   →  the names
execute_tool({ name, arguments })         →  runs one
```

Those two meta-tools are the only door to a connected tool. Elaichi's own
control-plane operations (`elaichi__connection__list`, `elaichi__member__get`, …)
*are* listed individually, and `search_tools` never returns one — the two
namespaces do not overlap.

The reason is tool-choice accuracy: a model picks well from a short, stable
list, and this one stays the same size whether the user connected two apps or
forty.

## Two namespaces, two costs

| Namespace | What it is | What one call costs |
|---|---|---|
| `elaichi__*` | Administers Elaichi itself — members, roles, teams, connections, toolboxes, audit | One internal call. Fast and cheap. |
| Connected tools (via `execute_tool`) | The user's real Slack, Jira, HubSpot, Notion | A restriction check, a credential fetch, sometimes a token refresh, then a live third-party API call. Seconds, and subject to the vendor's rate limits. |

Two `elaichi__*` operations are the exception and cost the second kind:
`elaichi__toolbox__execute` and `elaichi__synthetic_tool__execute`, because
both run a connected tool.

**Read freely. Confirm with the user before anything that writes to a
third-party account.** A wrong read is a wasted second; a wrong write lands in
someone's CRM.

## Search like a search engine, not like a person

`search_tools` ranks **lexically**, not semantically. There are no embeddings
behind it. A full sentence ranks badly; concrete tool-ish words rank well.

```
✅  "create deal"        ✅  "list issues"        ✅  "notion page"
❌  "I need to add a new opportunity to our CRM for the Acme account"
```

Scoring, so you can aim at it:

| Where the word hits | Score |
|---|---|
| Exact token in the tool **name** | +5 |
| Prefix match on the name (`contacts` ↔ `contact`) | +3 |
| The **connector** label (`Notion`, `Jira`) | +2 |
| A word in the **description** | +1 |

There is also a relevance floor. A word nothing in the index matches counts
*against* the whole query, so searching `cal_com_schedules` on an account that
only has Notion returns **nothing** rather than a plausible-looking Notion
tool. An empty result is the honest answer: the user has not connected that
app. Say so instead of searching five more ways.

Rare words carry the query. `list` and `all` sit on most tools and buy you
almost nothing; `schedules`, `deal`, `retro` decide the answer.

**Pass back exactly the name `search_tools` gave you.** Do not reconstruct a
name from the connector and the verb, and do not clean one up. Names are
disambiguated server-side, and an invented one either misses or — worse —
matches a different account's tool.

## The `connection` argument

When one tool reaches several of the user's accounts for the same app — two
Notion workspaces, a personal and a shared HubSpot — the tool takes a
**required** `connection` argument. Copy one of its enum labels exactly, as
given: `"Notion (Acme HQ)"`, not `acme` and not the connection id.

**When the user's request singles out no account, ask them.** Never pick. This
argument exists precisely to stop a model quietly choosing between two real
accounts, and a wrong choice is a write into the wrong company's workspace.

Calling without it returns an error naming the real accounts. Read the error
and retry — it is the answer, not a failure.

To list accounts yourself, `elaichi__connection__list` is the complete one;
the `elaichi://connections` resource carries the same labels but omits pending
accounts. Label rules, the twelve-account cap, and what to send when you only
have the user's words for an account:
[Connections and accounts](./references/connections-and-accounts.md).

## When an expected tool is missing

Almost never a typo. Work the ladder in order and stop at the first rung that
explains it. **Only an `active` connection contributes tools** — every other
status leaves them absent from the list, not present-and-failing.

1. **Does the connection exist?** `elaichi__connection__list`. If not, this is
   setup — run the `connect_app` playbook.
2. **Is its status `active`?** If not, `elaichi__connection__reconnect` gives a
   fresh link. Nothing below matters until it is.
3. **Absent from `elaichi__connection__list_tools`?** Read `restricted` on
   `elaichi__connector__get`. `true` means governance blocked the whole
   connector for this user — say so and stop. `false` rules out a
   connector-level block and **nothing else**: a single tool can still be
   restricted, invisibly. Do not subtract `tool_count` from what you got; it
   counts what the provider offers, not what this user may run.
4. **Is `mcp:tools` on the OAuth grant?** Without it no connected tool is
   offered at all.
5. **Were you looking in `tools/list`?** Call `search_tools`.

Full version, with the traps at each rung, in
[Diagnosing a missing tool](./references/missing-tools.md).

## Setup is something you drive

When the user needs an app connected, do it — do not hand back a checklist.

```
elaichi__connector__list          → find the slug (never guess one)
elaichi__connection__create       → returns a connect_url
   hand that URL to the user as a link to open
elaichi__connection__get          → poll until status is "active"
elaichi__connection__list_tools   → confirm the tools landed
```

The user does the authenticating; you do the bookkeeping. `connect_url` is a
one-time sign-in session, not a credential — it is safe to show.

**Never ask for, accept, or repeat a password, API key, or token.** Elaichi has
no tool that takes one. A request that seems to need one is a request to send
the user a connect link instead.

## Reading a refusal

`tools/list` is filtered by the caller's role **and** by the OAuth grant's
scopes. A name you expected and cannot see is far more likely a permission gap
than a typo.

A refusal names the permission or the scope it wanted. You cannot grant either.
Relay the exact name to the user and stop — do not look for another route to
the same effect. Working around a restriction is the one thing this endpoint
exists to prevent.

Four scopes: `mcp:read` (the only default), `mcp:write`, `mcp:destructive`
(never implied by anything), and `mcp:tools` — required before **any** connected
tool is offered. The consent screen calls them Read, Create and change, Delete,
and Run tools.

What each covers, how toolbox selection works, and what a scope refusal looks
like: [Scopes and refusals](./references/scopes-and-refusals.md).

## Results are capped, quietly

Over MCP, results are redacted and truncated with no marker in the payload:

- strings at 8,000 characters
- arrays at **200 items**
- objects at 200 keys
- depth 8

So a broad list can come back both enormous and silently incomplete. Two habits
follow. Page deliberately — `elaichi__connector__list_tools` and
`elaichi__connection__list_tools` take `limit` (default 200) and return
`nextCursor`; send it back as `cursor` until it is null. And ask a narrow
question rather than pulling a large connector's full schema set.

Failures split two ways, and the difference decides whether a retry is
sensible — see
[Control-plane operations](./references/operations-catalog.md#results-and-failures).

## What the catalog will not do

Your own `tools/list` is authoritative for your grant — it is filtered by the
user's role and by the scopes they approved. But four things are absent from
the catalog entirely, by design, at every scope:

- **API tokens, entirely** — not minting one, and not renaming or revoking one
  either. Handing a model the ability to mint a standing credential would be
  privilege escalation, and the rest of the domain went with it. Send the
  person to Settings → API tokens.
- **Rotating or reading a credential.** No operation anywhere accepts a secret
  as input or returns one.
- **Billing.**
- **Authoring or forking a custom connector.**

Six areas are **read-only** here even with `mcp:write`. You can inspect them
and must send the user to the Elaichi app to change them:

| Area | Operations available |
|---|---|
| Restrictions | `elaichi__restriction__list`, `…__get` |
| SSO connections | `elaichi__sso_connection__list`, `…__get` |
| SCIM groups | `elaichi__scim_group__list` — SCIM **tokens** are not on this surface at all |
| Directory group mappings | `elaichi__group_mapping__list`, `…__get` |
| Verified org domains | `elaichi__org_domain__list` |
| Logging destinations | `elaichi__logging_destination__list`, `…__get` |

Stamping a toolbox from a template **is** available:
`elaichi__toolbox__create` with `template_id`.

## Before removing a member

Always run `elaichi__member__offboarding` before `elaichi__member__delete`.

If it marks any connection `needs_resolution`, **stop and hand off to the app**.
Only those block, and they are private to the departing member — so
`elaichi__connection__transfer` refuses them too, and the delete refuses while
any remain. Settings → People finishes it in one step.

It also reports `delegated_entries`: entries on *other* people's toolboxes
riding on this member's `use` grant rather than their ownership. Non-blocking,
but mention it — those go unmet the moment the member leaves.

## Playbooks on the server

The endpoint ships five MCP prompts. They appear in the client's own prompt or
slash menu, not in `tools/list` — and most clients do not support prompts at
all, in which case the sections above are the same procedures inline.

Offer one when the request matches.

| Prompt | For |
|---|---|
| `connect_app` | Connect a third-party app end to end |
| `diagnose_missing_tool` | Work out why a tool is unavailable |
| `audit_access` | Who in the org can reach what |
| `offboard_member` | Remove someone safely |
| `build_shared_toolbox` | Curate tools, freeze parameters, share |

## Who am I?

No operation returns the current user. Read the id out of the
`global:usr_…` toolbox in `elaichi__toolbox__list`.

## References

| Document | Topics |
|---|---|
| [Tool discovery](./references/tool-discovery.md) | How `search_tools` ranks, how to phrase a query, why a result set is empty, `execute_tool` argument shape |
| [Connections and accounts](./references/connections-and-accounts.md) | The `connection` argument in full, account labels, `elaichi://` resources, connection status values |
| [Diagnosing a missing tool](./references/missing-tools.md) | The five-rung ladder with the trap at each rung |
| [Scopes and refusals](./references/scopes-and-refusals.md) | OAuth scopes, consent, toolbox selection, what a refusal means and what it does not |
| [Control-plane operations](./references/operations-catalog.md) | The `elaichi__*` catalog by area, with the sequencing rules that matter |

## Companion skills

- **elaichi** — what the product is and the words it uses. Load this when the
  question is about Elaichi rather than about acting through it.
- **elaichi-toolboxes** — curating, freezing parameters, delegation, sharing.
- **elaichi-governance** — roles, permissions, restrictions, audit.
- **elaichi-api** — the HTTP control plane, for code rather than MCP calls.
