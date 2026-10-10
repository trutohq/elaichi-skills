# Operating automations

What happens after publishing: runs, approvals, sessions, settings, webhooks,
limits, and who may do what. Operation `a.b` is MCP tool `elaichi__a__b`.

## The automation's own state

`automation.list` and `automation.get` carry these. Read them; do not work
them out from other fields.

| Field | Values |
|---|---|
| `status` | `draft` (never published), `active`, `disabled`, `paused` |
| `paused_reason` | `owner_invalid` — the owner left or lost access. It stays paused until someone fixes the access and turns it back on. |
| `attention` | `null` when all is well. Otherwise `kind` is `failing`, `paused_owner_invalid`, `usage_limited`, `payment_unknown` or `slack_access`, with a plain `message`. |
| `run_summary` | `last_status`, `last_outcome`, `consecutive_failures` |
| `engine` (on `get`) | `next_run_at`, active and queued run counts |
| `can_run`, `can_manage`, `can_publish`, `publish_requires`, `can_edit_config` | What the caller may do, computed by the server |

`automation.list` takes `q` (name or description, matched before paging) and
`status`. It pages: send `nextCursor` back as `cursor` until it is null.

## Runs

| Operation | Use it for |
|---|---|
| `automation.run` | Start a run by hand. `input` must fit the automation's `input_schema`. Waits up to 20 seconds. |
| `automation.run.progress` | A run still going: each step's state, loop items settled, which branch arm ran, what a waiting step waits for |
| `automation.run.get` | How a run ended: status, outcome, the failing step and its error, an output preview. `counts` appear only once it finishes. |
| `automation.run.list` | Runs, newest first. Filter by `status`, `session_id` or `q`. |
| `automation.run_warnings` | Warnings one run recorded: a `check` set to warn, a `repeat` that ran out of tries, a settings change mid-run |
| `automation.run.transcript` | What one `agent` step said and did. Needs `step_seq`, the step's position in the run (0 is first). |

Run `status`: `queued`, `starting`, `running`, `waiting` (on an approval, a
wait or a called automation), `succeeded`, `failed`, `cancelled`, `skipped`.

Run `outcome` says more about a finished run: `completed`, `nothing_to_do`,
`completed_with_failures`, `completed_with_warnings`.

`automation.run` is refused, with a plain reason, when the automation was
never published, is disabled or paused, or already has too many runs queued
(20). Check `can_run` first.

Runs are kept for 30 days. Retrying a failed run and cancelling one are done
in the console, on the run's page.

## Approvals

An `approve` step parks the run until a person answers. The approval goes to
the named approvers in Elaichi, and by Slack and email unless the step turns
those off.

- `automation.approval.list` lists them. `scope: assigned` (the default) is
  what the caller may answer; `scope: visible` adds every approval on an
  automation they can see. `status` is `pending` (default), `resolved` or
  `all`.
- `automation.approval.get` reads one, including `delivery_line`: who was told
  on Slack and email, or why someone was not. Relay it when someone asks why an
  approver never saw it.
- **You cannot approve or reject from chat.** Send the person to the row's
  `console_url`: "Approve it in Elaichi or Slack: {console_url}".
- `from_older_version: true` means approving resumes a run on an older
  published version, with its old steps. Say so before they answer.
- Some approvals, such as one gating a destructive step or a payment, ask the
  approver to confirm it is them.

Publishing a new version never cancels approvals still waiting from older
versions. `automation.publish` returns a warning saying how many are left.

## Sessions

A session groups runs that share a `session_key` — one ticket, one Slack
thread, one customer — so later runs can see what earlier ones did. Runs in one
session go one at a time.

- `automation.session.list` and `automation.session.get` read them. Refer to a
  session by its title, never its id.
- `automation.session.runs` lists a session's runs.
- `automation.session.continue` starts another run in an open session, with
  the owner's access. Check `can_continue` first.
- `automation.session.close` closes one, so the next trigger for that key
  opens a fresh session. Nothing running is canceled. Needs Manage.
- `automation.session.messages` answers `session_transcript_unavailable`
  today. That is not an empty conversation: never say it was. Use
  `automation.session.runs` or the `console_url` instead.

A session with no activity for 30 days closes itself.

## Settings and run input

| | Declared in | Set by | Read |
|---|---|---|---|
| **Settings** | `config_schema` | Someone who may edit the settings | As `config.<key>`, fixed when a run starts |
| **Run input** | `input_schema` | Whoever presses Run | As `input.<name>`, per run |

- `automation.config.get` returns the declared settings, the current values,
  their `revision` and `can_edit_config`.
- `automation.config.update` takes `expected_revision` and the **complete**
  `values` map. A stale revision is refused naming the current one. A change
  applies to runs that start afterwards.
- A setting never holds a secret or an Elaichi id. Credentials belong on a
  connection; a reference to a person or team uses a `member` or `team`
  setting.
- Changing settings on an automation with a write or destructive tier, or a
  webhook or Slack trigger, needs `automation:publish` or `automation:manage`
  as well as edit access, because settings can steer what it does.
- `automation.options` lists the choices a picker offers for a setting or a
  run input, as the caller sees them. `target` is `{ kind: "input", property }`
  or `{ kind: "config", key }`. Search with `q`.

## Webhooks

A webhook trigger gets a public URL as soon as it is saved in the draft, so it
can be given to the sender before the first publish.

- `automation.webhook.list` shows each endpoint's URL, auth scheme and whether
  it is live. It never shows a secret. Needs Manage.
- Until the trigger is published, the endpoint **captures** deliveries instead
  of running. `automation.webhook.samples` lists the last few (5 per trigger,
  kept a week). Pass a sample's id to `automation.dry_run` as `sample_id` to
  test against a real delivery.
- Revealing, rotating or setting a secret is done on the automation's Triggers
  panel in the console.

## Usage limits

Admins can cap runs, steps, tool calls, agent tokens, fetches and
notifications. A run that meets a limit waits until the limit resets or is
raised, or fails with `usage_limit_reached`.

- `automation.usage.get` (`period`: `day` or `month`) shows one automation's
  use against its limits, with `hit` when a limit is holding runs. Say in plain
  words what is held and until when.
- Limits are changed in **Governance → Spend** in the console. No operation
  changes them.

## Who may do what

Sharing levels on an automation are `view`, `use` and `edit`. The owner holds
everything, plus delete and transfer.

| Action | Needs |
|---|---|
| See it in `automation.list` | Owner, or shared with you, a team of yours, or the whole organization |
| Read its runs, sessions, warnings, transcripts, usage | `use` |
| Run it, continue a session | `use` and `tool:execute`, on a published, enabled, unpaused automation (`can_run`) |
| Edit the draft, rename, enable, disable, discard | `edit` and `automation:create` or `automation:manage` (`can_manage`) |
| Publish | The same, plus `automation:publish` or `automation:manage` past a read tier or with a webhook or Slack trigger (`can_publish`) |
| Read webhook endpoints and samples, close a session, add a Slack trigger, let an agent step write | Manage on the automation |
| Delete, transfer | The owner only |
| Share | Done in the console with **Manage access** |

Every Member holds `automation:create`, `automation:share` and
`automation:publish`. `automation:manage` reaches automations other people own.

## Scopes over MCP

The person's consent decides which operations your connection may call:

- Reads need `mcp:read`. Drafting, publishing, enabling and running need
  `mcp:write`. `automation.delete` needs `mcp:destructive`.
- `automation.run`, `automation.dry_run`, `automation.publish`,
  `automation.enable` and `automation.session.continue` reach connected tools,
  so they also need connected-tool access.
- A connection limited to chosen toolboxes can run or publish only an
  automation whose steps stay inside those toolboxes. A `call_synthetic_tool`
  step is refused on such a connection.

See **elaichi-mcp** for reading a scope refusal.
