---
name: elaichi
description: Start here for any Elaichi question — what it is, what its words mean (connection, toolbox, automation, collection, dashboard, knowledge base), where a screen or setting lives in the app, what each plan includes, and which Elaichi skill to load next.
whenToUse: Someone asks what Elaichi is, how to do something in it, where a screen or setting lives, what one of its words means, or what their plan includes. Also the routing table when you are not sure which Elaichi skill covers a question.
---

# Elaichi

Elaichi is an agent platform for companies. It connects the software a company
already runs on and lets agents do real work in those systems, inside the same
permissions the company already grants its people.

Two things carry the product, and most AI tooling offers only one of them:

- **Reach** — the application catalog, connected once, available as tools an
  agent can call.
- **Restraint** — an agent never getting more access than the person it acts
  for.

The reach is delivered over MCP. One org-wide endpoint, authorized with OAuth,
works with Claude, ChatGPT, Cursor, Microsoft Copilot and any other MCP client. **MCP is how the
product is delivered, not what the product is** — so a question about Elaichi
is usually a question about access, not about a protocol.

- App: **[app.elaichi.ai](https://app.elaichi.ai)**
- Docs: **[elaichi.ai/docs](https://elaichi.ai/docs)**
- API: **`https://api.elaichi.ai`** · MCP endpoint: **`https://api.elaichi.ai/mcp`**
- Support: **support@elaichi.ai**

## The shape of it

```
Connector  →  Connection  →  Toolbox  →  MCP endpoint  →  AI client
(a product)   (an account)   (curated    (one address)    (Claude, ChatGPT,
                             tools)                         Cursor…)
```

An **AI client makes one connection — to Elaichi.** The apps are connected
inside Elaichi, not inside the client. That indirection is the whole point:
access follows the person's role, restrictions are enforced, every call is
audited, and revoking an app in Elaichi removes it from every client at once.
Connect apps directly in the client and all four are lost.

## The words

| Word | What it means |
|---|---|
| **Organization** | A team's workspace: its own members, roles, connections and toolboxes. Nothing crosses between organizations. |
| **Connector** | A product Elaichi knows how to talk to — Slack, Jira, Salesforce. Hundreds are in the catalog ([the current list](https://elaichi.ai/connectors/)), plus custom ones the org builds, forks, or adds from a remote MCP server. |
| **Connection** | One authorized account for that product: "our shared HubSpot", "my Jira". |
| **Tool** | A single action an agent can take — *create issue*, *search contacts*. |
| **Toolbox** | A curated set of tools, usually spanning several products, bound to real connections. It can carry a **skill**: instructions its owner wrote for the model. |
| **Template** | A toolbox design with no connections attached. Recipients **stamp** their own toolbox from it and bind their own accounts. |
| **Synthetic tool** | Several tool calls chained into one, so an agent sees one action instead of four. It runs when an agent calls it. |
| **MCP endpoint** | One address for everyone, scoped to the person using it, exposing every tool they can reach. |
| **Role** | What a person may do *in Elaichi* — invite people, create toolboxes, view the audit log. |
| **Restriction** | What connectors and tools a person may use *at all*. Set on a role or on one person. Enforced everywhere, including over MCP. |
| **Team** | A group of people, used as a sharing target. |
| **Access request** | A person's ask for something they were refused. An admin decides it. |

Two of these are worth keeping apart, because it is the most common confusion:
a **role** decides what you can do to Elaichi; a **restriction** decides what
you can do *through* it.

### The automation platform words

Black organizations also have the automation platform (see [Plans](#plans)).
An organization on Personal or Gold does not, and its sidebar and MCP tool list
show none of it.

| Word | What it means |
|---|---|
| **Automation** | Also called a workflow. Steps that run on their own when a trigger fires: a schedule, a set time, a webhook, a Slack message, a collection row, another automation finishing, or a click. |
| **Run** | One execution of an automation, with every step's result kept. |
| **Session** | A thread that ties several runs of one automation together, so later runs can read what earlier ones did. |
| **Approval** | A step that pauses a run until an approver says yes. It waits in their **Approvals** inbox. |
| **Collection** | Shared tables of records that automations write and people read. |
| **Dashboard** | Charts and tables over collections and tools. If an admin allows it, a copy can be shared outside the company as a **public link**. |
| **Knowledge base** | Short documents that agents and automations search in plain language. |
| **Elaichi Agent** | The chat inside the app (**Agent** in the sidebar), and `@Elaichi` in Slack. A Black feature. |

Automation versus synthetic tool: an automation runs **by itself** on a
trigger; a synthetic tool runs **when an agent calls it**.

## Three steps to a working agent

1. **Connect an account.** Connections → **Add connection** → find the product
   → sign in with it. Then decide who can reach it: just you, a team, or
   everyone. (Connectors is for *browsing* what a product can do — there is no
   Connect button there.)
2. **Pick your tools.** Every connection automatically gets a toolbox, so
   there is nothing to do to start. Build a deliberate toolbox when you want
   fewer, better-named tools with some inputs locked down.
3. **Connect your AI client.** Click **Connect** (labeled **Connect an AI
   client** when the automation platform is on) under the sidebar's list, copy
   the MCP endpoint, and add it to Claude, ChatGPT, Cursor, Microsoft Copilot or another MCP
   client.

Full walkthrough: [Getting started](https://elaichi.ai/docs/getting-started).

## Where things live

| Sidebar area | What is there |
|---|---|
| **Agent** | The in-app chat. Black only. |
| **Approvals** | Runs waiting on *you* to approve a step. Automation platform only. |
| **Connections** | The accounts you have authorized, their health, sharing, transfer |
| **Connectors** | The product catalog, plus custom connectors you build, fork, or add from a remote MCP server |
| **Toolboxes** | Your toolboxes, plus **Templates** and **Synthetic tools** |
| **Knowledge** | Knowledge bases. Automation platform only. |
| **Automations**, **Dashboards**, **Collections** | The automation platform, where it is on |
| **Governance** | Restrictions, the audit log, access requests — and, with the automation platform, spend controls |
| **Settings** | Organization, People, Billing, SSO and SCIM, domains, API tokens, notifications, logging, and your own security, connected apps and files |

Full screen-by-screen list, with paths and guides: [App map](./references/app-map.md).

**There is no "MCP servers" area.** The endpoint lives behind the **Connect**
row — one endpoint, not a list of servers to create.

**An area you lack permission for is hidden, not greyed out.** So a sidebar
shorter than a colleague's is a roles question (Settings → People) or the
automation platform being off, not a bug.

Getting around fast: **⌘K** opens the command palette (navigate *and* create)
and **⌘B** toggles the sidebar. Use **Ctrl** on Windows and Linux. Every page
has a **Help** button that opens its own guide.

## Facts worth quoting

58 permissions · 8 predefined roles plus custom roles · restrictions set on a
role or on one person, where a person's own rule can only narrow what their
role allows · restrictions checked everywhere a tool is listed, connected,
saved or run, down to the outbound request · data placement in three regions
(United States, European Union, Asia-Pacific) · **no API or tool ever returns a
stored credential**.

For the catalog size and the full list of supported applications, read
[elaichi.ai/connectors](https://elaichi.ai/connectors/) rather than quoting a
number from memory — it moves.

## Plans

There are three plans, each including the one before: **Personal**, **Gold**
and **Black**. Link [elaichi.ai/pricing](https://elaichi.ai/pricing/) for the
current detail; prices below are US-dollar list prices, and visitors in some
countries see a regional price.

**Personal** is free and for one person: toolboxes and synthetic tools over
MCP. It allows 1 member, 10 connections across at most 3 connectors, 10
synthetic tools, and 1,000 connected-tool calls a calendar month (UTC; the
count resets on the 1st). Nothing is shared and there is no governance, and no
custom connectors, automations, collections, dashboards, knowledge bases or
Elaichi Agent. Removing an old share or restriction always works.

**Gold** is $15 per user per month, or $10 per user per month billed annually.
It adds sharing, governance (custom roles, restrictions, SAML and OIDC single
sign-on, SCIM provisioning, group-to-role mapping) and custom connectors, and
removes Personal's limits.

**Black** is on sale and self-serve: $24 per seat per month, or $18 per seat
per month billed annually, in US dollars with regional discounts. It adds:

- the automation platform: automations (workflows), approvals, webhooks,
  collections, dashboards, knowledge bases and spend controls
- the Elaichi Agent, in the app and in Slack
- customer-managed encryption keys (BYOK) in AWS KMS
- forwarding the audit log to your own tooling (Settings → Logging)

Black also bills usage beyond a monthly free allowance of 1,000 run minutes and
1 GB-month of storage: $0.02 a run minute and $5 a GB-month. Buying Black charges immediately. A paid Gold
organization upgrades to Black in **Settings → Billing**; one paying in another
currency writes to support@elaichi.ai.

**Every new organization starts on a 14-day Black trial**, no card needed. Its
free usage is a hard stop: runs pause at 1,000 minutes and collection writes
stop at 1 GB until someone buys Black. When the trial ends without a purchase,
the organization moves to **Personal**.

Three things to get right when somebody asks:

- **Enterprise identity is Gold, not Black.** SSO, SCIM and group mappings are
  the ones most often misattributed upward. Do not send someone to Black for
  them.
- **Moving to Personal deletes nothing.** Connections, members, roles and the
  audit log stay where they were. The organization just cannot add past a
  Personal limit or make new shares, and buying Gold or Black lifts that.
- **A refusal names the plan.** `feature_not_available` says which plan unlocks
  the feature, and `plan_limit_reached` names the Personal limit (`members`,
  `connections`, `connectors`, `synthetic_tools` or `tool_calls`). Relay it, point to
  **Settings → Billing**, and do not work around it. Only an organization
  *on hold* answers `subscription_required`; send that to
  support@elaichi.ai.

An organization's **data region** — United States, European Union, or
Asia-Pacific — is chosen when it is created and cannot be changed afterwards.
The API host is the same either way.

## Which skill to load

| The question is about | Load |
|---|---|
| Acting through an attached Elaichi MCP server — searching for a tool, running one, reading a refusal | [elaichi-mcp](../elaichi-mcp/SKILL.md) |
| Setting up Claude, ChatGPT, Cursor, Microsoft Copilot or another MCP client, and why a client shows no tools | [elaichi-clients](../elaichi-clients/SKILL.md) |
| Connecting an account, connection health, transfer, offboarding, custom and remote MCP connectors | [elaichi-connections](../elaichi-connections/SKILL.md) |
| Toolboxes, templates, stamping, frozen parameters, delegation, toolbox skills, synthetic tools | [elaichi-toolboxes](../elaichi-toolboxes/SKILL.md) |
| Automations and workflows: triggers, steps, approvals, runs, sessions, webhooks, spend limits | [elaichi-automations](../elaichi-automations/SKILL.md) |
| Collections, dashboards and public links, knowledge bases | [elaichi-data](../elaichi-data/SKILL.md) |
| Roles, permissions, restrictions, access requests, the audit log, SSO and SCIM | [elaichi-governance](../elaichi-governance/SKILL.md) |
| Writing code against `api.elaichi.ai` | [elaichi-api](../elaichi-api/SKILL.md) |
| Base URLs, id prefixes, pagination, error shapes — the small facts | [elaichi-conventions](../elaichi-conventions/SKILL.md) |

## Two things to get right in any answer

**Say what the person has to do themselves.** A model cannot grant itself
access to Elaichi, and it cannot authenticate a third-party account. Both are
the human's to do, and an answer that glosses over that leaves someone waiting
on a sign-in nobody opened.

**Never ask for a credential in chat.** No Elaichi tool or operation takes a
password, API key or token from the model. Whenever a flow seems to need one,
the real answer is a connect link the person opens themselves.

## References

| Document | Topics |
|---|---|
| [Concepts](./references/concepts.md) | The full model — organizations, connectors, connections, toolboxes, templates, synthetic tools, roles, restrictions, the audit log, and the automation platform |
| [App map](./references/app-map.md) | Every screen, its path, what it does, and the guide for it |
| [First hour](./references/first-hour.md) | A new organization from sign-in to a working agent, including what to set up before inviting anyone |
