# The `elaichi__*` control-plane catalog

These operations run Elaichi itself. Unlike connected tools, they **are**
listed one by one in `tools/list`, and `search_tools` never returns one.

Your own `tools/list` is the final word. It is filtered by the user's role,
by the scopes on this OAuth grant, and by what the org has turned on. This
page shows the whole catalog, so you know what to look for and what will
never be there.

Operation `a.b` is the MCP tool `elaichi__a__b`. So `connection.list_tools`
is `elaichi__connection__list_tools`, and `automation.run.get` is
`elaichi__automation__run__get`.

## What decides whether you see one

| Gate | Effect |
|---|---|
| Role has no `tool:execute` | **Nothing** is listed — no operation and no connected tool. Guest, Auditor and Billing Admin lack it. |
| Role lacks the operation's permission | Not listed. |
| Scope | `read` and `sensitive_read` need `mcp:read`. `write` needs `mcp:write`. `destructive` needs `mcp:destructive`. An operation that runs a connected tool also needs `mcp:tools`. |
| Automations off for the org | Every operation marked **(A)** below is hidden. They come back when the plan includes automations **and** an admin turns on "Automations and everything they use" in Settings → Organization. |
| Apps feature dormant | `bundle.*` is hidden unless Apps is switched on, on top of **(A)**. |
| MCP Apps not negotiated | `canvas.upsert_widget` is hidden. |
| Step-up | Marked **(S)**. Listed when the scope covers it, but **every call is refused**. See below. |

When the role allows an operation but the grant's scope does not, the
server `instructions` name it under "Permitted by your role, withheld by this
connection's scope". The fix is to reconnect Elaichi in the AI client and
allow more on the consent screen. Never call that "unsupported".

### Step-up: "Only in the Elaichi app"

Six operations need the person to confirm it is really them (step-up
re-authentication). No AI surface can ask for that, so they are refused
**whatever the scope**. More scope will not open them. The refusal names the
screen:

| Operation | Do it in |
|---|---|
| `invite.create`, `invite.delete` | Settings → People |
| `member.set_roles`, `member.delete` | Settings → People |
| `role.delete` | Settings → Roles |
| `team.delete` | Settings → Teams |

Say what needs doing and send the person there. Do not call these to "try".

## Organization, people, teams, roles

- `organization.get` — read the org.
- `organization.update` — change org settings (`org:manage`).
- `member.list` — list people. Takes `q` (name or email) and `role_id`. Filter on the server; never page everything and filter yourself.
- `member.get` — one member.
- `member.offboarding` — preview what removing someone breaks. A sensitive read: summarize it, do not echo it.
- `member.set_roles` **(S)** — set someone's one role.
- `member.delete` **(S)** — remove someone.
- `team.list`, `team.get` — read teams.
- `team.create`, `team.update` — create or change a team.
- `team.add_member`, `team.set_member_admin` — change a team's roster.
- `team.remove_member` — take someone off a team (destructive).
- `team.delete` **(S)** — delete a team.
- `role.list`, `role.get` — read roles.
- `role.create`, `role.update` — custom roles (`role:manage`).
- `role.delete` **(S)** — delete a role.
- `permission.list` — the permission vocabulary.
- `invite.list` — pending invitations (`member:manage`).
- `invite.create` **(S)**, `invite.delete` **(S)** — invite or revoke.
- `audit.list` — the audit log.

## Connectors and connections

- `connector.list`, `connector.get` — the connector catalog. `connector.get` carries `restricted`, `can_use`, `connect_blocked`, `connect_notes` and `tool_count` (the provider's total, never yours).
- `connector.list_tools` — a connector's tools, filtered by your restrictions.
- `connection.list`, `connection.get` — accounts. `connection.list` is the complete list, pending ones included. Status comes from `connection.get`.
- `connection.list_tools` — the tools one account lets **you** run. Rows are under `tools` (not `result`), with `restricted_count` and `nextCursor`.
- `connection.create` — start a connect flow; returns `connect_url`.
- `connection.reconnect` — fresh `connect_url` for `needs_reauth` or `pending`.
- `connection.rename` — rename an account.
- `connection.share` — share an account.
- `connection.unshare`, `connection.transfer`, `connection.delete` — destructive.

Connectors are **read-only** here. Authoring or forking a custom connector is
done in the Elaichi app.

Both `list_tools` operations page: `limit` defaults to 200, and a non-null
`nextCursor` means more — send it back as `cursor` until it is null. Both carry
full JSON Schemas, so ask a narrow question (`q`) rather than pulling a large
connector whole.

## Toolboxes, templates, synthetic tools

- `toolbox.list`, `toolbox.get` — toolboxes you can see or run.
- `toolbox.get_skill` — read a toolbox's skill (owner guidance).
- `toolbox.create` — create one. With `template_id`, it stamps a toolbox from a template.
- `toolbox.update` — name, description, and `skill` (`skill: null` deletes it).
- `toolbox.set_entries` — **replaces** the entry list. Send the full set, never a delta.
- `toolbox.share` — share it.
- `toolbox.unshare`, `toolbox.delete` — destructive.
- `toolbox.execute` — run one tool through a toolbox. Costs a live third-party call. Needs `mcp:tools`.
- `template.list`, `template.get`, `template.get_skill` — read templates.
- `template.create`, `template.update`, `template.set_entries`, `template.share` — same rules as toolboxes.
- `template.unshare`, `template.delete` — destructive.
- `synthetic_tool.list`, `synthetic_tool.get` — read multi-step tools.
- `synthetic_tool.validate` — check a draft before saving.
- `synthetic_tool.create`, `synthetic_tool.update` — build or change one.
- `synthetic_tool.delete` — destructive.
- `synthetic_tool.execute` — run one. Only its owner may. Costs live third-party calls. Needs `mcp:tools`.

`toolbox.list` always includes two kinds of computed ids next to the stored
`tbx_…` rows: `global:{usr_…}` ("All tools") and one `connection:{conn_…}` per
active account. Pass them back as given. They have no lifecycle, so update,
share and delete refuse them.

There is no transfer for a toolbox or template here. `connection.transfer` is
the only transfer on MCP.

`toolbox.execute` and `synthetic_tool.execute` are charged by the tool they
actually run: one that deletes in the third-party app needs `mcp:destructive`
too. A synthetic tool is charged for its worst step.

## Access requests, feedback, governance reads

- `access_request.create` — ask an admin for access. Reachable with only `mcp:read` or `mcp:tools`.
- `access_request.withdraw` — take your request back. Same reach.
- `access_request.list`, `access_request.get` — `mine: true` shows your own; the default is the admin queue (`member:manage`).
- `feedback.create` — report a bug in a connected app or in Elaichi.
- `restriction.list`, `restriction.get` — read restrictions (`restriction:view`).
- `sso_connection.list`, `sso_connection.get` — read SSO.
- `scim_group.list` — read SCIM groups.
- `group_mapping.list`, `group_mapping.get` — read directory group mappings.
- `org_domain.list` — read verified domains.
- `logging_destination.list`, `logging_destination.get` — read log forwarding.

All of the governance reads are **read-only**. Changing a restriction, SSO,
SCIM, a domain or a logging destination is done in the Elaichi app.

Approving or denying an access request is not on MCP at all
(`access_request.resolve` is app-only). Only an admin in the Elaichi app can.

## Files

- `file.upload_request` — ask the user to upload files from their machine. Returns an `upload_page_url`.
- `file.upload_request_get` — poll until `status` is `confirmed`; it lists each `file_id`.
- `file.create` — save text or base64 you wrote as a file (up to 1 MiB, kept 7 days).
- `file.get` — is this file id usable now?

Pass a `file_id` to a connected tool's file argument. See
[Tool discovery](./tool-discovery.md#files-in-and-out).

## Automations (A)

Load the [elaichi-automations](../../elaichi-automations/SKILL.md) skill before building one.

- Read: `automation.list`, `automation.get`, `automation.examples`, `automation.schema`, `automation.options`, `automation.usage.get`, `automation.config.get`.
- Drafts: `automation.draft.create`, `automation.draft.update`, `automation.draft.patch`, `automation.draft.validate`, `automation.draft.discard`.
- Lifecycle: `automation.update` (rename), `automation.config.update`, `automation.publish`, `automation.enable`, `automation.disable`, `automation.delete`.
- Running: `automation.dry_run`, `automation.run`.
- Runs: `automation.run.list`, `automation.run.get`, `automation.run.progress`, `automation.run.transcript`, `automation.run_warnings`.
- Approvals: `automation.approval.list`, `automation.approval.get`.
- Webhooks: `automation.webhook.list`, `automation.webhook.samples`.
- Sessions: `automation.session.list`, `automation.session.get`, `automation.session.messages`, `automation.session.runs`, `automation.session.continue`, `automation.session.close`.
- Web access: `web_access_policy.get`, `web_access_policy.check`.

`automation.run`, `automation.enable`, `automation.dry_run`,
`automation.publish` and `automation.session.continue` reach connected tools,
so they also need `mcp:tools`.

## Collections, dashboards, knowledge (A)

Load the [elaichi-data](../../elaichi-data/SKILL.md) skill before building one.

- Collections: `collection.list`, `collection.get`, `collection.references`, `collection.create`, `collection.update`, `collection.update_schema`, `collection.delete`.
- Tables: `collection.table.list`, `collection.table.get`, `collection.table.create`, `collection.table.update`, `collection.table.update_schema`, `collection.table.delete`.
- Rows: `collection.query_rows`, `collection.aggregate`, `collection.insert_rows`, `collection.upsert_rows`, `collection.update_rows`, `collection.delete_rows`, `collection.row_history`, `collection.row_version`, `collection.row_restore`.
- Dashboards: `dashboard.list`, `dashboard.get`, `dashboard.get_page`, `dashboard.schema`, `dashboard.validate`, `dashboard.filter_options`, `dashboard.create`, `dashboard.update`, `dashboard.delete`.
- Dashboard edits: `dashboard.upsert_widget`, `dashboard.remove_widget`, `dashboard.preview_widget`, `dashboard.draft.apply`, `dashboard.draft.discard`, `dashboard.publish`.
- Public links: `dashboard.public_link.list`, `dashboard.public_link.refresh`, `dashboard.public_link.revoke`.
- Knowledge: `knowledge.list`, `knowledge.get`, `knowledge.references`, `knowledge.search`, `knowledge.missed_searches`, `knowledge.create`, `knowledge.update`, `knowledge.delete`.
- Knowledge docs: `knowledge.doc.list`, `knowledge.doc.get`, `knowledge.doc.upsert`, `knowledge.doc.delete`.

## Spend (A)

Read-only, needs `spend:view`: `spend.usage.get`, `spend.limit.list`,
`spend.payment_policy.get`, `spend.payment_cap.list`. Changing spend controls
is not on MCP.

## Apps (A, dormant)

`bundle.list`, `bundle.get`, `bundle.create`, `bundle.set_items`,
`bundle.update`, `bundle.version.preview`, `bundle.version.create`,
`bundle.install.preview`, `bundle.install`, `bundle.install.list`,
`bundle.install.get`. Hidden unless Apps is switched on. Install links and
app file exports are never on MCP.

## MCP Apps clients only

`canvas.upsert_widget` draws a chart, table, metric or markdown widget. It is
offered only to a client that negotiated the MCP Apps extension. Removing a
widget stays app-only.

## Never on MCP, at any scope

- **API tokens — the whole domain.** Not listing, renaming or revoking one. Send the person to Settings → API tokens.
- **SCIM tokens.** SCIM groups are readable; the tokens are not.
- **Reading or rotating any credential.** No operation takes a secret or returns one.
- **Identity and security changes**, and running an auth flow.
- **Billing and spend changes.**
- **Approving or denying an access request.**
- **Resending an invitation.**
- **Creating or reading a dashboard's public link address**, exporting dashboard data, pressing a dashboard button or submitting its form.
- **Managing a Slack app.**
- **UI navigation and page drafts** (`ui.*`) — they need the Elaichi window, which an MCP client does not have.

## Results and failures

Results are redacted and capped, and a cap that fires always shows in the
payload:

- strings at 32,000 characters — a cut one ends in `…[truncated: kept N of M chars]`
- arrays at 200 items, objects at 200 keys, depth 8
- keys with secret-sounding names come back as `[redacted]`

When any cap fired, the result carries `elaichi_truncated: true` as its first
key. A vendor's own `truncated` field is separate and untouched. Elaichi's own
automation and dashboard definitions (schema, get, drafts) keep deep nesting
and their key names, so they round-trip into an update.

Most list operations here answer `{ result, nextCursor, prevCursor }` —
camelCase, unlike the REST API. A non-null `nextCursor` is never a total.

Validation, conflict, permission and not-found failures carry a real message:
act on it. Everything else collapses to a generic try-again sentence that
names no cause. **Do not retry blindly on one.**

## Who is the current user?

No operation returns them. Read the id out of the `global:usr_…` toolbox in
`elaichi__toolbox__list`.
