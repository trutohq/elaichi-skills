# Synthetic tools

Several tool calls chained into one, so an agent sees one decisive action
instead of orchestrating three. *Look the customer up in the CRM, then open a
support ticket for them.*

Where: **Toolboxes → Synthetic tools → New synthetic tool**. Over MCP:
`elaichi__synthetic_tool__create`, `__validate`, `__update`, `__execute`.

Creating one needs `toolbox:create`, and running one needs `tool:execute`. Both
Gold and Black include synthetic tools.

## Who can do what

**A synthetic tool belongs to its owner, permanently.** Only the owner can read,
edit, run or delete it. No permission widens that, `toolbox:manage` included,
and nothing transfers one to someone else. Anyone else asking about it gets
"not found", which does not mean the id is wrong.

Each step runs on one of **the owner's own** connections, which they must hold
at least `use` on. To let other people run the tool, pin it into a toolbox as a
`type: "synthetic"` entry and share the toolbox at `use`. Their calls then run
on the owner's connection authority, never their own, and still pass **their**
restrictions.

## The shape

```json
{
  "name": "open_ticket_for_customer",
  "description": "Find a customer in the CRM by email and open a support ticket for them. Use when a customer emails about a problem.",
  "input_schema": {
    "type": "object",
    "properties": {
      "email":   { "type": "string", "description": "The customer's email address" },
      "subject": { "type": "string" },
      "body":    { "type": "string" }
    },
    "required": ["email", "subject"]
  },
  "steps": [
    {
      "key": "customer",
      "connection_id": "conn_…",
      "tool_name": "search_contacts",
      "args_template": "{ \"query\": input.email }"
    },
    {
      "key": "ticket",
      "connection_id": "conn_…",
      "tool_name": "create_ticket",
      "args_template": "{ \"contact_id\": steps.customer.result[0].id, \"subject\": input.subject, \"description\": input.body }",
      "depends_on": ["customer"]
    }
  ],
  "output_template": "{ \"ticket_id\": steps.ticket.id }"
}
```

The tool names and result fields here are examples. Take real tool names from
`elaichi__connection__list_tools`, and look at a real run's output before you
write templates against it.

## Fields

| Field | Rules |
|---|---|
| `name` | 1 to 64 characters. Turned into a lowercase_underscore tool name, which must be unique in the organization. Read back the returned `name`: it may differ from what you sent. |
| `description` | 1 to 4,000 characters. This is what agents see wherever the tool is pinned, so say when to reach for it. |
| `input_schema` | A JSON Schema with `type: "object"` (or omitted for no inputs), at most 200 properties. This is what the caller fills in. |
| `steps` | 1 to 20 steps |
| `output_template` | Optional JSONata, up to 10,000 characters. Omit it and the result is every step's raw result, keyed by step key. |

Per step:

| Field | Rules |
|---|---|
| `key` | Letters, digits and underscores, not starting with a digit, so later steps can write `steps.<key>` without quotes |
| `connection_id` | Which of your connections runs this step |
| `tool_name` | The catalog tool name on that connection's connector |
| `args_template` | JSONata over `{ input, steps, run }`, up to 10,000 characters, producing the argument object |
| `depends_on` | Step keys that must finish first. Omit for a step that needs nothing earlier. |
| `for_each` | Optional JSONata producing a list. The step runs once per item, at most 100 items. |
| `for_each_concurrency` | `for_each` steps only: 1 to 4 items at once, default 4 |
| `on_error` | `fail` (default) stops the run on a failed call. `continue` records the failure and goes on. |
| `max_pages` | 1 to 10, default 1. Follows a list tool's `next_cursor` and joins the pages. |

## How it runs

Steps form a graph. Every step whose dependencies are done runs, and steps that
do not depend on each other run **in parallel**. Leave `depends_on` empty for
anything that needs no earlier result, and the parallelism is free.

Rejected **when you save**, all at once, before anything is stored:

- duplicate, unknown or self-referencing step keys, and any cycle
- JSONata that does not parse
- an `input_schema` whose type is not `object`
- a connection you cannot use, or a tool that connection's connector does not
  have
- a tool that is restricted **for you**

`elaichi__synthetic_tool__validate` runs the same checks on a draft without
saving it and returns every issue in one list. Call it with the whole draft
first.

At run time, a failed call stops the run unless that step says
`on_error: "continue"`. Steps that already ran are **not rolled back**.

## Writing the templates

`args_template` is JSONata evaluated against:

```
{
  "input": { …the caller's arguments, checked against input_schema… },
  "steps": { "<key>": …that step's result… },
  "run":   { "started_at": "…", "last_success_at": "…" or null }
}
```

It must produce the argument object for the tool.

```jsonata
{ "query": input.email }

{ "contact_id": steps.customer.result[0].id,
  "subject":    input.subject,
  "priority":   input.urgent ? "high" : "normal" }

{ "ids": steps.search.result.id }
```

The last one is worth noticing: JSONata maps over lists, so
`steps.search.result.id` is *every* id, not the first. It is the most common
cause of "why is this an array".

| Need | Expression |
|---|---|
| First match | `steps.find.result[0]` |
| Every id | `steps.find.result.id` |
| Fall back when absent | `input.owner ? input.owner : "unassigned"` |
| Only when present | `input.tags ? { "tags": input.tags } : {}` |
| Join a list | `$join(steps.find.result.name, ", ")` |
| Count | `$count(steps.find.result)` |

### Repeating a step with `for_each`

If the job is "do X for every item", give **one** step a `for_each`. Do not add
a step per item, and do not have the caller loop over the tool's output.

- `for_each` is JSONata over `{ input, steps }` that produces the list.
- Each item runs `args_template` over `{ input, steps, item, index }`.
- The step's result, `steps.<key>.result`, is an array of each item's result in
  item order.
- More than 100 items fails the step outright. Nothing is cut silently.
- For an API with a strict rate limit, set `for_each_concurrency` to 1 or 2.

### Failed items and partial lists

With `on_error: "continue"`, a failed item's slot in `steps.<key>.result` is
`null` and `steps.<key>.errors` lists `{ index, error }`. With `max_pages`, a
non-null `steps.<key>.next_cursor` (single step) or `steps.<key>.truncated`
(for_each step) means pages were left unread.

**Put these in the `output_template`.** A run returns only the output, so a
template that leaves them out hides failed or missing items from the caller.
For example: `{ "items": steps.scan.result, "failed": steps.scan.errors }`.

### Reading only what changed

`run.last_success_at` is when the caller's last fully successful run started,
or `null` on the first run. Filter on it to read only new records. A run with
failed items or unread pages does not move it, and neither does a test run.

## Test before you share

The **Test run** panel in the builder runs the tool against **live
connections**, without putting it in a toolbox. The data is real, so use a safe
account while experimenting.

Over MCP, pass `test: true` to `elaichi__synthetic_tool__execute` while you are
only trying a tool, so the run does not move `run.last_success_at`. Pass a draft
`output_template` to try a new one for a single run before saving it.

## Adding one to a toolbox

Open a toolbox or template → **Add tools** → the **Synthetic tools** tab. Over
MCP, add an entry `{ "type": "synthetic", "synthetic_tool_id": "syn_…" }` with
`elaichi__toolbox__set_entries` (send the full entry list).

You can pin only synthetic tools you own. In a toolbox:

- **Renaming and re-describing work**, and still matter most.
- **Defaults, schema overrides and frozen params are rejected.** The tool
  defines its own schema, and each step supplies its own arguments. To lock a
  value, write it into the step's `args_template`.

Pinned in a toolbox the caller can reach, it is found by `search_tools` like any
other tool. A standalone synthetic tool is not in `search_tools`: it is listed by
`elaichi__synthetic_tool__list` and run by `elaichi__synthetic_tool__execute`.

## When a connection goes away

Deleting a connection leaves every step that used it pointing at nothing.
`elaichi__synthetic_tool__get` shows such a step with `connection_state:
"missing"`, and `__list` counts them in `broken_step_count`. The tool fails at run
time, and any edit to its steps must repoint that step in the same call.

Deleting a synthetic tool leaves toolbox entries that pin it in place. They
stop resolving, so check where it is pinned before you delete it.

## Design notes

- **One decisive tool beats three chained calls.** The point is that the agent
  does not orchestrate. Do not build a synthetic tool that still needs calls
  around it.
- **Use as few steps as the job needs.** Twenty is the hard cap. Every step is a
  live API call that can fail.
- **Shape the output.** An agent reading one id is cheaper and more accurate than
  one reading three full API responses.
- **Fail loudly in the template.** A template that quietly produces `null` for a
  missing field sends a confusing request to the vendor instead of stopping.
