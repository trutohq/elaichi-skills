# Roles and permissions

## The eight built-in roles

Built-in roles cannot be edited or deleted, and at least one member must always
hold Org Owner.

Six form a strict chain. Each holds everything the one below it holds, plus
more:

```
Guest ⊂ Member ⊂ Team Admin ⊂ People Admin ⊂ Org Admin ⊂ Org Owner
```

| Role | Seat | Holds |
|---|---|---|
| **Guest** | Free | `connector:view` only (1) |
| **Member** | Billable | The everyday set (23), listed below |
| **Team Admin** | Billable | Member plus `team:manage` (24) |
| **People Admin** | Billable | Team Admin plus `member:manage` (25) |
| **Org Admin** | Billable | Every permission except `billing:manage` and `org:delete` (56 of 58) |
| **Org Owner** | Billable | All 58 |

**Member** holds: `connector:view`, `connection:create`, `connection:share`,
`template:create`, `template:share`, `toolbox:create`, `toolbox:share`,
`team:create`, `tool:execute`, `api_token:create`, `automation:create`,
`automation:share`, `automation:publish`, `collection:create`,
`collection:share`, `dashboard:create`, `dashboard:share`, `dashboard:publish`,
`knowledge:create`, `knowledge:share`, `bundle:create`, `bundle:share`,
`bundle:install`.

Two stand outside the chain, both free seats:

| Role | Holds |
|---|---|
| **Billing Admin** | `billing:view`, `billing:manage`, `spend:view`, `spend:manage`. No workspace or product access. |
| **Auditor** | Read-only: `billing:view`, `connector:view`, `toolbox:view`, `restriction:view`, `api_token:view`, `sso:view`, `logging:view`, `notification:view`, `audit:view`, `spend:view` (10) |

- **One role per person.** Asking for two is refused. To combine permissions,
  build a custom role.
- **New members get Member** when they join through a verified domain, SSO or
  SCIM and nothing else is configured. An invite names its role.
- **Free seats**: Guest, Billing Admin and Auditor do not count as billable
  seats. Every custom role does.
- **Guest, Billing Admin and Auditor lack `tool:execute`**, which every MCP tool
  call needs. Their AI clients get an empty tool list: no connected tools and no
  `elaichi__` operations. They can still see
  their own activity in the audit log in the console.
- **Org Admin cannot delete the organization or manage the subscription.** That
  is on purpose: a compromised admin account cannot delete the evidence along
  with the workspace.

## The permission catalog

58 permissions. The console's label is in brackets.

Some families appear in the role editor only when the organization has the
feature: the automation family (`automation:*`, `collection:*`, `dashboard:*`,
`knowledge:*`, `spend:*`) only where automations are turned on, and `bundle:*`
(apps) only when apps are available. A role can still store them.

### Organization

| Permission | Meaning |
|---|---|
| `org:manage` (Manage organization) | Edit the organization's name, logo and verified domains, and decide whether Elaichi support may sign in as members. The slug is fixed at creation. |
| `org:delete` (Delete organization) | Permanently delete the organization and everything in it. Org Owner only. |
| `team:create` (Create teams) | Create a team. The creator becomes its administrator. |
| `team:manage` (Manage teams) | Create, edit and delete any team, and manage its members and administrators, including teams you are not on. Can remove a team's last administrator. |
| `member:manage` (Manage members) | Invite people, change roles, remove members, and decide access requests. |
| `role:manage` (Manage roles) | Create custom roles and choose their permissions. |

### Billing

| Permission | Meaning |
|---|---|
| `billing:view` (View billing) | See plan, subscription and billable-seat details. |
| `billing:manage` (Manage billing) | Start checkout and manage the subscription. |

### Connectors

| Permission | Meaning |
|---|---|
| `connector:view` (Browse connectors) | See the connector catalog. |
| `connector:create` (Create connectors) | Author custom connectors. **High trust** (see below), one of three with `dashboard:publish` and `bundle:share_external`. |
| `connector:share` (Share connectors) | Share custom connectors with teams or everyone. |
| `connector:manage` (Manage connectors) | Edit or delete other members' custom connectors, and set the organization's own OAuth app for a connector. |

**Why `connector:create` is high trust.** A connector can point anywhere.
Restrictions bind a connector's identity (its slug and the forks that declare
descent from it), **never the host it calls**. So a new connector aimed at an
already-blocked API is not caught. The role editor tags it "High trust". Treat
it as an admin permission, not a builder convenience.

### Connections

| Permission | Meaning |
|---|---|
| `connection:create` (Create personal connections) | Connect accounts for your own use. |
| `connection:share` (Create shared connections) | Connect accounts shared with a team or everyone. |
| `connection:manage` (Manage connections you have access to) | Reconnect, edit or delete a connection you own or hold `edit` on (including through a team you administer). |

`connection:manage` **reaches no connection you have no grant on.** A private
connection stays private from every permission holder, Org Owner included.

### Templates and toolboxes

| Permission | Meaning |
|---|---|
| `template:create` (Create templates) | Create templates and add tools to them. |
| `template:share` (Share templates) | Share templates. |
| `template:manage` (Manage templates you have access to) | Edit or delete a template you own or hold `edit` on. |
| `toolbox:create` (Create toolboxes) | Create toolboxes, from a template or from scratch, and bind connections. Also what creating a synthetic tool needs. |
| `toolbox:share` (Share toolboxes) | Share toolboxes. |
| `toolbox:manage` (Manage toolboxes you have access to) | Edit or delete a toolbox you own or hold `edit` on. |
| `toolbox:view` (View synthetic tool definitions) | Grants nothing today: synthetic tools are visible only to their owner, whatever permission someone holds. |

### Governance

| Permission | Meaning |
|---|---|
| `restriction:view` (View restrictions) | See restriction rules and the web access policy. |
| `restriction:manage` (Manage restrictions) | Create, edit and delete restriction rules, and change the web access policy. |
| `restriction:override` (Override restrictions) | Also needed for a rule aimed at one member. |
| `audit:view` (View audit log) | See every event in the organization. Without it, everyone still sees their own activity. |
| `spend:view` (View spend and usage) | See usage meters, limits and payment caps. |
| `spend:manage` (Manage usage limits and payment caps) | Set, change and remove usage limits and payment caps. |

### Tool execution and assistant

| Permission | Meaning |
|---|---|
| `tool:execute` (Execute tools) | Run connected-account and synthetic tools. Needed for every tool call from an AI client. |
| `assistant:manage` (Manage assistant) | Configure the Elaichi agent's model keys, models and settings. |

### API tokens

| Permission | Meaning |
|---|---|
| `api_token:view` (View all API tokens) | See organization API token metadata. |
| `api_token:create` (Create personal API tokens) | Create, list and revoke your own tokens. |
| `api_token:manage` (Manage all API tokens) | Revoke other members' tokens. |

### SSO, logging and notifications

| Permission | Meaning |
|---|---|
| `sso:view` (View SSO and SCIM) | See SSO, SCIM and group-mapping settings. |
| `sso:manage` (Manage SSO and SCIM) | Configure SAML/OIDC SSO, SCIM tokens and group-to-role mappings. |
| `logging:view` (View logging destinations) | See logging destinations. |
| `logging:manage` (Manage logging destinations) | Forward organization events to Datadog or other log services. |
| `notification:view` (View notification destinations) | See notification destinations. |
| `notification:manage` (Manage notification destinations) | Send organization events to Slack or email. |

### Automations, collections, dashboards and knowledge

| Permission | Meaning |
|---|---|
| `automation:create` | Create automations, and edit, run, publish a read-only version of, or delete the ones you own or can edit. |
| `automation:publish` | Publish any version of automations you own or can edit, including ones that write, delete, or start from a webhook or Slack message. Destructive steps still need an `approve` step before them. |
| `automation:share` | Share automations. |
| `automation:manage` | Everything above, plus reach automations beyond the ones you own or can edit. |
| `collection:create` / `collection:share` / `collection:manage` | Create collections; share them; change the schema or settings of ones you can edit. |
| `dashboard:create` / `dashboard:share` / `dashboard:manage` | Create dashboards; share them; change ones you can edit. |
| `dashboard:publish` | Publish a dashboard you can edit to a public link. **High trust.** Works only after an admin turns public links on for the organization (off by default, needs `org:manage`). |
| `knowledge:create` / `knowledge:share` / `knowledge:manage` | Create knowledge bases; share them; change ones you can edit. |

The `:manage` permissions here, like every other, do not reach a resource you
hold no grant on. More in
[elaichi-automations](../../elaichi-automations/SKILL.md) and
[elaichi-data](../../elaichi-data/SKILL.md).

### Apps

| Permission | Meaning |
|---|---|
| `bundle:create` / `bundle:share` / `bundle:manage` | Create apps; share them; edit or publish ones you can edit. |
| `bundle:install` | Install an app you can see, and manage the installs you made. |
| `bundle:share_external` | Create install links that let another organization install a copy. **High trust.** Not in Member. |

## Custom roles

`role:manage`, plus a plan with custom roles (Gold and Black both include
them). Build from the catalog above. Edits reach everyone holding the role within
about two minutes.

- **You cannot grant a role or a permission you do not hold yourself.** The
  backend enforces this whatever the screen drew, because a cap only in the UI
  is an escalation hole.
- **A role above your own still appears in the picker, disabled with a
  reason.** The list really exists, and hiding entries would make it look cut
  short.
- **Deleting a role** needs everyone holding it (and pending invites for it)
  moved to another role in the same step. A role a SCIM group mapping assigns
  cannot be deleted until the mapping changes.
- Over MCP and in the Elaichi agent, roles can be created and edited, but
  assigning a role to a person (`member.set_roles`) and deleting a role are
  refused: they need a person to confirm it is them in the console.

## Sharing grants, and how they combine with permissions

Separate from roles. Connections, toolboxes, templates, custom connectors and
files are shared through one kind of grant, to a **user**, a **team**, or the
whole **organization**. Automations, collections, dashboards, knowledge bases
and apps are shared the same way where the organization has them.

| Level | Allows |
|---|---|
| `view` | See it and its settings |
| `use` | Also exercise it: run a toolbox's tools, run through a connection, stamp from a template, connect from a connector |
| `edit` | Also change it and its entries, and share it (sharing also needs the resource's `:share` permission). Still cannot delete or transfer. |
| *owner* | Also delete and transfer. Always exactly one person. |

Re-granting to the same grantee **replaces** the level. When several grants
apply, the highest wins.

**A grant decides whether you can reach the resource. A permission decides
whether you may do that class of action.** Sharing a toolbox needs
`toolbox:share` *and* `edit` on the toolbox. Neither is enough alone.

Visibility has no exceptions: you see a resource if you own it or a grant
applies. No organization permission widens a list, Org Owner included. A
resource you cannot see answers "not found" rather than "forbidden". Only the
owner and `edit` holders can see who else a resource is shared with.

A grantee picker never offers you, and you can never grant a resource to
yourself.

## Teams

Anyone with `team:create` (Member and up) can create a team and becomes its
administrator.

| A team administrator may | Only `team:manage` may |
|---|---|
| Rename and describe the team | Manage teams they do not administer |
| Add and remove members | Remove a team's last administrator |
| Appoint and demote administrators | |
| Delete the team | |

- Anyone can leave a team they belong to. A team's last administrator cannot
  leave until they appoint another.
- **Administering a team confers nothing on resources shared with that team.**
  A resource granted `view` to a team is `view` for its administrators too.
- Joining through SCIM, a verified domain or SSO adds nobody to a team.
