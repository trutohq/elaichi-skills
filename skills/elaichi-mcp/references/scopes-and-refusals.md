# Scopes, consent, and refusals

## The endpoint is scoped to a person, not an organization

`https://api.elaichi.ai/mcp` is one address for everybody. What it exposes is
**one user's access in one organization** — the same boundary as the web app —
and both come from the OAuth grant rather than the URL. Two colleagues
pointing the same client at the same address do not see the same tools.

There is no publishing step. Every tool the user can already use is resolved
live through their personal `global:{userId}` toolbox, clamped by their
effective restrictions on each request. Losing a role takes effect
immediately; so does revoking a share.

## The four scopes

An MCP client signs in through OAuth and the user approves scopes on Elaichi's
own consent screen. Only `mcp:read` is granted by default.

| Scope | What it allows | Implied by |
|---|---|---|
| `mcp:read` | Everything the user can already see: people, teams, tools, connections, settings, and admin records including the audit log. **Never secret values.** | Granting `mcp:write` or `mcp:destructive` adds it |
| `mcp:write` | Create and change teams, roles, toolboxes, connections and organization settings, and share them with other people | — |
| `mcp:destructive` | Permanently delete teams, roles, toolboxes and connections, remove people, revoke access. Reaches inside connected apps. | Never. Not a default, not implied by anything. |
| `mcp:tools` | Run tools from the toolboxes chosen on that consent screen | — |

For most work the useful pair is `mcp:read` + `mcp:tools`: enough to use the
connected apps without letting the model reshape the organization.

`mcp:read` covers more than it sounds like — SSO connections, directory group
mappings, org domains, pending invitations, API token metadata. It is still
strictly "what this user could already see in the app".

## Toolbox selection

When `mcp:tools` is requested, the consent screen also asks **which toolboxes**
this client may reach. The user picks either:

- **All my tools** — resolved through their `global:{userId}` toolbox, meaning
  every tool of every connection they can use; or
- **a specific set of toolboxes.**

With a specific set, `elaichi__toolbox__execute` must name one of them. Every
other toolbox — including `global:usr_…` — answers "not found". The
`initialize` response's `instructions` string names the toolboxes this
connection can reach, so read it rather than assuming.

The user edits that reach later from **Settings → Connected apps**, and both
an edit and a full revocation take effect on the client's **very next call**.

## Scopes are the approval

An agent running inside Elaichi can approve a write in the moment, because it
can see the person's own prompt. Over MCP there is nothing to ask through —
the tool call was composed by *your* model, in a conversation Elaichi cannot
see, and that model could simply claim its own approval.

So the approval moves forward to the consent screen, and **the scopes granted
are the standing approval.** Within scope, an operation runs without a further
server-side prompt.

That is a reason to be more careful, not less. Confirm writes with the user
yourself.

## What this endpoint does not protect against

**The prompt-injection write gate does not apply here, and cannot.** Inside
the app, Elaichi can compare a proposed write against the person's own trusted
prompt before allowing it, which is what stops a poisoned tool result from
talking a model into a mutation. An MCP server never sees a user prompt.

Over MCP, defending against prompt injection is the client's responsibility,
not Elaichi's.

What still holds, because none of it depends on seeing the conversation:

- RBAC checked per operation, read fresh on every request
- scope limits
- output redaction
- the `forbidden` classification (credential rotation, identity and security
  changes) — not exposed under **any** scope
- full audit logging of every call, successful or failed

Treat an OAuth grant the way you would treat an API token issued to that user.

## Reading a refusal

`tools/list` is filtered by the caller's role **and** by the grant's scopes.
A name you expected and cannot see is far more likely a permission gap than a
typo.

A refusal names what it wanted:

```json
{
  "error": {
    "code": "permission_required",
    "message": "You need the “Manage teams” permission (team:manage) to manage this team.",
    "details": { "required_permissions": ["team:manage"], "action": "manage this team" }
  }
}
```

Three rules:

1. **Relay the exact name** — the permission or the scope — and stop. You
   cannot grant either.
2. **Do not look for another route to the same effect.** That is the failure
   mode the whole layer exists to prevent.
3. **Display the message unchanged.** It is written for the person reading it
   and already names the permission in their own vocabulary.

Some endpoints deliberately conceal existence: a resource you may not see
returns `404 not_found` rather than `403`. A not-found on something the user
insists exists is worth reading as "not yours" rather than "gone".

## Annotations

All four annotations — `readOnlyHint`, `destructiveHint`, `idempotentHint`,
`openWorldHint` — are present on every tool, always. Leaving one out is not
neutral: an omitted hint publishes the spec's default, and `destructiveHint`
defaults to **true**, so silence would mark every plain write as destructive.

So a plain write is `readOnlyHint: false` **and** `destructiveHint: false`,
stated rather than implied.

Annotations are hints a client may ignore. The scope check on the server is
the enforcement.

## Rate limits

`POST /mcp` allows **120 requests per 60 seconds** per OAuth access token.
Over the limit you get `429` with code `rate_limited` and a `Retry-After`
header in seconds. Honor it; do not retry tighter.

This is another reason to search once with good words rather than five times
with bad ones.

## Everything is audited

Every `tools/call` writes an audit row — tool, connection, status, duration —
successful or refused. Rows carry `actor_kind`, so an action taken by an AI is
a recorded field rather than something a human has to infer later, along with
the conversation, the model, and the id of any third-party record created.

Say so when a user asks whether their admin can see what you did. The answer
is yes, and that is the design.
