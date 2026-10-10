---
name: elaichi-connections
description: Connect and look after the accounts Elaichi runs tools against — connect Salesforce, Slack or any app, share versus own, connection status and reconnecting, transferring before someone leaves, what offboarding does to connections, custom connectors, your own OAuth app, and bringing your own remote MCP server.
whenToUse: Someone is connecting an app account, sharing one with a team, fixing a broken or blocked connection, transferring ownership, offboarding a member, setting up an OAuth app for a connector, adding a remote MCP server, or building a custom connector.
---

# Connections and connectors

A **connector** is an app Elaichi knows how to talk to. A **connection** is one
signed-in account for that app — "my Jira", "our shared HubSpot".

Credentials live in a vault and are only opened when a tool runs. No API
returns one, and no operation anywhere accepts one as input. That is why an
agent never asks a person for a password, API key or token.

## Connecting an account

**Connections → Add connection.** (A connector's page, and each row on the
Connectors page, also has a **Connect** button that starts the same flow.)

1. Search or filter by category, then pick the app.
2. Optionally use **Share with** to add people, teams or everyone. Leave it
   empty to keep the connection private.
3. Choose **Connect**. The app's sign-in opens — inside Elaichi, or in a new
   browser window for a plain OAuth sign-in. Allow pop-ups.
4. Sign in to the app and approve what it asks for.

When it finishes you see **Connection added** and the row goes **Active**.

**Every active connection gets its own automatic toolbox**, named after the
connection, and works through the MCP endpoint straight away. There is nothing
to publish first.

### When Connect is blocked

| What you see | Why | Fix |
|---|---|---|
| The app is listed with a shield icon | An admin's restriction blocks it for you | Click the icon to ask an admin for access. See **elaichi-governance** |
| "Ask an admin to add the OAuth app first" | The app needs the organization's own OAuth app, and none is set up | Someone with `connector:manage` adds it on the connector's page (below) |
| A custom connector with no Connect button | It is shared with you at `view` only | Ask its owner for `use` |

### Your own OAuth app ("BYOA")

Some catalog connectors have no OAuth app Elaichi can sign in with. Their
connector rows say `byoa: true`, and connecting answers
`409 oauth_app_required` until the organization adds its own.

On the connector's page, someone with `connector:manage` (Org Admin and Org
Owner by default) enters the client id and secret. The secret is write-only —
nobody can read it back, and leaving it blank on a later save keeps the stored
one. Removing the app falls back to Elaichi's default. A custom connector has
no such setting: its owner puts OAuth details in the connector itself with
**Edit**.

## Owner and access are two different things

**The owner** is whoever connected the account. Ownership is **always one
person** — never a team, never the organization.

**Access** is a list of grants. A new connection starts with none, so it is
**private to its owner** until someone shares it.

| Level | What the grantee can do |
|---|---|
| **View** | See it exists and how it is set up. Cannot run it. |
| **Use** | Also run its tools and pin it into their own toolboxes. |
| **Edit** | Also rename it, reconnect it, change its setup values, and share it (with `connection:share`). |

Deleting and transferring stay with the owner, whatever grant anyone holds.

**Private really means private.** No org-wide permission reaches an unshared
connection — not `connection:manage`, not Org Owner. An admin who was not
granted it gets "not found". That is deliberate.

| Permission | Allows |
|---|---|
| `connection:create` | Connect an account for yourself |
| `connection:share` | Share a connection, or connect one already shared |

The built-in **Member** role holds both. Sharing is not an admin-only act.
Everything else — renaming, reconnecting, deleting — is decided by ownership
and grants, not by a permission.

## Connection status

| Status | What happened | Tools? | What to do |
|---|---|---|---|
| `active` | Working | Yes | Nothing |
| `pending` | Sign-in was started but never finished | No | Only the **owner** can finish it — **Reconnect** gives them a fresh link |
| `needs_reauth` | The app expired or revoked access | No | **Reconnect account** |
| `disconnected` | The account behind it is gone | No | Reconnect, or delete it |
| `post_install_error` | Signed in, but the connector's setup step failed | No | Read the error, fix the cause, then **Finish setup** |

**Only `active` contributes tools.** Anything else disappears from tool lists
rather than appearing and failing. That is why "my tool is missing" so often
turns out to be this. Token refresh is automatic for working connections.

Two more states sit beside `status`:

- **Blocked** (`connector_not_shared: true`). The custom connector it was made
  through is no longer shared with the connection's owner. Calls are refused
  and reconnecting cannot help. The connector's owner has to share it again
  (at `use`).
- **App unavailable** (`available: false`). Elaichi removed the connector from
  the catalog. The connection is kept and works again if the connector
  returns.

**Reconnect** re-runs the sign-in and rebinds the **same** connection. The id,
owner, grants and every toolbox pointing at it are kept. Show the button when
the row says `can_reconnect`, not by reading `status` yourself.

One trap when diagnosing: a catalog connection's tool list filters by
**restriction**, not status, so a `pending` one still answers with the
connector's full tool list. Read `status` from the connection itself.

## Transferring a connection

**Transfer hands a connection to a colleague without signing in again.** It
changes the owner and **nothing else** — every grant survives and no
credential is re-entered.

**Manage access → Transfer ownership… → pick a member.** Only the owner can
do it, and the new owner must be an active member.

Three things to know:

- **The tools still run as the original account.** The vault still holds the
  person who signed in (`connected_by_user_id` never changes). If calls should
  run as the new owner's own account, they connect a new one.
- **Every toolbox entry the old owner pinned stops working**, for everyone,
  unless the old owner keeps access. **Keep my access** (on by default in the
  app) gives them an ordinary `use` grant in the same step, which keeps those
  entries working. The preview shows how many toolboxes would break first.
- Sharing is separate. A transfer never widens access.

## When someone leaves

**Removing a member deletes every connection they own** — private and shared
alike. A connection is one person's own login, and it never becomes a
colleague's because its owner left. Offboarding cannot transfer connections.

So the rule is: **transfer anything that should outlive one person, early,
while they are still here.** A shared team account owned by someone who later
leaves is the most expensive thing to untangle.

What offboarding *can* do is keep tools working. For each connection being
deleted, the admin may pick a **replacement**: another active connection to the
same app that the admin can use. Toolbox entries, automation steps and other
people's synthetic tools are moved onto it before the old one is deleted.
Without a replacement, everything that used the connection stops.

Removal also needs a decision for every **shared** toolbox, template and other
shared item they own (hand it to a person or a team, or delete it), and a new
owner for every custom connector they own. Private items default to delete.
Their synthetic tools are deleted.

The whole flow lives in **Settings → People → remove member**. An agent should
run the offboarding preview (`elaichi__member__offboarding`) and hand off to
the app — the MCP `member.delete` refuses while the member owns anything,
because it cannot pick replacements.

Full decision table: [Connection lifecycle](./references/lifecycle.md#offboarding-decision-table).

## Deleting

Owner only, permanent, and it **breaks every toolbox entry using the
connection**. The vault account goes with it. Prefer transfer whenever a
shared toolbox still needs the account.

## Custom connectors

An organization can go beyond the catalog. All of this needs
`connector:create` (Org Admin and Org Owner by default) and the custom
connectors plan feature. **Connectors → New connector** offers:

- **Build from config** — JSON config: base URL, sign-in, resources and
  methods. Validation names the exact path that failed.
- **Add remote MCP server** — see below.
- **Fork** a catalog connector from its page, including its documentation.

A connector's **documented methods are exactly its tools.** A method with a
description is a tool; one without is not.

The person who creates it is its **owner**. It is private until shared:

| Level | Lets them |
|---|---|
| `view` | See it |
| `use` | Also connect their own accounts through it |
| `edit` | Also change it and share it (with `connector:share`) |

**Share at `use` so people can connect.** Delete and transfer are the owner's.
Delete is refused while any connection still uses it.

**Pull from upstream.** A fork remembers where it came from, so later you can
review what changed upstream — new tools, safe updates, conflicts, removals —
and apply only what you pick. A fork made before lineage existed can be linked
to its upstream first.

`connector:create` is marked high-trust. Restrictions bind a connector's slug
and its declared lineage, not the host it calls — so a new connector aimed at
a blocked API is not caught by them.

### Remote MCP servers (bring your own)

A team can add an MCP server that speaks Streamable HTTP as its own connector.
**Connectors → New connector → Add remote MCP server**, then the server URL and
a name. Elaichi detects an OAuth sign-in from the server itself. **Advanced
settings** covers the rest: your own OAuth client, or an API token or custom
sign-in form. A server that needs no sign-in at all must be marked that way on
purpose — detection never picks it.

- The URL is fixed once created. To point somewhere else, create a new
  connector.
- Members connect with **their own** sign-in, and each connection lists the
  tools **its own** credentials can see. Tools appear when someone connects.
- A new tool is usable at once. Its tier (read, write or destructive) is the
  server's own label, and a tool the server did not label is treated as
  destructive. A manager (`edit` on the connector) can turn any tool off for
  every connection on the connector's Tools tab.
- Restrictions, approvals and the audit log apply exactly as for any
  connector. Remote MCP connectors cannot be forked.
- An organization can hold up to 25.

Elaichi also publishes some vendors' own remote MCP servers in the catalog for
every organization. Those connect like any catalog connector.

## References

| Document | Topics |
|---|---|
| [Connection lifecycle](./references/lifecycle.md) | Status in depth, reconnect and repair actions, transfer mechanics, offboarding decisions, and connecting from an agent |

## Companion skills

- **elaichi-toolboxes** — turning a connection's tools into something an agent
  picks well from.
- **elaichi-governance** — restrictions, access requests, and who may connect
  what.
- **elaichi-mcp** — the `connection` argument and diagnosing a missing tool.
- **elaichi-api** — the REST routes behind all of this.
