# Restrictions

An allowlist or blocklist over **connectors** and **individual tools**. A
second axis entirely, orthogonal to ownership and sharing: a grant decides
whether you can reach a resource, a restriction decides whether you may use
that *kind of thing* at all.

Governance → Restrictions. Writing one needs `restriction:manage`; targeting a
specific person additionally needs `restriction:override`.

## A rule

| Field | What it is |
|---|---|
| **Target** | A **role**, or a specific **person**. There is no organization row — the organization default is the *absence* of any applicable rule |
| **Mode** | `allow` or `block` |
| **Connectors** | A list of connector slugs |
| **Tools** | A list of `{connector, tool}` pairs |

## Precedence

```
the person's own rule  >  their role's rules  >  the organization default
```

- **No applicable rule → everything is allowed.** Elaichi is open by default.
- Within the **role** layer, allows union, blocks union, and **a block always
  beats an allow**.
- A **person-targeted** rule **replaces the role layer entirely** for that
  person. It can loosen or tighten.

Lineage matters in one direction only: a **block** is inherited by forks of the
connector it names. An **allow** matches only the literal thing it names.

## The empty-set truth table

**The allowlist engages on the mode, not on whether the lists have anything in
them.**

| Mode | Connectors | Tools | Effect |
|---|---|---|---|
| `allow` | `[]` | `[]` | **Denies every connector and every tool.** The strictest rule expressible |
| `allow` | `[]` | `[{X, Y}]` | X is reachable, and only tool Y on it. Everything else denied |
| `allow` | `[X]` | `[]` | All of X. Everything else denied |
| `allow` | `[X]` | `[{X, Y}]` | **All of X** — naming the tool adds nothing and is inert |
| `block` | `[]` | `[]` | Restricts nothing |
| `block` | `[]` | `[{X, Y}]` | Y is blocked; the rest of X stays reachable |
| `block` | `[X]` | `[{X, Y}]` | Identical to blocking X — the tool entry is dead data |

Two things to carry away:

- **An empty allow rule is a total lockout**, not a no-op. If you create an
  allow rule intending to fill it in later, you have locked the target out in
  the meantime.
- **A tool-level allow implies its connector, for that tool only.** That is the
  useful shape: `allow` with no connectors and a handful of tool pairs gives a
  role exactly those tools and nothing else.

## Where it is enforced

Four moments, which is what makes a restriction real rather than advisory:

| Moment | What happens |
|---|---|
| **Connect** | Creating a connection to a blocked connector is refused |
| **Save** | A synthetic tool step naming a blocked tool is rejected |
| **Advertise** | A blocked tool never appears in any tool list, including `tools/list` over MCP |
| **Execute** | A direct call on a blocked tool is refused, and the resolved outbound URL is checked on every redirect hop |

All four resolve the same identity, so nothing is ever listed or connectable
that execution would then refuse.

One deliberate exception: a toolbox or template **entry** pinning a
lineage-blocked tool is a valid save — it is inert data. Resolution hides it,
and execution refuses it.

Changes propagate within about a minute, occasionally two at a distant edge.

## What a blocked call looks like

**A blocked tool goes missing rather than failing.** It is absent from every
list rather than listed-and-erroring.

That is the right design — an agent cannot be tempted by a tool it never sees
— but it has a consequence worth stating plainly: **absence alone cannot tell
you whether a tool was restricted or never existed.**

What the surfaces show:

| Surface | What you get |
|---|---|
| A connector or connection row | `restricted: true/false`, plus `restricted_by`, which is `"role"`, `"user"`, or null. **Flagged, never omitted** |
| An HTTP refusal | `403`, with a message like "This connector is restricted for your account" |
| An MCP refusal | A blocked card naming the tool, with `reason: "restriction"` and whether access can be requested |
| A tool search | Optionally a count of matches withheld — a count only, never which ones |

**A refusal names no rule, no author, and no admin.** One fixed sentence. That
is a disclosure boundary, not an oversight: the person refused has no right to
the shape of the policy that refused them.

### The one asymmetry to know

`restricted: true` on a connector means the **whole connector** is blocked —
conclusive, and readable without any extra permission.

`restricted: false` rules out a connector-level block and **nothing else.** A
single tool can still be restricted, and at that point it is invisible: a
connection's tool list and the connector's tool list apply the same
restrictions for the same caller, so comparing them separates nothing.

Reading the actual rules needs `restriction:view`, which an ordinary member
does not have — and **a refusal there is the answer to "can I check this
myself", not a dead end to route around.**

And never subtract: a connector's advertised tool count is what the **vendor**
offers, not what this caller may run. The difference between it and the rows
you got is not "how many are restricted".

## Self-dealing refusals

Two writes are refused even with the right permissions, both evaluated
server-side at the moment of the write:

- **A role-targeted rule whose role has exactly your own permission set.** The
  test is equality, so cloning your own role first does not get around it.
- **A rule targeting yourself, while you are currently restricted by a rule
  that is not yours to lift.** Ask another admin with `restriction:manage`.

## Access requests

A member refused by a restriction can ask for access. No permission is needed
to ask.

Resolving needs `member:manage`, and an admin cannot resolve their own request.

Approving a **restriction** request for a **connector** does more than record a
decision: it lifts that restriction **for the requester alone**, by editing
their own person-targeted rules or cloning the applicable role rules onto new
person-targeted ones. The role rules are never touched, so nobody else is
affected. It writes its own audit event naming who was granted what.

Over MCP this specific approval is refused and points at the console. Lifting a
restriction is a console decision.

## Designing a policy

- **Start open, watch, then restrict.** The audit log will tell you what is
  actually being reached, and that is a better input than a guess.
- **Prefer blocking a few connectors to allowing many.** An allowlist is
  strict, easy to get wrong in the empty case, and needs maintaining every
  time someone connects something new.
- **Use tool-level allows for a narrow persona.** "This role may only read from
  the CRM" is an allow with no connectors and a few read tool pairs.
- **Remember `connector:create`.** Restrictions bind slugs and lineage, not
  hosts, so someone who can author connectors can author their way around a
  connector-level block. Restrict the permission, not just the connector.
