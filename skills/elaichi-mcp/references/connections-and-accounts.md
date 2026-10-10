# Connections and accounts

A **connection** is one authorized account for one product — "our shared
HubSpot", "my Jira". Credentials live in a vault and are only decrypted when a
tool runs. Nothing you call ever sees them.

## The `connection` argument

The account a tool runs against is **not part of the tool's name**. It is an
argument, so one tool covers every account the user has for that app instead
of turning into one tool per account.

The argument appears on a tool only when **more than one** of the user's
accounts backs it. Then it is **required**.

### Up to 12 accounts: an enum

The tool's input schema carries a `connection` enum. Copy one value
**exactly**:

```json
{ "name": "create_page", "arguments": { "connection": "Notion (Acme HQ)", "title": "…" } }
```

The label is the connection's **own name**. Something in brackets is added
only to break a tie inside that one tool — first the remote account's own
identity (`Notion (Acme HQ)`), else a short slice of the connection id. A lone
connection keeps its plain name.

So the same connection can carry a bare label on one tool and a qualified one
on another. **Read the label off the schema you were handed.** Do not carry
one over from a different tool, and do not shorten it, re-case it, or swap in
the connection id.

The search result's `connections` block, keyed by each row's
`connections_key`, lists the same accounts with their ids, in enum order.

### Past 12 accounts: no enum

Twelve is the most one schema will advertise. Beyond it, the description asks
for an exact account name or a `conn_…` id.

### When you do not know which account

**Ask the user.** This argument exists to stop a model quietly choosing
between two real accounts. A wrong choice is a write into the wrong company's
workspace.

One exception: when the result says **an account picker will ask them**, do
not ask. A client that supports MCP Apps gets a picker card through
`show_card`. Call it, wait for the message that names the account, then retry
with `connection` set to it. Only if you cannot call `show_card`, ask the user
yourself.

If the user gave a hint but not a label — "the work one", a client name —
send their words as the value. The call fails with the accounts that match,
and you retry with the right label. That round trip is designed in.

Calling with no `connection` at all returns an error naming the real
accounts. Read it and retry. It is the answer, not a failure.

## Finding accounts

| Source | Shape | Includes |
|---|---|---|
| `elaichi__connection__list` | Operation | **Complete** — `pending` and `needs_reauth` included. |
| `elaichi__connection__get` | Operation | One account. The only true source of `status`. |
| `elaichi://connections` | MCP resource | Every account on this connection's surface, each with `labels` (every string some `connection` enum accepts), `reachable`, connector and status. Omits pending accounts. |
| `elaichi://connection/{id}` | MCP resource | One account and the tools it backs here. |

An account that backs no tool here (needs reauth, or restricted down to
nothing) shows `reachable: false` and empty `labels`.

Resources are something a person attaches from a menu; most clients never
feed them to the model on their own. If yours does not expose them,
`elaichi__connection__list` answers the same question, more completely.

## Status values

| Status | What happened | Tools? | What to do |
|---|---|---|---|
| `active` | Working | Yes | Nothing |
| `pending` | The connect window was opened but never finished | **No** | Give the owner the connect link again (`elaichi__connection__reconnect`). Only the owner can finish a pending connection. |
| `needs_reauth` | The product expired or revoked the access | **No** | **Reconnect** — it returns a fresh link. |
| `disconnected` | The account behind it is gone | **No** | Reconnect, or delete it. |
| `post_install_error` | The credential works, but a setup step failed | **No** | Read the recorded error and clear it in the Elaichi app. |

**Only `active` contributes tools.** Every other status leaves them absent
from the list entirely, not present-and-failing. That is why a missing tool so
often turns out to be a connection problem.

One more case looks the same: a connection whose **connector's owner stopped
sharing the connector** (a custom connector) contributes no tools either, even
when `active`. The row says `connector_not_shared`, `search_tools` reports it
under `blocked_connections`, and `elaichi__connection__reconnect` refuses it.
Signing in again cannot help; the connector's owner has to share it again.

`elaichi__connection__list_tools` filters by **restriction, not by status**.
A `pending` connection answers with the connector's full allowed set. It can
never prove a connection works. Status comes from `elaichi__connection__get`.

## Connecting a new account

```
elaichi__connector__list          find the slug — never guess one
elaichi__connector__get           read what blocks or needs saying first
elaichi__connection__create       returns connect_url
   → hand the URL to the user as a link
elaichi__connection__get          poll until status is "active"
elaichi__connection__list_tools   confirm the tools landed
```

Read `elaichi__connector__get` before you create anything:

| Field | Meaning |
|---|---|
| `restricted: true` | Governance blocked this connector for this user. Do not try. Offer an access request. |
| `can_use: false` | The connector was shared with them to view only. That is up to the connector's owner; an access request will not fix it. |
| `connect_blocked: { reason: "oauth_app_required", can_fix }` | The org has not added the OAuth app this connector needs. Do not call `connection.create`. An admin adds it on the connector's page in Elaichi; `can_fix` says whether this person can. |
| `connect_notes`, `connect_notes_link` | What to tell the person **before** they connect — a setting to turn on, a plan it bills, a region to pick. Say it in your own words. |

`connection.create` makes the connection **private** by default. Pass
`shares` only when the user asked for a shared account; that also needs
`connection:share`.

`connect_url` is a one-time sign-in session, not a credential. It carries no
token, so it is safe to show and must not be redacted. A client with MCP Apps
also gets a connect card.

**Never ask for, accept, or repeat a password, API key or token.** No Elaichi
operation accepts one. The human signs in; you do the bookkeeping.

## Ownership and reach

Every connection has exactly one **owner** — a person, never a team.
Everything else is an explicit grant on top.

| Grant | Who reaches it |
|---|---|
| *no grants* | The owner alone. This is **private**, and private means private. |
| `(user, alice, use)` | Alice as well |
| `(team, T, use)` | Everyone in team T |
| `(org, '', use)` | Everyone in the organization |

Levels run `view < use < edit`, with owner above all three:

- **view** — see that it exists and read its metadata
- **use** — run tools through it
- **edit** — change its settings, and change its grants
- **owner** — delete it, or transfer it

No organization-wide permission reaches a private connection. That is why
offboarding can neither transfer nor delete a departing member's private
connection: only its owner ever could, and the owner is the person leaving.

Sharing a **toolbox** at `use` is a different and more common mechanism. It
delegates *running* the tools over whichever connections that toolbox's
entries pin, without granting anything on the connections themselves. The
recipient runs the tools; they never see the account, cannot reuse it
anywhere else, and lose it the moment the share is revoked. See the
**elaichi-toolboxes** skill.

Those tools are part of **All my tools**, and `search_tools` finds them like
any other. The pinned connection, though, is **not** in
`elaichi__connection__list` or `elaichi://connections` for the recipient — it
was never shared with them. So "the connection is not in my list" does not
mean "I cannot run its tools". Check `elaichi__toolbox__list` for a toolbox
shared with them first.
