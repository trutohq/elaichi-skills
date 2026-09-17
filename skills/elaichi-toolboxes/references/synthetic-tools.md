# Synthetic tools

Several tool calls chained into one, so an agent sees a single decisive action
instead of orchestrating three. *Look the customer up in the CRM, then open a
support ticket for them.*

Where: **Toolboxes → Synthetic tools → New synthetic tool**.

Needs `toolbox:create`, at least one working connection to test against, and a
paid plan — Gold and Black both include synthetic tools.

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
      "args_template": "{ \"query\": input.email }",
      "depends_on": []
    },
    {
      "key": "ticket",
      "connection_id": "conn_…",
      "tool_name": "create_ticket",
      "args_template": "{ \"contact_id\": steps.customer.results[0].id, \"subject\": input.subject, \"description\": input.body }",
      "depends_on": ["customer"]
    }
  ],
  "output_template": "{ \"ticket_id\": steps.ticket.id, \"url\": steps.ticket.web_url }"
}
```

## Fields

| Field | Rules |
|---|---|
| `name` | 1–64 characters, unique across the organization |
| `description` | 1–4,000 characters. This is what the agent sees — write when to reach for it |
| `input_schema` | A JSON Schema **object** schema. This is what the agent fills in |
| `steps` | 1–20 steps |
| `output_template` | Optional JSONata, up to 10,000 characters. Omit it and the result is the object of all step results |

Per step:

| Field | Rules |
|---|---|
| `key` | Must be a bare identifier — letters, digits, underscore, not starting with a digit — because later steps address it as `steps.<key>` without quoting |
| `connection_id` | Which account runs this step |
| `tool_name` | A tool on that connection's connector |
| `args_template` | JSONata over `{ input, steps }`, up to 10,000 characters, producing the argument object |
| `depends_on` | Step keys that must finish first |

## The execution model

Steps form a DAG. Elaichi topologically sorts them into waves: every step in a
wave has its dependencies satisfied by earlier waves, so **waves run in
sequence and the steps inside one run in parallel**.

Leave `depends_on` empty for anything that does not need an earlier result, and
the parallelism is free.

Rejected **when you save**, not when you run:

- duplicate step keys
- a step depending on itself
- a step depending on a key that does not exist
- any cycle
- `args_template` or `output_template` that is not valid JSONata
- an `input_schema` that is not an object schema

If a step fails at run time, the run stops there. Independent branches already
in flight still follow the DAG.

## Writing the templates

`args_template` is a JSONata expression evaluated against:

```
{
  "input": { …the agent's arguments, validated against input_schema… },
  "steps": { "<key>": …that step's result… }
}
```

It must produce the argument object for the tool.

```jsonata
{ "query": input.email }

{ "contact_id": steps.customer.results[0].id,
  "subject":    input.subject,
  "priority":   input.urgent ? "high" : "normal" }

{ "ids": steps.search.results.id }
```

That last one is worth noticing: JSONata maps over sequences, so
`steps.search.results.id` is *every* id, not the first. It is the most common
source of "why is this an array".

Useful shapes:

| Need | Expression |
|---|---|
| First match | `steps.find.results[0]` |
| Every id | `steps.find.results.id` |
| Fall back when absent | `input.owner ? input.owner : "unassigned"` |
| Only when present | `input.tags ? { "tags": input.tags } : {}` |
| Join a list | `$join(steps.find.results.name, ", ")` |
| Count | `$count(steps.find.results)` |
| Current time | `$now()` |

`output_template` runs over the same `{ input, steps }` once every step is
done, and shapes the final result. Use it — the default output hands the agent
every intermediate result, which is usually a lot of tokens for one id.

## Test before you share

The **Test run** panel executes the tool against **live connections** without
needing it in a toolbox. Provide sample inputs matching your schema and run.

It reports success, or the step it stopped at. The data is real, so use a safe
account while experimenting.

## Adding one to a toolbox

Open a template or toolbox → **Add tools** → the **Synthetic tools** tab.

What differs from an ordinary entry:

- **Renaming and re-describing still work**, and still matter most.
- **Defaults and schema overrides are rejected** — the synthetic tool defines
  its own schema.
- **Frozen params do nothing** — each step supplies its own arguments. Lock a
  value inside the step's `args_template` instead.

Over MCP it advertises its own input schema and executes server-side through
the same restriction and audit pipeline as any other call.

One thing to know for the agent side: a synthetic tool is **not in the
`search_tools` index by itself** — it is listed by
`elaichi__synthetic_tool__list` and run by `elaichi__synthetic_tool__execute`.
Adding it to a toolbox the grant reaches is what makes it searchable, because
from there it is just another tool of that toolbox.

## Access

Each step runs with the access of **the connection behind it**, not the
caller's. A tool a caller could not reach directly cannot be used as a step for
them, so a synthetic tool is not a way around a restriction.

## Design notes

- **One decisive tool beats three chained calls.** The whole point is that the
  agent does not orchestrate, so do not build a synthetic tool that still needs
  three calls around it.
- **Shape the output.** An agent reading one id is cheaper and more accurate
  than one reading three full API responses.
- **Keep steps under ten.** Twenty is the hard cap; long chains are hard to
  debug, and every step is a live API call that can fail.
- **Fail loudly in the template.** A template that silently produces `null` for
  a missing field sends a confusing request to the vendor instead of stopping.
