# Builder feedback for KeeperHub

I spent about two hours on KeeperHub this week trying to wire it into an
autonomous agent swarm where one head of the swarm needs to fire a webhook
to KH every time consensus confirms a death. KH was supposed to be the
audit trail — every kill should leave a workflow run that's externally
verifiable.

The MCP onboarding was unreasonably good. Pasted a single line into Claude
Code (`claude mcp add --transport http keeperhub https://app.keeperhub.com/mcp`),
hit `/mcp`, browser auth, done. From cold start to "I can list every action
schema KH supports" in under two minutes. I've never had an MCP integration
that smooth — most of them are local processes with port files and a manual
config dance. So credit where it's due.

The trouble started about ten minutes after that.

## The webhook URL doesn't accept the API key it tells you to use

I created a workflow in the editor (Webhook trigger → Run Code action). The
properties panel shows me a Webhook URL. The Setup Guide also has a "Generate
API Key" item with a key icon — clicked through, got a `kh_…` key. Reasonable
inference: POST to the webhook URL with that key as a Bearer token. That's
what every other workflow platform does.

```
$ curl -X POST "https://app.keeperhub.com/api/workflows/<id>/webhook" \
    -H "Authorization: Bearer kh_..." -d '{}'

{"error":"Invalid API key format"}
```

I tried four variants — `Bearer <key>`, raw `<key>`, `x-api-key`, `Api-Key` —
and got "Invalid API key format" or "Missing Authorization header" on every
single one. The error message is the problem: it tells me the format is
invalid but never says what format it *would* accept. Is there a longer key?
A different prefix? A workflow-specific webhook secret distinct from the org
API key? I genuinely don't know after staring at it.

What I'd want as a builder: have the error message include the expected
pattern, e.g. "expected `Bearer kh_org_<id>_<secret>`, got 35 chars". Even
just the expected length would let me figure out I'm missing a portion. Or
put an example curl command right next to the API key in the generation
dialog — if I'd seen `curl -H "Authorization: Bearer <key>" …` as I copied
the key, I'd have known immediately whether my call was right. Honestly the
cleanest fix is probably a per-workflow webhook signing secret in the
trigger panel, separate from the org API key. Stripe does this and it's the
right shape for "this URL is public, but only authorized callers know the
secret."

The workaround I shipped is the agent triggers the workflow via
`mcp__keeperhub__execute_workflow` instead of the public webhook. That works
flawlessly with the same Bearer token I tried at the webhook. Which is great
for me but feels like an undocumented backdoor — no non-MCP integrator
would discover it.

## MCP write scope is silent

After the auth thing, I tried to bypass the UI and create the workflow
programmatically via `mcp__keeperhub__create_workflow`. 401. Then
`update_workflow`, `delete_workflow`, `ai_generate_workflow`. All 401. Reads
all worked: `list_workflows`, `get_workflow`, `execute_workflow`,
`get_execution_status`, `list_action_schemas`. So the MCP token clearly
doesn't have write scope.

The thing is, the `/mcp` browser consent screen didn't tell me that. There's
no scope toggle, no "this app wants to: …" list, just a single approve
button. So I authorized expecting full integration and discovered the read-
only ceiling much later. Re-running `/mcp` re-uses the same token; I never
found a way to upgrade.

What I'd want: the consent screen explicitly lists requested scopes — "read
workflows, create/update/delete workflows, execute workflows" — with the
option to grant write or not. Default to read+write for builder MCPs since
that's the productive baseline. Read-only is a debugging mode, not the
expected primary use case.

I'd also pay good money for a `sync_workflow_from_file` tool. I want to
keep my workflow JSON in my git repo and reconcile it on push. Right now
the workflow lives only in KH's database — CI can't recreate it, and if I
delete it by accident there's no recovery.

## 0G chain isn't supported, and that's not documented

Our agent contracts live on 0G Galileo testnet (chain id 16602). When I
called `list_action_schemas` with `includeChains: true` it returned 22 chain
IDs. 0G isn't in the list, even though 0G is a co-sponsor of the same
hackathon KeeperHub is sponsoring. (Eth, Sepolia, Base, Base Sepolia,
Polygon, Arbitrum, BSC, Avalanche, plus a handful of L2 testnets.)

That itself is fine — chains take work to add. What hurt was the lack of any
"Custom RPC" path. I'd happily plug in `https://evmrpc-testnet.0g.ai` and
chain id 16602 myself if `Read Contract` / `Write Contract` exposed those
fields. Right now it's a hard fork in my architecture: the KH workflow can't
touch our chain, so the agent does on-chain writes itself and the workflow's
job is reduced to a Run Code audit step. Which works but loses the depth-of-
integration story I was hoping to demo.

So: a "Supported chains" page in the docs with last-updated timestamp, and
a custom-RPC option on the contract action schemas. Bonus points for
prioritizing chains in active hackathons KH co-sponsors — that's the
demographic with the highest pain-per-day.

## The Run Code editor flags `{{...}}` as a syntax error

Tried this in the Run Code body, copying the documented template syntax:

```
const body = {{@trigger:HYDRA Death Webhook.body}};
```

Editor immediately threw "Declaration or statement expected. (1128)" and
disabled Save. The TS validator is treating the file as plain TypeScript so
of course `{{...}}` is invalid. But these template variables are the
documented way to wire upstream node outputs into the action — they're
processed at runtime, before the JS gets executed.

The workaround was easy enough: rewrote the body without templates, the
payload is in run history input anyway. But somewhere a first-time builder
is going to copy the documented syntax, hit this error, assume the docs are
wrong, and bounce.

Two cheap fixes: pre-process `{{…}}` away before validation (replace with
typed placeholders so the AST is happy), or add a "disable validation"
toggle in the code editor's advanced settings. Bonus: an autocomplete that
surfaces `{{NodeName.field}}` for upstream nodes, so I don't have to dig
through the workflow JSON to find a node id.

## What was genuinely great

I keep coming back to four things that I want the team to know they got
right.

The MCP onboarding I already mentioned. The action schema discovery is the
same — 396 actions across 22 chains with full input/output metadata,
returned by a single call. I built our entire agent's chain-call surface
without trial-and-error because of that.

`execute_workflow` plus the run history that comes back from
`get_execution_logs` is a beautiful audit trail. Every node's input, output,
console.log calls, errors, durations — all captured, all queryable. When
debugging the workflow this was invaluable, and for my use case (death
events that need an externally-verifiable record) it's literally the
product I needed.

Lastly, the workflow editor itself is fast. From "I just signed up" to
"webhook trigger configured, Run Code action wired, saved" took under 90
seconds in the UI. That's hard to beat. Most workflow builders make me
wrestle with palettes and connection handles.

## Net-net

KeeperHub's strengths are exactly the things I want from this kind of
platform — onboarding, discoverability, run history. The gaps I hit are all
in the auth/scopes layer and the docs around chain support. None of them
are deep architectural problems; all of them have small, concrete fixes.
I'd build with KH again.
