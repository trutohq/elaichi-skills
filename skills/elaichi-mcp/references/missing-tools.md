# Diagnosing a missing tool

A tool the user expects and you cannot find is almost never a typo. Work this
ladder in order — it is ordered by how often each rung is the cause — and stop
at the first rung that explains it.

The thing that makes this hard: **a connection that is `pending` or
`needs_reauth` contributes zero tools.** It is absent from the list entirely,
not present-and-failing. A governance restriction removes tools just as
silently. Both look identical to "this connector never had that tool".

## 1. Does the connection exist at all?

```
elaichi__connection__list
```

If the app is not there, this is a setup problem rather than a missing tool.
Run the `connect_app` playbook — or the sequence in
[Connections and accounts](./connections-and-accounts.md).

## 2. Is its status `active`?

If it reads `needs_reauth` or `pending`, that is your answer. Call
`elaichi__connection__reconnect`, give the user the fresh link, and stop.
**Nothing below this rung matters until the connection is active.**

Do not use `elaichi__connection__list_tools` as a liveness check. It filters by
restriction, not by status, so a `pending` connection answers with the
connector's full catalog. Status comes from `elaichi__connection__get` and
nowhere else.

## 3. Is the tool absent from `elaichi__connection__list_tools`?

Then either a restriction removed it, or this connector never had it. A
restricted tool goes **missing** from the list rather than listed-and-failing,
so absence alone does not separate the two causes.

There is exactly one test, and it only answers one way:

```
elaichi__connector__get   → read the `restricted` field
```

- **`restricted: true`** — governance has blocked this **whole connector** for
  this user. Conclusive. It needs no extra permission to read. Say so, say an
  admin must lift it in the Elaichi app, and stop.

  Do not then call `elaichi__connector__list_tools` to "confirm". It refuses a
  blocked connector outright, and provoking a 403 you already predicted tells
  you nothing new.

- **`restricted: false`** — this rules out a connector-level block and
  **nothing else.** A single tool can still be restricted, and at that point it
  is invisible to you: `elaichi__connector__list_tools` and
  `elaichi__connection__list_tools` apply the same restrictions for the same
  caller, so both show the same absence and comparing them separates nothing.

  `elaichi__restriction__list` names the rules, but needs the
  `restriction:view` permission and an ordinary member does not have it. **A
  refusal there is the answer to "can I check this myself" — not a dead end to
  route around.**

### Never subtract

`tool_count` on `elaichi__connector__get` counts what the **provider** offers,
not what this caller may run. The difference between it and the rows you got
back is not "how many are restricted" and must never be reported as one.

When `restricted` is false and you cannot read the rules, say plainly:

> This tool is not available to you. I can't tell whether a governance
> restriction or the connector's own catalog is the reason — an org admin can
> see both.

## 4. Is `mcp:tools` on the OAuth grant?

Without that scope, **no connected tool is offered at all**, however many the
user has. A scope refusal names the scope it needs. Relay that name and stop —
you cannot grant it, approve it, or work around it. The user re-consents from
Settings → Connected apps, and the change takes effect on your very next call.

## 5. Were you looking in `tools/list`?

Connected tools are never listed there, however few there are. Call
`search_tools` with concrete tool-ish words — the ranking is lexical, not
semantic, so a sentence ranks badly.

And check the two things `search_tools` does not index:

- `elaichi__…` operations — always listed individually.
- **Synthetic tools** — the org's own multi-step tools. Find them with
  `elaichi__synthetic_tool__list` and run them with
  `elaichi__synthetic_tool__execute`.

Also page. A result reporting more matches than it returned carries
`next_cursor`; a tool you did not see on page one has not been ruled out.

## Reporting the outcome

Name the rung that explained it and what the user has to do. Two rules:

- **Do not invent a workaround** for a restriction or a missing scope. Reaching
  the same data by another route is the failure mode governance exists to stop.
- **Do not guess between causes.** "I can't tell which, and here is who can" is
  a better answer than a confident wrong one.
