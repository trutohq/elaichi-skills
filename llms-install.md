# Installing the Elaichi MCP server

Instructions for an agent (Cline, Claude Code, Cursor) setting this up on
someone's behalf. Elaichi is a **remote** MCP server — there is nothing to
clone, build, install or run locally, and there is no API key to paste.

One endpoint serves every organization and every person:

```
https://api.elaichi.ai/mcp
```

Transport is Streamable HTTP. Authentication is OAuth: the person signs in as
themselves in a browser window, and every call afterwards runs inside the
access they already have in the connected applications.

## Cline

Add it as a remote server. Either use the UI — **MCP Servers → Configure →
Remote Servers**, transport **Streamable HTTP** — or write the config directly:

```json
{
  "mcpServers": {
    "elaichi": {
      "type": "streamableHttp",
      "url": "https://api.elaichi.ai/mcp",
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

Do **not** add an `Authorization` header. Elaichi does not use a bearer token;
the OAuth flow opens a browser window on first connect and the session is held
after that. A hand-written token here will make the connection fail.

## Claude Code

```bash
claude mcp add --transport http elaichi https://api.elaichi.ai/mcp
```

Or install this repo's plugin, which bundles the server along with the skills:

```
/plugin marketplace add trutohq/elaichi-skills
/plugin install elaichi@elaichi-skills
```

## Cursor

**Cursor Settings → MCP → Add**, transport **Streamable HTTP**, URL
`https://api.elaichi.ai/mcp`. Cursor prompts for the OAuth sign-in.

## After it connects

The person needs an Elaichi account and at least one connected application.
A free 14-day trial is at https://app.elaichi.ai/signup — no credit card.

The endpoint advertises two tools rather than hundreds: `search_tools` to find
what is available across everything the organization has connected, and
`execute_tool` to run one. So the first call in a new session is usually a
search, not a guess at a tool name.

## If it does not work

- **No tools listed.** The account has no connected applications yet, or the
  person's role restricts all of them. Connect one at https://app.elaichi.ai.
- **A tool is missing.** It may be restricted for that person's role. A
  restricted tool is never advertised, so it will not appear in a search.
- **The browser window never opens.** The client is treating this as a local
  server. Check the transport is Streamable HTTP and the URL has no trailing
  path beyond `/mcp`.

Full documentation: https://elaichi.ai/docs/
