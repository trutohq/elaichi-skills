# Collections

A collection is a shared data table with a typed schema, like an Airtable
base. Automations fill most of them. People read them in the console, and
dashboards chart them.

## Tables

A collection is a small database of up to **20 tables**. Each table has its
own fields and rows. There are no joins between tables.

- Every collection has the table `main`. It cannot be deleted; delete the
  collection instead.
- Every row operation aims at `main` unless you pass `table` (a key from
  `collection.table.list`). `collection.get` reads `main`;
  `collection.table.get` reads another table.
- One share covers every table. Access is per collection, never per table.
- A table key is permanent: lowercase letters, digits and underscores,
  starting with a letter.

**Raw and derived tables.** When an automation pulls data from another
system, keep it as fetched in a table named `raw_<source>`: the source's
stable id as the unique key, the original fields, and `fetched_at`. Build the
tables people read (rollups, computed costs) from it in later steps. A fix to
the processing can then be replayed without fetching again. Dashboards read
the derived tables; raw tables are for drill-down.

## Fields

Field types: `text`, `long_text`, `number`, `boolean`, `date`, `datetime`,
`select`, `multi_select`, `user`, `email`, `url`, `json`.

| Type | Holds |
|---|---|
| `text` / `long_text` | A plain string. `long_text` holds up to 20,000 characters. |
| `number` | A number. `options.format` is `plain`, `integer`, `currency` or `percent`; `precision` 0 to 8; `currency_code`. |
| `date` / `datetime` | `YYYY-MM-DD` / a UTC ISO timestamp |
| `select` / `multi_select` | One or several of `options.choices` |
| `user` | An organization member's `usr_` id |
| `json` | A small JSON value, up to 16 KiB |

Get these right when you create a collection:

- **`key`** is the machine name every operation uses. It is never renamed for
  you, so pick a readable one.
- **`description`**: give every field one line on what it holds and where the
  value comes from. The console flags fields without one, and automations and
  dashboards are written from it.
- **`primary_field`** is the row's display title. Allowed types: text, number,
  date, datetime, email, url, select. Omit it to use the first field.
- **`unique_key`** is 1 to 3 field keys that identify a row. `upsert_rows`
  matches on it. Without one, a collection can only be inserted into.
- **`row_scope`** names a `user` field. `view` and `use` grantees then see and
  write only rows where that field is their own id. Rows with it empty are
  visible only to the owner and `edit` grantees.
- **`indexed`**: index the fields people, automations and dashboards filter,
  sort or group by (dates of a time series, status selects, owner fields,
  lookup keys). The primary field, unique key fields and row scope field are
  indexed for you. Do not index long text, JSON or multi-select fields.

## Reading

`collection.query_rows` filters, searches and sorts on the server.

- `filter` is one level of up to 20 conditions with `match` `"all"` or
  `"any"`. The operators a condition may use depend on the field type; a
  wrong one is refused. `collection.get` tells you each field's type.
- `q` is a case-insensitive substring search over the text-like fields.
- `fields` limits which keys come back. `limit` is 1 to 50 rows a page.
- `total_count` is on the first page only.
- `users` resolves every `user` value to a name and email, so never show a
  raw `usr_` id. Say the name.

`collection.aggregate` computes totals on the server:

- `metrics` (1 to 5): `count` (no field), `count_distinct`, `sum` and `avg`
  (number fields), `min` and `max` (number, date or datetime).
- `group_by` (at most 2): text, select, user, boolean, number, date or
  datetime fields. A date field may add a `bucket`: `day`, `week`, `month`,
  `quarter` or `year`.
- `total_groups` is the true count, even when a page shows fewer.

**Row scope changes the answer.** On a row-scoped collection, a `view` or `use`
grantee gets only their own rows and totals (`row_visibility: "own"`). An
owner or `edit` grantee gets the organization-wide numbers. Say which one you
are reporting.

## Writing

| Operation | Use it to |
|---|---|
| `collection.insert_rows` | Add new rows. All or nothing: one bad cell, or a duplicate unique key, refuses every row with the problems listed. |
| `collection.upsert_rows` | Insert or update by the unique key. `merge: "patch"` (default) changes only the fields you send; `"replace"` clears the ones you leave out. |
| `collection.update_rows` | Change existing rows on the server. Never read rows and write each one back. |
| `collection.delete_rows` | Remove rows. Permanent. |

Rules for every write:

- **At most 100 rows per call.** More is refused outright.
- **`typecast` defaults to true over MCP** (the REST API defaults it to false).
  It turns `"42"` into `42` for a number field. It never invents a new select
  choice: an unknown choice is refused.
- **Row ids come back in the order you sent the rows**, so position tells you
  which id is which.
- On a row-scoped collection, a new row belongs to the caller unless the
  scope field names someone else, which is refused.

`update_rows` has two forms:

1. `rows: [{ id, fields, expected_version? }]`: a different value per row.
2. A selector (`row_ids`, `filter`, `q`, or `all: true`) plus `set` (literal
   values) and/or `set_expr` (JSONata per row over
   `{ id, fields, created_at, updated_at }`, for example
   `{"label": "$uppercase(fields.name)"}`).

An empty selector is refused. To touch every row, say `all: true`, and only
when that is really meant. The selector form handles one page of up to 100
rows per call: **send `next_cursor` back as `cursor` with the same selector
until it is null.** A row that fails is listed in `errors` and the rest still
save. `delete_rows` with a selector pages the same way.

Before deleting, run `collection.query_rows` with the same filter and show
the person what will go. With row history off, a deleted row cannot come back.

## Changing the schema

`collection.update_schema` (and `collection.table.update_schema` for another
table) applies a batch of up to 20 ops atomically: `add_field`,
`update_field`, `change_type`, `drop_field`, `reorder_fields`,
`set_primary_field`, `set_unique_key`, `set_row_scope`.

- **`expected_version`** is the current `schema.version` from
  `collection.get` (`schema_version` for another table). A stale one is
  refused naming the current version: re-read, then reapply.
- **Nothing that clears data happens from chat.** Every call is previewed
  first. If any op would clear existing values (a lossy type change, dropping
  a field that holds data), the whole call is refused and points to the
  console. No argument forces it through.
- A field in the unique key or the row scope cannot change type or be
  dropped. Change the key or scope first.
- A field key cannot be renamed while an automation or dashboard uses the
  collection. Check `collection.references` before you change or drop a
  field. It needs `edit` access.
- `update_field` with `rename_choices` renames a select choice and rewrites
  every row that holds it.

`collection.update` renames a collection or changes its description. Keep
names short and plain ("Leads", not "leads_table_v2").

## Row history and restore

History records each change to a row: who or what made it, when, and which
fields changed. It is **off by default**.

- Turn it on in the console (the collection's **Table settings** → **Keep a
  history of row changes**), or with the schema op
  `{ "op": "set_history", "enabled": true, "retention_days": 90 }`.
  Retention is 1 to 365 days, default 90. A row keeps at most 500 versions.
- Turning it off keeps what was already recorded. Wiping the history clears
  data, so it is console-only.

| Operation | Does | Needs |
|---|---|---|
| `collection.row_history` | A row's versions, newest first: op (`baseline`, `insert`, `update`, `delete`, `restore`), changed fields, who, when. At most 20 a page. | `view` |
| `collection.row_version` | One version in full, with the diff from the one before. Show it before a restore. | `view` |
| `collection.row_restore` | Puts the row back as that version had it, as a **new** version, so a restore can itself be undone. | `use` |

- Actors come back as ids with `users` and `automations` directories. Say
  the names.
- Pass `expected_version` (the `current_version` from `row_history`) to
  `row_restore`, so a row someone changed meanwhile is refused instead of
  overwritten.
- A deleted row can be restored while its history is kept.
- The restore lists `dropped_fields` (fields the collection no longer has)
  and `cleared_fields`. Tell the person about both.

## How automations use collections

An automation runs as its **owner**, so the owner needs `use` on any
collection it writes and `view` on any it reads.

- Steps: `collection.upsert` (at most 500 rows per step; wrap bigger sets in
  a `foreach` with `batch_size` 500 or less), `collection.query`,
  `collection.aggregate`, and `collection.sync` (push records to another
  system).
- Trigger: `collection_row`, on `inserted`, `updated` or `deleted` rows.
- Every collection a definition reads or writes must be listed in its
  `collections: []`. A table an automation names cannot be deleted.
- Automation steps always read protected fields as hidden, whatever the
  owner's access.

Authoring automations is its own subject; `automation.schema` returns the
exact step shapes.

## Deleting

- `collection.delete` removes the collection, every table, every row and the
  history. Only the owner can. Anything that reads or writes it breaks at
  once: read `collection.references` first and tell the person.
- `collection.table.delete` removes one table. It is refused while an
  automation uses that table.
- Both return only `{ deleted: true }`, so name what was deleted from what
  you read before the call.
