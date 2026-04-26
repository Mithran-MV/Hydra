// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title HydraRegistry — lifecycle + scar event log for the HYDRA swarm
/// @notice Records heartbeats, deaths, spawns, and scars on chain so judges
///         and external observers can verify swarm activity via 0G ChainScan.
contract HydraRegistry {
    event Heartbeat(bytes32 indexed peerId, uint256 generation, uint256 ts);
    event Death(bytes32 indexed peerId, bytes32 cause, uint256 ts);
    event Born(
        bytes32 indexed peer,
        bytes32 indexed parent,
        uint256 generation,
        uint256 ts
    );
    event Spawn(
        bytes32 indexed parent,
        bytes32[] children,
        uint256 ts
    );
    event Scar(
        bytes32 indexed cause,
        string rule,
        address indexed addedBy,
        uint256 ts
    );

    address public owner;
    uint256 public currentGeneration;
    mapping(bytes32 => uint256) public lastHeartbeat;
    mapping(bytes32 => bool) public isDead;

    error NotOwner();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function recordHeartbeat(bytes32 peerId, uint256 generation) external {
        lastHeartbeat[peerId] = block.timestamp;
        if (generation > currentGeneration) currentGeneration = generation;
        emit Heartbeat(peerId, generation, block.timestamp);
    }

    function recordDeath(bytes32 peerId, bytes32 cause) external onlyOwner {
        isDead[peerId] = true;
        emit Death(peerId, cause, block.timestamp);
    }

    function recordBorn(
        bytes32 peer,
        bytes32 parent,
        uint256 generation
    ) external onlyOwner {
        emit Born(peer, parent, generation, block.timestamp);
    }

    function recordSpawn(
        bytes32 parent,
        bytes32[] calldata children
    ) external onlyOwner {
        emit Spawn(parent, children, block.timestamp);
    }

    function recordScar(
        bytes32 cause,
        string calldata rule
    ) external onlyOwner {
        emit Scar(cause, rule, msg.sender, block.timestamp);
    }
}
