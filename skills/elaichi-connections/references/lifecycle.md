# Connection lifecycle

## Status in depth

| Status | What happened | Tools? | What to do |
|---|---|---|---|
| `active` | Working | Yes | Nothing |
| `pending` | Sign-in was started but never finished (often a closed tab) | No | Only the **owner** can finish it. **Reconnect** gives them a fresh link |
| `needs_reauth` | The app expired or revoked access, or rejected a refresh | No | **Reconnect account** |
| `disconnected` | The account behind it is gone | No | Reconnect, or delete it |
| `post_install_error` | Signed in, but the connector's setup step failed. `last_error` says why | No | Fix the cause, then **Finish setup** |

**Only `active` contributes tools.** Every other status leaves the connection
advertising nothing — including `post_install_error`, where the credential
itself is fine.

### Why "only active contributes tools" matters

A broken connection does not show up with failing tools. Its tools are
**absent** from every list. So:

- A toolbox whose entries all pin one broken connection **advertises nothing**
  and looks empty rather than broken.
- An agent asked for a tool from that app reports that the tool does not
  exist.
- The only place the truth shows is the connection's own status.

Check status first, every time, before reasoning about restrictions or
scopes.

### Two flags that are not statuses

| Flag | Meaning | Fix |
|---|---|---|
| `connector_not_shared: true` | The custom connector it was made through is no longer shared with the connection's **owner**. Calls are refused with code `connector_not_shared`, and its toolbox entries go unmet. It is a fact about the owner, so every grantee sees it too | The connector's owner shares it again at `use`. Reconnecting cannot help |
| `available: false` | Elaichi removed the connector from the catalog. Tool listing answers `409 connector_unavailable` | Nothing to do here. The connection is kept and works again if the connector returns |

A third one, `restricted_by` (`role` or `user`), means an admin's restriction
blocks the **whole** connector for this caller. A restriction on only some
tools leaves it `null`; the connection's tool list flags those tools one by
one.

### One trap

For a catalog connector, a connection's tool list filters by
**restriction**, not by status. A `pending` connection still answers with its
connector's full tool list. A tool list is never evidence that a connection is
live. (A remote MCP connection is different: it lists only what its own
credentials found, so a connection that never signed in lists nothing.)

## Repairing a connection

Each action has a field on the connection that says whether it will work.
Show the control on the field, never on `status` alone.

| Action | In the app | Read this field | What it does |
|---|---|---|---|
| Reconnect | **Reconnect account** | `can_reconnect` | Re-runs the sign-in and rebinds the **same** connection. Id, owner, grants and toolbox entries are kept |
| Refresh credentials | **Advanced → Get a new access token** | `can_refresh_credentials` | Asks the app for a fresh token, in place. Only for OAuth-style credentials on an `active` connection. An API-key account answers `409 not_refreshable` — reconnect instead |
| Finish setup | **Finish setup** | `can_run_post_install` (detail only) | Re-runs the connector's setup steps. Answers `202` at once; the result shows on a later read |
| Refresh tools | **Refresh tools** | `can_refresh_tools` (remote MCP only) | Lists the server's tools again with this connection's credential. At most once a minute |

Who may act: the owner, or anyone with an **edit** grant. One exception:
only the owner can finish a `pending` connection, because whoever completes
that first sign-in binds *their own* account to it.

Routine token refresh is automatic. Reconnect only when the status asks.

## Transfer

Transfer rewrites one field: the owner. Only the **owner** can do it, and a
non-owner never becomes owner by their own action, whatever grant they hold.
The new owner must be an **active** member.

| | Effect |
|---|---|
| Credentials | Untouched. No new sign-in. |
| Whose account the tools act as | **Still the person who signed in.** `connected_by_user_id` never changes. |
| Existing grants | All survive exactly as they were. |
| The old owner | Holds nothing afterwards, unless a grant already covered them or they keep access. |
| Toolbox entries the old owner pinned | **Stop resolving**, for everyone including the new owner — unless the old owner keeps access. |

The last row surprises people. An entry runs on the standing of whoever pinned
it. Take the connection away from that person and the entry goes unmet until
someone with `use` on the connection and `edit` on the toolbox re-pins it.

Two safeguards:

- **Keep my access** (`retain_access`). The old owner gets an ordinary,
  visible, revocable `use` grant in the same step, which keeps their pins
  working. The app ticks it by default. Only the real owner may choose it.
- **Preview first.** The transfer preview gives `affected_toolbox_count`,
  `broken_delegation_count`, `keeps_access_without_retaining` (true when
  another grant already covers the old owner), and up to five toolboxes by
  name. Read the counts, not the length of the preview list.

## Offboarding decision table

Removing a member runs a preview over everything they own. Connections are
handled differently from everything else.

| What they own | What happens | The admin decides |
|---|---|---|
| **Any connection**, private or shared | **Always deleted**, with its vault account | Optionally a **replacement** for each — another active connection to the same app that the admin can use. References move onto it first |
| **Shared** toolbox, template, automation, collection, dashboard, knowledge base or app | **Blocks removal** until decided | Hand it to a person or a team, or delete it |
| Private toolbox, template or other private item | Deleted if nothing is said | Optionally hand it over |
| Custom connector | **Blocks removal** until it has a new owner | Transfer only, to a person or a team |
| Synthetic tool | Deleted — the only option | If another member's toolbox uses it, acknowledge the deletion |

What a replacement rewrites, before the old connection is deleted: toolbox
entries in **any** toolbox, automation steps, and steps in other members'
synthetic tools. The rewritten toolbox entries are re-pinned under the admin
who chose the replacement. A connection with no replacement is deleted all the
same, and everything that used it goes unmet.

A replacement must be: the same app, `active`, not owned by the leaving
member, and usable by the admin. The preview lists up to ten candidates per
connection (`replacement_candidates`, with an exact
`replacement_candidate_count`).

Handing to a team makes the team's first active admin the owner and shares the
item with the team at `edit`.

Shortcuts so a big estate does not need one entry per row:

- `defaults` — one person or team inherits everything owned that has no other
  decision. Transfer only; connections never follow it.
- `kind_defaults` — one choice per kind (`toolbox`, `template`, `automation`,
  …), including delete.
- `replacement_defaults` — one replacement per app, for every connection of
  that app without its own entry.

The whole batch is checked before anything is written. One call applies at
most 200 actions. A bigger estate answers `202` with
`status: "more_to_resolve"`: the work so far is kept, the member stays, and you
re-read the preview and call again.

### The warning to pass on

The preview also lists **delegated entries** — entries on *other people's*
toolboxes that ride on this member's `use` grant. They go unmet the moment the
member leaves.

They never block removal, because the fix is re-pinning, not a credential
decision. But nobody notices on their own: the entries just stop appearing,
and the agent using them quietly stops offering that tool. Always name them.

The preview also counts the API tokens and AI-client logins that removal will
revoke.

## From an agent

**Connecting an account.** `elaichi__connector__list` for the slug, then
`elaichi__connection__create`, then hand the returned `connect_url` to the
person as a link to open. Poll `elaichi__connection__get` until the status is
`active`. The link is a one-time sign-in session, not a credential — it is
safe to show. Never ask for, accept or repeat a password, API key or token.

**A tool is missing.** Check the connection's status before anything else. If
it is not `active`, `elaichi__connection__reconnect` returns a fresh link. If
the connection is blocked (`connector_not_shared`), say who has to act — the
connector's owner — instead of offering a reconnect.

**"Share it with Priya."** Use `elaichi__connection__share`, never
`elaichi__connection__transfer`. Transfer moves ownership away from the
person, and the connection leaves their own list.

**Offboarding.** Run `elaichi__member__offboarding` first, every time. Report
which connections will be deleted, what uses each one, and the replacement
candidates. Name the delegated entries. Then send the person to
**Settings → People** to finish — the MCP `member.delete` refuses while the
member owns anything, because it cannot choose replacements or hand-overs.
