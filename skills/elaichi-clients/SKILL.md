---
name: elaichi-clients
description: Connect Claude, ChatGPT, Cursor or any other MCP client to Elaichi — the endpoint, per-client setup, what to tick on the consent screen (scopes, toolboxes), adding a scope later, and why a connected client shows no tools or is missing one.
whenToUse: Someone is setting up an AI client against Elaichi, pasting the MCP endpoint, editing mcp.json, choosing scopes or toolboxes on the consent screen, or reporting that their client connected but shows no tools, is missing one, or was refused.
---

# Connecting an AI client to Elaichi

Every MCP client is set up a little differently, but what happens behind them
is the same. Read this once and the per-client steps are just steps.

## One connection, not many

The client makes **one** connection — to Elaichi. The apps are connected
*inside Elaichi*, not inside the client.

```
Your AI client  ──one connection──►  Elaichi  ──►  Slack
                                              ──►  Jira
                                              ──►  HubSpot
```

Nobody adds Slack to their client. They connect Slack in Elaichi, and it
arrives through the endpoint already added.

Four things follow from the indirection, and all four are lost by connecting
apps directly in the client instead:

- **Access follows the person's role.** Toolboxes, teams and per-person rules
  still apply.
- **Restrictions are enforced.** A blocked tool is never offered and never runs.
- **Everything is audited.** Tool calls land in the audit log, marked as coming
  from MCP and naming the client.
- **Revoking is one action.** Disconnect an app in Elaichi and it is gone from
  every client.

**One endpoint, full stop** — `https://api.elaichi.ai/mcp`, the same URL for
every organization, every person and every client. Which organization and
whose access a call runs under comes from the OAuth grant, not from the
address. So there is nothing to mint, nothing per toolbox, and nothing per app.

## Where the endpoint comes from

In [app.elaichi.ai](https://app.elaichi.ai), click the **Connect** row under
the sidebar's list (**Connect an AI client** when the automation platform is
on) and copy the endpoint. Paste it exactly as given.

It is an OAuth endpoint. There is no API key, no bridge command, and no
credential anywhere in the URL. Elaichi supports dynamic client registration,
so **leave client ID and client secret empty** wherever a client offers them —
the client registers itself on first contact.

Signing in always needs a person in a browser, signed in to Elaichi. There is
no device-code or client-credentials flow, so an unattended job cannot get its
own grant.

It is reached over the public internet, including from Anthropic's and
OpenAI's clouds. A `localhost` address will not work for Claude or ChatGPT.

## The consent screen

Signing in brings up Elaichi's own consent screen. It carries more weight than
most OAuth screens, so read it rather than click through.

Over MCP, Elaichi never sees the person's prompt — the call was composed by a
model in a conversation Elaichi cannot see. **So the approval moves forward to
this screen, and the scopes granted are the standing approval.** Elaichi does
not ask again per call. A confirmation the person sees before a tool runs is
the client's own prompt, not Elaichi's.

**1. Pick the organization.** One grant covers exactly one organization. With
several memberships, nothing is preselected. Reaching another organization
takes a second connection.

**2. Choose what the client can do.** One checkbox per scope the client asked
for:

| On the consent screen | In an error | What it allows |
|---|---|---|
| **Read your organization's data** | `mcp:read` | Everything you can already see in Elaichi. Never secret values. Open its **Details** once: it also covers the audit log, pending invitations, SSO and SCIM settings, verified domains and your API token list (never values). |
| **Create and change data** | `mcp:write` | Create and change teams, roles, toolboxes, templates and connections, invite people, and share access |
| **Delete data and remove access** | `mcp:destructive` | Permanently delete and remove people, inside connected apps too. Cannot be undone |
| **Run your connected tools** | `mcp:tools` | Run tools from the toolboxes chosen in the next step. A tool that deletes also needs Delete |

Every requested scope **starts ticked except Delete**, which always takes a
deliberate click. A client that asks for no scope at all gets Read only.
Ticking Create and change, or Delete, locks Read on. For most people, **Read**
and **Run your connected tools** are enough; untick Create and change unless
the person wants the client to reshape the organization.

The screen may also show **Confirm who you are** and **See your email
address**. They are always on when asked for, and reach nothing in the
organization.

**3. Choose toolboxes** (only when Run your connected tools is ticked):

- **All my tools** — the default. Everything the person can use today, and
  accounts and toolboxes they get later.
- **Only the ones I pick** — one to 50 toolboxes they can use. The client
  reaches nothing else, including accounts connected later. Automatic
  per-connection toolboxes cannot be picked; build or stamp a toolbox first.

### Changing it later

- **Toolboxes:** Settings → **Connected apps** → the app → **Manage toolboxes**.
  Takes effect on the client's next call.
- **Scopes:** cannot be changed. A grant's scopes are fixed at consent, and
  Connected apps cannot add one. To add Create and change, Delete or Run your
  connected tools, **connect the client again** and tick it. This works only
  if the client asks for that scope again — the screen never offers a scope the
  client did not request.
- **Revoke:** Settings → Connected apps. The client's next call fails.

## Per-client setup

Full steps and plan requirements in
[Setting up each client](./references/per-client-setup.md). The short form:

| Client | Where | Note |
|---|---|---|
| **Claude** | Settings → Connectors → **Add custom connector**, paste the endpoint | On Team and Enterprise, **only an Owner** can add it. Everyone else then connects to it as themselves. |
| **ChatGPT** | Settings → Apps → developer mode → **Create**, paste the endpoint, **Scan tools** | Business, Enterprise or Edu. Web only. |
| **Cursor** | An entry in `~/.cursor/mcp.json` | Per machine. No `type`, no `auth` block, no command. |
| **Any other MCP client** | Add a remote (HTTP) MCP server with the endpoint URL | Needs dynamic client registration, PKCE and a browser sign-in. Test it. |

Cursor, in full:

```json
{
  "mcpServers": {
    "elaichi": {
      "url": "https://api.elaichi.ai/mcp"
    }
  }
}
```

If the file already has other servers under `mcpServers`, add this alongside
them rather than replacing the block.

## The first prompt

Once connected, paste this into the client. It is the same prompt the
**Connect** dialog hands you, and it both confirms the connection and gets the
person moving:

> Elaichi is connected. List the Elaichi tools you have, then help me connect
> my first app. If a sign-in comes up, stop and tell me. I approve the access
> myself.

The last two sentences are deliberate. **A model cannot grant itself access to
Elaichi.** Without being told to stop, a client will report success while the
sign-in sits there unanswered.

Connecting the app itself happens in Elaichi, through a link the person opens.

## What the client sees

**One person's access, not the organization's.** Two colleagues pointing the
same client at the same endpoint do not see the same tools.

**Connected tools are found by searching, not by browsing.** They are never
listed one by one, however few there are. The tool list holds:

- Elaichi's own `elaichi__…` operations — only those the person's role and the
  grant's scopes allow. Automation, collection, dashboard and knowledge
  operations appear only where the automation platform is on.
- `search_tools` to find a connected tool and `execute_tool` to run one —
  only while the grant reaches at least one connected tool, restricted ones
  included.
- `run_code` — Code Mode, a small JavaScript program that calls several tools
  and returns only what it needs. It is on for every organization; there is no
  client setting for it. Every call inside it passes the same checks as
  `execute_tool`.

A short tool list makes a model choose better, and this one stays the same size
however many apps get connected. A client showing "only a few tools" is usually
working correctly. `search_tools` ranks **lexically, not semantically** —
concrete tool-ish words ("create deal", "list issues") work where a sentence
ranks badly.

**Cards.** Clients that support MCP Apps draw interactive cards for some
results — an account picker, a connect link, a refusal with an ask-for-access
button, connection health, a file. Clients without it get the same result as
text, and nothing is lost that the person needs to act on.

**Client settings are not Elaichi's controls.** No tool name in the list names
a connected app, so a client's per-tool allow-list or approval can only gate
`execute_tool`, `run_code` and the two `…__execute` operations as wholes. A
client's "read actions only" setting does not make connected apps read-only.
Per-app and per-tool control lives in Elaichi, as restrictions.

## Troubleshooting

Work down this list. The first match is usually the answer.

| Symptom | Cause and fix |
|---|---|
| **No tools at all** | The person's role lacks `tool:execute` — Guest, Billing Admin and Auditor do. An admin changes the role. |
| **Only `elaichi__…` operations, no `search_tools`** | Either **Run your connected tools** was not granted — connect the client again and tick it — or the grant reaches no active connected tool yet: nothing connected, or every account `pending` or `needs_reauth`. (Restricted tools still bring `search_tools`, which names them.) Connect or reconnect an app in Elaichi. |
| **Chose "Only the ones I pick" and tools vanished** | A picked toolbox was deleted or the person lost access to it. Settings → Connected apps → the app → **Manage toolboxes**. |
| **`search_tools` and `execute_tool` show up** | Nothing is wrong. Ask the client to search for the tool by name. |
| **One expected tool is missing** | Connection status first, restrictions second. A tool that deletes is left out unless the grant has **Delete** as well as Run your connected tools. Work the ladder in [Diagnosing a missing tool](../elaichi-mcp/references/missing-tools.md). |
| **Expected Elaichi operations are missing** | The grant lacks the scope they need (Create and change, or Delete), or the person's role lacks the permission. Connect again for a scope; ask an admin for a permission. |
| **A newly connected app has not appeared** | Most clients cache the tool list. Start a new conversation, reconnect the connector, or re-scan tools. |
| **A call is refused, naming a scope** | The grant was never given it. Connect the client again and tick it — Settings → Connected apps cannot add a scope. |
| **A call is refused, naming a permission or `tool:execute`** | Reconnecting will not help. An admin changes the role. |
| **Every call fails with `subscription_required`** | The organization has no active plan; it is paused until someone subscribes. |
| **Refused because the organization requires two-factor** | Set up two-factor in Elaichi (Settings → Security), then connect the client again. |
| **Every call fails "no longer an active member"** | The person was removed or suspended. An admin restores them. |
| **The client asks to sign in again** | The grant was revoked, or the client went 30 days without refreshing. Connect again. |
| **Sign-in says the organization requires SSO** | Use the company's SSO sign-in, then approve. |
| **"Add custom connector" is missing in Claude** | On Team or Enterprise only an Owner can add one. Ask an Owner to add it, then connect to it as yourself. |
| **ChatGPT sign-in loops or never returns** | Turn developer mode on under Settings → Apps → Advanced Settings. If it is already on, the plan does not include it — Business, Enterprise or Edu is required. |
| **Cursor never shows the server** | Invalid JSON, usually a trailing comma or a missing brace. Check the file parses, then reload the window. |
| **Cursor shows no sign-in prompt** | Cursor did not reload. Reload the window, then open MCP settings to trigger the connection. |

## Disconnecting

To be sure access stops, revoke the grant in **Settings → Connected apps**: the
client's very next call fails. Removing the connector, app or `mcp.json` entry
in the client hides it there, but whether that also revokes the Elaichi grant
depends on the client.

## References

| Document | Topics |
|---|---|
| [Setting up each client](./references/per-client-setup.md) | Claude, ChatGPT, Cursor and other MCP clients in full, with plan requirements and the exact configuration each needs |

## Companion skills

- [elaichi-mcp](../elaichi-mcp/SKILL.md) — using the endpoint once it is connected.
- [elaichi](../elaichi/SKILL.md) — what the product is, and where things live.
- [elaichi-governance](../elaichi-governance/SKILL.md) — why a tool is blocked, and who can unblock it.
