# HYDRA — Smart Contract Specs

**Target chain:** 0G Chain testnet (EVM-compatible)
**Compiler:** Solidity 0.8.26
**Tooling:** Hardhat + Viem
**Required for 0G submission:** contract deployment addresses

Three contracts. Purpose-built, no inheritance hell.

---

## 1. HydraRegistry.sol

**Role:** canonical on-chain record of every head's existence and death. Lets judges and off-chain observers verify the swarm history independently.

### State

```solidity
struct Head {
    bytes32 id;             // hash of ed25519 pubkey
    address wallet;         // head's EOA / smart wallet
    uint8 strategy;         // 0=Aave, 1=UniV4, 2=Payroll
    uint32 generation;      // swarm generation at birth
    bytes32 parent;         // id of parent head (0x0 for genesis)
    uint64 bornAt;
    uint64 diedAt;          // 0 if alive
    uint8 deathCause;       // 0=alive, 1=key_revoked, 2=process_killed, 3=api_timeout, 4=wallet_drained
}

mapping(bytes32 => Head) public heads;
bytes32[] public headIds;
uint32 public currentGeneration;
uint32 public liveHeadCount;
uint32 public totalDeaths;

struct ScarRecord {
    bytes32 scarId;
    bytes32 learnedFrom;    // head id
    uint8 cause;
    string ruleURI;         // pointer to scar rule JSON on 0G Storage
    uint64 learnedAt;
}

ScarRecord[] public scars;
mapping(bytes32 => bool) public scarExists;
```

### Functions

```solidity
function registerHead(
    bytes32 id,
    address wallet,
    uint8 strategy,
    bytes32 parent
) external onlyAuthorizedSpawner returns (uint32 generation);
// emits HeadSpawned(id, wallet, strategy, generation, parent)

function markDead(bytes32 id, uint8 deathCause, bytes calldata consensusProof) external;
// consensusProof = concatenated signatures from peer heads (optional for v1)
// emits HeadDied(id, deathCause, peersWhoConfirmed)

function recordScar(
    bytes32 scarId,
    bytes32 learnedFrom,
    uint8 cause,
    string calldata ruleURI
) external onlyAuthorizedSpawner;
// emits ScarLearned(scarId, learnedFrom, cause, ruleURI)

function liveHeads() external view returns (bytes32[] memory);
function scarHistory() external view returns (ScarRecord[] memory);
```

### Events (critical — the dashboard indexes these)

```solidity
event HeadSpawned(bytes32 indexed id, address wallet, uint8 strategy, uint32 generation, bytes32 parent);
event HeadDied(bytes32 indexed id, uint8 deathCause, uint32 survivingHeads);
event ScarLearned(bytes32 indexed scarId, bytes32 learnedFrom, uint8 cause, string ruleURI);
event Resurrection(bytes32 indexed deadHead, bytes32 child1, bytes32 child2, bytes32 scarId);
```

### Access control

**AuthorizedSpawner** role: granted to the HydraExecutor contract and a backup EOA (owner multisig in prod, deployer key in demo). Only authorized spawners can register heads or mark dead. Prevents griefing.

---

## 2. HydraTreasury.sol

**Role:** the pooled fund that heads manage. Per-head allocations. On death, assets re-flow to children atomically.

### State

```solidity
mapping(bytes32 => mapping(address => uint256)) public headBalance; // headId → token → amount
mapping(address => uint256) public totalHoldings; // token → total
address public keeperHubExecutor; // only KeeperHub can trigger moves
address public registry;
```

### Functions

```solidity
function deposit(address token, uint256 amount, bytes32 headId) external;
// initial funding — from deployer or external depositor

function redistribute(
    bytes32 deadHead,
    bytes32[2] calldata children,
    address[] calldata tokens,
    uint256[] calldata splits  // basis points, must sum to 10000
) external onlyKeeperHub;
// atomic: subtract from deadHead, credit children according to split
// emits Redistribution(deadHead, children, tokens, amounts)

function executeFromHead(
    bytes32 headId,
    address target,
    bytes calldata callData,
    uint256 value
) external onlyKeeperHub returns (bytes memory);
// head performs an action through whitelisted HydraExecutor
// emits HeadAction(headId, target, selector)

function balanceOfHead(bytes32 headId, address token) external view returns (uint256);
```

### Design decisions

- **No per-head smart wallets in v1.** Keeps it simple — treasury holds all assets, bookkeeps per-head balances. If a head's EOA is compromised, funds are safe (they're in the treasury, not the EOA).
- **KeeperHub-only gate.** Only KeeperHub's executor address can move funds. Matches the sponsor requirement and the narrative.
- **Atomic redistribute.** `redistribute` runs in a single tx — either full success (both children credited) or revert.

---

## 3. HydraExecutor.sol

**Role:** whitelist of allowed action targets per strategy. Prevents heads (or attackers who compromise a head) from calling arbitrary addresses.

### State

```solidity
enum Strategy { Aave, UniV4, Payroll }

mapping(Strategy => mapping(address => mapping(bytes4 => bool))) public allowed;
// strategy → target → selector → allowed

address public treasury;
address public registry;
```

### Functions

```solidity
function setAllowed(Strategy s, address target, bytes4 selector, bool ok) external onlyOwner;

function execute(
    bytes32 headId,
    address target,
    bytes calldata data,
    uint256 value
) external onlyTreasury returns (bytes memory) {
    Strategy s = Strategy(uint8(registry.heads(headId).strategy));
    bytes4 selector = bytes4(data[:4]);
    require(allowed[s][target][selector], "HydraExecutor: not whitelisted");
    // forward call
}
```

### Whitelisted calls at deploy time

| Strategy | Target | Selector | Purpose |
|---|---|---|---|
| Aave | aave-pool | `supply(address,uint256,address,uint16)` | deposit |
| Aave | aave-pool | `withdraw(address,uint256,address)` | withdraw |
| UniV4 | univ4-router | `modifyLiquidity(...)` | LP actions |
| Payroll | erc20 | `transfer(address,uint256)` | payments |

Heads cannot call anything else. Period. This is the defense-in-depth layer.

---

## Deployment order

1. Deploy `HydraRegistry` (needs no dependencies)
2. Deploy `HydraTreasury(registry, keeperHubExecutor)`
3. Deploy `HydraExecutor(treasury, registry)`
4. Call `HydraRegistry.grantSpawner(HydraExecutor)` and backup EOA
5. Call `HydraExecutor.setAllowed(...)` for each whitelisted call
6. Fund `HydraTreasury` with test tokens

Total deploy: ~5 minutes. Entire script in `contracts/script/Deploy.ts`.

---

## Security considerations

| Concern | Mitigation |
|---|---|
| Compromised head EOA drains funds | Funds live in treasury, not head EOAs |
| Malicious `redistribute` | Only KeeperHub executor address can call; KeeperHub is simulation-first |
| Griefing via false death reports | Consensus requires ≥ (N/2)+1 heads to agree off-chain; on-chain `markDead` requires authorized spawner signature |
| Replay of spawn tx | `registerHead` reverts on duplicate `id` |
| Uncapped gas in execute | `execute` only calls whitelisted selectors — bounded surface |

---

## What we're NOT building on-chain

- Heartbeat / consensus / resurrection orchestration → **off-chain** (AXL mesh + agent code). Putting this on-chain would be slow, expensive, and inappropriate — consensus belongs where the heads live.
- Scar rule evaluation → **off-chain** (in each head's runtime). Chain only stores the scar's URI pointing to 0G Storage.
- Strategy execution logic → **off-chain** in agents; on-chain only enforces the whitelist.

This split keeps the chain minimal and the agents rich, which matches the sponsor narrative (KeeperHub = execution, AXL = coordination, 0G = memory+compute).
