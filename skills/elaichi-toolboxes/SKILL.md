---
name: elaichi-toolboxes
description: Curate what an agent can do in Elaichi — toolboxes versus templates, stamping, per-entry renaming and frozen parameters, what sharing at "use" actually delegates, and building synthetic tools that chain several calls into one.
whenToUse: Someone is building, sharing or debugging a toolbox, template or synthetic tool, deciding between a toolbox and a template, or asking what happens when they share one with a colleague.
---

# Toolboxes, templates, and synthetic tools

A toolbox turns "this account exists" into "an agent can do this job well".
Three decisions make one: **which tools**, **what is locked**, and **who runs
it on whose account**.

## You may not need one yet

Every connection gets a toolbox automatically the moment it goes active, and
each person has a global one covering everything they can reach. Both are
read-only and require no setup.

Build a deliberate toolbox when you want:

- **fewer tools** — a model picks better from five than from two hundred
- **better names** — describing the job rather than the API
- **locked inputs** — a fixed board, folder or pipeline the model cannot leave
- **one set spanning products** — the CRM and the helpdesk in one place

## Toolbox or template?

They are built the same way and differ in one thing: whether entries point at
real accounts.

| | Toolbox | Template |
|---|---|---|
| Entries reference | A connector, a tool, **and a connection** | A connector and a tool. No connection, ever. |
| Sharing at `use` gives a recipient | The ability to **run it**, over the builder's accounts | The ability to **stamp** their own toolbox from it |
| Choose it when | "Here is a working set of tools — run them through my accounts" | "Here is a good design — bring your own accounts" |

In the app, stamping is **Use** on the template. Over MCP it is
`elaichi__toolbox__create` with a `template_id`; over HTTP, `POST /toolbox`
with the same plus a map from connector to connection. Entries are copied in
and bound to the recipient's own accounts.

An entry left unmapped, or whose connection later becomes unusable, shows as
**needs connection** and advertises nothing — that is, it does not appear in
any AI client — until it is fixed. It fails closed, which is the right way round but means a half-stamped toolbox looks
emptier than it is rather than erroring.

## Per-entry customization

The same options exist on both toolboxes and templates.

| Option | Effect |
|---|---|
| **Rename / re-describe** | Changes what the model sees. This is the single biggest lever on whether an agent picks the right tool. |
| **Enable / disable** | Keep the entry without advertising it. |
| **Frozen params** | A fixed value, **stripped from the advertised schema** and force-merged at execution. The model cannot see it, let alone override it. |
| **Input schema override** | Replace the advertised JSON Schema wholesale. |
| **Defaults** | Merged underneath whatever the model sends. |

Precedence at call time:

```
defaults  <  the model's arguments  <  frozen params
```

So a default is a suggestion and a frozen param is a rule. Use frozen params
for anything that is genuinely not the model's decision — the target board, the
folder, the environment — and defaults for a sensible starting value the model
may reasonably change.

Writing good names and descriptions is covered in
[Curating a toolbox](./references/curating.md).

## What sharing at `use` actually does

**Sharing a toolbox at `use` delegates execution.** The recipient runs its
tools over the connections its entries pin, **without holding any grant on
those connections**. They never see a credential, cannot reach the account
anywhere else in Elaichi, and lose the access the moment the share is revoked.

Every call is still clamped server-side by the toolbox's tool list, its frozen
params, and the recipient's own restrictions.

The live authority behind each entry is **whoever pinned it** — its
*delegator* — not whoever shared the toolbox. Two consequences:

- Pinning your personal account makes you the delegator. Say so plainly when
  sharing: everyone added at `use` runs through *your* access to that account.
- If the delegator loses their own access to that connection, **just that
  entry** stops resolving — for everyone, including the toolbox's owner.
  Re-pinning fixes it.

Sharing levels are `view` (see it), `use` (run it), `edit` (change it and its
grants). Deleting and transferring are owner-only.

## Synthetic tools

Several calls chained into one, so the agent sees one decisive tool instead of
orchestrating three. *Look the customer up in the CRM, then open a ticket for
them.*

A synthetic tool is a small DAG. Each step names:

| Field | What it is |
|---|---|
| **Step key** | A stable id later steps refer to as `steps.<key>` |
| **Connection** | Which account runs this step |
| **Tool** | Which tool on that connection |
| **Depends on** | Earlier step keys that must finish first |
| **Arguments template** | A JSONata expression over `{ input, steps }` |

Plus an **input schema** (what the agent must provide) and an optional
**output template** shaping the final result.

Independent steps run in parallel; dependent ones wait. Cycles and unknown
references are rejected **when you save**, not when you run. A **Test run**
panel executes it against live connections without needing a toolbox — use a
safe account while experimenting, because the data is real.

Added to a toolbox, a synthetic tool behaves like any other entry, except that
defaults and schema overrides are rejected (it defines its own schema) and
frozen params do nothing (each step supplies its own arguments). Renaming and
re-describing still work, and still matter.

Each step runs with the access of the connection behind it, and every step goes
through the same restriction and audit pipeline as a normal call.

Writing the steps: [Synthetic tools](./references/synthetic-tools.md).

## Reaching a toolbox from an agent

There is no publishing step. Any `use` grantee — owner or delegate — reaches a
toolbox through the MCP endpoint, and it always executes **as them**.

Over MCP, the person's OAuth consent decides which toolboxes a given client may
reach: all of them, or a chosen set. Editable afterwards in **Settings →
Connected apps**, effective on the next call.

## Common mistakes

| Mistake | What happens |
|---|---|
| Sharing a toolbox that pins a **personal** account without saying so | Everyone runs through one person's access. It breaks when they leave, and they may not know it exists. |
| Building a toolbox where a template was wanted | Recipients run your accounts instead of their own. |
| Sending a partial entry list to `set_entries` | It **replaces** the list wholesale. Always send the full intended set. |
| Leaving the API's own tool names and descriptions | The model picks badly. Renaming is the cheapest quality win available. |
| Expecting a broken entry to error | It advertises nothing instead. The toolbox looks smaller, not broken. |
| Trying to edit a dynamic toolbox | `global:{userId}` and `connection:{id}` are read-only. Create a real one. |

## References

| Document | Topics |
|---|---|
| [Curating a toolbox](./references/curating.md) | Choosing tools, writing names and descriptions a model picks well from, freezing the right parameters, sharing safely |
| [Synthetic tools](./references/synthetic-tools.md) | The step DAG, JSONata argument templates, testing, and what changes when one lands in a toolbox |

## Companion skills

- **elaichi-connections** — the accounts a toolbox binds to.
- **elaichi-mcp** — how the tools you curate actually reach an agent.
- **elaichi-governance** — why a tool you added is not appearing.
