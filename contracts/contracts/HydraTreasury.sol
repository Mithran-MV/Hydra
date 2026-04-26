// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title HydraTreasury — pooled funds + per-head bookkeeping
/// @notice Funds for the swarm live here, NOT in head EOAs. Only the
///         configured Executor (KeeperHub-controlled in the demo) can
///         redistribute or withdraw, which is the actual drain defense.
contract HydraTreasury {
    address public owner;
    address public executor;

    mapping(bytes32 => uint256) public balances;

    event ExecutorSet(address indexed previous, address indexed next);
    event Deposit(bytes32 indexed headId, address indexed from, uint256 amount);
    event Withdraw(bytes32 indexed headId, address indexed to, uint256 amount);
    event Redistribute(
        bytes32 indexed deadHead,
        bytes32[] children,
        uint256[] shares
    );

    error NotOwner();
    error NotExecutor();
    error InsufficientBalance();
    error LengthMismatch();
    error TransferFailed();
    error ShareMismatch();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyExecutor() {
        if (msg.sender != executor) revert NotExecutor();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setExecutor(address _executor) external onlyOwner {
        emit ExecutorSet(executor, _executor);
        executor = _executor;
    }

    function deposit(bytes32 headId) external payable {
        balances[headId] += msg.value;
        emit Deposit(headId, msg.sender, msg.value);
    }

    function withdraw(
        bytes32 headId,
        address payable to,
        uint256 amount
    ) external onlyExecutor {
        if (balances[headId] < amount) revert InsufficientBalance();
        balances[headId] -= amount;
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdraw(headId, to, amount);
    }

    function redistribute(
        bytes32 deadHead,
        bytes32[] calldata children,
        uint256[] calldata shares
    ) external onlyExecutor {
        if (children.length != shares.length) revert LengthMismatch();
        uint256 deadBal = balances[deadHead];
        uint256 total = 0;
        for (uint256 i = 0; i < shares.length; i++) total += shares[i];
        if (total != deadBal) revert ShareMismatch();
        balances[deadHead] = 0;
        for (uint256 i = 0; i < children.length; i++) {
            balances[children[i]] += shares[i];
        }
        emit Redistribute(deadHead, children, shares);
    }

    receive() external payable {
        balances[bytes32(0)] += msg.value;
        emit Deposit(bytes32(0), msg.sender, msg.value);
    }
}
