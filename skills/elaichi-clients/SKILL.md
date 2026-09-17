---
name: elaichi-clients
description: Connect Claude, ChatGPT or Cursor to an organization's MCP endpoint — the per-client setup steps, what to grant on the consent screen, and why a freshly connected client shows no tools.
whenToUse: Someone is setting up an AI client against Elaichi, pasting an MCP endpoint, editing mcp.json, or reporting that their client connected but shows no tools or is missing one.
---

# Connecting an AI client to Elaichi

Claude, ChatGPT and Cursor are each set up differently, but what happens behind
them is the same. Read this once and the per-client steps are just steps.

## One connection, not many

The client makes **one** connection — to Elaichi. The apps are connected
*inside Elaichi*, not inside the client.

```
Your AI client  ──one connection──►  Elaichi  ──►  Slack
                                              ──►  Jira
                                              ──►  HubSpot
```

Nobody adds Slack to Claude. They connect Slack in Elaichi, and it arrives
through the endpoint already added.

Four things follow from the indirection, and all four are lost by connecting
apps directly in the client instead:

- **Access follows the person's role.** Toolboxes, teams and per-user overrides
  still apply.
- **Restrictions are enforced.** A blocked tool is never offered and never runs.
- **Everything is audited.** Tool calls land in the audit log like any other
  action.
- **Revoking is one action.** Disconnect in Elaichi and it is gone from every
  client — no hunting through client settings.

**One endpoint, full stop** — `https://api.elaichi.ai/mcp`, the same URL for
every organization and every person. Which organization and whose access a
call runs under comes from the OAuth grant, not from the address. So there is
nothing to mint, nothing per toolbox, and nothing per app.

## Where the endpoint comes from

In [app.elaichi.ai](https://app.elaichi.ai), open **Connect your AI client**
and copy the endpoint shown there. Paste it exactly as given.

It is an OAuth endpoint. There is no API key, no bridge command, and no
credential anywhere in the URL. Elaichi supports dynamic client registration,
so **leave client ID and client secret empty** wherever a client offers them —
the client registers itself on first contact.

It is reached over the public internet, including from Anthropic's and
OpenAI's clouds. A `localhost` address will not work for Claude or ChatGPT.

## The consent screen

Signing in brings up Elaichi's own consent screen, and it carries more weight
than most OAuth screens, so it is worth reading rather than clicking through.

An agent running inside Elaichi can ask before each write, because it can see
the person's own prompt. Over MCP there is nothing to ask through — the call
was composed by a model in a conversation Elaichi cannot see, and that model
could claim its own approval. **So the approval moves forward to this screen,
and the scopes granted are the standing approval.**

| On the consent screen | In an error or a scope check | What it allows |
|---|---|---|
| **Read** | `mcp:read` | Everything you can already see: people, teams, tools, connections, settings, admin records including the audit log. Never secret values. |
| **Create and change** | `mcp:write` | Create and change teams, roles, tool sets, connections and organization settings, and share them |
| **Delete** | `mcp:destructive` | Permanently delete teams, roles, tool sets and connections, remove people, take away access. Reaches inside connected apps. Cannot be undone. |
| **Run tools** | `mcp:tools` | Run tools from the toolboxes chosen on this screen. Deleting through one also needs Delete. |

The two vocabularies are the same four scopes. The screen shows the left
column; a refusal names the right one.

**Only Read is granted by default.** For most use you want **Read** and **Run
tools** — enough to use the connected apps without letting the model reshape
the organization. Widen later by re-consenting.

When **Run tools** is granted, the screen also asks *which toolboxes* the
client may reach: all of them, or a chosen set. Edit that later from
**Settings → Connected apps**; both an edit and a revocation take effect on the
client's very next call.

Open the **Details** link on Read at least once. It covers more than it sounds
like — SSO connections, directory group mappings, org domains, pending
invitations, API token metadata.

## Per-client setup

Full steps and plan requirements in
[Setting up each client](./references/per-client-setup.md). The short form:

| Client | Where | Note |
|---|---|---|
| **Claude** | Settings → Connectors → **Add custom connector**, paste the endpoint | On Team and Enterprise, **only an Owner** can add it. Everyone else then enables it for themselves. |
| **ChatGPT** | Settings → Apps → developer mode → **Create**, paste the endpoint, **Scan tools** | Business, Enterprise or Edu. Web only. |
| **Cursor** | An entry in `~/.cursor/mcp.json` | Per machine. No `type`, no `auth` block, no command. |

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
**Connect your AI client** dialog hands you, and it both confirms the
connection and gets the person moving:

> Elaichi is connected. List the Elaichi tools you have, then help me connect
> my first app. If a sign-in comes up, stop and tell me. I approve the access
> myself.

The last two sentences are deliberate. **A model cannot grant itself access to
Elaichi.** Without being told to stop, a client will report success while the
sign-in sits there unanswered.

Connecting the app itself happens in Elaichi, not in the client.

## What the client sees

**One person's access, not the organization's.** Two colleagues pointing the
same client at the same endpoint do not see the same tools.

**Connected tools are found by searching, not by browsing.** They are never
listed one by one, however few there are. In their place the client gets
`search_tools` to find one and `execute_tool` to run it; Elaichi's own catalog
operations stay listed individually.

A short tool list makes a model choose better, and this one stays the same size
however many apps get connected. It does mean a client showing "only two tools"
is usually working correctly.

`search_tools` ranks **lexically, not semantically** — concrete tool-ish words
("create deal", "list issues") work where a sentence ranks badly.

## Troubleshooting

| Symptom | What to do |
|---|---|
| **No tools at all after connecting** | Nothing is connected in Elaichi yet, or there is no toolbox this person can reach. Connect an app in Elaichi first. |
| **Only `search_tools`, `execute_tool` and `elaichi__…` show up** | Nothing is wrong. Connected tools are never listed — ask the client to search for the tool by name. |
| **A tool you expect is missing** | Check the connection's status first, restrictions second. Work the ladder in [Diagnosing a missing tool](../elaichi-mcp/references/missing-tools.md). |
| **A newly connected app has not appeared** | Most clients cache the tool list. Start a new conversation, reconnect the connector, or re-scan tools. |
| **A call is refused after consent** | The scope it needed was not granted. Reconnect and tick the missing scope — the refusal names it. |
| **"Add custom connector" is missing in Claude** | On Team or Enterprise only an Owner can add one. Ask an Owner to add it, then enable it for yourself. |
| **ChatGPT sign-in loops or never returns** | Turn developer mode on under Settings → Apps → Advanced Settings. If it is already on, the plan does not include MCP — Business, Enterprise or Edu is required. |
| **Cursor never shows the server** | Invalid JSON, usually a trailing comma or a missing brace. Check the file parses, then reload the window. |
| **Cursor shows no sign-in prompt** | Cursor did not reload. Reload the window, then open MCP settings to trigger the connection. |

## Disconnecting

Either end works. Remove the connector, app, or `mcp.json` entry in the client
— or revoke the grant in **Settings → Connected apps**, which stops the token
working immediately.

## References

| Document | Topics |
|---|---|
| [Setting up each client](./references/per-client-setup.md) | Claude, ChatGPT and Cursor in full, with plan requirements and the exact configuration each needs |

## Companion skills

- **elaichi-mcp** — using the endpoint once it is connected.
- **elaichi** — what the product is, and where things live.
- **elaichi-governance** — why a tool is blocked, and who can unblock it.
