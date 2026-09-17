---
name: elaichi
description: What Elaichi is, the words it uses, where everything lives in the app, and which skill to load next. Start here for any question about connecting company tools to AI clients, curating toolboxes, or who is allowed to reach what.
whenToUse: Someone asks what Elaichi is, how to do something in it, where a screen or setting lives, or what one of its words means. Also the routing table when you are not sure which Elaichi skill covers a question.
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
works with Claude, ChatGPT, Cursor and any other MCP client. **MCP is how the
product is delivered, not what the product is** — so a question about Elaichi
is usually a question about access, not about a protocol.

- App: **[app.elaichi.ai](https://app.elaichi.ai)**
- Docs: **[elaichi.ai/docs](https://elaichi.ai/docs)**
- API: **`https://api.elaichi.ai`** · MCP endpoint: **`https://api.elaichi.ai/mcp`**
- Support: **support@elaichi.ai**

## The shape of it

```
Connector  →  Connection  →  Toolbox  →  MCP endpoint  →  AI client
(a product)   (an account)   (curated    (your address)   (Claude,
                             tools)                        Cursor…)
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
| **Connector** | A product Elaichi knows how to talk to — Slack, Jira, Salesforce. Hundreds are in the catalog ([the current list](https://elaichi.ai/connectors/)), plus any the org builds itself. |
| **Connection** | One authorized account for that product: "our shared HubSpot", "my Jira". |
| **Tool** | A single action an agent can take — *create issue*, *search contacts*. |
| **Toolbox** | A curated set of tools, usually spanning several products, bound to real connections. |
| **Template** | A toolbox design with no connections attached. Recipients **stamp** their own toolbox from it and bind their own accounts. |
| **Synthetic tool** | Several tool calls chained into one, so an agent sees one action instead of four. |
| **MCP endpoint** | One address per organization, scoped to the person using it, exposing every tool they can reach. |
| **Role** | What a person may do *in Elaichi* — invite people, create toolboxes, view the audit log. |
| **Restriction** | What connectors and tools a person may use *at all*. Enforced everywhere, including over MCP. |
| **Team** | A group of people, used as a sharing target and a restriction target. |

Two of these are worth keeping apart, because it is the most common confusion:
a **role** decides what you can do to Elaichi; a **restriction** decides what
you can do *through* it.

## Three steps to a working agent

1. **Connect an account.** Connections → **Add connection** → find the product
   → sign in with it. Then decide who can reach it: just you, a team, or
   everyone. (Connectors is for *browsing* what a product can do — there is no
   Connect button there.)
2. **Pick your tools.** Every connection automatically gets a toolbox, so
   there is nothing to do to start. Build a deliberate toolbox when you want
   fewer, better-named tools with some inputs locked down.
3. **Connect your AI client.** Open **Connect your AI client**, copy the MCP
   endpoint, paste it into Claude, Cursor or ChatGPT.

Full walkthrough: [Getting started](https://elaichi.ai/docs/getting-started).

## Where things live

| Sidebar area | What is there | Guide |
|---|---|---|
| **Connections** | The accounts you have authorized, their health, sharing, transfer | [Manage connections](https://elaichi.ai/docs/guides/connections/manage-connections) |
| **Connectors** | The product catalog, plus custom connectors you build or fork | [Browse connectors](https://elaichi.ai/docs/guides/connectors/browse-connectors) |
| **Toolboxes** | Templates, your toolboxes, and synthetic tools | [How toolboxes work](https://elaichi.ai/docs/guides/toolboxes/overview) |
| **Governance** | Restrictions, the audit log, and access requests | [Set restrictions](https://elaichi.ai/docs/guides/governance/set-restrictions) |
| **Settings → People** | Members, invites, roles, teams | [Invite and manage people](https://elaichi.ai/docs/guides/members/invite-and-manage-people) |
| **Settings** | Org profile, domains, SSO, SCIM, logging, notifications, security, API tokens, connected apps, plan | [Settings guides](https://elaichi.ai/docs/guides/settings/organization-profile) |

**There is no "MCP servers" area.** The endpoint lives behind the **Connect
your AI client** button — one endpoint, not a list of servers to create.

**An area you lack permission for is hidden, not greyed out.** So a sidebar
shorter than a colleague's is a roles question, not a bug — Settings → People
is where that is checked.

Getting around fast: **⌘K** opens the command palette (navigate *and* create)
and **⌘B** toggles the sidebar. Use **Ctrl** on Windows and Linux. Every page
has a **Help** button that opens its own guide.

## Facts worth quoting

38 permissions · 8 predefined roles plus unlimited custom roles · restrictions
set on a role or on one person, a person-level rule replacing the role's ·
enforced at four points (connecting, listing tools, executing a call, and the
outbound request) · bring your own keys for four model providers · data
placement in three regions (US, EU, APAC) · **zero credentials ever returned by
the API**.

For the catalog size and the full list of supported applications, read
[elaichi.ai/connectors](https://elaichi.ai/connectors/) rather than quoting a
number from memory — it moves.

## Plans

**Gold** is the plan you can buy today: $15 per user per month, with a 14-day
free trial and no credit card.

**Gold covers everything a team needs day to day** — the MCP endpoint, custom
roles, restrictions, synthetic tools, custom connectors, and enterprise
identity: SAML and OIDC single sign-on, SCIM provisioning, and group-to-role
mapping.

**Black is coming soon and cannot be bought yet.** Four things sit behind it:

| Black feature | State |
|---|---|
| Bring your own key — customer-managed AWS KMS | Built |
| Logging destinations — forward audit events to Datadog | Built |
| Workflows and automations | **Not available** |
| Collections and live dashboards | **Not available** |

Two things to get right when somebody asks:

- **Enterprise identity is Gold, not Black.** SSO, SCIM and group mappings are
  the ones most often misattributed upward. Do not send someone to Black for
  them.
- **Never give workflows or dashboards a date, or describe them as
  available.** They are not, and Black itself is not on sale.

An organization's **data region** — United States, European Union, or
Asia-Pacific — is chosen when it is created and cannot be changed afterwards.
The API host is the same either way.

When a trial ends without a subscription the organization **pauses rather than
being emptied**. Gold features lock and the app says so; connections, roles and
the audit log stay exactly where they were, so subscribing picks up where the
trial stopped.

## Which skill to load

| The question is about | Load |
|---|---|
| Acting through an attached Elaichi MCP server — searching for a tool, running one, reading a refusal | **elaichi-mcp** |
| Setting up Claude, ChatGPT or Cursor, and why a client shows no tools | **elaichi-clients** |
| Connecting an account, connection health, transfer, offboarding, custom connectors | **elaichi-connections** |
| Toolboxes, templates, stamping, frozen parameters, delegation, synthetic tools | **elaichi-toolboxes** |
| Roles, permissions, restrictions, access requests, the audit log, SSO and SCIM | **elaichi-governance** |
| Writing code against `api.elaichi.ai` | **elaichi-api** |
| Base URLs, id prefixes, pagination, error shapes — the small facts | **elaichi-conventions** |

## Two things to get right in any answer

**Say what the person has to do themselves.** A model cannot grant itself
access to Elaichi, and it cannot authenticate a third-party account. Both are
the human's to do, and an answer that glosses over that leaves someone waiting
on a sign-in nobody opened.

**Never ask for a credential.** No part of Elaichi takes a password, API key or
token as input. Whenever a flow seems to need one, the real answer is a connect
link the person opens themselves.

## References

| Document | Topics |
|---|---|
| [Concepts](./references/concepts.md) | The full model — organizations, connectors, connections, toolboxes, templates, synthetic tools, and how they compose |
| [App map](./references/app-map.md) | Every screen, what it does, and the guide for it |
| [First hour](./references/first-hour.md) | A new organization from sign-in to a working agent, including what to set up before inviting anyone |
