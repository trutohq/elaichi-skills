---
name: elaichi-api
description: Write code against the Elaichi control-plane API at api.elaichi.ai — API tokens and the organization header, the cursor list envelope, error shapes, the can_* capability fields, strict CRUD conventions, rate limits, and where the OpenAPI schema lives.
whenToUse: Writing or reviewing code that calls api.elaichi.ai — scripts, integrations, provisioning, or a UI over Elaichi. Read before constructing the first request.
---

# The Elaichi API

```
https://api.elaichi.ai
```

A machine-readable description is served live, unauthenticated:

```
GET https://api.elaichi.ai/schema/openapi.json
GET https://api.elaichi.ai/schema/openapi.yml
```

**Treat that schema as the contract.** It is a deliberate subset: endpoints the
console uses internally are excluded, and their URLs are explicitly not
stable. If a path is not in the schema, do not build on it.

Paths are unversioned — `/connection`, not `/v1/connection`.

## Authentication

```
Authorization: Bearer elch_{org_id}_{64 hex}
```

Create a token at **Settings → API tokens** in
[app.elaichi.ai](https://app.elaichi.ai) (needs `api_token:create`). **The raw
value is shown exactly once** and is never retrievable afterwards.

Two things about tokens that shape how you use them:

- **A token has no scopes.** It authenticates *as the person who created it*,
  with their live permissions. Change their roles and what the token can do
  changes immediately. Remove them and it stops working.
- **A token is bound to one organization**, which is why the org id is in the
  token itself.

Revocation is immediate. Renaming is allowed; there is no way to read a token
back.

## The organization header

Org-scoped routes need to know which organization you mean:

```
X-Organization-Id: org_…
```

With an API token the header is **optional** — the token already names an
organization. If you send it anyway it must match, or you get `403`.

Two exceptions: `/organization/:id/*` routes take the org from the path, and
`/oauth/grant*` routes take a required `?organization_id=` query parameter
instead.

You must be an active member of the organization you name.

### There is no second way in

The console signs a person in with a browser cookie, and `400
missing_organization_header` is what that path returns without the header. It
is not an integration path: **there is no supported way to obtain a session
outside the browser**, none is documented, and nothing here should try to
mint, borrow, or replay one. An API token is the whole programmatic surface.

A handful of actions go further and require a **human session** — a real
person, signed in to [app.elaichi.ai](https://app.elaichi.ai), re-verified at
the moment they act. Deleting an organization, revoking an API token,
approving an MCP client's consent. A token can never satisfy those, and the
correct answer when one is needed is to tell the person to do it in the app.

## The list envelope

**Every endpoint returning an array uses the same shape.** No exceptions worth
coding around.

```json
{
  "result": [ /* … */ ],
  "next_cursor": "opaque-or-null",
  "prev_cursor": "opaque-or-null"
}
```

| Parameter | Behavior |
|---|---|
| `limit` | Default **50**, maximum **200**. Above 200 is clamped, not rejected. Zero or negative is a `400`. |
| `cursor` | Opaque. Round-trip it untouched. An empty string means "first page". |
| `q` | Free-text search, up to 200 characters. Whitespace-only is ignored. |

**Page until `next_cursor` is null.** That is the only termination condition —
a short page is not the last page.

Two rules that prevent the most common bug against this API:

- **Never search, filter, sort or count client-side over a paginated list.**
  You would be operating on the pages you happen to have fetched. `q` and
  filters go to the server, which applies them in SQL *before* paging.
- **Changing `q` starts a new result set.** Drop the cursor and request page
  one again.

Cursors are keyset-based on id, so they are stable as rows are added. A few
in-memory lists use an offset cursor instead, which can skew by a row if the
underlying set changes between pages.

## Errors

```json
{
  "error": {
    "message": "You need the “Manage teams” permission (team:manage) to manage this team.",
    "code": "permission_required",
    "details": {
      "required_permissions": ["team:manage"],
      "action": "manage this team"
    }
  }
}
```

| Code | HTTP | Meaning |
|---|---|---|
| `validation_error` | 400 | A field failed validation — including a bad `limit`, over-long `q`, or malformed `cursor` |
| `bad_request` | 400 | Malformed request |
| `missing_organization_header` | 400 | `X-Organization-Id` absent on an org-scoped route |
| `unauthorized` | 401 | Missing or invalid credential |
| `permission_required` | 403 | RBAC denial. `details.required_permissions` lists every permission that would satisfy it — **any one** is enough |
| `forbidden` | 403 | Allowed to authenticate, not allowed to do this |
| `not_found` | 404 | No such resource — **or one deliberately concealed from you** |
| `conflict` | 409 | Clashes with current state |
| `step_up_required` | 428 | The person must re-verify themselves in the app. An API token can never satisfy it |
| `rate_limited` | 429 | Over the window. See `Retry-After` |
| `internal_error` | 500 | Server-side failure |

Two habits:

- **Show `error.message` unchanged.** It is written for a person and already
  names the permission in their own vocabulary. Do not rewrite it into "403
  Forbidden".
- **Treat a `404` on something you believe exists as "not yours".** Elaichi
  conceals resources you hold no grant on rather than confirming they exist.

`X-Request-Id` is exposed on responses. Log it — it is what support will ask
for.

## Capability fields

**Authorization is computed on the server and shipped as an explicit field.**
Read it; never re-derive it from `owner_user_id` and a permission list. A
client-side guess is either too permissive (an action that 403s, which the user
cannot explain) or too strict (an action they were allowed to take), and it
cannot see server-only context at all.

| Field | Answers |
|---|---|
| `can_use` | May the caller exercise this — run a toolbox's tools, stamp from a template |
| `can_share` | May the caller grant new shares |
| `can_manage` | May the caller change this resource's own settings |
| `can_transfer` | May the caller give it away or delete it. There is no `can_delete` — both are owner-only and share this flag |
| `can_revoke_share` | May the caller revoke an existing share |
| `can_see_shares` | May the caller be told *who* it is shared with |

`can_manage` is the one name for "may mutate this resource's settings" across
every resource type. There is no `can_edit` or `can_update`.

Alongside them, `access_via` reports **how** the caller reaches a resource —
`owner`, `direct`, `team`, or `org`, broadest source winning — with
`access_via_team` when it is a team. It is **omitted entirely** when nothing
reaches the caller; absence means "no source to name", never "not permitted".

Command responses carry the same `can_*` fields as list rows, so a freshly
created row does not lose its actions until the next reload.

## URL conventions

| Kind | Pattern | Examples |
|---|---|---|
| CRUD | `GET/POST /resource`, `GET/PATCH/DELETE /resource/:id` | `/role`, `/sso-connection` |
| Action | `POST /resource/:id/<verb>` | `verify`, `reconnect`, `execute`, `transfer`, `test` |
| Nested collection | `/resource/:id/<collection>[/:childId]` | `/team/:id/member`, `/toolbox/:id/share` |

Three rules follow, and they make the API predictable enough to guess
correctly:

- **Ordinary fields update through `PATCH /resource/:id`** with a body where
  every field is optional. `null` clears a nullable field; omitting everything
  returns the record unchanged. There are **no attribute subpaths** — no
  `PATCH /org-domain/:id/default-role`.
- **`POST /:id/<verb>` is only for things that *do* something**, not for
  editing a field.
- **Unbounded child collections are never embedded in a parent row.** A row
  carries a count and a small preview; the collection has its own paginated,
  searchable endpoint. A team row carries member counts and a preview; the
  roster is `GET /team/:id/member`.

That last one is worth designing around: if you find yourself wanting the full
set of something from a list response, the endpoint for it exists.

## Rate limits

| Surface | Limit | Keyed on |
|---|---|---|
| REST API | **600 requests / 60s** | The API token |
| MCP endpoint | **120 requests / 60s** | The OAuth access token |

Over the limit: `429`, code `rate_limited`, and a `Retry-After` header in
seconds. Honor it.

There is no public idempotency key. Design writes so a retry after a timeout is
safe to reason about.

## Ids

TypeIDs: `{prefix}_{26 characters}`, the suffix a UUIDv7 in lowercase Crockford
base32. Opaque to you, but chronologically sortable within a prefix — which is
why cursors keyset on them.

Common prefixes: `org`, `usr`, `team`, `role`, `conn` (connection), `tbx`
(toolbox), `tpl` (template), `syn` (synthetic tool), `acl`, `rstr`
(restriction), `inv` (invite), `atok` (API token), `aud` (audit event), `areq`
(access request). The full table is in
[Conventions](../elaichi-conventions/SKILL.md).

Three id-shaped things are **not** TypeIDs, because they embed an org id:
`elch_…` (API token), `einv_…` (invite), `escim_…` (SCIM token). All three are
`{prefix}_{orgId}_{secret}` — the org id routes the request, and the secret is
only ever compared as a hash.

Dynamic toolbox ids are not TypeIDs either — `global:{userId}` and
`connection:{connectionId}`. They are computed, read-only, and every lifecycle
call refuses them by name.

## References

| Document | Topics |
|---|---|
| [Endpoints](./references/endpoints.md) | The published surface by resource area, with the permission each needs |
| [Patterns](./references/patterns.md) | Paging correctly, searching server-side, reading capability fields, handling errors and retries |

## Companion skills

- **elaichi-conventions** — the same base facts, condensed, for always-on
  context.
- **elaichi-governance** — what each permission in an error means.
- **elaichi-mcp** — the same operations reached as MCP tools instead.
