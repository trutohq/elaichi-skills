# Endpoints

Every published route, by area. The authoritative version is
`https://api.elaichi.ai/openapi.json` — if a route is not there, it is internal
or invite-only, and its URL is not a stable contract.

Every list endpoint takes `limit` and `cursor` and returns
`{ result, next_cursor, prev_cursor }`. Many take `q`.

"Owner" below means the one person who owns the resource. "Edit" means a real
`edit` grant on it (direct, through a team, or org-wide). No org-wide
permission stands in for either unless the row says so.

## Schema and health

```
GET    /health                                   liveness, no auth
GET    /openapi.json                             the OpenAPI description
GET    /openapi.yaml                             the same, as YAML
GET    /schema/openapi.json                      the same document again
GET    /schema/openapi.yml                       the same, as YAML
GET    /.well-known/oauth-protected-resource     MCP resource metadata (RFC 9728)
GET    /.well-known/oauth-authorization-server   authorization server metadata (RFC 8414)
GET    /.well-known/openid-configuration         OIDC discovery document
```

## The signed-in person

```
GET    /user/me                                  the caller, their organizations and permissions
```

`GET /user/me` is the "who am I" call. No other route answers it.

## Organization

```
POST   /organization                             create one — browser session only
GET    /organization                             organizations you belong to
GET    /organization/:id                         read one
PATCH  /organization/:id                         update settings              org:manage
PUT    /organization/:id/logo                    upload a logo                org:manage
DELETE /organization/:id/logo                    remove the logo              org:manage
DELETE /organization/:id                         schedule deletion            org:delete, browser session + re-verify
POST   /organization/:id/restore                 cancel a scheduled deletion  org:manage
GET    /organization/:id/security-summary        how many members lack a second factor   org:manage
GET    /organization/:id/entitlements            effective plan and feature map
GET    /organization/:id/billing                 subscription state           billing:view
POST   /organization/:id/billing/checkout        a checkout session           billing:manage
POST   /organization/:id/billing/portal          a customer portal link       billing:manage
```

`DELETE /organization/:id` does not erase anything today. It schedules deletion
30 days out, and only an Org Owner holds `org:delete`. A token gets `403`.

## Verified domains

```
GET    /org-domain                               list                         org:manage
POST   /org-domain                               claim one                    org:manage
POST   /org-domain/:id/verify                    run DNS verification         org:manage
PATCH  /org-domain/:id                           auto-join and default role   org:manage
DELETE /org-domain/:id                           release it                   org:manage
```

## Members and invites

```
GET    /member                                   list members (any member)
PATCH  /member/:userId                           set their role               member:manage
GET    /member/:userId/offboarding               preview what removal touches member:manage
DELETE /member/:userId                           remove, with per-resource decisions   member:manage

GET    /invite                                   pending invites              member:manage
POST   /invite                                   invite by email              member:manage
POST   /invite/:id/resend                        resend the email             member:manage
DELETE /invite/:id                               revoke                       member:manage
```

- **A member holds exactly one role.** `PATCH /member/:userId` takes
  `{ "role_ids": ["role_…"] }` with exactly one id. You cannot change your own
  role, or grant a role with permissions you do not hold.
- **Always call the offboarding preview before a delete.** The delete refuses
  while anything shared lacks a decision, and the preview is the only way to
  see what. Removal always deletes the member's connections — see
  **elaichi-connections** for the decision body.

## Teams

```
GET    /team                                     list (any member)
POST   /team                                     create                       team:create or team:manage
GET    /team/:id                                 read (any member)
PATCH  /team/:id                                 rename or describe           team:manage or team admin
DELETE /team/:id                                 delete                       team:manage or team admin
GET    /team/:id/member                          roster — paged, searchable (any member)
POST   /team/:id/members                         add                          team:manage or team admin
PATCH  /team/:id/members/:userId                 appoint or remove an admin   team:manage or team admin
DELETE /team/:id/members/:userId                 remove                       team:manage or team admin; anyone may remove themselves
```

A team row carries counts and a preview. The roster is its own endpoint.

## Roles and permissions

```
GET    /role                                     list (any member)
POST   /role                                     create a custom role         role:manage
GET    /role/:id                                 read (any member)
PATCH  /role/:id                                 edit a custom role           role:manage
DELETE /role/:id                                 delete, moving its holders (?reassign_to=role_…)   role:manage
POST   /role/:id/delete                          the same, with per-member choices in a body   role:manage
GET    /permission                               the permission catalog, paged (any member)
```

Built-in roles cannot be edited or deleted. `GET /permission` pages like any
list — drain it if you need the whole catalog.

## API tokens

```
GET    /api-token                                list metadata
POST   /api-token                                mint one — shown once        api_token:create
PATCH  /api-token/:id                            rename                       owner or api_token:manage
DELETE /api-token/:id                            revoke                       owner or api_token:manage
```

**Every route here refuses an API token.** These run from the browser, and
minting and revoking also ask the person to re-verify. Token values are never
readable after creation.

## Audit log

```
GET    /audit-log                                events, newest first (any member; audit:view widens it to the whole org)
```

## Connectors

```
GET    /connector                                browse the catalog — ?search=, ?category=, ?custom=true   connector:view
GET    /connector/categories                     category facets              connector:view
GET    /connector/:slug                          one connector                connector:view
GET    /connector/:slug/tools                    its tools, paged             connector:view
GET    /connector/:slug/oauth-app                the org's own OAuth app      connector:manage
PUT    /connector/:slug/oauth-app                set or rotate it             connector:manage
DELETE /connector/:slug/oauth-app                go back to Elaichi's app     connector:manage
```

Connectors are named by **slug**. A connector blocked for the caller is
listed and flagged (`restricted`, `restricted_by`), never hidden.
`/oauth-app` applies to catalog connectors that need the organization's own
OAuth app (`byoa: true`) — a custom connector answers `404` there. The client
secret is write-only.

### Custom connectors

```
POST   /connector                                author one (config, or remote_mcp)   connector:create
POST   /connector/:slug/fork                     fork one into the org        connector:create
PATCH  /connector/:slug                          edit                         edit
DELETE /connector/:slug                          delete                       owner
POST   /connector/:slug/transfer                 hand ownership over          owner
POST   /connector/:slug/owner                    give an ownerless connector an owner   connector:manage
PUT    /connector/:slug/documentation            document methods (= make tools)   edit
GET    /connector/:slug/pull                     preview upstream changes     edit
POST   /connector/:slug/pull                     apply selected changes       edit
POST   /connector/:slug/link-upstream            link a fork to its upstream  edit
DELETE /connector/:slug/link-upstream            unlink                       edit + connector:manage
GET    /connector/:slug/tool                     a remote MCP connector's tools   use
PATCH  /connector/:slug/tool/:name               turn one of those tools off or on   edit
POST   /connector/:slug/share                    grant view, use or edit      connector:share + edit
GET    /connector/:slug/share                    list grants                  owner or edit
DELETE /connector/:slug/share/:aclId             revoke a grant               connector:share + edit
```

All of these need the `custom_connectors` plan feature. A custom connector is
private until shared; `use` is what lets someone connect an account through
it. Delete is refused while any connection still uses it.

## Connections

```
POST   /connection                               start a connect session      connection:create (+ connection:share with shares)
GET    /connection                               the ones you can reach — ?status=, ?connector_slug=, ?owner_user_id=, ?q=
GET    /connection/:id                           read one
PATCH  /connection/:id                           rename                       owner or edit
DELETE /connection/:id                           delete                       owner
POST   /connection/:id/reconnect                 fresh sign-in link           owner or edit (pending: owner)
POST   /connection/:id/refresh-credentials       force a token refresh        owner or edit
POST   /connection/:id/refresh-tools             re-list a remote MCP connection's tools   owner or edit
POST   /connection/:id/run-post-install          re-run the connector's setup steps   owner or edit
GET    /connection/:id/variables                 setup values                 owner or edit
PATCH  /connection/:id/variables                 change setup values          owner or edit
GET    /connection/:id/tools                     this account's tools, flagged per restriction
GET    /connection/:id/transfer-preview          what a transfer would break  owner
POST   /connection/:id/transfer                  hand ownership over          owner
POST   /connection/:id/share                     grant view, use or edit      connection:share + owner or edit
GET    /connection/:id/share                     list grants                  owner or edit
DELETE /connection/:id/share/:aclId              revoke a grant               connection:share + owner or edit
```

`POST /connection` and reconnect return a **`connect_url`**: a one-time hosted
sign-in session, not a credential. It is safe to log and safe to hand to a
person. Nothing here ever accepts a secret. Render buttons from the row's
`can_reconnect`, `can_refresh_credentials` and `can_run_post_install` rather
than from `status`.

## Toolboxes and templates

```
GET    /toolbox                                  yours, shared ones, and the automatic ones (any member)
POST   /toolbox                                  create — pass template_id to stamp   toolbox:create
GET    /toolbox/connector                        connectors used by your toolboxes (any member)
GET    /toolbox/:id                              read, with resolved entries  view
PATCH  /toolbox/:id                              edit name, entries or skill  owner or edit
DELETE /toolbox/:id                              delete                       owner
POST   /toolbox/:id/repin                        repair broken entries onto your own access   edit on the toolbox + use on the connection
POST   /toolbox/:id/transfer                     hand ownership over          owner
POST   /toolbox/:id/share                        grant view, use or edit      toolbox:share + owner or edit
GET    /toolbox/:id/share                        list grants                  owner or edit
DELETE /toolbox/:id/share/:aclId                 revoke a grant               toolbox:share + edit
GET    /toolbox/:id/connected-app                AI clients that reach this toolbox   owner or edit
GET    /toolbox/:id/skill-version                skill history                owner or edit
GET    /toolbox/:id/skill-version/:versionId     one skill version            owner or edit

GET    /template                                 list (any member)
POST   /template                                 create                       template:create
GET    /template/:id                             read                         view
PATCH  /template/:id                             edit                         owner or edit
DELETE /template/:id                             delete                       owner
POST   /template/:id/transfer                    hand ownership over          owner
POST   /template/:id/share                       grant view, use or edit      template:share + owner or edit
GET    /template/:id/share                       list grants                  owner or edit
DELETE /template/:id/share/:aclId                revoke a grant               template:share + edit
GET    /template/:id/skill-version               skill history                owner or edit
GET    /template/:id/skill-version/:versionId    one skill version            owner or edit
```

Setting entries **replaces the list wholesale**. Send the full intended set,
never a change.

## Synthetic tools

```
GET    /synthetic-tool                           list yours (any member)
POST   /synthetic-tool                           create                       toolbox:create
POST   /synthetic-tool/validate                  check a draft, save nothing  toolbox:create
GET    /synthetic-tool/:id                       read                         owner
PATCH  /synthetic-tool/:id                       edit                         toolbox:create or toolbox:manage, + owner
DELETE /synthetic-tool/:id                       delete                       toolbox:create or toolbox:manage, + owner
POST   /synthetic-tool/:id/execute               run it                       tool:execute + owner
```

## Files

```
GET    /file                                     files you can reach — ?connector_slug=, ?q=
POST   /file                                     put a file in (raw bytes ≤ 95 MiB, or JSON ≤ 1 MiB)
GET    /file/:id                                 check a file id
DELETE /file/:id                                 delete                       owner
GET    /file/:id/content                         download the bytes (no org header needed)
POST   /file/:id/share                           share at view                owner
GET    /file/:id/share                           list grants                  owner
DELETE /file/:id/share/:aclId                    revoke a grant               owner
POST   /file/upload-request                      ask a person for files
GET    /file/upload-request/:id                  read the request             its creator
POST   /file/upload-request/:id/file             reserve a place for a file   its creator
PUT    /file/upload-request/:id/file/:fileId     send that file's bytes       its creator
DELETE /file/upload-request/:id/file/:fileId     take a staged file out       its creator
POST   /file/upload-request/:id/confirm          confirm exactly these file_ids   its creator
```

Files are tool results and uploads. They expire **7 days** after creation. No
permission gates a file: the owner, a person it was shared with, or anyone
with `use` on the connection or toolbox that made it can open it.

## Governance

```
GET    /restriction                              list rules                   restriction:view
GET    /restriction/:id                          read one                     restriction:view
GET    /restriction/connector/:slug/tools        a connector's tools, for writing a rule   restriction:manage + connector:view
POST   /restriction                              create                       restriction:manage
PATCH  /restriction/:id                          edit                         restriction:manage
DELETE /restriction/:id                          delete                       restriction:manage

POST   /access-request                           ask for access (any member)
GET    /access-request                           the admin queue (member:manage), or ?mine=true for your own
GET    /access-request/pending-count             how many wait on a decision  member:manage
GET    /access-request/:id                       read one                     the requester or member:manage
POST   /access-request/:id/resolve               approve or deny              member:manage, browser session + re-verify
POST   /access-request/:id/withdraw              withdraw your own pending request
```

A rule aimed at one person also needs `restriction:override`. Filing the same
access request twice returns the pending one. Approving a restriction request
lifts that restriction for that one person.

## SSO, SCIM, and directory groups

```
GET    /sso-connection                           list                         sso:view
GET    /sso-connection/:id                       read                         sso:view
POST   /sso-connection                           create SAML or OIDC          sso:manage
PATCH  /sso-connection/:id                       edit                         sso:manage
DELETE /sso-connection/:id                       delete                       sso:manage
GET    /auth/saml/:connectionId/metadata         SP metadata for your IdP

GET    /scim-token                               list provisioning tokens     sso:view, browser session
POST   /scim-token                               mint one — shown once        sso:manage, browser session + re-verify
DELETE /scim-token/:id                           revoke                       sso:manage, browser session
GET    /scim-group                               groups synced from the IdP   sso:view
GET    /scim-group/:id/member                    members of a synced group    sso:view

GET    /group-mapping                            group → role mappings        sso:view
GET    /group-mapping/:id                        read one                     sso:view
POST   /group-mapping                            create                       sso:manage
PATCH  /group-mapping/:id                        edit                         sso:manage
DELETE /group-mapping/:id                        delete                       sso:manage
```

### SCIM v2 data plane

Authenticated by a SCIM token (`escim_…`), not a user token. Your identity
provider talks to this.

```
GET    /scim/v2/ServiceProviderConfig
GET    /scim/v2/ResourceTypes
GET    /scim/v2/Schemas
GET    /scim/v2/Users                            list provisioned users
POST   /scim/v2/Users                            provision a user
GET    /scim/v2/Users/:id                        read one
PUT    /scim/v2/Users/:id                        replace one
PATCH  /scim/v2/Users/:id                        patch one
DELETE /scim/v2/Users/:id                        deprovision one
GET    /scim/v2/Groups                           list provisioned groups
POST   /scim/v2/Groups                           create one
GET    /scim/v2/Groups/:id                       read one
PUT    /scim/v2/Groups/:id                       replace one
PATCH  /scim/v2/Groups/:id                       patch membership
DELETE /scim/v2/Groups/:id                       delete one
```

These speak RFC 7644's `startIndex`/`count`, not Elaichi's cursor envelope —
the one place in the API where that is true.

## Destinations

```
GET    /observability-destination                list                         logging:view
POST   /observability-destination                create                       logging:manage
GET    /observability-destination/:id            read                         logging:view
PATCH  /observability-destination/:id            edit                         logging:manage
DELETE /observability-destination/:id            delete                       logging:manage
POST   /observability-destination/:id/test       send a test event            logging:manage

GET    /notification-destination                 list                         notification:view
POST   /notification-destination                 create                       notification:manage
GET    /notification-destination/:id             read                         notification:view
PATCH  /notification-destination/:id             edit                         notification:manage
DELETE /notification-destination/:id             delete                       notification:manage
POST   /notification-destination/:id/test        send a test notification     notification:manage
```

Logging destinations forward the audit log to your own tools (Datadog today)
and need the Black plan. Notification destinations send Slack or email alerts
about your organization and are on every plan. Adding Slack through "Add to
Slack" is a browser flow and is not in the API.

## OAuth (for MCP clients)

```
POST   /oauth/register                           dynamic client registration (RFC 7591)
GET    /oauth/authorize                          authorization endpoint — PKCE S256 required
POST   /oauth/token                              exchange a code or refresh token
POST   /oauth/revoke                             revoke a token (RFC 7009)
GET    /oauth/userinfo                           OIDC userinfo for the bearer
POST   /oauth/userinfo                           the same, as a POST
```

Clients register themselves. There is no client id or secret to set up by
hand. The consent screen and the **Connected apps** screen behind them are
internal.

## MCP

```
POST   /mcp                                      JSON-RPC over an OAuth access token
GET    /mcp                                      405 Method Not Allowed
DELETE /mcp                                      405 Method Not Allowed
```

**`POST` is the only MCP surface.** There is no stream channel and no session
to end. See the **elaichi-mcp** skill.

## Invite-only families (not in the schema)

These are built and running for organizations that have the feature, and they
answer an API token there. They are **not in the published schema yet**, so
expect changes. An organization without the feature gets
`403 automations_not_available` (or `automations_disabled` when an admin
turned it off, `apps_not_available` for apps). For most work, the MCP
operations (`elaichi__automation__*`,
`elaichi__collection__*`, `elaichi__dashboard__*`, `elaichi__knowledge__*`)
are the steadier way in.

| Family | Root | What is there |
|---|---|---|
| Automations | `/automation` | CRUD, `validate`, a draft (`PUT /:id/draft`, `discard`, `publish`), versions and `republish`, `enable` / `disable`, `run`, `dry-run`, runs with steps, progress, transcripts, warnings, `retry`, `cancel`, `config`, `options`, webhook endpoints and samples, runbook sessions, `transfer`, `share` |
| Approvals | `/automation-approval` | the cross-automation queue, one approval, who can approve, `resolve`, `resolve-batch` (up to 50), votes |
| Slack triggers | `/automation-slack` | workspaces and channels a trigger can use |
| Collections | `/collection` | CRUD, schema, tables, row `query`, `aggregate`, insert, `upsert`, bulk `update` and `delete`, row history and `restore`, references, `transfer`, `share` |
| Dashboards | `/dashboard` | CRUD, `validate`, `preview-widget`, a draft with `publish` / `discard`, widget and page data, filter and form options, form `submit`, row edits, action `invoke`, `export`, `transfer`, `share` |
| Public dashboard links | `/dashboard/:id/public-link` | create, `preview`, `refresh`, `extend`, `pause`, `resume`, reveal `url`, revoke. Visitors read `/public/dashboard/:token` |
| Knowledge | `/knowledge` | CRUD, documents, `trust` and `trust-batch`, `search` (one base or all), recent queries, references, `transfer`, `share` |
| Web access | `/web-access-policy` | the org policy, allowed and blocked domains, `check` a URL |
| Apps | `/bundle`, `/bundle-install` | package versions, export, install links, `transfer`, `share`; preview, install, `resume`, `rollback` |
| Spend | `/spend` | usage, usage limits, payment policy, payment tools, payment caps |

Two of these act only for a person in the browser: changing payment settings
under `/spend`, and dashboard forms and buttons. Collection row inserts and
upserts accept an `Idempotency-Key` header — the one place in the API that
does.

## Everything else is internal

The consent screen (`/oauth/authorize-request/*`), the Connected apps screen
(`/oauth/grant*`), the in-app agent (`/assistant/*`), Slack installs and
account links, sign-in flows under `/auth`, `POST /feedback`, telemetry, and
`/admin` are not for integrations. Their URLs can change without notice.
