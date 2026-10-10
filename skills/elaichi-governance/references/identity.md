# People and identity

How people get into an organization, how they sign in, and how they leave.

## What only a person in the app can do

These actions ask the person to confirm it is them (a passkey, an authenticator
app, or an emailed code). **No AI surface can do them.** MCP clients see some of
them listed, but every call is refused, and so is the Elaichi agent:

| Action | Where a person does it |
|---|---|
| Send, resend or revoke an invite | Settings → People |
| Change a member's role | Settings → People |
| Remove a member | Settings → People |
| Delete a custom role | Settings → People → Roles |
| Delete a team | Settings → People → Teams |
| Revoke an API token | Settings → API tokens |
| Approve or deny an access request | Governance → Access requests |

When asked to do one of these, say what needs doing and point to the screen.
Do not look for another route to the same effect.

Domain, SSO and group-mapping changes, and minting SCIM tokens, also ask for
this confirmation, and AI surfaces only read them.

## Joining

People join an organization in four ways:

| Way | Role they get |
|---|---|
| **An invite** | The one role the invite names. An invite can also preset up to 50 teams. The inviter must hold every permission in that role. |
| **Auto-join from a verified domain** | The domain's default role, or Member |
| **First SSO sign-in** (just-in-time) | The SSO connection's default role, or Member |
| **SCIM provisioning** | The default SSO connection's default role, or a group mapping's role, or Member |

- Org Owner can never be a default role.
- Nobody joins a team automatically. Teams come from an admin, or from an invite.
- Someone an admin removed does not rejoin by domain or SSO. An invite or SCIM
  brings them back.

## Verified domains

**Settings → Domains**, needs `org:manage`.

Prove you own an email domain with a DNS TXT record
(`elaichi-domain-verification=<token>`). A verified domain then:

- lets new users with that email **auto-join** with the domain's default role
- can be **linked to one SSO connection**, so sign-ins on that domain use it

**Removing a verified domain switches off enforced SSO for everyone on it.**
That is why removing one asks for the same confirmation as verifying one.

## Single sign-on

**Settings → SSO and SCIM**. Reading needs `sso:view`, changing needs
`sso:manage`. SAML and OIDC. Gold and Black both include SSO.

An SSO connection has three switches, all off by default:

| Switch | Meaning |
|---|---|
| **Active** | It can be used to sign in. Save a draft first to read the ACS or callback URL for your identity provider; activating needs the required fields. |
| **Default** | Sign-ins on a verified domain with no linked connection use it |
| **Enforced** | Other sign-in methods are refused for addresses on its verified domain |

**Enforced SSO** refuses social sign-in, email codes, sign-up and invite
acceptance for those addresses, with "Your organization requires signing in with
SSO" and a link to the identity provider. It applies only while the connection
is active.

## SCIM

Your directory creates, updates and deactivates members automatically. Users
and Groups, authenticated by a SCIM token. Minting a token needs `sso:manage`, a
person in the app, and confirming it is them. The token is shown once.

**Deactivating a user in the directory suspends the member. It does not remove
them.** Suspension revokes their API tokens and AI client logins at once, and
their toolbox delegations stop working. Reactivating them does not bring those
logins back: they connect their AI clients again. An Org Owner cannot be
deprovisioned over SCIM.

**Group mappings** (`sso:manage`) turn an identity-provider group into one
Elaichi role. A mapping names at most one role, never Org Owner. A person in
several mapped groups gets the single most powerful of those roles, not a
mix. Mappings take effect on the next SCIM sync. They never change team
membership.

## Leaving: offboarding a member

Removing someone is **Remove from organization** on the member in **Settings → People**, a four-step
flow: an overview, handing over what they own, choosing what replaces each of
their connections, and confirming. It needs `member:manage`.

Before proposing a removal, read `elaichi__member__offboarding` and say what
will break, by name. It lists, without changing anything:

- **Connections they own.** All of them are deleted with the member. For each,
  the admin can pick a replacement connection of the same app, and everything
  that used the old one is switched to it first. With none picked, those things
  stop working.
- **Synthetic tools they own.** Deleted with them.
- **Toolboxes, templates, automations, collections, dashboards, knowledge bases,
  apps and custom connectors they own.** A shared one needs a new owner or a
  deliberate deletion before removal; a private one is deleted unless handed
  over. A custom connector can only be transferred. Nothing else can ever move
  or remove one left behind.
- **Delegated entries.** Entries on other people's toolboxes that ride on this
  member's access. They do not block the removal, but they stop working until
  someone re-pins them.
- **Credentials.** How many API tokens and AI client logins removal revokes.

`elaichi__member__delete` refuses while any of that is unresolved, and it is
refused on every AI surface anyway. The removal itself is done in the app.

SCIM never removes anyone: it suspends. Removal is always this admin action.

## Elaichi support access

Elaichi support can sign in as a member to help, and every such action is
recorded in the audit log as Elaichi support (`actor_kind: "staff"`). Someone
with `org:manage` can turn support access off in **Settings → Organization**.
