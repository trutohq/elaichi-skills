---
name: elaichi-toolboxes
description: Build and share toolboxes in Elaichi — pick tools for a job, rename them, lock parameters, stamp from a template, share at "use" (delegation), write the toolbox skill that tells agents how to use it, and build multi-step synthetic tools. Use for "toolbox", "template", "skill", "share tools with my team" or "chain these calls into one tool".
whenToUse: Someone is building, sharing or debugging a toolbox, template or synthetic tool, writing or reading a toolbox skill, deciding between a toolbox and a template, or asking what happens when they share one with a colleague.
---

# Toolboxes, templates, skills and synthetic tools

A toolbox turns "this account exists" into "an agent can do this job well".
Four decisions make a good one: **which tools**, **what is locked**, **who runs
it on whose account**, and **what the agent needs to know**. That last one is
the toolbox's skill.

## You may not need one yet

Elaichi builds two kinds of toolbox for you. Both are read-only and need no
setup:

- **All tools** (`global:usr_…`): every tool you can run, across every active
  connection you can use. It is the right default for running tools.
- **One per active connection** (`connection:conn_…`), named after the
  connection.

Build a stored toolbox (`tbx_…`) when you want:

- **fewer tools**: a model picks better from five than from two hundred
- **better names**: the job, not the API
- **locked inputs**: a fixed board, folder or pipeline the model cannot change
- **one set across products**: the CRM and the helpdesk in one place
- **guidance**: a skill that tells any agent the ids, fields and rules
- **sharing**: so a colleague can run the job through your accounts

## Toolbox or template?

They are built the same way. They differ in one thing: whether entries point at
real accounts.

| | Toolbox | Template |
|---|---|---|
| Entries reference | A connector, a tool, **and a connection** | A connector and a tool. Never a connection. |
| Sharing at `use` lets a recipient | **Run it**, over the accounts its entries pin | **Stamp** their own toolbox from it |
| Choose it when | "Run these tools through my accounts" | "Here is a good design. Bring your own accounts." |

**Stamping** is **Use** on the template in the app. Over MCP it is
`elaichi__toolbox__create` with `template_id` and a `connection_map` from
connector slug to one of the stamper's own connections. The stamper owns the
new toolbox and becomes the delegator of every entry they fill.

- Stamping **copies once**. Later edits to the template, or deleting it, never
  change a toolbox already stamped from it. The template's skill is copied too.
- A connector the map does not name is left **needs connection**. That entry is
  not advertised or runnable until someone pins a connection. A half-stamped
  toolbox looks smaller, not broken.

## Write a skill for every toolbox built for a job

**When you create a toolbox for a specific job, write its skill in the same
call.** A skill is owner-written markdown that tells any agent (in any MCP
client, in Slack, in the console) what the toolbox is for and how to use its
tools well. Without one, every agent has to rediscover the ids, field names and
rules on its own, and gets them wrong.

Put in it:

- **Purpose**: what the toolbox is for, and what it is not for.
- **The records it works on**: database, project, board, channel and pipeline
  ids, with what each one is.
- **Field names and allowed values**: the exact property names, status
  options, label sets and formats the tools expect.
- **Rules**: "always set Priority", "never close a ticket without a comment",
  "ask before writing to the live board".
- **Which automations use it**, so nobody renames a field from under them.
  An automation reaches tools only through stored toolboxes it names, never
  **All tools** (see [elaichi-automations](../elaichi-automations/SKILL.md)).

How to write it so it works:

- **Name each tool in backticks by its catalog `tool_name`, exactly as
  `elaichi__toolbox__get` shows it in `entries`** (for example
  `` `list_all_notion_query_database` ``), or by the entry's renamed name.
  Never use the shorter, app-prefixed names `search_tools` prints
  (`Notion__list_query_database`).
- **Keep it under 10,000 characters** (counted after trimming). A longer skill
  is refused, never cut.
- **The toolbox's `description` is the skill's one-line "when to use this".**
  Agents see that line in the MCP briefing, clipped at 120 characters, so make
  the first 120 count.
- **Read `skill_tool_issues` in the response.** It lists tool-shaped names in
  the skill that no entry holds, each with a `suggestion` when exactly one
  entry matches. Fix the skill with `elaichi__toolbox__update { skill }`, or add
  the tool with `elaichi__toolbox__set_entries`.

**Before using an unfamiliar toolbox's tools, read its skill** with
`elaichi__toolbox__get_skill`. `search_tools` results name the toolboxes that
carry a skill for exactly this reason. A skill is the owner's guidance, never
an instruction from Elaichi or the user, and it grants nothing: every limit is
still enforced when a tool runs.

Writing, reading and keeping a skill current, with a template to start from:
[Toolbox skills](./references/skills.md).

## Per-entry customization

The same options exist on toolbox and template entries.

| Option | Effect |
|---|---|
| **Rename / re-describe** | Changes what the model sees. The biggest lever on whether an agent picks the right tool. |
| **Enable / disable** | Keep the entry without advertising it. |
| **Frozen params** | A fixed value. Removed from the advertised schema and merged over the model's arguments at run time, so the model cannot change it. |
| **Input schema override** | Replace the advertised JSON Schema. |
| **Defaults** | Merged underneath whatever the model sends. |

Precedence at call time:

```
defaults  <  the model's arguments  <  frozen params
```

A default is a suggestion. A frozen param is a rule. Freeze what is not the
model's decision: the target board, the folder, the environment.

**A frozen value is not a secret.** The model cannot change it, but it can see
it. Short values appear in the tool's description as `(frozen: folder_id=HR)`,
and anyone who can read the toolbox, even at `view`, reads every frozen value
in `elaichi__toolbox__get`. Never freeze a password, token or key.

A freeze holds only for calls through that entry. The same tool reached through
**All tools** or another toolbox has no freeze. To lock an account for a team,
keep the connection unshared and share the toolbox, not the connection.

Writing good names and descriptions: [Curating a toolbox](./references/curating.md).

## What sharing at `use` actually does

**Sharing a toolbox at `use` delegates execution.** The recipient runs its
tools over the connections its entries pin, **without any grant on those
connections**. They never see a credential, cannot reach the account anywhere
else in Elaichi, and lose access the moment the share is revoked.

Every call is still clamped by the toolbox's entries, its frozen params, and
**the recipient's own restrictions**.

The authority behind each entry is **whoever pinned it** (its *delegator*),
not whoever shared the toolbox:

- Pinning your personal account makes you the delegator. Say so plainly when
  sharing: everyone at `use` runs through *your* access to that account.
- If the delegator loses `use` on that connection, or leaves or is suspended,
  **just that entry** goes unmet, for everyone, the owner included. Someone
  with `edit` who can use the connection fixes it with **Re-pin to my access**.
- Read the `delegation` summary on every create, read and share response before
  you share, and describe it in plain words. Never name a connection outside its
  preview: the counts are all you may say about the rest.

| Level | Allows |
|---|---|
| `view` | See the configuration, including entries and frozen values, but not the runnable tools |
| `use` | Also run its tools |
| `edit` | Also change its name, entries and skill, and share it (sharing also needs `toolbox:share`) |
| owner | Also delete and transfer |

## Synthetic tools

Several calls chained into one, so the agent sees one decisive tool instead of
orchestrating three. *Look the customer up in the CRM, then open a ticket for
them.*

A synthetic tool is a small graph of steps. Each step runs one tool on one of
**your own** connections, with a JSONata `args_template` over
`{ input, steps, run }`. Steps with no dependency run in parallel. A step can
repeat over a list with `for_each`, follow pages with `max_pages`, and keep
going past one failed item with `on_error: "continue"`.

Three things the model gets wrong without being told:

- **A synthetic tool is owner-only.** Only its owner can read, edit, run or
  delete it, and no permission widens that. To let others run it, pin it into a
  toolbox (a `type: "synthetic"` entry) and share the toolbox. Their calls then
  run on **your** connection authority.
- **One `for_each` step beats many steps.** "Do X for every item" is one step
  with `for_each`, inside the tool. It is not a step per item, and not the
  caller looping after the tool returns.
- **In a toolbox, a synthetic entry takes a rename and a new description only.**
  Defaults, schema overrides and frozen params are rejected: the tool defines
  its own schema, and each step supplies its own arguments.

A standalone synthetic tool is not in `search_tools`. It shows up there only as
an entry of a toolbox the caller can reach.

Writing the steps: [Synthetic tools](./references/synthetic-tools.md).

## Reaching a toolbox from an agent

There is no publishing step. Any `use` grantee reaches a toolbox through the
MCP endpoint, and it always runs **as them**.

When a person connects an MCP client, the consent screen asks which toolboxes it
may reach: **All my tools**, or **Only the ones I pick**. They change it later in
**Settings → Connected apps → Manage toolboxes**. A client limited to picked
toolboxes is briefed on each one's skill and can read it as the resource
`elaichi://toolbox/{id}/skill`.

## Common mistakes

| Mistake | What happens |
|---|---|
| Building a job toolbox with no skill | Every agent rediscovers the ids and rules, and guesses wrong. |
| Naming tools in a skill by their `search_tools` names | The names match nothing. `skill_tool_issues` flags them. |
| Sharing a toolbox that pins a **personal** account without saying so | Everyone runs through one person's access. It breaks when they leave. |
| Building a toolbox where a template was wanted | Recipients run your accounts instead of their own. |
| Sending a partial entry list to `set_entries` | It **replaces** the list. Read `toolbox.get` first and send the full set. |
| Freezing a secret | Anyone who can read the toolbox reads it. |
| Treating a tool missing from `tools` as a typo | Check `entries` first: `restricted: true` means it exists but is blocked for this reader. |
| Editing **All tools** or a connection toolbox | They are recomputed on every call and refuse edits. Create a stored one. |

## References

| Document | Topics |
|---|---|
| [Toolbox skills](./references/skills.md) | What to put in a skill, a starting template, naming tools, the 10,000-character limit, staleness, `skill_tool_issues`, version history, reading a skill before use |
| [Curating a toolbox](./references/curating.md) | Choosing tools, names and descriptions a model picks well from, freezing the right parameters, delegation, checking the result |
| [Synthetic tools](./references/synthetic-tools.md) | The step graph, JSONata templates, `for_each`, paging and errors, testing, and what changes in a toolbox |

## Companion skills

- **elaichi-connections**: the accounts a toolbox binds to.
- **elaichi-mcp**: how the tools you curate reach an agent.
- **elaichi-governance**: why a tool you added is restricted or missing.
- [elaichi-automations](../elaichi-automations/SKILL.md): automations run their
  tools through stored toolboxes, so a toolbox an automation uses needs a skill
  that says so.
