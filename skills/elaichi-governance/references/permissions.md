# Roles and permissions

## The eight built-in roles

System roles are immutable — no edits, no deletes — and at least one person
must always hold Org Owner.

Six form a strict subset chain. Each is the one before it plus one capability,
so every role is a complete persona rather than a fragment.

```
Guest ⊂ Member ⊂ Team Admin ⊂ People Admin ⊂ Org Admin ⊂ Org Owner
```

| Role | Seat | Holds |
|---|---|---|
| **Guest** | Free | `connector:view` only |
| **Member** | Billable | `connector:view`, `connection:create`, `connection:share`, `template:create`, `template:share`, `toolbox:create`, `toolbox:share`, `tool:execute`, `api_token:create` |
| **Team Admin** | Billable | Member plus `team:manage` |
| **People Admin** | Billable | Team Admin plus `member:manage` |
| **Org Admin** | Billable | Everything except `billing:manage` and `org:delete` |
| **Org Owner** | Billable | Everything |

Two stand outside the chain:

| Role | Seat | Holds |
|---|---|---|
| **Billing Admin** | Free | `billing:view`, `billing:manage` — no workspace or product access at all |
| **Auditor** | Free | Read-only everywhere: `billing:view`, `connector:view`, `connection:view`, `template:view`, `toolbox:view`, `restriction:view`, `api_token:view`, `sso:view`, `logging:view`, `notification:view`, `audit:view` |

**Roles are exclusive — one per person.** New members default to **Member**.

Note that Guest, Auditor and Billing Admin lack `tool:execute`, which gates the
MCP endpoint entirely: for them `tools/list` is empty whatever scopes they
grant a client.

## The permission catalog

### Organization

| Permission | Meaning |
|---|---|
| `org:manage` | Edit organization name, slug, logo, and verified domains |
| `org:delete` | Permanently delete the organization and everything in it. Org Owner only |
| `team:manage` | Create and edit teams, and manage who belongs to them |
| `member:manage` | Invite people, change roles, and remove members |
| `role:manage` | Create custom roles and choose which permissions they include |

### Billing

| Permission | Meaning |
|---|---|
| `billing:view` | View plan, subscription, and billable-seat details |
| `billing:manage` | Start checkout and manage the subscription |

### Connectors

| Permission | Meaning |
|---|---|
| `connector:view` | View the connector catalog |
| `connector:create` | Author custom connectors. **The one high-trust permission** |
| `connector:share` | Share custom connectors with teams or everyone |
| `connector:manage` | Edit or delete others' custom connectors, and set the org's own OAuth application for a connector |

`connector:create` is marked high-trust for a specific reason: restrictions
bind a connector's slug and its declared fork lineage, **not the host it
dials**. A newly authored connector aimed at a blocked API is not caught by
them. Treat it as an administrative permission, not a builder convenience.

### Connections

| Permission | Meaning |
|---|---|
| `connection:view` | *Reserved — grants nothing today. Putting it in a custom role has no effect: connection visibility comes from a sharing grant, never from a permission* |
| `connection:create` | Connect accounts for your own use |
| `connection:share` | Connect accounts shared with a team or everyone |
| `connection:manage` | Reconnect, edit or delete a connection you own or hold an `edit` grant on |

`connection:manage` **reaches no connection you have no grant on.** A private
connection stays private from every permission holder, Org Owner included.

### Templates

| Permission | Meaning |
|---|---|
| `template:view` | *Reserved — grants nothing today. Template visibility comes from ownership or a sharing grant* |
| `template:create` | Create templates and add tools to them |
| `template:share` | Share templates with members, teams, or everyone |
| `template:manage` | Edit or delete a template you own or hold `edit` on |

### Toolboxes

| Permission | Meaning |
|---|---|
| `toolbox:view` | View organization-wide synthetic tool definitions. **Not** toolbox visibility, despite the name — that comes from ownership or a grant |
| `toolbox:create` | Create toolboxes — from a template or from scratch — and bind connections |
| `toolbox:share` | Share toolboxes with members, teams, or everyone |
| `toolbox:manage` | Edit or delete a toolbox you own or hold `edit` on, and manage org-wide synthetic tool definitions |

### Governance

| Permission | Meaning |
|---|---|
| `restriction:view` | View access restrictions |
| `restriction:manage` | Limit which connectors and tools roles or members can use |
| `restriction:override` | Create person-level exceptions that replace role-level rules |
| `audit:view` | See privileged actions across the organization |

### Tool execution

| Permission | Meaning |
|---|---|
| `tool:execute` | Run connected-account and synthetic tools. **Gates the whole MCP endpoint** |

### Assistant

| Permission | Meaning |
|---|---|
| `assistant:manage` | Configure provider keys, models, and assistant settings |

### API tokens

| Permission | Meaning |
|---|---|
| `api_token:view` | View organization API token metadata |
| `api_token:create` | Create, list and revoke your own tokens |
| `api_token:manage` | Revoke other members' tokens |

### SSO and identity

| Permission | Meaning |
|---|---|
| `sso:view` | View SSO, SCIM, and group-mapping configuration |
| `sso:manage` | Configure SAML/OIDC SSO, SCIM tokens, and group-to-role mappings |

### Logging and notifications

| Permission | Meaning |
|---|---|
| `logging:view` | View logging destinations |
| `logging:manage` | Forward organization events to Datadog or other sinks |
| `notification:view` | View notification destinations |
| `notification:manage` | Send organization events to Slack or email |

## Custom roles

`role:manage`, on a paid plan — Gold and Black both include custom roles.
Build from the catalog
above; edits apply live to everyone holding the role.

**You cannot grant a role or a permission you do not hold yourself.** The
backend enforces this independently of what the UI drew, because a UI-only cap
is an escalation hole rather than a cap.

A role above your own still appears in the picker, **disabled with a reason**,
rather than being hidden. That is deliberate: the list of roles genuinely
exists, and hiding entries would make it read as truncated.

## Sharing grants, and how they combine with permissions

Separate from roles. Four resource types are shareable — **connections,
toolboxes, templates, custom connectors** — to a **user**, a **team**, or the
whole **organization**.

| Level | Allows |
|---|---|
| `view` | See it exists, read its metadata and configuration |
| `use` | View, plus exercise it — run a toolbox's tools, run through a connection, stamp from a template, connect from a connector |
| `edit` | Use, plus change its settings, its entries, **and its grants**. Still cannot delete or transfer |
| *owner* | Implicit top. Edit, plus **delete** and **transfer**. Always exactly one person |

Re-granting to the same grantee **replaces** the level rather than stacking.
When several grants apply, the highest wins.

The two layers combine like this: **a grant decides whether you can reach the
resource; a permission decides whether you may perform the class of action.**
Sharing a toolbox needs `toolbox:share` *and* `edit` standing on the toolbox.
Neither is sufficient alone.

Visibility has no exceptions: you see a resource if you own it or a grant
applies. Organization permissions are not part of that test, and a resource
you cannot see returns "not found" rather than "forbidden".

You can never grant a resource to yourself as its owner — the owner column and
a grant row would say two different things about one person — and a grantee
picker never offers you.

## Team admins

A team admin is always already a member of that team.

| A team admin may | A team admin may not |
|---|---|
| Rename and edit the team | Delete the team |
| Add ordinary members | Appoint or demote admins |
| Remove ordinary members | Remove another team admin |

Deleting a team, and promoting or demoting admins, need the org-wide
`team:manage`.

**Administering a team confers nothing on any resource shared with that team.**
A resource granted `view` to a team is `view` for its admins too.
