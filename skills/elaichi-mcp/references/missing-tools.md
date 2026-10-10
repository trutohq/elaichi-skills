# Diagnosing a missing tool

A tool the user expects and you cannot find is almost never a typo. Work this
ladder in order — it is ordered by how often each rung is the cause — and stop
at the first rung that explains it.

What makes this hard: **only an `active` connection contributes tools.**
Every other status — even `post_install_error`, where the credential itself
works — leaves them absent from the list entirely, not present-and-failing.

A restriction is different now. A restricted tool is never *callable*, but it
is not hidden: `search_tools` names it, flagged `restricted`, and the list
operations count it.

## 1. Does the connection exist at all?

```
elaichi__connection__list
```

If the app is not there, first check `elaichi__toolbox__list` for a toolbox
someone shared with the user that holds this app's tools. Its pinned
connection never appears in the recipient's connection list, yet its tools are
theirs to run — under **All my tools**, or when that toolbox was chosen on the
consent screen.

Nothing there either? Then it is setup, not a missing tool. Run the
`connect_app` playbook, or the sequence in
[Connections and accounts](./connections-and-accounts.md#connecting-a-new-account).

## 2. Is its status `active`?

If it reads `needs_reauth` or `pending`, that is your answer. Call
`elaichi__connection__reconnect`, give the user the fresh link, and stop.
**Nothing below this rung matters until the connection is active.**

If the row says `connector_not_shared`, the connector's owner stopped sharing
it. Reconnecting is refused and would not help; the connector's owner has to
share it again. `search_tools` reports these under `blocked_connections`.

Do not use `elaichi__connection__list_tools` as a liveness check. It filters
by restriction, not by status, so a `pending` connection answers with the full
allowed set. Status comes from `elaichi__connection__get` and nowhere else.

## 3. Is a restriction the reason?

You can find out without any special permission:

- **`search_tools`** names a restricted match by name, with a `restricted`
  object and no schema. A tool found that way is not missing. It exists, this
  user may not run it, and `restricted_by` says whether the block is on their
  role or their account.
- **`elaichi__connection__list_tools`** and **`elaichi__connector__list_tools`**
  return `restricted_count`: how many of that connector's tools were left out
  for this user. `0` means the connector never had the tool. Above `0` means
  some tools exist that this user may not call.
- **`elaichi__connector__get`** `restricted: true` means the **whole
  connector** is blocked for this user. That is conclusive. The two
  `list_tools` operations then refuse with the restriction instead of a list,
  so do not call them just to confirm it. `restricted: false` rules out a
  connector-level block and nothing else.

`elaichi__toolbox__get` flags restricted entries the same way.

When a restriction is the reason, say so plainly: the tool exists, it is
restricted for their role or their account, and only an admin can lift it.
Then offer to ask. Call `elaichi__access_request__create` with the
`request_access.arguments` from the refusal or the search row, **unchanged**.
That only files a request; an admin decides in the Elaichi app. If it carries
`pending_request_id`, the user already asked — say so and do not file again.

`elaichi__restriction__list` names the rules, but needs `restriction:view`,
which an ordinary member does not have. You do not need it to answer this.

### Never subtract

`tool_count` on `elaichi__connector__get` counts what the **provider** offers,
not what this user may run. The difference between it and the rows you got is
not "how many are restricted" and must never be reported as one. Use
`restricted_count`.

## 4. Is it a scope gap?

- **No `mcp:tools` on the grant:** no connected tool is offered at all, and
  `search_tools` and `execute_tool` are not even in `tools/list`.
- **A deleting tool without `mcp:destructive`:** the tool is left out of
  `search_tools`. Calling it by name gets a scope refusal naming
  `mcp:destructive`.
- **An `elaichi__*` operation the role allows but the scope does not:** it is
  not listed, and the server `instructions` name it under "Permitted by your
  role, withheld by this connection's scope".

A scope refusal names the scope it needs. Relay that name and stop. You cannot
grant it, approve it, or work around it. The user fixes it by **connecting
Elaichi again from their AI client** and allowing that access on Elaichi's
consent screen. Settings → Connected apps can change which toolboxes a client
reaches and revoke it, but not add scopes.

Do not file an access request for a scope gap. No admin can fix it.

## 5. Were you looking in `tools/list`?

Connected tools are never listed there, however few there are. Call
`search_tools` with concrete tool-ish words. The ranking is lexical, so a
sentence ranks badly.

And check what `search_tools` does not index:

- `elaichi__…` operations — always listed in `tools/list`.
- **Standalone synthetic tools** — find them with
  `elaichi__synthetic_tool__list` and run them with
  `elaichi__synthetic_tool__execute`.

Also page. A result whose `matched` is larger than its page carries
`next_cursor`; a tool you did not see on page one has not been ruled out.

## An `elaichi__*` operation that is missing

Not a connected tool, but the same question. In order:

1. **Automations, collections, dashboards and knowledge** are hidden unless
   the org has automations on. That is not a scope gap; more scope will not
   show them.
2. **Step-up operations** (`invite.create`, `invite.delete`,
   `member.set_roles`, `member.delete`, `role.delete`, `team.delete`) are
   refused on every AI surface. The server `instructions` list them under
   "Only in the Elaichi app". Send the person to the screen the refusal names.
3. **App-only and never-exposed operations** — API tokens, approving access
   requests, writes to restrictions, SSO, SCIM, domains or logging — are not on
   MCP at all. See
   [Control-plane operations](./operations-catalog.md#never-on-mcp-at-any-scope).
4. **The role has no `tool:execute`.** Then nothing is listed at all.

## Reporting the outcome

Name the rung that explained it and what the user has to do. Two rules:

- **Do not invent a workaround** for a restriction or a missing scope.
  Reaching the same data by another route is the failure governance exists to
  stop.
- **Do not guess between causes.** "I can't tell which, and here is who can"
  is a better answer than a confident wrong one.

If a tool exists, runs, and misbehaves — a vendor error, a wrong field, an
empty result that should have rows — that is a bug, not a missing tool. Offer
`elaichi__feedback__create` with the connector, tool name and error text
verbatim. Never paste the user's arguments into it.
