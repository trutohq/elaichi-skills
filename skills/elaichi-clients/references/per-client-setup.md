# Setting up each client

The endpoint is the same everywhere — the same URL for every organization,
every person and every client. Copy it from the **Connect** row in the sidebar
of [app.elaichi.ai](https://app.elaichi.ai) and paste it exactly as given. Which
organization and whose access a call runs under come from the OAuth grant, not
from the address.

Everything below assumes the reader has an Elaichi account — the same sign-in
they use for the web app.

## Claude

Works on Free, Pro, Max, Team and Enterprise. Free is limited to one custom
connector.

**On Team and Enterprise, only an Owner can add a connector.** Everyone else
connects to it individually once it exists, and signs in as themselves — so
each person's tools still follow their own access.

1. Open **Customize → Connectors**.
2. Choose **Add custom connector** and paste the endpoint.
3. Sign in to Elaichi, pick the organization, and approve what the connector
   can do.

Leave **OAuth Client ID** and **Client Secret** empty under Advanced settings.

Claude reaches the endpoint from Anthropic's cloud, not from the user's
computer, so it must be reachable on the public internet. A `localhost`
address will not work.

To disconnect for certain, revoke the grant in Elaichi under Settings →
Connected apps. Removing the connector in Claude hides it there.

Guide: [elaichi.ai/docs/guides/mcp-servers/claude](https://elaichi.ai/docs/guides/mcp-servers/claude)

## ChatGPT

On Pro you add it yourself. On Business an admin adds it for the workspace.

1. In ChatGPT, open **Plugins** from the left bar. That opens Customize.
2. Select **Add**, then **Add custom MCP server**.
3. Name it Elaichi, paste the endpoint, and leave Authentication on OAuth.
4. Tick "I understand and want to continue", then select **Create as a plugin**.
5. Select **Continue to Elaichi**, sign in, and approve what the plugin can do.

After that, the plugin is listed under **Plugins → Personal** with a **Try in
chat** button. Its settings page has **Refresh tools** and a Permission choice.

Video walkthrough: https://youtu.be/uiFFrOK7ShY

No client ID or secret is requested — Elaichi registers ChatGPT automatically
on first contact.

ChatGPT cannot reach a local MCP server; use the hosted endpoint.

ChatGPT may ask for confirmation before an action, depending on its own app
permission settings. **Treat that as a convenience, not the security
boundary** — the scopes granted on Elaichi's consent screen are the real one.
A connected-app read goes through `read_tool`, which is marked read-only, so
ChatGPT usually runs it without asking. A write goes through `execute_tool` or
`run_code`, which are marked as able to change things. A "read actions only"
setting in ChatGPT allows `read_tool` and blocks `execute_tool` and `run_code`.

Because connected tools are reached through `search_tools`, `read_tool` and
`execute_tool` rather than listed one by one, apps connected in Elaichi later are reachable
without selecting Refresh tools in ChatGPT.

To disconnect for certain, revoke the grant in Elaichi under Settings →
Connected apps.

Guide: [elaichi.ai/docs/guides/mcp-servers/chatgpt](https://elaichi.ai/docs/guides/mcp-servers/chatgpt)

## Cursor

Any recent version with MCP support. Cursor reads a file on the machine, so
this is **per machine**, and optionally per project. There is nothing
account-level to configure.

1. In Cursor, open **Customize**, then **MCPs**.
2. Select **New MCP Server**. That opens `~/.cursor/mcp.json`, which applies
   everywhere. For one project only, use `.cursor/mcp.json` inside the
   repository instead.
3. Add an entry named `elaichi` under `mcpServers`, with one field, `url`, set
   to the Elaichi endpoint. Save the file.

   ```json
   {
     "mcpServers": {
       "elaichi": {
         "url": "https://api.elaichi.ai/mcp"
       }
     }
   }
   ```

4. Elaichi is listed under **Needs Attention** as "Needs authentication".
   Select **Authenticate**.
5. Elaichi's sign-in and consent screen opens in the browser and names Cursor
   as the requesting app. Pick the organization, choose what Cursor may do and
   which tools it may use, then select **Allow access**. The browser shows
   "Authorization complete" and may ask to open Cursor. Select **Open Cursor**.

There is **no `type` field, no command to run, and no `auth` block.** Cursor
detects the transport from the endpoint, and dynamic client registration
handles the credentials. If other servers are already in the file, add this
alongside them.

Setting this up on a laptop does not set it up on a desktop — repeat it on each
machine and sign in on each.

To disconnect: remove the entry and reload, and revoke the grant in Elaichi
under Settings → Connected apps.

Guide: [elaichi.ai/docs/guides/mcp-servers/cursor](https://elaichi.ai/docs/guides/mcp-servers/cursor)

Video walkthrough: https://youtu.be/EwleY4bw0HQ

## Microsoft Copilot

Microsoft Copilot (formerly Microsoft 365 Copilot) reaches Elaichi through an
agent built in **Copilot Studio**. You add Elaichi's endpoint to the agent as an MCP tool, then publish
the agent to Microsoft Copilot. Copilot Studio supports the Streamable HTTP
transport, which Elaichi uses. The setup is **per agent**, not per person.

1. In Copilot Studio, open the agent and go to its **Tools** page.
2. Select **Add a tool**, then **New tool**, then **Model Context Protocol**.
   The MCP onboarding wizard opens.
3. Fill in **Server name** (`Elaichi`), **Server description** and **Server
   URL**. The server URL is the Elaichi endpoint. Write the description so the
   agent can tell when to call Elaichi: it is where the person's connected
   apps and Elaichi's own operations live.
4. Set the authentication type to **OAuth 2.0**, then the type to **Dynamic
   discovery**, then select **Create**. Dynamic discovery is for servers that
   support OAuth 2.0 dynamic client registration, which Elaichi does. There
   is no client ID, secret or URL to enter.
5. Select **Next**. On **Add tool**, select **Create a new connection** and
   sign in. Elaichi's sign-in and consent screen opens. Pick the
   organization, choose what the agent may do and which tools it may use,
   then select **Allow access**.
6. Select **Add to agent**.
7. Publish the agent, then go to **Channels** and open **Teams and Microsoft
   Copilot**. Make sure **Make agent available in Microsoft Copilot** is
   selected and select **Add channel**.
8. In Microsoft Copilot, type **@**, pick the agent and ask a question.

**Keep each person signing in as themselves.** Leave the connection on
end-user credentials, so every person who uses the agent signs in to Elaichi
with their own account and gets their own access. A connection set to the
maker's credentials would run every person's calls as the maker. Microsoft's
setup pages above do not cover that setting, so check it when you add the
tool.

**It shows as unverified.** Sign-in goes through Copilot Studio's shared sign-in
host, so the consent screen cannot tell one agent from another. Check it is
the sign-in you started before you approve.

Before others can use the agent, Microsoft requires that it be published at
least once and shared with them. Showing it in the Microsoft 365 Agent Store or the
Teams app store for the whole organization goes through admin approval.
Power Platform data policies that restrict connectors also restrict the MCP
server.

To disconnect: remove the Elaichi tool from the agent or delete its
connection in Copilot Studio, and revoke the grant in Elaichi under Settings
→ Connected apps.

Source: Microsoft Learn,
[Connect your agent to an existing MCP server](https://learn.microsoft.com/microsoft-copilot-studio/mcp-add-existing-server-to-agent)
and
[Connect and configure an agent for Teams and Microsoft Copilot](https://learn.microsoft.com/microsoft-copilot-studio/publication-add-bot-to-microsoft-teams).

## GitHub Copilot (VS Code)

GitHub Copilot in VS Code, with a version that has MCP server support. This is
GitHub Copilot in the editor. For Microsoft Copilot, see the section above.
Like Cursor, it reads a file on the machine, so this is **per machine**.
There is nothing account-level to configure.

1. Open the Command Palette and run **MCP: Add Server**.
2. Choose **HTTP (HTTP or Server-Sent Events)** and paste the Elaichi
   endpoint.
3. Enter `elaichi` as the server ID. It must not already be used in the
   destination you pick.
4. For a personal setup, choose **Global**, then **Copilot Global**. That
   writes to `$COPILOT_HOME/mcp-config.json`, or `~/.copilot/mcp-config.json`
   when `COPILOT_HOME` is not set.
5. Sign in when VS Code prompts. Elaichi's sign-in and consent screen opens in
   the browser. Pick the organization, choose what GitHub Copilot may do and
   which tools it may use, then select **Allow access**.

The entry that results looks like this (the portable format, which uses a
top-level `mcpServers`):

```json
{
  "mcpServers": {
    "elaichi": {
      "type": "http",
      "url": "https://api.elaichi.ai/mcp"
    }
  }
}
```

There is **no `oauth` block and no client ID or secret.** Dynamic client
registration handles the credentials. Do not paste a token into the file.

Other places the entry can live:

| File | Top-level key | Use |
|---|---|---|
| `$COPILOT_HOME/mcp-config.json` (else `~/.copilot/mcp-config.json`) | `mcpServers` | Personal, all workspaces. The preferred destination. |
| `.mcp.json` at the workspace root | `mcpServers` | Shared with a team. Needs the experimental setting `chat.mcp.workspaceRootConfig.enabled`. |
| `.vscode/mcp.json`, or the user profile's `mcp.json` | `servers` | **Deprecated** in VS Code's own flow, kept for compatibility. Same entry, with `servers` in place of `mcpServers`. |

Do not commit a shared file that holds anything but the endpoint. A person
who opens the repository signs in as themselves.

**GitHub Copilot is not a verified client.** The consent screen shows the name
GitHub Copilot registered with, and marks it as self-reported. Check it is the
sign-in you started before you approve.

To see the tools, open **Chat: Open Customizations** → **Tools**. To read the
server's log, run **MCP: List Servers**, select Elaichi and choose **Show
Output**. After changing the file, use **Restart Server**.

To disconnect: remove only the `elaichi` entry from its file (or **Uninstall**
from the server's menu if offered), and revoke the grant in Elaichi under
Settings → Connected apps. VS Code's docs do not describe revoking a remote
server's sign-in from the editor.

Source: [VS Code, MCP servers in VS Code](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
and the [MCP configuration reference](https://code.visualstudio.com/docs/agents/reference/mcp-configuration).

## Other MCP clients

Elaichi works with any MCP client that can add a **remote MCP server over
HTTP with OAuth**. What the client must support:

- **Dynamic client registration** — leave client ID and secret empty.
- **PKCE with S256** and the authorization-code flow, finished in a browser
  where the person signs in to Elaichi.
- Refreshing its token: an access token lasts an hour, and a client that goes
  30 days without refreshing has to connect again.

Add the endpoint as the server's URL, using the client's own steps for a
remote or HTTP server, then sign in and approve on the consent screen. Clients
that read a JSON config usually take the same `url` entry Cursor does. Test it
once with the first prompt below; the client's own documentation is the
authority on where its configuration lives.

There is no way to connect without a person: no device-code flow, no
client-credentials flow, and an API token does not work on the MCP endpoint.
For a server-side script, use the REST API with an API token instead (the
**elaichi-api** skill).

## After any of them

Paste this into the client:

> Elaichi is connected. List the Elaichi tools you have, then help me connect
> my first app. If a sign-in comes up, stop and tell me. I approve the access
> myself.

Then connect an app **in Elaichi**. Anything connected afterwards appears in
the client with no further setup there — same endpoint, more behind it — and
the reverse holds: disconnect in Elaichi and it disappears from the client.

Most clients cache the tool list at startup, so a new app may need a new
conversation, a reload, or a tool refresh before it shows up. In ChatGPT, select
**Refresh tools**.
