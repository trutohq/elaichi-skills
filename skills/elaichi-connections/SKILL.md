---
name: elaichi-connections
description: Connect and look after the accounts Elaichi runs tools against — the connect flow, sharing versus ownership, connection status and reconnecting, transferring before someone leaves, and authoring or forking a custom connector.
whenToUse: Someone is connecting a product account, sharing one with a team, reconnecting a broken connection, transferring ownership, offboarding a member, or building a custom connector.
---

# Connections and connectors

A **connector** is a product Elaichi knows how to talk to. A **connection** is
one authorized account for that product — "my Jira", "our shared HubSpot".

Credentials live in a vault and are only decrypted when a tool runs. Nothing in
Elaichi's own database holds them, no API returns one, and no operation
anywhere accepts one as input.

## Connecting an account

**Connections → Add connection.**

1. Search or filter by category, then pick the product.
2. Optionally use **Share with** to add a member, a team, or everyone, each
   with a level. Leave it empty to keep it private.
3. Choose **Connect**. The product's own authorization flow opens in an in-app
   window; OAuth products open a consent popup inside it.
4. Sign in with the product and approve what it asks for.

When it finishes you see **Connection added** and the row goes **Active**.

Browsing first is often worth it: **Connectors → the product → Tools** shows
what it exposes before you authorize anything. But connecting always starts
from **Connections → Add connection**.

**Every active connection immediately gets its own toolbox**, under Toolboxes,
named after the connection. It works through the MCP endpoint straight away —
there is nothing to publish and no shared toolbox to build first.

## Owner and access are two different things

**The owner** is whoever connected the account. There is no ownership choice at
connect time, and ownership is **always one person** — never a team, never the
organization.

**Access** is a list of grants, and a new connection starts with none. It is
**private to its owner** until someone shares it.

| Level | What the grantee can do |
|---|---|
| **View** | See it and its configuration. Cannot run it. |
| **Use** | See it and run it. |
| **Edit** | Change its settings and who it is shared with. |

Grantees are a member, a team, or everyone at the organization. Add them in the
**Share with** step, or later from **Manage access**.

**Private really means private.** No organization-wide permission reaches an
unshared connection — not `connection:view`, not `connection:manage`, not Org
Owner. That is a deliberate boundary, and it is the reason offboarding
sometimes cannot be finished by an admin alone.

Permissions to create and share:

| Permission | Allows |
|---|---|
| `connection:create` | Connect an account for your own use |
| `connection:share` | Share one with a team or with everyone |
| `connection:manage` | Reconnect, edit or delete a connection you own or hold `edit` on |

The built-in **Member** role holds all three of these: a Member can connect an
account **and** share it with a team or the whole organization. Sharing is not
an admin-only act.

Administrators can also restrict connectors per role or per person, and a
restricted connector is blocked **at connect time** — see
**elaichi-governance**.

## Connection status

| Status | What happened | Tools? | What to do |
|---|---|---|---|
| `active` | Working | Yes | Nothing |
| `pending` | The authorization window was opened but never finished | **No** | Give the owner the connect link again. Only the owner can finish a pending connection |
| `needs_reauth` | The product expired or revoked the access | **No** | **Reconnect** — it returns a fresh link |
| `disconnected` | The underlying account is gone | **No** | Reconnect, or delete it |
| `post_install_error` | The credential works, but a connector setup step failed | **No** | Read the recorded error and clear it. Only `active` contributes tools, so the connection advertises nothing until it gets back there |

**Only `active` contributes tools.** Anything else — including
`post_install_error`, where the credential itself is live — disappears from
tool lists rather than appearing and failing, which is why "my tool is
missing" so often turns out to be this.

Token refresh for working connections is automatic. You only reconnect when
the status asks.

**Reconnect** is on the row — inline when the status needs it, otherwise in the
⋮ menu. It re-runs the authorization and rebinds the **same** connection
record, preserving ownership, grants, and every toolbox pointing at it.

One trap when diagnosing: a connection's tool list filters by **restriction,
not by status**, so a `pending` connection still answers with the connector's
full catalog. Status comes from the connection itself and nowhere else.

## Transferring a connection

**Transfer hands a connection to a colleague without signing in again.** It
changes who owns it and **nothing else** — every existing grant survives
untouched, and credentials are never re-entered.

**Manage access → the transfer icon next to Owner → pick a member → Transfer.**
Any other active member of the organization can be the target. There is no
"organization" or "team" option, because ownership is always one person.

Sharing is a separate, deliberate act. A transfer never widens access on your
behalf.

Two things to know:

- The outgoing owner keeps nothing unless a grant already covered them. They
  can opt to retain a `use` grant in the same operation — an ordinary, visible,
  revocable one.
- **Every toolbox entry the outgoing owner pinned to that connection stops
  resolving**, for everyone, because its delegator no longer has the access it
  rode on. Re-pinning fixes it. The transfer response tells you how many
  entries are affected, and a preview is available beforehand.

**Transfer personal connections that should outlive one person, early.** A
shared team account owned by someone who later leaves is the single most
expensive thing to unpick here.

## Offboarding someone

Removing a member runs a preflight over their whole estate — connections,
synthetic tools, toolboxes and templates — and each blocking row must be
resolved before the removal goes through.

Two things block it, both for the same reason — delete and transfer are
owner-only, so a row left pointing at a departed member can never be moved or
removed again:

- **A private connection** that a toolbox visible beyond the member still
  references. This is the hard case: nobody but the owner can transfer or
  delete a private connection, and the owner is the person leaving.
- **Any shared toolbox or template.** "Leave it" is not a neutral outcome
  there.

The preflight also reports, as a **non-blocking warning**, toolbox entries
where the departing member is the recorded **delegator**. Those pins rode on
their access and go unmet once they leave. Mention them — nobody else will
notice until an agent quietly stops working.

Full decision table, including the default for every kind of row and how to
hand everything to one successor at once:
[Connection lifecycle](./references/lifecycle.md#offboarding-decision-table).

The whole flow lives in **Settings → People → remove member**. An agent driving
this over MCP should run the offboarding preview first, every time, and hand
off to the app the moment anything is marked as needing resolution.

## Deleting

Permanent, and it **immediately breaks every toolbox using the connection**.
The vault account goes with it.

Prefer transfer whenever a shared toolbox still needs the account. Delete only
what is genuinely unused or replaced.

## Custom connectors

An organization can go beyond the catalog. Both paths need `connector:create`.

**Author from scratch** — Connectors → **New connector**. JSON config: base
URL, auth format, credentials, resources and methods. Validation returns
path-qualified errors rather than a single "invalid".

**Fork a catalog connector**, including its documentation, and change what you
need.

A connector's **documented methods are exactly its tools.** A method with a
description is a tool; a method without one is not. The documentation editor
is therefore not an afterthought — it is where tools come from.

Custom connectors are private to the organization, work everywhere a catalog
one does, and are still subject to restrictions. They can be shared at `view`
or `edit`. Deletion is refused while connections still use them.

**Pull from upstream.** A fork records its lineage, so later you can review
what changed upstream: new tools, safe updates, config diffs, conflicts, and
removals. New tools and non-conflicting fixes are selected by default;
conflicts and destructive removals are not. Apply is selective. Forks made
before lineage existed can be linked to an upstream first.

Note for anyone setting policy: `connector:create` is the one permission
Elaichi marks high-trust. Restrictions bind a connector's slug and its declared
lineage, not the host it dials — so a new connector aimed at a blocked API is
not caught by them.

## References

| Document | Topics |
|---|---|
| [Connection lifecycle](./references/lifecycle.md) | Status in depth, reconnecting, refreshing, transfer mechanics, the delegation breakage a transfer causes, and the full offboarding decision table |

## Companion skills

- **elaichi-toolboxes** — turning a connection's tools into something an agent
  picks well from.
- **elaichi-governance** — restricting which connectors can be connected at all.
- **elaichi-mcp** — connecting an account from an agent, and the `connection`
  argument.
