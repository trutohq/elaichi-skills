# Restrictions and access requests

A restriction is an allow list or block list over **connectors** and
**individual tools**. It is a separate axis from sharing: a grant decides
whether you can reach a resource, a restriction decides whether you may use
that *kind of thing* at all.

Where: **Governance → Restrictions**. Reading needs `restriction:view`. Writing
needs `restriction:manage`, and a rule aimed at one member also needs
`restriction:override`. Restrictions are on Gold and Black.

**No AI surface can change a restriction.** MCP clients and the Elaichi agent
can read them (`elaichi__restriction__list`, `__get`) with `restriction:view`,
and nothing else. Writes happen in the console.

## A rule

| Field | What it is |
|---|---|
| **Target** | A **role** (everyone who holds it) or one **member**. There is no organization-wide or team target. |
| **Mode** | `allow` (shown as **Allow list**) or `block` (**Block list**) |
| **Connectors** | Whole connectors, by slug. Up to 1,000. |
| **Tools** | Single tools, each a connector and tool pair. Up to 1,000. |

One rule can name connectors from any number of vendors. A rule cannot name the
same connector both whole and in its tool list.

## How rules combine

A member is governed by **two layers at once**: the rules on their **role**,
and the rules aimed at **them**. A connector or tool is reachable only when
**both** layers admit it.

- **No rule reaches a member → nothing is restricted for them.** Elaichi is open
  by default.
- **Within each layer**, all allow rules merge into one allow list, all block
  rules merge into one block list, and **a block always beats an allow**.
- **A member's own rule can only narrow what their role allows.** It never
  replaces or loosens a role rule. The way to loosen one rule for one person is
  an approved **access request** (below).

One exception survives from before rules were layered: a member flagged
**legacy override**. For them, their own rules replace their role's rules, and
access grants do not apply. The rule's summary says so. An admin clears the
flag, which can only narrow that member.

**Forks inherit blocks, not allows.** A block on a connector also blocks every
fork that declares it as its source, forks of forks included. An allow admits
only the connector it names: a fork must be named itself.

**Renaming a tool does not slip it past a block.** When a rule is saved,
Elaichi stores each tool's underlying operation beside its name. A block matches
by name or by operation. An allow matches by operation only.

## The empty-set truth table

**An allow rule turns the allow list on just by existing, whatever it names.**

| Mode | Connectors | Tools | Effect |
|---|---|---|---|
| `allow` | `[]` | `[]` | **Blocks every connector and every tool.** Its summary reads "Allows nothing. Every connector and tool is blocked." |
| `allow` | `[]` | `[{X, Y}]` | Only tool Y on X is reachable. Everything else is blocked. |
| `allow` | `[X]` | `[]` | All of X. Everything else is blocked. |
| `block` | `[]` | `[]` | Restricts nothing |
| `block` | `[]` | `[{X, Y}]` | Y is blocked. The rest of X stays reachable. |
| `block` | `[X]` | `[]` | X and its forks are blocked |

What to carry away:

- **An empty allow rule is a total lockout**, not a placeholder. An allow rule
  you mean to fill in later locks the target out in the meantime.
- **Once a role has any allow rule, everything it does not name is blocked**,
  across all connectors. An approved-apps list for a role is a set of allow
  rules naming whole connectors. To hold a role to a few tools of one app
  without cutting it off from its other apps, also allow those other apps.
- **A block list only blocks what it names.** Blocking some write tools leaves
  every write tool you did not name reachable. To hold a role to an app's read
  tools, allow those read tools (plus the role's other apps), or block every
  tool that is not a read.

Changes reach every surface within about two minutes.

## Where it is enforced

Everywhere a member can reach a connector or tool, through the same check:

| Moment | What happens |
|---|---|
| **Listing** | Connector and tool lists in the console, the API and AI operations apply the caller's restrictions |
| **Connect** | Connecting or reconnecting a blocked connector is refused |
| **Save** | A toolbox entry or synthetic tool step naming a tool restricted for the person saving it is refused. An entry saved before the rule existed stays saved, but does not resolve or run. |
| **Advertise** | A restricted tool is never in an MCP client's `tools/list` or in a toolbox's runnable `tools` |
| **Execute** | Every call (MCP, `execute_tool`, `toolbox.execute`, the Elaichi agent, each synthetic tool step, automations) is checked for the person it acts as. The final outbound URL, and every redirect, is checked against tool-level blocks too. |

Restrictions are checked for **the person calling**, not for a toolbox's
delegator. A blocked tool stays blocked inside every toolbox entry, frozen or
renamed.

## What a restricted tool looks like

A restricted tool is never offered as callable, but it does not vanish without
a word:

| Surface | What you get |
|---|---|
| `search_tools` | The tool **by name**, flagged `restricted`, with no schema. A connector blocked whole is one row for the connector. |
| `elaichi__toolbox__get` | The entry stays in `entries` with `restricted: true`, `restricted_by` (`role` or `user`) and `restricted_scope` (`tool` or `connector`), and is absent from `tools` |
| `elaichi__toolbox__get_skill` | A `restricted_note` naming the restricted tools |
| `connection.list_tools`, `connector.list_tools` | Restricted tools are left out, and `restricted_count` says how many. A connector blocked whole is refused with the restriction message. |
| A connector or connection row | `restricted_by`: `role`, `user`, or `null`. Non-null means the **whole** connector is blocked. |
| A refused call | "This tool is restricted for your role by an organization policy" (or "for your account"), plus `request_access`: the exact arguments for `elaichi__access_request__create` |

**A refusal names no rule, no author and no reason.** That is a disclosure
boundary: the person refused has no right to the shape of the policy.

`restricted_by: null` on a connector rules out a whole-connector block and
nothing else. Single tools can still be restricted.

Never subtract counts to guess what is restricted: a connector's advertised
tool count is what the vendor offers, not what this person may run.

## Self-dealing refusals

Two writes are refused even with the right permissions, both checked on the
server at the moment of the write:

- **A rule aimed at a role whose permissions exactly match your own.** Copying
  your own role first does not get around it.
- **A rule aimed at yourself while someone else's rule restricts you.** Ask
  another admin with `restriction:manage`.

## Access requests

Any member can ask for something they were refused. **No permission is needed
to ask.** A request names a connector, one tool (ideally with its connector), or
a permission their role lacks, with reason `restriction` or `permission` and an
optional note of up to 2,000 characters.

From an AI client, call `elaichi__access_request__create` with the
`request_access` arguments from the refusal, **exactly as given**. Then tell the
person it was sent and that an admin has to approve it.

- Filing twice for the same thing returns the open request. It does not pile up.
- A tool on a connector that is blocked whole cannot be requested alone. Ask for
  the connector.
- From AI surfaces, a person can have at most 25 requests waiting at once.
- A person lists their own requests with `mine: true` and can withdraw one while
  it is pending.

**Deciding is a person's job, in the console only.** **Governance → Access
requests**, needs `member:manage`, and asks the admin to confirm it is them. No
AI surface can approve or deny a request, and nobody can decide their own.

What approving does:

| Request | Effect |
|---|---|
| A restriction on a **connector**, or a **tool that names its connector** | Creates an **access grant** for that one person. It lifts exactly that connector or tool out of their **role's** rules. Every other role rule, including ones added later, still applies. Nobody else's access changes, and no rule is edited. |
| A **permission**, or a tool with no connector named | Records the decision only. The admin still has to change the role or rules. The console says so before they approve. |

- A grant lifts only role rules. If the person's **own** rules also block it,
  approving edits those personal rules to remove it, and the console makes that
  change as part of the approval.
- A grant cannot open one tool of a connector their role blocks whole.
- A grant approved in the console has no end date. It ends when the person
  leaves the organization or a new approval for the same thing replaces it.
- The requester is emailed the decision.
- Grants are audited as `access_grant.granted`, `access_grant.superseded`,
  `access_grant.expired` and `access_grant.revoked`.

## Designing a policy

- **Start open, watch, then restrict.** The audit log shows what is actually
  being reached. That is a better input than a guess.
- **Prefer blocking a few connectors to allowing many.** An allow list is
  strict, easy to get wrong in the empty case, and needs updating every time the
  team adopts an app.
- **Use tool-level allows for a narrow persona.** "This role may only read the
  CRM" is an allow rule with no connectors and a few read tool pairs, plus allow
  rules for any other apps the role uses.
- **Remember `connector:create`.** Restrictions bind connector identity, not
  hosts. Someone who can author connectors can author their way around a
  connector block. Restrict the permission, not just the connector.
