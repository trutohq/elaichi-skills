<p align="center">
  <img src="./assets/logo.png" alt="Elaichi" width="72">
</p>

# Elaichi Agent Skills

Official agent skills for [Elaichi](https://elaichi.ai) — the agent platform
for companies. Works with [Claude Code](https://docs.claude.com/en/docs/claude-code),
[Cursor](https://cursor.com), and any other agent that supports the
[Agent Skills](https://www.anthropic.com/news/skills) (`SKILL.md`) convention.

They do two jobs:

- **Help an agent use Elaichi well** — find the right connected tool on the
  first search, pick the right account, read a refusal correctly, and diagnose
  a missing tool instead of guessing.
- **Help people find their way around Elaichi** — what its words mean, where
  each screen lives, and how to do a thing, answered inside the AI client they
  already work in.

## Installation

### Claude Code

Add this repo as a plugin marketplace, then install the plugin:

```bash
/plugin marketplace add trutohq/elaichi-skills
/plugin install elaichi@elaichi-skills
```

Skills become namespaced as `elaichi:elaichi`, `elaichi:elaichi-mcp`,
`elaichi:elaichi-clients`, `elaichi:elaichi-connections`,
`elaichi:elaichi-toolboxes`, `elaichi:elaichi-governance`,
`elaichi:elaichi-api` and `elaichi:elaichi-conventions`.

To try it locally before installing, run `claude --plugin-dir /path/to/elaichi-skills`.

### Cursor

Open **Cursor Settings → Rules**, click **Add Rule** under **Project Rules**,
choose **Remote Rule (GitHub)**, and enter:

```
https://github.com/trutohq/elaichi-skills
```

This pulls in both the skills and the always-applied `elaichi` rule.

### Any agent (via `npx skills`)

```bash
npx skills add trutohq/elaichi-skills
```

Add `-g` to install globally instead of into the current project.

### Updating and removing

| | Claude Code | Cursor | `npx skills` |
|---|---|---|---|
| Update | `/plugin marketplace update elaichi-skills` | Re-sync the remote rule from **Settings → Rules** | `npx skills update` |
| Remove | `/plugin uninstall elaichi@elaichi-skills` | Delete the rule from **Settings → Rules** | `npx skills remove trutohq/elaichi-skills` |

## Skills

| Skill | Description |
|-------|-------------|
| [elaichi](./skills/elaichi/SKILL.md) | What Elaichi is, the words it uses, where everything lives in the app, and which skill to load next |
| [elaichi-mcp](./skills/elaichi-mcp/SKILL.md) | Drive the MCP endpoint — `search_tools` and `execute_tool`, the `connection` argument, scopes and refusals, and the missing-tool ladder |
| [elaichi-clients](./skills/elaichi-clients/SKILL.md) | Connect Claude, ChatGPT or Cursor, what to grant on the consent screen, and why a client shows no tools |
| [elaichi-connections](./skills/elaichi-connections/SKILL.md) | Connect and look after accounts — sharing versus ownership, status and reconnecting, transfer and offboarding, custom connectors |
| [elaichi-toolboxes](./skills/elaichi-toolboxes/SKILL.md) | Curate what an agent can do — toolboxes versus templates, frozen parameters, what sharing at `use` delegates, and synthetic tools |
| [elaichi-governance](./skills/elaichi-governance/SKILL.md) | Roles and the full permission catalog, restrictions, access requests, the audit log, SSO and SCIM |
| [elaichi-api](./skills/elaichi-api/SKILL.md) | Write code against `api.elaichi.ai` — auth, the cursor envelope, error shapes, capability fields, CRUD conventions |
| [elaichi-conventions](./skills/elaichi-conventions/SKILL.md) | The base facts in one page — URLs, auth, pagination, error codes, id prefixes, the two MCP namespaces |

## Rules (Cursor only)

| Rule | Description |
|------|-------------|
| [elaichi](./rules/elaichi.mdc) | Always-applied rule with URLs, API auth, the list envelope, error codes, id prefixes and the MCP namespaces |

Claude Code plugins have no "always-applied rule" primitive, so the same facts
arrive there through the model-invoked `elaichi-conventions` skill. The rule is
**generated** from that skill by `scripts/generate-rule.mjs`, and CI fails if
the two drift — edit the skill, not the rule.

## What is Elaichi?

Elaichi is an agent platform for companies. It connects the software a company
already runs on and lets agents do real work in those systems, inside the same
permissions the company already grants its people.

Two things carry the product, and most AI tooling offers only one of them:
**reach** — the application catalog, connected once, available as tools an
agent can call — and **restraint** — an agent never getting more access than
the person it acts for.

The reach is delivered over MCP. The AI client makes **one** connection, to
Elaichi; the apps are connected inside Elaichi, not inside the client:

```
Your AI client  ──one connection──►  Elaichi  ──►  Slack
                                              ──►  Jira
                                              ──►  HubSpot
```

Because every call travels through Elaichi:

- **Access follows the person's role.** Toolboxes, teams and per-user
  overrides all still apply.
- **Restrictions are enforced.** A blocked tool is never offered and never
  runs.
- **Everything is audited**, with an AI actor recorded as a field rather than
  inferred.
- **Revoking is one action**, and it takes effect on the client's next call.

## What you get

- **A large connector catalog** — see
  [elaichi.ai/connectors](https://elaichi.ai/connectors/) — plus custom
  connectors an organization authors or forks
- **Toolboxes and templates** — curate tools, rename them for the model, freeze
  the parameters that are not its decision, and share
- **Synthetic tools** — chain several calls into one tool an agent calls once
- **Delegated execution** — share a toolbox and colleagues run your accounts
  without ever seeing a credential
- **38 permissions, 8 predefined roles** plus unlimited custom roles, per-tool
  restrictions, and an append-only audit log — all of it applying over MCP too
- **SSO, SCIM and directory group mapping**

## Resources

- [Documentation](https://elaichi.ai/docs)
- [Getting started](https://elaichi.ai/docs/getting-started)
- [API reference](https://elaichi.ai/docs/api-reference/overview/introduction)
- [OpenAPI schema](https://api.elaichi.ai/schema/openapi.json)
- [App](https://app.elaichi.ai)
- Support — support@elaichi.ai

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

Apache-2.0 — see [LICENSE](./LICENSE).
