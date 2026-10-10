# Concepts

The model in one paragraph: an **organization** holds **connections** —
authorized accounts for products in the **connector** catalog. Every connection
exposes **tools**. A **toolbox** curates tools across connections; a
**template** is a toolbox design with no accounts attached. Everything a person
can reach appears at their **MCP endpoint**. **Roles** decide what they may do
in Elaichi; **restrictions** decide what they may reach through it. Where the
automation platform is on, **automations** run tools on their own, write to
**collections**, feed **dashboards**, and read **knowledge bases**.

## Organization

A team's workspace. Members, roles, teams, connections, toolboxes,
restrictions, audit log — all of it is per-organization, and nothing crosses
between them.

One person can belong to several organizations on one account. The switcher at
the top of the sidebar changes context without signing in again. The MCP
address does not change with it — what changes is which organization your
OAuth grant was approved under. One grant covers exactly one organization;
reaching a second one takes a second connection from the client.

People arrive four ways: they create the organization, accept an emailed
invite, join automatically because an admin verified their email domain, or get
provisioned by SCIM from the company directory.

## Connector

A product Elaichi knows how to talk to. The catalog covers CRMs, ticketing,
HRIS, ATS, storage, messaging and more — read
[elaichi.ai/connectors](https://elaichi.ai/connectors/) for the current list
rather than quoting a size.

A connector's **documented methods are exactly its tools** — if a method has a
description, it is a tool; if it does not, it is not. That is why a custom
connector's documentation editor is where tools actually come from.

An organization can add its own connectors three ways, all from Connectors →
**New connector**:

- **Build from config** — base URL, auth format, credentials, resources and
  methods as JSON.
- **Fork** a catalog connector along with its documentation. A fork records its
  lineage, so **Pull from upstream** can later offer new tools and safe fixes
  for review.
- **Add remote MCP server** — point at an MCP server; its tools come from that
  server. A remote MCP connector cannot be forked.

Custom connectors are private to the org and work everywhere a catalog one
does.

## Connection

One authorized account for one connector. Credentials are encrypted in a vault
and only decrypted at the moment a tool runs — and no API or tool ever returns
one.

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
two places:

- **A connection**, via its connector's documented methods (or, for a remote
  MCP connector, the server's own tools).
- **A synthetic tool**, built by the organization.

There is no way to hand-write a tool into a toolbox.

## Toolbox

A curated set of tools, usually spanning several products, with real
connections bound to each entry.

Three kinds exist:

| Kind | Where it comes from |
|---|---|
| **Dynamic, per connection** | Created automatically the moment a connection goes active. Read-only. |
| **Dynamic, global** | One per person (`global:{userId}`, named **All tools**) — every tool of every connection they own or that is shared with them at `use`. Read-only. An MCP client granted **All my tools** reaches this plus every toolbox shared with them. |
| **Built** | Created by someone, entry by entry, or stamped from a template. |

Per entry, a builder can rename and re-describe the tool (which is what the
model sees), disable it, **freeze** parameters, override the input schema
outright, or set defaults. At call time the precedence is
`defaults < the model's arguments < frozen params` — a frozen parameter is
stripped from the advertised schema entirely, so the model cannot see it, let
alone override it.

A toolbox or template can also carry a **skill**: instructions its owner wrote
for the model — ids, field values, the steps a job takes. A client reads it
with `elaichi__toolbox__get_skill` before using that toolbox's tools.

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
it (the template's **Use this template** button): the entries are copied in
and each one is bound to one of the recipient's own accounts.

The choice between the two is the choice between two intentions:

- **Toolbox** — "here is a working set of tools, run them through my accounts."
- **Template** — "here is a good design, bring your own accounts."

## Synthetic tool

Several tool calls chained into one. A synthetic tool is a small DAG: each step
calls one connection's tool with arguments built by a JSONata expression over
the original input and the outputs of earlier steps.

Independent steps run in parallel. Cycles and unknown references are rejected
when you save, not when you run. It advertises its own input schema and drops
into any toolbox or template like an ordinary entry. It runs only when an agent
calls it — for something that should run on its own, use an automation.

## MCP endpoint

One address — `https://api.elaichi.ai/mcp` — the same for everybody, that
exposes **one person's access**. Which organization and whose access come from
the OAuth grant, not the URL, so two colleagues pointing the same client at
the same address do not see the same tools.

There is no publishing step. Everything a person can use is resolved live on
every request, clamped by their current restrictions. Losing a role or a share
takes effect on the next call.

An MCP client signs in with OAuth and the person approves scopes on Elaichi's
own consent screen. Every scope the client asked for starts ticked **except
Delete**, which always takes a deliberate click; a client that asks for no
scope at all gets Read only. Connected tools are found with `search_tools` and
run with `execute_tool` (or `run_code`, for a small program that calls
several). The **elaichi-clients** and **elaichi-mcp** skills carry the detail.

## Role

What a person may do *in Elaichi*. Eight roles ship with every organization,
six of them a strict chain where each is the one before it plus more:

```
Guest ⊂ Member ⊂ Team Admin ⊂ People Admin ⊂ Org Admin ⊂ Org Owner
```

Two more sit off the chain: **Billing Admin** (billing and spend only) and
**Auditor** (read-only visibility). Roles are exclusive — exactly one per
person — and an admin can define custom roles from the catalog of 58
permissions.

Guest, Billing Admin and Auditor lack `tool:execute`, so their MCP clients get
no Elaichi operations and no connected tools.

## Restriction

An allowlist or blocklist over connectors and individual tools, targeted at a
**role** or at **one person**. There is no team target and no organization-wide
target.

A person is governed by two layers at once — their role's rules and their own —
and a connector or tool is reachable only when **both** admit it. So a
person's own rule can only narrow what their role allows; it never loosens it.
Within a layer, a block always beats an allow, and an allow rule that names
nothing blocks everything for its target.

To let one person past a role rule, an admin approves their **access request**,
which grants that person access without changing the rule.

Restrictions are checked everywhere a person can reach a connector or tool:
browsing the catalog, connecting an account, forking, saving a toolbox entry or
synthetic-tool step, advertising tools to a client, executing a call, and the
final check on the outbound request Elaichi actually sends.

A blocked tool goes *missing* rather than appearing and failing. That is
deliberate — an agent cannot be tempted by a tool it never sees — and it is
also why diagnosing a missing tool has a set order.

## Team

A group of people. Teams are not owners of anything; they exist as a **sharing
target** — share a connection, toolbox or template with a team and its members
reach it, with membership changes kept up to date.

Whoever creates a team becomes its administrator. A **team admin** can rename
the team and add or remove members. Administering a team grants nothing extra
on any resource shared with it.

## Audit log

Append-only, per-organization, covering membership, invites, roles, teams,
connections and transfers, toolboxes and shares, tool calls, restrictions, SSO
and SCIM changes, and sign-ins including failed ones.

Every row carries `actor_kind` — `user`, `system`, `staff`, `scim`,
`api_token`, `ai_assistant` or `automation` — and the surface it came from.
A call from an MCP client is recorded with surface `mcp` and names the client;
`ai_assistant` marks the in-app Elaichi Agent only. An automation's actions are
recorded with the run and the person it acted for.

People without audit permission see **Your activity** — their own rows —
instead of the organization's log. Events are eventually consistent: a row may
take a moment to appear.

## The automation platform

Early access, by invitation, behind one switch in Settings → Organization →
Automations. Everything below is absent from the app and from MCP while the
switch is off.

**Automation.** Also called a workflow. A published definition with a trigger
and steps. Triggers: run by hand, a repeating schedule, once at a set time, a
webhook, a Slack message, another automation finishing, or a collection row.
Steps call tools and synthetic tools, transform data, branch and loop, write
collections, search or write knowledge, fetch from the web, ask an AI agent,
notify people, and pause for **approval**. Each execution is a **run**. A
**session** ties related runs of one automation together. Build and run them
with **elaichi-automations**.

**Approval.** An approve step pauses a run until a named approver decides. A
step that deletes must have an approval in front of it.

**Collection.** One or more tables of records with typed fields. Automations
write rows; people and dashboards read them. Rows keep their history.

**Dashboard.** Pages of charts and tables over collections and tools. With the
org's **Public links** switch on (off by default), a member who can edit a
dashboard can publish a read-only copy to a link anyone can open.

**Knowledge base.** Short documents searched in plain language by people,
agents and automation steps. Search is word-based, not semantic.

**Web access** and **spend controls** live under Governance: the first decides
whether automations may fetch from the public web, the second meters usage and
sets limits.

Collections, dashboards and knowledge bases are covered by **elaichi-data**.
