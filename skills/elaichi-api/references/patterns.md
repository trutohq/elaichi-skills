# Patterns

Working code for the four things every Elaichi integration has to get right.

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

for await (const batch of pages('/connection')) {
  for (const connection of batch) { /* … */ }
}
```

**`next_cursor === null` is the only termination condition.** A short page is
not the last page, and an empty page is not either.

Never build a loop that stops after N iterations "just in case" without
surfacing that it stopped early. A truncated set looks correct until a list
outgrows one page.

## Search on the server

```ts
// ✅ the server filters in SQL, before paging
const res = await fetch(`${BASE}/member?q=${encodeURIComponent(needle)}`, { headers })

// ❌ searches only the pages you happened to fetch
const all = await firstPageOf('/member')
const hits = all.result.filter(m => m.name.includes(needle))
```

The same goes for counting. A header that says "12 members" built from
`result.length` says "12 members on page one". Counts come from the server.

Changing `q` starts a new result set — drop the cursor and request page one.

## Read capability fields; never re-derive them

```ts
// ✅
if (toolbox.can_share) showShareButton()

// ❌ drifts from the server the moment either side changes,
//    and cannot see team-admin or org-wide context at all
if (toolbox.owner_user_id === me.id || myPermissions.includes('toolbox:share')) …
```

Every row that can be acted on conditionally carries the answer. So do command
responses — a freshly created toolbox arrives with the same `can_*` fields a
list row has, so it does not lose its actions until the next reload.

| Field | Question it answers |
|---|---|
| `can_use` | May I run or stamp this? |
| `can_share` | May I add a grantee? |
| `can_manage` | May I change its settings? |
| `can_transfer` | May I give it away or delete it? (there is no `can_delete` — both are owner-only and share this flag) |
| `can_revoke_share` | May I revoke an existing share? |
| `can_see_shares` | May I be told who it is shared with? |

Two things not to confuse with a capability:

- **`access_via`** reports *how* you reach a resource — `owner`, `direct`,
  `team`, `org`. It is **omitted** when nothing reaches you. Absence means "no
  source to name", not "not permitted".
- **The presence of a `shares` array** is not permission to display one. Use
  `can_see_shares`.

When gating UI: an action you could never take on this resource should be
**absent**, not greyed out. A grant you are not senior enough to make — a role
above your own — should be **visible and disabled with a reason**, because
that option belongs to a list that genuinely exists.

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
      requiredPermissions: err?.details?.required_permissions as string[] | undefined,
      requestId: res.headers.get('X-Request-Id'),
      retryAfter: Number(res.headers.get('Retry-After')) || undefined,
    }
  )
}
```

| Code | Do this |
|---|---|
| `permission_required` | Show `message` **unchanged**. `details.required_permissions` lists alternatives — any one suffices. Do not retry. |
| `not_found` | May mean "not yours". Do not treat it as proof the resource is gone. |
| `validation_error` | Fix the request. Never retry unchanged. |
| `conflict` | Re-read the resource and decide; do not blind-retry. |
| `rate_limited` | Wait `Retry-After` seconds. |
| `internal_error` | Retry once with backoff, then surface `X-Request-Id`. |

Log `X-Request-Id` on every failure. It is what support will ask for, and it
is the only thing that ties your call to a server-side trace.

## Retry safely

Limits: **600 requests / 60s** on the REST API, keyed on the token.

```ts
async function call(path: string, init: RequestInit = {}, attempt = 0): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...headers, ...init.headers } })
  if (res.status === 429 && attempt < 3) {
    const wait = (Number(res.headers.get('Retry-After')) || 60) * 1000
    await new Promise(r => setTimeout(r, wait))
    return call(path, init, attempt + 1)
  }
  return res
}
```

**There is no idempotency key.** Retry reads freely. For writes, prefer a
re-read to confirm state over a blind repeat — and note that several
operations are naturally idempotent, including re-granting a share (it
replaces the level rather than stacking) and filing an access request (it
returns the existing pending one).

## Guessing a URL correctly

The conventions are regular enough to guess from, if you follow them:

| You want to | Path |
|---|---|
| Update a field on a resource | `PATCH /resource/:id` — **never** `/resource/:id/field-name` |
| Make something happen | `POST /resource/:id/<verb>` — `verify`, `reconnect`, `execute`, `transfer`, `test` |
| Reach a child collection | `/resource/:id/<collection>` — `/team/:id/member`, `/toolbox/:id/share` |
| Get the full set of something a row only previews | Its own endpoint exists. A row carries counts and a preview; the collection is paginated separately. |

If your guess is not in `https://api.elaichi.ai/schema/openapi.json`, it is not
a stable endpoint, whatever a browser devtools tab shows.

## Tokens in code

```ts
// Server-side only. An elch_ token carries the full permissions of whoever
// made it, and there is no scope system to narrow that.
const token = process.env.ELAICHI_API_TOKEN
```

- **Never ship a token to a browser or a client binary.** It is not scopable.
- **One token per integration**, named for it, so revoking one does not break
  the others.
- The permissions a token has are **the creating user's live permissions**.
  Create integration tokens from a purpose-made account with a custom role,
  not from an Org Owner's.
- Revocation is immediate; there is no read-back and no rotation endpoint —
  mint a new one and revoke the old.
