# Tool discovery: `search_tools` and `execute_tool`

Connected tools are never listed in `tools/list`, however few there are. These
two meta-tools are the whole surface.

## `search_tools`

```jsonc
{
  "query":  "create deal",   // a few concrete words. Omit to browse.
  "limit":  10,              // default 10, maximum 50
  "cursor": "…"              // pass back a previous result's next_cursor
}
```

Each match comes back with its **exact name, description and input schema**.
That schema is the contract for the `execute_tool` call that follows — read it
rather than assuming the usual arguments.

Searching runs entirely inside Elaichi. It touches no third party, costs no
rate limit, and is safe to call repeatedly.

### What it does not index

- **Elaichi's own operations.** `search_tools` never returns an `elaichi__…`
  name. Those stay listed individually in `tools/list`, so an empty search
  result says nothing about them.
- **A synthetic tool on its own.** The org's multi-step tools are not in the
  index by themselves — list them with `elaichi__synthetic_tool__list` and run
  one with `elaichi__synthetic_tool__execute`. One **is** searchable when it
  sits as an entry in a toolbox this grant reaches, because then it is just
  another tool of that toolbox.

### Ranking

Lexical. No embeddings. Tokens are lowercased and split on non-alphanumerics;
tokens of one character are dropped.

| Match | Score |
|---|---|
| Query token appears exactly in the tool **name** | +5 |
| Prefix match either direction on a name token (`contacts` ↔ `contact`) | +3 |
| Query token in the **connector** label | +2 |
| Query token in the **description** (exact or prefix) | +1 |

Ties break by name in codepoint order, then the list is sliced to `limit`.

### The relevance floor

Scoring alone would always return *something*, and "something from an app you
did not ask about" is worse than nothing, because the model then calls it.

So each query token is weighted by how much it narrows the live index — a word
sitting on every tool is worth zero, a word nothing matches is worth more than
the rarest word that does — and a tool must account for **half the query's
total weight** to be returned at all.

Two consequences:

- **Searching for an app the user has not connected returns nothing.** That is
  the honest answer. Report it; do not rephrase the query four times.
- **Rare words carry the query.** `list`, `all`, `get` are on most of a
  connector's tools and buy almost nothing. `schedules`, `deal`, `retro`,
  `webhook` decide the result.

Two deliberate fallbacks: an empty query returns the first tools as-is (use it
to browse), and a query whose every token is common ranks on score alone.

### Paging

A result reporting more matches than it returned carries `next_cursor`. Pass it
back as `cursor` **with the same query** for the next page. A tool you did not
see on page one has not been ruled out.

### Phrasing, by example

| Instead of | Search |
|---|---|
| "I need to log a new opportunity in our CRM" | `create deal` |
| "find out what's assigned to me this sprint" | `list issues` |
| "put this in the team's knowledge base" | `notion create page` |
| "who did we email last week" | `list messages` |

Two or three concrete words. Include the app name when the user named one — a
connector-label hit is worth +2 and sharpens the floor.

## `execute_tool`

```jsonc
{
  "name": "…",        // exact name from search_tools. Required.
  "arguments": { }    // must satisfy that tool's own input schema. {} if none.
}
```

**Pass the name back byte for byte.** Do not reformat it, do not rebuild it
from the connector and the verb, do not tidy the casing. Names are
disambiguated server-side; an invented one either misses or matches a
different account's tool.

This makes a live call to the third-party app under the user's own credential.
It can create, change, send or delete real things there, and the app — not
Elaichi — decides whether that can be undone.

**Confirm the target and the arguments with the user before anything but a
read.**

If the returned schema has a `connection` property, the user has several
accounts of that app connected — see
[Connections and accounts](./connections-and-accounts.md).

## Cost

| Call | Cost |
|---|---|
| `search_tools` | Internal. Cheap. |
| `execute_tool` | Restriction check + credential fetch + possible token refresh + live third-party API call. Seconds, and it spends the vendor's rate limit. |
