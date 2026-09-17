# The `elaichi__*` control-plane catalog

These operations administer Elaichi itself. Unlike connected tools, they **are**
listed individually in `tools/list`, and `search_tools` never returns one.

Your own `tools/list` is authoritative: it is filtered by the user's role and
by the scopes on this OAuth grant. This page is the shape of the whole catalog,
so you know what to look for and what will never be there.

Names are `elaichi__{domain}__{verb}`.

## Reading the org

| Domain | Verbs |
|---|---|
| `organization` | `get`, `update` |
| `member` | `list`, `get`, `set_roles`, `offboarding`, `delete` |
| `team` | `list`, `get`, `create`, `update`, `delete`, `add_member`, `remove_member`, `set_member_admin` |
| `role` | `list`, `get`, `create`, `update`, `delete` |
| `permission` | `list` |
| `invite` | `list`, `create`, `delete` |
| `audit` | `list` |

`elaichi__member__list` and several others take a `q` filter — use it rather
than paging the whole set and filtering yourself.

## Connections and connectors

| Domain | Verbs |
|---|---|
| `connector` | `list`, `get`, `list_tools` |
| `connection` | `list`, `get`, `create`, `rename`, `reconnect`, `transfer`, `share`, `unshare`, `delete`, `list_tools` |

`connector` is **read-only** here: authoring or forking a custom connector is
app-only.

`elaichi__connector__list_tools` answers about the **provider**;
`elaichi__connection__list_tools` answers about **this account**. When you are
building an entry or diagnosing an account, you want the second one.

Both page: `limit` defaults to 200, and a non-null `nextCursor` means more —
send it back as `cursor` until it is null. Both carry full JSON Schemas, so ask
a narrow question rather than pulling a large connector whole.

## Toolboxes, templates, synthetic tools

| Domain | Verbs |
|---|---|
| `toolbox` | `list`, `get`, `create`, `update`, `set_entries`, `share`, `unshare`, `delete`, `execute` |
| `template` | `list`, `get`, `create`, `update`, `set_entries`, `share`, `unshare`, `delete` |
| `synthetic_tool` | `list`, `get`, `create`, `update`, `delete`, `execute` |

**Transferring a toolbox or template is not here.** `connection.transfer` is
the only transfer on this surface; handing a toolbox or template to somebody
else is an app or REST action.

Three sequencing rules:

- **`set_entries` replaces the entry list wholesale.** Send the full intended
  set, never a delta.
- **`elaichi__toolbox__create` with `template_id` stamps a toolbox from a
  template** — this is how a template becomes usable.
- **Dynamic toolbox ids are read-only.** `elaichi__toolbox__list` appends two
  computed ids after the stored `tbx_…` rows — `global:{userId}` and
  `connection:{connectionId}` — and every lifecycle verb refuses them by name,
  naming the operation to use instead.

`toolbox__execute` and `synthetic_tool__execute` are the two `elaichi__*`
operations that cost what a connected tool call costs, because they run one.

## Read-only governance

Inspect from here; change in the Elaichi app.

| Domain | Verbs |
|---|---|
| `restriction` | `list`, `get` |
| `sso_connection` | `list`, `get` |
| `scim_group` | `list` |
| `group_mapping` | `list`, `get` |
| `org_domain` | `list` |
| `logging_destination` | `list`, `get` |

## Access requests

| Domain | Verbs |
|---|---|
| `access_request` | `list`, `get`, `create`, `resolve`, `withdraw` |

`create` needs no permission — a permission to ask for a permission would
deadlock. `resolve` needs `member:manage`, and **an admin may not resolve their
own request.**

One MCP-specific limit: `access_request__resolve` refuses to *approve* a
request whose `reason` is `restriction`. Approving one of those lifts a
restriction, and that decision belongs in the console.

## Never exposed, at any scope

- **API tokens — the whole domain.** Not listing them, not renaming one, not
  revoking one. Minting a standing credential through an AI caller would be
  privilege escalation, and the rest of the domain went with it: token
  management is an app action. Send the person to Settings → API tokens.
- **SCIM tokens**, for the same reason. SCIM *groups* are readable; the tokens
  are not.
- **Rotating or reading any credential.** No operation anywhere accepts a
  secret as input or returns one.
- **Identity and security changes.**
- **Billing.**
- **UI navigation and page drafts** — they need the browser window an MCP
  client does not have.

One partial exception: `elaichi__canvas__upsert_widget` is offered to clients
that negotiated the MCP Apps extension, and to nobody else. Removing a widget,
and asking the user a question, stay app-only.

## Results and failures

Results are redacted and **silently** capped: strings at 8,000 characters,
arrays at 200 items, objects at 200 keys, depth 8. A broad list can come back
both enormous and quietly incomplete, so page deliberately and ask narrow
questions.

Validation, conflict, permission and not-found failures carry a real message —
act on it. Everything else collapses to a generic try-again sentence naming no
cause; **do not retry blindly on one.**

## Who is the current user?

No operation returns them. Read the id out of the `global:usr_…` toolbox in
`elaichi__toolbox__list`.
