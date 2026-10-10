# Curating a toolbox

The goal is not "expose everything". It is that a model, seeing only names,
descriptions and the toolbox's skill, picks the right tool on the first try and
stays inside the job.

## Choose tools by the job, not by the product

Start from the sentence someone would say, *"file a bug from a customer
email"*, and include only what that sentence needs. A connector with two
hundred methods adds two hundred candidates to a model's choice, and accuracy
drops well before that.

Five to fifteen well-named tools is a good toolbox. Forty is usually two
toolboxes. A toolbox holds at most 200 entries.

Find tool names from the account you will pin:

```
elaichi__connection__list_tools     ← tools on this account you may run
elaichi__connector__list_tools      ← the same set, by connector slug
```

Both apply **your** restrictions before they answer, so every row is a tool you
can pin. `restricted_count` says how many they left out. Both page: `limit`
defaults to 200, and a non-null `nextCursor` means there are more.

Entry `tool_name` is the **catalog** name these lists return (for example
`list_all_notion_query_database`), never the account-prefixed name
`search_tools` shows. Entries are checked as a set: one bad name, or one tool
restricted for you, rejects the whole call and nothing changes.

## Write the name and description for the model

Names and descriptions are what the model compares. Rewriting them takes
minutes and changes which tool it picks.

**Name it after the job.** Search matches words before the model reasons, and
the name weighs most.

| Instead of | Use |
|---|---|
| `post_v3_objects_tickets` | `create_support_ticket` |
| `list` | `list_open_bugs` |
| `search_2` | `find_customer_by_email` |

A renamed entry takes a name of 1 to 64 characters and a description of up to
4,000.

**Describe when to reach for it, not which endpoint it hits.** The description
breaks ties between two plausible tools, so spend it on the difference:

> Creates a bug in the Engineering project. Use this for defects reported by
> customers. For feature requests use `create_feature_request` instead.

Naming a confusable sibling is worth more than another sentence about this
tool.

**Use the words a person would use.** Search is lexical. A tool nobody can find
is a tool nobody runs.

**Put the job's knowledge in the skill, not in twenty descriptions.** Ids,
allowed values and rules that apply across tools belong in the toolbox's skill.
See [Toolbox skills](./skills.md).

## Freeze what is not the model's decision

A frozen parameter is removed from the advertised schema and merged over the
model's arguments at run time. The model cannot set it or change it.

Good candidates:

- The target board, project, folder, pipeline or workspace
- An environment, region or account segment
- A fixed label, source or channel that marks where records came from

The model can still **see** frozen values: short ones appear in the tool's
description, as in `(frozen: project=ENG)`, and anyone who can read the toolbox
reads all of them. Freeze ids and labels, never secrets.

Defaults sit *underneath* the model's arguments:

```
defaults  <  the model's arguments  <  frozen params
```

Use a **default** when the model may reasonably change it (page size, a usual
assignee). Use a **frozen param** when it must not (the production project id).

Two entries of the same tool that freeze different values become two separate
tools. Their names are told apart by those values, like `delete_event_hr` and
`delete_event_legal`, which also makes each findable by search.

Some fields cannot be frozen or defaulted at all. On Slack's message-posting
tools, for example, the sender fields (`username`, `icon_url`, `icon_emoji`,
`as_user`) are refused, because Elaichi strips them from every post.

## Disable rather than delete

Disabling an entry keeps it without advertising it. Use it while narrowing a
toolbox: turn things off, see whether anyone misses them, then remove them.

## Decide who runs whose accounts

Before sharing, answer one question: **should recipients run your accounts, or
their own?**

**Your accounts: share the toolbox at `use`.** They run the tools over the
connections your entries pin, with no grant on those connections. They never
see a credential and cannot reach the account anywhere else. Every call stays
clamped by the entries, the frozen params and their own restrictions.

**Their accounts: share a template at `use`.** Each person stamps their own
toolbox and picks their own connection for each connector. A single shared
toolbox cannot do this: its entries run only on the connections pinned in them.

### Say the delegation out loud

Whoever pinned an entry is its **delegator**, and the entry runs on *their*
authority. When that is a personal account, tell the recipients:

> Everyone added here can run these tools through my Notion access. They
> cannot open, change or reuse that account anywhere else, and this stops
> working the day my own access does.

Two rules follow:

- **A toolbox a team depends on should not pin one person's personal account.**
  Pin a connection set up for the team's work, owned by someone who will stay
  (see **elaichi-connections** for transfer).
- **If a delegator loses access, only that entry goes unmet**, for everyone,
  the owner included. The fix is **Re-pin to my access** by someone with `edit`
  who can use the connection, not a credential change.

## Write the skill

Before you hand the toolbox over, write its skill: purpose, the ids it works on,
field names and allowed values, rules, and any automation that uses it. Name
each tool by its catalog `tool_name` in backticks, and check
`skill_tool_issues` in the response. See [Toolbox skills](./skills.md).

## Check it before you hand it over

Read the toolbox back with `elaichi__toolbox__get`. You get what a `use`
recipient gets: the entries, the exact runnable `tools` list, and the
`delegation` summary of what it runs on.

**A tool in `entries` but missing from `tools` is not lost.** Each entry says
whether it is blocked for the reader: `restricted`, `restricted_by` (`role` or
`user`) and `restricted_scope` (`tool` or `connector`). This is per reader, so
the same toolbox can read differently to two people.

When you share, the response carries the `delegation` summary: counts for the
whole set, and a preview naming at most a few connections you can already see.
Report it in plain words, and **never name a connection outside that preview**.
The counts are all you may say about the rest.

## Keeping it working

| Symptom | Cause |
|---|---|
| An entry shows **needs connection** | No connection was mapped when it was stamped |
| An entry shows **Access ended**, **You lost access** or **Needs re-pinning** | Its delegator lost `use` on the connection, or left the organization. Re-pin it. |
| A tool is in `entries` but not in `tools` | A restriction blocks it for this reader |
| `skill_may_be_stale` is `true` | Entries changed since the skill was written. Re-read and update the skill. |
| `skill_tool_issues.count` is above 0 | The skill names tools the toolbox does not hold |
| `set_entries` wiped entries you wanted | It replaces the list. Send the full set. |
| **All tools** or a connection toolbox refuses an edit | They are recomputed on every call. Create a stored one. |
