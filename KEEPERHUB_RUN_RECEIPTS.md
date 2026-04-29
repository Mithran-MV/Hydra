# KeeperHub Run Receipts

KeeperHub workflows are per-org permissioned. Anonymous viewers see
"Workflow Not Found" at every KH URL. This file is the public mirror
of HYDRA's KH execution history — screenshots from the signed-in KH
dashboard, paired with the executionIds surfaced in
/chronicle's Codex iii panel.

Source of truth on the agent side: `logs/keeperhub-runs.jsonl`.

## Workflow ID → label

| KH workflow id              | HYDRA label             |
|-----------------------------|-------------------------|
| lcyuk85gh46defy5xaq8b       | death-event             |
| uybkmq5v2mpvgji7933ji       | treasury-redistribute   |
| up22dre1y0frp1pskrbuj       | scar-mint               |
| 6sdbtvyee2n0uihywyim3       | heartbeat-stale         |

## Screenshots

### death-event runs
![death-event run list](docs/keeperhub-receipts/death-event-runs.png)

### treasury-redistribute runs
![treasury-redistribute run list](docs/keeperhub-receipts/treasury-redistribute-runs.png)

### scar-mint runs
![scar-mint run list](docs/keeperhub-receipts/scar-mint-runs.png)

### heartbeat-stale runs
![heartbeat-stale run list](docs/keeperhub-receipts/heartbeat-stale-runs.png)

## Cross-reference

Every executionId visible in /chronicle's Codex iii panel is listed in
the corresponding workflow's Runs tab in the screenshots above. The
agent-side JSONL also contains the input payload summary (deadHead,
cause, childHeads, etc.) for full reproducibility.
