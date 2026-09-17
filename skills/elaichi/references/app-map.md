# App map

Every screen in [app.elaichi.ai](https://app.elaichi.ai), what it does, and the
guide behind it. Use this to answer "where do I do X?" without guessing.

Docs links are relative to `https://elaichi.ai/docs`.

**An area you lack permission for is hidden, not disabled.** If a screen is
missing for one person and present for another, that is roles — check
Settings → People.

## Getting around

| Thing | Where |
|---|---|
| Organization switcher | Top of the sidebar |
| Profile menu, sign out | Bottom of the sidebar |
| Command palette — navigate *and* create | **⌘K** / **Ctrl+K** |
| Show/hide sidebar | **⌘B** |
| Guide for the page you are on | **Help** in the header |
| Unsaved changes | A bar at the bottom of the screen — save or discard before navigating |

Guide: [Getting around](/guides/basics/getting-around)

## Connections

| Task | Where | Guide |
|---|---|---|
| Authorize a new account | Connections → **Add connection** | [Connect an account](/guides/connections/connecting-an-account) |
| Check health, reconnect | Connections | [Manage connections](/guides/connections/manage-connections) |
| Browse what a connection exposes | Connections → the connection → tools | [Manage connections](/guides/connections/manage-connections) |
| Share with a person, team, or everyone | Connections → **Manage access** | [Connect an account](/guides/connections/connecting-an-account) |
| Hand a connection to a colleague | Connections → **Transfer** | [Transfer and offboard](/guides/connections/transferring-and-offboarding) |
| Decide what happens when someone leaves | Settings → People → remove member | [Transfer and offboard](/guides/connections/transferring-and-offboarding) |

## Connectors

| Task | Where | Guide |
|---|---|---|
| Search the catalog, inspect a product's tools | Connectors — browsing only, there is no Connect button here | [Browse connectors](/guides/connectors/browse-connectors) |
| Author a connector from scratch | Connectors → **New connector** | [Build a custom connector](/guides/connectors/build-a-custom-connector) |
| Fork a catalog connector | Connectors → the connector → **Fork** | [Share, fork, and pull](/guides/connectors/sharing-and-forking) |
| Turn methods into tools | The connector's documentation editor | [Build a custom connector](/guides/connectors/build-a-custom-connector) |
| Take upstream changes into a fork | The fork → **Pull from upstream** | [Share, fork, and pull](/guides/connectors/sharing-and-forking) |

## Toolboxes

| Task | Where | Guide |
|---|---|---|
| See your toolboxes | Toolboxes | [Use your toolboxes](/guides/toolboxes/toolboxes) |
| Build one, add entries, freeze parameters | Toolboxes → **New toolbox** | [Use your toolboxes](/guides/toolboxes/toolboxes) |
| Build a reusable design with no accounts | Toolboxes → Templates | [Templates](/guides/toolboxes/templates) |
| Stamp your own toolbox from a template | The template → **Use** | [Templates](/guides/toolboxes/templates) |
| Chain several calls into one tool | Toolboxes → Synthetic tools | [Synthetic tools](/guides/toolboxes/synthetic-tools) |
| Share, and understand what that delegates | The toolbox → **Manage access** | [How toolboxes work](/guides/toolboxes/overview) |

## MCP Servers

| Task | Where | Guide |
|---|---|---|
| Copy your endpoint | **Connect your AI client** | [How it works](/guides/mcp-servers/how-it-works) |
| Add it to Claude | Claude → Settings → Connectors → Add custom connector | [Claude](/guides/mcp-servers/claude) |
| Add it to ChatGPT | ChatGPT developer mode → create an app | [ChatGPT](/guides/mcp-servers/chatgpt) |
| Add it to Cursor | `~/.cursor/mcp.json` | [Cursor](/guides/mcp-servers/cursor) |
| Review or revoke an authorized client | Settings → Connected apps | [Connected apps](/guides/settings/connected-apps) |

## Governance

| Task | Where | Guide |
|---|---|---|
| Allow or block connectors and tools | Governance → Restrictions | [Set restrictions](/guides/governance/set-restrictions) |
| See who did what | Governance → Audit log | [Read the audit log](/guides/governance/read-the-audit-log) |
| Ask for access to something you were refused | The refusal itself, or Governance → Access requests | — |
| Approve or deny someone's access request | Governance → Access requests | — |
| Forward events to your own tooling | Settings → Logging | [Forward audit events](/guides/settings/logging) |

## Settings → People

| Task | Where | Guide |
|---|---|---|
| Invite by email, manage pending invites | Settings → People | [Invite and manage people](/guides/members/invite-and-manage-people) |
| Change someone's role | Settings → People → the member | [Roles and permissions](/guides/members/roles) |
| Create a custom role | Settings → People → Roles | [Roles and permissions](/guides/members/roles) |
| Group people | Settings → People → Teams | [Teams](/guides/members/teams) |
| Remove someone safely | Settings → People → remove member | [Transfer and offboard](/guides/connections/transferring-and-offboarding) |

## Settings

| Tab | For | Guide |
|---|---|---|
| Organization | Name, short URL name, logo | [Organization profile](/guides/settings/organization-profile) |
| Domains | Prove you own an email domain so colleagues auto-join | [Verify a domain](/guides/settings/verify-a-domain) |
| Single sign-on | SAML or OIDC, and enforcing it | [Set up single sign-on](/guides/settings/single-sign-on) |
| Single sign-on → provisioning | SCIM users and groups, group-to-role mapping | [SCIM provisioning](/guides/sso/scim-provisioning) |
| Security | Two-factor, passkeys | [Secure your account](/guides/settings/security) |
| API tokens | Tokens for scripts and integrations | [Create API tokens](/guides/settings/api-tokens) |
| Connected apps | Which AI clients you authorized, and what they reach | [Connected apps](/guides/settings/connected-apps) |
| Logging | Forward audit events to Datadog and friends | [Forward audit events](/guides/settings/logging) |
| Notifications | Post events to Slack or email | [Send event notifications](/guides/settings/notifications) |
| Plan | Trial, subscription, payment | [Manage billing](/guides/settings/billing) |

## Account and sign-in

| Task | Where | Guide |
|---|---|---|
| Create an account | [app.elaichi.ai](https://app.elaichi.ai) → sign up | [Create an account](/guides/basics/create-account) |
| Sign in | Google, GitHub, Microsoft, a magic link, or company SSO | [Sign in](/guides/basics/sign-in) |
| Two-factor prompt | After sign-in, when enabled | [Two-factor sign-in](/guides/basics/two-factor-sign-in) |
| Re-confirm before a sensitive change | Wherever Elaichi asks | [Confirming sensitive actions](/guides/basics/confirming-sensitive-actions) |
| Create an organization | After sign-in, or from the switcher | [Create an organization](/guides/basics/create-an-organization) |
| Accept an invite | The emailed link | [Accept an invite](/guides/basics/accept-an-invite) |
| Move between organizations | The sidebar switcher | [Switching organizations](/guides/basics/switching-organizations) |

## Agent

There is an in-app chat agent, but **it is not available to customer
organizations yet** — it ships to Elaichi's own platform organization and
nowhere else, so the sidebar row and the Settings → Assistant tab are hidden
for everyone else regardless of role.

If somebody asks for it, the honest answer is that the way to drive Elaichi
with AI today is their own client over the MCP endpoint — see the
**elaichi-clients** skill.
