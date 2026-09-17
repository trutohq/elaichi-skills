# Setting up each client

The endpoint is the same everywhere — the same URL for every organization and
every person. Copy it from **Connect your AI client** in
[app.elaichi.ai](https://app.elaichi.ai) and paste it exactly as given. Which
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

1. Open **Settings → Connectors**.
2. Choose **Add custom connector** and paste the endpoint.
3. Sign in to Elaichi and approve what the connector can do.

Leave **OAuth Client ID** and **Client Secret** empty under Advanced settings.

Claude reaches the endpoint from Anthropic's cloud, not from the user's
computer, so it must be reachable on the public internet. A `localhost`
address will not work.

To disconnect: remove the connector in Claude, or revoke the grant in Elaichi.

Guide: [elaichi.ai/docs/guides/mcp-servers/claude](https://elaichi.ai/docs/guides/mcp-servers/claude)

## ChatGPT

Business, Enterprise or Edu. MCP support is **web only** today.

Developer mode must be on for the account — on Business plans only admins and
owners can turn it on. On Enterprise and Edu an admin can also grant it through
**Permissions & Roles → Connected Data**.

1. Open **Settings → Apps** and turn on developer mode (under **Advanced
   Settings**).
2. Choose **Create**, paste the endpoint, then run **Scan tools**.
3. Sign in to Elaichi and approve what the app can do.

No client ID or secret is requested — Elaichi registers ChatGPT automatically
on first contact.

ChatGPT cannot reach a local MCP server; use the hosted endpoint.

ChatGPT prompts for confirmation on write actions based on the user's
permissions. **Treat that as a convenience, not the security boundary** — the
scopes granted on Elaichi's consent screen are the real one.

To disconnect: remove the app in ChatGPT, or revoke the grant in Elaichi.

Guide: [elaichi.ai/docs/guides/mcp-servers/chatgpt](https://elaichi.ai/docs/guides/mcp-servers/chatgpt)

## Cursor

Any recent version with MCP support. Cursor reads a file on the machine, so
this is **per machine**, and optionally per project. There is nothing
account-level to configure.

1. Open `~/.cursor/mcp.json` for everywhere, or `.cursor/mcp.json` inside a
   repository for that project only.
2. Add an entry under `mcpServers`:

   ```json
   {
     "mcpServers": {
       "elaichi": {
         "url": "https://api.elaichi.ai/mcp"
       }
     }
   }
   ```

3. Reload Cursor, sign in to Elaichi, and approve the access.

There is **no `type` field, no command to run, and no `auth` block.** Cursor
detects the transport from the endpoint, and dynamic client registration
handles the credentials. If other servers are already in the file, add this
alongside them.

Setting this up on a laptop does not set it up on a desktop — repeat it on each
machine and sign in on each.

To disconnect: remove the entry and reload, or revoke the grant in Elaichi.

Guide: [elaichi.ai/docs/guides/mcp-servers/cursor](https://elaichi.ai/docs/guides/mcp-servers/cursor)

## After any of them

Paste this into the client:

> Elaichi is connected. List the Elaichi tools you have, then help me connect
> my first app. If a sign-in comes up, stop and tell me. I approve the access
> myself.

Then connect an app **in Elaichi**. Anything connected afterwards appears in
the client with no further setup there — same endpoint, more behind it — and
the reverse holds: disconnect in Elaichi and it disappears from the client.

Most clients cache the tool list at startup, so a new app may need a new
conversation, a reload, or a re-scan before it shows up.
