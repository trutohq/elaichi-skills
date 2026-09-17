# The first hour

From nothing to an AI client running real tools, in the order that avoids
rework.

## 1. Sign in and create the organization

Open [app.elaichi.ai](https://app.elaichi.ai). There are no passwords — sign
in with Google, GitHub, Microsoft, a magic link, or your company's SSO.

Your account is global; the **organization** is the workspace. Whoever creates
it becomes its Org Owner. You are asked for a **region** — United States, European Union, or
Asia-Pacific — at create time. **It cannot be changed afterwards**: it is not
a field on the organization update, so moving means a new organization. Pick
the one your data should live in.

## 2. Connect one account and prove the loop

Do not start with governance. Start by making one thing work end to end,
because it is the fastest way to find out what your team actually needs.

Connections → **Add connection** → search for a product you use → sign in with
it and approve what it asks for. (Connectors is the browse-only catalog; the
Connect button is not there.)

Then decide who reaches it. The default is **just you**. A shared inbox,
helpdesk or CRM usually wants the whole organization or one team; a personal
calendar does not.

A toolbox appears for that connection immediately. Nothing to publish.

## 3. Connect your own AI client

Open **Connect your AI client** and copy the endpoint. Add it to
[Claude](https://elaichi.ai/docs/guides/mcp-servers/claude),
[ChatGPT](https://elaichi.ai/docs/guides/mcp-servers/chatgpt) or
[Cursor](https://elaichi.ai/docs/guides/mcp-servers/cursor).

On the consent screen, grant **Read** and **Run tools**. Leave delete off until
something genuinely needs it.

Then paste this into the client — it confirms the connection and gets you
moving:

> Elaichi is connected. List the Elaichi tools you have, then help me connect
> my first app. If a sign-in comes up, stop and tell me. I approve the access
> myself.

The last two sentences matter. A model cannot grant itself access, and without
being told to stop it will report success while a sign-in sits unanswered.

## 4. Decide two things before you invite anyone

Both are much cheaper to decide now than to unpick later.

**Which connections are shared, and at what scope.** A connection shared with
the organization is reachable by everyone in it. A connection left private is
reachable by nobody else — including, later, by whoever has to clean up when
its owner leaves. Shared team accounts should be owned by someone who will
still be there.

**Whether you want restrictions.** By default everyone with the Member role can
connect anything in the catalog and run anything on it. If there are products
your organization should not be reaching through an agent at all, Governance →
Restrictions is where that is stated, and it applies everywhere including MCP.

A useful starting shape: leave it open, watch the audit log for a week, then
restrict what surprises you.

## 5. Invite people

Settings → People → invite by email, with a role assigned up front.

Roles are exclusive — one each. The common shape:

- **Member** for most people. Connect accounts, build toolboxes, run tools.
- **Team Admin** for whoever manages a group.
- **People Admin** for whoever handles joiners and leavers.
- **Org Admin** for a second pair of hands on everything but billing.
- **Auditor** for compliance — read-only everywhere, and a free seat.

Two ways to skip invites entirely: **verify your email domain** so colleagues
auto-join with a default role, or set up **SCIM** so your directory creates,
updates and deactivates members for you.

## 6. Curate, once you know what people actually do

The per-connection toolboxes are fine to start with. Build a deliberate one
when you notice a job being done repeatedly, and you want:

- **fewer tools**, so the model picks better
- **better names**, describing the job rather than the API
- **locked inputs** — a fixed board, folder, or pipeline the model cannot
  wander out of

Then choose how to hand it out:

- **Share the toolbox at `use`** when people should run *your* accounts. They
  never see the credentials and lose access the moment you revoke the share.
- **Share a template at `use`** when people should bring their own accounts.
  They stamp their own toolbox from your design.

## 7. Turn on the boring things

| Thing | Where | Why now |
|---|---|---|
| Two-factor or passkeys | Settings → Security | Two minutes, and it covers every sign-in |
| Single sign-on | Settings → Single sign-on | Before headcount grows, not after |
| Audit forwarding | Settings → Logging | Events are only forwarded from the moment you configure it |
| Notifications | Settings → Notifications | Know when a connection breaks, not when someone complains |

## What to check when it does not work

| Symptom | First thing to check |
|---|---|
| The client shows no tools at all | Was **Run tools** granted on the consent screen? |
| The client shows Elaichi's own operations but nothing else | Same — or nothing is connected yet |
| One expected tool is missing | Connection status first, restrictions second |
| A newly connected app has not appeared | Most clients cache the tool list. Start a new conversation, or reconnect |
| A call is refused after consent | The scope it needed was not granted. Reconnect and widen it |

Longer version in the **elaichi-clients** skill.
