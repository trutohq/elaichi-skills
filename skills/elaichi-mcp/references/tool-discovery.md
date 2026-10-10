# Tool discovery: `search_tools`, `execute_tool`, `run_code`

Connected tools are never listed in `tools/list`, however few there are. These
meta-tools are the whole surface.

`search_tools` and `execute_tool` appear in `tools/list` only when there is
something to search: at least one connected tool, or a restricted one to name.
If they are missing, the grant has no `mcp:tools`, the role has no
`tool:execute`, or no account contributes tools yet. See
[Diagnosing a missing tool](./missing-tools.md).

## `search_tools`

```jsonc
{
  "query":   "create deal",   // a few concrete words. Omit to browse.
  "limit":   10,              // default 10, maximum 50
  "cursor":  "…",             // a previous result's next_cursor, same query
  "toolbox": "tbx_…",         // optional: only tools this toolbox reaches (id or exact name)
  "detail":  "summary"        // optional: "full" (default) or "summary"
}
```

Searching runs entirely inside Elaichi. It touches no third party, spends no
vendor rate limit, and is safe to call again.

The tool's own description names the apps this connection reaches ("This
connection reaches: …"). Read it before you guess at an app name.

### What a result holds

| Field | What it is |
|---|---|
| `result` | One ranked list. Callable rows carry `name`, `description`, `input_schema`. Restricted rows carry `name`, `connector_label` and `restricted`, and no schema. |
| `toolbox_ids`, `toolbox_count` (per row) | Up to three toolboxes that reach the tool, and how many in all. |
| `toolboxes` | Each named toolbox's `name` and `has_skill`, stated once. |
| `skills` | Toolboxes on this page whose owner wrote a skill. **Read the relevant one with `elaichi__toolbox__get_skill` before calling a tool from it.** Once per conversation is enough. |
| `connections_key` (per row), `connections` | For a tool on several accounts: the accounts behind its `connection` enum, with ids. |
| `matched`, `total_tools` | How many tools the query matched, and the size of the whole callable surface. Never confuse the two. |
| `restricted_count` | How many matches are restricted for this user. Present only when some are. |
| `next_cursor` | Pass back as `cursor`, with the same query, for the next page. `null` on the last page. |
| `blocked_connections` | Accounts whose connector's owner stopped sharing it. They contribute no tools, and reconnecting will not help. |
| `note` | Why an empty result is empty, or that a very long query was cut. |

A callable row's `input_schema` is the contract for the `execute_tool` call.
Read it; do not assume the usual arguments. A large schema may arrive trimmed:
it then carries `x_truncated`, every **required** property is still there, and
a call missing an optional one gets a validation error naming it.

### `detail: "summary"`

Rows come back with `name`, `description`, `required` and `connector` only, so
you can skim many tools cheaply. **You cannot call a tool from a summary row.**
Search again without `detail` before you call one.

### `toolbox`: search one toolbox

Pass a toolbox id (a row's `toolbox_ids`, or a key of `toolboxes`) or its exact
name. Each tool then appears as **that** toolbox reaches it, on the accounts it
pins. Use it when the user names a toolbox, or when a skill told you to work
inside one.

### Restricted rows

A tool the user may not run is still **named**, flagged `restricted`, with no
schema. A connector blocked whole shows as one row for the connector. The
`restricted` object says which layer blocked it (`restricted_by`: `role` or
`user`), and carries `request_access`. See
[Scopes and refusals](./scopes-and-refusals.md#restrictions).

Do not call a restricted row. Say it exists and is blocked, and offer to ask
an admin.

### What it does not index

- **Elaichi's own operations.** `search_tools` never returns an `elaichi__…`
  name. Those stay listed in `tools/list`, so an empty search says nothing
  about them.
- **A synthetic tool on its own.** List those with
  `elaichi__synthetic_tool__list` and run one with
  `elaichi__synthetic_tool__execute`. One **is** searchable when it is an entry
  of a toolbox this grant reaches.
- **A deleting tool, when the grant has no `mcp:destructive`.** It is left out
  of the index. Calling it by name gets a scope refusal.

### Ranking

Lexical. There are no embeddings. The ranker is BM25F over five fields, with
words stemmed on both sides:

| Field | Weight |
|---|---|
| Tool name | 5 |
| Names of the toolboxes that reach it | 3 |
| Connector label (`Notion`, `Jira`) | 2 |
| Tool description | 1 |
| Descriptions of those toolboxes | 1 |

Three things soften an exact match:

- a **prefix** match (`contacts` ↔ `contact`) counts for 0.6 of an exact one
- a small **synonym** map (`find`/`search`, `ticket`/`issue`, `create`/`add`,
  `email`/`mail`, …) counts for half
- one **typo** in a word nothing else matches (`slakc`) counts for half

Ties break by name, in codepoint order.

### The relevance floor

Scoring alone would always return *something*, and "something from an app you
did not ask about" is worse than nothing, because the model then calls it.

So each query word is weighted by how much it narrows this user's index — a
word on every tool is worth almost nothing, a word nothing matches is worth a
lot — and a tool must cover **half the query's total weight** to come back.

Two results of that:

- **Searching for an app the user has not connected returns nothing.** That
  is the honest answer. Report it; do not rephrase four times.
- **Rare words carry the query.** `list`, `all`, `get` sit on most tools.
  `schedules`, `deal`, `retro`, `webhook` decide the result.

An empty query returns the first tools as they are, for browsing.

### Paging

A result whose `matched` is larger than its page carries `next_cursor`. A
tool you did not see on page one has not been ruled out.

### Phrasing, by example

| Instead of | Search |
|---|---|
| "I need to log a new opportunity in our CRM" | `create deal` |
| "find out what's assigned to me this sprint" | `list issues` |
| "put this in the team's knowledge base" | `notion create page` |
| "who did we email last week" | `list messages` |

Two or three concrete words. Add the app name when the user named one. A
toolbox's name or the words its owner used to describe it also match.

## `execute_tool`

```jsonc
{
  "name": "…",        // exact name from search_tools. Required.
  "arguments": { }    // must satisfy that tool's input_schema. {} if none.
}
```

**Pass the name back byte for byte.** Do not reformat it, rebuild it from the
connector and the verb, or tidy the casing. Names are made unique on the
server; an invented one either misses or matches a different account's tool.
A name that misses gets an "unknown tool" answer with ranked alternatives —
read them.

This makes a live call to the third-party app under the user's own
credential. It can create, change, send or delete real things there, and the
app — not Elaichi — decides whether that can be undone.

**Confirm the target and the arguments with the user before anything but a
read.**

If the schema has a `connection` property, the user has several accounts of
that app — see [Connections and accounts](./connections-and-accounts.md).

## Files in and out

**Sending a file to a tool.** A tool's file argument takes a `file_id`:

- For a file on the user's machine, call `elaichi__file__upload_request` with
  a short `purpose`. Give the user its `upload_page_url`. They sign in, pick
  the files and press Confirm; the request lapses after 10 minutes. Poll
  `elaichi__file__upload_request_get` until `status` is `confirmed`, then pass
  each `file_id`. You never see the bytes.
- For text you wrote yourself (a CSV, a note), call `elaichi__file__create`
  (up to 1 MiB; kept 7 days). Never paste a user's own file into it.

**Getting a file back.** A download or export tool saves the file and returns
`file_id`, `filename`, `mime`, `size_bytes`, a `url` the user opens, and a
`resource_uri` (`elaichi://file/{id}`). Such a tool lists an optional
`filename`: pass the name the user wants on the **first** call, because a
saved file cannot be renamed.

## `run_code` (Code Mode)

When `run_code` is in `tools/list`, it runs a short JavaScript program that
calls tools, and only what the program returns comes back. Use it for two or
more dependent calls, loops, or pulling a few fields out of a large result
(decoding email bodies, counting rows). For one call whose whole result you
want, use `execute_tool`.

```js
// `code` is the body of an async function.
const r = await tools.gmail_list_emails({ q: "is:unread" })
return r.result.length
```

- Call a connected tool as `await tools.<name>(args)` or `tools["<name>"](args)`,
  with a name exactly as `search_tools` gave it and the arguments its
  `input_schema` describes. Names still come only from `search_tools`.
- Over MCP, `elaichi__*` operations are callable the same way:
  `await tools.elaichi__connection__list({})`. A grant with no connected
  tools gets a `run_code` that reaches only these.
- Run independent calls together with `Promise.all`.
- A connected tool usually returns `{ result, next_cursor, prev_cursor }`.
- A call throws on failure. A restricted tool throws an error whose
  `.restriction` says how to ask for access — do not retry it.
- Plain JavaScript only: no TypeScript, imports or `fetch`. `atob`,
  `TextDecoder` and `JSON` are there.
- Per run: 50 tool calls and 30 seconds. Per org: 20 runs a minute and, by
  default, 1,000 a day. Each call inside a run also counts against the MCP rate limit.

The reply is `{ ok, returned, tool_calls, logs?, truncated?, restricted? }`,
or `{ ok: false, error, tool_calls, … }`. Your program's value is under
`returned`, not `result`. `tool_calls` gives each call's `tool`, `ok`, `ms`,
the `shape` of each tool's first result, and the first `error` of each
distinct failure. **Read `shape` instead of spending runs probing a result.**
Before you loop over a tool you have not seen, call it once and return a
small sample. `restricted` lists each restriction a call hit, with its
`request_access`, even when the program caught the error.

Every call goes through the same gates as `execute_tool`: the same
permissions, restrictions, `mcp:destructive` for a deleting tool, and audit.
Confirm with the user before a program writes, sends or deletes anything.

If `run_code` is refused for a rate or daily limit, do the step with
`execute_tool` instead.

## Cost

| Call | Cost |
|---|---|
| `search_tools` | Internal. Cheap. |
| `execute_tool` | Restriction check + credential fetch + possible token refresh + live third-party call. Seconds, and it spends the vendor's rate limit. |
| `run_code` | One sandbox run, plus the cost of every tool call inside it. |
