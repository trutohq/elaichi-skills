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
Every connected-app call goes through `execute_tool` or `run_code`, which are
marked as able to change things, so a "read actions only" setting in ChatGPT
does not make connected apps read-only.

Because connected tools are reached through `search_tools` and `execute_tool`
rather than listed one by one, apps connected in Elaichi later are reachable
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
