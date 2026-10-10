# Oversight: audit log, approvals, notifications and limits

## The audit log

**Governance → Audit logs.** Append-only. Every organization on Gold or Black
has it.

**Everyone can read it, at one of two scopes.** The response says which in
`scope`:

| Scope | Who | What they see |
|---|---|---|
| `org` | Anyone holding `audit:view` (Org Owner, Org Admin, Auditor) | Every event in the organization |
| `own` | Everyone else | Their own events, plus events on connections they own or can edit, including other members' tool calls through those connections |

So "only admins can see the audit log" is wrong, and "a member sees what
everyone did" is wrong too. At `own` scope, a missing event is not proof it
never happened, only that it is outside what this person may see.

**In the console** you can filter by free text, category (Authentication,
Assistant, MCP, Toolboxes, Files, Connections, Access, Org, Other), actor,
action kind (Created, Updated, Deleted, Read, Other) and time range.

**Over MCP**, `elaichi__audit__list` takes only `limit`, `cursor` and
`connection_id`. There is no filter by actor, action or date there, so a
question like "who deleted X last Tuesday" means paging back from the newest
entry. Say so rather than implying a targeted search. `connection_id` narrows to
one connection, for its owner, its `edit` holders, or `audit:view` holders.

### Who did it

Every row carries `actor_kind`:

| `actor_kind` | Meaning |
|---|---|
| `user` | A member, including calls their MCP client made on their behalf |
| `ai_assistant` | The Elaichi agent, during a conversation |
| `automation` | An automation run, acting for the person it runs as |
| `staff` | Elaichi support, either acting directly or signed in as a member |
| `system` | No acting person, for example SCIM provisioning |

The field also allows `scim` and `api_token`, but today those calls are recorded as `system` and `user`.

Rows written through Elaichi's operations also carry `metadata.surface`: `app`
(the Elaichi agent, with a person in the chat), `mcp` (an MCP client on a
standing grant), `console` (a person in the console) or `api` (an organization
API token).

**A tool call from Claude, ChatGPT, Cursor or another MCP client is recorded as
`actor_kind: "user"` with surface `mcp`** and the client's id. So when someone
asks whether their admin can see what an agent did: yes, as the person whose
client did it, with the client named.

### What a tool call row records

The acting person, the toolbox, the tool, the connector and the connection the
call actually reached, whether approval was needed and how it was given, whether
a person edited the arguments, the outcome, what the call touched, and a
one-sentence `tool_call.summary` ("Updated a page in Notion"). Report that
summary rather than raw ids.

It does **not** record argument values, except the one path argument that names
the object (recorded as the target). On failure it keeps an error code, not the
vendor's message.

A member who has left shows as a former member, by id. Rows are eventually
consistent: a new one can take a moment to appear.

## Logging destinations

**Settings → Logging**, `logging:manage`. Forwards audit and tool-call events to
your own log service. It needs the **Black** plan, which is not on sale yet.

- Each destination can filter by type: `tool_call`, `auth`, `admin`.
- **Only Datadog delivers today.** Splunk HEC and Microsoft Sentinel are listed
  as "coming soon".
- Delivery is queued and batched, with retries.

## Notifications

**Settings → Notifications**, `notification:manage`. For people, not for a log
store.

A destination is a **Slack** channel (through **Add to Slack**, or an incoming
webhook URL) or an **email** address. Each one picks which events it wants, for
example a connection needing reconnecting, a member joining or leaving, role and
restriction changes, a new or repointed custom connector, an API token created
or revoked, or an access request filed. Each destination has a test send.

Set one up early: hear that a connection broke from Slack, not from the person
whose agent stopped working.

## Approvals

"Who approves what" depends on where the call comes from. Elaichi has no
admin-written rule today that pauses a whole class of AI client writes for an
approver.

| Caller | The approval |
|---|---|
| **An MCP client** (Claude, ChatGPT, Cursor and others) | The scopes the person granted on Elaichi's consent screen are the standing approval. Elaichi adds no per-call prompt over MCP. Any per-call confirmation is the client's own. |
| **The Elaichi agent** | Writes stop at an approval card (Deny, Always allow, Allow once). Deletes ask every time. In Slack, the card goes to the requester's direct message with only Approve and Deny. |
| **An automation** | A destructive step must have an `approve` step before it. Approvers decide in the **Approvals** inbox, by email, or in Slack; a gated destructive step is approved in the console only. See [elaichi-automations](../../elaichi-automations/SKILL.md). |

What an admin can use today to hold AI clients back:

- **Restrictions** block a connector or tool for a role or a person, for every
  client and automation.
- **Consent scopes**: "Run your connected tools" runs reads and writes. Only a
  tool Elaichi rates destructive also needs "Delete data and remove access". To
  hold a client to reads, pick toolboxes of read tools at consent, or block the
  write tools with a restriction. More in **elaichi-mcp**.

Every approval decision is audited, and a tool call row says how it was
approved.

## Web access and spend

Both are Governance tabs that appear only where the organization has
automations turned on.

**Web access** (**Governance → Web access**) decides which hosts automations may
fetch from: off (the default), only hosts each automation declares, or an
allowlist, plus whether write methods are allowed. A block entry always wins.
Reading needs `restriction:view`, changing needs `restriction:manage`. AI
surfaces can read it (`elaichi__web_access_policy__get`) and test one URL
(`__check`), never change it.

**Spend** (**Governance → Spend**) has usage meters, usage limits (a hard limit
plus alert percentages, organization-wide or per automation), and payment
controls: a payment policy that sets when a payment needs one or two approvals,
and payment caps per period and per transaction. Reading needs `spend:view`,
changing needs `spend:manage`, and changing payment settings also asks the person
to confirm it is them. AI surfaces only read them.
