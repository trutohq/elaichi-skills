# Writing a definition

An automation's definition is one JSON document. YAML in the console is the
same document in another view. This page lists what the document holds and the
rules that are easy to miss.

**`automation.schema` is the source of truth.** Its `json_schema` is generated
from the live validator, so it is always current. Use this page to know what
exists; call `automation.schema` for the exact shape before you write a part
you have not written before.

## Top-level fields

| Field | What it is |
|---|---|
| `schema_version` | Always `1` |
| `triggers` | 1 to 5 triggers (see below) |
| `toolboxes` | Stored toolbox ids (`tbx_…`) the steps may call. At most 10. Every `call_tool.toolbox_id` must be here. |
| `steps` | The steps, run in order. At most 50 in total, counting nested ones. |
| `collections` | Collection ids any step or trigger reads or writes. At most 10. |
| `knowledge_bases` | Knowledge bases an `agent` or `knowledge.*` step uses. At most 5. |
| `input_schema` | A JSON Schema object for manual-run input — a backfill, a button's form |
| `config_schema` | Settings the owner may change after publishing, read as `config.<key>` |
| `web` | `{ domains, methods? }` — the only hosts a `fetch` step or an agent's `web_fetch` may reach. Required for either. At most 20 domains. |
| `session_key` | JSONata over `{ trigger }` that groups runs into one session (a ticket, a thread). Absent means each run stands alone. |
| `session_title` | JSONata over `{ trigger }` that names a new session |
| `output` | JSONata over the run that becomes the run's output |

Why the automatic toolboxes are refused: `global:…` and `connection:…` mean
something different after the automation changes owner. Build a real toolbox
(see **elaichi-toolboxes**) and list its `tbx_…` id.

## Triggers

Every trigger has a `key` (unique in the definition) and a `type`. Most take
`overlap` — what to do when a run is still going: `skip`, `queue` or
`cancel_previous`.

| Type | Key fields | Defaults and limits |
|---|---|---|
| `manual` | — | `overlap: queue` |
| `cron` | `cron` (5 fields), `timezone` (IANA), `missed_runs` (`skip` or `run_once`) | UTC, `overlap: skip`. At most 3. A gap under 5 minutes is an error; under 15 minutes is a warning. |
| `schedule_once` | `at` (ISO time with `Z` or an offset), `missed` (`skip` or `run`) | `overlap: skip`. Must be at least 60 seconds in the future to publish. A late fire with `missed: run` still runs within 24 hours. |
| `webhook` | `auth`, `methods` (`POST`, `PUT`), `dedupe_key` (JSONata over `{ headers, query, body }`) | Auth defaults to Standard Webhooks. Other schemes: `token`, or `hmac` with preset `github`, `stripe`, `slack`, `linear` or `custom`. At most 3. |
| `collection_row` | `collection_id`, `table`, `on` (`inserted`, `updated`, `deleted`), `fields` | `fields` narrows `updated` only. The collection must be in `collections`. |
| `automation_run` | `automation_id`, `on` (`succeeded`, `failed`) | Default `on: [succeeded]`. Never this automation. Chains stop at depth 3. |
| `slack` | `slack_team_id`, `event` (`message` or `reaction_added`), `channel_ids`, plus `keywords`, `reactions`, `filter`, `threads` | Channel ids are written literally. Needs Manage on the automation. Outside guests are dropped unless `include_external_users` is true. |

`automation.run`'s `trigger_key` picks one manual trigger when there are
several (for example one per button). Without a manual trigger there is
nothing for `automation.run` to fire.

## Step options

Every step takes these, beside its own fields:

| Option | What it does |
|---|---|
| `key` | Its address: later steps read `steps.<key>`. Lower case, digits and `_`, starting with a letter. |
| `name`, `description` | What a person sees in the graph. Always set both. |
| `run_if` | JSONata. Falsy skips the step. |
| `error_handling` | `fail` (default), `ignore`, or `ignore_rest` |
| `retry` | `{ max_attempts (≤ 5), backoff (fixed or exponential), delay_seconds, on: [rate_limited, failed] }` |
| `timeout_seconds` | At most 300 |
| `repeat` | `{ until, interval_seconds, max_attempts, on_exhausted }` — polls a read-only `call_tool`, `call_synthetic_tool` or `fetch` until `until` is truthy over `{ output, attempt }`. A write is never repeated. |

A step after an `error_handling: ignore` step can test `errors.<key>` in its
`run_if` to know whether the earlier one failed.

## Steps, by job

### Calling tools

| Type | Key fields | Notes |
|---|---|---|
| `call_tool` | `toolbox_id`, `tool`, `args`, `connection_id?` | `tool` is the name the toolbox advertises — read it from `elaichi__toolbox__get` (`tools[].name`), never guess. `args` is a JSONata string. Output is `{ result, next_cursor, prev_cursor }`. |
| `call_synthetic_tool` | `synthetic_tool_id`, `input` | Output is the synthetic tool's own output |

A call that moves money also declares `money` (amount, currency, where they go
in the args). Whether it needs one or two approvals comes from the
organization's payment policy, never from the definition.

### Shaping and deciding

| Type | Key fields | Notes |
|---|---|---|
| `transform` | `expression` | Output is whatever the expression returns |
| `filter` | `condition` | Falsy skips every step after it at the same level. Use it for "stop when there is nothing new". |
| `branch` | `branches: [{ key, label?, when, steps }]`, `else` | First match wins. From outside it is `{ taken, output }`. |
| `map_fields` | `records`, `fields`, `fields_from_config?`, `keep_unmapped`, `skip_record` | Reshapes a list of records. Its `records` output feeds `collection.upsert`. |
| `check` | `assert`, `message`, `severity` (`fail` or `warn`) | `fail` stops the run; `warn` records a warning and goes on |
| `code` | `language: javascript`, `source`, `input` | Pure JavaScript: no network, no tools. `source` reads the variable `input`, built from the step's own `input` JSONata. 5 seconds of CPU. |
| `parse` | `format` (`xml`, `sitemap`, `html_to_markdown`, `csv`), `input`, `options` | CSV pages with `options.offset` and `options.limit` |

### Loops and side by side

| Type | Key fields | Notes |
|---|---|---|
| `foreach` | `items` (or `pages`), `steps`, `item_name`, `concurrency` (≤ 5), `batch_size`, `guard` | The loop variable is `item` (and `index`) unless renamed. `pages` walks a paginated tool. At most 10,000 items. Output is `{ count, succeeded, failed, skipped, results }`; `results` is left out past 100 items. |
| `parallel` | `arms: [{ key, label?, error_handling?, steps }]` | 2 to 5 arms at the same time. Output is `{ arms, succeeded, failed, failed_arms }`. |

A `guard` (`min_success_rate`, `max_error_rate`, `min_success_count`) stops a
bad loop early. Put one on any loop that writes — the validator warns when you
do not.

### Waiting and remembering

| Type | Key fields | Notes |
|---|---|---|
| `wait` | `seconds` or `until` | At most an hour |
| `state.get` | `keys` | Reads values kept across runs (a watermark, a "seen" map) |
| `state.set` | `state_key`, `value` | Writes one. Put it after the step that must succeed first, so a failure retries next run. |
| `runs.query` | `scope`, `status`, `limit` (≤ 20) | Reads earlier runs of this automation or session |

### Collections

`collection.upsert` (`rows`, at most 500 per step — batch bigger sets in a
`foreach` with `batch_size`), `collection.query`, `collection.aggregate` and
`collection.sync` (pushes records to another system, one tool call each,
skipping records whose content did not change). Each takes `collection_id` and
an optional `table`. A `collection.query` row's values are at
`steps.<key>.rows.fields.<field>`.

### People

| Type | Key fields | Notes |
|---|---|---|
| `approve` | `title`, `message`, `approvers: { users, teams, include_owner }`, `expires_after_seconds`, `on_reject`, `on_expire`, `min_approvals` | The run waits. Approvers are fixed; the owner is included by default. Default expiry 3 days, at most 30. Output is `{ decision, resolved_by, resolved_at, note }`. |
| `notify` | `channel` (`slack` or `email`), `to`, `message`, `subject`, `blocks`, `email`, `links`, `attach` | `to.members` may be computed (org members only). `to.slack_channel_ids` and `to.emails` are written literally. `message` is required even with `blocks` or `email`. |
| `slack.reply` | `message`, `broadcast` | Replies in the thread that started a Slack-triggered run |
| `member.lookup` | `by` (`email` or `user_id`), `value` | Finds organization members |
| `file.write` | `format: csv`, `filename`, `rows`, `columns` | A notify step can attach it |

Slack notify needs Elaichi's Slack app installed for the workspace, and
Elaichi invited to the channel. Set `slack_team_id` when the organization has
more than one Slack workspace. One run may make at most 200 notify deliveries
in total.

### AI and knowledge

| Type | Key fields | Notes |
|---|---|---|
| `agent` | `instructions`, `input`, `tools`, `output_schema`, `allow_writes`, `knowledge`, `budget`, `model` | The only step that calls a model. `output_schema` is required. Tools are read-only unless `allow_writes`, which needs Manage. Answer at `steps.<key>.output`. |
| `knowledge.search` | `knowledge_base_ids`, `query`, `limit` | |
| `knowledge.write` | `knowledge_base_id`, `title`, `body`, `external_key` | |

An agent's budget defaults to 8 turns, 20 tool calls, 200,000 tokens and 300
seconds. Publishing one needs the organization's Agent to be on, and its model
must be one the organization has enabled.

### Web and other automations

| Type | Key fields | Notes |
|---|---|---|
| `fetch` | `url`, `method`, `query`, `headers`, `body`, `response` | Only hosts in `web`. Carries no credentials: auth, cookie and API-key headers are refused — use a connection instead. GET is a read, POST/PUT/PATCH a write, DELETE destructive. Fetched content is untrusted. |
| `automation.call` | `automation_id`, `input`, `wait_seconds` | Runs another published automation and waits for its output |

## Expressions

Every expression is JSONata. It can read: `steps`, `trigger`, `input`,
`config`, `state`, `run`, `item`, `index`, `errors`, `session`.

- An earlier step is `steps.<key>`. No `$steps`.
- Text is quoted inside the string: `"\"Daily report\""`.
- An object is a JSONata object literal inside the string:
  `"{\"channel\": steps.pick.id, \"text\": \"hi\"}"`.
- Read optional run input with a default, so scheduled runs (which have no
  input) still work: `$exists(input.days) ? input.days : 3`.

## Tiers and what publishing needs

Each save works out the draft's **tier** from its steps: the worst step wins.

| Tier | Comes from | Publishing needs |
|---|---|---|
| `read` | Reads only | `automation:create` or `automation:manage`, with edit access |
| `write` | Any write tool, `notify`, or a write `fetch` | Also `automation:publish` (every Member holds it) or `automation:manage` |
| `destructive` | Any destructive tool or a DELETE `fetch` | The same, and an `approve` step gating each destructive step |
| `null` | Elaichi cannot tell yet | Cannot publish. Finish the steps. |

A webhook or Slack trigger also needs `automation:publish` or
`automation:manage` to publish, whatever the tier, because it lets the outside
world start a run.

The gating `approve` step must have no `run_if`, `error_handling: fail`,
`on_reject: stop` and `on_expire: fail`.

## Issues

Every save, validate and publish answers with `issues`: `{ severity, step,
field, message }`. Errors block publishing, never saving.

Best-practice warnings carry a `bp_` code and a `fix`. They never block. The
ones you will meet most:

| Code | Means |
|---|---|
| `bp_unnamed_step`, `bp_missing_description` | A step a person cannot read |
| `bp_schedule_too_frequent` | A schedule more often than every 15 minutes |
| `bp_cron_without_timezone` | A schedule at a set hour, read in UTC |
| `bp_external_message_without_approval` | An email to an outside address, or a tool that sends a message, with no approval before it |
| `bp_loop_write_without_guard` | A write inside a loop with no guard |
| `bp_retry_on_write` | A retry on a write with no unique request key |
| `bp_write_without_check` | No `check` after the last write |
| `bp_agent_allows_writes` | An agent step that may change data |
| `bp_unused_scope` | A declared toolbox or other scope no step uses |
| `bp_broad_web_domain` | A wildcard web domain |
