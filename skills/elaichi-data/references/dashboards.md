# Dashboards

A dashboard is one to ten pages of live widgets. Each widget reads a
collection, a read-only tool, or an automation's runs, and draws a metric,
chart, table or other view. Limits: 24 widgets a page, 100 in all, a
12-column grid.

## Drafts and publishing

Every dashboard has a **published** version (what viewers see) and, while
someone is editing, a **draft**.

- `dashboard.create` makes an **unpublished** dashboard. Nobody but its
  editors sees it until a person publishes it. It starts with one empty page
  unless you pass a full `definition`.
- Every edit (`dashboard.draft.apply`, `dashboard.upsert_widget`,
  `dashboard.remove_widget`) changes the draft only.
- `dashboard.get` returns the published `definition` and `revision`, and for an
  editor the `draft`, `draft_revision`, `draft_changes` (what differs, in
  words), `can_publish` and `ever_published`.
- Edits are guarded by **`draft_revision`**, never the live `revision`. A
  stale one is refused and names the current value. Re-read and redo the
  change.
- `dashboard.get_page` with `draft: true` reads the draft with live data
  (editors only, never cached). That is how you check your own work.

**Publishing.** `dashboard.publish` puts the draft in front of every viewer and
every public link at once, so it asks fresh every time.

- Publish only on the person's explicit say-so. Usually they review the
  changes and press **Publish** in Elaichi themselves, so offer that first.
- Send the `draft_revision` they reviewed. If the draft moved since, the
  publish is refused.
- `live_changed_since_draft` means someone changed the live dashboard after
  this draft began. Re-read with `dashboard.get`, tell the person what
  changed, and only with their confirmation publish again with
  `live_revision` set to the fresh live `revision`.
- A draft that no longer validates (a source is gone or unreadable) cannot be
  published.

**Other draft actions.**

- `dashboard.draft.discard` throws away a published dashboard's unpublished
  changes. They cannot be brought back. A never-published dashboard has
  nothing to go back to; it is deleted in Elaichi instead.
- `dashboard.update` renames. On a never-published dashboard it edits the
  draft; on a published one **viewers see the new name at once**. To stage a
  rename for review, use the `set_name` draft op.

## Edits in one call

`dashboard.draft.apply` takes up to 20 ops, all or nothing:

`upsert_widget`, `remove_widget`, `move_widget`, `resize_widget`, `add_page`,
`rename_page`, `move_page`, `remove_page` (its widgets go too; never the last
page), `set_filters` (replaces all), `set_shared_sources` (replaces all),
`set_name`, `set_description`.

The result carries `issues`. An error refuses the save. A `bp_dash_*` warning
is advice: fix it or explain why not.

## Widgets

A widget has all of these keys: `key`, `kind`, `title`, `size`
(`w` 1 to 12, `h` 1 to 12), `source`, `view`, `snapshot`. The last three are
required but may be null. A live widget sends `snapshot: null`.

| Kind | Shows |
|---|---|
| `metric` | One number, optionally compared with another period (`compare`) |
| `chart` | A bar, line, area, pie or scatter chart over grouped data |
| `table` | Rows, with optional column `format`, viewer controls and row buttons |
| `markdown` | Static text; `variant: "callout"` with a `tone` makes a note |
| `heading` | A full-width section label. Viewers can fold it to hide the widgets under it. |
| `progress` | A bar from a value and a total, or the live progress of automation runs |
| `stepper` | Which stage one row is at, from a select field |
| `form` | Adds a collection row, as each viewer |
| `action` | A button that runs a published automation's manual trigger, as the automation's owner |

Source types:

| `source.type` | Reads |
|---|---|
| `collection.aggregate` | `{ collection_id, spec: { group_by?, metrics, filter?, sort? } }`: the same spec `collection.aggregate` takes |
| `collection.query` | Flat: `{ collection_id, filter?, q?, sort?, fields?, limit? }` |
| `tool` | `{ toolbox_id, tool, args, transform }`: a read-tier tool, with a JSONata transform that returns the view's spec. Its `view` is null. |
| `automation.runs` | `{ automation_id, status?, limit? }`: the newest runs (at most 5). Viewers need `use` on the automation. |
| `shared` | `{ key }`: one of the dashboard's `shared_sources`, declared once and read by several widgets |

Collection sources and forms take an optional `table`. Markdown, heading,
form and action widgets have `source: null`.

**Do not guess shapes.** `dashboard.schema` with a `part` such as
`"view:chart"`, `"source:collection.aggregate"`, `"filter:select"` or
`"draft_op"` returns the live JSON Schema, the valid values, a working example
and the non-obvious rules. Call it before writing a kind you have not written
before, and again when validation reports a shape error.

**Preview first.** `dashboard.preview_widget` runs one widget as you and saves
nothing. A tool source is worth previewing every time, because its transform
must return exactly the view's spec.

### A chart split by a second field

A chart groups by ONE field, its x axis. For "per day, by tier", give the
aggregate two `group_by` fields and set the chart view's `series_by` to the
one that is not `x`, with exactly one `series` ref. Each distinct value
becomes a series, at most 20.

```json
{
  "kind": "chart", "chart": "bar", "x": "scored_at", "series_by": "tier",
  "series": [{ "ref": "leads" }], "stacked": true
}
```

over `group_by: [{ "field": "scored_at", "bucket": "day" }, { "field": "tier" }]`.
A second `group_by` without `series_by` is refused, and a pie cannot use one.
For other two-field breakdowns, use a table.

### A count metric

```json
{
  "key": "open_deals", "kind": "metric", "title": "Open deals",
  "size": { "w": 3, "h": 2 },
  "source": {
    "type": "collection.aggregate", "collection_id": "coll_…",
    "spec": { "metrics": [{ "key": "n", "fn": "count" }] }
  },
  "view": { "kind": "metric", "value": "n" },
  "snapshot": null
}
```

## Every widget runs as its viewer

This is the rule to explain when someone says "my colleague sees no data".

- A collection source needs the **viewer's** `view` access on that
  collection, and the viewer's row scope applies. A row-scoped collection
  shows each person their own rows, even inside someone else's dashboard.
- A tool source runs with the **viewer's** `use` on the toolbox and the
  viewer's own restrictions. A tool that changes data is refused at save.
- A viewer without access sees a no-access state that never names the
  resource.
- `dashboard.get` lists `sources` with `caller_can_read`, so you can see in
  advance which widgets a person will not be able to read.

**Sharing a dashboard never widens anyone's data access.** To show people data
from a connection they do not hold, let an automation (which runs as its
owner) write it into a collection, share that collection at `view`, and point
the widgets at the collection. Prefer collection sources over tool sources for
anything meant for a wide audience.

## Freshness

- Collection widgets are always current: their cache clears on every write.
- Tool widgets are cached per viewer for the source's `refresh_seconds`
  (60 seconds to 24 hours, default 300). `dashboard.get_page` may return a
  result a few minutes old.

## Filters

A dashboard may declare up to 8 page `filters`: `date_range`, `select`,
`multi_select`, `member` or `text`. A widget binds one inside a `match: "all"`
filter condition or a tool argument as
`{ "$filter": "<key>", "part": "start" | "end" }` (`part` for a date range).

- An unset filter drops its condition. It never matches nothing.
- `dashboard.get_page` takes `filters`: a date range takes a preset such as
  `"last_30_days"` or `"2026-01-01..2026-01-31"`, and a member filter takes
  `"me"`.
- `dashboard.filter_options` lists a select, multi-select or member filter's
  choices as you. Pass `draft: true` for a filter that is only in the draft.
- Filters only narrow what a viewer could already see.

## Forms, buttons and exports

You can author a `form`, an `action` button and table `row_actions`, but you
can never fill or press one. A person does that in Elaichi. In
`dashboard.get_page` they come back as a note, not as a control.

- A form writes a row **as the viewer**, through the collection's row scope
  and protected fields.
- A button or row action runs a published automation's manual trigger **as
  the automation's owner**, and is shown only to people who may run it.
- Export (CSV or NDJSON) of a table is for a signed-in person only, and only
  when the table's `viewer_controls.export` is on.

## Reading a dashboard for someone

`dashboard.get_page` returns one page with every widget's data. Report what
worked, and say plainly which widgets came back with no access and why. A
`truncate` column is cut to keep the result small; the person sees the full
text in the dashboard.

In the Elaichi agent, a chart drawn in chat is a snapshot of that
conversation. For a view that keeps updating and can be shared, build a
dashboard.

## Public links

A public link shares a **frozen copy** of a dashboard with anyone who has the
address, with no sign-in.

**Who can make one.** All of these must hold:

- An admin with `org:manage` has turned on **Public links** (Settings →
  Organization → Automations). It is **off by default**, and while it is off
  nobody can create, refresh or resume a link.
- The person has `dashboard:publish` (the Member role holds it) and can edit
  the dashboard.
- They do it in the console: **Share** → **Public link**. A link cannot be
  created over MCP or by the Elaichi agent.

At most 5 active links per dashboard. A link expires after 1 to 365 days
(90 by default).

**What the public sees.**

- A copy taken **as the person who published it**. A widget they could not
  read is never captured. The copy never grants more than they had.
- The dashboard name and the organization's display name. No ids, no tool or
  collection names.
- Left out entirely: buttons; forms (unless the link allows forms); widgets
  over a row-scoped collection; widgets that read a protected field; charts
  or totals grouped by a person.
- In a table, a person's name shows as **"A member"**.
- Before publishing, the console shows which widgets will be shown and asks
  the person to agree. If the dashboard later changes, a scheduled refresh
  publishes nothing and the link is suspended until someone reviews it again.

**How it updates.** Manually, after an automation that writes one of the
dashboard's collections finishes a run (at most once every 15 minutes), or
every 1, 6, 12 or 24 hours. Optional per-link switches let visitors fill in
forms, edit rows, or filter and sort tables live; each runs as the publisher
and is off by default.

**What you can do over MCP.**

| Operation | Does |
|---|---|
| `dashboard.public_link.list` | Each link's status (`active`, `paused`, `suspended`, `expired`, `revoked`), pages, refresh mode, expiry, `snapshot_at` and `snapshot_by`. **Never the address.** Use it to answer "is this dashboard public?" |
| `dashboard.public_link.refresh` | Takes a fresh copy now. Only the link's current publisher (`snapshot_by`) can, only on an active link, and only when the dashboard still matches what was agreed. Check `can_refresh_now` and `refresh_now_blocked_reason` first. Confirm with the person: it changes what strangers see. |
| `dashboard.public_link.revoke` | The address stops working at once. It cannot be undone; a new link must be made in the console. Confirm which link first. |

A link is a copy, so editing rows directly (not through the automation that
feeds it) leaves it stale. Compare `snapshot_at` with when the data changed,
and refresh if it is older. On an automation-refreshed link, `snapshot_at`
can trail the data by up to 15 minutes without anything being wrong.

## Deleting

`dashboard.delete` removes the dashboard, its draft and every public link.
Only the owner can. The collections and tools it reads are untouched. It
returns only `{ deleted: true }`, so name the dashboard from what you read
before the call.
