# Endpoints

The published surface, by resource area. The authoritative machine-readable
version is `https://api.elaichi.ai/schema/openapi.json` — if something is not
there, it is internal and its URL is not a stable contract.

Every list endpoint takes `limit` and `cursor`, and returns
`{ result, next_cursor, prev_cursor }`. Many take `q`.

## Schema and health

```
GET    /health                                   liveness, no auth
GET    /schema/openapi.json                      the OpenAPI description
GET    /schema/openapi.yml                       the same, as YAML
GET    /.well-known/oauth-protected-resource     MCP resource metadata
GET    /.well-known/oauth-authorization-server   authorization server metadata
GET    /.well-known/openid-configuration         OIDC discovery document
```

## The signed-in person

```
GET    /user/me                                  the caller, their organizations and capabilities
POST   /feedback                                 submit an in-product feedback report
```

`GET /user/me` is the closest thing to "who am I" — no other operation answers
it.

## Organization

```
POST   /organization                             create one — browser app only
GET    /organization                             organizations you belong to
GET    /organization/:id                         read one
PATCH  /organization/:id                         update settings            org:manage
PUT    /organization/:id/logo                    upload a logo              org:manage
DELETE /organization/:id/logo                    remove the logo            org:manage
DELETE /organization/:id                         soft-delete                org:delete + step-up
POST   /organization/:id/restore                 undo a pending deletion    org:manage
GET    /organization/:id/entitlements            plan features and limits
```

**Step-up** on two routes above means Elaichi re-verifies the person at the
moment of the action, with a fresh two-factor or passkey challenge. **An API
token can never satisfy it** — these are browser-app actions, and they answer
`428` with code `step_up_required` to anything else. When one is needed, send
the person to [app.elaichi.ai](https://app.elaichi.ai); do not look for a way
around it.

## Verified domains

```
GET    /org-domain                               list                       org:manage
POST   /org-domain                               claim one                  org:manage
POST   /org-domain/:id/verify                    run DNS verification       org:manage
PATCH  /org-domain/:id                           auto-join and default role org:manage
DELETE /org-domain/:id                           release it                 org:manage
```

## Members and invites

```
GET    /member                                   list members (any member)
PATCH  /member/:userId                           set roles and teams        member:manage
GET    /member/:userId/offboarding               preview what removal orphans   member:manage
DELETE /member/:userId                           remove, with per-resource actions   member:manage

GET    /invite                                   pending invites            member:manage
POST   /invite                                   invite by email            member:manage
POST   /invite/:id/resend                        resend the email           member:manage
DELETE /invite/:id                               revoke                     member:manage
```

**Always call the offboarding preview before a delete.** The delete refuses
while anything needs resolution, and the preview is the only way to see what.

## Teams

```
GET    /team                                     list (any member)
POST   /team                                     create                     team:manage
GET    /team/:id                                 read (any member)
PATCH  /team/:id                                 rename or describe         team:manage or team admin
DELETE /team/:id                                 delete                     team:manage only
GET    /team/:id/member                          roster — paged, searchable (any member)
POST   /team/:id/members                         add                        team:manage or team admin
PATCH  /team/:id/members/:userId                 promote/demote admin       team:manage only
DELETE /team/:id/members/:userId                 remove                     team:manage or team admin
```

The roster is its own endpoint on purpose — a team row carries counts and a
preview, never the whole membership.

## Roles and permissions

```
GET    /role                                     list (any member)
POST   /role                                     create a custom role       role:manage
GET    /role/:id                                 read (any member)
PATCH  /role/:id                                 edit a custom role         role:manage
DELETE /role/:id                                 delete a custom role       role:manage
GET    /permission                               the permission catalog (any member)
```

System roles cannot be edited or deleted.

## Connectors

```
GET    /connector                                browse the catalog
GET    /connector/categories                     category facets
GET    /connector/:slug                          one connector and its methods
GET    /connector/:slug/tools                    its tools, paged
POST   /connector                                author a custom one        connector:create
POST   /connector/:slug/fork                     fork one                   connector:create
PATCH  /connector/:slug                          edit                       edit grant
DELETE /connector/:slug                          delete                     edit grant
PUT    /connector/:slug/documentation            replace the docs           edit grant
GET    /connector/:slug/pull                     preview upstream changes   edit grant
POST   /connector/:slug/pull                     apply selected changes     edit grant
POST   /connector/:slug/link-upstream            link a fork to upstream    edit grant
DELETE /connector/:slug/link-upstream            unlink
GET    /connector/:slug/oauth-app                read the org's OAuth app   connector:manage
PUT    /connector/:slug/oauth-app                set it                     connector:manage
DELETE /connector/:slug/oauth-app                clear it                   connector:manage
POST   /connector/:slug/share                    grant a share              connector:share + edit grant
GET    /connector/:slug/share                    list shares                edit grant
DELETE /connector/:slug/share/:aclId             revoke a share             connector:share + edit grant
```

Connectors are identified by **slug**, not by a TypeID.

## Connections

```
POST   /connection                               start a connect session — returns connect_url
GET    /connection                               list the ones you can reach
GET    /connection/:id                           read one, with its shares
GET    /connection/connector-summary             per-connector counts
GET    /connection/:id/tools                     this account's tools, already filtered by restriction
PATCH  /connection/:id                           rename                     owner or edit grant
DELETE /connection/:id                           delete                     owner or manage
POST   /connection/:id/reconnect                 repair or finish the sign-in
POST   /connection/:id/refresh-credentials       force a refresh
POST   /connection/:id/run-post-install          re-run the post-install step
GET    /connection/:id/variables                 read variables
PATCH  /connection/:id/variables                 update variables
GET    /connection/:id/transfer-preview          what a transfer would change    owner only
POST   /connection/:id/transfer                  hand ownership over             owner only
POST   /connection/:id/share                     grant a share
GET    /connection/:id/share                     list shares
DELETE /connection/:id/share/:aclId              revoke a share
```

`POST /connection` returns a **`connect_url`**: a one-time hosted sign-in
session, not a credential. It carries no token, so it is safe to log and safe
to hand to a user. Nothing here ever accepts a secret.

## Toolboxes and templates

```
GET    /toolbox                                  list (any member)
POST   /toolbox                                  create — pass template_id to stamp   toolbox:create
GET    /toolbox/:id                              read, with resolved entries
PATCH  /toolbox/:id                              edit name or entries       owner or edit grant
DELETE /toolbox/:id                              delete                     owner only
POST   /toolbox/:id/repin                        repair a broken delegation edit + use
POST   /toolbox/:id/transfer                     hand ownership over        owner only
POST   /toolbox/:id/share                        grant a share              toolbox:share + owner/edit
GET    /toolbox/:id/share                        list shares                owner or edit
DELETE /toolbox/:id/share/:aclId                 revoke a share             toolbox:share + edit
GET    /toolbox/connector                        connectors reachable via toolboxes
GET    /toolbox/:id/connected-app                OAuth apps reaching this toolbox

GET    /template                                 list (any member)
POST   /template                                 create                     template:create
GET    /template/:id                             read
PATCH  /template/:id                             edit                       owner or edit grant
DELETE /template/:id                             delete                     owner only
POST   /template/:id/transfer                    hand ownership over        owner only
POST   /template/:id/share                       grant a share              template:share + owner/edit
GET    /template/:id/share                       list shares                owner or edit
DELETE /template/:id/share/:aclId                revoke a share             template:share + edit
```

Setting entries **replaces the list wholesale**. Send the full intended set,
never a delta.

## Synthetic tools

```
GET    /synthetic-tool                           list yours (any member)
POST   /synthetic-tool                           create                     toolbox:create
GET    /synthetic-tool/:id                       read                       owner only
PATCH  /synthetic-tool/:id                       edit                       toolbox:create or :manage, + owner
DELETE /synthetic-tool/:id                       delete                     toolbox:create or :manage, + owner
POST   /synthetic-tool/:id/execute               run it                     tool:execute + owner
```

## Governance

```
GET    /restriction                              list rules                 restriction:view
GET    /restriction/:id                          read one                   restriction:view
POST   /restriction                              create                     restriction:manage
PATCH  /restriction/:id                          edit                       restriction:manage
DELETE /restriction/:id                          delete                     restriction:manage

GET    /audit-log                                the audit trail, newest first   audit:view

POST   /access-request                           ask for access (any member, no permission)
GET    /access-request                           the admin queue, or ?mine=true
GET    /access-request/:id                       read one
POST   /access-request/:id/resolve               approve or deny            member:manage
POST   /access-request/:id/withdraw              withdraw your own
```

A rule targeting a specific person also needs `restriction:override`.

## API tokens

```
GET    /api-token                                list metadata
POST   /api-token                                mint one — shown once      api_token:create
PATCH  /api-token/:id                            rename                     owner or api_token:manage
DELETE /api-token/:id                            revoke                     owner or manage, + step-up
```

Token values are never readable after creation, by any route or any role.

## SSO, SCIM, and directory groups

```
GET    /sso-connection                           list                       sso:view
GET    /sso-connection/:id                       read                       sso:view
POST   /sso-connection                           create SAML or OIDC        sso:manage
PATCH  /sso-connection/:id                       edit                       sso:manage
DELETE /sso-connection/:id                       delete                     sso:manage
GET    /auth/saml/:connectionId/metadata         SP metadata for your IdP

GET    /scim-token                               list provisioning tokens   sso:view
POST   /scim-token                               mint one                   sso:manage
DELETE /scim-token/:id                           revoke                     sso:manage
GET    /scim-group                               groups synced from the IdP sso:view
GET    /scim-group/:id/member                    members of a synced group  sso:view

GET    /group-mapping                            group-to-role mappings     sso:view
GET    /group-mapping/:id                        read one                   sso:view
POST   /group-mapping                            create                     sso:manage
PATCH  /group-mapping/:id                        edit                       sso:manage
DELETE /group-mapping/:id                        delete                     sso:manage
```

### SCIM v2 data plane

Authenticated by a SCIM bearer token (`escim_…`), not a user token. This is the
surface your identity provider talks to.

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
the one place in the API where that is true, because the RFC requires it.

## OAuth (for MCP clients)

```
POST   /oauth/register                           dynamic client registration (RFC 7591)
GET    /oauth/authorize                          authorization endpoint — PKCE S256 required
POST   /oauth/token                              exchange a code or refresh token
POST   /oauth/revoke                             revoke a token
GET    /oauth/userinfo                           OIDC userinfo for the bearer
POST   /oauth/userinfo                           the same, as a POST
```

Clients register themselves. There is no client ID or secret to provision by
hand.

## MCP

```
POST   /mcp                                      JSON-RPC                   tool:execute
GET    /mcp                                      405 Method Not Allowed
DELETE /mcp                                      405 Method Not Allowed
```

**`POST` is the only MCP surface there is.** The schema lists `GET` and
`DELETE` on this path, but both handlers answer `405 Method Not Allowed` with
`Allow: POST`. There is no separate stream channel and no session to end.

See the **elaichi-mcp** skill.

## Destinations

```
GET    /observability-destination                list                       logging:view
POST   /observability-destination                create                     logging:manage
GET    /observability-destination/:id            read                       logging:view
PATCH  /observability-destination/:id            edit                       logging:manage
DELETE /observability-destination/:id            delete                     logging:manage
POST   /observability-destination/:id/test       send a test event          logging:manage

GET    /notification-destination                 list                       notification:view
POST   /notification-destination                 create                     notification:manage
GET    /notification-destination/:id             read                       notification:view
PATCH  /notification-destination/:id             edit                       notification:manage
DELETE /notification-destination/:id             delete                     notification:manage
POST   /notification-destination/:id/test        send a test notification   notification:manage
```

## Billing

```
GET    /organization/:id/billing                 subscription and plan state   billing:view
POST   /organization/:id/billing/checkout        a checkout session            billing:manage
POST   /organization/:id/billing/portal          a customer portal link        billing:manage
```
