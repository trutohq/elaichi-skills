# Scopes, consent, and refusals

## The endpoint is scoped to a person, not an organization

`https://api.elaichi.ai/mcp` is one address for everybody. What it exposes is
**one user's access in one organization** — the same boundary as the web app —
and both come from the OAuth grant rather than the URL. Two colleagues
pointing the same client at the same address do not see the same tools.

There is no publishing step. Every tool the user can already use is resolved
live — their personal `global:{userId}` toolbox plus every toolbox shared with
them at `use` or above — clamped by their restrictions on each request. Losing
a role takes effect immediately; so does revoking a share.

## The four scopes

An MCP client signs in through OAuth, and the user approves scopes on
Elaichi's own consent screen. Only `mcp:read` is granted by default.

| Scope | Consent screen says | What it allows |
|---|---|---|
| `mcp:read` | Read your organization's data | Everything the user can already see: people, teams, roles, connections, toolboxes, templates, restrictions, settings, and the audit log. **Never secret values.** Also files and withdraws the user's own access requests. |
| `mcp:write` | Create and change data | Create and change teams, roles, toolboxes, templates, synthetic tools, connections and org settings, and share them. Implies `mcp:read`. |
| `mcp:destructive` | Delete data and remove access | Delete toolboxes, templates, connections and the rest; take back shares; transfer a connection; **delete inside connected apps**. Implies `mcp:read`. Never a default, never implied by anything. |
| `mcp:tools` | Run your connected tools | Run the tools from the toolboxes chosen on that screen. Also files and withdraws the user's own access requests. |

Two rules people miss:

- **A connected tool that deletes needs `mcp:destructive` on top of
  `mcp:tools`.** Without it the tool is left out of `search_tools`, and a call
  by name gets a scope refusal. A synthetic tool is charged for its worst step.
- **`mcp:tools` alone holds neither `mcp:read` nor `mcp:write`.** It runs
  connected tools; it does not reach most `elaichi__*` operations.

For most work the useful pair is `mcp:read` + `mcp:tools`: enough to use the
connected apps without letting the model reshape the organization.

Some operations are refused whatever the scope — see
[Step-up](#step-up-only-in-the-elaichi-app) below and the never-exposed list
in [Control-plane operations](./operations-catalog.md#never-on-mcp-at-any-scope).

## Toolbox selection

When `mcp:tools` is requested, the consent screen also asks **which
toolboxes** this client may reach. The user picks either:

- **All my tools** — their `global:{userId}` toolbox (every connection they own
  or that is shared with them at `use`) **plus** every toolbox shared with
  them — directly, through a team, or with the whole organization — at `use` or
  above, including ones they get later; or
- **a specific set of toolboxes.**

With a specific set, `elaichi__toolbox__execute` must name one of them, and
every other toolbox — `global:usr_…` included — answers "not found". The
server `instructions` name the toolboxes this connection can reach, so read
them rather than assuming. If none of the chosen toolboxes exists any more,
the instructions say so: do not conclude the user has nothing connected.

The user changes that reach later from **Settings → Connected apps**, and an
edit or a full revocation takes effect on the client's **very next call**.
Settings → Connected apps cannot add a scope. For more scope, the user
connects Elaichi again from the AI client and allows it on the consent screen.

## Scopes are the approval

Inside the Elaichi app, the agent can pause a write for the person to approve.
Over MCP there is nothing to ask through — the call was composed by *your*
model, in a conversation Elaichi cannot see, and that model could simply claim
its own approval.

So the approval moves forward to the consent screen, and **the scopes granted
are the standing approval.** Within scope, an operation runs without a further
prompt from Elaichi.

That is a reason to be more careful, not less. Confirm writes with the user
yourself.

## What this endpoint does not protect against

**The prompt-injection write gate does not apply here, and cannot.** Inside
the app, Elaichi can compare a proposed write against the person's own trusted
prompt, which stops a poisoned tool result from talking a model into a change.
An MCP server never sees a user prompt. Over MCP, defending against prompt
injection is the client's job.

What still holds, because none of it depends on seeing the conversation:

- RBAC checked per operation, read fresh on every request
- scope limits
- output redaction
- the `forbidden` classification (credential rotation, identity and security
  changes) — not exposed under **any** scope
- step-up: governance changes that need the person to confirm it is them
- full audit logging of every call, successful or failed

Treat an OAuth grant the way you would treat an API token issued to that
user.

## Reading a refusal

`tools/list` is filtered by the caller's role **and** by the grant's scopes. A
name you expected and cannot see is far more likely a permission gap than a
typo.

A refused call comes back as a tool result with `isError: true`. Its first
text block is the whole answer, written for the person: **display the message
unchanged.** It already names what was missing in their words.

There are five kinds. Each has one right move.

| Kind | How you know | The right move |
|---|---|---|
| Permission | Names a permission, e.g. `team:manage` | Relay it and stop. |
| Scope | Names a scope, e.g. `mcp:destructive` | Tell the user to connect Elaichi again from their AI client and allow it. Never an access request. |
| Restriction | `structuredContent.error` holds the restriction | Offer `elaichi__access_request__create` with its `request_access.arguments`. |
| Step-up | Says the app must confirm it is them, and names a screen | Send them to that screen. More scope will not help. |
| Two-factor | Says the org requires two-factor | They set up two-factor, then connect the app again. |

Two rules cover all five:

1. **You cannot grant any of them.** Relay the exact name and stop.
2. **Do not look for another route to the same effect.** That is the failure
   the whole layer exists to prevent.

Some lookups hide existence on purpose: a resource the user may not see
answers "not found", not "forbidden". A not-found on something the user
insists exists is worth reading as "not yours" rather than "gone".

### Restrictions

A restriction is governance: an admin blocked a connector or one tool for a
role or for one person. The refusal (and the matching `search_tools` row)
carries:

```jsonc
{
  "code": "tool_restricted",              // or "connector_restricted"
  "restricted_by": "role",                // or "user"
  "restricted_scope": "tool",             // or "connector"
  "can_request_access": true,
  "pending_request_id": null,
  "request_access": {
    "operation": "access_request.create",
    "arguments": { /* copy these exactly */ }
  },
  "message": "…one plain sentence for the person…"
}
```

- Retrying, or the same call with other arguments, will not get through.
- If the user wants access, call `elaichi__access_request__create` with
  `request_access.arguments` **exactly as given**. It files a request; an admin
  approves or denies it in the Elaichi app. Tell the user it was sent and that
  an admin has to decide.
- If `pending_request_id` is set, the user already asked. Say so; do not file
  again. `elaichi__access_request__list` with `mine: true` shows it.
- A tool whose whole connector is blocked cannot be requested alone. File the
  connector request the refusal names.
- At most 25 of the user's requests can wait at once. Past that,
  `elaichi__access_request__withdraw` one they no longer need.

For a **permission** gap, `access_request.create` takes `reason: "permission"`
and the exact permission the refusal named — but only on a connection with
`mcp:write`. A read-only or tools-only connection may file `"restriction"`
requests alone. Never use `reason: "scope"`.

### Step-up: "Only in the Elaichi app"

Inviting or revoking an invitation, changing someone's role, removing a
member, deleting a role, and deleting a team need the person to confirm it is
really them. No AI surface can ask for that, so these are refused on MCP
**whatever the scope**, and the server `instructions` list them under "Only in
the Elaichi app". The refusal names the screen — Settings → People, Settings →
Roles or Settings → Teams.

The app may not ask them to confirm again if they confirmed another
governance change in the same browser session within the last 10 minutes.
That is expected, not a sign the refusal was wrong.

## Annotations

All four annotations — `readOnlyHint`, `destructiveHint`, `idempotentHint`,
`openWorldHint` — are present on every tool, always. An omitted hint would
publish the spec's default, and `destructiveHint` defaults to **true**, so
silence would mark every plain write as destructive.

So a plain write is `readOnlyHint: false` **and** `destructiveHint: false`,
stated rather than implied. `execute_tool` and `run_code` are marked
destructive and open-world, because their real tier depends on what they run.

Annotations are hints a client may ignore. The scope check on the server is
the enforcement.

## Rate limits

`POST /mcp` allows **120 requests per 60 seconds** per OAuth access token.
Each tool call inside a `run_code` program counts against the same budget.
Over the limit you get `429` with code `rate_limited` and a `Retry-After`
header in seconds. Honor it; do not retry tighter.

This is another reason to search once with good words rather than five times
with bad ones.

## Everything is audited

Every `tools/call` writes an audit row — tool, connection, status, duration —
successful or refused. Rows carry `actor_kind`, so an action taken by an AI is
a recorded field rather than something a human has to infer later.

Say so when a user asks whether their admin can see what you did. The answer
is yes, and that is the design.
