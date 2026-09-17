# Curating a toolbox

The goal is not "expose everything". It is that a model, seeing only names and
descriptions, picks the right tool on the first try and cannot wander outside
the job.

## Choose tools by the job, not by the product

Start from the sentence someone would say — *"file a bug from a customer
email"* — and include only what that sentence needs. A connector with two
hundred documented methods contributes two hundred candidates to a model's
decision, and tool-choice accuracy degrades well before that.

Five to fifteen well-named tools is a good toolbox. Forty is usually two
toolboxes.

Discover what is actually available per account, not per product:

```
elaichi__connection__list_tools     ← this account, restrictions applied
elaichi__connector__list_tools      ← what the vendor offers in general
```

The first is the one an entry must be built from — an entry naming a tool a
restriction blocks is rejected outright. Both page: `limit` defaults to 200 and
a non-null `nextCursor` means more.

## Write the name and description for the model

Names and descriptions are all the model sees. Rewriting them takes minutes
and changes which tool it picks.

**Name it after the job.** The model matches lexically before it reasons, and
the name is scored highest of any field.

| Instead of | Use |
|---|---|
| `post_v3_objects_tickets` | `create_support_ticket` |
| `list` | `list_open_bugs` |
| `search_2` | `find_customer_by_email` |

**Describe when to reach for it, not what endpoint it hits.** The description
is the tiebreaker between two plausible tools, so spend it on the distinction:

> Creates a bug in the Engineering project. Use this for defects reported by
> customers. For feature requests use `create_feature_request` instead.

Naming a confusable sibling is worth more than another sentence about this
tool.

**Include the words a person would use.** Search is lexical, so a tool nobody
can find is a tool nobody runs.

## Freeze what is not the model's decision

A frozen parameter is **stripped from the advertised schema** and force-merged
at execution. The model cannot see it, so it cannot argue with it, mention it,
or get it wrong.

Good candidates:

- The target board, project, folder, pipeline or workspace
- An environment, region, or account segment
- A fixed label, source or channel that marks where records came from

Compare with defaults, which sit *underneath* the model's arguments:

```
defaults  <  the model's arguments  <  frozen params
```

Use a **default** when the model may reasonably change it (page size, a usual
assignee). Use a **frozen param** when it must not (the production project id).

One consequence worth knowing: two entries of the same tool that freeze
different values become two genuinely different tools, and their names are
disambiguated by those values — `list_contacts_drive_hr` rather than a hash —
which also makes them findable by search. So freezing by value and naming by
value reinforce each other.

## Disable rather than delete

Disabling an entry keeps the design without advertising it. Useful while
narrowing a toolbox: turn things off, see whether anyone misses them, then
remove.

## Decide who runs whose accounts

Before sharing, answer one question: **should recipients run your accounts, or
their own?**

**Your accounts → share the toolbox at `use`.** They run the tools over the
connections your entries pin, with no grant on those connections. They never
see a credential and cannot reach the account anywhere else. Every call stays
clamped by the tool list, the frozen params, and their own restrictions.

**Their accounts → share a template at `use`.** They stamp their own toolbox
and bind their own connections.

### Say the delegation out loud

Whoever pinned an entry is its **delegator**, and the entry runs on *their*
authority. When that is a personal account, tell the recipients:

> Everyone added here can run these tools through my Notion access. They
> cannot open, change, or reuse that account anywhere else, and this stops
> working the day my own access does.

Two practical rules follow:

- **A toolbox a team depends on should not pin one person's personal
  account.** Transfer the connection to the organization or a team first —
  ownership moves without touching credentials.
- **If a delegator loses their access, just that entry stops resolving** —
  for everyone, owner included. The fix is re-pinning, not a credential change.

## Verify before you hand it over

Read the toolbox back after building it. You get the resolved view the
recipients will actually see: entries, the exact runnable tool list when access
reaches `use`, and a delegation summary of what it runs on.

**A tool that vanishes here is being filtered by a restriction, not lost.**
That is the moment to notice it, rather than after someone reports the agent
being unhelpful.

When you share, the response carries a bounded delegation summary — counts for
the whole set, and a preview naming at most a few connections you can already
see. Report it in the user's own terms, and **never name a connection outside
that preview**: the counts are all you may say about the rest, because those
are accounts the reader has no right to see named.

## Keeping it working

| Symptom | Cause |
|---|---|
| An entry shows **needs connection** | Unmapped at stamp time, or its connection became unusable |
| A tool silently disappeared | A restriction now blocks it, or the delegator lost access to that connection |
| The whole toolbox advertises nothing | Its connections are `pending` or `needs_reauth` |
| `set_entries` wiped entries you wanted | It replaces the list wholesale. Send the full intended set. |
| A dynamic toolbox refuses an edit | `global:{userId}` and `connection:{id}` are read-only by design |
