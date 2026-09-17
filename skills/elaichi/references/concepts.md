# Concepts

The model in one paragraph: an **organization** holds **connections** —
authorized accounts for products in the **connector** catalog. Every connection
exposes **tools**. A **toolbox** curates tools across connections; a
**template** is a toolbox design with no accounts attached. Everything a person
can reach appears at their **MCP endpoint**. **Roles** decide what they may do
in Elaichi; **restrictions** decide what they may reach through it.

## Organization

A team's workspace. Members, roles, teams, connections, toolboxes,
restrictions, audit log — all of it is per-organization, and nothing crosses
between them.

One person can belong to several organizations on one account. The switcher at
the top of the sidebar changes context without signing in again. The MCP
address does not change with it — what changes is which organization your
OAuth grant was approved under.

People arrive four ways: they create the organization, accept an emailed
invite, join automatically because an admin verified their email domain, or get
provisioned by SCIM from the company directory.

## Connector

A product Elaichi knows how to talk to. The catalog ships with roughly 700,
covering CRMs, ticketing, HRIS, ATS, storage, messaging and more.

A connector's **documented methods are exactly its tools** — if a method has a
description, it is a tool; if it does not, it is not. That is the whole rule,
and it is why a custom connector's documentation editor is where tools actually
come from.

An organization can also **author** a connector from scratch — base URL, auth
format, credentials, resources and methods as JSON — or **fork** any catalog
connector along with its documentation. Custom connectors are private to the
org and work everywhere a catalog one does. A fork records its lineage, so
**Pull from upstream** can later offer new tools and safe fixes for review;
conflicts and removals stay unchecked by default.

## Connection

One authorized account for one connector. Credentials are encrypted in a vault
and only decrypted at the moment a tool runs — nothing in Elaichi's own
database holds them, and no API or tool ever returns one.

Every connection has exactly one **owner**, always a person. Reach beyond the
owner is an explicit grant to a user, a team, or the whole organization, at
`view`, `use` or `edit`. A connection with no grants is **private**, and
private means private: no organization-wide permission reaches it.

Status matters more than it looks. `pending` and `needs_reauth` connections
contribute **zero** tools — they vanish from tool lists rather than appearing
and failing — which is why so many "my tool is missing" reports are really
connection problems.

## Tool

One action: *create issue*, *search contacts*, *send message*. Tools come from
three places:

- **A connection**, via its connector's documented methods.
- **A synthetic tool**, built by the organization.
- Nowhere else. There is no way to hand-write a tool into a toolbox.

## Toolbox

A curated set of tools, usually spanning several products, with real
connections bound to each entry.

Three kinds exist:

| Kind | Where it comes from |
|---|---|
| **Dynamic, per connection** | Created automatically the moment a connection goes active. Read-only. |
| **Dynamic, global** | One per person (`global:{userId}`) — everything they can reach. Read-only. |
| **Built** | Created by someone, entry by entry, or stamped from a template. |

Per entry, a builder can rename and re-describe the tool (which is what the
model sees), disable it, **freeze** parameters, override the input schema
outright, or set defaults. At call time the precedence is
`defaults < the model's arguments < frozen params` — a frozen parameter is
stripped from the advertised schema entirely, so the model cannot see it, let
alone override it.

**Sharing a toolbox at `use` delegates execution.** The recipient runs its
tools over the connections its entries pin, without holding any grant on those
connections. They never see a credential, cannot reuse the account anywhere
else, and lose it the instant the share is revoked. Each entry's live authority
is whoever pinned it — its *delegator* — not whoever shared the toolbox.

## Template

A toolbox design with **no connections attached**. Entries name a connector and
a tool, carry all the same per-entry customization, and reference nothing
account-specific.

Sharing a template at `use` lets a recipient **stamp** their own toolbox from
it: the entries are copied in and each one is bound to one of the recipient's
own accounts.

The choice between the two is the choice between two intentions:

- **Toolbox** — "here is a working set of tools, run them through my accounts."
- **Template** — "here is a good design, bring your own accounts."

## Synthetic tool

Several tool calls chained into one. A synthetic tool is a small DAG: each step
calls one connection's tool with arguments built by a JSONata expression over
the original input and the outputs of earlier steps.

Independent steps run in parallel. Cycles and unknown references are rejected
when you save, not when you run. It advertises its own input schema and drops
into any toolbox or template like an ordinary entry.

## MCP endpoint

One address — `https://api.elaichi.ai/mcp` — the same for everybody, that
exposes **one person's access**. Which organization and whose access come from
the OAuth grant, not the URL, so two colleagues pointing the same client at
the same address do not see the same tools.

There is no publishing step. Everything a person can use is already resolved
live through their global toolbox on every request, clamped by their current
restrictions. Losing a role or a share takes effect on the next call.

An MCP client signs in with OAuth and the person approves scopes on Elaichi's
own consent screen. Only read access is granted by default.

## Role

What a person may do *in Elaichi*. Eight roles ship with every organization,
six of them a strict chain where each is the one before it plus one capability:

```
Guest ⊂ Member ⊂ Team Admin ⊂ People Admin ⊂ Org Admin ⊂ Org Owner
```

Two more sit off the chain: **Billing Admin** (billing only) and **Auditor**
(read-only visibility everywhere). Roles are exclusive — exactly one per
person — and an org admin can define custom roles from the permission catalog.

## Restriction

An allowlist or blocklist over connectors and individual tools, targeted at a
**role** or a **specific person**. Resolution runs
`person's override > their role > the organization default`, and within a
layer a block always beats an allow.

Restrictions are enforced at four moments, which is what makes them meaningful
rather than cosmetic: you cannot **connect** a blocked connector, you cannot
**save** a synthetic-tool step that names a blocked tool, a blocked tool never
**appears** in any tool list, and **executing** one is refused — right down to
the outbound request Elaichi actually dials.

A blocked tool goes *missing* rather than appearing and failing. That is
deliberate — an agent cannot be tempted by a tool it never sees — and it is
also why diagnosing a missing tool has a set order.

## Team

A group of people. Teams are not owners of anything; they exist as a **sharing
target** and a **restriction target**, and as a way to hold a set of people
that membership changes keep up to date.

A **team admin** can rename the team and add or remove ordinary members. They
cannot delete the team, and cannot appoint or demote other admins — that needs
the org-wide teams permission. Administering a team grants nothing extra on any
resource shared with it.

## Audit log

Append-only, per-organization, covering membership, invites, roles, teams,
connections and transfers, toolboxes and shares, tool calls, restrictions, SSO
and SCIM changes, and sign-ins including failed ones.

Every row carries `actor_kind`, so **an action taken by an AI is a recorded
field rather than something a human has to infer** — assistant and MCP tool
calls record `ai_assistant` along with the conversation, the model, and the id
of any third-party record they created.

Events are eventually consistent: a row may take a moment to appear. They can
also be forwarded to the organization's own observability tooling.
