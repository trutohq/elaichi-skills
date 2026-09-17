---
name: elaichi-governance
description: Decide and explain who can reach what in Elaichi — the eight built-in roles and the full permission catalog, restrictions that allow or block connectors and tools, access requests, the audit log, and SSO with SCIM provisioning.
whenToUse: Someone asks who can do what, why an action was refused, how to block a connector or tool, what a role grants, how to read the audit log, or how to set up SSO or SCIM.
---

# Governance

Two different questions, answered by two different mechanisms. Keeping them
apart solves most confusion here:

- **"What may this person do *to* Elaichi?"** → **roles**, built from
  permissions. Invite people, create toolboxes, view the audit log.
- **"What may this person reach *through* Elaichi?"** → **restrictions**.
  Which connectors and tools, enforced everywhere including MCP.

A third layer sits underneath both: **sharing grants** on individual
connections, toolboxes, templates and connectors. A permission never
substitutes for a grant — `connection:manage` lets you manage a connection you
hold a grant on, and reaches no connection you do not.

## Roles

Eight ship with every organization. Six form a strict chain, each one the
previous plus one capability:

```
Guest ⊂ Member ⊂ Team Admin ⊂ People Admin ⊂ Org Admin ⊂ Org Owner
```

| Role | Adds |
|---|---|
| **Guest** | Browse the connector catalog. Nothing else. A free seat. |
| **Member** | The default. Connect accounts, build and share toolboxes and templates, run tools, make API tokens. |
| **Team Admin** | Create and manage teams. |
| **People Admin** | Invite, edit and remove members; assign roles. |
| **Org Admin** | Everything else — restrictions, SSO, custom roles, logging, audit. |
| **Org Owner** | Billing, and deleting the organization. |

Two sit off the chain as standalone personas, both free seats:

| Role | For |
|---|---|
| **Billing Admin** | Billing only. No workspace or product access. |
| **Auditor** | Read-only visibility everywhere, for compliance. |

**Roles are exclusive — exactly one per person.** Org Admins can define custom
roles from the permission catalog, and edits apply live to everyone holding
the role.

Two limits the backend enforces:

- **You cannot grant a role or permission you do not hold yourself.** The
  backend enforces the cap independently of whatever the UI drew.
- **Org Owner cannot be removed from its last holder.**

The full permission catalog — every string, what it means, which roles carry
it — is in [Roles and permissions](./references/permissions.md).

## Restrictions

An allowlist or blocklist over **connectors** and **individual tools**,
targeted at a **role** or a **specific person**. Governance → Restrictions,
gated by `restriction:manage`.

**Resolution:** `a person's own rule > their role's rules > the organization
default`. No applicable rule means everything is allowed. Within the role
layer, allows union, blocks union, and **a block always beats an allow**. A
person-targeted rule **replaces the role layer entirely** for them — it can
loosen or tighten.

Targeting a specific person additionally needs `restriction:override`. The
escape hatch is itself a permission.

**Enforced at four moments**, which is what makes restrictions meaningful
rather than advisory:

1. **Connect** — you cannot create a connection to a blocked connector.
2. **Save** — a synthetic tool step naming a blocked tool is rejected.
3. **Advertise** — a blocked tool never appears in any tool list, including
   `tools/list` over MCP.
4. **Execute** — a direct call on a blocked tool is refused, and the outbound
   request itself is checked.

**A blocked tool goes missing rather than failing.** An agent cannot be tempted
by a tool it never sees — but it also cannot tell a restricted tool from one
the connector never had, which is why diagnosing a missing tool has a set
order.

Changes propagate within about a minute, occasionally two at a distant edge.

The allow/block semantics have one genuinely surprising corner — an allow rule
naming nothing denies **everything** — and it is worth reading the truth table
before writing your first rule:
[Restrictions](./references/restrictions.md).

Two self-dealing refusals you may hit as an admin, both deliberate:

- You cannot create or edit a **role-targeted** rule whose role has exactly
  your own permission set.
- You cannot create or edit a rule **targeting yourself** while you are
  currently restricted by a rule that is not yours to lift. Ask another admin.

## Access requests

Any member can ask for access to something they were refused. No permission is
needed to ask — a permission to request a permission would deadlock.

A request names the tool or connector and why it was refused (a missing
**permission**, or a **restriction**). Repeated asks for the same thing
de-duplicate into the existing pending request rather than piling up.

Resolving needs `member:manage`, and **an admin may not resolve their own
request.**

Approval usually just records a decision. The exception: approving a
**restriction** request for a **connector** actually lifts that restriction,
for that requester alone and nobody else —
[Restrictions](./references/restrictions.md#access-requests) has the mechanism.

Over MCP that particular approval is refused and points at the console.
Lifting a restriction is a console decision.

## The audit log

Append-only, per organization, gated by `audit:view`. Governance → Audit log.

It covers membership, invites, roles, teams, connections and transfers,
toolboxes and shares, **tool calls**, restrictions, SSO and SCIM changes,
connector authoring, logging destinations, and authentication including failed
sign-ins and MFA lockouts. Filter by actor, action, category, resource and
time.

Categories: `auth`, `assistant`, `mcp`, `toolbox`, `connection`, `access`,
`org`, `other`.

**Every row carries `actor_kind`, so an action taken by an AI is a recorded
field rather than an inference.** Assistant and MCP tool calls record
`ai_assistant`, along with the conversation, the model, and the id of any
third-party record they created. This is the honest answer when someone asks
whether their admin can see what an agent did: yes, in detail.

Rows are eventually consistent — one may take a moment to appear after the
action.

Events can also be forwarded to your own observability tooling from
**Settings → Logging** (`logging:manage`). Each destination picks which event
types it wants: `tool_call`, `auth`, `admin`. Datadog delivery is fully
supported. Delivery is asynchronous and batched, with retries and a
dead-letter queue.

Forwarding starts from the moment you configure it — it does not backfill. Set
it up early.

## SSO and SCIM

## Notifications

Separate from audit forwarding, and for people rather than for a log store.
**Settings → Notifications**, gated by `notification:manage`.

A destination is a Slack channel — set up either through an **Add to Slack**
flow or by pasting an incoming-webhook URL — or an email address. Member,
connection and governance events are posted as they happen, and each
destination has a test send so you can prove it works before relying on it.

The usual reason to set one up early: you want to hear that a connection broke
from Slack, not from the person whose agent stopped working.

**Single sign-on** — SAML or OIDC, configured under Settings, gated by
`sso:manage`. Connections start inactive and can be verified before you bind a
domain to them. Okta, Entra ID, Google Workspace and anything else generic work
through the same two surfaces.

**Verified domains** — prove you own an email domain by DNS TXT record, and it
can then (a) auto-join new users with a configurable default role and (b) bind
to an SSO connection so email resolves to the right identity provider at the
login screen.

**Enforced SSO** — flip a verified domain to enforced and social login and
magic links are refused for its users. Only the bound identity provider works.
First sign-in provisions the user.

**SCIM** — Users and Groups, authenticated by SCIM tokens you mint per
organization. Your directory creates, updates and deactivates members
automatically. Deactivation removes membership.

**Group mappings** — map identity-provider groups to Elaichi roles.
Membership follows as groups change.

## Explaining a refusal

Elaichi's refusals are written for the person reading them and already name
the permission in their own vocabulary:

> You need the "Manage teams" permission (`team:manage`) to manage this team.

Three rules when relaying one:

1. **Pass the message through unchanged**, and name the permission.
2. **Do not look for another route to the same effect.** That is precisely the
   failure mode this layer exists to prevent.
3. **A `404` may mean "not yours" rather than "gone".** Resources you have no
   grant on are concealed rather than refused, deliberately.

One more thing to expect in the UI, because it looks inconsistent until you
know the rule. An action you could **never** take on a resource is **absent**,
not greyed out — a `use` grantee sees no "Manage access" entry at all. But a
grant you are **not senior enough to make** — a role above your own — stays
**visible and disabled with a reason**, because that option belongs to a list
that genuinely exists and hiding it would make the list read as truncated.

Hiding says "this was never yours". Disabling says "not at your level".

## References

| Document | Topics |
|---|---|
| [Roles and permissions](./references/permissions.md) | Every permission string with its meaning, the eight roles and what each holds, custom roles, and the sharing levels |
| [Restrictions](./references/restrictions.md) | Allow versus block, the empty-set truth table, precedence, the four enforcement points, and what a blocked call looks like |

## Companion skills

- **elaichi-mcp** — diagnosing a missing tool, and OAuth scopes.
- **elaichi-connections** — connection grants, transfer, offboarding.
- **elaichi-toolboxes** — what sharing a toolbox at `use` delegates.
