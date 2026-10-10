---
name: elaichi-governance
description: Decide and explain who can reach what in Elaichi — the eight built-in roles and 58 permissions, custom roles, restrictions that allow or block connectors and tools, access requests, approvals, the audit log, SSO, SCIM, verified domains and offboarding. Use for "why was this refused", "block a tool", "what can this role do", "who did this" or "remove a member".
whenToUse: Someone asks who can do what, why an action was refused, how to block or allow a connector or tool, what a role grants, how access requests or approvals work, how to read the audit log, how to set up SSO, SCIM or domains, or how to offboard someone.
---

# Governance

Two different questions, answered by two different mechanisms. Keeping them
apart solves most confusion here:

- **"What may this person do *to* Elaichi?"** → **roles**, built from
  permissions. Invite people, create toolboxes, read the whole audit log.
- **"What may this person reach *through* Elaichi?"** → **restrictions**.
  Which connectors and tools, enforced everywhere, MCP included.

A third layer sits under both: **sharing grants** on single resources. A
permission never stands in for a grant. `connection:manage` lets you manage a
connection you hold a grant on, and reaches no connection you do not. No
permission widens what you can see, Org Owner included.

## Roles

Eight ship with every organization. Six form a strict chain, each the one below
plus more:

```
Guest ⊂ Member ⊂ Team Admin ⊂ People Admin ⊂ Org Admin ⊂ Org Owner
```

| Role | Adds |
|---|---|
| **Guest** | Browse the connector catalog. Nothing else. A free seat. |
| **Member** | The default. Connect accounts, build and share toolboxes and templates, run tools, create teams, make API tokens, and build automations, collections, dashboards and knowledge where the org has them. |
| **Team Admin** | Manage every team, including ones they do not run. |
| **People Admin** | Invite, change roles, remove members, decide access requests. |
| **Org Admin** | Everything else: restrictions, SSO, custom roles, logging, the whole audit log. |
| **Org Owner** | Billing, and deleting the organization. |

Two sit off the chain, both free seats:

| Role | For |
|---|---|
| **Billing Admin** | Billing and spend controls only. No workspace or product access. |
| **Auditor** | Read-only oversight: restrictions, SSO, logging, the whole audit log. |

- **One role per person.** To combine two roles, build a custom role
  (`role:manage`; Gold and Black both include custom roles).
- **You cannot grant a role or permission you do not hold yourself.** The
  backend enforces it whatever the screen drew.
- **Org Owner cannot be removed from its last holder.**
- Role changes reach people within about two minutes.

Every permission string, what it means and which roles hold it:
[Roles and permissions](./references/permissions.md).

## Restrictions

An allow list or block list over **connectors** and **single tools**, aimed at
a **role** or one **member**. **Governance → Restrictions**, `restriction:manage`.

- **No rule reaches a member → nothing is restricted.** Elaichi is open by
  default.
- **A member is bound by their role's rules and their own rules at once.** Both
  must admit a tool. A member's own rule can only **narrow** what the role
  allows. It never loosens it.
- **Within a layer, a block always beats an allow.**
- **An allow rule that names nothing blocks everything.** Once a role has any
  allow rule, everything it does not name is blocked. Read the truth table
  before writing your first allow rule.
- Changes reach every surface within about two minutes.

**A restricted tool is never offered as callable, but it does not vanish
silently.** `search_tools` lists it by name, flagged `restricted`. A toolbox
entry shows `restricted: true` with `restricted_by` (`role` or `user`). A
refused call says it is restricted "for your role" or "for your account" and
carries `request_access`, the exact arguments for an access request.

**No AI surface can change a restriction.** MCP clients and the Elaichi agent can
only read them, with `restriction:view`.

Truth table, enforcement points, self-dealing refusals and policy design:
[Restrictions and access requests](./references/restrictions.md).

## Access requests

Anyone refused can ask. **No permission is needed to ask.** From an AI client,
call `elaichi__access_request__create` with the refusal's `request_access`
arguments exactly as given, then tell the person an admin has to approve it.

**Deciding happens only in the console**, under **Governance → Access
requests**, by someone with `member:manage` who confirms it is them. No MCP
client and no Elaichi agent can approve or deny a request, and nobody decides
their own.

Approving a restriction request for a connector, or a tool that names its
connector, creates an **access grant** for that one person. It lifts exactly
that connector or tool from their role's rules and changes nobody else's
access. Approving a permission request only records the decision: the admin
still changes the role.

## Things only a person in the app can do

These ask the person to confirm it is them, so **every AI surface refuses them**,
even though some are listed over MCP: sending, resending or revoking an invite;
changing a member's role; removing a member; deleting a custom role; deleting a
team; revoking an API token; and deciding an access request.

When asked to do one, say what needs doing and point to the screen (most are in
**Settings → People**). Do not look for another route to the same effect.

## Approvals

- **MCP clients**: the scopes granted on the consent screen are the standing
  approval. Elaichi adds no per-call prompt over MCP.
- **The Elaichi agent**: writes stop at an approval card, and deletes ask every
  time.
- **Automations**: every destructive step needs an `approve` step before it.

There is no admin-written rule today that pauses a whole class of AI client
writes for an approver. To hold clients back, use restrictions and consent
scopes. Details: [Oversight](./references/oversight.md#approvals).

## The audit log

**Governance → Audit logs.** Append-only.

- **Everyone can read it.** With `audit:view` (Org Owner, Org Admin, Auditor)
  it shows the whole organization. Without it, a person sees their own events
  plus events on connections they own or can edit.
- **Every row carries `actor_kind`.** A call from an MCP client is recorded as
  the **person** (`user`) with surface `mcp` and the client named. The Elaichi
  agent is `ai_assistant`, an automation is `automation`, Elaichi support is
  `staff`.
- Tool call rows record what was called, on which account, how it was approved
  and what it touched, but not argument values.
- Over MCP, `elaichi__audit__list` has no actor, action or date filter. Page
  back from the newest, and say that is what you did.

Forwarding to Datadog (**Settings → Logging**) needs the Black plan, which is
not on sale yet. Slack and email notifications (**Settings → Notifications**)
work on every plan. Details: [Oversight](./references/oversight.md).

## SSO, SCIM, domains and offboarding

- **Verified domains** (**Settings → Domains**, `org:manage`): prove an email
  domain by DNS TXT record. New users on it can auto-join, and it can route to
  an SSO connection.
- **SSO** (**Settings → SSO and SCIM**, `sso:manage`): SAML or OIDC. **Enforced**
  SSO refuses every other sign-in method for addresses on its verified domain.
  Removing the domain switches enforcement off.
- **SCIM**: your directory creates and updates members. **Deactivating a user
  suspends them; it never removes them.** Group mappings turn a directory group
  into one role.
- **Offboarding**: read `elaichi__member__offboarding` and say what will break
  by name. Every connection the person owns is deleted when they are removed.
  The admin can pick a replacement for each, so what used it keeps working.
  The removal itself is a four-step flow in **Settings → People**.

Details: [People and identity](./references/identity.md).

## Explaining a refusal

Elaichi's refusals are written for the person reading them and name the
permission in plain words:

> You need the "Manage teams" permission (`team:manage`) to manage this team.

When relaying one:

1. **Pass the message through unchanged**, and name the permission or
   restriction.
2. **Offer the access request** when the refusal carries `request_access`.
3. **Do not look for another route to the same effect.** That is the failure
   this layer exists to prevent.
4. **A "not found" may mean "not yours" rather than "gone".** Resources you have
   no grant on are hidden, not refused, on purpose.

Expect this in the UI, because it looks inconsistent until you know the rule.
An action you could **never** take on a resource is **absent**, not greyed: a
`use` grantee sees no "Manage access" at all. A grant you are **not senior
enough to make**, like a role above your own, stays **visible and disabled with
a reason**, because hiding it would make a real list look cut short.

## References

| Document | Topics |
|---|---|
| [Roles and permissions](./references/permissions.md) | All 58 permissions with meanings, the eight roles and what each holds, custom roles, sharing levels, teams |
| [Restrictions and access requests](./references/restrictions.md) | Layers, allow versus block, the empty-set truth table, enforcement points, what a restricted tool looks like, access grants |
| [People and identity](./references/identity.md) | App-only actions, joining, verified domains, SSO, SCIM, group mappings, offboarding, support access |
| [Oversight](./references/oversight.md) | The audit log and `actor_kind`, logging destinations, notifications, approvals, web access, spend |

## Companion skills

- **elaichi-mcp**: diagnosing a missing tool, and OAuth consent scopes.
- **elaichi-connections**: connection grants, transfer, reconnecting.
- **elaichi-toolboxes**: what sharing a toolbox at `use` delegates.
- [elaichi-automations](../elaichi-automations/SKILL.md): `automation:*`
  permissions, `approve` steps and the Approvals inbox.
- [elaichi-data](../elaichi-data/SKILL.md): collection, dashboard and knowledge
  permissions, and public dashboard links.
