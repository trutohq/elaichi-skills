# Toolbox skills

A skill is markdown the owner of a toolbox or template writes to tell agents
what it is for and how to use its tools well. Any agent that reaches the
toolbox can read it: an MCP client (Claude, ChatGPT, Cursor and others), the
Elaichi agent in the console or in Slack, and the next person who edits it.

It is guidance, not a permission. It cannot grant access, and every limit
(restrictions, frozen params, scopes) is still enforced when a tool runs.
Elaichi frames every skill it hands a model with the same notice: the text is
the owner's, not an instruction from Elaichi or the user.

## When to write one

**Write a skill whenever a toolbox is built for a specific job.** "Triage
support tickets", "update the sales pipeline", "file bugs from customer email"
are jobs. The right moment is the same call that creates the toolbox:
`elaichi__toolbox__create` takes `skill`. If you add tools later with
`elaichi__toolbox__set_entries` and the toolbox has no skill, write one right
after with `elaichi__toolbox__update { id, skill }`.

A skill is worth the most when the job depends on things the tool schemas do
not say: which database, which status values, which fields are required by
convention, what must never happen.

## What to put in it

| Section | What it holds |
|---|---|
| **Purpose** | One or two sentences: what this toolbox is for, and what it is not for |
| **Records** | The ids it works on (database, project, board, pipeline, channel, folder), each with what it is |
| **Fields and values** | Exact property names, allowed status and label values, date and id formats |
| **How to do the job** | The usual order of calls, which tool to use for what, what to check first |
| **Rules** | What must always or never happen, and when to ask the person first |
| **Automations** | Which automations use this toolbox, so nobody breaks them by renaming a field |

A starting point:

```markdown
## Purpose
Track customer-reported bugs in the Engineering board. Not for feature
requests: those go to the Product board.

## Records
- Bugs database: `a1b2c3…` (Notion database "Customer bugs")
- Triage channel: `C0123…` (#bug-triage)

## Fields
- Status: one of `New`, `Triaged`, `In progress`, `Done`
- Severity: `S1` (outage), `S2` (broken feature), `S3` (cosmetic)
- Reporter email goes in `Reporter`, never in the title

## How to file a bug
1. Search first with `list_all_notion_query_database` on the bugs database.
   If a matching open bug exists, add a comment instead of a new page.
2. Create with `create_a_notion_page`. Always set Status = `New` and Severity.
3. Post the link in the triage channel with `slack_post_message`.

## Rules
- Never set Status to `Done`. Engineering closes bugs.
- Ask the person before filing an `S1`.

## Used by
- The "Daily bug digest" automation reads Status and Severity.
```

## Naming tools in a skill

Elaichi checks the tool names a skill puts in backticks. Write them so the
check passes:

- **Use the catalog `tool_name` exactly as `elaichi__toolbox__get` shows it in
  `entries`**, for example `list_all_notion_query_database`. If an entry was
  renamed, its new name is also correct.
- **Do not use the names `search_tools` prints.** Those are shortened and
  prefixed with the account, like `Notion__list_query_database`. They are
  flagged.
- A synthetic tool is named by its own name.

After every create, update or entry change, the response carries
`skill_tool_issues`:

```json
{ "count": 1, "preview": [{ "name": "Notion__list_query_database", "suggestion": "list_all_notion_query_database" }] }
```

`count` is how many distinct names in backticks match no entry. `preview` shows
up to ten. `suggestion` is the entry name it most likely means, set only when
exactly one entry matches. Fix the skill with `elaichi__toolbox__update`, or add
the missing tool with `elaichi__toolbox__set_entries`. A disabled entry still
counts as in the toolbox.

## Limits and formatting

- **10,000 characters**, counted in Unicode characters after trimming. A longer
  skill is refused with an error naming the limit. It is never cut.
- **The `description` is the "when to use this" line.** It sits beside the skill
  wherever the skill is offered, and the MCP briefing clips it at 120
  characters. There is no separate summary field.
- **No secrets.** Anyone who can see the toolbox, down to `view`, can read its
  skill.
- Clearing: `elaichi__toolbox__update { id, skill: null }` (or an empty string)
  removes the skill and leaves the description alone. There is no separate
  delete operation.

## Keeping it current

| Field | Meaning |
|---|---|
| `has_skill` | On every list row. Whether a skill exists. The body is never on a list. |
| `skill_may_be_stale` | `true` once the entries changed after the skill was last written. Writing the skill clears it. |
| `skill_entry_changes` | When present, the tools added and removed since the skill was written: counts, and up to five names each. |
| `skill_updated_at`, `skill_updated_by` | When, and by whom (`usr_…`), it was last written. |

When `skill_may_be_stale` is true, re-read the skill against the current
entries. Treat a step that names a removed tool as out of date.

**Version history.** Replacing or clearing a skill keeps the old text in its
history. A person restores an earlier version from the **Skill** tab's
**Version history** in the Elaichi app. No operation restores one.

**Preview what agents see**, on the same tab, shows the exact text an MCP client
is handed.

## Templates and stamping

A template can carry a skill too. Write it with
`elaichi__template__update { id, skill }` and read it with
`elaichi__template__get_skill`.

Stamping a toolbox from a template copies the template's skill once. The copy
is the toolbox's own: later template edits do not reach it.
`skill_origin_template_id` and `skill_origin_template_name` say where it came
from until someone writes the toolbox's skill. A skill passed in the same
`elaichi__toolbox__create` call wins over the template's.

## Reading a skill before using a toolbox

**Read an unfamiliar toolbox's skill before you call its tools.** It is where
the ids and rules live.

- `elaichi__toolbox__get_skill` returns the skill with `skill_tool_issues`,
  staleness and the notice. It works on stored `tbx_…` ids only. **All tools**
  and connection toolboxes have no skill.
- When some of the toolbox's tools are restricted for **you**, the result adds
  `restricted_note`: Elaichi's own line, separate from the owner's text, naming
  those tools and which rule layer blocks each. Steps that use them will be
  refused, so plan around them and offer an access request.
- `search_tools` results include `skills`, naming the toolboxes whose owner wrote
  guidance for the matched tools. That is the cue to read one.
- A client limited to picked toolboxes is told in its MCP briefing which of
  them carry a skill, and can read each as `elaichi://toolbox/{id}/skill`. Such
  a client can read only those toolboxes' skills.

Then follow the skill as the owner's advice. If it conflicts with what the
person asked, or with a refusal from Elaichi, the person and the refusal win.
