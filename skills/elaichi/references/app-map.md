# App map

Every screen in [app.elaichi.ai](https://app.elaichi.ai), its path, what it
does, and the guide behind it. Use this to answer "where do I do X?" without
guessing.

Docs links are relative to `https://elaichi.ai/docs`. A dash means there is no
guide for that screen yet.

**An area you lack permission for is hidden, not disabled.** If a screen is
missing for one person and present for another, that is roles — check
Settings → People. Rows marked *automation platform* appear only where the
organization was invited and an admin turned it on in Settings → Organization
→ Automations.

## Getting around

| Thing | Where |
|---|---|
| Organization switcher | Top of the sidebar |
| Profile menu, sign out | Bottom of the sidebar |
| Connect an AI client | The **Connect** row under the sidebar's list (**Connect an AI client** when the automation platform is on) |
| Command palette — navigate *and* create | **⌘K** / **Ctrl+K** |
| Show/hide sidebar | **⌘B** |
| Guide for the page you are on | **Help** in the header |
| Unsaved changes | A bar at the bottom of the screen — save or discard before navigating |

Guide: [Getting around](/guides/basics/getting-around)

The sidebar is grouped when the automation platform is on: **Agent** and
**Approvals** at the top, then **Connect** (Connections, Connectors,
Toolboxes, Knowledge), then **Automate** (Automations, Dashboards,
Collections), then Governance and Settings. Without it, the sidebar is one flat
list: Connections, Connectors, Toolboxes, Governance, Settings.

## Agent

| Task | Where | Guide |
|---|---|---|
| Chat with the Elaichi Agent | **Agent** (`/assistant`), or **⌘⇧A** | [Using the assistant](/guides/assistant/using-the-assistant) |
| Choose model providers and models | Settings → **Assistant** | [Assistant settings](/guides/settings/assistant) |
| Let people tag `@Elaichi` in Slack | Settings → **Slack** | — |

The Agent is only in organizations that have it (early access, by
invitation). Everywhere else, the Agent row and these two Settings tabs are
hidden for everyone, whatever their role. The way to drive Elaichi with AI
there is the person's own client over the MCP endpoint — see the
**elaichi-clients** skill.

## Connections

| Task | Where | Guide |
|---|---|---|
| Authorize a new account | Connections → **Add connection** | [Connect an account](/guides/connections/connecting-an-account) |
| Check health, reconnect | Connections (`/connections`) | [Manage connections](/guides/connections/manage-connections) |
| Browse what a connection exposes | Connections → the connection (`/connections/<id>`) | [Manage connections](/guides/connections/manage-connections) |
| Share with a person, team, or everyone | The connection → **Manage access** | [Connect an account](/guides/connections/connecting-an-account) |
| Hand a connection to a colleague | **Manage access** → **Transfer ownership** | [Transfer and offboard](/guides/connections/transferring-and-offboarding) |
| Decide what happens when someone leaves | Settings → People → remove member | [Transfer and offboard](/guides/connections/transferring-and-offboarding) |

## Connectors

| Task | Where | Guide |
|---|---|---|
| Search the catalog, inspect a product's tools | Connectors (`/connectors/all`) — browsing only, there is no Connect button here | [Browse connectors](/guides/connectors/browse-connectors) |
| See the org's own connectors | Connectors → filter to **Custom only** (`/connectors/custom`) | [Build a custom connector](/guides/connectors/build-a-custom-connector) |
| Author a connector from scratch | **New connector** → **Build from config** | [Build a custom connector](/guides/connectors/build-a-custom-connector) |
| Add a remote MCP server as a connector | **New connector** → **Add remote MCP server** | — |
| Fork a catalog connector | The connector → **Fork** | [Share, fork, and pull](/guides/connectors/sharing-and-forking) |
| Turn methods into tools | The connector's documentation editor | [Build a custom connector](/guides/connectors/build-a-custom-connector) |
| Take upstream changes into a fork | The fork → **Pull from upstream** | [Share, fork, and pull](/guides/connectors/sharing-and-forking) |

## Toolboxes

| Task | Where | Guide |
|---|---|---|
| See your toolboxes | Toolboxes (`/toolboxes`) | [Use your toolboxes](/guides/toolboxes/toolboxes) |
| Build one, add entries, freeze parameters | Toolboxes → **New toolbox** | [Use your toolboxes](/guides/toolboxes/toolboxes) |
| Build a reusable design with no accounts | Toolboxes → Templates (`/toolboxes/templates`) | [Templates](/guides/toolboxes/templates) |
| Stamp your own toolbox from a template | The template → **Use this template** | [Templates](/guides/toolboxes/templates) |
| Chain several calls into one tool | Toolboxes → Synthetic tools (`/toolboxes/synthetic`) | [Synthetic tools](/guides/toolboxes/synthetic-tools) |
| Share, and understand what that delegates | The toolbox → **Manage access** | [How toolboxes work](/guides/toolboxes/overview) |

## Automation platform

All of these are *automation platform* screens. There are no docs guides for
them yet; the **elaichi-automations** and **elaichi-data** skills carry the
detail.

| Task | Where |
|---|---|
| See and build automations | **Automations** (`/automations`) → **New automation**, which starts from a sentence |
| Open one automation, its runs and settings | `/automations/<id>` |
| Review and publish a version | `/automations/<id>/publish` |
| Read one run, step by step | `/automations/<id>/runs/<runId>` |
| Follow a session across runs | `/automations/<id>/sessions/<sessionId>` |
| Approve or reject a paused step | **Approvals** (`/approvals`), with a badge counting what waits on you |
| Store and edit records | **Collections** (`/collections`, one at `/collections/<id>`, a table at `/collections/<id>/tables/<tableKey>`) |
| Build and view dashboards | **Dashboards** (`/dashboards` → **New dashboard**, one at `/dashboards/<id>`) |
| Edit a dashboard by hand | `/dashboards/<id>/edit` |
| Turn public dashboard links on or off | Settings → Organization → Automations → **Public links** |
| Keep documents agents search | **Knowledge** (`/knowledge` → **New knowledge base**, one at `/knowledge/<id>`) |
| Decide which web domains automations may fetch | Governance → **Web access** |
| See usage, set limits and payment controls | Governance → **Spend controls** (Usage, Limits, Payments) |

A public dashboard link opens at `https://app.elaichi.ai/p/<token>` with no
sign-in.

Some invited organizations also see **Apps** (`/apps`): packages of
automations, toolboxes, collections and dashboards that others install as their
own copies. It sits behind a switch of its own.

## Governance

Every member sees Governance. It opens on the first tab their permissions
allow.

| Task | Where | Guide |
|---|---|---|
| Allow or block connectors and tools | Governance → **Restrictions** (`/governance/restrictions`) | [Set restrictions](/guides/governance/set-restrictions) |
| See who did what | Governance → **Audit log** (`/governance/audit-logs`) — shown as **Your activity** to people without audit permission | [Read the audit log](/guides/governance/read-the-audit-log) |
| Ask for access to something you were refused | The refusal itself, or Governance → **Access requests** | — |
| Approve or deny someone's access request | Governance → **Access requests** (`/governance/access-requests`), with a badge on the sidebar row | — |
| Forward events to your own tooling | Settings → Logging | [Forward audit events](/guides/settings/logging) |

## Settings → People

People has its own pages, with Members, Roles and Teams tabs.

| Task | Where | Guide |
|---|---|---|
| Invite by email, manage pending invites | Settings → People (`/settings/people`) | [Invite and manage people](/guides/members/invite-and-manage-people) |
| Change someone's role | Settings → People → the member | [Roles and permissions](/guides/members/roles) |
| Create a custom role | Settings → People → Roles (`/settings/people/roles`) | [Roles and permissions](/guides/members/roles) |
| Group people | Settings → People → Teams (`/settings/people/teams`) | [Teams](/guides/members/teams) |
| Remove someone safely | Settings → People → remove member | [Transfer and offboard](/guides/connections/transferring-and-offboarding) |

## Settings

Settings is grouped into General, Access, Organization and Your account. Most
sections are `/settings?tab=<value>`.

| Section | `tab` | For | Guide |
|---|---|---|---|
| Organization | `organization` | Name, logo, slug, data region, organization id; the org's two-factor requirement and Elaichi support access; the Automations switch where offered; deleting the organization | [Organization profile](/guides/settings/organization-profile) |
| People | — | Its own pages, above | [Invite and manage people](/guides/members/invite-and-manage-people) |
| Billing | `plan` | Trial, subscription, payment | [Manage billing](/guides/settings/billing) |
| SSO and SCIM | `sso` | SAML or OIDC, enforcing it, SCIM users and groups, group-to-role mapping | [Set up single sign-on](/guides/settings/single-sign-on), [SCIM provisioning](/guides/sso/scim-provisioning) |
| Domains | `domains` | Prove you own an email domain so colleagues auto-join | [Verify a domain](/guides/settings/verify-a-domain) |
| API tokens | `tokens` | Tokens for scripts and integrations | [Create API tokens](/guides/settings/api-tokens) |
| Assistant | `assistant` | Model providers and models for the Elaichi Agent. Agent organizations only | [Assistant settings](/guides/settings/assistant) |
| Slack | `slack` | Connect a Slack workspace so people can tag `@Elaichi`. Agent organizations only | — |
| Notifications | `notifications` | Post events to Slack or email | [Send event notifications](/guides/settings/notifications) |
| Logging | `logging` | Forward audit events to Datadog, Splunk or Microsoft Sentinel. A Black feature, so it shows a lock on Gold | [Forward audit events](/guides/settings/logging) |
| Security | `security` | Your own two-factor and passkeys | [Secure your account](/guides/settings/security) |
| Connected apps | `connected-apps` | The AI clients you authorized, what they reach, and which toolboxes each may use (one app at `/settings/connected-apps/<id>`) | [Connected apps](/guides/settings/connected-apps) |
| Files | — | Files your tool calls produced (`/settings/files`) | — |

## Account and sign-in

| Task | Where | Guide |
|---|---|---|
| Create an account | [app.elaichi.ai](https://app.elaichi.ai) → sign up | [Create an account](/guides/basics/create-account) |
| Sign in | Google, a six-digit code sent by email, a passkey, or company SSO. There are no passwords | [Sign in](/guides/basics/sign-in) |
| Two-factor prompt | After sign-in, when enabled | [Two-factor sign-in](/guides/basics/two-factor-sign-in) |
| Re-confirm before a sensitive change | Wherever Elaichi asks "Confirm it's you" | [Confirming sensitive actions](/guides/basics/confirming-sensitive-actions) |
| Create an organization | After sign-in, or from the switcher | [Create an organization](/guides/basics/create-an-organization) |
| Accept an invite | The emailed link, or **Your invites** after signing in | [Accept an invite](/guides/basics/accept-an-invite) |
| Move between organizations | The sidebar switcher | [Switching organizations](/guides/basics/switching-organizations) |
| Approve an AI client | The consent screen the client opens (`/oauth/consent`) | [How it works](/guides/mcp-servers/how-it-works) |

## Connecting AI clients

| Task | Where | Guide |
|---|---|---|
| Copy your endpoint | The **Connect** row in the sidebar | [How it works](/guides/mcp-servers/how-it-works) |
| Add it to Claude | Claude → Settings → Connectors → **Add custom connector** | [Claude](/guides/mcp-servers/claude) |
| Add it to ChatGPT | ChatGPT → Settings → Apps → developer mode → **Create** | [ChatGPT](/guides/mcp-servers/chatgpt) |
| Add it to Cursor | `~/.cursor/mcp.json` | [Cursor](/guides/mcp-servers/cursor) |
| Review, narrow or revoke an authorized client | Settings → Connected apps | [Connected apps](/guides/settings/connected-apps) |

Other MCP clients and the full steps: the **elaichi-clients** skill.
