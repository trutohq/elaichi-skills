# Connections and accounts

A **connection** is one authorized account for one product — "our shared
HubSpot", "my Jira". Credentials live in a vault and are only decrypted when a
tool runs. Nothing you call ever sees them.

## The `connection` argument

The account a tool runs against is **not part of the tool's name**. It is an
argument, so one tool covers every account the user has for that app instead
of multiplying into one tool per account — a user with four Notion workspaces
would otherwise pay four times the tool-list budget for one capability, and a
model picks worse from a longer list.

The argument appears on a tool only when **more than one** of the user's
accounts backs it.

### Up to 12 accounts: an enum

The tool's input schema carries a `connection` enum. Copy one value **exactly**:

```json
{ "name": "create_page", "arguments": { "connection": "Notion (Acme HQ)", "title": "…" } }
```

The label is the connection's **own name**. A parenthesised remote account is
appended only to break a tie within that tool — so two Notion connections both
named "Notion" become `Notion (Acme HQ)` and `Notion (Personal)`, while a
lone one stays plain `Notion`.

That means the same connection can carry a bare label on one tool and a
qualified one on another. **Read the label off the schema you were handed, do
not carry one over from a different tool**, and do not shorten, re-case, or
substitute the connection id.

### Past 12 accounts: no enum

Twelve is the cap on what one schema will advertise. Beyond it the description
asks for an exact account name, or a `conn_…` id.

### When you do not know which account

**Ask the user.** This argument exists to stop a model quietly choosing between
two real accounts, and a wrong choice here is a write into the wrong company's
workspace.

If the user gave a hint but not a label — "the work one", a client name — send
their words as the value. The call fails with the accounts matching those
words, and you retry with the right label. That round trip is designed in.

Calling with no `connection` at all returns an error naming the real accounts,
capped at 12 with a note if more exist. Read it and retry. It is the answer,
not a failure.

## Finding accounts

| Source | Shape | Includes |
|---|---|---|
| `elaichi://connections` | MCP resource | Every **reachable** account, with the exact labels the `connection` argument accepts, its connector, and its status. Omits pending accounts. |
| `elaichi://connection/{id}` | MCP resource | One account and the tools it backs here. |
| `elaichi__connection__list` | Operation | **Complete** — including `pending` and `needs_reauth`. |

Read a resource with `resources/read`. Many MCP clients do not expose resources
at all — if yours does not, `elaichi__connection__list` answers the same
question and more completely.

Reach for the resource when you want the enum labels in front of you before
searching, and for the operation when you are diagnosing, because that is the
one that shows the broken accounts.

## Status values

| Status | What happened | Tools? | What to do |
|---|---|---|---|
| `active` | Working | Yes | Nothing |
| `pending` | The authorization window was opened but never finished | **No** | Give the owner the connect link again. Only the owner can finish a pending connection |
| `needs_reauth` | The product expired or revoked the access | **No** | **Reconnect** — it returns a fresh link |
| `disconnected` | The underlying account is gone | **No** | Reconnect, or delete it |
| `post_install_error` | The credential works, but a connector setup step failed | **No** | Read the recorded error and clear it. Only `active` contributes tools, so the connection advertises nothing until it gets back there |

A `pending` or `needs_reauth` connection contributes **zero** tools. It is
absent from the list entirely, not present-and-failing — which is why a
missing tool so often turns out to be a connection problem.

One trap: `elaichi__connection__list_tools` filters by **restriction, not by
status**, so a connection still `pending` answers with the connector's full
catalog. Status comes from `elaichi__connection__get` and nowhere else.

## Connecting a new account

```
elaichi__connector__list          find the slug — never guess one
elaichi__connector__get           confirm what the connector needs
elaichi__connection__create       returns connect_url
   → hand the URL to the user as a link
elaichi__connection__get          poll until status is "active"
elaichi__connection__list_tools   confirm the tools landed
```

`connect_url` is a one-time sign-in session, not a credential. It carries no
token, so it is safe to return and must not be redacted.

**Never ask for, accept, or repeat a password, API key or token.** No Elaichi
operation accepts one. The human authenticates; you do the bookkeeping.

## Ownership and reach

Every connection has exactly one **owner** — a person, never a team. Everything
else is an explicit grant on top.

| Grant | Who reaches it |
|---|---|
| *no grants* | The owner alone. This is **private**, and private means private. |
| `(user, alice, use)` | Alice as well |
| `(team, T, use)` | Everyone in team T |
| `(org, '', use)` | Everyone in the organization |

Levels run `view < use < edit`, with owner implicitly above all three:

- **view** — see that it exists and read its metadata
- **use** — run tools through it
- **edit** — change its settings, and change its grants
- **owner** — delete it, or transfer it

No organization-wide permission reaches a private connection. That is why an
offboarding flow can neither transfer nor delete a departing member's private
connection: only its owner ever could, and the owner is the person leaving.

Sharing a **toolbox** at `use` is a different and more common mechanism:
it delegates *execution* over whichever connections that toolbox's entries pin,
without granting the recipient anything on the connections themselves. They run
the tools; they never see the account, cannot reuse it anywhere else, and lose
it the moment the share is revoked. See the **elaichi-toolboxes** skill.
