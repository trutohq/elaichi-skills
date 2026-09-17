# Connection lifecycle

## Status in depth

| Status | What happened | Tools? | What to do |
|---|---|---|---|
| `active` | Working | Yes | Nothing |
| `pending` | The authorization window was opened but never finished | **No** | Give the owner the connect link again. Only the owner can finish a pending connection |
| `needs_reauth` | The product expired or revoked the access | **No** | **Reconnect** — it returns a fresh link |
| `disconnected` | The underlying account is gone | **No** | Reconnect, or delete it |
| `post_install_error` | The credential works, but a connector setup step failed | **No** | Read the recorded error and clear it. Only `active` contributes tools, so the connection advertises nothing until it gets back there |

**Only `active` contributes tools.** Every other status — including
`post_install_error`, where the credential itself is fine — leaves the
connection advertising nothing.

### Why "only active contributes tools" matters

A broken connection does not appear with failing tools. Its tools are **absent
entirely** from every list. So:

- A toolbox whose entries all pin one broken connection **advertises nothing**
  and looks empty rather than broken.
- An agent asked for a tool from that product reports the tool does not exist.
- The only place the truth is visible is the connection's own status.

Check status first, every time, before reasoning about restrictions or scopes.

### One trap

Listing a connection's tools filters by **restriction**, not by status. A
`pending` connection happily answers with its connector's full catalog. A
tool list is therefore never evidence that a connection is live.

## Reconnecting

Reconnect re-runs the product's authorization and **rebinds the same
connection record**. Preserved: the id, the owner, every grant, and every
toolbox entry pointing at it. Once the status returns to active, everything
that used it works again.

You can reconnect a connection you own, or any shared connection you hold
`edit` on or can manage.

There is also a credential refresh for working connections, and a way to re-run
a connector's post-install step — both useful when a product has changed what
it grants, and neither requires a full sign-in.

Routine token refresh is automatic. Reconnecting is only for when the status
asks.

## Transfer

Transfer rewrites one field: the owner. It is available to the **owner only**,
and a non-owner never becomes owner by their own action, whatever grant they
hold.

What happens:

| | Effect |
|---|---|
| Credentials | Untouched. No re-authentication. |
| Existing grants | All survive exactly as they were. |
| The outgoing owner | Holds nothing afterwards unless a grant already covered them — reported honestly rather than silently retained. |
| Toolbox entries the outgoing owner pinned | **Stop resolving**, for everyone including the new owner. |

That last row is the one that surprises people. An entry's live authority is
the grant held by whoever pinned it. Transfer the connection away from that
person and the entry's authority is gone, so the entry goes unmet until
somebody with `use` on the connection and `edit` on the toolbox re-pins it.

Two mitigations:

- **Retain access on transfer.** The outgoing owner can be given an ordinary,
  visible, revocable `use` grant in the same operation, which keeps their pins
  working. Only the real owner may choose this — an offboarding flow never
  does it on their behalf.
- **Preview first.** A transfer preview reports how many toolboxes are
  affected, how many delegations would break, and whether the outgoing owner
  would keep access anyway without retaining it.

The target must be an **active** member of the organization.

## Offboarding decision table

Removing a member runs a preflight over everything they own. Each row either
blocks or does not, and each has a default.

| What they own | Blocks removal? | Default if you say nothing |
|---|---|---|
| **Private connection** referenced by a toolbox visible beyond them | **Yes** | — must be resolved |
| Private connection nothing else references | No | **Deleted** (the vault account goes with it) |
| **Shared** connection | No | **Left untouched**, with its grantees |
| **Shared** toolbox or template | **Yes** | — no default; a decision is required |
| Private toolbox or template | No | **Deleted** |
| Synthetic tool | No | **Deleted** — the only option |

Two rows block, and both for the same reason: **delete and transfer are
owner-only**, so a row left pointing at a departed member can never be moved or
removed again. "Leave it" is not a neutral outcome there.

The private-connection case is the hard one, and it is worth understanding
rather than working around: no organization permission reaches a private
connection, so an admin cannot transfer it or delete it either. The only paths
are the app's own offboarding flow, which collects a per-connection
transfer-or-delete decision and removes the member in one step, or asking the
departing person to share or transfer it before they go.

`defaults.transfer_to_user_id` hands everything transferable to one successor.
Per-resource decisions override it. The whole batch is validated before any of
it is applied, so a bad decision in the middle does not leave you half done.

An estate too large for one request answers "more to resolve": the work so far
is committed, and the member stays until nothing remains. Run it again.

### The non-blocking warning to pass on

The preflight also lists **delegated entries** — entries on *other people's*
toolboxes that ride on this member's `use` grant rather than on their
ownership. Those go unmet the moment the member leaves.

They never block the removal, because the fix is re-pinning rather than a
credential decision. But nobody will notice on their own: the entries stop
appearing, and the agent using them just stops offering that tool. Always
mention them by name.

## From an agent

Run the offboarding preview **before** any attempt to remove a member, every
time. If it marks any connection as needing resolution, stop and hand off to
the app — the delete will refuse while any remain, and transfer refuses too,
because those connections are private to the person being removed.

Report the affected toolboxes by name, mention the delegated entries, and point
at **Settings → People**.
