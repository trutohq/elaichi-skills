# Worked example: weekday Jira bugs to Slack

> "Every weekday at 9 in the morning, New York time, post the new
> high-priority Jira bugs to our #eng-bugs Slack channel."

This is the order of calls a model makes, with arguments that match the real
schema. Operation `a.b` is MCP tool `elaichi__a__b`. Ids like `tbx_…` and
`auto_…` stand for real ones you read from earlier results.

## 1. Check automations are on

Look for `elaichi__automation__draft__create` in your tool list. If no
`elaichi__automation__*` tool is there, automations are off for this
organization. Say so, point to their admin or support@elaichi.ai, and stop.

## 2. Find the Jira tool, in a stored toolbox

An automation's steps call tools through a **stored** toolbox (`tbx_…`), never
through the automatic ones.

1. `toolbox.list` — find a toolbox that holds a Jira search tool.
2. `toolbox.get` with `{ "id": "tbx_…" }` — read `tools[].name` for the exact
   tool name and its `input_schema`. Never guess a tool name.

No such toolbox? Build one first (see **elaichi-toolboxes**), then come back.

## 3. Get the Slack channel

Ask the person which channel, and get its Slack channel id (`C…`). The
definition must name it literally. Two things must already be true: Elaichi's
Slack app is installed for that workspace, and Elaichi has been invited to the
channel.

## 4. Look up the shapes you have not written before

```json
{ "part": "trigger:cron" }
{ "part": "step:filter" }
{ "part": "step:notify" }
```

Each `automation.schema` call returns the JSON Schema, a valid example and the
step's output shape.

## 5. Write the definition and validate it

The tool name `search_issues` below stands in for whatever name `toolbox.get`
returned. Its result fields (`key`, `fields.summary`) are Jira's usual shape;
the dry run in step 7 tells you the real one.

```json
{
  "schema_version": 1,
  "triggers": [
    { "key": "weekday_9am", "type": "cron", "cron": "0 9 * * 1-5", "timezone": "America/New_York" },
    { "key": "now", "type": "manual" }
  ],
  "toolboxes": ["tbx_…"],
  "steps": [
    {
      "key": "find_bugs",
      "name": "Find new high-priority bugs",
      "description": "Searches Jira for High and Highest priority bugs created in the last day.",
      "type": "call_tool",
      "toolbox_id": "tbx_…",
      "tool": "search_issues",
      "args": "{\"jql\": \"issuetype = Bug AND priority in (Highest, High) AND created >= -1d ORDER BY created DESC\"}"
    },
    {
      "key": "any_new",
      "name": "Stop when there are none",
      "description": "Ends the run quietly on days with no new bugs, so the channel only hears about real ones.",
      "type": "filter",
      "condition": "$count(steps.find_bugs.result) > 0"
    },
    {
      "key": "post",
      "name": "Post to #eng-bugs",
      "description": "Posts one message listing each new bug's key and title.",
      "type": "notify",
      "channel": "slack",
      "to": { "slack_channel_ids": ["C0123456789"] },
      "message": "$string($count(steps.find_bugs.result)) & \" new high-priority bugs:\\n\" & $join(steps.find_bugs.result.(\"• \" & key & \" \" & fields.summary), \"\\n\")"
    }
  ]
}
```

Things to notice:

- `args`, `condition` and `message` are all **JSONata strings**. The JQL sits
  inside a JSONata object literal inside a JSON string, so its quotes are
  escaped.
- The tool's result is read at `steps.find_bugs.result`, not
  `steps.find_bugs`.
- The `manual` trigger is there so the person can press Run to test it once it
  is live.
- The `timezone` keeps 9 o'clock in New York, not UTC.

Check it before saving: `automation.draft.validate` with
`{ "definition": { … } }` and no `id`. Fix any error issue it names.

## 6. Create it

```json
{
  "name": "Weekday high-priority Jira bugs",
  "description": "Every weekday at 9 New York time, posts new High and Highest priority Jira bugs to #eng-bugs.",
  "definition": { … }
}
```

`automation.draft.create` returns `{ automation, issues, tier, console_url }`.
The draft is saved even if `issues` is not empty. `tier` is `write`, because a
`notify` step sends messages.

## 7. Dry run

`automation.dry_run` with `{ "id": "auto_…" }`. The Jira search runs for real,
as you. The Slack post is only recorded as "would call", with a preview of the
message. Nobody is messaged.

Read the `find_bugs` step's output. If the issues are not at `result`, or the
title is not at `fields.summary`, fix the expressions:

1. `automation.get` with `{ "id": "auto_…" }` — note `draft.revision`.
2. `automation.draft.patch`:

```json
{
  "id": "auto_…",
  "draft_revision": 3,
  "patch": [
    { "op": "replace", "path": "/steps/2/message", "value": "…the corrected expression…" }
  ]
}
```

A refusal for a stale revision means someone saved in between. Read
`automation.get` again and redo the patch with the new revision.

Dry run again until the preview reads right.

## 8. Publish

Read `automation.get` once more. Check `can_publish` is true; if not,
`publish_requires.blocked_reason` says why in plain words.

`automation.publish` with `{ "id": "auto_…", "draft_revision": 4 }`. The
person confirms it in their AI client.

## 9. Turn it on

Publishing does not start anything. Tell the person: "It's published but not
on yet. Turn it on so it runs every weekday at 9?" On a yes:

`automation.enable` with `{ "id": "auto_…" }`. `automation.get` now shows the
next run in `engine.next_run_at`.

To check it works today, `automation.run` with
`{ "id": "auto_…", "trigger_key": "now" }`, then `automation.run.get` with the
returned `run_id` if it was still going after 20 seconds.

## 10. Show it

If your tool list has `show_object`, call it once with `{ "id": "auto_…" }`
so the person sees the finished automation. Otherwise, give them the
`console_url`.

## Going further

- **Catch weekend bugs on Monday.** Replace `created >= -1d` with a
  watermark: a `state.get` step at the start, and a `state.set` step at the end
  that saves when this run started. Ask `automation.schema` for
  `step:state.set`.
- **Let the person change which priorities count** without republishing:
  declare a `config_schema` setting and read it in the JQL as `config.<key>`.
  Ask `automation.schema` for `config_schema`. The Slack channel cannot be a
  setting: channels are always written literally in the definition.
