# Patterns

Working code for the things every Elaichi integration has to get right.

## Page correctly

```ts
const BASE = 'https://api.elaichi.ai'
const headers = { Authorization: `Bearer ${process.env.ELAICHI_API_TOKEN}` }

async function* pages(path: string, params: Record<string, string> = {}) {
  let cursor: string | null = null
  do {
    const query = new URLSearchParams({ ...params, limit: '200' })
    if (cursor) query.set('cursor', cursor)

    const res = await fetch(`${BASE}${path}?${query}`, { headers })
    if (!res.ok) throw await elaichiError(res)

    const body = await res.json()
    yield body.result
    cursor = body.next_cursor          // null means done. Nothing else does.
  } while (cursor)
}

for await (const batch of pages('/connection', { status: 'needs_reauth' })) {
  for (const connection of batch) { /* … */ }
}
```

**`next_cursor === null` is the only stop condition.** A short page is not
the last page, and an empty page is not either.

Never stop a loop after N pages "just in case" without saying it stopped
early. A cut-off set looks correct until a list outgrows one page.

## Search and filter on the server

```ts
// ✅ the server filters before paging
const res = await fetch(`${BASE}/member?q=${encodeURIComponent(needle)}`, { headers })

// ❌ searches only the pages you happened to fetch
const all = await firstPageOf('/member')
const hits = all.result.filter(m => m.name.includes(needle))
```

The same goes for counting. "12 members" built from `result.length` means
"12 members on page one". Counts come from the server: a row's `*_count`
fields, an `access_summary`, a `match_count`.

Changing `q` or a filter starts a new result set — drop the cursor and ask for
page one.

`q` is forgiving: each word may appear anywhere, in any order, and if nothing
matches exactly, one typo is allowed in longer words. Send what the person
typed. Do not build your own fuzzy matching on top.

## Read capability fields; never re-derive them

```ts
// ✅
if (toolbox.can_share) showShareButton()
if (connection.can_reconnect) showReconnectButton()

// ❌ drifts from the server the moment either side changes,
//    and cannot see team-admin, grant or restriction facts at all
if (toolbox.owner_user_id === me.id || myPermissions.includes('toolbox:share')) …
if (connection.status !== 'active') showReconnectButton()
```

Every row that can be acted on carries the answer. So do command responses —
a freshly created toolbox arrives with the same `can_*` fields a list row has.

| Field | Question it answers |
|---|---|
| `can_use` | May I run, pin, stamp or connect through this? |
| `can_share` | May I add a grantee? |
| `can_manage` | May I change its settings? |
| `can_transfer` | May I give it away? (usually also delete — both owner-only) |
| `can_revoke_share` | May I remove an existing grant? |
| `can_see_shares` | May I be told who it is shared with? |

Things not to confuse with a capability:

- **`access_via`** reports *how* you reach a row — `owner`, `direct`, `team`,
  `org`. It is **omitted** when nothing reaches you. Absence means "no source
  to name", not "not permitted".
- **`restricted_by`** says an admin's restriction blocks this for you. Show it
  as "restricted for you", with a way to ask for access — not as "you lack
  permission".
- **A `shares` array being present** is not permission to show it. Use
  `can_see_shares`.

When gating UI: an action you could never take on this resource is
**absent**, not greyed out. A grant you are not senior enough to make — a role
above your own — is **visible and disabled with a reason**, because that
option belongs to a list that really exists.

## Handle errors properly

```ts
async function elaichiError(res: Response) {
  const body = await res.json().catch(() => null)
  const err = body?.error
  return Object.assign(
    new Error(err?.message ?? `Elaichi ${res.status}`),
    {
      status: res.status,
      code: err?.code,
      details: err?.details,
      requiredPermissions: err?.details?.required_permissions as string[] | undefined,
      requestId: res.headers.get('X-Request-Id'),
      retryAfter: Number(res.headers.get('Retry-After')) || undefined,
    }
  )
}
```

| Code | Do this |
|---|---|
| `permission_required` | Show `message` **unchanged**. `details.required_permissions` lists choices — any one is enough. Do not retry. |
| `forbidden` | Often "needs an interactive browser session". Tell the person to do it in the app. Do not retry. |
| `subscription_required`, `feature_not_available` | The plan, not the person. Say so; do not retry. |
| `not_found` | May mean "not yours". Do not treat it as proof the resource is gone. |
| `validation_error` | Fix the request. Never retry unchanged. |
| `conflict` and other 409 codes | Re-read the resource and decide; do not blind-retry. |
| `rate_limited` | Wait `Retry-After` seconds. |
| `clove_timeout`, `saffron_timeout` (504) | Nothing changed. Retry with backoff. |
| `platform_*_stopped` (503) | Elaichi paused this platform-wide. Try again later. |
| `internal_error` | Retry once with backoff, then surface `X-Request-Id`. |

A few specific codes worth handling by name on connections:

| Code | Meaning |
|---|---|
| `409 oauth_app_required` | The connector needs the organization's own OAuth app first. `details.setup_path` is present when the caller may add it. |
| `403 connector_not_shared` | The custom connector is no longer shared with the connection's owner. Reconnecting cannot fix it. |
| `409 connector_unavailable` | The connector left the catalog. The connection is kept. |
| `409 not_refreshable` | This credential cannot be refreshed in place. Reconnect instead. |

Log `X-Request-Id` on every failure. It is what support will ask for, and it
ties your call to a server-side trace.

## Retry safely

Limit: **600 requests / 60s** on the REST API, per token.

```ts
async function call(path: string, init: RequestInit = {}, attempt = 0): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...headers, ...init.headers } })
  const transient = res.status === 429 || res.status === 504
  if (transient && attempt < 3) {
    const wait = (Number(res.headers.get('Retry-After')) || 2 ** attempt * 5) * 1000
    await new Promise(r => setTimeout(r, wait))
    return call(path, init, attempt + 1)
  }
  return res
}
```

**The published API has no idempotency key.** Retry reads freely. For writes,
re-read to confirm state rather than repeat blindly. Several operations are
naturally safe to repeat:

- Re-granting a share replaces the level rather than adding a second grant.
- Filing an access request that is already pending returns the pending one.
- Removing a member whose estate is too big for one call answers `202` with
  `status: "more_to_resolve"`. What it did is kept. Re-read the offboarding
  preview and call again.

## Guessing a URL correctly

The conventions are regular enough to guess from:

| You want to | Path |
|---|---|
| Update a field on a resource | `PATCH /resource/:id` — **never** `/resource/:id/field-name` |
| Make something happen | `POST /resource/:id/<verb>` — `verify`, `reconnect`, `execute`, `transfer`, `test` |
| Reach a child collection | `/resource/:id/<collection>` — `/team/:id/member`, `/toolbox/:id/share` |
| Share with several people at once | the same `POST /resource/:id/share`, with `grantees: [...]` and one `level` |
| Get the full set a row only previews | Its own paginated endpoint exists. |

If your guess is not in `https://api.elaichi.ai/openapi.json`, it is not a
stable endpoint, whatever a browser devtools tab shows.

## Tokens in code

```ts
// Server-side only. An elch_ token carries the full permissions of whoever
// made it, and there is no scope system to narrow that.
const token = process.env.ELAICHI_API_TOKEN
```

- **Never ship a token to a browser or a client app.** It cannot be scoped.
- **One token per integration**, named for it, so revoking one does not break
  the others.
- A token has **its creator's live permissions**. Make integration tokens from
  a purpose-made account with a custom role, not from an Org Owner's.
- **Code cannot rotate tokens.** Minting and revoking happen only in the app,
  with the person re-verifying. Plan rotation as a person's task: mint the new
  one at **Settings → API tokens**, deploy it, then revoke the old one there.
  Revocation is immediate.
